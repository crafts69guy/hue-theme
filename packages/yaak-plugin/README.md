<div align="center">

<img src="https://raw.githubusercontent.com/crafts69guy/hue-theme/main/design/hue-mark.svg" width="64" alt="Hue Theme logo" />

# Hue for Yaak

Three Huế-inspired themes for the [Yaak](https://yaak.app) API client.

[Install](#install) · [Themes](#themes) · [Development](#development) · [Hue Theme](https://github.com/crafts69guy/hue-theme)

</div>

| Huế Mưa | Huế Hương | Huế Cung |
| --- | --- | --- |
| ![Huế Mưa dark theme in Yaak](./assets/yaak-mua.png) | ![Huế Hương dark theme in Yaak](./assets/yaak-huong.png) | ![Huế Cung light theme in Yaak](./assets/yaak-cung.png) |

## Install

1. Open **Settings → Plugins**, search for `hue-theme`, and install it.
2. Open **Settings → Theme** and select **Huế Mưa**, **Huế Hương**, or **Huế Cung**.

Updates are delivered through Yaak's plugin registry.

## Themes

| Mood | Theme ID | Appearance | Feel |
| --- | --- | --- | --- |
| **Huế Mưa** | `mua` | dark | midnight navy, rain-blue chrome, vivid signals |
| **Huế Hương** | `huong` | dark | river green, dusk blue, incense gold |
| **Huế Cung** | `cung` | light | pale blue wash, white panels, deep blue accents |

Each mood covers Yaak's surfaces, text, borders, selections, actions, and status
colors. Fonts, request data, and workspace behavior remain untouched.

## Development

Build or watch the standalone plugin:

```fish
bun install
bun run build
bun run dev
```

Sideload the directory from **Settings → Plugins** while developing. In the
[Hue Theme monorepo](https://github.com/crafts69guy/hue-theme), regenerate the
theme source before building the plugin:

```fish
bun run --cwd packages/tokens build
bun run --cwd packages/yaak-plugin build
```

`src/index.ts` is generated. Change the source tokens or Yaak adapter instead.
The adapter exports Yaak's supported base UI tokens; Yaak does not expose syntax
highlighting slots.

## Hue ecosystem

The same token contract also powers:

- [Neovim / LazyVim](https://github.com/crafts69guy/hue-nvim)
- [tmux](https://github.com/crafts69guy/hue-tmux)
- [Inkdrop](https://my.inkdrop.app/plugins/hue-mua-theme)
- Ghostty, bat, lazygit, delta, Fish/Tide, herdr, and tuicr in the
  [main repository](https://github.com/crafts69guy/hue-theme)

## License

[MIT](./LICENSE)
