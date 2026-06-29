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
| Inkdrop UI      | planned | CSS custom properties                     | Respect user font settings by default |
| Inkdrop Syntax  | planned | CodeMirror selectors and variables        | Never set `font-family`               |
| Inkdrop Preview | planned | Markdown document CSS variables           | May use the prose stack               |

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
generates the whole `packages/nvim-plugin/` Lua tree (`lua/hue/{palette,groups,
init}.lua`, `colors/hue-<mood>.lua`, and `lua/lualine/themes/hue-<mood>.lua`).
Colors are applied with `vim.api.nvim_set_hl` and cover core editor groups,
Treesitter `@`-captures, LSP semantic tokens, diagnostics/git, terminal ANSI, and
common LazyVim plugins. The colorscheme sets `background` but never a font.

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
