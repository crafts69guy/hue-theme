// The resolved mood every adapter renders from, and the two accessors they read
// it through. One definition, so a typo in a role name is a type error at the
// call site rather than a build-time throw from whichever adapter hit it first.

import type { SemanticToken } from "../generated/themes";

export type ResolvedMood = {
  readonly id: string;
  readonly label: string;
  readonly appearance: "dark" | "light";
  readonly description: string;
  readonly primitive: Readonly<Record<string, string>>;
  readonly semantic: Readonly<Record<string, string>>;
};

/** A semantic role's resolved hex. Throws if the mood does not carry it. */
export function role(mood: Pick<ResolvedMood, "id" | "semantic">, key: SemanticToken): string {
  const value = mood.semantic[key];
  if (!value) throw new Error(`Mood ${mood.id} is missing semantic role ${key}`);
  return value;
}

/**
 * A primitive's resolved hex. Adapters should reach for semantic roles; this is
 * for the few derivations that are defined over the raw palette, such as the
 * 16-colour ANSI table.
 */
export function primitive(mood: Pick<ResolvedMood, "id" | "primitive">, key: string): string {
  const value = mood.primitive[key];
  if (!value) throw new Error(`Mood ${mood.id} is missing primitive ${key}`);
  return value;
}
