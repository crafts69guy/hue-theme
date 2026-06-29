# Hue Yaak Theme

Three Huế-inspired moods for the [Yaak](https://yaak.app) API client, generated
from the Hue design token system:

- **Hue · Mưa** — a deep dark mood shaped by Huế rain and wet stone.
- **Hue · Hương** — a softer dark mood drawn from the Perfume River and incense.
- **Hue · Cung** — an ivory light mood informed by imperial lacquer and royal purple.

## How it is built

`src/index.ts` is **generated** by the token build — do not edit it by hand.
The Hue → Yaak mapping lives in
[`packages/tokens/src/adapters/yaak.ts`](../tokens/src/adapters/yaak.ts), and the
build writes the plugin entrypoint here.

```bash
# Regenerate src/index.ts from the source tokens
cd ../tokens && bun run build

# Build the Yaak plugin bundle
cd ../yaak-plugin && bun install && bun run build
```

Only Yaak's supported `base` UI tokens are exported. Hue's `syntax.*` roles are
omitted on purpose — Yaak's theme API has no syntax-highlighting slots.

## Install locally

After `bun run build`, sideload the plugin from this directory via Yaak's
Settings → Plugins, or run the Yaak CLI in dev mode against this folder.
