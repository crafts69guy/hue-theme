// Contrast floors every mood must clear before any adapter renders it. Declared
// as data so the build, the tests, and the docs read one list.
//
// Floors follow docs/architecture.md: WCAG AA 4.5:1 for anything read as text,
// 3:1 for boundaries. Two syntax roles are documented exceptions held to 3:1 —
// comments and punctuation are meant to recede behind the code around them, and
// lifting them to 4.5:1 flattens that hierarchy. 3:1 still keeps them legible.
//
// The selection gate is not a WCAG figure. A selection has to be findable at a
// glance against the canvas, and 1.4:1 is the floor below which it was not —
// Cung's selection once sat at 1.29:1 and could not be seen in a light editor.

import type { SemanticToken } from "../generated/themes";
import { contrastRatio } from "./color";
import {
  DIFF_STATUS,
  DIFF_WEIGHT_NAMES,
  type DiffWeight,
  diffRow,
  textMuted,
  textOn,
} from "./derive";
import { type ResolvedMood, role } from "./mood";

export type ContrastGate = {
  /** Token drawn on top. */
  readonly fg: string;
  /** Token underneath. */
  readonly bg: string;
  readonly minimum: number;
  readonly why: string;
};

const TEXT = 4.5;
const BOUNDARY = 3;
const RECEDING = 3;
const FINDABLE = 1.4;

const onCanvas = (fg: string, minimum: number, why: string): ContrastGate => ({
  fg,
  bg: "surface.canvas",
  minimum,
  why,
});

export const RECEDING_SYNTAX = ["syntax.comment", "syntax.punctuation"] as const;

export function contrastGates(semanticKeys: readonly string[]): ContrastGate[] {
  const receding = new Set<string>(RECEDING_SYNTAX);
  return [
    onCanvas("text.primary", TEXT, "body text"),
    onCanvas("text.secondary", TEXT, "body text"),
    onCanvas("text.accent", TEXT, "links and accented text"),
    onCanvas("accent.primary", TEXT, "accent used as text"),
    onCanvas("border.subtle", BOUNDARY, "interactive boundary"),
    ...semanticKeys
      .filter((key) => key.startsWith("status."))
      .map((key) => onCanvas(key, TEXT, "status shown as text")),
    ...semanticKeys
      .filter((key) => key.startsWith("syntax."))
      .map((key) =>
        receding.has(key)
          ? onCanvas(key, RECEDING, "receding syntax (documented exception)")
          : onCanvas(key, TEXT, "code text"),
      ),
    { fg: "surface.selected", bg: "surface.canvas", minimum: FINDABLE, why: "findable selection" },
    { fg: "text.primary", bg: "surface.selected", minimum: TEXT, why: "text inside a selection" },
  ];
}

/** Every gate a mood fails, as readable lines. Empty means the mood passes. */
export function contrastFailures(id: string, semantic: Readonly<Record<string, string>>): string[] {
  return contrastGates(Object.keys(semantic)).flatMap((gate) => {
    const fg = semantic[gate.fg];
    const bg = semantic[gate.bg];
    if (!fg || !bg) return [`${id}: gate ${gate.fg} on ${gate.bg} names a missing token`];
    const ratio = contrastRatio(fg, bg);
    return ratio < gate.minimum
      ? [
          `${id}: ${gate.fg} on ${gate.bg} is ${ratio.toFixed(2)}:1, below ${gate.minimum}:1 (${gate.why})`,
        ]
      : [];
  });
}

// Derived colours (src/derive.ts) are gated like tokens: each one is only
// defensible if it measures up, and a palette edit can break them silently.
// Share of its canvas contrast a syntax role must keep on a diff row. `emph`
// marks only the few words that changed, and it is meant to shout, so it trades
// legibility for salience at a lower floor; whole rows keep 0.7x.
const ROW_SYNTAX_KEEP: Record<DiffWeight, number> = { line: 0.7, quiet: 0.7, emph: 0.5 };
const FILL_TEXT = 4.5;
const FILLS: readonly SemanticToken[] = [
  "accent.primary",
  "accent.secondary",
  "status.success",
  "status.info",
  "status.notice",
  "status.warning",
  "status.error",
];

/** Every derived-colour floor a mood fails. Empty means the mood passes. */
export function derivedFailures(mood: ResolvedMood): string[] {
  const failures: string[] = [];
  const canvas = role(mood, "surface.canvas");
  const check = (label: string, ratio: number, minimum: number) => {
    if (ratio < minimum) {
      failures.push(`${mood.id}: ${label} is ${ratio.toFixed(2)}, below ${minimum}`);
    }
  };

  check("text.muted on surface.canvas", contrastRatio(textMuted(mood), canvas), RECEDING);

  for (const fill of FILLS) {
    const bg = role(mood, fill);
    check(`text on a ${fill} fill`, contrastRatio(textOn(mood, bg), bg), FILL_TEXT);
  }

  for (const [side, status] of Object.entries(DIFF_STATUS)) {
    for (const weight of DIFF_WEIGHT_NAMES) {
      const row = diffRow(mood, status, weight);
      const where = `${side} ${weight} diff row`;
      check(`text.primary on the ${where}`, contrastRatio(role(mood, "text.primary"), row), TEXT);
      for (const [token, value] of Object.entries(mood.semantic)) {
        if (!token.startsWith("syntax.")) continue;
        const kept = contrastRatio(value, row) / contrastRatio(value, canvas);
        check(`${token} contrast kept on the ${where}`, kept, ROW_SYNTAX_KEEP[weight]);
      }
    }
  }
  return failures;
}
