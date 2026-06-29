import { describe, expect, test } from "bun:test";
import { themeBundle } from "../packages/tokens/generated/themes";
import { mapMoodToYaak } from "../packages/tokens/src/adapters/yaak";

const HEX = /^#[0-9A-F]{6}$/;
const BASE_KEYS = [
  "surface",
  "surfaceHighlight",
  "text",
  "textSubtle",
  "textSubtlest",
  "selection",
  "surfaceActive",
  "border",
  "borderSubtle",
  "primary",
  "secondary",
  "info",
  "success",
  "notice",
  "warning",
  "danger",
];

describe("Hue → Yaak adapter", () => {
  const mapped = themeBundle.themes.map((theme) => mapMoodToYaak(theme));

  test("maps every mood to a Yaak theme with all base tokens", () => {
    for (const theme of mapped) {
      expect(Object.keys(theme.base).sort()).toEqual([...BASE_KEYS].sort());
    }
  });

  test("emits valid uppercase hex for every base token", () => {
    for (const theme of mapped) {
      for (const value of Object.values(theme.base)) {
        expect(value).toMatch(HEX);
      }
    }
  });

  test("marks dark for Mưa and Hương, light for Cung", () => {
    expect(Object.fromEntries(mapped.map((theme) => [theme.id, theme.dark]))).toEqual({
      cung: false,
      huong: true,
      mua: true,
    });
  });

  test("uses the Huế mood label directly", () => {
    expect(mapped.map((theme) => theme.label)).toEqual(["Huế Cung", "Huế Hương", "Huế Mưa"]);
  });
});
