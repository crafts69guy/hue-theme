# <img src="https://raw.githubusercontent.com/crafts69guy/hue-theme/main/design/hue-mark.svg" height="28" alt="" valign="middle" /> Hue for Yaak

> Huế-inspired themes for the [Yaak](https://yaak.app) API client — generated
> from the [Hue design token system](https://github.com/crafts69guy/hue-theme).

<p align="center">
  <img src="./assets/yaak-home.png" alt="Huế Hương theme in Yaak with a JSON API response" width="860" />
</p>

Three moods drawn from the atmosphere and visual culture of Huế, Việt Nam:

| Mood | Theme ID | Appearance | Feel |
| --- | --- | --- | --- |
| **Huế Mưa** | `mua` | dark | midnight navy, rain-blue chrome, vivid signals |
| **Huế Hương** | `huong` | dark | river green, dusk blue, incense gold |
| **Huế Cung** | `cung` | light | pale blue wash, white panels, deep blue accents |

Each mood styles Yaak's base UI palette: surfaces, text, borders, selection,
primary actions, and status colors. It does not change fonts, request data, or
workspace behavior.

## Installation

Open **Settings → Plugins** in Yaak, search the registry for `hue-theme`, and
install it. Yaak tracks the registry version from then on, so updates arrive on
its own schedule.

This repository holds the plugin source; it is not the install path.

Then choose **Huế Mưa**, **Huế Hương**, or **Huế Cung** from Yaak's theme
selector.

### Local development

Clone the repository and build the plugin bundle:

```fish
bun install
bun run build
```

Sideload the plugin directory from Yaak's **Settings -> Plugins** screen. For
live development, run:

```fish
bun run dev
```

`yaakcli` watches the plugin and Yaak reloads it as the bundle changes.

## Development

This repository is the Yaak subtree package from
[`crafts69guy/hue-theme`](https://github.com/crafts69guy/hue-theme). The source
theme data lives in the token package, and this plugin is generated from that
contract.

In the monorepo:

```fish
# Regenerate src/index.ts from source tokens
bun run --cwd packages/tokens build

# Build the Yaak plugin bundle
bun run --cwd packages/yaak-plugin build
```

`src/index.ts` is build output. Do not edit it by hand; change the Hue tokens or
the Yaak adapter instead. Only Yaak's supported `base` UI tokens are exported.
Hue's `syntax.*` roles are omitted because Yaak's theme API has no
syntax-highlighting slots.

## Also for

The same three moods, from the same token contract:

- [Neovim / LazyVim](https://github.com/crafts69guy/hue-nvim)
- [tmux](https://github.com/crafts69guy/hue-tmux)
- **Yaak** — this one
- [Inkdrop](https://my.inkdrop.app/plugins/hue-mua-theme)
- Ghostty, bat, lazygit, Fish/Tide — in the [main repo](https://github.com/crafts69guy/hue-theme)

## Credits

Generated from the
[Hue design token system](https://github.com/crafts69guy/hue-theme) — rooted in
the visual culture of Huế, Việt Nam.

## License

[MIT](./LICENSE)
