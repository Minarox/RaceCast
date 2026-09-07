<template>
    <div class="rewind" :class="{ off: !available }">
        <span class="state" :class="{ live: isLive }">
            <span class="dot"></span>
            {{ isLive ? "EN DIRECT" : "DIFFÉRÉ" }}
        </span>

        <button
            class="step"
            type="button"
            aria-label="Reculer de 10 secondes"
            :disabled="!available"
            @click="nudge(10)"
        >
            <Icon name="skip-back" :size="15" />
        </button>

        <div
            ref="track"
            class="track"
            role="slider"
            aria-label="Position dans le direct"
            :aria-valuemin="0"
            :aria-valuemax="windowSeconds"
            :aria-valuenow="Math.round(windowSeconds - behind)"
            :aria-disabled="!available"
            tabindex="0"
            @pointerdown="onPointerDown"
            @keydown="onKeyDown"
        >
            <span class="buffered" :style="{ width: playheadPct }"></span>

            <span
                v-for="(marker, index) in visibleMarkers"
                :key="index"
                class="marker"
                :style="{ left: marker }"
                title="Coupure de la liaison"
            ></span>

            <span class="playhead" :style="{ left: playheadPct }"></span>
        </div>

        <span class="clock num lab">{{ label }}</span>

        <!-- Phone: explicit buttons rather than a precise drag target. -->
        <div class="phone-actions">
            <button type="button" :disabled="!available" @click="nudge(10)">−10 s</button>
            <button type="button" :disabled="!available" @click="nudge(30)">−30 s</button>
            <button type="button" class="primary" :disabled="isLive" @click="goLive">Retour au direct</button>
        </div>
    </div>
</template>

<script setup lang="ts">
    /**
     * Seek back into the live stream, Twitch/YouTube style.
     *
     * This owns the playback position for the whole page and broadcasts it as
     * Event.PLAYBACK; the video players react by switching between the WebRTC
     * live track and the receiver's HLS window. The bar is the only writer of
     * that state, which is what keeps several players (hero + thumbnails) in
     * agreement without them talking to each other.
     *
     * `behind` is measured in seconds behind the live edge, not as an absolute
     * timestamp, because the HLS window slides continuously: an absolute
     * position would silently fall off the back of the buffer while the viewer
     * is paused on it.
     *
     * The bar disables itself when the receiver's rewind API is unreachable or
     * unconfigured — there is nothing to seek into, and a control that looks
     * live but does nothing is worse than one that is visibly off.
     */
    import { ref, computed, onMounted, onBeforeUnmount } from "vue"
    import Icon from "@components/Icon.vue"
    import {
        Event,
        Playback,
        State,
        type RewindStream,
        defaultSettings,
        type Settings,
        dispatchEvent,
        getSettings
    } from "@types"
    import { fetchStreams, rewindEnabled } from "@lib/rewind"
    import { clock, behind as behindLabel } from "@lib/format"

    /** Longest offset the UI will offer when "session" is selected. */
    const SESSION_SECONDS = 6 * 3600

    const settings = ref<Settings>(defaultSettings)
    const streams = ref<RewindStream[]>([])
    const behind = ref(0)
    const now = ref(Date.now())
    const track = ref<HTMLElement | null>(null)

    /** Times the car's link dropped while this page was open. */
    const markers = ref<number[]>([])

    let ticker: number | undefined
    let poller: number | undefined
    let controller: AbortController | undefined
    let lastRemote: State = State.DISCONNECTED

    const isLive = computed(() => behind.value <= 0)
    const available = computed(() => rewindEnabled && streams.value.length > 0)

    const windowSeconds = computed(() => settings.value.bufferSeconds || SESSION_SECONDS)

    const playheadPct = computed(() => {
        const ratio = 1 - Math.min(1, behind.value / windowSeconds.value)
        return `${(ratio * 100).toFixed(2)}%`
    })

    /** Marker positions, dropping any that have slid out of the window. */
    const visibleMarkers = computed(() => {
        if (!settings.value.showMarkers) return []

        return markers.value
            .map(at => (now.value - at) / 1000)
            .filter(age => age > 0 && age < windowSeconds.value)
            .map(age => `${((1 - age / windowSeconds.value) * 100).toFixed(2)}%`)
    })

    /** "10:42:07" while live, "−1 min 20 s" once rewound. */
    const label = computed(() =>
        isLive.value ? clock(now.value) : behindLabel(behind.value)
    )

    function publish(): void {
        dispatchEvent(Event.PLAYBACK, {
            mode: isLive.value ? Playback.LIVE : Playback.REWIND,
            behind: behind.value
        })
    }

    function seekTo(seconds: number): void {
        if (!available.value) return

        behind.value = Math.max(0, Math.min(windowSeconds.value, seconds))
        publish()
    }

    function nudge(seconds: number): void {
        seekTo(behind.value + seconds)
    }

    function goLive(): void {
        behind.value = 0
        publish()
    }

    /* --- scrubbing --- */

    function positionFromEvent(event: PointerEvent): number {
        const box = track.value?.getBoundingClientRect()
        if (!box || !box.width) return behind.value

        const ratio = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width))
        return (1 - ratio) * windowSeconds.value
    }

    function onPointerMove(event: PointerEvent): void {
        seekTo(positionFromEvent(event))
    }

    function onPointerUp(): void {
        window.removeEventListener("pointermove", onPointerMove)
        window.removeEventListener("pointerup", onPointerUp)
    }

    function onPointerDown(event: PointerEvent): void {
        if (!available.value) return

        seekTo(positionFromEvent(event))
        window.addEventListener("pointermove", onPointerMove)
        window.addEventListener("pointerup", onPointerUp)
    }

    function onKeyDown(event: KeyboardEvent): void {
        if (!available.value) return

        if (event.key === "ArrowLeft") nudge(10)
        else if (event.key === "ArrowRight") nudge(-10)
        else if (event.key === "End") goLive()
        else return

        event.preventDefault()
    }

    /* --- live state --- */

    function remoteStatusHandler(event: any): void {
        const state = event.detail as State

        if (lastRemote === State.CONNECTED && state !== State.CONNECTED) markers.value.push(Date.now())
        lastRemote = state
    }

    function settingsHandler(): void {
        settings.value = getSettings()
        if (behind.value > windowSeconds.value) seekTo(windowSeconds.value)
    }

    async function refreshStreams(): Promise<void> {
        controller?.abort()
        controller = new AbortController()

        try {
            streams.value = await fetchStreams(controller.signal)
        } catch {
            // The receiver's rewind API is optional and may simply be off;
            // an unreachable one disables the bar rather than raising.
            streams.value = []
        }
    }

    onMounted(() => {
        document.addEventListener(Event.REMOTE_STATUS, remoteStatusHandler)
        document.addEventListener(Event.SETTINGS, settingsHandler)
        settingsHandler()
        dispatchEvent(Event.RESEND, Event.REMOTE_STATUS)

        ticker = window.setInterval(() => (now.value = Date.now()), 1000)

        if (rewindEnabled) {
            void refreshStreams()
            poller = window.setInterval(() => void refreshStreams(), 30_000)
        }

        publish()
    })

    onBeforeUnmount(() => {
        document.removeEventListener(Event.REMOTE_STATUS, remoteStatusHandler)
        document.removeEventListener(Event.SETTINGS, settingsHandler)
        window.clearInterval(ticker)
        window.clearInterval(poller)
        controller?.abort()
        onPointerUp()
    })
</script>

<style scoped>
    .rewind {
        flex: none;
        height: var(--rewind-h);
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 0 18px;
        border-top: 1px solid var(--line);
        background: rgba(22, 24, 38, 0.6);
    }

    .rewind.off {
        opacity: 0.55;
    }

    .state {
        display: flex;
        align-items: center;
        gap: 7px;
        font: 500 11px var(--font);
        letter-spacing: 0.08em;
        color: var(--text-4);
        white-space: nowrap;
    }

    .state.live {
        color: var(--accent-soft);
    }

    .state .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--text-6);
    }

    .state.live .dot {
        background: var(--accent);
        box-shadow: 0 0 9px var(--accent);
    }

    .step {
        display: flex;
        color: var(--text-4);
    }

    .step:disabled {
        cursor: default;
    }

    .step:not(:disabled):hover {
        color: var(--text-2);
    }

    .track {
        flex: 1;
        position: relative;
        height: 8px;
        border-radius: 4px;
        background: var(--line);
        box-shadow: inset 0 0 0 1px var(--line-3);
        cursor: pointer;
        touch-action: none;
    }

    .track:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 3px;
    }

    .buffered {
        position: absolute;
        inset: 0 auto 0 0;
        border-radius: 4px 0 0 4px;
        background: linear-gradient(90deg, var(--accent-track-from), var(--accent-track-to));
    }

    .marker {
        position: absolute;
        top: -2px;
        width: 2px;
        height: 12px;
        border-radius: 1px;
        background: var(--text-5);
    }

    .playhead {
        position: absolute;
        top: -4px;
        width: 3px;
        height: 16px;
        margin-left: -1px;
        border-radius: 2px;
        background: var(--text);
        box-shadow: 0 0 10px rgba(233, 233, 237, 0.6);
    }

    .clock {
        letter-spacing: 0.06em;
        color: var(--text-4);
        white-space: nowrap;
    }

    .phone-actions {
        display: none;
        gap: 8px;
    }

    @media (max-width: 768px) {
        .rewind {
            height: auto;
            flex-wrap: wrap;
            row-gap: 9px;
            padding: 10px 16px 12px;
        }

        .step {
            display: none;
        }

        .state {
            order: 1;
            flex: 1;
        }

        .clock {
            order: 2;
        }

        .track {
            order: 3;
            flex: 1 0 100%;
        }

        .phone-actions {
            order: 4;
            display: flex;
            flex: 1 0 100%;
        }

        .phone-actions button {
            flex: 1;
            padding: 9px 0;
            border-radius: 7px;
            font: 500 11.5px var(--font);
            color: var(--text-3);
            box-shadow: inset 0 0 0 1px var(--line-5);
        }

        .phone-actions button:disabled {
            opacity: 0.45;
            cursor: default;
        }

        .phone-actions .primary {
            flex: 1.4;
            color: var(--accent-soft);
            background: var(--accent-fill);
            box-shadow: inset 0 0 0 1px var(--accent-line);
        }
    }
</style>
