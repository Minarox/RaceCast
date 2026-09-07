import type { Season, Token } from "@types"
import { defineAction } from "astro:actions"
import { AccessToken, RoomServiceClient } from "livekit-server-sdk"
import { env } from "cloudflare:workers"

/**
 * Server-only logic lives here rather than in API routes — these are the only
 * two things the site needs a server for. Everything else it displays comes
 * straight from LiveKit (WebRTC) or from RaceCast-Receiver's rewind HTTP API,
 * both read directly from the browser.
 */
export const server = {
    /**
     * Mints a short-lived, subscribe-only LiveKit token and makes sure the
     * room exists. The token deliberately grants no publish rights: the site
     * is a viewer, never a source.
     */
    getLiveKitToken: defineAction({
        handler: async () => {
            try {
                const protocol = env.LIVEKIT_TLS === "true" ? "https://" : "http://"
                const room = new RoomServiceClient(
                    protocol + env.LIVEKIT_DOMAIN,
                    env.LIVEKIT_API_KEY,
                    env.LIVEKIT_API_SECRET
                )

                const rooms = await room.listRooms()
                if (!rooms.some(r => r.name === env.LIVEKIT_ROOM)) {
                    await room.createRoom({
                        name: env.LIVEKIT_ROOM,
                        departureTimeout: 60 * 60 * 24
                    })
                }

                const identity = `User-${Math.random().toString(36).substring(7)}`
                const accessToken = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, { identity })

                accessToken.addGrant({
                    roomCreate: false,
                    roomJoin: true,
                    roomList: false,
                    roomRecord: false,
                    roomAdmin: false,
                    room: env.LIVEKIT_ROOM,
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
                    domain: env.LIVEKIT_DOMAIN,
                    room: env.LIVEKIT_ROOM,
                    identity,
                    token: await accessToken.toJwt(),
                    validity: accessToken.ttl.toString(),
                    publisherIdentity: env.LIVEKIT_PUBLISHER_IDENTITY,
                    timestamp: Date.now()
                } as Token
            } catch (error: any) {
                throw new Error(`Failed to create or get LiveKit room: ${error.message}`)
            }
        }
    }),

    /**
     * Free-text label for what the car is currently running, e.g.
     * "ES 4 — Col de Turini", edited by hand under the STAGE key of the STORE
     * KV namespace. There is no stage/timing feed anywhere in the pipeline, so
     * this is the one place the site learns it. Empty = the header hides it.
     */
    getStage: defineAction({
        handler: async (): Promise<string> => {
            return (await env.STORE.get("STAGE", "text")) ?? ""
        }
    }),

    /**
     * Post-race replays, edited by hand as a JSON array of seasons under the
     * REPLAYS key of the STORE KV namespace. Unset or malformed content is
     * treated as "no replays yet" rather than an error — the page renders its
     * empty state, and a typo in KV never takes the site down.
     */
    getReplays: defineAction({
        handler: async (): Promise<Season[]> => {
            const raw = await env.STORE.get("REPLAYS", "text")
            if (!raw) return []

            try {
                const parsed: unknown = JSON.parse(raw)
                return Array.isArray(parsed) ? (parsed as Season[]) : []
            } catch {
                return []
            }
        }
    })
}
