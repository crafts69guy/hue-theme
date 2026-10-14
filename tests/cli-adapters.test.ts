import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { themeBundle } from "../packages/tokens/generated/themes";
import { renderBatFiles, renderBatTheme } from "../packages/tokens/src/adapters/bat";
import {
  CLAUDE_RUNTIME_KEYS,
  mapMoodToClaudeCode,
  renderClaudeCodeFiles,
} from "../packages/tokens/src/adapters/claude-code";
import { renderCodexCliFiles } from "../packages/tokens/src/adapters/codex-cli";
import { mixHex } from "../packages/tokens/src/color";
import { diffRow, textOn } from "../packages/tokens/src/derive";

// Independent snapshot of every shipped 2.1.299 preset key; additions need runtime verification.
const CLAUDE_KEYS =
  `autoAccept autoAcceptShimmer skill bashBorder claude claudeShimmer claudeBlue_FOR_SYSTEM_SPINNER claudeBlueShimmer_FOR_SYSTEM_SPINNER permission permissionShimmer planMode ide promptBorder promptBorderShimmer text inverseText inactive inactiveShimmer subtle suggestion remember background success error warning merged warningShimmer diffAdded diffRemoved diffAddedDimmed diffRemovedDimmed diffAddedWord diffRemovedWord red_FOR_SUBAGENTS_ONLY blue_FOR_SUBAGENTS_ONLY green_FOR_SUBAGENTS_ONLY yellow_FOR_SUBAGENTS_ONLY purple_FOR_SUBAGENTS_ONLY orange_FOR_SUBAGENTS_ONLY pink_FOR_SUBAGENTS_ONLY cyan_FOR_SUBAGENTS_ONLY professionalBlue chromeYellow clawd_body clawd_background userMessageBackground userMessageBackgroundHover composerSidebarBackground selectionBg bashMessageBackgroundColor memoryBackgroundColor rate_limit_fill rate_limit_empty fastMode fastModeShimmer effortUltra briefLabelYou briefLabelClaude rainbow_red rainbow_orange rainbow_yellow rainbow_green rainbow_blue rainbow_indigo rainbow_violet rainbow_red_shimmer rainbow_orange_shimmer rainbow_yellow_shimmer rainbow_green_shimmer rainbow_blue_shimmer rainbow_indigo_shimmer rainbow_violet_shimmer`.split(
    " ",
  );

describe("CLI themes", () => {
  test("Claude covers the verified schema with semantic colors and shared derivations", () => {
    expect(CLAUDE_RUNTIME_KEYS).toHaveLength(10);
    for (const mood of themeBundle.themes) {
      const theme = mapMoodToClaudeCode(mood);
      expect(Object.keys(theme.overrides).sort()).toEqual([...CLAUDE_KEYS].sort());
      expect(theme.name).toBe(mood.label);
      expect(theme.base).toBe(mood.appearance);
      for (const value of Object.values(theme.overrides)) expect(value).toMatch(/^#[\dA-F]{6}$/i);
      expect(theme.overrides.text).toBe(mood.semantic["text.primary"]);
      expect(theme.overrides.background).toBe(mood.semantic["surface.canvas"]);
      expect(theme.overrides.composerSidebarBackground).toBe(mood.semantic["surface.raised"]);
      expect(theme.overrides.skill).toBe(mood.semantic["accent.secondary"]);
      expect(theme.overrides.claudeShimmer).toBe(
        mixHex(theme.overrides.claude, theme.overrides.text, 0.25),
      );
      expect(theme.overrides.inverseText).toBe(textOn(mood, theme.overrides.claude));
      for (const [key, status] of [
        ["Added", "status.success"],
        ["Removed", "status.error"],
      ] as const) {
        expect(theme.overrides[`diff${key}`]).toBe(diffRow(mood, status));
        expect(theme.overrides[`diff${key}Dimmed`]).toBe(diffRow(mood, status, "quiet"));
        expect(theme.overrides[`diff${key}Word`]).toBe(diffRow(mood, status, "emph"));
      }
    }
  });

  test("Claude emits all moods and only the agreed statusline contract", () => {
    const files = renderClaudeCodeFiles(themeBundle.themes);
    expect(files).toHaveLength(6);
    for (const mood of themeBundle.themes) {
      expect(
        JSON.parse(files.find((f) => f.path === `themes/hue-${mood.id}.json`)?.content ?? ""),
      ).toEqual(mapMoodToClaudeCode(mood));
      expect(
        JSON.parse(files.find((f) => f.path === `statusline/hue-${mood.id}.json`)?.content ?? ""),
      ).toEqual({
        segments: ["repo", "branch", "context", "tokens", "diff", "model", "agents"],
        palette: mood.semantic,
      });
    }
    const plugin = JSON.parse(
      readFileSync(
        new URL("../packages/claude-code-plugin/.claude-plugin/plugin.json", import.meta.url),
        "utf8",
      ),
    );
    expect(plugin.name).toBe("hue-theme");
    expect(plugin.experimental.themes).toBe("./themes/");
  });

  test("Codex adds native accent/diff rules while retaining common syntax", () => {
    const files = renderCodexCliFiles(themeBundle.themes);
    expect(files).toHaveLength(3);
    for (const mood of themeBundle.themes) {
      const content = files.find((f) => f.path === `themes/hue-${mood.id}.tmTheme`)?.content ?? "";
      expect(content).toContain("<string>codex.accent</string>");
      expect(content).toContain(`<string>${mood.semantic["accent.primary"]}</string>`);
      for (const status of ["status.success", "status.error"] as const) {
        expect(content).toContain(
          `<key>background</key>\n        <string>${diffRow(mood, status)}</string>`,
        );
      }
      expect(content).toContain("<string>keyword.operator</string>");
      expect(content).toContain(
        "<string>markup.heading.6, markup.heading.6 entity.name.section</string>",
      );
      expect(renderBatTheme(mood)).toBe(renderBatFiles([mood])[0].content);
    }
  });

  test("resolved tmTheme rules escape XML and allow background-only and style resets", () => {
    const output = renderBatTheme(themeBundle.themes[0], [
      { name: "a & <b>", scope: "x > y", background: "a&b", fontStyle: "" },
      { name: "foreground", scope: "fg", foreground: "a<b", fontStyle: "bold&italic" },
    ]);
    expect(output).toContain("<string>a &amp; &lt;b&gt;</string>");
    expect(output).toContain("<string>x &gt; y</string>");
    expect(output).toContain("<string>a&amp;b</string>");
    expect(output).toContain("<string>a&lt;b</string>");
    expect(output).toContain("<string>bold&amp;italic</string>");
    expect(output).toContain("<key>fontStyle</key>\n        <string></string>");
  });
});
