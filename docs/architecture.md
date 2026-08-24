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
| ChatGPT/Codex   | shipped | `codex-theme-v1` share string             | Use system-default fonts              |
| tmux            | shipped | TPM plugin (status/pane/window theme)     | Never set the user's font             |
| Fish/Tide       | shipped | sourceable Fish prompt theme              | Theme carries colors only             |
| Inkdrop         | shipped | Unified v6 CSS custom properties          | Respect user font settings by default |
| bat             | shipped | `.tmTheme` syntax theme (Sublime XML)     | Theme carries colors only             |
| lazygit         | shipped | `gui.theme` YAML fragment                 | Theme carries colors only             |
| delta           | shipped | git-config `[delta "hue"]` fragment        | Theme carries colors only             |
| herdr           | shipped | `[theme.custom]` TOML fragment            | Theme carries colors only             |
| tuicr           | shipped | TOML colour keys + the bat `.tmTheme`     | Theme carries colors only             |

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

The ChatGPT/Codex adapter (`adapters/codex.ts`) generates one
`codex-theme-v1` share string per mood into `packages/codex-themes/`. It maps
the canvas, primary text, primary/secondary accents, and added/removed diff
colors onto the app's exposed theme seed. The app derives borders and secondary
surfaces from its contrast value, and its import format accepts only a built-in
code-theme id, so Hue leaves `border.*` and `syntax.*` under host control. Mưa
and Hương target the dark slot, Cung targets the light slot, and all three use
the built-in Codex code theme and system-default fonts.

The Tide adapter (`adapters/tide.ts`) generates sourceable Fish files into
`packages/fish-themes/tide/`. It maps prompt segments to semantic roles directly
and emits true-color hex values via `set -g`, keeping generated theme colors out
of Fish universal variable storage (`fish_variables`). Tide's wizard remains the
layout/icon tool; Hue owns only the color mapping.

The Inkdrop adapter (`adapters/inkdrop.ts`) generates one unified Inkdrop v6
package per mood into `packages/hue-<mood>-theme/`. Each package declares
`"theme": true` and ships `palette.css`, `ui.css`, `syntax.css`, and
`preview.css`, wrapped in the matching `@layer theme*` cascade layer. The UI
stylesheet maps surfaces/text/borders/accents/status roles onto Inkdrop app
variables; the syntax stylesheet maps `syntax.*` plus editor affordance
variables; the preview stylesheet keeps rendered Markdown, code blocks, and
Mermaid diagrams aligned with the same roles. Inkdrop stylesheets do not set
fonts.

The bat adapter (`adapters/bat.ts`) generates `bat/hue-<mood>.tmTheme` into
`packages/terminal-themes/` — a Sublime-format plist, because that is the only
theme format bat reads. The lazygit adapter (`adapters/lazygit.ts`) writes
`lazygit/hue-<mood>.yml` fragments alongside it, merged into lazygit's config
through `LG_CONFIG_FILE` rather than replacing it. Neither host has a plugin
mechanism, so both are consumed as local files kept in sync with this repo.

The delta adapter (`adapters/delta.ts`) writes `delta/hue-<mood>.gitconfig`
into the same package. It covers the gap lazygit's `gui.theme` leaves: the diff
body is drawn by the pager, so before this adapter existed lazygit's Patch panel
and `git diff` alike were colored by whatever feature the user's `~/.gitconfig`
named. Every mood declares the same feature, `[delta "hue"]`, so the mood is
switched by re-pointing an included symlink rather than by editing the user's
config. Two derivations are specific to it: the added/removed row backgrounds
shade the status color toward black or white before blending it back toward the
canvas — a plain canvas/status mix reads teal and purple on Mưa's navy, losing
the one distinction a diff cannot lose — and `zero-style` is deliberately left
without a background so a translucent terminal still shows through context
lines. Syntax highlighting is deferred to bat: `syntax-theme` names the
`hue-<mood>` `.tmTheme` this repo already generates.

The herdr adapter (`adapters/herdr.ts`) generates `themes/hue-<mood>.toml`
fragments spliced into herdr's `[theme.custom]`, and the tuicr adapter
(`adapters/tuicr.ts`) generates the review TUI's own colour keys into the same
package. tuicr resolves `syntax_theme` relative to its theme file, so the bat
`.tmTheme` is copied in beside it and the two install together. Both derive two
values the contract does not name — a dimmer text tier and a legible foreground
for filled backgrounds — at the adapter rather than widening the closed `text`
family for one host.

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
