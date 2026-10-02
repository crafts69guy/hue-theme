// Hue -> Inkdrop adapter. Emits one installable Inkdrop v6 unified theme package
// for each mood. Each package covers the app UI, editor/syntax, preview, and
// Mermaid diagram variables through layered CSS stylesheets.

import type { SemanticToken } from "../../generated/themes";
import { hexToRgb, hslChannels, mixHex } from "../color";
import type { AdapterManifest } from "../contract";
import { hueRamp, neutralRamp, RAMP_STEPS, type Ramp, textOn, tray, wash } from "../derive";
import { type ResolvedMood, role } from "../mood";

export const inkdropManifest = {
  supports: ["surface", "text", "border", "accent", "status", "syntax"],
  omits: {},
} satisfies AdapterManifest;

export type InkdropPackage = {
  packageName: string;
  packagePath: string;
  moodId: string;
  files: Array<{ path: string; content: string }>;
};

function cssVars(vars: Record<string, string>, indent = "  "): string {
  return Object.entries(vars)
    .map(([key, value]) => `${indent}${key}: ${cssValue(value)};`)
    .join("\n");
}

function cssValue(value: string): string {
  return value.replace(/#[0-9A-F]{6}/gi, (hex) => hex.toLowerCase());
}

// One rule for every colour this adapter writes. When both colours are known —
// a line over a panel, a chip over the canvas — the blend is precomputed to a hex
// in TypeScript, where the tests can measure its contrast. `translucent()` is
// kept for colour that has to composite over a background the theme cannot
// know: the active line over a selection, button washes on any surface, the
// acrylic window. No `color-mix()` and no `#rrggbbaa` in the output. The one
// other form is the bare HSL channels of the `--hsl-*` scales in palette.css,
// because that is the shape Inkdrop's base stylesheet reads them in.
function translucent(hex: string, percent: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${r} ${g} ${b} / ${percent}%)`;
}

const SOFT_LINE = 40;
// Tag chips: how much of the chip's hue lands on the canvas behind its text.
const TAG_CHIP = 22;
// ==mark== fill, kept translucent so highlighted text stays readable.
const MARK_FILL = 22;
// Mermaid subgraph fill, so the diagram background reads faintly through.
const MERMAID_CLUSTER = 72;

// Two border tiers, Kanagawa-style. A structural divider between filled panels
// is a near-background hairline (the boundary colour 30% into the raised
// surface), so panels read as filled areas rather than boxed outlines; a general
// or floating border is a translucent boundary line.
function hairline(mood: ResolvedMood): string {
  return mixHex(role(mood, "surface.raised"), role(mood, "border.subtle"), 0.3);
}

function softLine(mood: ResolvedMood): string {
  return translucent(role(mood, "border.subtle"), SOFT_LINE);
}

// Scrollbars. Inkdrop styles `::-webkit-scrollbar` only under
// `body.platform-win32, body.platform-linux`, so on macOS its scrollbar
// variables are inert and the native grey overlay shows instead — measured on a
// dark Hue window as a flat rgb(96,96,96) thumb with no theme colour in it. The
// rules below are deliberately unscoped so every platform gets the same
// treatment, and the variables above are kept in step for anything else reading
// them.
//
// The trade is worth naming: taking over from the native overlay costs macOS's
// reveal-while-scrolling, which no CSS can detect, and the track now occupies
// layout width. What is bought is a thumb in the mood's own colour that stays
// invisible until the pointer is over the scrollable area.
const SCROLLBAR_TRACK = "9px";
const SCROLLBAR_THUMB_INSET = "3px";
const SCROLLBAR_IDLE = 55;
const SCROLLBAR_ACTIVE = 90;

// The active line has to be translucent. CodeMirror 6 paints the selection in
// `.cm-selectionLayer`, which sits *behind* the line elements, so an opaque
// `.cm-activeLine` covers the selection on the very line the cursor is on — a
// one-line selection vanishes entirely. Tinting with the selection's own colour
// means the selection reads unchanged through it (selected over selected is
// still selected), while on bare canvas it lands about as far from the canvas as
// `surface.raised` does.
const EDITOR_ACTIVE_LINE = 35;

// Button fills, as a share of `border.subtle`. Hover lifts, press settles
// between the two, mirroring the base's 70/70/80 neutral steps.
const BUTTON_IDLE = 18;
const BUTTON_HOVER = 30;
const BUTTON_DOWN = 24;
// Vertical and inline dropdown menus keep the base's 70% so whatever they sit
// over still reads faintly through — on an opaque window. Under acrylic they go
// solid (see acrylicVars).
const FLOATING_MENU = 70;

// How much of its own colour each surface keeps once the acrylic window is on.
// Graded, not one figure: chrome is clearest so the window reads as glass, and
// the surface carrying body text is nearly solid so the text keeps its ground.
//
// The grade is Solarized Dark's, not the base stylesheet's. The base runs the
// sidebar at 10% because its colours *are* the neutral grey it expects behind
// the window, so revealing that costs it nothing. A coloured mood keeps only as
// much of itself as its alpha: at 15% Mưa's sidebar was 85% whatever lay behind
// it. At 50% it keeps half its colour whatever the backdrop turns out to be.
const ACRYLIC_SIDEBAR = 50;
const ACRYLIC_NOTE_LIST = 70;
const ACRYLIC_EDITOR = 90;
// The window's own ground on Windows, where the acrylic material is light and
// clear enough that dark panels over it lose their edges. Dark moods only, as
// in the base stylesheet.
const ACRYLIC_WIN32_PAGE = 40;

// Selection fills in the sidebar are washes of `surface.selected`, never opaque
// surfaces: under acrylic an opaque fill is a solid block in a glass pane, and
// the unfocused selection used to be `surface.canvas`, which landed within a
// shade of the translucent sidebar and disappeared.
const SIDEBAR_ACTIVE = 90;
const SIDEBAR_INACTIVE = 45;
const SIDEBAR_SYNC_STATUS = 50;

// When the user turns on the acrylic/vibrancy window, Inkdrop paints a macOS
// vibrancy layer behind the window and marks the document `body.acrylic-window`.
// The base stylesheet already re-declares its surfaces translucent for that
// case, but a theme's own `@layer theme.ui` outranks the base layer, so an
// opaque surface here silently paints over the effect. Hue therefore has to
// re-declare them itself; without this block the setting is on and nothing
// happens.
//
// What shows through is a flat tint, not a blurred desktop, so none of this
// reproduces a terminal's `background-opacity` over a wallpaper. Lower numbers
// reveal more of the macOS material, which is what reads as glass here.
//
// The page behind the three panels stays fully transparent rather than taking a
// figure of its own: they tile the window, and two stacked alpha layers multiply
// into something close to opaque. One alpha layer per region is the mechanism.
// Floating panels (drawers, dropdowns, menus) go opaque — they overlap
// arbitrary content, and a 70% menu over the material reads washed out. The base
// stylesheet does the same, but Hue's own 70% in `:root` outranks the base
// layer, so the acrylic block has to say it again.
function acrylicVars(mood: ResolvedMood): Record<string, string> {
  const raised = role(mood, "surface.raised");
  return {
    "--page-background": "transparent",
    "--sidebar-background": translucent(raised, ACRYLIC_SIDEBAR),
    "--note-list-bar-background": translucent(raised, ACRYLIC_NOTE_LIST),
    "--editor-background": translucent(role(mood, "surface.canvas"), ACRYLIC_EDITOR),
    "--vertical-menu-background": raised,
    "--inline-dropdown-menu-background": raised,
    "--editor-drawer-background": raised,
  };
}

function renderAcrylicWin32(mood: ResolvedMood): string {
  if (mood.appearance !== "dark") return "";
  const page = translucent(role(mood, "surface.canvas"), ACRYLIC_WIN32_PAGE);
  return `
  :root:has(body.acrylic-window.platform-win32) {
    --page-background: ${page};
  }
`;
}

function packageName(mood: ResolvedMood): string {
  return `hue-${mood.id}-theme`;
}

function themeLabel(mood: ResolvedMood): string {
  return `Hue ${mood.id.charAt(0).toUpperCase()}${mood.id.slice(1)} Theme`;
}

function themeDescription(mood: ResolvedMood): string {
  return `${mood.label} unified theme for Inkdrop v6`;
}

function renderPackageJson(mood: ResolvedMood): string {
  return `${JSON.stringify(
    {
      name: packageName(mood),
      version: "0.8.1",
      theme: true,
      themeAppearance: mood.appearance,
      description: themeDescription(mood),
      // styleSheets are resolved relative to the package's styles/ directory.
      // palette.css loads first so the area-specific layers can reuse Hue vars.
      styleSheets: ["palette.css", "ui.css", "syntax.css", "preview.css"],
      scripts: {
        prepublishOnly:
          "generate-palette && node -e \"const fs=require('fs');const p='palette.json';fs.writeFileSync(p,JSON.stringify(JSON.parse(fs.readFileSync(p,'utf8')),null,2)+'\\\\n');\"",
      },
      keywords: ["inkdrop", "markdown", "mermaid", "hue-theme"],
      repository: {
        type: "git",
        url: "https://github.com/crafts69guy/hue-theme",
        directory: `packages/${packageName(mood)}`,
      },
      bugs: {
        url: "https://github.com/crafts69guy/hue-theme/issues",
      },
      homepage: "https://github.com/crafts69guy/hue-theme#readme",
      author: "crafts69guy",
      license: "MIT",
      engines: { inkdrop: "^6.0.0" },
      devDependencies: {
        "@inkdropapp/theme-dev-helpers": "^0.6.1",
      },
    },
    null,
    2,
  )}\n`;
}

const RAW_BASE = "https://raw.githubusercontent.com/crafts69guy/hue-theme/main";

/** The mood's own sentence, minus the "Mưa — " label the token file prefixes. */
function moodTagline(mood: ResolvedMood): string {
  const body = mood.description.replace(/^[^—]*—\s*/, "");
  return body.charAt(0).toUpperCase() + body.slice(1);
}

// The README is what the registry listing and Inkdrop's own Preferences pane
// show, so it is a shopfront, not a build note.
//
// Markdown only, no raw HTML. Inkdrop's reader strips tags and re-parses what was
// inside them, so an `<img>` leaves nothing at all and a `<div align="center">`
// silently loses its alignment — both were tried and neither survived. Image URLs
// must also be absolute: a relative path renders as a broken image even when the
// file ships inside the package, which is why the screenshots stay out of it and
// installs stay small.
function renderReadme(mood: ResolvedMood, siblings: readonly ResolvedMood[]): string {
  const swatch = (label: string, token: SemanticToken) =>
    `| ${label} | \`${role(mood, token).toLowerCase()}\` |`;

  const family = siblings
    .map((other) =>
      other.id === mood.id
        ? `- **${other.label}** — ${other.appearance}, this one`
        : `- [${other.label}](https://my.inkdrop.app/plugins/${packageName(other)}) — ${other.appearance}`,
    )
    .join("\n");

  return `# ${mood.label}

${moodTagline(mood)}

![${mood.label} in Inkdrop](${RAW_BASE}/design/inkdrop-${mood.id}.png)

## Install

\`\`\`
ipm install ${packageName(mood)}
\`\`\`

Or open **Preferences → Plugins**, search for \`${packageName(mood)}\`, and install
it there. Pick the theme under **Preferences → Themes**.

## What it covers

One package for the whole app: sidebar and note list chrome, the editor and its
syntax, the rendered Markdown preview, GitHub alerts, Mermaid diagrams, and the
scrollbars. Every colour resolves from a single token contract, so the four
surfaces cannot drift apart.

Translucency is supported: turn on **Enable acrylic translucent background** in
Preferences and the chrome thins out over the desktop while text keeps its
ground.

## Palette

| Role | Colour |
| --- | --- |
${swatch("Canvas", "surface.canvas")}
${swatch("Raised", "surface.raised")}
${swatch("Text", "text.primary")}
${swatch("Accent", "accent.primary")}
${swatch("Secondary", "accent.secondary")}

## The family

Three moods, one token contract:

${family}

## Notes

Generated from the Hue Theme token contract — the CSS in this package is build
output, so file an issue or send a patch against
[crafts69guy/hue-theme](https://github.com/crafts69guy/hue-theme) rather than
editing it in place.

MIT licensed.
`;
}

function renderLicense(): string {
  return `MIT License

Generated package for Hue Theme. See the repository root LICENSE for the full
license text.
`;
}

function renderHeader(mood: ResolvedMood, area: "palette" | "ui" | "syntax" | "preview"): string {
  return `/* Generated by scripts/build.ts. Do not edit.
 * ${themeLabel(mood)} ${area} stylesheet.
 */
`;
}

function hueVarName(key: string): string {
  return `--hue-${key.replaceAll(".", "-")}`;
}

// Inkdrop's base stylesheet draws everything Hue does not override from 22
// stock colour scales (`--hsl-neutral-900`, `--hsl-blue-300`, …), read as bare
// HSL channels inside `hsl(var(--hsl-x) / N%)`. Redefining the scales is what
// Solarized Dark does, and it is the difference between patching grey leaks one
// variable at a time and having none: every translucent hover, border, button and
// acrylic wash the base computes now comes out in the mood.
//
// The five grey families all take the mood's neutral scale — the base uses
// neutral on its dark side and gray/slate on its light side, so overriding only
// neutral (as Solarized can, being dark-only) would leave Cung on stock greys.
// The chromatic families group onto Hue's five chromatic roles the same way the
// tag chips do.
export const INKDROP_NEUTRAL_SCALES = ["neutral", "gray", "slate", "zinc", "stone"] as const;
export const INKDROP_HUE_SCALES: Record<string, SemanticToken> = {
  red: "status.error",
  rose: "status.error",
  pink: "status.error",
  orange: "status.warning",
  amber: "status.warning",
  yellow: "status.warning",
  lime: "status.success",
  green: "status.success",
  emerald: "status.success",
  teal: "status.info",
  cyan: "status.info",
  sky: "status.info",
  blue: "status.info",
  indigo: "accent.secondary",
  violet: "accent.secondary",
  purple: "accent.secondary",
  fuchsia: "accent.secondary",
};

function scaleVars(name: string, ramp: Ramp): Record<string, string> {
  return Object.fromEntries(
    RAMP_STEPS.map((step) => [`--hsl-${name}-${step}`, hslChannels(ramp[step])]),
  );
}

function renderPaletteCss(mood: ResolvedMood): string {
  const vars = Object.fromEntries(
    Object.entries(mood.semantic).map(([key, value]) => [hueVarName(key), value]),
  );
  const neutral = neutralRamp(mood);
  const scales = Object.assign(
    {},
    ...INKDROP_NEUTRAL_SCALES.map((name) => scaleVars(name, neutral)),
    ...Object.entries(INKDROP_HUE_SCALES).map(([name, token]) =>
      scaleVars(name, hueRamp(mood, token)),
    ),
  ) as Record<string, string>;

  return `${renderHeader(mood, "palette")}@layer theme {
  :root {
    color-scheme: ${mood.appearance};
${cssVars(vars, "    ")}

    /* Inkdrop's stock colour scales, rebuilt from the mood. */
${cssVars(scales, "    ")}
  }
}
`;
}

function renderScrollbarCss(mood: ResolvedMood): string {
  const idle = translucent(role(mood, "border.subtle"), SCROLLBAR_IDLE);
  const active = translucent(role(mood, "border.subtle"), SCROLLBAR_ACTIVE);
  // The thumb is drawn inside a transparent border so it reads thin while the
  // grab target stays the full track width.
  return `  ::-webkit-scrollbar {
    width: ${SCROLLBAR_TRACK};
    height: ${SCROLLBAR_TRACK};
  }

  ::-webkit-scrollbar-track,
  ::-webkit-scrollbar-corner {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background: transparent;
    border: ${SCROLLBAR_THUMB_INSET} solid transparent;
    border-radius: ${SCROLLBAR_TRACK};
    background-clip: padding-box;
  }

  *:hover::-webkit-scrollbar-thumb {
    background: ${cssValue(idle)};
    background-clip: padding-box;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${cssValue(active)};
    background-clip: padding-box;
  }
`;
}

function renderUiCss(mood: ResolvedMood): string {
  // Text on accent fills (selected items, filled buttons), picked by contrast.
  const onAccent = textOn(mood, role(mood, "accent.primary"));
  const vars: Record<string, string> = {
    "--primary-color": role(mood, "accent.primary"),
    "--secondary-color": role(mood, "accent.secondary"),
    "--light-primary-color": role(mood, "accent.primary"),
    "--light-secondary-color": role(mood, "text.secondary"),
    "--page-background": role(mood, "surface.canvas"),
    "--text-color": role(mood, "text.primary"),
    "--link-color": role(mood, "text.accent"),
    "--link-hover-color": role(mood, "accent.primary"),
    "--highlight-background": role(mood, "surface.selected"),
    "--highlight-color": role(mood, "text.primary"),
    "--input-background": role(mood, "surface.raised"),
    "--input-color": role(mood, "text.primary"),
    "--input-placeholder-color": role(mood, "text.secondary"),
    "--focused-form-border-color": role(mood, "accent.primary"),
    "--focused-form-muted-border-color": role(mood, "accent.secondary"),
    "--focused-outline-color": role(mood, "surface.selected"),
    "--loader-line-color": role(mood, "accent.primary"),
    "--positive-color": role(mood, "status.success"),
    "--positive-background-color": role(mood, "surface.raised"),
    "--positive-border-color": role(mood, "status.success"),
    "--positive-header-color": role(mood, "status.success"),
    "--positive-text-color": role(mood, "status.success"),
    "--negative-color": role(mood, "status.error"),
    "--negative-background-color": role(mood, "surface.raised"),
    "--negative-border-color": role(mood, "status.error"),
    "--negative-header-color": role(mood, "status.error"),
    "--negative-text-color": role(mood, "status.error"),
    "--info-color": role(mood, "status.info"),
    "--info-background-color": role(mood, "surface.raised"),
    "--info-border-color": role(mood, "status.info"),
    "--info-header-color": role(mood, "status.info"),
    "--info-text-color": role(mood, "status.info"),
    "--warning-color": role(mood, "status.warning"),
    "--warning-background-color": role(mood, "surface.raised"),
    "--warning-border-color": role(mood, "status.warning"),
    "--warning-header-color": role(mood, "status.warning"),
    // Unlike the other families, Inkdrop v6 only reads this one as text *on* a
    // `--warning-color` fill — the plugin "latest version" badge and the sidebar
    // update banners — so it is picked against that fill.
    "--warning-text-color": textOn(mood, role(mood, "status.warning")),
    "--success-color": role(mood, "status.success"),
    "--success-background-color": role(mood, "surface.raised"),
    "--success-border-color": role(mood, "status.success"),
    "--success-header-color": role(mood, "status.success"),
    "--success-text-color": role(mood, "status.success"),
    "--error-color": role(mood, "status.error"),
    "--error-background-color": role(mood, "surface.raised"),
    "--error-border-color": role(mood, "status.error"),
    "--error-header-color": role(mood, "status.error"),
    "--error-text-color": role(mood, "status.error"),
    "--dark-text-color": role(mood, "text.primary"),
    "--muted-text-color": role(mood, "text.secondary"),
    "--light-text-color": role(mood, "text.secondary"),
    "--unselected-text-color": role(mood, "text.secondary"),
    "--hovered-text-color": role(mood, "text.primary"),
    "--pressed-text-color": role(mood, "text.primary"),
    "--selected-text-color": role(mood, "text.primary"),
    "--selected-border-color": role(mood, "accent.primary"),
    "--solid-border-color": role(mood, "border.subtle"),
    "--solid-selected-border-color": role(mood, "accent.primary"),
    "--primary-color-hover": role(mood, "accent.primary"),
    "--primary-color-focus": role(mood, "accent.primary"),
    "--secondary-color-hover": role(mood, "accent.secondary"),
    "--menu-background": role(mood, "surface.raised"),
    "--menu-item-text-color": role(mood, "text.primary"),
    "--menu-hover-item-background": role(mood, "surface.selected"),
    "--menu-hover-item-color": role(mood, "text.primary"),
    "--menu-active-item-background": role(mood, "surface.selected"),
    "--menu-active-item-color": role(mood, "text.primary"),
    "--popup-background": role(mood, "surface.raised"),
    "--popup-color": role(mood, "text.primary"),
    "--tooltip-background": role(mood, "surface.raised"),
    "--tooltip-color": role(mood, "text.secondary"),
    "--table-background": role(mood, "surface.canvas"),
    "--table-header-background": role(mood, "surface.raised"),
    "--table-header-color": role(mood, "text.primary"),
    "--checkbox-color": role(mood, "text.primary"),
    "--checkbox-background": role(mood, "surface.raised"),
    "--checkbox-border": `1px solid ${role(mood, "border.subtle")}`,
    "--checkbox-active-background": role(mood, "accent.primary"),
    "--checkbox-active-border-color": role(mood, "accent.primary"),
    "--dropdown-menu-background": role(mood, "surface.raised"),
    "--dropdown-menu-item-color": role(mood, "text.primary"),
    "--dropdown-hovered-item-background": role(mood, "surface.selected"),
    "--dropdown-hovered-item-color": role(mood, "text.primary"),
    "--modal-box-header-background": role(mood, "surface.raised"),
    "--modal-box-content-background": role(mood, "surface.canvas"),
    "--modal-box-actions-background": role(mood, "surface.raised"),
    "--sidebar-background": role(mood, "surface.raised"),
    "--sidebar-menu-item-inactive-background": translucent(
      role(mood, "surface.selected"),
      SIDEBAR_INACTIVE,
    ),
    "--sidebar-menu-item-active-background": translucent(
      role(mood, "surface.selected"),
      SIDEBAR_ACTIVE,
    ),
    "--sidebar-menu-section-color": role(mood, "text.secondary"),
    "--sidebar-menu-item-color": role(mood, "text.secondary"),
    "--sidebar-menu-active-item-color": role(mood, "text.primary"),
    "--sidebar-sync-status-view-background": translucent(
      role(mood, "surface.canvas"),
      SIDEBAR_SYNC_STATUS,
    ),
    "--sidebar-sync-status-view-text-color": role(mood, "text.secondary"),
    // The base sets this per appearance and, for light themes, falls back to
    // `--warning-text-color`; pinning it keeps every mood on the same rule.
    "--sidebar-notification-view-background": role(mood, "status.warning"),
    "--sidebar-notification-view-color": textOn(mood, role(mood, "status.warning")),
    "--scrollbar-track-background": "transparent",
    "--scrollbar-thumb-background": translucent(role(mood, "border.subtle"), SCROLLBAR_IDLE),
    "--scrollbar-width": SCROLLBAR_TRACK,
    "--sidebar-scrollbar-track-background": "transparent",
    "--sidebar-scrollbar-thumb-background": translucent(
      role(mood, "border.subtle"),
      SCROLLBAR_IDLE,
    ),
    "--sidebar-scrollbar-width": SCROLLBAR_TRACK,
    "--note-list-bar-background": role(mood, "surface.raised"),
    "--note-list-view-item-header-color": role(mood, "text.primary"),
    "--note-list-view-item-color": role(mood, "text.secondary"),
    "--note-list-view-item-date-color": role(mood, "accent.primary"),
    "--note-list-view-item-selected-background": role(mood, "surface.selected"),
    "--note-list-view-item-active-background": role(mood, "surface.selected"),
    "--note-search-bar-input-background": role(mood, "surface.canvas"),
    "--editor-background": role(mood, "surface.canvas"),
    "--editor-header-title-input-background": "transparent",
    "--editor-floating-actions-background": role(mood, "surface.raised"),
    "--editor-drawer-background": role(mood, "surface.raised"),
    "--header-note-menu-color": role(mood, "text.secondary"),
    "--notification-item-background": role(mood, "surface.raised"),
    "--preferences-sidebar-background": role(mood, "surface.raised"),
    "--preferences-sidebar-item-active-background": role(mood, "surface.selected"),
    "--preferences-view-background": role(mood, "surface.canvas"),
    // Text shown ON accent/colored backgrounds (selected items, filled buttons).
    // Inkdrop has no default here; without it light text on a jade fill is unreadable.
    "--inverted-text-color": onAccent,
    "--inverted-muted-text-color": onAccent,
    "--inverted-light-text-color": onAccent,
    "--inverted-hovered-text-color": onAccent,
    "--inverted-pressed-text-color": onAccent,
    "--inverted-selected-text-color": onAccent,
    "--inverted-unselected-text-color": role(mood, "surface.raised"),
    "--inverted-disabled-text-color": role(mood, "surface.raised"),
    // Note status dots in the note list.
    "--note-status-active": role(mood, "text.primary"),
    "--note-status-onhold": role(mood, "status.warning"),
    "--note-status-completed": role(mood, "status.success"),
    "--note-status-dropped": role(mood, "status.error"),
    // Task progress bar in the note header.
    "--task-progress-view-border-color": role(mood, "border.subtle"),
    "--task-progress-view-background-color": role(mood, "surface.raised"),
    "--task-progress-view-foreground-color": role(mood, "accent.primary"),
    "--task-progress-view-completed-color": role(mood, "status.success"),
    // ==mark== highlight (kept translucent so highlighted text stays readable).
    "--mark-background-color": translucent(role(mood, "status.warning"), MARK_FILL),
    "--mark-border-color": translucent(role(mood, "status.warning"), SOFT_LINE),
    "--mark-color": role(mood, "text.primary"),
    "--kbd-background": role(mood, "surface.raised"),
  };

  // Tag/label chips. Inkdrop exposes 11 chromatic families; Hue has 5 chromatic
  // roles, so we group the families onto the nearest Hue hue (red↔pink, the warm
  // yellows/browns, the greens, the cyans, the violets). Each chip shows bright
  // hue text on a dark hue-tinted background, a wash of the canvas toward the hue,
  // so the palette stays token-driven (no hardcoded chip colors).
  const tagHues: Record<string, SemanticToken> = {
    red: "status.error",
    pink: "status.error",
    orange: "status.warning",
    yellow: "status.warning",
    brown: "status.warning",
    olive: "status.success",
    green: "status.success",
    teal: "status.info",
    blue: "status.info",
    violet: "accent.secondary",
    purple: "accent.secondary",
  };
  for (const [name, hueRole] of Object.entries(tagHues)) {
    const hue = role(mood, hueRole);
    vars[`--${name}`] = hue;
    vars[`--${name}-text-color`] = hue;
    vars[`--${name}-header-color`] = hue;
    vars[`--${name}-hover`] = hue;
    vars[`--${name}-focus`] = hue;
    vars[`--${name}-down`] = hue;
    vars[`--${name}-active`] = hue;
    vars[`--${name}-background`] = wash(mood, hueRole, TAG_CHIP / 100);
  }

  // Border treatment, Kanagawa-style two tiers: structural dividers (sidebar,
  // note list, drawers) use a near-bg hairline = surface.raised so panels read as
  // filled areas, not boxed outlines; general/floating borders use a translucent
  // rain mid-line instead of the full-strength one.
  const hair = hairline(mood);
  const soft = softLine(mood);
  Object.assign(vars, {
    "--border-color": soft,
    "--internal-border-color": soft,
    "--solid-internal-border-color": soft,
    "--strong-border-color": soft,
    "--popup-border-color": soft,
    "--tooltip-border-color": soft,
    "--dropdown-menu-border-color": soft,
    "--sidebar-border-right": `1px solid ${hair}`,
    "--sidebar-menu-section-separator-color": hair,
    "--note-list-bar-border-right": `1px solid ${hair}`,
    "--note-list-view-item-separator-border": `1px solid ${hair}`,
    "--editor-drawer-border-left": `1px solid ${hair}`,
  });

  // Segments and tabs. The base fills them with neutral greys (neutral-900 cards,
  // a neutral-700 footer, a neutral-800 active tab) that ignore the theme, so the
  // plugin list showed grey slabs on a navy page. Cards sit one step up as
  // `surface.raised`; the footer tray falls halfway back toward the canvas, and
  // the active tab takes the card's surface so it reads as attached to the list.
  const raised = role(mood, "surface.raised");
  Object.assign(vars, {
    "--segment-background": raised,
    "--secondary-segment-background": tray(mood),
    "--secondary-segment-color": role(mood, "text.secondary"),
    "--grouped-segment-divider": `1px solid ${hair}`,
    "--grouped-segment-group-segment-box-shadow": `0 0 0 1px ${hair}`,
    "--grouped-segment-hover-background": mixHex(raised, role(mood, "surface.selected"), 0.5),
    "--piled-segments-background": raised,
    "--tabular-menu-border-color": soft,
    "--tabular-menu-active-background": raised,
    "--tabular-menu-active-color": role(mood, "text.primary"),
  });

  // The rest of the base's neutral greys: buttons, form controls, messages and
  // the note-list section header. Button fills are a translucent wash of the
  // boundary colour rather than a surface, because buttons sit on canvas, cards
  // and drawers alike and an opaque fill would vanish on whichever matches it.
  const line = role(mood, "border.subtle");
  const secondary = role(mood, "accent.secondary");
  const recess = tray(mood);
  Object.assign(vars, {
    "--button-background": translucent(line, BUTTON_IDLE),
    "--button-hover-background-color": translucent(line, BUTTON_HOVER),
    "--button-down-background-color": translucent(line, BUTTON_DOWN),
    "--button-active-background-color": translucent(line, BUTTON_HOVER),
    "--button-text-color": role(mood, "text.primary"),
    "--button-box-shadow": `0 0 0 1px ${soft} inset`,
    "--basic-button-hover-background": translucent(line, BUTTON_IDLE),
    "--basic-button-down-background": translucent(line, BUTTON_DOWN),
    "--secondary-color-focus": secondary,
    "--secondary-color-down": secondary,
    "--secondary-color-active": secondary,
    "--strong-selected-border-color": line,
    "--disabled-border-color": soft,
    "--input-highlight-background": role(mood, "surface.selected"),
    "--input-placeholder-focus-color": role(mood, "text.secondary"),
    "--form-select-background": raised,
    "--form-prompt-background": raised,
    "--checkbox-focus-background": role(mood, "surface.selected"),
    "--checkbox-pressed-background": raised,
    "--message-background": raised,
    "--vertical-menu-background": translucent(raised, FLOATING_MENU),
    "--inline-dropdown-menu-background": translucent(raised, FLOATING_MENU),
    "--note-list-bar-pinned-section-header-background": recess,
    "--note-list-bar-section-header-background": recess,
  });

  return `${renderHeader(mood, "ui")}@layer theme.ui {
  :root {
    color-scheme: ${mood.appearance};
${cssVars(vars, "    ")}
  }

  /* Accent bar on the active note-list row, so the (subtle) selection still reads
   * at a glance. Inset shadow keeps layout stable (no reflow). */
  .note-list-item-view.active {
    box-shadow: inset 2px 0 0 ${cssValue(role(mood, "accent.primary"))};
  }

  :root:has(body.acrylic-window) {
${cssVars(acrylicVars(mood), "    ")}
  }
${renderAcrylicWin32(mood)}
${renderScrollbarCss(mood)}}
`;
}

function renderSyntaxCss(mood: ResolvedMood): string {
  // Search matches are solid status fills, as in Neovim's Search/IncSearch.
  // Inkdrop has no variable for the text inside a match, so the tokens keep
  // their syntax colour — and headings are `status.warning`, the very fill of
  // the current match, which made a matched heading word vanish. The rules at
  // the end of the sheet put `textOn` the fill over every token in a match.
  const searchMatch = role(mood, "status.notice");
  const searchMatchSelected = role(mood, "status.warning");
  const vars: Record<string, string> = {
    "--editor-foreground-color": role(mood, "text.primary"),
    "--editor-background-color": role(mood, "surface.canvas"),
    "--editor-caret-color": role(mood, "accent.primary"),
    "--editor-selection-background": role(mood, "surface.selected"),
    "--editor-focused-selection-background": role(mood, "surface.selected"),
    "--editor-active-line-background-color": translucent(
      role(mood, "surface.selected"),
      EDITOR_ACTIVE_LINE,
    ),
    "--editor-special-char-color": role(mood, "border.subtle"),
    "--editor-spelling-error-color": role(mood, "status.error"),
    "--editor-gutter-border-right": `1px solid ${role(mood, "border.subtle")}`,
    "--editor-gutter-color": role(mood, "text.secondary"),
    "--editor-gutter-background-color": "transparent",
    "--editor-gutter-background-solid-color": role(mood, "surface.canvas"),
    "--editor-active-line-gutter-background-color": translucent(
      role(mood, "surface.selected"),
      EDITOR_ACTIVE_LINE,
    ),
    "--editor-panel-background-color": role(mood, "surface.raised"),
    "--editor-panel-color": role(mood, "text.secondary"),
    "--editor-tooltip-border-color": role(mood, "border.subtle"),
    "--editor-tooltip-background-color": role(mood, "surface.raised"),
    "--editor-tooltip-autocomplete-item-selected-background-color": role(mood, "surface.selected"),
    "--editor-tooltip-autocomplete-item-selected-color": role(mood, "text.primary"),
    "--editor-inline-tooltip-color": role(mood, "text.secondary"),
    "--editor-inline-tooltip-background-color": role(mood, "surface.raised"),
    "--editor-completion-label": role(mood, "text.secondary"),
    "--editor-completion-matched-text-color": role(mood, "accent.primary"),
    "--editor-completion-detail-color": role(mood, "accent.secondary"),
    "--editor-matching-bracket-outline": `1px solid ${role(mood, "accent.secondary")}`,
    "--editor-nonmatching-bracket-outline": `1px solid ${role(mood, "status.error")}`,
    "--editor-selection-match-background-color": role(mood, "surface.raised"),
    "--editor-search-match-background-color": searchMatch,
    "--editor-search-match-selected-background-color": searchMatchSelected,
    "--editor-search-match-selected-outline": `1px solid ${searchMatchSelected}`,
    "--hue-editor-search-match-color": textOn(mood, searchMatch),
    "--hue-editor-search-match-selected-color": textOn(mood, searchMatchSelected),
    "--editor-placeholder-color": role(mood, "text.secondary"),
    "--editor-nes-ghost-color": role(mood, "text.secondary"),
    "--editor-highlight-space-color": role(mood, "surface.raised"),
    "--editor-trailing-space-background-color": role(mood, "status.error"),
    "--syntax-comment-color": role(mood, "syntax.comment"),
    "--syntax-name-color": role(mood, "text.primary"),
    "--syntax-name-constant-color": role(mood, "syntax.constant"),
    "--syntax-name-standard-color": role(mood, "syntax.function"),
    "--syntax-name-definition-color": role(mood, "syntax.function"),
    "--syntax-name-function-color": role(mood, "syntax.function"),
    "--syntax-variable-name-color": role(mood, "syntax.variable"),
    "--syntax-variable-name-constant-color": role(mood, "syntax.constant"),
    "--syntax-variable-name-standard-color": role(mood, "syntax.variable"),
    "--syntax-variable-name-definition-color": role(mood, "syntax.variable"),
    "--syntax-variable-name-function-color": role(mood, "syntax.function"),
    "--syntax-property-name-color": role(mood, "syntax.property"),
    "--syntax-property-name-constant-color": role(mood, "syntax.constant"),
    "--syntax-property-name-standard-color": role(mood, "syntax.property"),
    "--syntax-property-name-definition-color": role(mood, "syntax.property"),
    "--syntax-property-name-function-color": role(mood, "syntax.function"),
    "--syntax-tag-name-color": role(mood, "syntax.keyword"),
    "--syntax-attribute-name-color": role(mood, "syntax.property"),
    "--syntax-class-name-color": role(mood, "syntax.type"),
    "--syntax-label-name-color": role(mood, "syntax.keyword"),
    "--syntax-namespace-color": role(mood, "syntax.type"),
    "--syntax-macro-name-color": role(mood, "syntax.function"),
    "--syntax-string-color": role(mood, "syntax.string"),
    "--syntax-number-color": role(mood, "syntax.number"),
    "--syntax-literal-color": role(mood, "syntax.constant"),
    "--syntax-character-color": role(mood, "syntax.string"),
    "--syntax-integer-color": role(mood, "syntax.number"),
    "--syntax-float-color": role(mood, "syntax.number"),
    "--syntax-bool-color": role(mood, "syntax.constant"),
    "--syntax-regexp-color": role(mood, "syntax.string"),
    "--syntax-color-color": role(mood, "syntax.constant"),
    "--syntax-url-color": role(mood, "text.accent"),
    "--syntax-attribute-value-color": role(mood, "syntax.string"),
    "--syntax-self-color": role(mood, "syntax.variable"),
    "--syntax-null-color": role(mood, "syntax.constant"),
    "--syntax-atom-color": role(mood, "syntax.constant"),
    "--syntax-unit-color": role(mood, "syntax.constant"),
    "--syntax-modifier-color": role(mood, "syntax.keyword"),
    "--syntax-operator-keyword-color": role(mood, "syntax.operator"),
    "--syntax-control-keyword-color": role(mood, "syntax.keyword"),
    "--syntax-definition-keyword-color": role(mood, "syntax.keyword"),
    "--syntax-module-keyword-color": role(mood, "syntax.keyword"),
    "--syntax-keyword-color": role(mood, "syntax.keyword"),
    "--syntax-operator-color": role(mood, "syntax.operator"),
    "--syntax-type-operator-color": role(mood, "syntax.type"),
    "--syntax-separator-color": role(mood, "syntax.punctuation"),
    "--syntax-angle-bracket-color": role(mood, "syntax.punctuation"),
    "--syntax-square-bracket-color": role(mood, "syntax.punctuation"),
    "--syntax-paren-color": role(mood, "syntax.punctuation"),
    "--syntax-brace-color": role(mood, "syntax.punctuation"),
    "--syntax-bracket-color": role(mood, "syntax.punctuation"),
    "--syntax-punctuation-color": role(mood, "syntax.punctuation"),
    // Headings use the warm status hue (incense gold), distinct from strings/links
    // which carry the jade accent — so document structure reads in its own hue
    // instead of a single green wash.
    "--syntax-heading-color": role(mood, "status.warning"),
    "--syntax-content-separator-color": role(mood, "text.primary"),
    "--syntax-list-color": role(mood, "syntax.operator"),
    "--syntax-quote-color": role(mood, "text.secondary"),
    "--syntax-emphasis-color": role(mood, "text.primary"),
    "--syntax-strong-color": role(mood, "text.primary"),
    "--syntax-link-color": role(mood, "text.accent"),
    "--syntax-monospace-color": role(mood, "syntax.string"),
    "--syntax-content-color": role(mood, "text.primary"),
    "--syntax-inserted-color": role(mood, "status.success"),
    "--syntax-deleted-color": role(mood, "status.error"),
    "--syntax-changed-color": role(mood, "status.warning"),
    "--syntax-document-meta-color": role(mood, "text.secondary"),
    "--syntax-annotation-color": role(mood, "syntax.operator"),
    "--syntax-processing-instruction-color": role(mood, "syntax.keyword"),
    "--syntax-meta-color": role(mood, "syntax.comment"),
    "--syntax-invalid-color": role(mood, "status.error"),
    "--md-inline-code-background-color": role(mood, "surface.raised"),
    "--md-codeblock-color": role(mood, "text.primary"),
    "--md-codeblock-background-color": role(mood, "surface.raised"),
    "--md-inline-mark-text-color": role(mood, "text.primary"),
    "--md-inline-mark-background-color": role(mood, "status.notice"),
    "--md-inline-mark-underline-color": role(mood, "status.warning"),
    "--md-table-background-color": role(mood, "surface.raised"),
    "--md-blockquote-border-color": role(mood, "accent.secondary"),
    "--md-list-mark-color": role(mood, "accent.primary"),
    "--md-inline-code-border-width": "1px",
    "--md-codeblock-border-width": "1px",
    "--md-table-border-width": "1px",
    "--md-task-marker-font-weight": "bold",
    // Inkdrop renders headings from the per-level slots, not --syntax-heading-color
    // alone; derive every level/subtype from the base role like the built-in themes
    // so nothing falls back to Inkdrop's defaults.
    "--syntax-heading-font-weight": "bold",
    "--syntax-heading-1-color": "var(--syntax-heading-color)",
    "--syntax-heading-2-color": "var(--syntax-heading-color)",
    "--syntax-heading-3-color": "var(--syntax-heading-color)",
    "--syntax-heading-4-color": "var(--syntax-heading-color)",
    "--syntax-heading-5-color": "var(--syntax-heading-color)",
    "--syntax-heading-6-color": "var(--syntax-heading-color)",
    "--syntax-heading-1-font-weight": "var(--syntax-heading-font-weight)",
    "--syntax-heading-2-font-weight": "var(--syntax-heading-font-weight)",
    "--syntax-heading-3-font-weight": "var(--syntax-heading-font-weight)",
    "--syntax-heading-4-font-weight": "var(--syntax-heading-font-weight)",
    "--syntax-heading-5-font-weight": "var(--syntax-heading-font-weight)",
    "--syntax-heading-6-font-weight": "var(--syntax-heading-font-weight)",
    "--syntax-comment-font-style": "italic",
    "--syntax-line-comment-color": "var(--syntax-comment-color)",
    "--syntax-line-comment-font-style": "var(--syntax-comment-font-style)",
    "--syntax-block-comment-color": "var(--syntax-comment-color)",
    "--syntax-block-comment-font-style": "var(--syntax-comment-font-style)",
    "--syntax-doc-comment-color": "var(--syntax-comment-color)",
    "--syntax-doc-comment-font-style": "var(--syntax-comment-font-style)",
    "--syntax-arithmetic-operator-color": "var(--syntax-operator-color)",
    "--syntax-bitwise-operator-color": "var(--syntax-operator-color)",
    "--syntax-compare-operator-color": "var(--syntax-operator-color)",
    "--syntax-control-operator-color": "var(--syntax-operator-color)",
    "--syntax-definition-operator-color": "var(--syntax-operator-color)",
    "--syntax-deref-operator-color": "var(--syntax-operator-color)",
    "--syntax-logic-operator-color": "var(--syntax-operator-color)",
    "--syntax-update-operator-color": "var(--syntax-operator-color)",
    "--syntax-string-standard-color": "var(--syntax-string-color)",
    "--syntax-string-special-color": "var(--syntax-string-color)",
    "--syntax-string-constant-color": "var(--syntax-string-color)",
    "--syntax-name-special-color": role(mood, "syntax.function"),
    "--syntax-name-local-color": "var(--editor-foreground-color)",
    "--syntax-variable-name-special-color": role(mood, "status.error"),
    "--syntax-variable-name-local-color": "var(--syntax-variable-name-color)",
    "--syntax-property-name-special-color": "var(--syntax-property-name-color)",
    "--syntax-property-name-local-color": "var(--syntax-property-name-color)",
    "--syntax-emphasis-font-style": "italic",
    "--syntax-strong-font-weight": "bold",
    "--syntax-quote-font-style": "italic",
    "--syntax-link-text-decoration": "underline",
    "--syntax-strikethrough-text-decoration": "line-through",
    "--syntax-invalid-border-bottom": `1px dotted ${role(mood, "status.error")}`,
  };

  // Code blocks and tables read as filled surfaces with a near-bg hairline rather
  // than boxed outlines (Kanagawa style); panel/inline-code edges stay a soft line.
  const hair = hairline(mood);
  const soft = softLine(mood);
  Object.assign(vars, {
    "--editor-gutter-border-right": `1px solid ${hair}`,
    "--editor-panel-border-color": soft,
    "--md-codeblock-border-color": hair,
    "--md-table-border-color": hair,
    "--md-inline-code-border-color": soft,
  });

  return `${renderHeader(mood, "syntax")}@layer theme.syntax {
  :root {
    color-scheme: ${mood.appearance};
${cssVars(vars, "    ")}
  }

  :root:has(body.acrylic-window) {
    --editor-background-color: transparent;
    --editor-gutter-background-solid-color: transparent;
  }

  /* CodeMirror's token styles are unlayered, so only !important from inside a
   * layer outranks them. The descendant selector covers a match that wraps
   * token spans; the bare one a match nested inside a token. */
  .cm-editor .cm-searchMatch,
  .cm-editor .cm-searchMatch * {
    color: var(--hue-editor-search-match-color) !important;
  }

  .cm-editor .cm-searchMatch.cm-searchMatch-selected,
  .cm-editor .cm-searchMatch.cm-searchMatch-selected * {
    color: var(--hue-editor-search-match-selected-color) !important;
  }
}
`;
}

function renderPreviewCss(mood: ResolvedMood): string {
  // No `--page-background` here. `theme.preview` cascades after `theme.ui`, so a
  // page colour declared in this layer beat the acrylic block's `transparent`
  // in ui.css and put an opaque canvas behind every panel: the acrylic setting
  // graded the panels correctly over a solid colour and never showed the
  // material. Measured 2026-10-02 — sidebar, note list and editor matched
  // 50/70/90% of their tokens over #001F3E to within one step. The page belongs
  // to ui.css alone.
  const vars: Record<string, string> = {
    "--text-color": role(mood, "text.primary"),
    "--link-color": role(mood, "text.accent"),
    "--link-hover-color": role(mood, "accent.primary"),
    "--table-background": role(mood, "surface.canvas"),
    "--table-header-background": role(mood, "surface.raised"),
    "--table-header-color": role(mood, "text.primary"),
    "--md-inline-code-background-color": role(mood, "surface.raised"),
    "--md-codeblock-color": role(mood, "text.primary"),
    "--md-codeblock-background-color": role(mood, "surface.raised"),
    "--md-inline-mark-text-color": role(mood, "text.primary"),
    "--md-inline-mark-background-color": role(mood, "status.notice"),
    "--md-inline-mark-underline-color": role(mood, "status.warning"),
    "--md-table-background-color": role(mood, "surface.raised"),
    "--md-blockquote-border-color": role(mood, "accent.secondary"),
    "--md-list-mark-color": role(mood, "accent.primary"),
    // GitHub alerts (`> [!NOTE]` …). Inkdrop's base declares these as
    // `var(--blue, …)`, `var(--purple, …)` and so on, which are the tag-chip
    // colours — so an alert's colour was a side effect of how the 11 chip
    // families get grouped onto Hue's 5 chromatic roles, not a decision. GitHub's
    // own five levels map cleanly onto the `status` family, so state that
    // directly and stop the two from drifting into each other.
    "--gfm-alert-note": role(mood, "status.info"),
    "--gfm-alert-tip": role(mood, "status.success"),
    "--gfm-alert-important": role(mood, "status.notice"),
    "--gfm-alert-warning": role(mood, "status.warning"),
    "--gfm-alert-caution": role(mood, "status.error"),
    "--syntax-comment-color": role(mood, "syntax.comment"),
    "--syntax-keyword-color": role(mood, "syntax.keyword"),
    "--syntax-string-color": role(mood, "syntax.string"),
    "--syntax-number-color": role(mood, "syntax.number"),
    "--syntax-name-function-color": role(mood, "syntax.function"),
    "--syntax-operator-color": role(mood, "syntax.operator"),
    "--syntax-punctuation-color": role(mood, "syntax.punctuation"),
    // Inkdrop's rendered preview reads the --mde-preview-* namespace; without these
    // headings/links/code/tables fall back to defaults.
    "--mde-preview-heading-color": role(mood, "status.warning"),
    "--mde-preview-link-color": role(mood, "text.accent"),
    "--mde-preview-em-color": role(mood, "text.primary"),
    "--mde-preview-strong-color": role(mood, "text.primary"),
    "--mde-preview-blockquote-text-color": role(mood, "text.secondary"),
    "--mde-preview-blockquote-border-color": role(mood, "accent.secondary"),
    "--mde-preview-inline-code-text-color": role(mood, "syntax.string"),
    "--mde-preview-inline-code-background-color": role(mood, "surface.raised"),
    "--mde-preview-inline-code-border-color": role(mood, "border.subtle"),
    "--mde-preview-inline-code-border-width": "1px",
    "--mde-preview-codeblock-background-color": role(mood, "surface.raised"),
    "--mde-preview-codeblock-meta-background-color": role(mood, "surface.selected"),
    "--mde-preview-image-background-color": role(mood, "surface.raised"),
    "--mde-preview-inline-mark-background-color": role(mood, "status.notice"),
    "--mde-preview-inline-mark-text-color": role(mood, "text.primary"),
    "--mde-preview-inline-mark-underline-color": role(mood, "status.warning"),
    "--mde-preview-table-head-background-color": role(mood, "surface.raised"),
    "--mde-preview-table-head-text-color": role(mood, "text.primary"),
    "--mde-preview-table-row-background-color": role(mood, "surface.canvas"),
    "--mde-preview-table-row-stripe-background-color": role(mood, "surface.raised"),
    "--mermaid-background-color": role(mood, "surface.canvas"),
    "--mermaid-node-background-color": role(mood, "surface.raised"),
    "--mermaid-node-border-color": role(mood, "accent.primary"),
    "--mermaid-node-text-color": role(mood, "text.primary"),
    "--mermaid-line-color": role(mood, "border.subtle"),
    "--mermaid-label-text-color": role(mood, "text.primary"),
    "--mermaid-edge-label-background-color": role(mood, "surface.canvas"),
    "--mermaid-cluster-background-color": translucent(
      role(mood, "surface.raised"),
      MERMAID_CLUSTER,
    ),
    "--mermaid-cluster-border-color": role(mood, "border.subtle"),
    "--mermaid-title-text-color": role(mood, "text.primary"),
    "--mermaid-primary-color": role(mood, "accent.primary"),
    "--mermaid-primary-text-color": textOn(mood, role(mood, "accent.primary")),
    "--mermaid-primary-border-color": role(mood, "accent.primary"),
    "--mermaid-secondary-color": role(mood, "accent.secondary"),
    "--mermaid-secondary-text-color": textOn(mood, role(mood, "accent.secondary")),
    "--mermaid-secondary-border-color": role(mood, "accent.secondary"),
    "--mermaid-tertiary-color": role(mood, "status.warning"),
    "--mermaid-tertiary-text-color": textOn(mood, role(mood, "status.warning")),
    "--mermaid-tertiary-border-color": role(mood, "status.warning"),
    "--mermaid-note-background-color": role(mood, "status.notice"),
    "--mermaid-note-border-color": role(mood, "status.warning"),
    "--mermaid-note-text-color": role(mood, "text.primary"),
    "--mermaid-actor-background-color": role(mood, "surface.raised"),
    "--mermaid-actor-border-color": role(mood, "accent.primary"),
    "--mermaid-actor-text-color": role(mood, "text.primary"),
    "--mermaid-activation-background-color": role(mood, "surface.selected"),
    "--mermaid-activation-border-color": role(mood, "accent.primary"),
    "--mermaid-sequence-number-color": role(mood, "text.secondary"),
    "--mermaid-loop-text-color": role(mood, "text.primary"),
    "--mermaid-loop-line-color": role(mood, "border.subtle"),
    "--mermaid-state-background-color": role(mood, "surface.raised"),
    "--mermaid-state-border-color": role(mood, "accent.primary"),
    "--mermaid-state-text-color": role(mood, "text.primary"),
    "--mermaid-class-background-color": role(mood, "surface.raised"),
    "--mermaid-class-border-color": role(mood, "accent.secondary"),
    "--mermaid-class-text-color": role(mood, "text.primary"),
    "--mermaid-er-entity-background-color": role(mood, "surface.raised"),
    "--mermaid-er-entity-border-color": role(mood, "accent.primary"),
    "--mermaid-er-entity-text-color": role(mood, "text.primary"),
    "--mermaid-gantt-active-task-color": role(mood, "accent.primary"),
    "--mermaid-gantt-done-task-color": role(mood, "status.success"),
    "--mermaid-gantt-critical-task-color": role(mood, "status.error"),
    "--mermaid-git-branch-label-color": role(mood, "surface.canvas"),
  };

  // Subtle, filled-surface borders for rendered code blocks and tables.
  const hair = hairline(mood);
  const soft = softLine(mood);
  Object.assign(vars, {
    "--border-color": soft,
    "--md-codeblock-border-color": hair,
    "--md-table-border-color": hair,
    "--md-inline-code-border-color": soft,
  });

  return `${renderHeader(mood, "preview")}@layer theme.preview {
  :root {
    color-scheme: ${mood.appearance};
${cssVars(vars, "    ")}
  }

  /* No background: the base leaves the preview transparent over the editor
   * pane, which is what lets it follow --editor-background under acrylic. */
  .mde-preview,
  .mde-preview .markdown-body {
    color: ${cssValue(role(mood, "text.primary"))};
  }

  .mde-preview a {
    color: ${cssValue(role(mood, "text.accent"))};
  }

  .mde-preview blockquote {
    color: ${cssValue(role(mood, "text.secondary"))};
    border-left-color: ${cssValue(role(mood, "accent.secondary"))};
  }

  .mde-preview code,
  .mde-preview pre {
    background: ${cssValue(role(mood, "surface.raised"))};
    border-color: ${cssValue(hair)};
  }

  .mde-preview table th,
  .mde-preview table td {
    border-color: ${cssValue(hair)};
  }
}
`;
}

function renderInkdropPackage(
  mood: ResolvedMood,
  allMoods: readonly ResolvedMood[],
): InkdropPackage {
  const name = packageName(mood);
  return {
    packageName: name,
    packagePath: name,
    moodId: mood.id,
    files: [
      { path: "package.json", content: renderPackageJson(mood) },
      { path: "README.md", content: renderReadme(mood, allMoods) },
      { path: "LICENSE", content: renderLicense() },
      { path: "styles/palette.css", content: renderPaletteCss(mood) },
      { path: "styles/ui.css", content: renderUiCss(mood) },
      { path: "styles/syntax.css", content: renderSyntaxCss(mood) },
      { path: "styles/preview.css", content: renderPreviewCss(mood) },
    ],
  };
}

export function renderInkdropPackages(moods: readonly ResolvedMood[]): InkdropPackage[] {
  return moods.map((mood) => renderInkdropPackage(mood, moods));
}
