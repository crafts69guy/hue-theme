# Hue for ChatGPT/Codex

Generated theme share strings for the ChatGPT/Codex desktop app, one per Hue
mood. These use the app's **Settings → Appearance → Import** flow; they do not
patch the installed application.

## Install

From the repository root, copy a mood's complete share string:

```fish
pbcopy < packages/codex-themes/hue-mua.txt
```

Open **Settings → Appearance**, choose the matching Light or Dark theme card,
select **Import**, and paste. Use the Dark card for Mưa and Hương, and the Light
card for Cung.

The app stores one custom configuration per light/dark variant. Importing Hương
after Mưa therefore replaces the dark slot rather than adding a second named
preset.

## Capabilities

Hue maps the app surface, foreground, accent, diff-added, diff-removed, and
skill colors from the shared semantic token contract. The app derives borders
and secondary chrome colors from its contrast setting.

The share format accepts a built-in code-theme id rather than a custom syntax
palette, so all three moods deliberately use the built-in `codex` code theme.
Fonts remain at the system default and translucent windows remain enabled.

## Development

These `.txt` files are generated. Change
[`packages/tokens/src/adapters/codex.ts`](../tokens/src/adapters/codex.ts) or the
source tokens, then rebuild:

```fish
bun run --cwd packages/tokens build
```

The `codex-theme-v1` format is a versioned app share format, not a published
developer API. Keep its prefix and payload schema isolated in the adapter so an
upstream format change fails tests instead of spreading through the token
system.
