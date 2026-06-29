// Hue → Neovim adapter. Maps the stable semantic roles onto Neovim highlight
// groups, Treesitter `@`-captures, LSP semantic tokens, diagnostics, terminal
// ANSI colors, and a lualine theme. The whole `lua/` + `colors/` tree is
// generated from this file so the token system stays the single source of
// color truth (mirroring the Yaak adapter, which generates its `index.ts`).
//
// Typography policy: a colorscheme never sets the user's font — fonts are a
// terminal/GUI concern — so this adapter emits no font directives.

import type { SemanticToken } from "../../generated/themes";
import type { AdapterManifest } from "../contract";
import { type ResolvedMood, terminalColors } from "./terminal";

// Neovim has a slot for every contract family, so nothing is omitted.
export const neovimManifest = {
  supports: ["surface", "text", "border", "accent", "status", "syntax"],
  omits: {},
} satisfies AdapterManifest;

type Color = SemanticToken | "NONE";
type Style = "bold" | "italic" | "underline" | "undercurl" | "strikethrough" | "reverse";

// One highlight group: either a `link` to another group, or a set of
// attributes. fg/bg/sp reference semantic roles (resolved against the palette
// at load time in Lua), keeping this table free of hard-coded hex values.
type HlSpec =
  | { group: string; link: string }
  | {
      group: string;
      fg?: Color;
      bg?: Color;
      sp?: Color;
      style?: readonly Style[];
    };

function isLink(spec: HlSpec): spec is { group: string; link: string } {
  return "link" in spec;
}

// The full highlight map. Ordered roughly UI → syntax → diagnostics → plugins.
// Colors are role names; visual differentiation between roles that share a hue
// (e.g. type vs function) is carried by `style`, the standard approach.
const GROUPS: readonly HlSpec[] = [
  // --- Core editor ---------------------------------------------------------
  { group: "Normal", fg: "text.primary", bg: "surface.canvas" },
  { group: "NormalNC", fg: "text.primary", bg: "surface.canvas" },
  { group: "NormalFloat", fg: "text.primary", bg: "surface.raised" },
  { group: "FloatBorder", fg: "border.subtle", bg: "surface.raised" },
  { group: "FloatTitle", fg: "accent.primary", bg: "surface.raised", style: ["bold"] },
  { group: "ColorColumn", bg: "surface.raised" },
  { group: "Cursor", fg: "surface.canvas", bg: "text.primary" },
  { group: "lCursor", link: "Cursor" },
  { group: "CursorIM", link: "Cursor" },
  { group: "CursorLine", bg: "surface.raised" },
  { group: "CursorColumn", link: "CursorLine" },
  { group: "CursorLineNr", fg: "accent.primary", bg: "surface.raised", style: ["bold"] },
  { group: "LineNr", fg: "border.subtle" },
  { group: "SignColumn", fg: "border.subtle", bg: "surface.canvas" },
  { group: "FoldColumn", link: "SignColumn" },
  { group: "Folded", fg: "text.secondary", bg: "surface.raised" },
  { group: "VertSplit", fg: "border.subtle" },
  { group: "WinSeparator", fg: "border.subtle" },
  { group: "Visual", bg: "surface.selected" },
  { group: "VisualNOS", link: "Visual" },
  { group: "Search", fg: "surface.canvas", bg: "accent.secondary" },
  { group: "IncSearch", fg: "surface.canvas", bg: "status.warning" },
  { group: "CurSearch", link: "IncSearch" },
  { group: "Substitute", link: "IncSearch" },
  { group: "MatchParen", fg: "status.warning", style: ["bold"] },
  { group: "NonText", fg: "border.subtle" },
  { group: "Whitespace", fg: "border.subtle" },
  { group: "SpecialKey", fg: "border.subtle" },
  { group: "EndOfBuffer", fg: "surface.canvas" },
  { group: "Conceal", fg: "text.secondary" },
  { group: "Directory", fg: "accent.primary" },
  { group: "Title", fg: "accent.primary", style: ["bold"] },
  { group: "Question", fg: "status.info" },
  { group: "ModeMsg", fg: "text.secondary", style: ["bold"] },
  { group: "MoreMsg", fg: "status.info" },
  { group: "MsgArea", fg: "text.primary" },
  { group: "ErrorMsg", fg: "status.error" },
  { group: "WarningMsg", fg: "status.warning" },
  { group: "WildMenu", link: "PmenuSel" },
  { group: "QuickFixLine", bg: "surface.selected" },
  { group: "SpellBad", sp: "status.error", style: ["undercurl"] },
  { group: "SpellCap", sp: "status.warning", style: ["undercurl"] },
  { group: "SpellLocal", sp: "status.info", style: ["undercurl"] },
  { group: "SpellRare", sp: "status.notice", style: ["undercurl"] },

  // Statusline / tabline / popup menu
  { group: "StatusLine", fg: "text.primary", bg: "surface.raised" },
  { group: "StatusLineNC", fg: "text.secondary", bg: "surface.raised" },
  { group: "TabLine", fg: "text.secondary", bg: "surface.raised" },
  { group: "TabLineSel", fg: "surface.canvas", bg: "accent.primary", style: ["bold"] },
  { group: "TabLineFill", bg: "surface.raised" },
  { group: "WinBar", fg: "text.secondary", bg: "surface.canvas" },
  { group: "WinBarNC", fg: "border.subtle", bg: "surface.canvas" },
  { group: "Pmenu", fg: "text.primary", bg: "surface.raised" },
  { group: "PmenuSel", fg: "surface.canvas", bg: "accent.primary", style: ["bold"] },
  { group: "PmenuSbar", bg: "surface.raised" },
  { group: "PmenuThumb", bg: "border.subtle" },
  { group: "PmenuKind", fg: "accent.secondary", bg: "surface.raised" },
  { group: "PmenuExtra", fg: "text.secondary", bg: "surface.raised" },

  // --- Legacy syntax groups (Treesitter links most files; these cover the rest)
  { group: "Comment", fg: "syntax.comment", style: ["italic"] },
  { group: "Constant", fg: "syntax.constant" },
  { group: "String", fg: "syntax.string" },
  { group: "Character", fg: "syntax.string" },
  { group: "Number", fg: "syntax.number" },
  { group: "Float", fg: "syntax.number" },
  { group: "Boolean", fg: "syntax.constant" },
  { group: "Identifier", fg: "syntax.variable" },
  { group: "Function", fg: "syntax.function" },
  { group: "Statement", fg: "syntax.keyword" },
  { group: "Conditional", fg: "syntax.keyword" },
  { group: "Repeat", fg: "syntax.keyword" },
  { group: "Label", fg: "syntax.keyword" },
  { group: "Operator", fg: "syntax.operator" },
  { group: "Keyword", fg: "syntax.keyword", style: ["bold"] },
  { group: "Exception", fg: "syntax.keyword" },
  { group: "PreProc", fg: "syntax.keyword" },
  { group: "Include", fg: "syntax.keyword" },
  { group: "Define", fg: "syntax.keyword" },
  { group: "Macro", fg: "syntax.constant" },
  { group: "PreCondit", fg: "syntax.keyword" },
  { group: "Type", fg: "syntax.type", style: ["italic"] },
  { group: "StorageClass", fg: "syntax.keyword" },
  { group: "Structure", fg: "syntax.type" },
  { group: "Typedef", fg: "syntax.type" },
  { group: "Special", fg: "syntax.operator" },
  { group: "SpecialChar", fg: "syntax.operator" },
  { group: "Delimiter", fg: "syntax.punctuation" },
  { group: "SpecialComment", fg: "syntax.comment", style: ["bold"] },
  { group: "Tag", fg: "syntax.keyword" },
  { group: "Underlined", fg: "accent.secondary", style: ["underline"] },
  { group: "Todo", fg: "surface.canvas", bg: "status.notice", style: ["bold"] },
  { group: "Error", fg: "status.error" },
  { group: "Ignore", fg: "border.subtle" },

  // --- Treesitter `@`-captures --------------------------------------------
  { group: "@comment", link: "Comment" },
  { group: "@comment.documentation", fg: "syntax.comment", style: ["italic"] },
  { group: "@comment.error", fg: "surface.canvas", bg: "status.error" },
  { group: "@comment.warning", fg: "surface.canvas", bg: "status.warning" },
  { group: "@comment.note", fg: "surface.canvas", bg: "status.info" },
  { group: "@comment.todo", link: "Todo" },
  { group: "@keyword", fg: "syntax.keyword", style: ["bold"] },
  { group: "@keyword.function", fg: "syntax.keyword", style: ["bold"] },
  { group: "@keyword.operator", fg: "syntax.operator" },
  { group: "@keyword.return", fg: "syntax.keyword", style: ["bold"] },
  { group: "@keyword.conditional", fg: "syntax.keyword" },
  { group: "@keyword.repeat", fg: "syntax.keyword" },
  { group: "@keyword.exception", fg: "syntax.keyword" },
  { group: "@keyword.import", fg: "syntax.keyword" },
  { group: "@keyword.directive", fg: "syntax.keyword" },
  { group: "@conditional", link: "@keyword.conditional" },
  { group: "@repeat", link: "@keyword.repeat" },
  { group: "@string", fg: "syntax.string" },
  { group: "@string.documentation", fg: "syntax.comment" },
  { group: "@string.regexp", fg: "syntax.operator" },
  { group: "@string.escape", fg: "syntax.operator", style: ["bold"] },
  { group: "@string.special", fg: "syntax.operator" },
  { group: "@character", fg: "syntax.string" },
  { group: "@character.special", fg: "syntax.operator" },
  { group: "@number", fg: "syntax.number" },
  { group: "@number.float", fg: "syntax.number" },
  { group: "@boolean", fg: "syntax.constant" },
  { group: "@constant", fg: "syntax.constant" },
  { group: "@constant.builtin", fg: "syntax.constant", style: ["italic"] },
  { group: "@constant.macro", fg: "syntax.constant" },
  { group: "@function", fg: "syntax.function" },
  { group: "@function.builtin", fg: "syntax.function", style: ["italic"] },
  { group: "@function.call", fg: "syntax.function" },
  { group: "@function.macro", fg: "syntax.function" },
  { group: "@function.method", fg: "syntax.function" },
  { group: "@function.method.call", fg: "syntax.function" },
  { group: "@constructor", fg: "syntax.type" },
  { group: "@operator", fg: "syntax.operator" },
  { group: "@type", fg: "syntax.type", style: ["italic"] },
  { group: "@type.builtin", fg: "syntax.type", style: ["italic"] },
  { group: "@type.definition", fg: "syntax.type" },
  { group: "@type.qualifier", fg: "syntax.keyword" },
  { group: "@attribute", fg: "syntax.constant" },
  { group: "@property", fg: "syntax.property" },
  { group: "@field", fg: "syntax.property" },
  { group: "@variable", fg: "syntax.variable" },
  { group: "@variable.builtin", fg: "syntax.keyword", style: ["italic"] },
  { group: "@variable.parameter", fg: "text.primary" },
  { group: "@variable.member", fg: "syntax.property" },
  { group: "@module", fg: "syntax.type" },
  { group: "@namespace", fg: "syntax.type" },
  { group: "@label", fg: "syntax.keyword" },
  { group: "@punctuation.delimiter", fg: "syntax.punctuation" },
  { group: "@punctuation.bracket", fg: "syntax.punctuation" },
  { group: "@punctuation.special", fg: "syntax.operator" },
  { group: "@tag", fg: "syntax.keyword" },
  { group: "@tag.attribute", fg: "syntax.property" },
  { group: "@tag.delimiter", fg: "syntax.punctuation" },
  // Markup (markdown, help, etc.)
  { group: "@markup.heading", fg: "accent.primary", style: ["bold"] },
  { group: "@markup.strong", fg: "text.primary", style: ["bold"] },
  { group: "@markup.italic", fg: "text.primary", style: ["italic"] },
  { group: "@markup.strikethrough", fg: "text.secondary", style: ["strikethrough"] },
  { group: "@markup.underline", style: ["underline"] },
  { group: "@markup.raw", fg: "syntax.string" },
  { group: "@markup.link", fg: "accent.secondary", style: ["underline"] },
  { group: "@markup.link.url", fg: "accent.secondary", style: ["underline"] },
  { group: "@markup.list", fg: "syntax.operator" },
  { group: "@markup.quote", fg: "text.secondary", style: ["italic"] },
  { group: "@diff.plus", fg: "status.success" },
  { group: "@diff.minus", fg: "status.error" },
  { group: "@diff.delta", fg: "status.info" },

  // --- LSP semantic tokens (link to the matching Treesitter capture) -------
  { group: "@lsp.type.class", link: "@type" },
  { group: "@lsp.type.enum", link: "@type" },
  { group: "@lsp.type.interface", link: "@type" },
  { group: "@lsp.type.struct", link: "@type" },
  { group: "@lsp.type.type", link: "@type" },
  { group: "@lsp.type.typeParameter", link: "@type" },
  { group: "@lsp.type.namespace", link: "@namespace" },
  { group: "@lsp.type.function", link: "@function" },
  { group: "@lsp.type.method", link: "@function.method" },
  { group: "@lsp.type.property", link: "@property" },
  { group: "@lsp.type.variable", link: "@variable" },
  { group: "@lsp.type.parameter", link: "@variable.parameter" },
  { group: "@lsp.type.keyword", link: "@keyword" },
  { group: "@lsp.type.enumMember", link: "@constant" },
  { group: "@lsp.type.comment", link: "@comment" },
  { group: "@lsp.mod.deprecated", style: ["strikethrough"] },

  // --- Diagnostics ---------------------------------------------------------
  { group: "DiagnosticError", fg: "status.error" },
  { group: "DiagnosticWarn", fg: "status.warning" },
  { group: "DiagnosticInfo", fg: "status.info" },
  { group: "DiagnosticHint", fg: "status.notice" },
  { group: "DiagnosticOk", fg: "status.success" },
  { group: "DiagnosticVirtualTextError", fg: "status.error", bg: "surface.raised" },
  { group: "DiagnosticVirtualTextWarn", fg: "status.warning", bg: "surface.raised" },
  { group: "DiagnosticVirtualTextInfo", fg: "status.info", bg: "surface.raised" },
  { group: "DiagnosticVirtualTextHint", fg: "status.notice", bg: "surface.raised" },
  { group: "DiagnosticUnderlineError", sp: "status.error", style: ["undercurl"] },
  { group: "DiagnosticUnderlineWarn", sp: "status.warning", style: ["undercurl"] },
  { group: "DiagnosticUnderlineInfo", sp: "status.info", style: ["undercurl"] },
  { group: "DiagnosticUnderlineHint", sp: "status.notice", style: ["undercurl"] },
  { group: "DiagnosticUnnecessary", fg: "text.secondary", style: ["undercurl"] },
  { group: "DiagnosticDeprecated", fg: "text.secondary", style: ["strikethrough"] },

  // --- Diff / git ----------------------------------------------------------
  { group: "DiffAdd", fg: "status.success", bg: "surface.raised" },
  { group: "DiffChange", fg: "status.info", bg: "surface.raised" },
  { group: "DiffDelete", fg: "status.error", bg: "surface.raised" },
  { group: "DiffText", fg: "status.warning", bg: "surface.selected" },
  { group: "diffAdded", fg: "status.success" },
  { group: "diffRemoved", fg: "status.error" },
  { group: "diffChanged", fg: "status.info" },
  { group: "GitSignsAdd", fg: "status.success" },
  { group: "GitSignsChange", fg: "status.info" },
  { group: "GitSignsDelete", fg: "status.error" },
  { group: "GitSignsCurrentLineBlame", fg: "border.subtle", style: ["italic"] },

  // --- Plugin integrations -------------------------------------------------
  // Telescope
  { group: "TelescopeNormal", fg: "text.primary", bg: "surface.raised" },
  { group: "TelescopeBorder", fg: "border.subtle", bg: "surface.raised" },
  { group: "TelescopeTitle", fg: "accent.primary", style: ["bold"] },
  { group: "TelescopePromptNormal", fg: "text.primary", bg: "surface.selected" },
  { group: "TelescopePromptBorder", fg: "surface.selected", bg: "surface.selected" },
  { group: "TelescopePromptTitle", fg: "surface.canvas", bg: "accent.primary", style: ["bold"] },
  { group: "TelescopePromptPrefix", fg: "accent.primary" },
  { group: "TelescopeSelection", bg: "surface.selected" },
  { group: "TelescopeSelectionCaret", fg: "accent.primary" },
  { group: "TelescopeMatching", fg: "status.warning", style: ["bold"] },
  // fzf-lua
  { group: "FzfLuaNormal", link: "TelescopeNormal" },
  { group: "FzfLuaBorder", link: "TelescopeBorder" },
  { group: "FzfLuaTitle", link: "TelescopeTitle" },
  // which-key
  { group: "WhichKey", fg: "accent.primary" },
  { group: "WhichKeyGroup", fg: "accent.secondary" },
  { group: "WhichKeyDesc", fg: "text.primary" },
  { group: "WhichKeySeparator", fg: "text.secondary" },
  { group: "WhichKeyFloat", bg: "surface.raised" },
  { group: "WhichKeyValue", fg: "text.secondary" },
  // neo-tree
  { group: "NeoTreeNormal", fg: "text.primary", bg: "surface.raised" },
  { group: "NeoTreeNormalNC", fg: "text.primary", bg: "surface.raised" },
  { group: "NeoTreeDirectoryName", fg: "accent.primary" },
  { group: "NeoTreeDirectoryIcon", fg: "accent.primary" },
  { group: "NeoTreeRootName", fg: "accent.secondary", style: ["bold"] },
  { group: "NeoTreeGitModified", fg: "status.info" },
  { group: "NeoTreeGitAdded", fg: "status.success" },
  { group: "NeoTreeGitDeleted", fg: "status.error" },
  { group: "NeoTreeIndentMarker", fg: "border.subtle" },
  // nvim-cmp + blink.cmp
  { group: "CmpItemAbbr", fg: "text.primary" },
  { group: "CmpItemAbbrDeprecated", fg: "text.secondary", style: ["strikethrough"] },
  { group: "CmpItemAbbrMatch", fg: "accent.primary", style: ["bold"] },
  { group: "CmpItemAbbrMatchFuzzy", fg: "accent.primary" },
  { group: "CmpItemKind", fg: "accent.secondary" },
  { group: "CmpItemMenu", fg: "text.secondary" },
  { group: "BlinkCmpMenu", link: "Pmenu" },
  { group: "BlinkCmpMenuBorder", link: "FloatBorder" },
  { group: "BlinkCmpLabelMatch", fg: "accent.primary", style: ["bold"] },
  { group: "BlinkCmpKind", fg: "accent.secondary" },
  // flash
  { group: "FlashLabel", fg: "surface.canvas", bg: "status.error", style: ["bold"] },
  { group: "FlashMatch", fg: "surface.canvas", bg: "accent.secondary" },
  { group: "FlashCurrent", fg: "surface.canvas", bg: "accent.primary" },
];

// ---------------------------------------------------------------------------
// lualine theme for one mood. lualine with `theme = 'auto'` auto-loads
// `lua/lualine/themes/<vim.g.colors_name>.lua`, so we emit one file per mood.
type LualineSection = {
  a: { fg: Color; bg: Color };
  b: { fg: Color; bg: Color };
  c: { fg: Color; bg: Color };
};

function lualineSection(accent: Color): LualineSection {
  return {
    a: { fg: "surface.canvas", bg: accent },
    b: { fg: "text.primary", bg: "surface.raised" },
    c: { fg: "text.secondary", bg: "surface.canvas" },
  };
}

const LUALINE_MODES: Record<string, Color> = {
  normal: "accent.primary",
  insert: "status.success",
  visual: "accent.secondary",
  replace: "status.error",
  command: "status.warning",
};

// ---------------------------------------------------------------------------
// Lua rendering helpers. Output is deterministic so `bun run build --check`
// stays stable.
const HEADER = "-- Generated by scripts/build.ts. Do not edit.\n";

function luaStr(value: string): string {
  return `"${value}"`;
}

function resolve(mood: ResolvedMood, role: Color): string {
  if (role === "NONE") return "NONE";
  const value = mood.semantic[role];
  if (!value) throw new Error(`Mood ${mood.id} is missing semantic role ${role}`);
  return value;
}

function renderHlSpec(spec: HlSpec): string {
  if (isLink(spec)) {
    return `  [${luaStr(spec.group)}] = { link = ${luaStr(spec.link)} },`;
  }
  const parts: string[] = [];
  if (spec.fg) parts.push(`fg = c[${luaStr(spec.fg)}]`);
  if (spec.bg) parts.push(`bg = c[${luaStr(spec.bg)}]`);
  if (spec.sp) parts.push(`sp = c[${luaStr(spec.sp)}]`);
  for (const style of spec.style ?? []) parts.push(`${style} = true`);
  return `  [${luaStr(spec.group)}] = { ${parts.join(", ")} },`;
}

/** `lua/hue/palette.lua` — every mood's resolved colors + terminal ANSI. */
function renderPalette(moods: ResolvedMood[]): string {
  const entries = moods
    .map((mood) => {
      const semantic = Object.entries(mood.semantic)
        .map(([key, value]) => `      [${luaStr(key)}] = ${luaStr(value)},`)
        .join("\n");
      const primitive = Object.entries(mood.primitive)
        .map(([key, value]) => `      ${key} = ${luaStr(value)},`)
        .join("\n");
      const terminal = terminalColors(mood)
        .map((value) => `      ${luaStr(value)},`)
        .join("\n");
      return `  ${mood.id} = {
    label = ${luaStr(mood.label)},
    appearance = ${luaStr(mood.appearance)},
    semantic = {
${semantic}
    },
    primitive = {
${primitive}
    },
    terminal = {
${terminal}
    },
  },`;
    })
    .join("\n");
  return `${HEADER}\nreturn {\n${entries}\n}\n`;
}

/** `lua/hue/groups.lua` — one function turning a mood's semantic map into hl specs. */
function renderGroups(): string {
  const body = GROUPS.map(renderHlSpec).join("\n");
  return `${HEADER}
-- c is a mood's resolved semantic color map (see palette.lua).
return function(c)
  return {
${body}
  }
end
`;
}

// Background-bearing groups cleared to `bg=NONE` when `transparent` is on, so
// the terminal shows through. Selection/active states (PmenuSel, Visual,
// TelescopeSelection, prompt input) keep their bg so they stay legible.
const TRANSPARENT_GROUPS: readonly string[] = [
  // Core editor + built-in floats/popups.
  "Normal",
  "NormalNC",
  "NormalFloat",
  "FloatBorder",
  "FloatTitle",
  "SignColumn",
  "FoldColumn",
  "EndOfBuffer",
  "MsgArea",
  "Pmenu",
  "PmenuSbar",
  "PmenuExtra",
  "PmenuKind",
  // Telescope
  "TelescopeNormal",
  "TelescopeBorder",
  "TelescopeResultsNormal",
  "TelescopePreviewNormal",
  // neo-tree
  "NeoTreeNormal",
  "NeoTreeNormalNC",
  "NeoTreeEndOfBuffer",
  // which-key
  "WhichKeyNormal",
  "WhichKeyFloat",
  "WhichKeyBorder",
  // Snacks (picker / explorer / dashboard / windows)
  "SnacksNormal",
  "SnacksNormalNC",
  "SnacksWinBar",
  "SnacksBackdrop",
  "SnacksPicker",
  "SnacksPickerNormal",
  "SnacksPickerList",
  "SnacksPickerInput",
  "SnacksPickerPreview",
  "SnacksPickerBox",
  "SnacksDashboardNormal",
  // noice
  "NoicePopup",
  "NoicePopupmenu",
  "NoiceCmdlinePopup",
  "NoiceMini",
  // nvim-notify
  "NotifyBackground",
  // blink.cmp / nvim-cmp doc + menu windows
  "BlinkCmpMenu",
  "BlinkCmpDoc",
  "BlinkCmpSignatureHelp",
  "CmpDocumentation",
  // treesitter-context
  "TreesitterContext",
  "TreesitterContextLineNumber",
  // lazy.nvim / mason UIs
  "LazyNormal",
  "MasonNormal",
];

/** `lua/hue/init.lua` — colorscheme loader shared by every entrypoint. */
function renderInit(): string {
  const transparentList = TRANSPARENT_GROUPS.map((group) => `    ${luaStr(group)},`).join("\n");
  return `${HEADER}
local M = {}

M.options = { default = nil, transparent = false }

function M.setup(opts)
  M.options = vim.tbl_extend("force", M.options, opts or {})
end

-- Groups whose background is cleared when \`transparent\` is enabled.
local TRANSPARENT_GROUPS = {
${transparentList}
}

function M.load(mood)
  mood = mood or M.options.default
  local palette = require("hue.palette")
  local entry = palette[mood]
  if not entry then
    error("hue: unknown mood '" .. tostring(mood) .. "'")
  end

  if vim.g.colors_name then
    vim.cmd("highlight clear")
  end
  if vim.fn.exists("syntax_on") == 1 then
    vim.cmd("syntax reset")
  end
  vim.o.termguicolors = true
  vim.o.background = entry.appearance
  vim.g.colors_name = "hue-" .. mood

  for index, color in ipairs(entry.terminal) do
    vim.g["terminal_color_" .. (index - 1)] = color
  end

  local groups = require("hue.groups")(entry.semantic)
  for group, spec in pairs(groups) do
    vim.api.nvim_set_hl(0, group, spec)
  end

  if M.options.transparent then
    for _, group in ipairs(TRANSPARENT_GROUPS) do
      local hl = vim.api.nvim_get_hl(0, { name = group, link = false })
      hl.bg = nil
      hl.ctermbg = nil
      vim.api.nvim_set_hl(0, group, hl)
    end
  end
end

-- Public API for user configs building custom highlights from Hue colors.
-- See lua/hue/colors.lua (palette access) and lua/hue/util.lua (color math).
local colors = require("hue.colors")
M.colors = colors.get
M.raw = colors.raw
M.util = require("hue.util")

return M
`;
}

/**
 * \`lua/hue/colors.lua\` — public palette accessor layered over palette.lua.
 * Resolves the active (or requested) mood and exposes the semantic roles both
 * grouped by family (\`get().accent.primary\`) and flat (\`raw()["accent.primary"]\`).
 */
function renderColors(): string {
  return `${HEADER}
local M = {}

local cache = {}

-- Resolve a mood id from an explicit arg, the active colorscheme, or Mưa.
local function resolve(mood)
  if mood then
    return mood
  end
  local name = vim.g.colors_name
  return (name and name:match("^hue%-(.+)$")) or "mua"
end

--- Flat semantic map for a mood, e.g. \`raw()["accent.primary"]\`.
function M.raw(mood)
  local entry = require("hue.palette")[resolve(mood)]
  if not entry then
    error("hue: unknown mood '" .. tostring(mood) .. "'")
  end
  return entry.semantic
end

--- Semantic palette grouped by family, e.g. \`get().accent.primary\`.
function M.get(mood)
  local id = resolve(mood)
  if cache[id] then
    return cache[id]
  end
  local grouped = {}
  for role, value in pairs(M.raw(id)) do
    local family, name = role:match("^(.-)%.(.+)$")
    grouped[family] = grouped[family] or {}
    grouped[family][name] = value
  end
  cache[id] = grouped
  return grouped
end

return M
`;
}

/**
 * \`lua/hue/util.lua\` — small, dependency-free color math for consumers that
 * derive shades from Hue roles (e.g. faint diff backgrounds). Static content.
 */
function renderUtil(): string {
  return `${HEADER}
local M = {}

local function clamp(n)
  return math.max(0, math.min(255, n))
end

local function to_rgb(hex)
  hex = hex:gsub("#", "")
  return tonumber(hex:sub(1, 2), 16), tonumber(hex:sub(3, 4), 16), tonumber(hex:sub(5, 6), 16)
end

local function to_hex(r, g, b)
  return string.format("#%02X%02X%02X", math.floor(clamp(r) + 0.5), math.floor(clamp(g) + 0.5), math.floor(clamp(b) + 0.5))
end

-- Linear sRGB blend; \`alpha\` is the weight of \`fg\` over \`bg\`.
function M.blend(fg, bg, alpha)
  local fr, fg_, fb = to_rgb(fg)
  local br, bg_, bb = to_rgb(bg)
  return to_hex(alpha * fr + (1 - alpha) * br, alpha * fg_ + (1 - alpha) * bg_, alpha * fb + (1 - alpha) * bb)
end

function M.darken(hex, amount, bg)
  return M.blend(hex, bg or "#000000", amount)
end

function M.lighten(hex, amount)
  return M.blend(hex, "#FFFFFF", amount)
end

return M
`;
}

/** `colors/hue-<mood>.lua` — `:colorscheme hue-<mood>` entrypoint. */
function renderColorsEntry(mood: ResolvedMood): string {
  return `${HEADER}require("hue").load("${mood.id}")\n`;
}

/** `lua/lualine/themes/hue-<mood>.lua` — picked up by lualine `theme = 'auto'`. */
function renderLualine(mood: ResolvedMood): string {
  const renderSec = (section: LualineSection): string =>
    `{
    a = { fg = ${luaStr(resolve(mood, section.a.fg))}, bg = ${luaStr(resolve(mood, section.a.bg))}, gui = "bold" },
    b = { fg = ${luaStr(resolve(mood, section.b.fg))}, bg = ${luaStr(resolve(mood, section.b.bg))} },
    c = { fg = ${luaStr(resolve(mood, section.c.fg))}, bg = ${luaStr(resolve(mood, section.c.bg))} },
  }`;
  const modes = Object.entries(LUALINE_MODES)
    .map(([mode, accent]) => `  ${mode} = ${renderSec(lualineSection(accent))},`)
    .join("\n");
  const inactive = `{
    a = { fg = ${luaStr(resolve(mood, "text.secondary"))}, bg = ${luaStr(resolve(mood, "surface.raised"))} },
    b = { fg = ${luaStr(resolve(mood, "text.secondary"))}, bg = ${luaStr(resolve(mood, "surface.raised"))} },
    c = { fg = ${luaStr(resolve(mood, "border.subtle"))}, bg = ${luaStr(resolve(mood, "surface.canvas"))} },
  }`;
  return `${HEADER}\nreturn {\n${modes}\n  inactive = ${inactive},\n}\n`;
}

/**
 * Render the whole Neovim plugin tree. Returns paths relative to the
 * `packages/nvim-plugin/` package root, paired with their file contents.
 */
export function renderNeovimFiles(moods: ResolvedMood[]): Array<{ path: string; content: string }> {
  const files: Array<{ path: string; content: string }> = [
    { path: "lua/hue/palette.lua", content: renderPalette(moods) },
    { path: "lua/hue/groups.lua", content: renderGroups() },
    { path: "lua/hue/colors.lua", content: renderColors() },
    { path: "lua/hue/util.lua", content: renderUtil() },
    { path: "lua/hue/init.lua", content: renderInit() },
  ];
  for (const mood of moods) {
    files.push({ path: `colors/hue-${mood.id}.lua`, content: renderColorsEntry(mood) });
    files.push({ path: `lua/lualine/themes/hue-${mood.id}.lua`, content: renderLualine(mood) });
  }
  return files;
}
