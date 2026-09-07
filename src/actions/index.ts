import { ActionError, defineAction } from "astro:actions"
import { z } from "astro:schema"
import { AccessToken, RoomServiceClient } from "livekit-server-sdk"
import {
    LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET,
    LIVEKIT_DOMAIN,
    LIVEKIT_PUBLISHER_IDENTITY,
    LIVEKIT_ROOM,
    LIVEKIT_TLS
} from "astro:env/server"
import type { Token } from "@types"
import { checkPassword, clearSession, isAuthenticated, issueSession } from "@lib/auth"
import {
    createRally,
    createStage,
    deleteRally,
    deleteStage,
    setSetting,
    updateRally,
    updateStage
} from "@lib/db"

/**
 * Server-only logic. Two groups:
 *
 *  - `getLiveKitToken`, called by every visitor to join the room read-only.
 *  - the admin mutations behind it, which edit the rally history in SQLite.
 *    Each one re-checks the session itself rather than trusting a middleware
 *    or the page that rendered the form — an action is a public endpoint, and
 *    a hidden form is not access control.
 *
 * All the admin actions accept `form` input so the /admin page works as plain
 * HTML forms: no client JavaScript, and a flaky trackside connection retries a
 * normal POST instead of losing an in-page fetch.
 */

/** Throws unless the caller holds a valid admin session. */
function requireAdmin(context: { cookies: any }): void {
    if (!isAuthenticated(context.cookies)) {
        throw new ActionError({ code: "UNAUTHORIZED", message: "Session admin requise." })
    }
}

/**
 * An optional text field, normalised to a trimmed string.
 *
 * Accepts null explicitly: a form field left blank reaches the action as
 * `null`, not as `""` or `undefined`, so a plain `.optional()` rejects it with
 * an "expected string" error on every empty input.
 */
const optionalText = z
    .union([z.string(), z.null(), z.undefined()])
    .transform(value => (value ?? "").trim())

const rallyFields = {
    season: z.string().trim().min(1, "Saison requise"),
    name: z.string().trim().min(1, "Nom requis"),
    date: z.string().trim().min(1, "Date requise"),
    replay: optionalText,
    thumbnail: optionalText,
    duration: optionalText,
    summary: optionalText,
    telemetry: optionalText
}

export const server = {
    /**
     * Mints a short-lived, subscribe-only LiveKit token and makes sure the
     * room exists. The token deliberately grants no publish rights: the site
     * is a viewer, never a source.
     */
    getLiveKitToken: defineAction({
        handler: async () => {
            try {
                const protocol = LIVEKIT_TLS ? "https://" : "http://"
                const rooms = new RoomServiceClient(
                    protocol + LIVEKIT_DOMAIN,
                    LIVEKIT_API_KEY,
                    LIVEKIT_API_SECRET
                )

                const existing = await rooms.listRooms()
                if (!existing.some(room => room.name === LIVEKIT_ROOM)) {
                    await rooms.createRoom({ name: LIVEKIT_ROOM, departureTimeout: 60 * 60 * 24 })
                }

                const identity = `User-${Math.random().toString(36).substring(7)}`
                const accessToken = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { identity })

                accessToken.addGrant({
                    roomCreate: false,
                    roomJoin: true,
                    roomList: false,
                    roomRecord: false,
                    roomAdmin: false,
                    room: LIVEKIT_ROOM,
                    ingressAdmin: false,
                    canPublish: false,
                    canSubscribe: true,
                    canPublishData: false,
                    canUpdateOwnMetadata: false,
                    hidden: false,
                    recorder: false,
                    agent: false
                })

                return {
                    domain: LIVEKIT_DOMAIN,
                    room: LIVEKIT_ROOM,
                    identity,
                    token: await accessToken.toJwt(),
                    validity: accessToken.ttl.toString(),
                    publisherIdentity: LIVEKIT_PUBLISHER_IDENTITY,
                    timestamp: Date.now()
                } as Token
            } catch (cause: any) {
                throw new ActionError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `LiveKit indisponible : ${cause.message}`
                })
            }
        }
    }),

    /* -------------------------------------------------------------- *
     * Admin session
     * -------------------------------------------------------------- */

    login: defineAction({
        accept: "form",
        input: z.object({ password: z.string() }),
        handler: ({ password }, context) => {
            if (!checkPassword(password)) {
                throw new ActionError({ code: "UNAUTHORIZED", message: "Mot de passe incorrect." })
            }

            issueSession(context.cookies)
            return { ok: true }
        }
    }),

    logout: defineAction({
        accept: "form",
        handler: (_input, context) => {
            clearSession(context.cookies)
            return { ok: true }
        }
    }),

    /* -------------------------------------------------------------- *
     * Content
     * -------------------------------------------------------------- */

    /** The "what's running now" banner in the header. Empty hides it. */
    setStage: defineAction({
        accept: "form",
        input: z.object({ stage: optionalText }),
        handler: ({ stage }, context) => {
            requireAdmin(context)
            setSetting("stage", stage)
            return { ok: true }
        }
    }),

    createRally: defineAction({
        accept: "form",
        input: z.object(rallyFields),
        handler: (input, context) => {
            requireAdmin(context)
            return { id: createRally(input) }
        }
    }),

    updateRally: defineAction({
        accept: "form",
        input: z.object({ id: z.coerce.number().int().positive(), ...rallyFields }),
        handler: ({ id, ...fields }, context) => {
            requireAdmin(context)
            updateRally(id, fields)
            return { ok: true }
        }
    }),

    deleteRally: defineAction({
        accept: "form",
        input: z.object({ id: z.coerce.number().int().positive() }),
        handler: ({ id }, context) => {
            requireAdmin(context)
            deleteRally(id)
            return { ok: true }
        }
    }),

    createStage: defineAction({
        accept: "form",
        input: z.object({
            rally: z.coerce.number().int().positive(),
            name: z.string().trim().min(1, "Nom de l'ES requis"),
            time: optionalText
        }),
        handler: ({ rally, name, time }, context) => {
            requireAdmin(context)
            createStage(rally, name, time)
            return { ok: true }
        }
    }),

    updateStage: defineAction({
        accept: "form",
        input: z.object({
            id: z.coerce.number().int().positive(),
            name: z.string().trim().min(1, "Nom de l'ES requis"),
            time: optionalText
        }),
        handler: ({ id, name, time }, context) => {
            requireAdmin(context)
            updateStage(id, name, time)
            return { ok: true }
        }
    }),

    deleteStage: defineAction({
        accept: "form",
        input: z.object({ id: z.coerce.number().int().positive() }),
        handler: ({ id }, context) => {
            requireAdmin(context)
            deleteStage(id)
            return { ok: true }
        }
    })
}
