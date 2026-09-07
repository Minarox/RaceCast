# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

RaceCast-Front is the web front end for a live rally-car stream: video, audio and telemetry from a
Jetson in the car, relayed by RaceCast-Receiver. It is a **pure client** of two upstream services
and owns no state beyond the viewer's own preferences:

- **LiveKit** (WebRTC SFU) — the live camera/microphone tracks and, via room metadata, the car's
  telemetry. The site joins subscribe-only (`canPublish: false`).
- **RaceCast-Receiver's rewind HTTP API** — standard HLS (fMP4/CMAF) over the last few hours, for
  seeking back into the live stream.

Neither upstream exposes anything that changes the car's behaviour, so **the UI must not grow
controls that pretend otherwise** (no "force reconnect", no bitrate or resolution picker). Anything
this site can change is local to the browser.

## Commands

Package manager and scripts are in `package.json` (pnpm). Run `pnpm check` before considering a task
done; never run `pnpm deploy` without asking — it publishes to Cloudflare.

There is no test suite and no lint script configured. CI (`.github/workflows/build.yml`) runs
`pnpm check` and `pnpm build` on every PR; `.github/workflows/secret.yml` runs TruffleHog scanning.

## Architecture

**Stack**: Astro 6 with Vue 3 islands (`@astrojs/vue`), deployed to a Cloudflare Worker via
`@astrojs/cloudflare` (static assets binding `ASSETS`, KV binding `STORE`). All three pages set
`export const prerender = false` — they read editorial content from KV per request.

**Path aliases** (`tsconfig.json`): `@assets/*`, `@components/*`, `@layouts/*`, `@lib/*`, `@pages/*`,
`@styles/*`, `@types` → `src/types.ts`.

### The event bus

`src/components/LiveKit.astro` is mounted once by `Layout.astro` (so on every page) and owns the
*single* LiveKit `Room`. It renders nothing and talks to the rest of the app exclusively through
`document`-level `CustomEvent`s — this is the backbone of the whole front end:

- `src/types.ts` defines the `Event` enum (names), `State` (connection states) and
  `dispatchEvent(event, data)`.
- Consumers add a `document.addEventListener` in `onMounted` and remove it in `onBeforeUnmount`.
- Islands hydrate late and routinely miss the first emission, so **every consumer asks for the
  current value on mount** with `dispatchEvent(Event.RESEND, Event.WHATEVER)`; `LiveKit.astro`
  re-emits from its cache. Follow this mount → resend → re-emit pattern for anything new.

`RewindBar.vue` is the second writer on the bus: it owns the playback position and broadcasts
`Event.PLAYBACK`. It is the *only* writer of that state, which is what keeps the hero player and the
thumbnail players agreeing without talking to each other.

### Playback: live vs. rewind

`VideoPlayer.vue` drives one `<video>` from either source and always tears the previous one fully
down before building the next — leaving a LiveKit track attached while hls.js writes to the same
element leaks a subscription and stalls playback.

- Live: the `RemoteTrackPublication` is attached directly (WebRTC).
- Rewind: the element is re-pointed at `{PUBLIC_REWIND_URL}/rewind/{key}/current/playlist.m3u8`.
  Safari/iOS play it natively; everyone else gets `hls.js`, **dynamically imported** so viewers who
  never rewind never download it (it is the largest chunk in the build by far).

The stream key is derived from the LiveKit track name: `"Route"` → `"Route:camera"`, matching
RaceCast-Receiver's SRT streamid convention.

Position is tracked as **seconds behind the live edge**, never as an absolute timestamp — the HLS
window slides continuously, so an absolute position would silently fall off the back of the buffer
while the viewer sits on it.

Audio always plays from the live WebRTC track, including while the video is rewound; the receiver
carries audio as separate per-microphone HLS streams and re-syncing them is out of scope.

### Telemetry, and the channels that don't exist yet

Room metadata carries `modem` (GPS + cellular) and `ups` (battery) — those are live. The design also
calls for engine channels (`ecu`: rpm, gear, throttle, brake, water, oil) and Jetson health
(`system`: cpu, temp) and labels them *"canaux à confirmer"*. **The emitter does not send them.**

They are typed as fully optional in `src/types.ts` and rendered as `—` placeholders rather than
hidden, so the panels keep their designed shape and light up the day those channels ship. Nothing
fabricates a value. Do not "fix" the placeholders by inventing data.

### Icons

`astro-icon` was removed deliberately: it pulls a CommonJS dependency into the SSR graph, which the
Cloudflare Workers runtime cannot load (`module is not defined`) on any on-demand-rendered page —
and every page here is one. Icons are inline SVG instead, from a generated path set:

- `scripts/icons.mjs` (`pnpm icons`) extracts the needed Phosphor paths from `@iconify-json/ph`
  (a devDependency) into `src/assets/icons.ts`.
- `Icon.astro` renders them server-side, `Icon.vue` inside islands. Both size via `width`/`height`,
  not `font-size` — a leftover `font-size` on an icon does nothing.

To add an icon, extend the `wanted` list in `scripts/icons.mjs` and re-run `pnpm icons`.

### Bundle shape

`OpenLayers` (the map) and `hls.js` (rewind) dwarf everything else, so both are loaded lazily —
`MiniMap.vue` via `defineAsyncComponent`, hls.js via `import()`. Keep it that way: importing either
statically pulls ~300 KB into the live page's critical path.

### Styling

All colours, radii and type live as custom properties in `src/styles/theme.css`; components must not
hardcode hex values. `.lab` (small uppercase monospace label) and `.num` (tabular figures) are global
because nearly every component needs them.

Desktop and phone layouts differ **structurally**, not just in spacing (desktop puts the other
cameras and the map in a strip under the hero; phone stacks numbers and a full-width map and switches
cameras by swiping). Both markups ship and CSS picks one — except the speed readout, which is chosen
in JS so screen readers don't announce it twice.

## Configuration

LiveKit settings are server-side (`.env` locally, Worker vars/secrets in production, read through
`cloudflare:workers` `env` — not `import.meta.env`).

`PUBLIC_REWIND_URL` is different: it is read in the **browser**, so Astro inlines it at build time.
It must be set in the environment that runs `pnpm build`, and the receiver must list this site's
exact origin in its `RC_REWIND_HTTP_CORS_ORIGIN`. Empty ships the site with the rewind controls
visibly disabled rather than present but broken.

## Editorial content (KV)

Two keys in the `STORE` namespace, both read through Astro Actions in `src/actions/index.ts` and both
degrading to empty rather than erroring:

- `STAGE` — free text in the header, e.g. `ES 4 — Col de Turini`.
- `REPLAYS` — JSON array of seasons (`Season` / `Rally` in `src/types.ts`). A rally with a
  `thumbnail` renders as the featured card; one without renders compact. The "Télémétrie" button
  only appears when a rally supplies a `telemetry` URL — there is no permanent telemetry archive in
  the pipeline, so it cannot be derived.

Add new server-only logic as Actions here rather than as API routes.
