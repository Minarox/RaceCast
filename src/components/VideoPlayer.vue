<template>
    <div class="player" :class="{ empty: !hasSource }">
        <video
            ref="video"
            playsinline
            autoplay
            muted
            disablepictureinpicture
            :poster="undefined"
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
     * One <video> surface, fed from either of the site's two sources:
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
     */
    import { ref, shallowRef, watch, onMounted, onBeforeUnmount, computed } from "vue"
    import type { RemoteTrackPublication } from "livekit-client"
    import Icon from "@components/Icon.vue"
    import { Event, Playback, type PlaybackState } from "@types"
    import { playlistURL, rewindEnabled } from "@lib/rewind"

    const props = withDefaults(
        defineProps<{
            /** LiveKit publication to show. Null renders the offline state. */
            track?: RemoteTrackPublication | null
            /** Caption used by the offline placeholder. */
            label?: string
            /** Audio is handled by AudioDrawer; video elements stay muted. */
            muted?: boolean
        }>(),
        { track: null, label: "", muted: true }
    )

    const video = ref<HTMLVideoElement | null>(null)
    const hls = shallowRef<import("hls.js").default | null>(null)
    const playback = ref<PlaybackState>({ mode: Playback.LIVE, behind: 0 })
    const error = ref(false)

    const hasSource = computed(() => Boolean(props.track))

    /** The receiver's stream key for this camera, e.g. "Route:camera". */
    const streamKey = computed(() => {
        const name = (props.track as any)?.trackInfo?.name ?? (props.track as any)?.trackName
        return name ? `${name}:camera` : ""
    })

    function detachLive(): void {
        if (video.value) props.track?.track?.detach(video.value)
    }

    function destroyHLS(): void {
        hls.value?.destroy()
        hls.value = null

        if (video.value) {
            video.value.removeAttribute("src")
            video.value.load()
        }
    }

    function attachLive(): void {
        destroyHLS()
        error.value = false

        const element = video.value
        if (!element || !props.track) return

        props.track.setSubscribed(true)
        props.track.track?.attach(element)
        element.muted = props.muted
        void element.play().catch(() => {
            /* autoplay refused — the element stays paused until a gesture */
        })
    }

    async function attachRewind(): Promise<void> {
        detachLive()

        const element = video.value
        const url = streamKey.value && rewindEnabled ? playlistURL(streamKey.value) : ""
        if (!element || !url) {
            error.value = true
            return
        }

        error.value = false

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
                destroyHLS()
            }
        })

        instance.attachMedia(element)
        instance.loadSource(url)
        hls.value = instance

        void element.play().catch(() => {})
    }

    /** Places playback `behind` seconds before the live edge of the window. */
    function seek(behind: number): void {
        const element = video.value
        if (!element || playback.value.mode !== Playback.REWIND) return

        const seekable = element.seekable
        if (!seekable.length) return

        const end = seekable.end(seekable.length - 1)
        const start = seekable.start(0)
        element.currentTime = Math.max(start, end - behind)
    }

    function apply(): void {
        if (playback.value.mode === Playback.REWIND) void attachRewind()
        else attachLive()
    }

    function playbackHandler(event: any): void {
        const next = event.detail as PlaybackState
        const changedMode = next.mode !== playback.value.mode
        playback.value = next

        if (changedMode) apply()
        else if (next.mode === Playback.REWIND) seek(next.behind)
    }

    function seekHandler(event: any): void {
        seek(event.detail as number)
    }

    watch(() => props.track, apply)

    onMounted(() => {
        document.addEventListener(Event.PLAYBACK, playbackHandler)
        document.addEventListener(Event.SEEK, seekHandler)
        apply()
    })

    onBeforeUnmount(() => {
        document.removeEventListener(Event.PLAYBACK, playbackHandler)
        document.removeEventListener(Event.SEEK, seekHandler)
        detachLive()
        destroyHLS()
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
