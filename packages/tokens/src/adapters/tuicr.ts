// Hue → tuicr adapter. Emits one local theme file per mood for
// https://github.com/agavra/tuicr, the review TUI the herdr-ghq plugin launches
// for git reviews. Replaces the old hunk adapter.
//
// tuicr's theming is far safer to automate than hunk's was. A local theme is a
// **flat TOML file of its own** at `~/.config/tuicr/themes/<name>.toml`, selected
// by name from the user's config — so, unlike hunk, we never overwrite the user's
// `config.toml` to change a colour, and the theme file needs no ownership marker
// because it lives in our own `hue-*` namespace.
//
// The one hard rule: **all 41 colour keys are required, none has a default.**
// `require_local_theme_color` errors on a missing key and tuicr exits 2, which
// takes down the whole review path — not just its colours. That is why `KEYS`
// below is exhaustive and a test counts it.
//
// Values may only be `#RRGGBB` or a terminal colour name: no 256-indices, no
// bold/italic, no `none`. Transparency is a *config* key (`transparent_background`,
// on by default), not a theme key, so nothing here can ask for it.
//
// Syntax highlighting does not go through colour keys at all — `syntax_theme`
// takes a `.tmTheme` path resolved relative to the theme file, so we point it at
// the bat theme this repo already generates and skip per-scope mapping entirely.
//
// Two things tuicr will not let us theme, so do not design around them: the diff
// hunk header's background is derived from `panel_bg` (and is `Reset` whenever
// transparency is on), and comment-author chrome uses a hard-coded ANSI palette.

import type { AdapterManifest } from "../contract";
import { diffRow, textMuted, textOn } from "../derive";
import { type ResolvedMood, role } from "../mood";

export const tuicrManifest = {
  supports: ["surface", "text", "border", "accent", "status", "syntax"],
  omits: {},
} satisfies AdapterManifest;

// tuicr needs a dimmer text tier and a legible foreground for filled badges,
// neither of which the contract names; both come from src/derive.ts, gated
// there rather than re-measured here.

// The 41 required colour keys, in tuicr's own documented order so the emitted
// file reads alongside `docs/CONFIG.md`. Every one of them must be here.
type Key = { key: string; value: (mood: ResolvedMood) => string };

const KEYS: Key[] = [
  // Base.
  { key: "panel_bg", value: (m) => role(m, "surface.canvas") },
  { key: "bg_highlight", value: (m) => role(m, "surface.selected") },
  { key: "fg_primary", value: (m) => role(m, "text.primary") },
  { key: "fg_secondary", value: (m) => role(m, "text.secondary") },
  { key: "fg_dim", value: textMuted },
  // Diff. Row tints are `diffRow`, the same derivation delta uses for the pager,
  // so a change reads the same colour in the review pane and in lazygit.
  { key: "diff_add", value: (m) => role(m, "status.success") },
  { key: "diff_add_bg", value: (m) => diffRow(m, "status.success") },
  { key: "diff_del", value: (m) => role(m, "status.error") },
  { key: "diff_del_bg", value: (m) => diffRow(m, "status.error") },
  { key: "diff_context", value: (m) => role(m, "text.primary") },
  // Misleading name: this is the *directory icon* in the file list, not the
  // hunk header (whose background is derived and unthemeable).
  { key: "diff_hunk_header", value: (m) => role(m, "accent.secondary") },
  { key: "expanded_context_fg", value: textMuted },
  // The same rows when syntax highlighting is on. delta draws highlighted code on
  // this very tint (`plus-style = syntax …`), and the gate in src/gates.ts holds
  // every syntax role to 0.7x of its canvas contrast on it, so no lighter step.
  { key: "syntax_add_bg", value: (m) => diffRow(m, "status.success") },
  { key: "syntax_del_bg", value: (m) => diffRow(m, "status.error") },
  // File status.
  { key: "file_added", value: (m) => role(m, "status.success") },
  { key: "file_modified", value: (m) => role(m, "status.info") },
  { key: "file_deleted", value: (m) => role(m, "status.error") },
  { key: "file_renamed", value: (m) => role(m, "status.warning") },
  // Review progress.
  { key: "reviewed", value: (m) => role(m, "status.success") },
  { key: "pending", value: (m) => role(m, "status.notice") },
  // Comment-type badges (the four built-in types; custom ones carry their own
  // colour in the user's config.toml).
  { key: "comment_note", value: (m) => role(m, "status.info") },
  { key: "comment_suggestion", value: (m) => role(m, "accent.secondary") },
  { key: "comment_issue", value: (m) => role(m, "status.error") },
  { key: "comment_praise", value: (m) => role(m, "status.success") },
  // Chrome.
  { key: "border_focused", value: (m) => role(m, "accent.primary") },
  { key: "border_unfocused", value: (m) => role(m, "border.subtle") },
  { key: "status_bar_bg", value: (m) => role(m, "surface.raised") },
  { key: "cursor_color", value: (m) => role(m, "accent.secondary") },
  { key: "cursor_line_bg", value: (m) => role(m, "surface.selected") },
  { key: "branch_name", value: (m) => role(m, "accent.primary") },
  { key: "help_indicator", value: (m) => role(m, "text.secondary") },
  // Messages: each is a filled badge, so the foreground is picked by contrast.
  { key: "message_info_fg", value: (m) => textOn(m, role(m, "status.info")) },
  { key: "message_info_bg", value: (m) => role(m, "status.info") },
  { key: "message_warning_fg", value: (m) => textOn(m, role(m, "status.warning")) },
  { key: "message_warning_bg", value: (m) => role(m, "status.warning") },
  { key: "message_error_fg", value: (m) => textOn(m, role(m, "status.error")) },
  { key: "message_error_bg", value: (m) => role(m, "status.error") },
  { key: "update_badge_fg", value: (m) => textOn(m, role(m, "status.notice")) },
  { key: "update_badge_bg", value: (m) => role(m, "status.notice") },
  // Mode indicator, always drawn bold on its fill.
  { key: "mode_fg", value: (m) => textOn(m, role(m, "accent.primary")) },
  { key: "mode_bg", value: (m) => role(m, "accent.primary") },
];

/** How many colour keys tuicr requires. A theme with fewer does not load. */
export const TUICR_REQUIRED_KEYS = 41;

/** Render one tuicr local theme file for a mood. */
function renderTuicrTheme(mood: ResolvedMood): string {
  const colors = KEYS.map(({ key, value }) => `${key} = "${value(mood)}"`).join("\n");

  return `# Hue theme for tuicr (agavra/tuicr) — ${mood.label}.
# Generated by scripts/build.ts. Do not edit.
#
# Copied to ~/.config/tuicr/themes/hue-${mood.id}.toml by the herdr-plugin's
# apply.sh, which also points tuicr's config at it. Every colour key below is
# required: tuicr exits 2 on a theme it cannot fully resolve.

# Resolved relative to this file — apply.sh copies the .tmTheme in beside it.
syntax_theme = "hue-${mood.id}.tmTheme"

${colors}
`;
}

/**
 * Render every mood's tuicr theme. Paths are relative to the
 * `packages/herdr-plugin/` package root (apply.sh reads them from there).
 */
export function renderTuicrFiles(
  moods: readonly ResolvedMood[],
): Array<{ path: string; content: string }> {
  return moods.map((mood) => ({
    path: `tuicr/hue-${mood.id}.toml`,
    content: renderTuicrTheme(mood),
  }));
}
