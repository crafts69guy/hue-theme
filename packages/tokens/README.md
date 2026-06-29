# @hue-theme/tokens

The core of the Hue Theme system: source design tokens plus the build that
resolves and validates them into portable artifacts.

## Layers

1. **Primitive** — authored colors with cultural metadata, per mood, in
   `src/themes/{mua,huong,cung}.json` (DTCG format).
2. **Semantic** — stable roles (`surface.canvas`, `status.notice`,
   `syntax.keyword`, …) declared once in `src/contract.ts`, with a `closed`/open
   flag per family.
3. **Adapters** — map semantic roles onto a host API without mutating source
   data (see `src/adapters/`).

## Build

```fish
bun run build   # resolve tokens, validate against the contract, write generated/
bun run check   # build --check (no writes) + tsc --noEmit
```

`bun run build` validates every mood against the contract and WCAG AA contrast,
then writes `generated/themes.{json,ts,css}` and the Yaak plugin entrypoint.
Generated artifacts must not be edited by hand.

## Exports

- `.` → `generated/themes.ts` (`themeBundle`, `getTheme`, `SemanticToken` and
  per-family token unions such as `STATUS_TOKENS` / `StatusToken`).
- `./themes.css`, `./themes.json` → the generated CSS variables and flat data.
