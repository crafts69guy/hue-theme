import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getTheme, themeBundle } from "../packages/tokens/generated/themes";
import {
  assertSameContract,
  colorHex,
  renderBundleFiles,
  resolveTheme,
  resolveValue,
  type ThemeSource,
  validateAgainstContract,
} from "../packages/tokens/src/bundle";

const tokens = resolve(import.meta.dir, "../packages/tokens");

function sources(): ThemeSource[] {
  const dir = resolve(tokens, "src/themes");
  return readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => JSON.parse(readFileSync(resolve(dir, file), "utf8")) as ThemeSource);
}

const color = (hex: string) => ({ $value: { colorSpace: "srgb", components: [0, 0, 0], hex } });

/** A minimal source with one primitive and one aliased semantic role. */
function probe(semantic: ThemeSource["semantic"]): ThemeSource {
  return {
    $description: "probe",
    meta: { id: "probe", label: "Probe", appearance: "dark" },
    primitive: { $type: color("#000000"), ink: color("#00ff00") },
    semantic,
  };
}

describe("resolving theme sources", () => {
  test("resolves every shipped source to the published bundle", () => {
    expect(sources().map(resolveTheme)).toEqual(themeBundle.themes.map((theme) => ({ ...theme })));
  });

  test("upper-cases hex and follows aliases through other aliases", () => {
    const source = probe({
      $type: "color",
      surface: { canvas: { $value: "{primitive.ink}" } },
      text: { primary: { $value: "{semantic.surface.canvas}" } },
    });
    const mood = resolveTheme(source);
    expect(mood.semantic).toEqual({ "surface.canvas": "#00FF00", "text.primary": "#00FF00" });
    expect(mood.primitive).toEqual({ ink: "#00FF00" });
  });

  test("passes a literal string value through untouched", () => {
    expect(resolveValue("transparent", probe({}))).toBe("transparent");
  });

  test("refuses a circular alias and names the cycle", () => {
    const source = probe({
      a: { x: { $value: "{semantic.b.x}" } },
      b: { x: { $value: "{semantic.a.x}" } },
    });
    expect(() => resolveTheme(source)).toThrow(/Circular token alias: semantic\.b\.x -> /);
  });

  test("refuses an alias to nothing", () => {
    expect(() => resolveTheme(probe({ a: { x: { $value: "{primitive.nope}" } } }))).toThrow(
      "Unresolved token alias {primitive.nope}",
    );
  });

  test("refuses a value that is neither a colour nor a string", () => {
    expect(() => resolveValue(42, probe({}))).toThrow("Unsupported token value 42");
    expect(() => colorHex({ $value: "#00ff00" })).toThrow(/Expected a DTCG color object/);
  });
});

describe("validating against the contract", () => {
  const semantic = { ...themeBundle.themes[0].semantic } as Record<string, string>;

  test("accepts every shipped mood", () => {
    for (const theme of themeBundle.themes) {
      expect(() => validateAgainstContract(theme.id, theme.semantic)).not.toThrow();
    }
  });

  test("refuses a token outside every declared family", () => {
    expect(() => validateAgainstContract("x", { ...semantic, "shadow.soft": "#000000" })).toThrow(
      "token shadow.soft has no declared family",
    );
  });

  test("refuses a mood missing a declared role", () => {
    const { "status.notice": _, ...missing } = semantic;
    expect(() => validateAgainstContract("x", missing)).toThrow(
      "status is missing role(s): notice",
    );
  });

  test("refuses an extra role in a closed family but allows one in an open family", () => {
    expect(() => validateAgainstContract("x", { ...semantic, "status.fatal": "#000000" })).toThrow(
      "status is closed; undeclared role(s): fatal",
    );
    expect(() =>
      validateAgainstContract("x", { ...semantic, "syntax.decorator": "#000000" }),
    ).not.toThrow();
  });

  test("refuses moods that disagree on their token set", () => {
    const [first, second] = themeBundle.themes;
    expect(() => assertSameContract([first, second])).not.toThrow();
    const drifted = { ...second, semantic: { ...second.semantic, "syntax.decorator": "#000000" } };
    expect(() => assertSameContract([first, drifted])).toThrow("same semantic token contract");
  });
});

describe("the published bundle", () => {
  test("renders exactly the files on disk", () => {
    for (const file of renderBundleFiles(themeBundle.themes)) {
      expect(readFileSync(resolve(tokens, "generated", file.path), "utf8")).toBe(file.content);
    }
  });

  test("getTheme finds a mood by id and refuses an unknown one", () => {
    expect(getTheme("mua").label).toBe("Huế Mưa");
    expect(() => getTheme("nope" as "mua")).toThrow("Unknown Hue Theme mood: nope");
  });
});
