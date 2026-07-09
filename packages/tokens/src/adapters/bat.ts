// Hue → bat adapter. Emits one Sublime Text .tmTheme per mood for
// https://github.com/sharkdp/bat (and anything else syntect-based). bat reads
// themes from `$(bat --config-dir)/themes/*.tmTheme` after `bat cache --build`
// and selects one via `--theme`/`BAT_THEME`, so unlike Ghostty/tmux there is
// no entrypoint file — mood switching is just pointing BAT_THEME at another
// pre-built theme name.
//
// Styling mirrors the Neovim adapter's conventions: italic comments and
// types, bold keywords, accent-bold headings, status colors for diff markup.

import type { AdapterManifest } from "../contract";
import type { ResolvedMood } from "./terminal";

export const batManifest = {
  supports: ["surface", "text", "border", "accent", "status", "syntax"],
  omits: {},
} satisfies AdapterManifest;

type Rule = {
  name: string;
  scope: string;
  fg?: string;
  fontStyle?: string;
};

// Scope selectors follow common tmTheme practice (syntect resolves ties by
// selector specificity, not rule order). Colors are Hue semantic role names.
const RULES: Rule[] = [
  {
    name: "Comment",
    scope: "comment, punctuation.definition.comment",
    fg: "syntax.comment",
    fontStyle: "italic",
  },
  { name: "String", scope: "string", fg: "syntax.string" },
  { name: "Escape", scope: "constant.character.escape", fg: "syntax.operator" },
  { name: "Number", scope: "constant.numeric", fg: "syntax.number" },
  {
    name: "Constant",
    scope: "constant.language, constant.character, constant.other",
    fg: "syntax.constant",
  },
  {
    name: "Keyword",
    scope: "keyword, storage, storage.type",
    fg: "syntax.keyword",
    fontStyle: "bold",
  },
  { name: "Operator", scope: "keyword.operator", fg: "syntax.operator" },
  { name: "Function", scope: "entity.name.function, support.function", fg: "syntax.function" },
  {
    name: "Type",
    scope:
      "entity.name.type, entity.name.class, entity.other.inherited-class, support.type, support.class",
    fg: "syntax.type",
    fontStyle: "italic",
  },
  { name: "Variable", scope: "variable", fg: "syntax.variable" },
  {
    name: "Property",
    scope: "variable.other.member, support.type.property-name, meta.property-name",
    fg: "syntax.property",
  },
  { name: "Tag", scope: "entity.name.tag", fg: "syntax.keyword" },
  { name: "Attribute", scope: "entity.other.attribute-name", fg: "syntax.property" },
  { name: "Punctuation", scope: "punctuation", fg: "syntax.punctuation" },
  {
    name: "Heading",
    scope: "markup.heading, entity.name.section",
    fg: "accent.primary",
    fontStyle: "bold",
  },
  { name: "Bold", scope: "markup.bold", fontStyle: "bold" },
  { name: "Italic", scope: "markup.italic", fontStyle: "italic" },
  { name: "Link", scope: "markup.underline.link", fg: "status.info", fontStyle: "underline" },
  { name: "Inserted", scope: "markup.inserted, meta.diff.header.to-file", fg: "status.success" },
  { name: "Deleted", scope: "markup.deleted, meta.diff.header.from-file", fg: "status.error" },
  { name: "Changed", scope: "markup.changed", fg: "status.warning" },
  { name: "Diff header", scope: "meta.diff.header", fg: "status.info" },
  { name: "Diff range", scope: "meta.diff.range", fg: "status.notice" },
  { name: "Invalid", scope: "invalid, invalid.illegal, message.error", fg: "status.error" },
];

function role(mood: ResolvedMood, key: string): string {
  const value = mood.semantic[key];
  if (!value) throw new Error(`Mood ${mood.id} is missing semantic role ${key}`);
  return value;
}

function xmlEscape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderRule(mood: ResolvedMood, rule: Rule): string {
  const settings: string[] = [];
  if (rule.fg) {
    settings.push(`        <key>foreground</key>\n        <string>${role(mood, rule.fg)}</string>`);
  }
  if (rule.fontStyle) {
    settings.push(`        <key>fontStyle</key>\n        <string>${rule.fontStyle}</string>`);
  }
  return `    <dict>
      <key>name</key>
      <string>${xmlEscape(rule.name)}</string>
      <key>scope</key>
      <string>${xmlEscape(rule.scope)}</string>
      <key>settings</key>
      <dict>
${settings.join("\n")}
      </dict>
    </dict>`;
}

/** Render one bat/syntect .tmTheme for a mood. */
function renderBatTheme(mood: ResolvedMood): string {
  const globals: Array<[string, string]> = [
    ["background", role(mood, "surface.canvas")],
    ["foreground", role(mood, "text.primary")],
    ["caret", role(mood, "accent.primary")],
    ["selection", role(mood, "surface.selected")],
    ["lineHighlight", role(mood, "surface.raised")],
    ["gutter", role(mood, "surface.canvas")],
    ["gutterForeground", role(mood, "border.subtle")],
  ];
  const globalEntries = globals
    .map(([key, value]) => `        <key>${key}</key>\n        <string>${value}</string>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<!-- Generated by scripts/build.ts. Do not edit. -->
<!-- ${xmlEscape(mood.label)} — Hue theme for bat/syntect. -->
<plist version="1.0">
<dict>
  <!-- bat names themes by this key, so keep it scriptable ascii that matches
       the other adapters' hue-<mood> naming rather than the display label. -->
  <key>name</key>
  <string>hue-${mood.id}</string>
  <key>semanticClass</key>
  <string>theme.${mood.appearance}.hue-${mood.id}</string>
  <key>settings</key>
  <array>
    <dict>
      <key>settings</key>
      <dict>
${globalEntries}
      </dict>
    </dict>
${RULES.map((rule) => renderRule(mood, rule)).join("\n")}
  </array>
</dict>
</plist>
`;
}

/**
 * Render every mood's bat theme. Paths are relative to the
 * `packages/terminal-themes/` package root.
 */
export function renderBatFiles(moods: ResolvedMood[]): Array<{ path: string; content: string }> {
  return moods.map((mood) => ({
    path: `bat/hue-${mood.id}.tmTheme`,
    content: renderBatTheme(mood),
  }));
}
