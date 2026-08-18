import { describe, expect, test } from "bun:test";
import { themeBundle } from "../packages/tokens/generated/themes";
import { renderInkdropPackages } from "../packages/tokens/src/adapters/inkdrop";

const HEX = /^#[0-9a-f]{6}$/;
const STYLE_SHEETS = ["palette.css", "ui.css", "syntax.css", "preview.css"];

function fileContent(pack: ReturnType<typeof renderInkdropPackages>[number], path: string): string {
  const file = pack.files.find((candidate) => candidate.path === path);
  if (!file) throw new Error(`${pack.packageName} is missing ${path}`);
  return file.content;
}

function packageJson(pack: ReturnType<typeof renderInkdropPackages>[number]) {
  return JSON.parse(fileContent(pack, "package.json")) as {
    name: string;
    theme: boolean | string;
    themeAppearance?: string;
    styleSheets: string[];
    scripts?: { prepublishOnly?: string };
    engines: { inkdrop: string };
    devDependencies?: Record<string, string>;
  };
}

describe("Hue -> Inkdrop adapter", () => {
  const packages = renderInkdropPackages(themeBundle.themes);

  const appearanceOf = (moodId: string) => {
    const mood = themeBundle.themes.find((candidate) => candidate.id === moodId);
    if (!mood) throw new Error(`Unknown mood: ${moodId}`);
    return mood.appearance;
  };

  test("renders one unified package for every mood", () => {
    expect(packages).toHaveLength(3);
    expect(packages.map((pack) => pack.packageName)).toEqual([
      "hue-cung-theme",
      "hue-huong-theme",
      "hue-mua-theme",
    ]);
  });

  test("writes Inkdrop package metadata for every generated package", () => {
    for (const pack of packages) {
      const metadata = packageJson(pack);
      expect(metadata.name).toBe(pack.packageName);
      expect(metadata.theme).toBe(true);
      expect(metadata.styleSheets).toEqual(STYLE_SHEETS);
      expect(metadata.engines.inkdrop).toBe("^6.0.0");
      expect(metadata.scripts?.prepublishOnly).toContain("generate-palette");
      expect(metadata.scripts?.prepublishOnly).toContain("palette.json");
      expect(metadata.devDependencies?.["@inkdropapp/theme-dev-helpers"]).toBe("^0.6.1");
    }
  });

  test("emits generated CSS with required slots for every unified theme area", () => {
    for (const pack of packages) {
      const palette = fileContent(pack, "styles/palette.css");
      const ui = fileContent(pack, "styles/ui.css");
      const syntax = fileContent(pack, "styles/syntax.css");
      const preview = fileContent(pack, "styles/preview.css");

      expect(palette).toContain("@layer theme");
      expect(palette).toContain("--hue-surface-canvas:");
      expect(palette).toContain(`color-scheme: ${appearanceOf(pack.moodId)};`);

      expect(ui).toContain("@layer theme.ui");
      expect(ui).toContain("--page-background:");
      expect(ui).toContain("--sidebar-background:");
      expect(ui).toContain("--note-list-bar-background:");
      expect(ui).toContain("--editor-background:");

      expect(syntax).toContain("@layer theme.syntax");
      expect(syntax).toContain("--editor-foreground-color:");
      expect(syntax).toContain("--syntax-keyword-color:");
      expect(syntax).toContain("--md-codeblock-background-color:");

      expect(preview).toContain("@layer theme.preview");
      expect(preview).toContain(".mde-preview");
      expect(preview).toContain("--mde-preview-blockquote-border-color:");
      expect(preview).toContain("--syntax-string-color:");
      expect(preview).toContain("--mermaid-node-background-color:");
    }
  });

  test("uses resolved hex values in CSS", () => {
    for (const pack of packages) {
      const css = STYLE_SHEETS.map((sheet) => fileContent(pack, `styles/${sheet}`)).join("\n");
      const matches = css.match(/#[0-9a-f]{6}/g) ?? [];
      expect(matches.length).toBeGreaterThan(20);
      for (const value of matches) expect(value).toMatch(HEX);
    }
  });

  // Inkdrop's acrylic/vibrancy window only shows through if the theme stops
  // painting opaque surfaces over it. Without these blocks the setting is on and
  // nothing happens, which is silent — hence a test rather than a comment.
  test("lets the acrylic window show through", () => {
    for (const pack of packages) {
      const ui = fileContent(pack, "styles/ui.css");
      const syntax = fileContent(pack, "styles/syntax.css");

      expect(ui).toContain(":root:has(body.acrylic-window)");
      expect(ui).toMatch(
        /:root:has\(body\.acrylic-window\) \{[^}]*--page-background: transparent;/,
      );
      expect(syntax).toMatch(
        /:root:has\(body\.acrylic-window\) \{[^}]*--editor-background-color: transparent;/,
      );

      // The panels are graded, not uniform: chrome nearly clear so the window
      // reads as glass, the surface under body text mostly solid. A flat figure
      // across all three is the regression worth catching.
      const acrylic = ui.match(/:root:has\(body\.acrylic-window\) \{([^}]*)\}/)?.[1] ?? "";
      const opacity = (key: string) => {
        const match = acrylic.match(new RegExp(`${key}: rgb\\(\\d+ \\d+ \\d+ / (\\d+)%\\);`));
        expect(match).not.toBeNull();
        return Number(match?.[1]);
      };
      const sidebar = opacity("--sidebar-background");
      const noteList = opacity("--note-list-bar-background");
      const editor = opacity("--editor-background");
      expect(sidebar).toBeLessThan(noteList);
      expect(noteList).toBeLessThan(editor);
      expect(editor).toBeLessThan(100);
    }
  });

  // Inkdrop scopes its own scrollbar rules to Windows and Linux, so on macOS the
  // theme's scrollbar variables are inert and the native grey shows. These rules
  // are unscoped on purpose; losing them puts the grey back with no error.
  test("styles scrollbars itself rather than relying on the platform rules", () => {
    for (const pack of packages) {
      const ui = fileContent(pack, "styles/ui.css");
      const mood = themeBundle.themes.find((candidate) => candidate.id === pack.moodId);
      const line = mood?.semantic["border.subtle"] ?? "";
      const rgb = [1, 3, 5].map((i) => Number.parseInt(line.slice(i, i + 2), 16)).join(" ");

      expect(ui).toContain("::-webkit-scrollbar {");
      // Not scoped to a platform: the app already does that, and it is why macOS
      // never sees a themed scrollbar.
      expect(ui).not.toMatch(/platform-win32[^}]*::-webkit-scrollbar/);
      // Hidden until the pointer is over the scrollable area.
      expect(ui).toMatch(/::-webkit-scrollbar-thumb \{[^}]*background: transparent;/);
      expect(ui).toContain(`*:hover::-webkit-scrollbar-thumb`);
      expect(ui).toContain(`background: rgb(${rgb} / 55%);`);
      expect(ui).toContain(`background: rgb(${rgb} / 90%);`);
    }
  });

  // GitHub alerts inherit tag-chip colours by default, so their meaning drifts
  // with an unrelated grouping decision. Pin them to the status family instead.
  test("colours GitHub alerts from the status family", () => {
    const expected: Record<string, string> = {
      note: "status.info",
      tip: "status.success",
      important: "status.notice",
      warning: "status.warning",
      caution: "status.error",
    };
    for (const pack of packages) {
      const preview = fileContent(pack, "styles/preview.css");
      const mood = themeBundle.themes.find((candidate) => candidate.id === pack.moodId);
      for (const [level, token] of Object.entries(expected)) {
        const value = mood?.semantic[token as keyof typeof mood.semantic];
        expect(preview).toContain(`--gfm-alert-${level}: ${value?.toLowerCase()};`);
      }
    }
  });

  // Regression: Inkdrop v6 only recognizes unified themes with `theme: true`.
  // The old string values (`ui`, `syntax`, `preview`) fall back to defaults.
  test("declares the metadata Inkdrop needs to load the theme", () => {
    for (const pack of packages) {
      const metadata = packageJson(pack);
      expect(metadata.theme).toBe(true);
      expect(metadata.theme).not.toBe("ui");
      expect(metadata.theme).not.toBe("syntax");
      expect(metadata.theme).not.toBe("preview");
      expect(metadata.styleSheets).toEqual(STYLE_SHEETS);
      expect(metadata.themeAppearance).toBe(appearanceOf(pack.moodId));
    }
  });

  // Regression: Inkdrop colors editor headings from the per-level slots and the
  // rendered preview from the --mde-preview-* namespace. Emitting only the base
  // --syntax-heading-color / --md-* left headings and preview on Inkdrop defaults.
  test("emits the full variable contract Inkdrop actually consumes", () => {
    for (const pack of packages) {
      const css = fileContent(pack, "styles/syntax.css");
      for (let level = 1; level <= 6; level += 1) {
        expect(css).toContain(`--syntax-heading-${level}-color:`);
      }
      // Correct gutter-border property name (not the *-color variant we shipped before).
      expect(css).toContain("--editor-gutter-border-right:");
      expect(css).not.toContain("--editor-gutter-border-right-color:");

      const preview = fileContent(pack, "styles/preview.css");
      expect(preview).toContain("--mde-preview-heading-color:");
      expect(preview).toContain("--mde-preview-link-color:");
    }
  });

  test("emits Mermaid variables for Inkdrop v6 diagram theming", () => {
    for (const pack of packages) {
      const css = fileContent(pack, "styles/preview.css");
      expect(css).toContain("--mermaid-node-background-color:");
      expect(css).toContain("--mermaid-node-border-color:");
      expect(css).toContain("--mermaid-line-color:");
      expect(css).toContain("--mermaid-cluster-background-color:");
      expect(css).toContain("--mermaid-primary-color:");
      expect(css).toContain("--mermaid-secondary-color:");
      expect(css).toContain("--mermaid-tertiary-color:");
    }
  });

  // Regression: tag/label chips are Hue-tinted via the chromatic families, each
  // with a color-mix background derived from the canvas.
  test("emits Hue-tinted tag chip colors in UI packages", () => {
    for (const pack of packages) {
      const css = fileContent(pack, "styles/ui.css");
      for (const family of ["red", "yellow", "green", "blue", "violet"]) {
        expect(css).toContain(`--${family}-background:`);
      }
      expect(css).toContain("color-mix(in srgb,");
    }
  });
});
