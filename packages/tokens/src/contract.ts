// The declared Hue semantic contract — the single source of truth for which
// roles exist, grouped by family, and how strict each family is.
//
// closed: a theme must implement EXACTLY these roles (no missing, no extra).
//   Consumers switch on closed families exhaustively (e.g. status), so the set
//   must not drift silently; adding/removing a role is a deliberate edit here.
// open:  a theme must implement AT LEAST these roles and MAY add more (curated
//   display families such as syntax, where consumers render a subset).

export type FamilySpec = { readonly closed: boolean; readonly roles: readonly string[] };

export const CONTRACT = {
  surface: { closed: true, roles: ["canvas", "raised", "selected"] },
  text: { closed: true, roles: ["primary", "secondary", "accent"] },
  border: { closed: true, roles: ["subtle"] },
  accent: { closed: true, roles: ["primary", "secondary"] },
  status: { closed: true, roles: ["success", "info", "notice", "warning", "error"] },
  syntax: {
    closed: false,
    roles: ["keyword", "string", "number", "function", "comment", "operator"],
  },
} as const satisfies Record<string, FamilySpec>;

export type Family = keyof typeof CONTRACT;

/** Fully-qualified token names (`family.role`) declared by the contract. */
export function contractTokens(): string[] {
  return Object.entries(CONTRACT).flatMap(([family, spec]) =>
    spec.roles.map((role: string) => `${family}.${role}`),
  );
}
