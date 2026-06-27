# Hue Theme architecture

## Token layers

1. **Primitive** tokens hold authored color values and cultural metadata.
2. **Semantic** tokens describe stable roles such as `surface.canvas`,
   `text.primary`, and `syntax.keyword`.
3. **Adapters** map stable roles to host-specific APIs. An adapter must not
   change primitive or semantic source data.

The semantic contract is versioned. Removing or changing the meaning of a role
requires a major version.

## Planned adapter capabilities

| Host            | Mapping target                            | Typography policy                     |
| --------------- | ----------------------------------------- | ------------------------------------- |
| LazyVim/Neovim  | highlight groups and terminal ANSI colors | Never set the user's font             |
| Yaak            | experimental TypeScript plugin theme API  | Export only supported properties      |
| Inkdrop UI      | CSS custom properties                     | Respect user font settings by default |
| Inkdrop Syntax  | CodeMirror selectors and variables        | Never set `font-family`               |
| Inkdrop Preview | Markdown document CSS variables           | May use the prose stack               |

Adapters accept a resolved theme plus a capability manifest. Unsupported token
families are omitted explicitly rather than approximated.

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
