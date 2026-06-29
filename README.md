# Hue Theme

Hue Theme is a portable theme design system rooted in the atmosphere and
visual culture of Huế, Việt Nam. It uses a three-layer architecture:
primitive tokens, semantic roles, and platform adapters.

It centers on a versioned token contract and an interactive gallery, with host
adapters generated from three moods:

- **Huế Mưa** — deep charcoal, rain silver, and muted jade.
- **Huế Hương** — river green, dusk blue, and incense gold.
- **Huế Cung** — ivory paper, imperial lacquer, and restrained purple.

## Development

```fish
bun install
bun run dev
```

Quality gates:

```fish
bun run format
bun run lint
bun run quality
bun run check
bun test
bun run build
```

Biome is the single formatter and linter for TypeScript, React, JavaScript,
JSON, CSS, and HTML. CI can run the complete non-mutating gate with:

```fish
bun run ci
```

The source tokens follow the
[Design Tokens Community Group format](https://www.designtokens.org/tr/2025.10/format/).
Generated artifacts must not be edited by hand.

## Project status

The semantic contract, the interactive gallery, and host adapters for Yaak
(`packages/yaak-plugin`), Neovim/LazyVim (`packages/nvim-plugin`), Ghostty
(`packages/terminal-themes`), and tmux (`packages/tmux-plugin`, a TPM plugin)
are implemented. The Neovim, tmux, and Ghostty themes are published for
consumption (the first two as standalone repos, Ghostty as a theme file). The
Inkdrop adapters are documented as future mappings and are not packages yet.

## Bundled font

The gallery bundles
[PlemolJP Console NF v3.0.0](https://github.com/yuru7/PlemolJP/releases/tag/v3.0.0)
in Light (300), Regular (400), Medium (500), SemiBold (600), and Bold (700).
PlemolJP is distributed under the SIL Open Font License 1.1; its copyright and
full license are included beside the fonts in
`apps/gallery/public/fonts/PlemolJP-LICENSE.txt`.

## License

MIT
