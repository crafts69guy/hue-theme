// Hue → hunk adapter. Emits one full config.toml per mood for
// https://github.com/modem-dev/hunk, the review-first terminal diff viewer the
// herdr-ghq plugin launches for git reviews.
//
// hunk has no external named-theme mechanism: a custom theme lives inline as
// `theme = "custom"` + a `[custom_theme]` table (chrome + diff-content slots)
// and an optional `[custom_theme.syntax_scopes]` map of Shiki/TextMate scopes to
// colours. So, unlike bat's per-mood theme files switched by name, the active
// mood's config must be written to `~/.config/hunk/config.toml` wholesale — which
// is what the herdr-plugin package's apply.sh does alongside the herdr splice.
//
// We theme everything: chrome from surface/text/border/accent, the diff content
// area (context takes the canvas; add/remove rows a tint of the status colours
// blended onto it), and the syntax scopes from the syntax family — so the review
// pane is fully Hue, not the base theme's github-dark inside a Hue panel. `base`
// only supplies fallbacks for scopes we do not name.
//
// transparent_background is on: the Hue Tide surfaces are translucent, and the
// herdr-ghq switcher this sits beside renders translucent too, so the review pane
// should let the terminal show through to match.

import { mixHex } from "../color";
import type { AdapterManifest } from "../contract";
import type { ResolvedMood } from "./terminal";

export const hunkManifest = {
  supports: ["surface", "text", "border", "accent", "status", "syntax"],
  omits: {},
} satisfies AdapterManifest;

// First line of the emitted config; apply.sh writes the file only when it is
// absent or already carries this marker (or herdr-ghq's), so a hand-written hunk
// config is never clobbered, and herdr-ghq's own generator stands down once this
// owns the file.
const MARKER = "# hue-theme managed hunk theme — regenerated when the Hue mood changes.";

function role(mood: ResolvedMood, key: string): string {
  const value = mood.semantic[key];
  if (!value) throw new Error(`Mood ${mood.id} is missing semantic role ${key}`);
  return value;
}

function primitive(mood: ResolvedMood, key: string): string {
  const value = mood.primitive[key];
  if (!value) throw new Error(`Mood ${mood.id} is missing primitive ${key}`);
  return value;
}

// hunk [custom_theme] slot -> a resolver over the mood. Chrome, badges, files,
// then the diff content area (blended add/remove tints so they sit on the canvas
// instead of the base theme's near-black).
type Slot = { key: string; value: (mood: ResolvedMood) => string };

const SLOTS: Slot[] = [
  // Chrome.
  { key: "background", value: (m) => role(m, "surface.canvas") },
  { key: "panel", value: (m) => role(m, "surface.raised") },
  { key: "panelAlt", value: (m) => role(m, "surface.selected") },
  { key: "border", value: (m) => role(m, "border.subtle") },
  { key: "accent", value: (m) => role(m, "accent.primary") },
  { key: "accentMuted", value: (m) => primitive(m, "mist") },
  { key: "text", value: (m) => role(m, "text.primary") },
  { key: "muted", value: (m) => role(m, "text.secondary") },
  // Badges + file-status colours.
  { key: "badgeAdded", value: (m) => role(m, "status.success") },
  { key: "badgeRemoved", value: (m) => role(m, "status.error") },
  { key: "badgeNeutral", value: (m) => role(m, "text.secondary") },
  { key: "fileNew", value: (m) => role(m, "status.success") },
  { key: "fileDeleted", value: (m) => role(m, "status.error") },
  { key: "fileRenamed", value: (m) => role(m, "status.warning") },
  { key: "fileModified", value: (m) => role(m, "status.info") },
  { key: "fileUntracked", value: (m) => role(m, "text.secondary") },
  { key: "addedSignColor", value: (m) => role(m, "status.success") },
  { key: "removedSignColor", value: (m) => role(m, "status.error") },
  { key: "lineNumberFg", value: (m) => role(m, "text.secondary") },
  { key: "lineNumberBg", value: (m) => role(m, "surface.canvas") },
  { key: "selectedHunk", value: (m) => role(m, "surface.selected") },
  // Diff content area.
  { key: "contextBg", value: (m) => role(m, "surface.canvas") },
  { key: "contextContentBg", value: (m) => role(m, "surface.canvas") },
  {
    key: "addedBg",
    value: (m) => mixHex(role(m, "surface.canvas"), role(m, "status.success"), 0.24),
  },
  {
    key: "addedContentBg",
    value: (m) => mixHex(role(m, "surface.canvas"), role(m, "status.success"), 0.15),
  },
  {
    key: "removedBg",
    value: (m) => mixHex(role(m, "surface.canvas"), role(m, "status.error"), 0.24),
  },
  {
    key: "removedContentBg",
    value: (m) => mixHex(role(m, "surface.canvas"), role(m, "status.error"), 0.15),
  },
  {
    key: "movedAddedBg",
    value: (m) => mixHex(role(m, "surface.canvas"), role(m, "status.info"), 0.24),
  },
  {
    key: "movedRemovedBg",
    value: (m) => mixHex(role(m, "surface.canvas"), role(m, "accent.secondary"), 0.24),
  },
  // Inline agent-review notes.
  { key: "noteBorder", value: (m) => role(m, "border.subtle") },
  { key: "noteBackground", value: (m) => role(m, "surface.raised") },
  { key: "noteTitleBackground", value: (m) => role(m, "surface.selected") },
  { key: "noteTitleText", value: (m) => role(m, "text.primary") },
];

// TextMate/Shiki scope selector -> syntax role. One selector per key (Shiki
// resolves per-scope), mirroring the bat adapter's mappings so code reads the
// same in a hunk review as it does under bat.
type ScopeRule = { scopes: string[]; role: string };

const SCOPES: ScopeRule[] = [
  { scopes: ["comment", "punctuation.definition.comment"], role: "syntax.comment" },
  { scopes: ["string", "string.quoted"], role: "syntax.string" },
  { scopes: ["constant.numeric"], role: "syntax.number" },
  {
    scopes: ["constant.language", "constant.character", "constant.other"],
    role: "syntax.constant",
  },
  { scopes: ["constant.character.escape", "string.regexp"], role: "syntax.operator" },
  { scopes: ["keyword", "storage", "storage.type", "keyword.control"], role: "syntax.keyword" },
  { scopes: ["keyword.operator"], role: "syntax.operator" },
  { scopes: ["entity.name.function", "support.function"], role: "syntax.function" },
  {
    scopes: ["entity.name.type", "entity.name.class", "support.type", "support.class"],
    role: "syntax.type",
  },
  { scopes: ["variable", "variable.other"], role: "syntax.variable" },
  {
    scopes: ["variable.other.member", "support.type.property-name", "meta.property-name"],
    role: "syntax.property",
  },
  { scopes: ["entity.name.tag"], role: "syntax.keyword" },
  { scopes: ["entity.other.attribute-name"], role: "syntax.property" },
  { scopes: ["punctuation"], role: "syntax.punctuation" },
];

/** Render one hunk config.toml for a mood — the whole file apply.sh copies out. */
function renderHunkTheme(mood: ResolvedMood): string {
  const base = mood.appearance === "light" ? "github-light-default" : "github-dark-default";
  const slots = SLOTS.map(({ key, value }) => `${key} = "${value(mood)}"`).join("\n");
  const scopes = SCOPES.flatMap(({ scopes, role: r }) =>
    scopes.map((scope) => `"${scope}" = "${role(mood, r)}"`),
  ).join("\n");

  return `${MARKER}
# Generated by scripts/build.ts. Do not edit.
# ${mood.label} — Hue theme for hunk (modem-dev/hunk). Written to
# ~/.config/hunk/config.toml by the herdr-plugin's apply.sh on mood change.
theme = "custom"
transparent_background = true

[custom_theme]
base = "${base}"
label = "hue-${mood.id}"
${slots}

[custom_theme.syntax_scopes]
${scopes}
`;
}

/**
 * Render every mood's hunk config. Paths are relative to the
 * `packages/herdr-plugin/` package root (apply.sh reads them from there).
 */
export function renderHunkFiles(moods: ResolvedMood[]): Array<{ path: string; content: string }> {
  return moods.map((mood) => ({
    path: `hunk/hue-${mood.id}.toml`,
    content: renderHunkTheme(mood),
  }));
}
