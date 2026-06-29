import { chmod, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { ghosttyManifest, renderGhosttyFiles } from "../src/adapters/ghostty";
import { inkdropManifest, renderInkdropPackages } from "../src/adapters/inkdrop";
import { neovimManifest, renderNeovimFiles } from "../src/adapters/neovim";
import { renderTideFiles, tideManifest } from "../src/adapters/tide";
import { renderTmuxFiles, tmuxManifest } from "../src/adapters/tmux";
import { renderYaakPluginSource, yaakManifest } from "../src/adapters/yaak";
import { CONTRACT, validateManifest } from "../src/contract";

type Token = { $value: unknown };
type Node = Token | string | { [key: string]: Node };
type ThemeSource = {
  $description: string;
  meta: { id: string; label: string; appearance: "dark" | "light" };
  primitive: Record<string, Token>;
  semantic: Record<string, Node>;
};

const root = resolve(import.meta.dir, "..");
const sourceDirectory = resolve(root, "src/themes");
const outputDirectory = resolve(root, "generated");
const checkOnly = process.argv.includes("--check");

function isToken(value: unknown): value is Token {
  return Boolean(value && typeof value === "object" && "$value" in value);
}

function colorHex(token: Token): string {
  const value = token.$value;
  if (
    typeof value === "object" &&
    value !== null &&
    "hex" in value &&
    typeof value.hex === "string"
  ) {
    return value.hex.toUpperCase();
  }
  throw new Error(`Expected a DTCG color object, received ${JSON.stringify(value)}`);
}

function resolveValue(value: unknown, source: ThemeSource, stack: string[] = []): string {
  if (typeof value === "object" && value !== null && "hex" in value) {
    return colorHex({ $value: value });
  }

  if (typeof value !== "string") {
    throw new Error(`Unsupported token value ${JSON.stringify(value)}`);
  }

  const match = value.match(/^\{(.+)\}$/);
  if (!match) return value;
  const path = match[1];
  if (stack.includes(path)) {
    throw new Error(`Circular token alias: ${[...stack, path].join(" -> ")}`);
  }

  const target = path
    .split(".")
    .reduce<unknown>(
      (current, key) =>
        current && typeof current === "object"
          ? (current as Record<string, unknown>)[key]
          : undefined,
      source,
    );
  if (!isToken(target)) throw new Error(`Unresolved token alias {${path}}`);
  return resolveValue(target.$value, source, [...stack, path]);
}

function flatten(
  node: Record<string, Node>,
  source: ThemeSource,
  prefix = "",
): Record<string, string> {
  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith("$")) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (isToken(value)) output[path] = resolveValue(value.$value, source);
    else if (typeof value === "object") {
      Object.assign(output, flatten(value as Record<string, Node>, source, path));
    }
  }
  return output;
}

function relativeLuminance(hex: string): number {
  const matches = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!matches) throw new Error(`Invalid sRGB hex color: ${hex}`);

  const channels = matches
    .slice(1)
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// Validate a mood's resolved semantic keys against the declared contract:
// every token must belong to a declared family; closed families must match
// exactly; open families must include at least the declared roles.
function validateAgainstContract(id: string, semantic: Record<string, string>): void {
  const actual = new Map<string, Set<string>>();
  for (const key of Object.keys(semantic)) {
    const dot = key.indexOf(".");
    const family = key.slice(0, dot);
    if (!(family in CONTRACT)) {
      throw new Error(`${id}: token ${key} has no declared family in the contract`);
    }
    actual.set(family, (actual.get(family) ?? new Set()).add(key.slice(dot + 1)));
  }
  for (const [family, spec] of Object.entries(CONTRACT)) {
    const declared: readonly string[] = spec.roles;
    const roles = actual.get(family) ?? new Set<string>();
    const missing = declared.filter((role) => !roles.has(role));
    if (missing.length > 0) {
      throw new Error(`${id}: ${family} is missing role(s): ${missing.join(", ")}`);
    }
    const extra = spec.closed ? [...roles].filter((role) => !declared.includes(role)) : [];
    if (extra.length > 0) {
      throw new Error(`${id}: ${family} is closed; undeclared role(s): ${extra.join(", ")}`);
    }
  }
}

const files = (await readdir(sourceDirectory)).filter((file) => file.endsWith(".json")).sort();
const themes = await Promise.all(
  files.map(async (file) => {
    const source = JSON.parse(
      await readFile(resolve(sourceDirectory, file), "utf8"),
    ) as ThemeSource;
    const primitive = Object.fromEntries(
      Object.entries(source.primitive)
        .filter(([key]) => !key.startsWith("$"))
        .map(([key, token]) => [key, colorHex(token)]),
    );
    const semantic = flatten(source.semantic, source);
    return { ...source.meta, description: source.$description, primitive, semantic };
  }),
);

// Primary check: every mood conforms to the declared contract.
for (const theme of themes) {
  validateAgainstContract(theme.id, theme.semantic);
}

// Each adapter must consciously account for every contract family.
validateManifest("yaak", yaakManifest);
validateManifest("neovim", neovimManifest);
validateManifest("ghostty", ghosttyManifest);
validateManifest("tmux", tmuxManifest);
validateManifest("tide", tideManifest);
validateManifest("inkdrop", inkdropManifest);

// Secondary check: moods agree with each other (catches open-family drift,
// where a role is allowed but must still be present in every mood).
const contracts = themes.map((theme) => Object.keys(theme.semantic).sort().join("\n"));
if (!contracts.every((contract) => contract === contracts[0])) {
  throw new Error("Every mood must implement the same semantic token contract");
}

for (const theme of themes) {
  const canvas = theme.semantic["surface.canvas"];
  const pairs: Array<[string, number]> = [
    ["text.primary", 4.5],
    ["text.secondary", 4.5],
    ["accent.primary", 4.5],
    ["border.subtle", 3],
  ];
  for (const [token, minimum] of pairs) {
    const ratio = contrastRatio(theme.semantic[token], canvas);
    if (ratio < minimum) {
      throw new Error(`${theme.id}:${token} contrast ${ratio.toFixed(2)} is below ${minimum}:1`);
    }
  }
}

// All moods share one contract (validated above), so any mood's keys describe it.
const semanticKeys = Object.keys(themes[0].semantic);
const families = new Map<string, string[]>();
for (const key of semanticKeys) {
  const family = key.slice(0, key.indexOf("."));
  families.set(family, [...(families.get(family) ?? []), key]);
}
const pascal = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const tokenContract = [
  `export type SemanticToken =\n${semanticKeys.map((key) => `  | "${key}"`).join("\n")};`,
  ...[...families].map(([family, keys]) => {
    const constName = `${family.toUpperCase()}_TOKENS`;
    return [
      `export const ${constName} = [\n${keys.map((key) => `  "${key}",`).join("\n")}\n] as const;`,
      `export type ${pascal(family)}Token = (typeof ${constName})[number];`,
    ].join("\n");
  }),
].join("\n\n");

const json = `${JSON.stringify({ version: "0.2.0", themes }, null, 2)}\n`;
const typescript = `// Generated by scripts/build.ts. Do not edit.
export const themeBundle = ${JSON.stringify({ version: "0.2.0", themes }, null, 2)} as const;
export type ThemeId = (typeof themeBundle.themes)[number]["id"];
export type ResolvedTheme = (typeof themeBundle.themes)[number];

export function getTheme(id: ThemeId): ResolvedTheme {
  const theme = themeBundle.themes.find((candidate) => candidate.id === id);
  if (!theme) throw new Error(\`Unknown Hue Theme mood: \${id}\`);
  return theme;
}

${tokenContract}
`;
const css = `${themes
  .map(
    (theme) => `[data-hue-theme="${theme.id}"] {
${Object.entries(theme.semantic)
  .map(([key, value]) => `  --hue-${key.replaceAll(".", "-")}: ${value};`)
  .join("\n")}
}`,
  )
  .join("\n\n")}\n`;

const yaakPluginSource = renderYaakPluginSource(themes);
const inkdropPackages = renderInkdropPackages(themes);

const outputs: Array<[string, string]> = [
  [resolve(outputDirectory, "themes.json"), json],
  [resolve(outputDirectory, "themes.ts"), typescript],
  [resolve(outputDirectory, "themes.css"), css],
  [resolve(root, "../yaak-plugin/src/index.ts"), yaakPluginSource],
  ...renderNeovimFiles(themes).map(
    (file) => [resolve(root, "../nvim-plugin", file.path), file.content] as [string, string],
  ),
  ...renderGhosttyFiles(themes).map(
    (file) => [resolve(root, "../terminal-themes", file.path), file.content] as [string, string],
  ),
  ...renderTmuxFiles(themes).map(
    (file) => [resolve(root, "../tmux-plugin", file.path), file.content] as [string, string],
  ),
  ...renderTideFiles(themes).map(
    (file) => [resolve(root, "../fish-themes", file.path), file.content] as [string, string],
  ),
  ...inkdropPackages.flatMap((pack) =>
    pack.files.map(
      (file) =>
        [resolve(root, "..", pack.packagePath, file.path), file.content] as [string, string],
    ),
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
