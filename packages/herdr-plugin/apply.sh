#!/usr/bin/env bash
# Applies the active Hue Tide mood (mua/huong/cung) to herdr's [theme.custom].
#
# herdr has no scriptable theme API (no `herdr theme` subcommand, no socket
# method) — the only way to change its colors is editing config.toml and
# calling `herdr server reload-config`. This script is invoked both as the
# plugin's "apply-mood" action (keybinding, or the workspace.created event
# hook on startup) and directly by hue-theme.fish via
# `herdr plugin action invoke apply-mood --plugin hue-theme`, so both paths
# share one implementation.
set -euo pipefail

state_home="${XDG_STATE_HOME:-$HOME/.local/state}"
state_file="$state_home/hue-theme/current"
mood="mua"
[ -f "$state_file" ] && mood="$(tr -d '[:space:]' < "$state_file")"

fragment="$HERDR_PLUGIN_ROOT/themes/hue-$mood.toml"
if [ ! -f "$fragment" ]; then
  echo "hue-theme: no herdr fragment for mood '$mood' ($fragment)" >&2
  exit 1
fi
ui_accent="$(awk -F'"' '/^accent = "/ { print $2; exit }' "$fragment")"
if [ -z "$ui_accent" ]; then
  echo "hue-theme: no accent color found in $fragment" >&2
  exit 1
fi

config="${HERDR_CONFIG_PATH:-$HOME/.config/herdr/config.toml}"
tmp="$(mktemp)"
tmp_ui="$(mktemp)"
trap 'rm -f "$tmp" "$tmp_ui"' EXIT

# config.toml has no include/import system, so splice the fragment's own
# [theme.custom] table between the "# BEGIN hue-theme" / "# END hue-theme"
# markers rather than sourcing it.
awk -v frag="$fragment" '
  /# BEGIN hue-theme/ { print; while ((getline line < frag) > 0) print line; skip=1; next }
  /# END hue-theme/ { skip=0 }
  skip { next }
  { print }
' "$config" >"$tmp"

# Herdr sidebar/navigation highlights use [ui].accent, not [theme.custom].accent.
# Keep it synced with the active Hue mood while preserving the rest of [ui].
awk -v accent="$ui_accent" '
  function write_accent_if_needed() {
    if (in_ui && !wrote_accent) {
      print "accent = \"" accent "\""
      wrote_accent = 1
    }
  }

  /^\[ui\]$/ {
    write_accent_if_needed()
    in_ui = 1
    saw_ui = 1
    wrote_accent = 0
    print
    next
  }

  /^\[/ {
    write_accent_if_needed()
    in_ui = 0
  }

  in_ui && /^[[:space:]]*accent[[:space:]]*=/ {
    print "accent = \"" accent "\""
    wrote_accent = 1
    next
  }

  { print }

  END {
    if (in_ui) {
      write_accent_if_needed()
    } else if (!saw_ui) {
      print ""
      print "[ui]"
      print "accent = \"" accent "\""
    }
  }
' "$tmp" >"$tmp_ui"

mv "$tmp_ui" "$config"
"${HERDR_BIN_PATH:-herdr}" server reload-config >/dev/null 2>&1
echo "hue-theme: applied herdr theme for mood '$mood'"

# tuicr (the review TUI the herdr-ghq plugin launches) reads named local themes
# from ~/.config/tuicr/themes/<name>.toml. That is a file of our own in the hue-*
# namespace, so — unlike the hunk config this replaces — there is nothing to
# clobber and no ownership marker to check: we copy the theme and its .tmTheme in,
# then point tuicr's own config at it. Best-effort: a failure must not break the
# herdr theming above.
tuicr_theme="$HERDR_PLUGIN_ROOT/tuicr/hue-$mood.toml"
if [ -f "$tuicr_theme" ]; then
  tuicr_dir="${XDG_CONFIG_HOME:-$HOME/.config}/tuicr"
  if mkdir -p "$tuicr_dir/themes" &&
    cp "$tuicr_theme" "$tuicr_dir/themes/hue-$mood.toml"; then
    # tuicr resolves the theme's `syntax_theme` relative to the theme file, so the
    # .tmTheme has to land beside it. Its absence only costs syntax colours.
    cp "$HERDR_PLUGIN_ROOT/tuicr/hue-$mood.tmTheme" "$tuicr_dir/themes/" 2>/dev/null || true

    # Splice `theme = "hue-<mood>"` into tuicr's config, replacing any existing
    # top-level `theme =` and leaving every other setting alone. Guarded the same
    # way as the herdr splice above: a key is rewritten in place if present, and
    # appended before the first table header if not, so it never lands inside one.
    tuicr_config="$tuicr_dir/config.toml"
    [ -f "$tuicr_config" ] || : >"$tuicr_config"
    tuicr_tmp="$(mktemp)"
    if awk -v theme="hue-$mood" \
      '
        function write_theme_if_needed() {
          if (!wrote) {
            print "theme = \"" theme "\""
            wrote = 1
          }
        }

        # The first table header ends the top-level key block.
        /^\[/ {
          write_theme_if_needed()
          in_tables = 1
        }

        !in_tables && /^[[:space:]]*theme[[:space:]]*=/ {
          write_theme_if_needed()
          next
        }

        { print }

        END { write_theme_if_needed() }
      ' "$tuicr_config" >"$tuicr_tmp" && mv "$tuicr_tmp" "$tuicr_config"; then
      echo "hue-theme: applied tuicr theme for mood '$mood'"
    else
      rm -f "$tuicr_tmp"
      echo "hue-theme: could not point tuicr at the Hue theme ($tuicr_config)" >&2
    fi
  else
    echo "hue-theme: could not install the tuicr theme into $tuicr_dir/themes" >&2
  fi
fi
