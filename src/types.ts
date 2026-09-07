import DefaultSettings from "@assets/settings.json"

/**
 * User preferences, shaped by settings.json. `volumes` is widened by hand:
 * the JSON literal is empty, so TypeScript would otherwise infer `{}` and
 * refuse every lookup into it.
 */
export type Settings = Omit<typeof DefaultSettings, "volumes"> & {
    volumes: Record<string, number>
}

export const defaultSettings: Settings = DefaultSettings as Settings

/* ------------------------------------------------------------------ *
 * LiveKit token (minted server-side by the getLiveKitToken action)
 * ------------------------------------------------------------------ */

export interface Token {
    domain: string
    room: string
    identity: string
    token: string
    validity: string
    publisherIdentity: string
    timestamp: number
}

/* ------------------------------------------------------------------ *
 * Car telemetry, as delivered through LiveKit room metadata
 *
 * RaceCast-Receiver merges the emitter's "ups" and "modem" envelopes into
 * one JSON object and pushes it as room metadata (throttled to ~1/s). Only
 * `modem` and `ups` are actually produced today.
 *
 * `ecu` and `system` are declared but never populated by the current
 * emitter — the design calls for engine and Jetson-health channels and
 * labels them "canaux à confirmer". They are typed as fully optional so the
 * UI can render them the moment the emitter starts sending them, and shows
 * placeholders until then. Nothing here fabricates a value.
 * ------------------------------------------------------------------ */

export interface Modem {
    alt: number | null
    hdop: number | null
    lat: number | null
    lon: number | null
    sat: number | null
    signal: number | null
    spd: number | null
    tech: string | null
}

export const defaultModem: Modem = {
    alt: null,
    hdop: null,
    lat: null,
    lon: null,
    sat: null,
    signal: null,
    spd: null,
    tech: null
}

export interface UPS {
    /** Current draw (A) */
    a: number | null
    /** Charge percentage */
    p: number | null
    /** Voltage (V) */
    v: number | null
    /** Power draw (W) */
    w: number | null
}

export const defaultUPS: UPS = {
    a: null,
    p: null,
    v: null,
    w: null
}

/** Engine channels — not emitted yet ("canaux à confirmer" in the design). */
export interface ECU {
    rpm?: number | null
    gear?: number | null
    gears?: number | null
    throttle?: number | null
    brake?: number | null
    water?: number | null
    oil?: number | null
    volt?: number | null
}

/** Jetson health channels — not emitted yet. */
export interface System {
    cpu?: number | null
    watt?: number | null
    temp?: number | null
    ambient?: number | null
}

export interface Metadata {
    modem: Modem
    ups: UPS
    ecu?: ECU
    system?: System
    timestamp: number | null
}

export const defaultMetadata: Metadata = {
    modem: defaultModem,
    ups: defaultUPS,
    timestamp: null
}

/* ------------------------------------------------------------------ *
 * Rewind (HLS) — see src/lib/rewind.ts for the client
 * ------------------------------------------------------------------ */

/** One entry of `GET /rewind/streams` on RaceCast-Receiver. */
export interface RewindStream {
    key: string
    name: string
    mediaType: "video" | "audio"
    connected: boolean
}

export enum Playback {
    LIVE = "live",
    REWIND = "rewind"
}

/** Payload of Event.PLAYBACK — what the video surface should be showing. */
export interface PlaybackState {
    mode: Playback
    /** Seconds behind the live edge; 0 while mode is LIVE. */
    behind: number
}

export const defaultPlayback: PlaybackState = {
    mode: Playback.LIVE,
    behind: 0
}

/* ------------------------------------------------------------------ *
 * Replays — post-race recaps, stored as JSON in the STORE KV namespace
 * under the REPLAYS key and read by the getReplays action.
 * ------------------------------------------------------------------ */

export interface Stage {
    name: string
    time?: string | null
}

export interface Rally {
    name: string
    date: string
    stages?: Stage[]
    /** Full replay URL (YouTube). Absent = "pas de replay". */
    replay?: string | null
    /** Thumbnail URL for the featured card. */
    thumbnail?: string | null
    /** Human-readable duration shown on the thumbnail, e.g. "1:24:06". */
    duration?: string | null
    /** Free-text summary shown on compact cards, e.g. "2 ES · abandon ES2". */
    summary?: string | null
    /**
     * Optional link to a telemetry recap for this rally. There is no permanent
     * telemetry archive in the pipeline (the receiver's window is hours, not
     * seasons), so the button only appears when this is filled in by hand.
     */
    telemetry?: string | null
}

export interface Season {
    year: string
    label?: string | null
    rallies: Rally[]
}

/* ------------------------------------------------------------------ *
 * Event bus
 *
 * Components never receive live data through props: LiveKit.astro owns the
 * single Room connection and broadcasts everything as `document`-level
 * CustomEvents. Islands that mount after an event was emitted ask for it
 * again with Event.RESEND (see LiveKit.astro).
 * ------------------------------------------------------------------ */

export enum Event {
    /** Our own connection to the LiveKit SFU. Detail: State */
    LOCAL_STATUS = "local-status",
    /** The car's connection to the SFU. Detail: State */
    REMOTE_STATUS = "remote-status",
    /** Detail: number */
    VIEWERS = "viewers",
    /** Detail: RemoteTrackPublication[] */
    CAMERAS = "cameras",
    /** Detail: RemoteTrackPublication[] */
    MICROPHONES = "microphones",
    /** Detail: Metadata */
    METADATA = "metadata",
    /** Ask LiveKit.astro to (re)connect */
    CONNECT = "connect",
    /** Ask LiveKit.astro to re-emit one event. Detail: Event */
    RESEND = "resend",

    /** Browser blocked audio autoplay until a user gesture */
    NEED_USER_INTERACTION = "need-user-interaction",
    RESUME_AUDIO = "resume-audio",

    /** Detail: Settings */
    SETTINGS = "settings",
    /** Toggle the settings sheet */
    SHOW_SETTINGS = "show-settings",
    /** Toggle the audio sources sheet */
    SHOW_AUDIO = "show-audio",

    /** Detail: RewindStream[] */
    REWIND_STREAMS = "rewind-streams",
    /** Detail: PlaybackState — emitted by RewindBar, consumed by the players */
    PLAYBACK = "playback",
    /** Detail: number (seconds behind live) — a scrub request from the UI */
    SEEK = "seek"
}

export enum State {
    CONNECTING = "connecting",
    CONNECTED = "connected",
    RECONNECTING = "reconnecting",
    DISCONNECTED = "disconnected"
}

export function getStateString(state: State): string {
    switch (state) {
        case State.CONNECTING:
            return "Connexion..."
        case State.CONNECTED:
            return "Connecté"
        case State.RECONNECTING:
            return "Reconnexion..."
        case State.DISCONNECTED:
            return "Déconnecté"
        default:
            return "Inconnu"
    }
}

export function dispatchEvent(event: Event, data?: unknown): void {
    document.dispatchEvent(new CustomEvent(event, { detail: data }))
}

/**
 * Reads the user's saved preferences, merged over the defaults so a settings
 * object saved by an older version of the site never leaves a key undefined.
 */
export function getSettings(): Settings {
    try {
        const saved = window.localStorage.getItem("settings")
        if (!saved) return structuredClone(defaultSettings)
        return { ...structuredClone(defaultSettings), ...JSON.parse(saved) }
    } catch {
        return structuredClone(defaultSettings)
    }
}

export function saveSettings(settings: Settings): void {
    try {
        window.localStorage.setItem("settings", JSON.stringify(settings))
    } catch {
        /* private mode / storage disabled — preferences just don't persist */
    }
    dispatchEvent(Event.SETTINGS, settings)
}
