// Derived colours: values several hosts need that the contract does not name.
//
// They live here, not in `CONTRACT`, because adding a role to a closed family is
// a breaking change rippling through every adapter to serve a few. But they are
// not free-for-all either: a diff row in delta and the same row in tuicr sit side
// by side on one screen, so each concept is derived once, here, and every
// adapter that draws it calls the same function. The build gates the results in
// `gates.ts` exactly as it gates tokens.
//
// All mixing is plain sRGB (`mixHex`), the same space as CSS
// `color-mix(in srgb, …)`, so a value precomputed here and one blended by a CSS
// host agree.

import type { SemanticToken, StatusToken } from "../generated/themes";
import { contrastRatio, mixHex } from "./color";
import { type ResolvedMood, role } from "./mood";

/**
 * The canvas tinted toward a role. `weight` is how much of the role lands:
 * 0 is the bare canvas, 1 is the role itself.
 */
export function wash(mood: ResolvedMood, token: SemanticToken, weight: number): string {
  return mixHex(role(mood, "surface.canvas"), role(mood, token), weight);
}

/**
 * Halfway between the canvas and `surface.raised`: a recessed tray under a
 * raised card (Inkdrop's segment footer, note-list section headers) and the
 * middle step of delta's blame palette.
 */
export function tray(mood: ResolvedMood): string {
  return mixHex(role(mood, "surface.canvas"), role(mood, "surface.raised"), 0.5);
}

/**
 * A step dimmer than `text.secondary`, for the lowest-rank chrome text.
 *
 * The weight is measured, not chosen: at 0.4 the light mood's dim text falls to
 * 2.44:1 on its own canvas, below the 3:1 floor it is gated at. 0.25 keeps every
 * mood above 3:1 while still reading a clear step down from secondary.
 */
export function textMuted(mood: ResolvedMood): string {
  return mixHex(role(mood, "text.secondary"), role(mood, "surface.canvas"), 0.25);
}

/**
 * Legible text on a filled `background`. Not a fixed choice: whichever of the
 * canvas and the primary text contrasts more with the fill wins, which is the
 * same measurement a WCAG check would make.
 */
export function textOn(mood: ResolvedMood, background: string): string {
  const canvas = role(mood, "surface.canvas");
  const primary = role(mood, "text.primary");
  return contrastRatio(canvas, background) >= contrastRatio(primary, background) ? canvas : primary;
}

/**
 * How strongly a diff row carries its status hue. `line` is a whole changed
 * row, `emph` the changed words inside it, `quiet` the unchanged words of a
 * changed row (and rows drawn under syntax highlighting, which need more room).
 */
export type DiffWeight = "line" | "emph" | "quiet";

const DIFF_WEIGHTS: Record<DiffWeight, { shade: number; blend: number }> = {
  line: { shade: 0.72, blend: 0.3 },
  emph: { shade: 0.55, blend: 0.2 },
  quiet: { shade: 0.8, blend: 0.45 },
};

/**
 * A diff row background carrying the status hue, not the canvas hue.
 *
 * The obvious derivation — `wash(mood, status, w)` — fails on Mưa: a navy
 * canvas drags any blend toward itself, so at a readable weight "added" lands on
 * teal and "removed" on purple, and the one signal a diff must never lose is
 * red-vs-green. So the status colour is shaded toward black (dark moods) or
 * white (light moods) first, which drops lightness while keeping hue, and only
 * then blended back toward the canvas so the row still belongs to the mood.
 *
 * Measured, not chosen: on every row weight, every `syntax.*` role keeps at
 * least 0.7x the contrast it has on the canvas and `text.primary` stays AA —
 * both gated in `gates.ts`.
 */
export function diffRow(
  mood: ResolvedMood,
  status: StatusToken,
  weight: DiffWeight = "line",
): string {
  const { shade, blend } = DIFF_WEIGHTS[weight];
  const pole = mood.appearance === "dark" ? "#000000" : "#FFFFFF";
  return mixHex(mixHex(role(mood, status), pole, shade), role(mood, "surface.canvas"), blend);
}

export const DIFF_STATUS = {
  added: "status.success",
  removed: "status.error",
  changed: "status.info",
} as const satisfies Record<string, StatusToken>;

export const DIFF_WEIGHT_NAMES = Object.keys(DIFF_WEIGHTS) as DiffWeight[];

/** The eleven steps of a Tailwind-shaped colour scale, lightest first. */
export const RAMP_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type RampStep = (typeof RAMP_STEPS)[number];
export type Ramp = Record<RampStep, string>;

// Where each mood's own roles sit on the neutral scale. Steps between anchors
// are interpolated, so the scale passes through the mood's real surfaces and
// text rather than approximating them. Dark moods run text -> canvas; light
// moods run the other way, with the white raised panel lightest.
const NEUTRAL_ANCHORS: Record<"dark" | "light", Partial<Record<RampStep, SemanticToken>>> = {
  dark: {
    50: "text.primary",
    300: "text.secondary",
    500: "border.subtle",
    800: "border.faint",
    900: "surface.raised",
    950: "surface.canvas",
  },
  light: {
    50: "surface.raised",
    100: "surface.canvas",
    200: "border.faint",
    500: "border.subtle",
    700: "text.secondary",
    950: "text.primary",
  },
};

/**
 * The mood as a neutral scale: a host that draws its chrome from a stock grey
 * ramp (Inkdrop's base stylesheet) gets the mood's own surfaces, boundaries and
 * text at the steps it reaches for, and blends between them elsewhere.
 */
export function neutralRamp(mood: ResolvedMood): Ramp {
  const anchors = Object.entries(NEUTRAL_ANCHORS[mood.appearance]).map(
    ([step, token]) => [RAMP_STEPS.indexOf(Number(step) as RampStep), role(mood, token)] as const,
  );
  const ramp = {} as Ramp;
  RAMP_STEPS.forEach((step, index) => {
    const after = anchors.findIndex(([at]) => at >= index);
    const [toIndex, to] = anchors[after];
    if (toIndex === index || after === 0) {
      ramp[step] = to;
      return;
    }
    const [fromIndex, from] = anchors[after - 1];
    ramp[step] = mixHex(from, to, (index - fromIndex) / (toIndex - fromIndex));
  });
  return ramp;
}

// How far each step travels from the role toward the mood's own light or dark
// end. 500 is the role itself.
const HUE_RAMP_WEIGHTS: Record<RampStep, number> = {
  50: 0.9,
  100: 0.78,
  200: 0.6,
  300: 0.4,
  400: 0.2,
  500: 0,
  600: 0.2,
  700: 0.4,
  800: 0.6,
  900: 0.75,
  950: 0.85,
};

/**
 * A chromatic scale built on one role. Steps lighter than 500 blend toward the
 * neutral scale's light end and darker ones toward its dark end, so every scale
 * converges on the mood's own text and canvas rather than on stock white and
 * black.
 */
export function hueRamp(mood: ResolvedMood, token: SemanticToken): Ramp {
  const neutral = neutralRamp(mood);
  const base = role(mood, token);
  const ramp = {} as Ramp;
  for (const step of RAMP_STEPS) {
    const pole = step < 500 ? neutral[50] : neutral[950];
    ramp[step] = mixHex(base, pole, HUE_RAMP_WEIGHTS[step]);
  }
  return ramp;
}
