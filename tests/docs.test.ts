import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { themeBundle } from "../packages/tokens/generated/themes";

const root = resolve(import.meta.dir, "..");

function readmes(): Array<{ path: string; content: string }> {
  const files = [{ path: "README.md", content: readFileSync(resolve(root, "README.md"), "utf8") }];
  for (const entry of readdirSync(resolve(root, "packages"))) {
    const path = `packages/${entry}/README.md`;
    try {
      files.push({ path, content: readFileSync(resolve(root, path), "utf8") });
    } catch {
      // Not every package ships a README.
    }
  }
  return files;
}

describe("documentation", () => {
  // Hand-written READMEs quote colours the build owns. They drifted before: the
  // Neovim colour-API example still showed Hương's canvas as #0F1313 long after
  // the token said #0F1D19, and nothing failed.
  test("every hex quoted in a README is a live token value", () => {
    const live = new Set<string>();
    for (const theme of themeBundle.themes) {
      for (const value of Object.values(theme.semantic)) live.add(value.toUpperCase());
      for (const value of Object.values(theme.primitive)) live.add(value.toUpperCase());
    }

    for (const { path, content } of readmes()) {
      const quoted = content.match(/#[0-9A-Fa-f]{6}/g) ?? [];
      for (const hex of quoted) {
        expect(`${path}: ${hex.toUpperCase()}`).toBe(
          `${path}: ${live.has(hex.toUpperCase()) ? hex.toUpperCase() : "not a token value"}`,
        );
      }
    }
  });

  // Adapters were added faster than the docs describing them: bat and lazygit
  // shipped theme files for months while appearing in neither the root README
  // nor the architecture notes, and herdr/tuicr only ever got a table row.
  test("every host adapter is described in the docs", () => {
    const dir = resolve(root, "packages/tokens/src/adapters");
    const hosts = readdirSync(dir)
      .filter((file) => file.endsWith(".ts"))
      .filter((file) => readFileSync(resolve(dir, file), "utf8").includes("Manifest = {"))
      .map((file) => file.replace(/\.ts$/, ""));

    // terminal.ts is shared derivation, not a host, and declares no manifest.
    expect(hosts).not.toContain("terminal");
    expect(hosts.length).toBeGreaterThanOrEqual(10);

    for (const doc of ["README.md", "docs/architecture.md", "packages/tokens/README.md"]) {
      const content = readFileSync(resolve(root, doc), "utf8");
      for (const host of hosts) {
        const mentioned = new RegExp(`\\b${host}\\b`, "i").test(content);
        expect(`${doc}: ${host} ${mentioned ? "documented" : "undocumented"}`).toBe(
          `${doc}: ${host} documented`,
        );
      }
    }
  });

  // The same three-row mood table is repeated across the plugin READMEs, so the
  // wording drifts one file at a time — Hương was described two different ways.
  test("the moods are described the same way everywhere", () => {
    const feels = new Map<string, Set<string>>();
    for (const { content } of readmes()) {
      for (const line of content.split("\n")) {
        const row = line.match(/^\|\s*\*\*(Huế [^*]+)\*\*\s*\|(.+)\|\s*$/);
        if (!row) continue;
        const feel = row[2].split("|").pop()?.trim() ?? "";
        if (!feel) continue;
        feels.set(row[1].trim(), (feels.get(row[1].trim()) ?? new Set()).add(feel));
      }
    }

    expect(feels.size).toBe(3);
    for (const [mood, variants] of feels) {
      expect(`${mood}: ${[...variants].join(" / ")}`).toBe(`${mood}: ${[...variants][0]}`);
    }
  });
});
