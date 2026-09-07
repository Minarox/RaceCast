<template>
    <div class="status">
        <div class="left">
            <span class="item">
                <span class="dot" :class="{ on: connected }"></span>
                {{ statusText }}
            </span>

            <span class="item muted">
                <Icon :name="signalIcon" :size="15" />
                {{ signalText }}
            </span>

            <span class="item muted">
                <Icon name="battery-high" :size="16" />
                <span class="num">{{ batteryText }}</span>
            </span>
        </div>

        <div class="right">
            <button type="button" :aria-label="muted ? 'Réactiver le son' : 'Couper le son'" @click="toggleMute">
                <Icon :name="muted ? 'speaker-slash' : 'speaker-high'" :size="16" />
            </button>

            <input
                class="volume"
                type="range"
                min="0"
                max="100"
                step="1"
                aria-label="Volume général"
                :value="Math.round(volume * 100)"
                @input="onVolume"
            />

            <button
                type="button"
                class="sources"
                :aria-label="`Sources audio (${sources})`"
                @click="openAudio"
            >
                <span class="num">{{ sources }}</span>
                <Icon name="caret-up" :size="11" />
            </button>

            <button type="button" :aria-label="fullscreen ? 'Quitter le plein écran' : 'Plein écran'" @click="toggleFullscreen">
                <Icon :name="fullscreen ? 'arrows-in' : 'arrows-out'" :size="15" />
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
    /**
     * Persistent bottom bar: link health on the left, playback controls on the
     * right. Everything it shows is observed — connection state and viewer
     * counts from LiveKit, signal/battery from the car's telemetry — and
     * everything it controls is local to this browser (volume, mute,
     * fullscreen, opening the audio sheet). Nothing here reaches the car:
     * RaceCast-Receiver exposes no control surface, so the bar offers none.
     */
    import { ref, computed, onMounted, onBeforeUnmount } from "vue"
    import type { RemoteTrackPublication } from "livekit-client"
    import Icon from "@components/Icon.vue"
    import {
        Event,
        State,
        type Metadata,
        type Settings,
        defaultMetadata,
        defaultSettings,
        dispatchEvent,
        getSettings,
        getStateString,
        saveSettings
    } from "@types"
    import { num, EMPTY } from "@lib/format"

    const remote = ref<State>(State.DISCONNECTED)
    const metadata = ref<Metadata>(defaultMetadata)
    const settings = ref<Settings>(defaultSettings)
    const sources = ref(0)
    const fullscreen = ref(false)

    const connected = computed(() => remote.value === State.CONNECTED)
    const statusText = computed(() => getStateString(remote.value))

    const volume = computed(() => settings.value.volume ?? 0)
    const muted = computed(() => volume.value <= 0)

    const signalIcon = computed(() => (connected.value ? "cell-signal-medium" : "cell-signal-slash"))

    const signalText = computed(() => {
        const { tech, signal } = metadata.value.modem ?? {}
        if (!tech && signal === null) return EMPTY
        return `${tech ?? EMPTY} · ${signal === null ? EMPTY : `${num(signal)} %`}`
    })

    const batteryText = computed(() => {
        const percent = metadata.value.ups?.p
        return percent === null || percent === undefined ? EMPTY : `${num(percent)} %`
    })

    /** Remembers the level to come back to, so unmuting isn't a jump to 100. */
    let lastVolume = 0.64

    // `Event` is the app's event-name enum in this file, so the DOM event type
    // has to be reached through globalThis here.
    function onVolume(event: globalThis.Event): void {
        const value = Number((event.target as HTMLInputElement).value) / 100
        if (value > 0) lastVolume = value

        saveSettings({ ...settings.value, volume: value })
    }

    function toggleMute(): void {
        saveSettings({ ...settings.value, volume: muted.value ? lastVolume : 0 })
    }

    function openAudio(): void {
        dispatchEvent(Event.SHOW_AUDIO)
    }

    async function toggleFullscreen(): Promise<void> {
        try {
            if (document.fullscreenElement) await document.exitFullscreen()
            else await document.documentElement.requestFullscreen()
        } catch {
            /* iOS Safari refuses fullscreen outside a <video>; ignore */
        }
    }

    /* --- live state --- */

    function remoteHandler(event: any): void {
        remote.value = event.detail as State
    }

    function metadataHandler(event: any): void {
        metadata.value = event.detail as Metadata
    }

    function microphonesHandler(event: any): void {
        sources.value = (event.detail as RemoteTrackPublication[]).length
    }

    function settingsHandler(): void {
        settings.value = getSettings()
        if (settings.value.volume > 0) lastVolume = settings.value.volume
    }

    function fullscreenHandler(): void {
        fullscreen.value = Boolean(document.fullscreenElement)
    }

    onMounted(() => {
        document.addEventListener(Event.REMOTE_STATUS, remoteHandler)
        document.addEventListener(Event.METADATA, metadataHandler)
        document.addEventListener(Event.MICROPHONES, microphonesHandler)
        document.addEventListener(Event.SETTINGS, settingsHandler)
        document.addEventListener("fullscreenchange", fullscreenHandler)

        settingsHandler()
        dispatchEvent(Event.RESEND, Event.REMOTE_STATUS)
        dispatchEvent(Event.RESEND, Event.METADATA)
        dispatchEvent(Event.RESEND, Event.MICROPHONES)
    })

    onBeforeUnmount(() => {
        document.removeEventListener(Event.REMOTE_STATUS, remoteHandler)
        document.removeEventListener(Event.METADATA, metadataHandler)
        document.removeEventListener(Event.MICROPHONES, microphonesHandler)
        document.removeEventListener(Event.SETTINGS, settingsHandler)
        document.removeEventListener("fullscreenchange", fullscreenHandler)
    })
</script>

<style scoped>
    .status {
        flex: none;
        min-height: var(--status-h);
        padding-bottom: var(--safe-bottom);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding-inline: 18px;
        border-top: 1px solid var(--line);
        background: var(--surface);
    }

    .left,
    .right {
        display: flex;
        align-items: center;
        gap: 16px;
        min-width: 0;
    }

    .right {
        gap: 14px;
    }

    .item {
        display: flex;
        align-items: center;
        gap: 6px;
        font: 400 11.5px var(--font);
        color: var(--text-3);
        white-space: nowrap;
    }

    .item.muted {
        color: var(--text-4);
    }

    .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--text-6);
    }

    .dot.on {
        background: var(--accent);
        box-shadow: 0 0 8px var(--accent-glow);
    }

    .right button {
        display: flex;
        color: var(--text-4);
    }

    .right button:hover {
        color: var(--text-2);
    }

    .sources {
        align-items: center;
        gap: 5px;
        padding: 6px 9px;
        border-radius: var(--r-sm);
        font: 500 11px var(--font);
        color: var(--accent-soft);
        background: var(--accent-fill);
        box-shadow: inset 0 0 0 1px var(--accent-line);
    }

    .sources:hover {
        color: var(--accent-soft);
    }

    /* One slider style across browsers; the native track/thumb differ wildly. */
    .volume {
        width: 96px;
        height: 4px;
        border-radius: 2px;
        background: var(--line-4);
        appearance: none;
        -webkit-appearance: none;
        cursor: pointer;
    }

    .volume::-webkit-slider-thumb {
        appearance: none;
        -webkit-appearance: none;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--text);
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
    }

    .volume::-moz-range-thumb {
        width: 12px;
        height: 12px;
        border: 0;
        border-radius: 50%;
        background: var(--text);
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
    }

    @media (max-width: 768px) {
        .status {
            padding-inline: 16px;
        }

        .left .item.muted:last-child,
        .item:not(:first-child) {
            display: none;
        }

        .volume {
            width: 74px;
        }
    }
</style>
