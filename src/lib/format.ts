/**
 * Display formatting helpers.
 *
 * The UI shows a lot of live numbers that can legitimately be missing (the
 * car is offline, GPS has no fix yet, a telemetry channel isn't emitted at
 * all). Every helper here takes `number | null | undefined` and returns the
 * em-dash placeholder rather than "null", "NaN" or a silently wrong 0.
 */

/** Shown wherever a value exists in the layout but not (yet) in the data. */
export const EMPTY = "—"

/** Narrow no-break space — the thousands separator used throughout the design. */
const THIN = " "

function isNumber(value: number | null | undefined): value is number {
    return typeof value === "number" && Number.isFinite(value)
}

/** Rounds and groups thousands: 4250 -> "4 250". Decimals are left ungrouped. */
export function num(value: number | null | undefined, digits = 0): string {
    if (!isNumber(value)) return EMPTY

    const [whole, decimals] = value.toFixed(digits).split(".")
    const grouped = (whole ?? "").replace(/\B(?=(\d{3})+(?!\d))/g, THIN)

    return decimals ? `${grouped}.${decimals}` : grouped
}

/** Appends a unit, keeping the placeholder unit-less when the value is missing. */
export function unit(value: number | null | undefined, suffix: string, digits = 0): string {
    if (!isNumber(value)) return EMPTY
    return `${num(value, digits)} ${suffix}`
}

/** m/s (as sent by the modem's GPS) -> km/h, rounded. */
export function speedKmh(metresPerSecond: number | null | undefined): number | null {
    if (!isNumber(metresPerSecond)) return null
    return Math.max(0, Math.round(metresPerSecond * 3.6))
}

/** A coordinate at the precision the design shows: "44.0812". */
export function coord(value: number | null | undefined): string {
    return isNumber(value) ? value.toFixed(4) : EMPTY
}

/** Wall-clock time as "10:42:07". */
export function clock(date: Date | number | null | undefined): string {
    if (date === null || date === undefined) return EMPTY

    const d = date instanceof Date ? date : new Date(date)
    if (Number.isNaN(d.getTime())) return EMPTY

    return d.toLocaleTimeString("fr-FR", { hour12: false })
}

/** A rewind offset as a signed, human-readable delay: "−1 min 20 s". */
export function behind(seconds: number): string {
    const total = Math.max(0, Math.round(seconds))
    if (total === 0) return "direct"
    if (total < 60) return `−${total}${THIN}s`

    const minutes = Math.floor(total / 60)
    const rest = total % 60
    if (minutes < 60) {
        return rest
            ? `−${minutes}${THIN}min${THIN}${rest}${THIN}s`
            : `−${minutes}${THIN}min`
    }

    const hours = Math.floor(minutes / 60)
    return `−${hours}${THIN}h${THIN}${minutes % 60}${THIN}min`
}

/** A buffer size for the settings sheet: 600 -> "10 min", 0 -> "session". */
export function bufferLabel(seconds: number): string {
    if (!seconds) return "session"
    return seconds < 3600
        ? `${Math.round(seconds / 60)}${THIN}min`
        : `${Math.round(seconds / 3600)}${THIN}h`
}

/** "14 mars" — the date format the replays timeline uses. */
export function shortDate(iso: string): string {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return iso
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
}
