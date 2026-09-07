import { defineConfig, envField } from "astro/config"
import sitemap from "@astrojs/sitemap"
import metaTags from "astro-meta-tags"
import { astroFont } from "astro-font/integration"
import vue from "@astrojs/vue"
import compressor from "astro-compressor"
import node from "@astrojs/node"

// https://astro.build/config
export default defineConfig({
    site: process.env.SITE_URL ?? "https://racecast.minarox.fr",
    base: "/",
    integrations: [
        // /admin is operator-only; keep it out of the sitemap as well as robots.txt.
        sitemap({ filter: page => !page.includes("/admin") }),
        metaTags(),
        astroFont(),
        vue(),
        compressor()
    ],

    // Self-hosted: the build produces a standalone Node server
    // (dist/server/entry.mjs) that serves the rendered pages and the static
    // assets together, behind whatever reverse proxy the host already runs.
    adapter: node({ mode: "standalone" }),

    /*
     * Declared through astro:env rather than read as import.meta.env so that
     * server secrets are looked up in process.env at *runtime*. The container
     * is built once without credentials and gets them from the environment
     * when it starts — nothing sensitive is ever baked into the image.
     *
     * PUBLIC_REWIND_URL is the exception: it is read in the browser, so it is
     * inlined at build time and has to be present when `astro build` runs.
     */
    env: {
        schema: {
            LIVEKIT_TLS: envField.boolean({ context: "server", access: "secret", default: true }),
            LIVEKIT_DOMAIN: envField.string({ context: "server", access: "secret" }),
            LIVEKIT_API_KEY: envField.string({ context: "server", access: "secret" }),
            LIVEKIT_API_SECRET: envField.string({ context: "server", access: "secret" }),
            LIVEKIT_ROOM: envField.string({ context: "server", access: "secret" }),
            LIVEKIT_PUBLISHER_IDENTITY: envField.string({ context: "server", access: "secret" }),

            // Empty or unset leaves /admin unreachable rather than unlocked.
            ADMIN_PASSWORD: envField.string({ context: "server", access: "secret", optional: true }),

            PUBLIC_REWIND_URL: envField.string({
                context: "client",
                access: "public",
                optional: true,
                default: ""
            })
        }
    }
})
