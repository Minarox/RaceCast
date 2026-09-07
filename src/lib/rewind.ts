/**
 * Client for RaceCast-Receiver's embedded rewind HTTP API.
 *
 * The receiver serves ffmpeg's own HLS output (fMP4/CMAF) directly, so there
 * is no custom manifest format to parse here — this module only builds the
 * URLs and reads the two JSON/JSONL endpoints. Everything runs in the
 * browser against a different origin than the site itself, which is why the
 * receiver sets `Access-Control-Allow-Origin` to exactly this site's origin
 * (`RC_REWIND_HTTP_CORS_ORIGIN`); a mismatch there surfaces here as an
 * opaque network failure, not an HTTP error.
 *
 * The API is read-only by design: the receiver exposes nothing that changes
 * the car's state, so neither does this client.
 */

import { PUBLIC_REWIND_URL } from "astro:env/client"
import type { RewindStream } from "@types"

/** Base URL of the receiver's rewind API, e.g. https://rewind.example.com */
export const REWIND_URL: string = (PUBLIC_REWIND_URL ?? "").replace(/\/+$/, "")

export const rewindEnabled: boolean = REWIND_URL.length > 0

/** `GET /rewind/streams` — the known streams and whether each is connected. */
export async function fetchStreams(signal?: AbortSignal): Promise<RewindStream[]> {
    if (!rewindEnabled) return []

    const response = await fetch(`${REWIND_URL}/rewind/streams`, { signal: signal ?? null })
    if (!response.ok) throw new Error(`rewind/streams: HTTP ${response.status}`)

    const body: unknown = await response.json()
    return Array.isArray(body) ? (body as RewindStream[]) : []
}

/**
 * HLS playlist for a stream's current connection. `current` resolves
 * server-side to whichever connection directory was written to most
 * recently, so a reconnect on the car's side needs no action here.
 */
export function playlistURL(key: string): string {
    return `${REWIND_URL}/rewind/${encodeURIComponent(key)}/current/playlist.m3u8`
}

/**
 * `GET /rewind/{key}/telemetry.jsonl?since=` — car-wide telemetry lines from
 * a point in time forward. The key is accepted but unused by the receiver
 * (telemetry is not per-stream); it is still passed so the URL stays valid
 * if that ever changes.
 */
export function telemetryURL(key: string, since?: Date): string {
    const url = `${REWIND_URL}/rewind/${encodeURIComponent(key)}/telemetry.jsonl`
    return since ? `${url}?since=${encodeURIComponent(since.toISOString())}` : url
}

/** One line of telemetry.jsonl — the emitter's envelope, verbatim. */
export interface TelemetryLine {
    ts: string
    type: "ups" | "modem"
    data: Record<string, unknown>
}

/**
 * Fetches and parses telemetry lines recorded since `since`.
 *
 * The response is JSON Lines, not JSON — a malformed trailing line (the file
 * is appended to live, so the last line can be a partial write) is skipped
 * rather than failing the whole read.
 */
export async function fetchTelemetry(key: string, since?: Date, signal?: AbortSignal): Promise<TelemetryLine[]> {
    if (!rewindEnabled) return []

    const response = await fetch(telemetryURL(key, since), { signal: signal ?? null })
    if (!response.ok) throw new Error(`rewind telemetry: HTTP ${response.status}`)

    const lines: TelemetryLine[] = []
    for (const line of (await response.text()).split("\n")) {
        if (!line.trim()) continue
        try {
            lines.push(JSON.parse(line) as TelemetryLine)
        } catch {
            /* partial trailing line — the file is being appended to live */
        }
    }
    return lines
}
