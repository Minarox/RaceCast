# RaceCast-Front

Web front end for [RaceCast](https://github.com/Minarox) — the live video, audio and telemetry
feed from a rally car. It is a pure client of two upstream services and holds no state of its own:

- **LiveKit** (WebRTC SFU) for the low-latency live tracks and the car's telemetry, delivered as
  room metadata. The site joins as a subscribe-only participant.
- **RaceCast-Receiver's rewind HTTP API** for seeking back into the last few hours of the stream,
  served as standard HLS (fMP4/CMAF).

Neither service exposes a way to change anything on the car, so neither does this site.

## Stack

Astro 6 (on-demand rendered on Cloudflare Workers via `@astrojs/cloudflare`) with Vue 3 islands for
the parts that need live state. Deployed as a Worker; static assets and the `STORE` KV namespace are
bound in `wrangler.jsonc`.

```sh
pnpm install
pnpm dev        # local dev server
pnpm check      # astro check — run before considering a task done
pnpm build      # production build into ./dist
pnpm preview    # build, then run the Worker locally with wrangler
pnpm deploy     # build and publish to Cloudflare (ask first)
pnpm icons      # regenerate src/assets/icons.ts from @iconify-json/ph
```

## Configuration

Copy `.env.example` to `.env`. LiveKit credentials are read server-side (Worker vars and secrets in
production); `PUBLIC_REWIND_URL` is read in the browser and therefore inlined at **build** time, so
it has to be present in the environment that runs `pnpm build`, not only in the Worker.

The receiver's rewind API must allow this site's exact origin in its own
`RC_REWIND_HTTP_CORS_ORIGIN`. Leaving `PUBLIC_REWIND_URL` empty ships the site without the rewind
controls rather than with controls that fail.

## Pages

| Route | Contents |
| --- | --- |
| `/` | Live: hero camera, camera switching, speed, map, telemetry sidebar, rewind scrubber |
| `/telemetrie` | Full telemetry — speed history, GPS, connectivity, battery |
| `/replays` | Post-race replays, edited in KV under the `REPLAYS` key |

## Editing content

Two KV keys in the `STORE` namespace drive the editorial content:

- `STAGE` — free text shown in the header, e.g. `ES 4 — Col de Turini`. Empty hides it.
- `REPLAYS` — a JSON array of seasons; see the `Season` / `Rally` types in `src/types.ts`.

## Licence

AGPL-3.0-only.
