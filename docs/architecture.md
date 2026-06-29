# Hue Theme architecture

## Token layers

1. **Primitive** tokens hold authored color values and cultural metadata.
2. **Semantic** tokens describe stable roles such as `surface.canvas`,
   `text.primary`, and `syntax.keyword`.
3. **Adapters** map stable roles to host-specific APIs. An adapter must not
   change primitive or semantic source data.

The semantic contract is versioned. Removing or changing the meaning of a role
requires a major version. The contract is declared in
`packages/tokens/src/contract.ts`: each family is marked `closed` (themes must
match its roles exactly, because consumers switch on them exhaustively — e.g.
`status`) or open (themes must include at least the declared roles — curated
families such as `syntax`). The build validates every mood against this
declaration rather than only checking that the moods agree with each other.

## Adapter capabilities

| Host            | Status  | Mapping target                            | Typography policy                     |
| --------------- | ------- | ----------------------------------------- | ------------------------------------- |
| Yaak            | shipped | TypeScript plugin theme API               | Export only supported properties      |
| LazyVim/Neovim  | shipped | highlight groups and terminal ANSI colors | Never set the user's font             |
| Ghostty         | shipped | theme file (ANSI palette + bg/fg/cursor)  | Theme carries colors only             |
| tmux            | shipped | TPM plugin (status/pane/window theme)     | Never set the user's font             |
| Fish/Tide       | shipped | sourceable Fish prompt theme              | Theme carries colors only             |
| Inkdrop UI      | shipped | CSS custom properties                     | Respect user font settings by default |
| Inkdrop Syntax  | shipped | CodeMirror syntax CSS variables           | Never set `font-family`               |
| Inkdrop Preview | shipped | Markdown document CSS variables/selectors | Respect user font settings by default |

Each adapter declares a capability manifest of which contract families it
supports versus explicitly omits; the build asserts every family is accounted
for exactly once. Unsupported families are omitted explicitly rather than
approximated.

The Yaak adapter is implemented in `packages/tokens/src/adapters/yaak.ts`. The
token build renders all three moods into the Yaak theme plugin at
`packages/yaak-plugin/`. Only Yaak's supported `base` UI tokens are exported; the
`syntax.*` family is omitted because Yaak's theme API has no syntax slots.

The Neovim adapter is implemented in `packages/tokens/src/adapters/neovim.ts`
and supports every contract family — Neovim has a slot for all of them. The build
generates the whole `packages/nvim-plugin/` Lua tree (`lua/hue/{palette,colors,
util,groups,init}.lua`, `colors/hue-<mood>.lua`, and
`lua/lualine/themes/hue-<mood>.lua`).
Colors are applied with `vim.api.nvim_set_hl` and cover core editor groups,
Treesitter `@`-captures, LSP semantic tokens, diagnostics/git, terminal ANSI, and
common LazyVim plugins. The colorscheme sets `background` but never a font.

The generated Lua is layered: `palette.lua` holds raw per-mood data,
`colors.lua` is the public accessor (`require("hue").colors()` grouped by family,
`.raw()` flat), `util.lua` provides dependency-free color math
(`blend`/`darken`/`lighten`), and `groups.lua` maps roles to highlight specs.
User configs build custom highlights against this public API rather than the
internal palette module. `init.lua` also exposes `setup({ transparent = true })`,
which clears backgrounds on editor, float, and popular-plugin groups after load
so a translucent terminal shows through (selection/active states keep their bg).

The Ghostty adapter (`adapters/ghostty.ts`) generates `ghostty/hue-<mood>` theme
files into `packages/terminal-themes/`. The tmux adapter (`adapters/tmux.ts`)
generates a TPM plugin into `packages/tmux-plugin/` (`themes/hue-<mood>.conf` plus
the executable `hue.tmux` entrypoint that sources the mood from `@hue_flavour`).
The 16-color ANSI derivation and the `ResolvedMood` shape they share with Neovim
live in `adapters/terminal.ts` so the terminal palette is derived in exactly one
place. Like Neovim, the tmux plugin is released to a standalone repo
(`scripts/release-tmux.sh`); Ghostty has no plugin mechanism, so its theme file
is consumed directly.

The Tide adapter (`adapters/tide.ts`) generates sourceable Fish files into
`packages/fish-themes/tide/`. It maps prompt segments to semantic roles directly
and emits true-color hex values via `set -g`, keeping generated theme colors out
of Fish universal variable storage (`fish_variables`). Tide's wizard remains the
layout/icon tool; Hue owns only the color mapping.

The Inkdrop adapter (`adapters/inkdrop.ts`) generates one installable package per
mood and theme type into `packages/inkdrop-hue-<mood>-<type>-theme/`, for 9
packages total (`ui`, `syntax`, and `preview` for each mood). It targets Inkdrop
6's CSS custom property theme model (`theme` metadata plus `styleSheets`) and
does not set fonts. UI packages map surfaces/text/borders/accents/status roles
onto Inkdrop app variables; syntax packages map `syntax.*` plus editor affordance
variables; preview packages keep rendered Markdown surfaces and code blocks
aligned with the same roles.

## Accessibility policy

- Primary and secondary body text: WCAG 2.2 AA, at least 4.5:1.
- Interactive boundaries and focus indicators: at least 3:1.
- Syntax colors are audited against the editor background and with simulated
  color-vision deficiencies. Exceptions must be documented.
- Information must not rely on color alone.

References:

- [DTCG Format 2025.10](https://www.designtokens.org/tr/2025.10/format/)
- [WCAG 2.2 contrast](https://www.w3.org/TR/WCAG22/#contrast-minimum)
- [Kanagawa palette/semantic architecture](https://github.com/rebelot/kanagawa.nvim)
- [Inkdrop theme guide](https://developers.inkdrop.app/guides/create-a-theme)
- [Yaak plugin quick start](https://yaak.app/docs/plugin-development/plugins-quick-start)
