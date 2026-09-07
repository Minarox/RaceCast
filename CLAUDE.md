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
done. `pnpm build` then `pnpm start` runs the real server locally; deployment is
`docker compose up -d --build` on the operator's own host.

There is no test suite and no lint script configured. CI (`.github/workflows/build.yml`) runs
`pnpm check` and `pnpm build` on every PR; `.github/workflows/secret.yml` runs TruffleHog scanning.

## Architecture

**Stack**: Astro 6 with Vue 3 islands (`@astrojs/vue`), built as a standalone Node server via
`@astrojs/node` and self-hosted behind the operator's own reverse proxy. Editable content lives in
SQLite (`node:sqlite`, no server and no native module). Every page sets
`export const prerender = false` — they read that content per request.

The Node adapter major must track Astro's: `@astrojs/node@10.x` peers on Astro 6, `11.x` already
requires Astro 7. Installing the newest one against Astro 6 builds fine and then dies at startup
with `app.getLogger is not a function`.

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

### FSR upscaling

`src/assets/fsr.ts` is a two-pass WebGL2 pipeline (EASU upsample + RCAS contrast-adaptive sharpen)
modelled on AMD FidelityFX Super Resolution 1.0. It is **off by default** and switched on per viewer
in the settings sheet (`settings.fsr.enabled`).

It changes which element plays the media, which is the one thing to keep straight in
`VideoPlayer.vue`:

- Off: the WebRTC track or the HLS source is attached to the visible `<video>`.
- On: a hidden `<video>` receives it instead, WebGL renders into a detached canvas, and
  `canvas.captureStream(30)` feeds the visible element — so native fullscreen, controls and mobile
  playback keep working on the element the viewer sees.

`media()` returns whichever element is really playing. **Everything that touches the stream —
attaching, detaching, seeking — must go through it**, never through the `display` ref directly, or
rewind seeking will silently act on the wrong element once FSR is on.

Only the hero passes `enhance`; a WebGL2 context per thumbnail would cost more than it could show.
Any initialisation failure (no WebGL2, a driver refusing the shaders) rolls back to direct playback
rather than leaving a black surface. The module is dynamically imported, so viewers who leave it off
never download it.

RCAS reads sharpness as `0` = strongest … `2` = weakest. The stored value keeps that scale; only the
settings slider is flipped so "further right" means sharper. Don't "fix" the inversion in one place
without the other.

### Telemetry, and the channels that don't exist yet

Room metadata carries `modem` (GPS + cellular) and `ups` (battery) — those are live. The design also
calls for engine channels (`ecu`: rpm, gear, throttle, brake, water, oil) and Jetson health
(`system`: cpu, temp) and labels them *"canaux à confirmer"*. **The emitter does not send them.**

They are typed as fully optional in `src/types.ts` and rendered as `—` placeholders rather than
hidden, so the panels keep their designed shape and light up the day those channels ship. Nothing
fabricates a value. Do not "fix" the placeholders by inventing data.

### Icons

`astro-icon` was removed deliberately: it pulls a CommonJS dependency into the SSR graph that broke
on-demand rendering (`module is not defined`), and every page here is on-demand rendered. Icons are
inline SVG instead, from a generated path set:

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

## Editable content

Everything the pipeline cannot report about itself — the "rallye en cours" banner and the rally
history — lives in SQLite and is edited from `/admin`. `src/lib/db.ts` owns the schema (created on
first connection, no migration tool) and every query; pages call it directly rather than going
through an action, since they are already rendering on the server.

Synchronous by design: the database is a local file, each query touches a few dozen rows, and
SQLite's own locking is all a single-instance server needs. WAL is on so a viewer loading
`/replays` never blocks on the admin saving a stage time — which is exactly when both happen.

`node:sqlite` prints an ExperimentalWarning on import; the container silences it with
`NODE_OPTIONS=--no-warnings=ExperimentalWarning` rather than taking on a third-party driver for a
few writes a day.

### /admin

One shared password (`ADMIN_PASSWORD`) and a signed cookie — right-sized for a single operator
editing times from the side of a stage, on a site whose content is public anyway. An unset password
leaves the page unreachable rather than open, and changing it invalidates open sessions, since the
cookie's HMAC is keyed on the password itself.

The page is **plain HTML forms posting to Astro Actions, with no client JavaScript**. That is
deliberate: trackside the connection drops constantly, and a normal POST the browser can retry beats
an in-page fetch that loses its payload. Each action re-checks the session itself — a hidden form is
not access control — and the page does post/redirect/get so a reload never re-submits a save.

Two things to know before touching the action schemas:

- A form field left blank arrives as **`null`**, not `""` or `undefined`. `optionalText` accepts all
  three; a plain `.optional()` rejects every empty input with "expected string".
- Astro 6 names the form parameter `?_action=`, not `?_astroAction=`.

Add new server-only logic as Actions in `src/actions/index.ts`.

## Environment

Declared in `astro.config.mjs` under `env.schema` and read through `astro:env`, not `import.meta.env`
— server secrets are then looked up in `process.env` at runtime, so the image is built once without
credentials and takes them from the environment at start.

`PUBLIC_REWIND_URL` is the exception: it is read in the browser, so it is inlined at build time and
must be present when `astro build` runs (a Docker build arg). Empty ships the site with the rewind
controls visibly disabled rather than present but broken.
