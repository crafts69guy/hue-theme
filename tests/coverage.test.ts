import { describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { relative, resolve } from "node:path";

// Bun reports coverage only for files a test imports, so a module nothing
// imports would be missing from the table rather than showing 0% — and the 97%
// gate in bunfig.toml would never see it. Loading every module here puts each
// one in the report, where an untested file fails the gate.
const src = resolve(import.meta.dir, "../packages/tokens/src");

function modules(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) return modules(path);
    return entry.name.endsWith(".ts") ? [path] : [];
  });
}

describe("coverage scope", () => {
  test("every module under packages/tokens/src loads", async () => {
    const found = modules(src);
    expect(found.length).toBeGreaterThan(15);
    for (const path of found) {
      const loaded = await import(path);
      expect(`${relative(src, path)}: ${Object.keys(loaded).length > 0}`).toBe(
        `${relative(src, path)}: true`,
      );
    }
  });
});
