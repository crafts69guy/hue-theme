// The token pipeline's pure core: resolve a DTCG theme source into a mood,
// validate it against the contract, and render the published bundle files.
// scripts/build.ts is only I/O around these functions, so all of this is
// reachable from the tests — and measured by coverage.

import { CONTRACT } from "./contract";
import type { ResolvedMood } from "./mood";

export type Token = { $value: unknown };
export type Node = Token | string | { [key: string]: Node };
export type ThemeSource = {
  $description: string;
  meta: { id: string; label: string; appearance: "dark" | "light" };
  primitive: Record<string, Token>;
  semantic: Record<string, Node>;
};

// The resolved bundle's format version, written into themes.json/.ts/.js.
export const BUNDLE_VERSION = "0.2.0";

function isToken(value: unknown): value is Token {
  return Boolean(value && typeof value === "object" && "$value" in value);
}

export function colorHex(token: Token): string {
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

export function resolveValue(value: unknown, source: ThemeSource, stack: string[] = []): string {
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

// Validate a mood's resolved semantic keys against the declared contract:
// every token must belong to a declared family; closed families must match
// exactly; open families must include at least the declared roles.
export function validateAgainstContract(id: string, semantic: Record<string, string>): void {
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

/** Resolve one theme source file into the mood every adapter renders from. */
export function resolveTheme(source: ThemeSource): ResolvedMood {
  const primitive = Object.fromEntries(
    Object.entries(source.primitive)
      .filter(([key]) => !key.startsWith("$"))
      .map(([key, token]) => [key, colorHex(token)]),
  );
  const semantic = flatten(source.semantic, source);
  return { ...source.meta, description: source.$description, primitive, semantic };
}

/**
 * Secondary check: moods agree with each other (catches open-family drift,
 * where a role is allowed but must still be present in every mood).
 */
export function assertSameContract(themes: readonly ResolvedMood[]): void {
  const contracts = themes.map((theme) => Object.keys(theme.semantic).sort().join("\n"));
  if (!contracts.every((contract) => contract === contracts[0])) {
    throw new Error("Every mood must implement the same semantic token contract");
  }
}

/** The published bundle (`generated/themes.*`), as paths relative to generated/. */
export function renderBundleFiles(
  themes: readonly ResolvedMood[],
): Array<{ path: string; content: string }> {
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

  const json = `${JSON.stringify({ version: BUNDLE_VERSION, themes }, null, 2)}\n`;
  const typescript = `// Generated by scripts/build.ts. Do not edit.
export const themeBundle = ${JSON.stringify({ version: BUNDLE_VERSION, themes }, null, 2)} as const;
export type ThemeId = (typeof themeBundle.themes)[number]["id"];
export type ResolvedTheme = (typeof themeBundle.themes)[number];

export function getTheme(id: ThemeId): ResolvedTheme {
  const theme = themeBundle.themes.find((candidate) => candidate.id === id);
  if (!theme) throw new Error(\`Unknown Hue Theme mood: \${id}\`);
  return theme;
}

${tokenContract}
`;
  const javascript = `// Generated by scripts/build.ts. Do not edit.
export const themeBundle = ${JSON.stringify({ version: BUNDLE_VERSION, themes }, null, 2)};

export function getTheme(id) {
  const theme = themeBundle.themes.find((candidate) => candidate.id === id);
  if (!theme) throw new Error(\`Unknown Hue Theme mood: \${id}\`);
  return theme;
}

${[...families]
  .map(
    ([family, keys]) =>
      `export const ${family.toUpperCase()}_TOKENS = ${JSON.stringify(keys, null, 2)};`,
  )
  .join("\n\n")}
`;
  const declarationContract = [
    `export type SemanticToken =\n${semanticKeys.map((key) => `  | "${key}"`).join("\n")};`,
    ...[...families].map(([family, keys]) => {
      const constName = `${family.toUpperCase()}_TOKENS`;
      return [
        `export declare const ${constName}: readonly ${JSON.stringify(keys)};`,
        `export type ${pascal(family)}Token = (typeof ${constName})[number];`,
      ].join("\n");
    }),
  ].join("\n\n");
  const declaration = `// Generated by scripts/build.ts. Do not edit.
export type ThemeId = ${themes.map((theme) => `"${theme.id}"`).join(" | ")};
export type Appearance = "light" | "dark";
${declarationContract}

export interface ResolvedTheme {
  readonly id: ThemeId;
  readonly label: string;
  readonly appearance: Appearance;
  readonly description: string;
  readonly primitive: Readonly<Record<string, string>>;
  readonly semantic: Readonly<Record<SemanticToken, string>>;
}

export declare const themeBundle: {
  readonly version: string;
  readonly themes: readonly ResolvedTheme[];
};

export declare function getTheme(id: ThemeId): ResolvedTheme;
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

  return [
    { path: "themes.json", content: json },
    { path: "themes.ts", content: typescript },
    { path: "themes.js", content: javascript },
    { path: "themes.d.ts", content: declaration },
    { path: "themes.css", content: css },
  ];
}
