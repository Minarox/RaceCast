# RaceCast-Front

Web front end for [RaceCast](https://github.com/Minarox) — the live video, audio and telemetry
feed from a rally car. Self-hosted: it is a plain Node server behind your own reverse proxy, with a
SQLite file for the editable content.

It is a pure client of two upstream services for everything live:

- **LiveKit** (WebRTC SFU) for the low-latency tracks and the car's telemetry, delivered as room
  metadata. The site joins as a subscribe-only participant.
- **RaceCast-Receiver's rewind HTTP API** for seeking back into the last few hours of the stream,
  served as standard HLS (fMP4/CMAF).

Neither exposes a way to change anything on the car, so neither does this site.

## Stack

Astro 6 (on-demand rendered, `@astrojs/node` standalone) with Vue 3 islands for the parts that need
live state. Content lives in SQLite through Node's built-in `node:sqlite` — no database server, no
native module to compile.

```sh
pnpm install
pnpm dev        # local dev server
pnpm check      # astro check — run before considering a task done
pnpm build      # production build into ./dist
pnpm start      # run the built server
pnpm icons      # regenerate src/assets/icons.ts from @iconify-json/ph
```

## Configuration

Copy `.env.example` to `.env`. LiveKit credentials, `ADMIN_PASSWORD` and `DATABASE_PATH` are read at
**runtime**, so they belong in the environment (or the compose file) and never in the image.

`PUBLIC_REWIND_URL` is the exception: it is read in the browser and inlined at **build** time, so it
must be set when `astro build` runs — a build arg in Docker. The receiver must also allow this
site's exact origin in its own `RC_REWIND_HTTP_CORS_ORIGIN`. Leaving it empty ships the site with
the rewind controls visibly disabled rather than present but broken.

## Deployment

```sh
cp .env.example .env      # fill it in
docker compose up -d --build
```

The container listens on `127.0.0.1:4321` and expects your existing reverse proxy to terminate TLS
in front of it. The database lives on the `racecast-data` volume at `/data/racecast.db`; back that
up and you have backed up everything editable.

Rebuild (not just restart) after changing `PUBLIC_REWIND_URL`, since it is baked into the client
bundle.

## Pages

| Route | Contents |
| --- | --- |
| `/` | Live: hero camera, camera switching, speed, map, telemetry sidebar, rewind scrubber |
| `/telemetrie` | Full telemetry — speed history, GPS, connectivity, battery |
| `/replays` | Rally history, rendered from the database |
| `/admin` | Password-protected editor for the stage banner and the rally history |

## Editing content

`/admin` is unlocked by `ADMIN_PASSWORD` (unset leaves the page unreachable, not open) and holds a
signed session cookie for 12 hours. It is plain HTML forms with no client JavaScript, so it stays
usable on a phone at the side of a stage where the connection keeps dropping.

From there you can set the "rallye en cours" banner shown in the header, create and edit rallies,
and add stage times as they come in — everything appears on `/replays` immediately.

## Licence

AGPL-3.0-only.
