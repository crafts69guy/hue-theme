import type { AdapterManifest } from "../contract";
import { diffRow } from "../derive";
import { type ResolvedMood, role } from "../mood";
import { renderBatTheme } from "./bat";

/** Codex CLI themes cover syntax, accent and diff rows, not general TUI chrome. */
export const codexCliManifest = {
  supports: ["surface", "text", "accent", "status", "syntax"],
  omits: { border: "Codex CLI tmTheme customization does not expose TUI border colors" },
} satisfies AdapterManifest;

/** Render CLI themes relative to packages/codex-cli-themes, reusing bat syntax. */
export function renderCodexCliFiles(
  moods: readonly ResolvedMood[],
): Array<{ path: string; content: string }> {
  return moods.map((mood) => ({
    path: `themes/hue-${mood.id}.tmTheme`,
    content: renderBatTheme(mood, [
      { name: "Codex accent", scope: "codex.accent", foreground: role(mood, "accent.primary") },
      {
        name: "Codex inserted",
        scope: "markup.inserted",
        foreground: role(mood, "status.success"),
        background: diffRow(mood, "status.success"),
      },
      {
        name: "Codex deleted",
        scope: "markup.deleted",
        foreground: role(mood, "status.error"),
        background: diffRow(mood, "status.error"),
      },
    ]),
  }));
}
