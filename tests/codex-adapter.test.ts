import { describe, expect, test } from "bun:test";
import { themeBundle } from "../packages/tokens/generated/themes";
import {
  CODEX_CODE_THEME_ID,
  CODEX_THEME_PREFIX,
  type CodexThemeSharePayload,
  codexManifest,
  mapMoodToCodex,
  renderCodexThemeFiles,
  renderCodexThemeShareString,
} from "../packages/tokens/src/adapters/codex";
import { validateManifest } from "../packages/tokens/src/contract";

const moods = [...themeBundle.themes];

function parseShareString(content: string): CodexThemeSharePayload {
  expect(content.endsWith("\n")).toBe(true);
  const value = content.trim();
  expect(value.startsWith(CODEX_THEME_PREFIX)).toBe(true);
  return JSON.parse(value.slice(CODEX_THEME_PREFIX.length)) as CodexThemeSharePayload;
}

describe("Hue -> ChatGPT/Codex adapter", () => {
  const files = renderCodexThemeFiles(moods);

  test("accounts for every contract family", () => {
    expect(() => validateManifest("codex", codexManifest)).not.toThrow();
  });

  test("emits one import string per mood", () => {
    expect(files.map((file) => file.path).sort()).toEqual(
      moods.map((mood) => `hue-${mood.id}.txt`).sort(),
    );
  });

  test("emits the exact v1 payload shape", () => {
    for (const { content } of files) {
      const payload = parseShareString(content);
      expect(Object.keys(payload).sort()).toEqual(["codeThemeId", "theme", "variant"]);
      expect(Object.keys(payload.theme).sort()).toEqual([
        "accent",
        "contrast",
        "fonts",
        "ink",
        "opaqueWindows",
        "semanticColors",
        "surface",
      ]);
      expect(Object.keys(payload.theme.semanticColors).sort()).toEqual([
        "diffAdded",
        "diffRemoved",
        "skill",
      ]);
    }
  });

  test("maps the supported Hue roles", () => {
    for (const mood of moods) {
      const payload = mapMoodToCodex(mood);
      expect(payload.variant).toBe(mood.appearance);
      expect(payload.theme.surface).toBe(mood.semantic["surface.canvas"]);
      expect(payload.theme.ink).toBe(mood.semantic["text.primary"]);
      expect(payload.theme.accent).toBe(mood.semantic["accent.primary"]);
      expect(payload.theme.semanticColors).toEqual({
        diffAdded: mood.semantic["status.success"],
        diffRemoved: mood.semantic["status.error"],
        skill: mood.semantic["accent.secondary"],
      });
    }
  });

  test("uses stable host defaults for derived chrome, fonts, and code", () => {
    for (const mood of moods) {
      const payload = mapMoodToCodex(mood);
      expect(payload.codeThemeId).toBe(CODEX_CODE_THEME_ID);
      expect(payload.theme.contrast).toBe(mood.appearance === "dark" ? 60 : 45);
      expect(payload.theme.fonts).toEqual({ code: null, ui: null });
      expect(payload.theme.opaqueWindows).toBe(false);
    }
  });

  test("renders deterministically", () => {
    for (const mood of moods) {
      expect(renderCodexThemeShareString(mood)).toBe(renderCodexThemeShareString(mood));
    }
  });
});
