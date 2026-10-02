import { describe, expect, test } from "bun:test";
import type { SemanticToken } from "../packages/tokens/generated/themes";
import { themeBundle } from "../packages/tokens/generated/themes";
import {
  INKDROP_HUE_SCALES,
  INKDROP_NEUTRAL_SCALES,
  renderInkdropPackages,
} from "../packages/tokens/src/adapters/inkdrop";
import { contrastRatio, hexToRgb, hslChannels } from "../packages/tokens/src/color";
import { neutralRamp, RAMP_STEPS, tray, wash } from "../packages/tokens/src/derive";

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

  const moodOf = (moodId: string) => {
    const mood = themeBundle.themes.find((candidate) => candidate.id === moodId);
    if (!mood) throw new Error(`Unknown mood: ${moodId}`);
    return mood;
  };

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

  // The README is the registry listing, so it has to work for someone installing
  // from the registry — the old copy told them to install a path that only exists
  // in this checkout, and `ipm install ./path` 404s anyway.
  test("writes a README that works for a registry install", () => {
    for (const pack of packages) {
      const readme = fileContent(pack, "README.md");
      const mood = themeBundle.themes.find((candidate) => candidate.id === pack.moodId);

      expect(readme).toContain(`ipm install ${pack.packageName}`);
      expect(readme).not.toContain("ipm install ./");
      expect(readme).toContain(`# ${mood?.label}`);
      // Inkdrop's reader strips HTML tags, so an <img> renders as nothing at all.
      // Markdown image syntax with an absolute URL is the only form that survives;
      // a relative path breaks even when the file ships inside the package.
      expect(readme).not.toContain("<img");
      expect(readme).not.toContain("<div");
      expect(readme).toContain(
        `![${mood?.label} in Inkdrop](https://raw.githubusercontent.com/crafts69guy/hue-theme/main/design/inkdrop-${pack.moodId}.png)`,
      );
      // Cross-links point at the siblings, never at itself.
      expect(readme).not.toContain(`/plugins/${pack.packageName})`);
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

  // Regression: CodeMirror 6 draws the selection layer behind the lines, so an
  // opaque active line hid the selection on the cursor's own line.
  test("keeps the editor selection visible through the active line", () => {
    for (const pack of packages) {
      const syntax = fileContent(pack, "styles/syntax.css");
      const selected = moodOf(pack.moodId).semantic["surface.selected"];
      const rgb = hexToRgb(selected).join(" ");
      expect(syntax).toMatch(
        new RegExp(`--editor-active-line-background-color: rgb\\(${rgb} / \\d{1,2}%\\);`),
      );
      expect(syntax).toMatch(
        new RegExp(`--editor-active-line-gutter-background-color: rgb\\(${rgb} / \\d{1,2}%\\);`),
      );
    }
  });

  // Regression: the plugin "latest version" badge and the sidebar update banner
  // paint --warning-text-color on a --warning-color fill; both were the same hue.
  test("keeps text on the warning fill readable", () => {
    for (const pack of packages) {
      const ui = fileContent(pack, "styles/ui.css");
      const varOf = (key: string) => ui.match(new RegExp(`\\s${key}: (#[0-9a-f]{6});`))?.[1] ?? "";
      const fill = varOf("--warning-color");
      for (const text of ["--warning-text-color", "--sidebar-notification-view-color"]) {
        expect(contrastRatio(varOf(text), fill)).toBeGreaterThanOrEqual(4.5);
      }
      expect(varOf("--sidebar-notification-view-background")).toBe(fill);
    }
  });

  // Regression: segments and tabs fell back to Inkdrop's neutral greys, which
  // showed as grey cards and tabs on the plugin pages.
  test("themes segments and tabs instead of inheriting neutral greys", () => {
    for (const pack of packages) {
      const ui = fileContent(pack, "styles/ui.css");
      const mood = moodOf(pack.moodId);
      const raised = mood.semantic["surface.raised"].toLowerCase();
      expect(ui).toContain(`--segment-background: ${raised};`);
      expect(ui).toContain(`--tabular-menu-active-background: ${raised};`);
      // The footer tray sits between the card and the canvas, shared with the
      // derived tray every other host uses.
      expect(ui).toContain(`--secondary-segment-background: ${tray(mood).toLowerCase()};`);
    }
  });

  // Inkdrop's base fills these with neutral greys that ignore the theme. Each one
  // undeclared is a grey patch somewhere in the app, so Hue owns all of them.
  test("declares every control Inkdrop would otherwise paint neutral grey", () => {
    const owned = [
      "--button-background",
      "--button-hover-background-color",
      "--button-down-background-color",
      "--button-active-background-color",
      "--button-text-color",
      "--basic-button-hover-background",
      "--basic-button-down-background",
      "--secondary-color-down",
      "--input-highlight-background",
      "--input-placeholder-focus-color",
      "--form-select-background",
      "--form-prompt-background",
      "--checkbox-focus-background",
      "--checkbox-pressed-background",
      "--message-background",
      "--vertical-menu-background",
      "--inline-dropdown-menu-background",
      "--note-list-bar-section-header-background",
    ];
    for (const pack of packages) {
      const ui = fileContent(pack, "styles/ui.css");
      for (const key of owned) expect(ui).toContain(`  ${key}: `);
    }
  });

  // Regression: tag/label chips are Hue-tinted via the chromatic families, each
  // on a wash of the canvas toward its own hue.
  test("emits Hue-tinted tag chip colors in UI packages", () => {
    for (const pack of packages) {
      const css = fileContent(pack, "styles/ui.css");
      const mood = moodOf(pack.moodId);
      const chips: Record<string, SemanticToken> = {
        red: "status.error",
        yellow: "status.warning",
        green: "status.success",
        blue: "status.info",
        violet: "accent.secondary",
      };
      for (const [family, hue] of Object.entries(chips)) {
        const bg = wash(mood, hue, 0.22);
        expect(css).toContain(`--${family}-background: ${bg.toLowerCase()};`);
        // The chip's own hue reads as text on its tint.
        expect(contrastRatio(mood.semantic[hue], bg)).toBeGreaterThanOrEqual(3);
      }
    }
  });

  // A blend written as CSS cannot be measured by a test, and two alpha syntaxes
  // side by side invite drift. Known pairs are precomputed hexes; anything that
  // must composite over an unknown background is rgb(… / N%).
  test("writes one colour syntax: hex, or rgb() with alpha", () => {
    for (const pack of packages) {
      for (const sheet of STYLE_SHEETS) {
        const css = fileContent(pack, `styles/${sheet}`);
        expect(css).not.toContain("color-mix(");
        expect(css).not.toMatch(/#[0-9a-f]{8}\b/i);
        for (const [, alpha] of css.matchAll(/rgb\(\d+ \d+ \d+ \/ (\d+)%\)/g)) {
          expect(Number(alpha)).toBeLessThan(100);
        }
      }
    }
  });

  // Inkdrop's base draws whatever Hue does not override from 22 stock scales.
  // Rebuilding them from the mood is what keeps every unmapped hover, border and
  // acrylic wash in the mood, so the full set has to be there.
  test("rebuilds all of Inkdrop's stock colour scales from the mood", () => {
    for (const pack of packages) {
      const palette = fileContent(pack, "styles/palette.css");
      const mood = moodOf(pack.moodId);
      const scales = [...INKDROP_NEUTRAL_SCALES, ...Object.keys(INKDROP_HUE_SCALES)];
      expect(scales).toHaveLength(22);
      const neutral = neutralRamp(mood);
      for (const name of scales) {
        for (const step of RAMP_STEPS) {
          expect(palette).toMatch(
            new RegExp(`--hsl-${name}-${step}: [\\d.]+deg [\\d.]+% [\\d.]+%;`),
          );
        }
      }
      for (const name of INKDROP_NEUTRAL_SCALES) {
        expect(palette).toContain(`--hsl-${name}-950: ${hslChannels(neutral[950])};`);
      }
      // The scale's ends are the mood's own canvas and text, not stock grey.
      const [dark, light] =
        mood.appearance === "dark"
          ? [mood.semantic["surface.canvas"], mood.semantic["text.primary"]]
          : [mood.semantic["text.primary"], mood.semantic["surface.raised"]];
      expect(neutral[950]).toBe(dark);
      expect(neutral[50]).toBe(light);
      expect(palette).toContain(`--hsl-blue-500: ${hslChannels(mood.semantic["status.info"])};`);
    }
  });

  // Regression: at 15% the sidebar showed the macOS material, not the mood, and
  // came out darker than the editor; the unfocused selection was opaque canvas
  // and vanished into it; floating menus stayed 70% over the material.
  test("keeps the mood in the acrylic sidebar and the glass unbroken", () => {
    for (const pack of packages) {
      const ui = fileContent(pack, "styles/ui.css");
      const mood = moodOf(pack.moodId);
      const acrylic = ui.match(/:root:has\(body\.acrylic-window\) \{([^}]*)\}/)?.[1] ?? "";
      const alpha = acrylic.match(/--sidebar-background: rgb\(\d+ \d+ \d+ \/ (\d+)%\);/)?.[1];
      expect(Number(alpha)).toBeGreaterThanOrEqual(45);

      const raised = mood.semantic["surface.raised"].toLowerCase();
      for (const key of [
        "--vertical-menu-background",
        "--inline-dropdown-menu-background",
        "--editor-drawer-background",
      ]) {
        expect(acrylic).toContain(`${key}: ${raised};`);
      }

      for (const key of [
        "--sidebar-menu-item-active-background",
        "--sidebar-menu-item-inactive-background",
        "--sidebar-sync-status-view-background",
      ]) {
        expect(ui).toMatch(new RegExp(`${key}: rgb\\(\\d+ \\d+ \\d+ / \\d+%\\);`));
      }

      const win32 = ui.includes(":root:has(body.acrylic-window.platform-win32)");
      expect(win32).toBe(mood.appearance === "dark");
    }
  });

  // Inkdrop cascades its layers theme < theme.ui < theme.preview < theme.syntax,
  // and a later layer wins outright. preview.css once declared --page-background
  // in plain :root, which beat the acrylic block's `transparent` in ui.css and
  // kept an opaque canvas behind every panel for as long as acrylic existed.
  test("no later stylesheet overrides the acrylic block or disagrees on a shared variable", () => {
    const order = ["palette.css", "ui.css", "preview.css", "syntax.css"];
    const rootVars = (css: string) =>
      new Map(
        [
          ...(css.match(/\n {2}:root \{([^}]*)\}/)?.[1] ?? "").matchAll(/(--[\w-]+): ([^;]+);/g),
        ].map((m) => [m[1], m[2]] as [string, string]),
      );
    for (const pack of packages) {
      const sheets = order.map((sheet) => rootVars(fileContent(pack, `styles/${sheet}`)));
      const ui = fileContent(pack, "styles/ui.css");
      const acrylic = ui.match(/:root:has\(body\.acrylic-window\) \{([^}]*)\}/)?.[1] ?? "";
      const acrylicKeys = [...acrylic.matchAll(/(--[\w-]+):/g)].map((m) => m[1]);
      expect(acrylicKeys.length).toBeGreaterThan(3);
      for (const key of acrylicKeys) {
        for (const later of [2, 3]) {
          expect(`${order[later]} ${key}: ${sheets[later].has(key)}`).toBe(
            `${order[later]} ${key}: false`,
          );
        }
      }
      for (let a = 0; a < sheets.length; a += 1) {
        for (let b = a + 1; b < sheets.length; b += 1) {
          for (const [key, value] of sheets[a]) {
            if (!sheets[b].has(key)) continue;
            expect(`${order[b]} ${key}: ${sheets[b].get(key)}`).toBe(
              `${order[b]} ${key}: ${value}`,
            );
          }
        }
      }
      expect(fileContent(pack, "styles/preview.css")).not.toMatch(
        /\.mde-preview,\s+\.mde-preview \.markdown-body \{[^}]*background:/,
      );
    }
  });
});
