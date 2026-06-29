import { describe, expect, test } from "bun:test";
import { themeBundle } from "../packages/tokens/generated/themes";
import { ghosttyManifest, renderGhosttyFiles } from "../packages/tokens/src/adapters/ghostty";
import { terminalColors } from "../packages/tokens/src/adapters/terminal";
import { renderTmuxFiles, tmuxManifest } from "../packages/tokens/src/adapters/tmux";
import { validateManifest } from "../packages/tokens/src/contract";

const HEX = /^#[0-9A-F]{6}$/;
const moods = [...themeBundle.themes];

describe("shared terminal ANSI", () => {
  test("derives 16 valid-hex colors per mood", () => {
    for (const mood of moods) {
      const colors = terminalColors(mood);
      expect(colors).toHaveLength(16);
      for (const color of colors) expect(color).toMatch(HEX);
    }
  });
});

describe("Hue → Ghostty adapter", () => {
  const files = renderGhosttyFiles(moods);

  test("accounts for every contract family", () => {
    expect(() => validateManifest("ghostty", ghosttyManifest)).not.toThrow();
  });

  test("emits one theme file per mood", () => {
    expect(files.map((f) => f.path).sort()).toEqual(moods.map((m) => `ghostty/hue-${m.id}`).sort());
  });

  test("each theme has 16 palette entries plus bg/fg/cursor/selection", () => {
    for (const { content } of files) {
      expect([...content.matchAll(/^palette = \d+=#[0-9A-F]{6}$/gm)]).toHaveLength(16);
      for (const key of [
        "background",
        "foreground",
        "cursor-color",
        "cursor-text",
        "selection-background",
        "selection-foreground",
      ]) {
        expect(content).toMatch(new RegExp(`^${key} = #[0-9A-F]{6}$`, "m"));
      }
    }
  });

  test("background/foreground match the mood's canvas/text", () => {
    for (const mood of moods) {
      const content = files.find((f) => f.path === `ghostty/hue-${mood.id}`)?.content ?? "";
      expect(content).toContain(`background = ${mood.semantic["surface.canvas"]}`);
      expect(content).toContain(`foreground = ${mood.semantic["text.primary"]}`);
    }
  });
});

describe("Hue → tmux adapter", () => {
  const files = renderTmuxFiles(moods);

  test("accounts for every contract family", () => {
    expect(() => validateManifest("tmux", tmuxManifest)).not.toThrow();
  });

  test("emits one .conf per mood with status/pane/window styling", () => {
    expect(files.map((f) => f.path).sort()).toEqual(
      moods.map((m) => `tmux/hue-${m.id}.conf`).sort(),
    );
    for (const { content } of files) {
      for (const directive of [
        "status-style",
        "pane-active-border-style",
        "window-status-current-format",
        "clock-mode-colour",
      ]) {
        expect(content).toContain(directive);
      }
    }
  });

  test("uses the mood's accent for the active pane border", () => {
    for (const mood of moods) {
      const content = files.find((f) => f.path === `tmux/hue-${mood.id}.conf`)?.content ?? "";
      expect(content).toContain(`pane-active-border-style "fg=${mood.semantic["accent.primary"]}"`);
    }
  });
});
