import { describe, expect, test } from "bun:test";
import { themeBundle } from "../packages/tokens/generated/themes";
import { inkdropManifest } from "../packages/tokens/src/adapters/inkdrop";
import { yaakManifest } from "../packages/tokens/src/adapters/yaak";
import { CONTRACT, contractTokens, validateManifest } from "../packages/tokens/src/contract";

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

describe("adapter capability manifest", () => {
  test("Yaak accounts for every contract family", () => {
    expect(() => validateManifest("yaak", yaakManifest)).not.toThrow();
  });

  test("Inkdrop accounts for every contract family", () => {
    expect(() => validateManifest("inkdrop", inkdropManifest)).not.toThrow();
  });

  test("rejects a family that is neither supported nor omitted", () => {
    expect(() => validateManifest("x", { supports: ["surface"], omits: {} })).toThrow(/neither/);
  });

  test("rejects a family that is both supported and omitted", () => {
    expect(() =>
      validateManifest("x", {
        supports: ["surface", "text", "border", "accent", "status", "syntax"],
        omits: { syntax: "dup" },
      }),
    ).toThrow(/both/);
  });
});
