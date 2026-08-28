// Hue → delta adapter. Emits one git-config fragment per mood for
// https://github.com/dandavison/delta, the pager that renders every diff this
// setup shows — `git diff` at the prompt, and the Patch panel inside lazygit,
// which pipes through `delta --paging=never`.
//
// This is the adapter that closes a real gap: lazygit's `gui.theme` (see
// lazygit.ts) colours the panels but never the diff body, so before this file
// existed the ± rows came from whatever feature the user's ~/.gitconfig named —
// a stock Solarized block sitting on the Hue canvas.
//
// Delivery is a git `[include]` of `hue-current.gitconfig`, a symlink switched
// per mood, exactly like Ghostty's `hue-current` and lazygit's `hue-current.yml`.
// That is why **every mood names the same feature, `[delta "hue"]`**: the user's
// `[delta] features = hue` is written once and never touched again.
//
// Two host rules shape what is below:
//
//  1. A delta style string is `[<fg>] [<bg>] [<attributes>]`, where a colour is a
//     hex literal or one of delta's keywords — `syntax` (defer to the syntax
//     highlighter), `normal`, `auto`, `raw`. Attributes are words like `bold`,
//     `ul`, `box`. There is no key/value grammar inside a style.
//  2. Syntax highlighting is not themed here at all: `syntax-theme` names a bat
//     theme, so this points at the `.tmTheme` bat.ts already generates for the
//     same mood. It must be in `bat cache --build` (sync-hue-bat.sh) — delta
//     falls back silently to its default theme otherwise.
//
// Behaviour keys (`navigate`, `line-numbers`, `hyperlinks`, `tabs`) stay in the
// user's own `[delta]` section: this fragment carries colours only, the same
// policy every other terminal adapter follows.

import { mixHex } from "../color";
import type { AdapterManifest } from "../contract";
import type { ResolvedMood } from "./terminal";

export const deltaManifest = {
  // syntax counts as supported for the same reason it does in tuicr.ts: the
  // fragment resolves the family by naming the generated bat theme rather than
  // by mapping each scope itself.
  supports: ["surface", "text", "border", "accent", "status", "syntax"],
  omits: {},
} satisfies AdapterManifest;

/** The feature name every mood declares. The mood switch is a symlink, not an edit. */
export const DELTA_FEATURE = "hue";

function role(mood: ResolvedMood, key: string): string {
  const value = mood.semantic[key];
  if (!value) throw new Error(`Mood ${mood.id} is missing semantic role ${key}`);
  return value;
}

/**
 * A diff row background carrying the status hue, not the canvas hue.
 *
 * The obvious derivation — `mixHex(canvas, status, w)` — fails on Mưa: a navy
 * canvas drags any blend toward itself, so at a readable weight "added" lands on
 * teal and "removed" on purple, and the one signal a diff must never lose is
 * red-vs-green. So the status colour is shaded toward black (dark moods) or
 * white (light moods) first, which drops lightness while keeping hue, and only
 * then blended back toward the canvas so the row still belongs to the mood.
 *
 * `shade` is how far the status colour is taken toward the pole, `blend` how
 * much canvas is mixed back in. Measured, not chosen: across the three moods
 * every `syntax.*` role keeps at least 0.75x the contrast it has on the canvas,
 * and `text.primary` stays above 11:1 — asserted in tests/terminal-adapters.test.ts.
 */
function tint(mood: ResolvedMood, status: string, shade: number, blend: number): string {
  const pole = mood.appearance === "dark" ? "#000000" : "#FFFFFF";
  return mixHex(mixHex(role(mood, status), pole, shade), role(mood, "surface.canvas"), blend);
}

const base = (mood: ResolvedMood, status: string) => tint(mood, status, 0.72, 0.3);
const emph = (mood: ResolvedMood, status: string) => tint(mood, status, 0.55, 0.2);
const nonEmph = (mood: ResolvedMood, status: string) => tint(mood, status, 0.8, 0.45);

type Entry = { key: string; value: (mood: ResolvedMood) => string; comment?: string };

const ENTRIES: Entry[] = [
  {
    key: "syntax-theme",
    value: (m) => `hue-${m.id}`,
    comment: "the bat .tmTheme this repo generates for the same mood",
  },

  // Removed rows.
  { key: "minus-style", value: (m) => `syntax "${base(m, "status.error")}"` },
  { key: "minus-emph-style", value: (m) => `syntax "${emph(m, "status.error")}"` },
  { key: "minus-non-emph-style", value: (m) => `syntax "${nonEmph(m, "status.error")}"` },
  { key: "minus-empty-line-marker-style", value: (m) => `normal "${base(m, "status.error")}"` },

  // Added rows.
  { key: "plus-style", value: (m) => `syntax "${base(m, "status.success")}"` },
  { key: "plus-emph-style", value: (m) => `syntax "${emph(m, "status.success")}"` },
  { key: "plus-non-emph-style", value: (m) => `syntax "${nonEmph(m, "status.success")}"` },
  { key: "plus-empty-line-marker-style", value: (m) => `normal "${base(m, "status.success")}"` },

  // Context rows carry no background on purpose: a hex here would paint over a
  // translucent terminal and turn the whole diff opaque. Keep it colourless.
  { key: "zero-style", value: () => "syntax" },

  // File header banner.
  { key: "file-style", value: (m) => `"${role(m, "accent.primary")}" bold` },
  { key: "file-decoration-style", value: (m) => `"${role(m, "border.subtle")}" ul` },
  { key: "file-added-label", value: () => "[+]" },
  { key: "file-modified-label", value: () => "[M]" },
  { key: "file-removed-label", value: () => "[-]" },
  { key: "file-renamed-label", value: () => "[R]" },

  // Hunk header: file:line context in a box rather than the raw @@ line.
  { key: "hunk-header-style", value: () => "syntax bold" },
  { key: "hunk-header-decoration-style", value: (m) => `"${role(m, "border.faint")}" box` },
  { key: "hunk-header-file-style", value: (m) => `"${role(m, "status.info")}"` },
  { key: "hunk-header-line-number-style", value: (m) => `"${role(m, "status.warning")}"` },

  // Line-number gutter (drawn only when the user sets line-numbers = true).
  // The dividers share border.subtle with lazygit's inactive panel borders so
  // the pager gutter belongs to the surrounding UI in every mood.
  { key: "line-numbers-left-style", value: (m) => `"${role(m, "border.subtle")}"` },
  { key: "line-numbers-right-style", value: (m) => `"${role(m, "border.subtle")}"` },
  { key: "line-numbers-minus-style", value: (m) => `"${role(m, "status.error")}"` },
  { key: "line-numbers-plus-style", value: (m) => `"${role(m, "status.success")}"` },
  { key: "line-numbers-zero-style", value: (m) => `"${role(m, "text.secondary")}"` },

  // Trailing whitespace and other whitespace errors, filled so they cannot be
  // mistaken for content.
  {
    key: "whitespace-error-style",
    value: (m) =>
      `"${role(m, "status.warning")}" "${mixHex(role(m, "surface.canvas"), role(m, "status.warning"), 0.25)}"`,
  },

  // `git log`/`show` chrome.
  { key: "commit-style", value: (m) => `"${role(m, "accent.secondary")}" bold` },
  { key: "commit-decoration-style", value: (m) => `"${role(m, "border.faint")}" box` },
  {
    key: "blame-code-style",
    value: () => "syntax",
    comment: "keep blamed code syntax-highlighted over the alternating palette",
  },
  {
    key: "blame-palette",
    // The whole list is one quoted string, not four bare hexes: git treats an
    // unquoted `#` as a comment, so the value would reach delta empty and it
    // exits with "Option 'blame-palette' must not be empty".
    value: (m) =>
      `"${[
        role(m, "surface.canvas"),
        mixHex(role(m, "surface.canvas"), role(m, "surface.raised"), 0.5),
        role(m, "surface.raised"),
        role(m, "surface.selected"),
      ].join(" ")}"`,
    comment: "alternating backgrounds for `delta --blame`, walking the surface ramp",
  },

  // `delta --grep` / piped ripgrep output, which otherwise falls back to
  // delta's stock purple/green ANSI defaults.
  { key: "grep-file-style", value: (m) => `"${role(m, "accent.primary")}"` },
  { key: "grep-header-file-style", value: (m) => `"${role(m, "accent.primary")}" bold` },
  { key: "grep-header-decoration-style", value: (m) => `"${role(m, "border.faint")}" ul` },
  { key: "grep-line-number-style", value: (m) => `"${role(m, "text.secondary")}"` },
  { key: "grep-match-line-style", value: () => "syntax" },
  {
    key: "grep-match-word-style",
    value: (m) => `"${role(m, "text.primary")}" "${role(m, "surface.selected")}"`,
  },
  { key: "grep-context-line-style", value: (m) => `"${role(m, "text.secondary")}"` },

  // Merge conflicts (delta --merge / diff3 output).
  {
    key: "merge-conflict-ours-diff-header-style",
    value: (m) => `"${role(m, "status.warning")}" bold`,
  },
  {
    key: "merge-conflict-ours-diff-header-decoration-style",
    value: (m) => `"${role(m, "border.faint")}" box`,
  },
  {
    key: "merge-conflict-theirs-diff-header-style",
    value: (m) => `"${role(m, "status.info")}" bold`,
  },
  {
    key: "merge-conflict-theirs-diff-header-decoration-style",
    value: (m) => `"${role(m, "border.faint")}" box`,
  },
];

/** Render one delta git-config fragment for a mood. */
function renderDeltaTheme(mood: ResolvedMood): string {
  const appearance = mood.appearance === "dark" ? "dark = true" : "light = true";
  const body = ENTRIES.map(({ key, value, comment }) => {
    const line = `\t${key} = ${value(mood)}`;
    return comment ? `\t# ${comment}\n${line}` : line;
  }).join("\n");

  return `# Generated by scripts/build.ts. Do not edit.
# ${mood.label} — Hue theme for delta (dandavison/delta).
#
# Include it from ~/.gitconfig and select it once; the mood is switched by
# re-pointing the symlink, never by editing this line:
#
#   [include]
#       path = ~/.config/git/hue-themes/hue-current.gitconfig
#   [delta]
#       features = hue
#
# syntax-theme names the bat theme of the same mood, which must already be in
# \`bat cache --build\` (see .scripts/sync-hue-bat.sh) — delta falls back to its
# own default silently, not loudly, when the theme is missing.

[delta "${DELTA_FEATURE}"]
\t${appearance}
${body}
`;
}

/**
 * Render every mood's delta fragment. Paths are relative to the
 * `packages/terminal-themes/` package root.
 */
export function renderDeltaFiles(moods: ResolvedMood[]): Array<{ path: string; content: string }> {
  return moods.map((mood) => ({
    path: `delta/hue-${mood.id}.gitconfig`,
    content: renderDeltaTheme(mood),
  }));
}
