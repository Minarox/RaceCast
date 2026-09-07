<template>
    <div class="player" :class="{ empty: !hasSource }">
        <video
            ref="display"
            playsinline
            autoplay
            muted
            disablepictureinpicture
        ></video>

        <div v-if="!hasSource" class="placeholder">
            <Icon name="cell-signal-slash" :size="20" />
            <span class="lab">{{ label || "hors ligne" }}</span>
        </div>

        <div v-else-if="error" class="placeholder">
            <Icon name="warning-circle" :size="20" />
            <span class="lab">différé indisponible</span>
        </div>
    </div>
</template>

<script setup lang="ts">
    /**
     * One video surface, fed from either of the site's two sources:
     *
     *  - LIVE: the LiveKit RemoteTrackPublication is attached directly, which
     *    is the low-latency WebRTC path.
     *  - REWIND: the same element is re-pointed at RaceCast-Receiver's HLS
     *    playlist for this stream. hls.js is imported dynamically so viewers
     *    who never rewind never download it; Safari/iOS play the playlist
     *    natively and skip the library entirely.
     *
     * Switching modes always fully tears the previous source down before
     * building the next one — leaving a LiveKit track attached while HLS
     * writes to the same element leaks a subscription and stalls playback.
     *
     * ── Two elements, sometimes ─────────────────────────────────────────────
     * Normally the media (WebRTC track or HLS) is attached straight to the
     * visible <video>. With FSR enabled (see enableFSR) a hidden <video>
     * receives the media instead, WebGL upscales it into a detached canvas,
     * and the canvas's captureStream() feeds the visible element — so native
     * fullscreen, controls and mobile playback keep working on the element
     * the viewer actually sees.
     *
     * `media()` is therefore the single answer to "which element is really
     * playing the stream": everything that touches the media — attaching,
     * detaching, seeking — must go through it, never through `display`.
     */
    import { ref, shallowRef, watch, onMounted, onBeforeUnmount, computed } from "vue"
    import type { RemoteTrackPublication } from "livekit-client"
    import Icon from "@components/Icon.vue"
    import { Event, Playback, type PlaybackState, type Settings, defaultSettings, getSettings } from "@types"
    import { playlistURL, rewindEnabled } from "@lib/rewind"
    import type { FSRRenderer } from "@assets/fsr"

    const props = withDefaults(
        defineProps<{
            /** LiveKit publication to show. Null renders the offline state. */
            track?: RemoteTrackPublication | null
            /** Caption used by the offline placeholder. */
            label?: string
            /** Audio is handled by AudioDrawer; video elements stay muted. */
            muted?: boolean
            /**
             * Allow FSR upscaling on this surface when the viewer enables it.
             * Only the hero passes this: a WebGL2 context per 128 px thumbnail
             * would cost far more than it could possibly show.
             */
            enhance?: boolean
        }>(),
        { track: null, label: "", muted: true, enhance: false }
    )

    const display = ref<HTMLVideoElement | null>(null)
    const hls = shallowRef<import("hls.js").default | null>(null)
    const playback = ref<PlaybackState>({ mode: Playback.LIVE, behind: 0 })
    const settings = ref<Settings>(defaultSettings)
    const error = ref(false)

    /* FSR pipeline — all null while it is off. */
    let source: HTMLVideoElement | null = null
    let canvas: HTMLCanvasElement | null = null
    let renderer: FSRRenderer | null = null

    const hasSource = computed(() => Boolean(props.track))

    /** The receiver's stream key for this camera, e.g. "Route:camera". */
    const streamKey = computed(() => {
        const name = (props.track as any)?.trackInfo?.name ?? (props.track as any)?.trackName
        return name ? `${name}:camera` : ""
    })

    /** The element actually playing the media — hidden one while FSR is on. */
    function media(): HTMLVideoElement | null {
        return source ?? display.value
    }

    /* ------------------------------------------------------------------ *
     * Source attachment
     * ------------------------------------------------------------------ */

    function detachSource(): void {
        const element = media()
        if (!element) return

        props.track?.track?.detach(element)

        hls.value?.destroy()
        hls.value = null

        element.removeAttribute("src")
        element.load()
    }

    function attachLive(): void {
        const element = media()
        if (!element || !props.track) return

        error.value = false

        props.track.setSubscribed(true)
        props.track.track?.attach(element)
        element.muted = props.muted
        void element.play().catch(() => {
            /* autoplay refused — the element stays paused until a gesture */
        })
    }

    async function attachRewind(): Promise<void> {
        const element = media()
        const url = streamKey.value && rewindEnabled ? playlistURL(streamKey.value) : ""
        if (!element || !url) {
            error.value = true
            return
        }

        error.value = false
        element.muted = props.muted

        // Safari / iOS play HLS natively — no library, no MSE.
        if (element.canPlayType("application/vnd.apple.mpegurl")) {
            element.src = url
            void element.play().catch(() => {})
            return
        }

        const { default: Hls } = await import("hls.js")
        if (!Hls.isSupported()) {
            error.value = true
            return
        }

        const instance = new Hls({
            // The window is hours long; only fetch near where we are watching.
            backBufferLength: 90,
            maxBufferLength: 30,
            lowLatencyMode: false
        })

        instance.on(Hls.Events.ERROR, (_, data) => {
            if (!data.fatal) return

            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) instance.startLoad()
            else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) instance.recoverMediaError()
            else {
                error.value = true
                instance.destroy()
                hls.value = null
            }
        })

        instance.attachMedia(element)
        instance.loadSource(url)
        hls.value = instance

        void element.play().catch(() => {})
    }

    function attachSource(): void {
        if (playback.value.mode === Playback.REWIND) void attachRewind()
        else attachLive()
    }

    /* ------------------------------------------------------------------ *
     * FSR
     * ------------------------------------------------------------------ */

    /**
     * Moves playback onto the WebGL path. Any failure (no WebGL2, shader
     * compilation refused by the driver) rolls the whole thing back to direct
     * attachment rather than leaving a black surface — this is an optional
     * enhancement, never a requirement for the picture to appear.
     */
    async function enableFSR(sharpness: number): Promise<void> {
        if (!props.enhance || source || !display.value) return

        detachSource()

        const hidden = document.createElement("video")
        hidden.style.cssText =
            "position:fixed;top:-1px;left:-1px;width:1px;height:1px;opacity:0;pointer-events:none"
        hidden.setAttribute("playsinline", "")
        hidden.muted = true
        hidden.autoplay = true
        document.body.appendChild(hidden)
        source = hidden

        // Detached canvas, never in the DOM: 1080p target, so a 540p stream is
        // upscaled ×2 and a 1080p one just gets RCAS sharpening.
        const target = document.createElement("canvas")
        target.width = 1920
        target.height = 1080

        try {
            const { FSRRenderer } = await import("@assets/fsr")
            renderer = new FSRRenderer(target, hidden)
        } catch (cause) {
            console.warn("[FSR] initialisation failed, falling back to direct playback:", cause)

            hidden.remove()
            source = null
            renderer = null
            attachSource()
            return
        }

        canvas = target
        renderer.setSharpness(sharpness)
        renderer.start()

        attachSource()

        display.value.srcObject = target.captureStream(30)
        void display.value.play().catch(() => {})
    }

    function disableFSR(): void {
        if (!source) return

        detachSource()

        renderer?.destroy()
        renderer = null
        canvas = null

        if (display.value) display.value.srcObject = null

        source.remove()
        source = null

        attachSource()
    }

    /* ------------------------------------------------------------------ *
     * Seeking
     * ------------------------------------------------------------------ */

    /** Places playback `behind` seconds before the live edge of the window. */
    function seek(offset: number): void {
        const element = media()
        if (!element || playback.value.mode !== Playback.REWIND) return

        const seekable = element.seekable
        if (!seekable.length) return

        const end = seekable.end(seekable.length - 1)
        const start = seekable.start(0)
        element.currentTime = Math.max(start, end - offset)
    }

    /* ------------------------------------------------------------------ *
     * Live state
     * ------------------------------------------------------------------ */

    function playbackHandler(event: any): void {
        const next = event.detail as PlaybackState
        const changedMode = next.mode !== playback.value.mode
        playback.value = next

        if (changedMode) {
            detachSource()
            attachSource()
        } else if (next.mode === Playback.REWIND) {
            seek(next.behind)
        }
    }

    function seekHandler(event: any): void {
        seek(event.detail as number)
    }

    function settingsHandler(): void {
        settings.value = getSettings()

        const fsr = settings.value.fsr
        if (props.enhance && fsr.enabled) {
            if (source) renderer?.setSharpness(fsr.sharpness)
            else void enableFSR(fsr.sharpness)
        } else {
            disableFSR()
        }
    }

    watch(
        () => props.track,
        () => {
            detachSource()
            attachSource()
        }
    )

    onMounted(() => {
        document.addEventListener(Event.PLAYBACK, playbackHandler)
        document.addEventListener(Event.SEEK, seekHandler)
        document.addEventListener(Event.SETTINGS, settingsHandler)

        attachSource()
        settingsHandler()
    })

    onBeforeUnmount(() => {
        document.removeEventListener(Event.PLAYBACK, playbackHandler)
        document.removeEventListener(Event.SEEK, seekHandler)
        document.removeEventListener(Event.SETTINGS, settingsHandler)

        detachSource()

        renderer?.destroy()
        renderer = null
        canvas = null

        if (display.value) display.value.srcObject = null

        source?.remove()
        source = null
    })
</script>

<style scoped>
    .player {
        position: absolute;
        inset: 0;
        background: #000;
    }

    video {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
    }

    .player.empty video {
        visibility: hidden;
    }

    .placeholder {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        color: var(--text-5);
        background: var(--surface-2);
    }
</style>
