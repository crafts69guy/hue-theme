import type { SemanticToken } from "../../generated/themes";
import { mixHex } from "../color";
import type { AdapterManifest } from "../contract";
import { diffRow, textMuted, textOn } from "../derive";
import { type ResolvedMood, role } from "../mood";

/** Claude exposes UI/status colors; syntax highlighting remains host-controlled. */
export const claudeCodeManifest = {
  supports: ["surface", "text", "border", "accent", "status"],
  omits: { syntax: "Claude Code custom themes do not expose syntax scope rules" },
} satisfies AdapterManifest;

// Names verified against the shipped 2.1.299 presets, not inferred from ANSI names.
const ROLES = {
  autoAccept: "accent.secondary",
  skill: "accent.secondary",
  bashBorder: "status.notice",
  claude: "accent.primary",
  claudeBlue_FOR_SYSTEM_SPINNER: "status.info",
  permission: "accent.primary",
  planMode: "status.info",
  ide: "status.info",
  promptBorder: "border.subtle",
  text: "text.primary",
  inactive: "text.secondary",
  subtle: "border.subtle",
  suggestion: "accent.secondary",
  remember: "status.info",
  background: "surface.canvas",
  success: "status.success",
  error: "status.error",
  warning: "status.warning",
  merged: "accent.secondary",
  red_FOR_SUBAGENTS_ONLY: "status.error",
  blue_FOR_SUBAGENTS_ONLY: "status.info",
  green_FOR_SUBAGENTS_ONLY: "status.success",
  yellow_FOR_SUBAGENTS_ONLY: "status.warning",
  purple_FOR_SUBAGENTS_ONLY: "accent.secondary",
  orange_FOR_SUBAGENTS_ONLY: "status.warning",
  pink_FOR_SUBAGENTS_ONLY: "status.notice",
  cyan_FOR_SUBAGENTS_ONLY: "status.info",
  professionalBlue: "status.info",
  chromeYellow: "status.warning",
  clawd_body: "accent.primary",
  clawd_background: "surface.canvas",
  userMessageBackground: "surface.raised",
  userMessageBackgroundHover: "surface.selected",
  composerSidebarBackground: "surface.raised",
  selectionBg: "surface.selected",
  bashMessageBackgroundColor: "surface.raised",
  memoryBackgroundColor: "surface.raised",
  rate_limit_fill: "accent.primary",
  rate_limit_empty: "border.faint",
  fastMode: "status.warning",
  effortUltra: "accent.secondary",
  briefLabelYou: "accent.secondary",
  briefLabelClaude: "accent.primary",
  rainbow_red: "status.error",
  rainbow_orange: "status.warning",
  rainbow_yellow: "syntax.number",
  rainbow_green: "status.success",
  rainbow_blue: "status.info",
  rainbow_indigo: "syntax.keyword",
  rainbow_violet: "accent.secondary",
} as const satisfies Record<string, SemanticToken>;

const SHIMMERS = {
  autoAcceptShimmer: "autoAccept",
  claudeShimmer: "claude",
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: "claudeBlue_FOR_SYSTEM_SPINNER",
  permissionShimmer: "permission",
  promptBorderShimmer: "promptBorder",
  inactiveShimmer: "inactive",
  warningShimmer: "warning",
  fastModeShimmer: "fastMode",
  rainbow_red_shimmer: "rainbow_red",
  rainbow_orange_shimmer: "rainbow_orange",
  rainbow_yellow_shimmer: "rainbow_yellow",
  rainbow_green_shimmer: "rainbow_green",
  rainbow_blue_shimmer: "rainbow_blue",
  rainbow_indigo_shimmer: "rainbow_indigo",
  rainbow_violet_shimmer: "rainbow_violet",
} as const satisfies Record<string, keyof typeof ROLES>;

/** Runtime keys supplementary to the official token reference; verified in 2.1.299. */
export const CLAUDE_RUNTIME_KEYS = [
  "skill",
  "autoAcceptShimmer",
  "claudeBlue_FOR_SYSTEM_SPINNER",
  "claudeBlueShimmer_FOR_SYSTEM_SPINNER",
  "background",
  "composerSidebarBackground",
  "professionalBlue",
  "chromeYellow",
  "clawd_body",
  "clawd_background",
] as const;

/** Claude's public custom-theme JSON shape; unknown override keys are ignored by the host. */
export type ClaudeCodeTheme = {
  /** Display label shown by /theme. */
  name: string;
  /**
   * Not the `-ansi` presets: in 2.1.299 a base name containing "ansi" forces the
   * diff renderer to 256 colours, which rounds every tinted diff row to grey.
   * The cost is Claude's built-in syntax palette instead of the terminal's.
   */
  base: "dark" | "light";
  /** Resolved host color tokens, including verified version-sensitive runtime keys. */
  overrides: Record<string, string>;
};

/** Resolve the complete known Claude Code UI palette from existing Hue semantics. */
export function mapMoodToClaudeCode(mood: ResolvedMood): ClaudeCodeTheme {
  const overrides: Record<string, string> = {};
  for (const [key, token] of Object.entries(ROLES)) overrides[key] = role(mood, token);
  for (const [key, base] of Object.entries(SHIMMERS)) {
    overrides[key] = mixHex(overrides[base], role(mood, "text.primary"), 0.25);
  }
  overrides.inverseText = textOn(mood, role(mood, "accent.primary"));
  // Dimmed diffs and word emphasis share the same contrast-gated row derivations.
  overrides.diffAdded = diffRow(mood, "status.success");
  overrides.diffRemoved = diffRow(mood, "status.error");
  overrides.diffAddedDimmed = diffRow(mood, "status.success", "quiet");
  overrides.diffRemovedDimmed = diffRow(mood, "status.error", "quiet");
  overrides.diffAddedWord = diffRow(mood, "status.success", "emph");
  overrides.diffRemovedWord = diffRow(mood, "status.error", "emph");
  overrides.subtle = textMuted(mood);
  return { name: mood.label, base: mood.appearance, overrides };
}

/** Render all themes and semantic statusline palettes relative to the plugin package. */
export function renderClaudeCodeFiles(
  moods: readonly ResolvedMood[],
): Array<{ path: string; content: string }> {
  return moods.flatMap((mood) => [
    {
      path: `themes/hue-${mood.id}.json`,
      content: `${JSON.stringify(mapMoodToClaudeCode(mood), null, 2)}\n`,
    },
    {
      path: `statusline/hue-${mood.id}.json`,
      content: `{\n  "segments": ["repo", "branch", "context", "tokens", "diff", "model", "agents"],\n  "palette": ${JSON.stringify(mood.semantic, null, 2).replace(/\n/g, "\n  ")}\n}\n`,
    },
  ]);
}
