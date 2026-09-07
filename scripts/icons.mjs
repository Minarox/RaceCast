import { readFileSync, writeFileSync } from "node:fs"

const set = JSON.parse(readFileSync("./node_modules/@iconify-json/ph/icons.json", "utf8"))

const wanted = [
    "caret-down", "caret-up", "caret-right", "caret-left",
    "speaker-high", "speaker-slash", "speaker-simple-high",
    "arrows-out", "arrows-in", "crosshair", "skip-back",
    "cell-signal-medium", "cell-signal-slash", "battery-high",
    "x", "broadcast", "gauge", "film-slate", "users", "gear-six",
    "play-fill", "youtube-logo", "warning-circle"
]

const missing = wanted.filter(n => !set.icons[n])
if (missing.length) throw new Error("missing icons: " + missing.join(", "))

const entries = wanted
    .map(n => `    "${n}": ${JSON.stringify(set.icons[n].body)}`)
    .join(",\n")

writeFileSync("./src/assets/icons.ts", `/*
 * Inline Phosphor icon paths, extracted from @iconify-json/ph at build-setup
 * time (scripts/icons.mjs) rather than loaded from the Phosphor web font the
 * design mocks used — the font is ~200 KB for the dozen glyphs this UI needs,
 * and an inline <svg> also inherits currentColor without a font load blocking
 * first paint.
 *
 * Rendered by Icon.astro (server) and Icon.vue (islands), which share this
 * one set so both sides of the app draw identical glyphs.
 */

export const VIEW_BOX = "0 0 ${set.width ?? 256} ${set.height ?? 256}"

export const icons = {
${entries}
} as const

export type IconName = keyof typeof icons
`)

console.log("wrote src/assets/icons.ts with", wanted.length, "icons")
