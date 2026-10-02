import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { themeBundle } from "../packages/tokens/generated/themes";
import { inkdropManifest } from "../packages/tokens/src/adapters/inkdrop";
import { yaakManifest } from "../packages/tokens/src/adapters/yaak";
import { CONTRACT, contractTokens, validateManifest } from "../packages/tokens/src/contract";
import { ADAPTERS } from "../packages/tokens/src/registry";

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

describe("adapter registry", () => {
  // An adapter file with a manifest but no registry entry renders nothing and
  // fails no check — the build simply never calls it.
  test("registers every adapter that declares a manifest, once", () => {
    const dir = resolve(import.meta.dir, "../packages/tokens/src/adapters");
    const declared = readdirSync(dir)
      .filter((file) => file.endsWith(".ts"))
      .filter((file) => readFileSync(resolve(dir, file), "utf8").includes("Manifest = {"))
      .map((file) => file.replace(/\.ts$/, ""))
      .sort();
    expect(ADAPTERS.map((adapter) => adapter.name).sort()).toEqual(declared);
  });

  test("every registered adapter accounts for every contract family", () => {
    for (const adapter of ADAPTERS) {
      expect(() => validateManifest(adapter.name, adapter.manifest)).not.toThrow();
    }
  });
});
