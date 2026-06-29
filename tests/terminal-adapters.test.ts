import { describe, expect, test } from "bun:test";
import { themeBundle } from "../packages/tokens/generated/themes";
import { ghosttyManifest, renderGhosttyFiles } from "../packages/tokens/src/adapters/ghostty";
import { terminalColors } from "../packages/tokens/src/adapters/terminal";
import { renderTideFiles, tideManifest } from "../packages/tokens/src/adapters/tide";
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

  test("emits a TPM entrypoint plus one .conf per mood with status/pane/window styling", () => {
    expect(files.map((f) => f.path).sort()).toEqual(
      [...moods.map((m) => `themes/hue-${m.id}.conf`), "hue.tmux"].sort(),
    );
    for (const { content } of files.filter((f) => f.path.endsWith(".conf"))) {
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

  test("entrypoint sources the mood selected by @hue_flavour", () => {
    const entry = files.find((f) => f.path === "hue.tmux")?.content ?? "";
    expect(entry).toContain("@hue_flavour");
    expect(entry).toContain('source-file "$theme"');
    expect(entry).toMatch(/themes\/hue-\$flavour\.conf/);
  });

  test("uses the mood's accent for the active pane border", () => {
    for (const mood of moods) {
      const content = files.find((f) => f.path === `themes/hue-${mood.id}.conf`)?.content ?? "";
      expect(content).toContain(`pane-active-border-style "fg=${mood.semantic["accent.primary"]}"`);
    }
  });
});

describe("Hue → Tide adapter", () => {
  const files = renderTideFiles(moods);

  test("accounts for every contract family", () => {
    expect(() => validateManifest("tide", tideManifest)).not.toThrow();
  });

  test("emits a fish entrypoint plus one Tide theme per mood", () => {
    expect(files.map((f) => f.path).sort()).toEqual(
      [...moods.map((m) => `tide/hue-${m.id}.fish`), "tide/hue.fish"].sort(),
    );
  });

  test("entrypoint sources the mood selected by hue_flavour", () => {
    const entry = files.find((f) => f.path === "tide/hue.fish")?.content ?? "";
    expect(entry).toContain("hue_flavour");
    expect(entry).toContain('source "$theme_file"');
    expect(entry).toMatch(/hue-\$hue_flavour\.fish/);
  });

  test("uses true-color hex values instead of ANSI color names", () => {
    const ansiNames =
      /\b(?:black|red|green|yellow|blue|magenta|cyan|white|brblack|brred|brgreen|bryellow|brblue|brmagenta|brcyan|brwhite)\b/;
    for (const { content } of files.filter(
      (f) => f.path.endsWith(".fish") && f.path !== "tide/hue.fish",
    )) {
      expect(content).not.toMatch(ansiNames);
      expect(
        [...content.matchAll(/^set -g tide_[a-z0-9_]+ '#[0-9A-F]{6}'$/gm)].length,
      ).toBeGreaterThan(40);
    }
  });

  test("maps Tide's primary prompt segments to Hue semantic roles", () => {
    for (const mood of moods) {
      const content = files.find((f) => f.path === `tide/hue-${mood.id}.fish`)?.content ?? "";
      expect(content).toContain(`set -g tide_pwd_bg_color '${mood.semantic["accent.primary"]}'`);
      expect(content).toContain(`set -g tide_git_bg_color '${mood.semantic["surface.selected"]}'`);
      expect(content).toContain(`set -g tide_time_bg_color '${mood.semantic["accent.secondary"]}'`);
      expect(content).toContain(
        `set -g tide_status_bg_color_failure '${mood.semantic["status.error"]}'`,
      );
    }
  });
});
