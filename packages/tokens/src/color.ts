export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const matches = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!matches) throw new Error(`Invalid sRGB hex color: ${hex}`);

  return matches.slice(1).map((channel) => Number.parseInt(channel, 16)) as Rgb;
}

export function rgbToHex(rgb: Rgb): string {
  return `#${rgb
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

export function mixHex(a: string, b: string, weight: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex([
    Math.round(ar * (1 - weight) + br * weight),
    Math.round(ag * (1 - weight) + bg * weight),
    Math.round(ab * (1 - weight) + bb * weight),
  ]);
}

export function relativeLuminance(hex: string): number {
  const channels = hexToRgb(hex)
    .map((channel) => channel / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/**
 * A colour as CSS `hsl()` channels — `"210deg 100% 12.2%"` — for hosts whose
 * stylesheets read colour scales as bare channel triplets, e.g.
 * `hsl(var(--hsl-neutral-900) / 50%)`. An output format only: Hue derives and
 * mixes in sRGB, and converts at the edge.
 */
export function hslChannels(hex: string): string {
  const [r, g, b] = hexToRgb(hex).map((channel) => channel / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;
  let hue = 0;
  let saturation = 0;
  if (delta > 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue = (hue * 60 + 360) % 360;
  }
  const round = (value: number) => Math.round(value * 10) / 10;
  return `${round(hue)}deg ${round(saturation * 100)}% ${round(lightness * 100)}%`;
}
