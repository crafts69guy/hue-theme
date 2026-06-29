// Shared building blocks for terminal-oriented adapters (Neovim, Ghostty, tmux).
// The resolved-mood shape and the 16-color ANSI derivation live here so every
// terminal adapter agrees on them instead of re-deriving the palette.

export type ResolvedMood = {
  id: string;
  label: string;
  appearance: "dark" | "light";
  description: string;
  primitive: Record<string, string>;
  semantic: Record<string, string>;
};

/**
 * Derive the 16 ANSI terminal colors for a mood. Chromatic slots come straight
 * from the mood's primitives; neutral slots (black/white and their bright
 * variants) are chosen by appearance. Bright chromatic slots reuse their base
 * hue — deterministic and avoids color math the token system does not own. Cyan
 * reuses the blue primitive: the Hue palette has no dedicated cyan.
 *
 * Index order is the standard ANSI 0–15 (black, red, green, yellow, blue,
 * magenta, cyan, white, then the eight bright variants).
 */
export function terminalColors(mood: ResolvedMood): string[] {
  const p = mood.primitive;
  const dark = mood.appearance === "dark";
  const black = dark ? p.stone : p.paper;
  const brightBlack = dark ? p.rain : p.ash;
  const white = dark ? p.ash : p.stone;
  const brightWhite = dark ? p.paper : p.ink;
  return [
    black, // 0  black
    p.vermilion, // 1  red
    p.jade, // 2  green
    p.gold, // 3  yellow
    p.blue, // 4  blue
    p.violet, // 5  magenta
    p.blue, // 6  cyan (no dedicated cyan primitive)
    white, // 7  white
    brightBlack, // 8  bright black
    p.vermilion, // 9  bright red
    p.jade, // 10 bright green
    p.gold, // 11 bright yellow
    p.blue, // 12 bright blue
    p.violet, // 13 bright magenta
    p.blue, // 14 bright cyan
    brightWhite, // 15 bright white
  ];
}
