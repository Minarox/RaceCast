/**
 * SQLite storage for the site's editorial content: the "what's running now"
 * banner, and the rally history shown on the Replays page.
 *
 * Uses `node:sqlite`, built into Node 22.5+ — no dependency to install and no
 * native module to compile on the host. It prints an ExperimentalWarning on
 * import; the Docker image silences it (see NODE_OPTIONS in the Dockerfile)
 * rather than pinning a third-party driver for a single-writer, few-rows-a-day
 * workload.
 *
 * Everything is synchronous on purpose. The database is a local file, every
 * query here touches at most a few dozen rows, and SQLite's own locking is the
 * only concurrency control a single-instance server needs.
 */

import { DatabaseSync } from "node:sqlite"
import { dirname } from "node:path"
import { mkdirSync } from "node:fs"
import type { Rally, Season, Stage } from "@types"

/** Where the database file lives. Mounted as a volume in Docker. */
const DATABASE_PATH = process.env.DATABASE_PATH ?? "./data/racecast.db"

let handle: DatabaseSync | undefined

/**
 * Opens (and on first call creates) the database.
 *
 * WAL keeps a reader — a viewer loading /replays — from blocking on the admin
 * writing an étape time mid-stage, which is exactly the moment both happen at
 * once. `foreign_keys` is off by default in SQLite and has to be asked for per
 * connection, or the cascade from rallies to stages silently does nothing.
 */
export function db(): DatabaseSync {
    if (handle) return handle

    mkdirSync(dirname(DATABASE_PATH), { recursive: true })

    const connection = new DatabaseSync(DATABASE_PATH)
    connection.exec("PRAGMA journal_mode = WAL")
    connection.exec("PRAGMA foreign_keys = ON")

    connection.exec(`
        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS rallies (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            season    TEXT    NOT NULL,
            name      TEXT    NOT NULL,
            date      TEXT    NOT NULL,
            replay    TEXT,
            thumbnail TEXT,
            duration  TEXT,
            summary   TEXT,
            telemetry TEXT
        );

        CREATE TABLE IF NOT EXISTS stages (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            rally_id INTEGER NOT NULL REFERENCES rallies(id) ON DELETE CASCADE,
            name     TEXT    NOT NULL,
            time     TEXT,
            position INTEGER NOT NULL DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS stages_by_rally ON stages(rally_id, position);
        CREATE INDEX IF NOT EXISTS rallies_by_season ON rallies(season, date);
    `)

    handle = connection
    return connection
}

/* ------------------------------------------------------------------ *
 * Settings
 * ------------------------------------------------------------------ */

export function getSetting(key: string): string {
    const row = db().prepare("SELECT value FROM settings WHERE key = ?").get(key) as
        | { value: string }
        | undefined

    return row?.value ?? ""
}

export function setSetting(key: string, value: string): void {
    if (!value) {
        db().prepare("DELETE FROM settings WHERE key = ?").run(key)
        return
    }

    db()
        .prepare(
            `INSERT INTO settings (key, value) VALUES (?, ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value`
        )
        .run(key, value)
}

/* ------------------------------------------------------------------ *
 * Rallies and stages
 * ------------------------------------------------------------------ */

interface RallyRow {
    id: number
    season: string
    name: string
    date: string
    replay: string | null
    thumbnail: string | null
    duration: string | null
    summary: string | null
    telemetry: string | null
}

interface StageRow {
    id: number
    rally_id: number
    name: string
    time: string | null
    position: number
}

/**
 * The whole history, grouped into seasons, newest first — the shape the
 * Replays page renders directly.
 *
 * Read as two flat queries and joined in memory rather than one query per
 * rally: the entire table is a few hundred rows at most, and this keeps the
 * number of statements constant however many seasons accumulate.
 */
export function listSeasons(): Season[] {
    const rallies = db()
        .prepare("SELECT * FROM rallies ORDER BY season DESC, date DESC, id DESC")
        .all() as unknown as RallyRow[]

    const stages = db()
        .prepare("SELECT * FROM stages ORDER BY position ASC, id ASC")
        .all() as unknown as StageRow[]

    const byRally = new Map<number, Stage[]>()
    for (const stage of stages) {
        const list = byRally.get(stage.rally_id) ?? []
        list.push({ id: stage.id, name: stage.name, time: stage.time })
        byRally.set(stage.rally_id, list)
    }

    const seasons = new Map<string, Season>()
    for (const row of rallies) {
        const season = seasons.get(row.season) ?? { year: row.season, rallies: [] }

        season.rallies.push({
            id: row.id,
            name: row.name,
            date: row.date,
            replay: row.replay,
            thumbnail: row.thumbnail,
            duration: row.duration,
            summary: row.summary,
            telemetry: row.telemetry,
            stages: byRally.get(row.id) ?? []
        })

        seasons.set(row.season, season)
    }

    return [...seasons.values()]
}

export type RallyInput = Omit<Rally, "id" | "stages"> & { season: string }

export function createRally(input: RallyInput): number {
    const result = db()
        .prepare(
            `INSERT INTO rallies (season, name, date, replay, thumbnail, duration, summary, telemetry)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
            input.season,
            input.name,
            input.date,
            input.replay || null,
            input.thumbnail || null,
            input.duration || null,
            input.summary || null,
            input.telemetry || null
        )

    return Number(result.lastInsertRowid)
}

export function updateRally(id: number, input: RallyInput): void {
    db()
        .prepare(
            `UPDATE rallies
             SET season = ?, name = ?, date = ?, replay = ?, thumbnail = ?,
                 duration = ?, summary = ?, telemetry = ?
             WHERE id = ?`
        )
        .run(
            input.season,
            input.name,
            input.date,
            input.replay || null,
            input.thumbnail || null,
            input.duration || null,
            input.summary || null,
            input.telemetry || null,
            id
        )
}

export function deleteRally(id: number): void {
    db().prepare("DELETE FROM rallies WHERE id = ?").run(id)
}

/** Appends a stage to a rally, after whatever is already there. */
export function createStage(rallyId: number, name: string, time: string): void {
    const row = db()
        .prepare("SELECT COALESCE(MAX(position), -1) + 1 AS next FROM stages WHERE rally_id = ?")
        .get(rallyId) as { next: number } | undefined

    db()
        .prepare("INSERT INTO stages (rally_id, name, time, position) VALUES (?, ?, ?, ?)")
        .run(rallyId, name, time || null, row?.next ?? 0)
}

export function updateStage(id: number, name: string, time: string): void {
    db().prepare("UPDATE stages SET name = ?, time = ? WHERE id = ?").run(name, time || null, id)
}

export function deleteStage(id: number): void {
    db().prepare("DELETE FROM stages WHERE id = ?").run(id)
}
