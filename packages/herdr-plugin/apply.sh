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

config="${HERDR_CONFIG_PATH:-$HOME/.config/herdr/config.toml}"
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

# config.toml has no include/import system, so splice the fragment's own
# [theme.custom] table between the "# BEGIN hue-theme" / "# END hue-theme"
# markers rather than sourcing it.
awk -v frag="$fragment" '
  /# BEGIN hue-theme/ { print; while ((getline line < frag) > 0) print line; skip=1; next }
  /# END hue-theme/ { skip=0 }
  skip { next }
  { print }
' "$config" >"$tmp"

mv "$tmp" "$config"
"${HERDR_BIN_PATH:-herdr}" server reload-config >/dev/null 2>&1
echo "hue-theme: applied herdr theme for mood '$mood'"
