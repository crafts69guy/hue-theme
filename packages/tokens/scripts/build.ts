import { chmod, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import {
  assertSameContract,
  renderBundleFiles,
  resolveTheme,
  type ThemeSource,
  validateAgainstContract,
} from "../src/bundle";
import { validateManifest } from "../src/contract";
import { contrastFailures, derivedFailures } from "../src/gates";
import { ADAPTERS } from "../src/registry";

// I/O only: every decision lives in src/ (bundle, gates, registry) where the
// tests reach it. This file reads the theme sources and writes or checks files.

const root = resolve(import.meta.dir, "..");
const sourceDirectory = resolve(root, "src/themes");
const outputDirectory = resolve(root, "generated");
const checkOnly = process.argv.includes("--check");

const files = (await readdir(sourceDirectory)).filter((file) => file.endsWith(".json")).sort();
const themes = await Promise.all(
  files.map(async (file) =>
    resolveTheme(JSON.parse(await readFile(resolve(sourceDirectory, file), "utf8")) as ThemeSource),
  ),
);

// Primary check: every mood conforms to the declared contract.
for (const theme of themes) validateAgainstContract(theme.id, theme.semantic);

// Each adapter must consciously account for every contract family.
for (const adapter of ADAPTERS) validateManifest(adapter.name, adapter.manifest);

assertSameContract(themes);

// Contrast floors (src/gates.ts). Every failure is reported at once so a palette
// edit shows its whole cost, not just the first token it broke.
const failures = themes.flatMap((theme) => [
  ...contrastFailures(theme.id, theme.semantic),
  ...derivedFailures(theme),
]);
if (failures.length > 0) throw new Error(`Contrast gates failed:\n  ${failures.join("\n  ")}`);

const outputs: Array<[string, string]> = [
  ...renderBundleFiles(themes).map(
    (file) => [resolve(outputDirectory, file.path), file.content] as [string, string],
  ),
  ...ADAPTERS.flatMap((adapter) =>
    adapter
      .render(themes)
      .map((file) => [resolve(root, adapter.outDir, file.path), file.content] as [string, string]),
  ),
];

for (const [path, content] of outputs) {
  if (checkOnly) {
    const existing = await readFile(path, "utf8").catch(() => "");
    if (existing !== content) throw new Error(`${basename(path)} is stale; run bun run build`);
  } else {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
    // TPM executes plugin entrypoints directly, so they must be executable.
    if (path.endsWith(".tmux")) await chmod(path, 0o755);
  }
}

console.log(`Validated and ${checkOnly ? "checked" : "built"} ${themes.length} Hue moods.`);
