type Runtime = import("@astrojs/cloudflare").Runtime<Env>

declare namespace App {
    interface Locals extends Runtime {}
}

interface ImportMetaEnv {
    /**
     * Base URL of RaceCast-Receiver's rewind HTTP API, e.g.
     * https://rewind.example.com. Read in the browser, so it is inlined at
     * build time and must carry the PUBLIC_ prefix. Empty or unset disables
     * the rewind UI entirely.
     */
    readonly PUBLIC_REWIND_URL?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
