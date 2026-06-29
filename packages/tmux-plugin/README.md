# 🌧 Hue for tmux

> Huế-inspired themes for tmux, packaged as a TPM plugin — generated from the
> [Hue design token system](https://github.com/crafts69guy/hue-theme).

<p align="center">
  <img src="https://raw.githubusercontent.com/crafts69guy/hue-theme/main/design/Home.png" alt="Huế Mưa tmux status bar (with Neovim)" width="860" />
</p>

Three moods drawn from the atmosphere and visual culture of Huế, Việt Nam:

| Mood | `@hue_flavour` | Appearance | Feel |
| --- | --- | --- | --- |
| **Huế Mưa** | `mua` | dark | deep dark, rain and wet stone |
| **Huế Hương** | `huong` | dark | softer dark, river green and incense |
| **Huế Cung** | `cung` | light | ivory light, lacquer and royal purple |

Each mood styles the status bar (powerline), window list, pane borders,
messages, copy mode, and clock. It never sets your font.

## Requirements

- tmux ≥ 3.0 with a true-color terminal (`set -g default-terminal "tmux-256color"`
  plus a `*:Tc` override)
- [TPM](https://github.com/tmux-plugins/tpm) (recommended)

## Installation

With [TPM](https://github.com/tmux-plugins/tpm), in `~/.config/tmux/tmux.conf`:

```tmux
set -g @plugin 'crafts69guy/hue-tmux'
set -g @hue_flavour 'mua'   # or 'huong' / 'cung'
```

Then press `prefix + I` to install. Update later with `prefix + U`.

Set `@hue_flavour` **before** TPM runs so the entrypoint sources the right mood.

### Without TPM

Clone the repo and run the entrypoint:

```tmux
run-shell "/path/to/hue-tmux/hue.tmux"
```

…or source a mood file directly:

```tmux
source-file "/path/to/hue-tmux/themes/hue-mua.conf"
```

## Configuration

| Option | Default | Description |
| --- | --- | --- |
| `@hue_flavour` | `mua` | Mood to load: `mua`, `huong`, or `cung`. |

## Credits

Generated from the
[Hue design token system](https://github.com/crafts69guy/hue-theme) — `hue.tmux`
and `themes/` are build output, not hand-edited. Rooted in the visual culture of
Huế, Việt Nam.

## License

[MIT](./LICENSE)
