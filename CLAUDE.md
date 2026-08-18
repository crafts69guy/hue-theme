# Hue Theme

A theme design system: one versioned token contract, generated into themes for
eleven hosts. Not a dotfiles repo — without this file the nearest `CLAUDE.md` is
`~/.dotfiles/CLAUDE.md`, which describes stow, `.config/`, and a `production`
branch that do not exist here. The default branch is `main`.

## The one rule

`packages/tokens/src/` is the source. Everything else under `packages/` is build
output — Lua, TOML, CSS, `.tmTheme`, plugin bundles. Edit the tokens or an
adapter and run the build; never hand-edit a generated file, because the next
build silently overwrites it.

```fish
bun run --cwd packages/tokens build   # contract + WCAG gates, writes every adapter
bun run format                        # biome, run after generating
bun run ci                            # the full gate
```

## Before changing colours

Every mood is validated against the contract in `src/contract.ts` and against
contrast floors — WCAG AA for body text, 3:1 for boundaries — plus adapter-level
assertions in `tests/`. Reuse `src/color.ts` (`contrastRatio`, `mixHex`) rather
than writing colour math. A change that clears the build can still be wrong to
the eye: contrast checks cannot tell you that keyword and function ended up the
same hue.

## Publishing

Read [`docs/distribution.md`](docs/distribution.md) before releasing anything.
Four channels are involved and only two of them are what `release-all.sh` does;
the registries need their own version bumps, and no build step performs them.
The trap is quiet — a green build and correct files on disk while users see
nothing change.

Verify against the host that installs the theme, not against files in an install
directory. Registries reinstall over local edits on their own schedule.

## Documents

- [`docs/architecture.md`](docs/architecture.md) — token layers, every adapter's
  mapping target and capability manifest
- [`docs/distribution.md`](docs/distribution.md) — which channel reaches which
  host, and how to confirm it landed
- [`docs/cultural-direction.md`](docs/cultural-direction.md) — what each mood is
  supposed to feel like

`tests/docs.test.ts` holds the documentation to the code: every adapter that
declares a manifest must appear in the docs, a mood must be described the same
way everywhere, and any hex quoted in a README must be a live token value.
