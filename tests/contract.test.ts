import { describe, expect, test } from "bun:test";
import { themeBundle } from "../packages/tokens/generated/themes";
import { CONTRACT, contractTokens } from "../packages/tokens/src/contract";

describe("Hue semantic contract", () => {
  test("every mood matches the declared contract token set", () => {
    const declared = contractTokens().sort();
    for (const theme of themeBundle.themes) {
      expect(Object.keys(theme.semantic).sort()).toEqual(declared);
    }
  });

  test("status is a closed family (consumers switch on it exhaustively)", () => {
    expect(CONTRACT.status.closed).toBe(true);
    expect([...CONTRACT.status.roles]).toContain("notice");
  });

  test("syntax is an open family (curated display)", () => {
    expect(CONTRACT.syntax.closed).toBe(false);
  });
});
