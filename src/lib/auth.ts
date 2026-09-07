/**
 * Admin authentication.
 *
 * One shared password (`ADMIN_PASSWORD`) unlocks /admin, and a signed cookie
 * keeps the session. That is the right weight for this: a single operator
 * editing rally times from the side of a stage, on a site whose entire
 * content is public anyway. There are no user accounts to manage and nothing
 * behind the login worth a heavier scheme.
 *
 * The cookie holds `expiry.signature`, signed with an HMAC over the expiry and
 * the password itself — so changing `ADMIN_PASSWORD` invalidates every session
 * that was already open, with no server-side session store to expire.
 */

import { createHmac, timingSafeEqual } from "node:crypto"
import { ADMIN_PASSWORD } from "astro:env/server"
import type { AstroCookies } from "astro"

export const SESSION_COOKIE = "racecast_admin"

/** How long a login lasts before it has to be repeated. */
const SESSION_MS = 12 * 60 * 60 * 1000

function secret(): string {
    return ADMIN_PASSWORD ?? ""
}

/** Admin is unreachable rather than open when no password is configured. */
export function adminConfigured(): boolean {
    return secret().length > 0
}

function sign(expiry: number): string {
    return createHmac("sha256", secret()).update(String(expiry)).digest("hex")
}

/** Constant-time compare that tolerates length mismatches without throwing. */
function equal(a: string, b: string): boolean {
    const left = Buffer.from(a)
    const right = Buffer.from(b)

    if (left.length !== right.length) return false
    return timingSafeEqual(left, right)
}

export function checkPassword(candidate: string): boolean {
    return adminConfigured() && equal(candidate, secret())
}

export function issueSession(cookies: AstroCookies): void {
    const expiry = Date.now() + SESSION_MS

    cookies.set(SESSION_COOKIE, `${expiry}.${sign(expiry)}`, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        // Set only over HTTPS in production; a plain-HTTP homelab test would
        // otherwise never receive the cookie back.
        secure: process.env.NODE_ENV === "production",
        maxAge: Math.floor(SESSION_MS / 1000)
    })
}

export function clearSession(cookies: AstroCookies): void {
    cookies.delete(SESSION_COOKIE, { path: "/" })
}

export function isAuthenticated(cookies: AstroCookies): boolean {
    if (!adminConfigured()) return false

    const raw = cookies.get(SESSION_COOKIE)?.value
    if (!raw) return false

    const [expiryPart, signature] = raw.split(".")
    const expiry = Number(expiryPart)

    if (!Number.isFinite(expiry) || !signature) return false
    if (expiry < Date.now()) return false

    return equal(signature, sign(expiry))
}
