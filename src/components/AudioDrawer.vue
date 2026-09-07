<template>
    <div class="audio">
        <!-- Playback runs whether or not the sheet is open. -->
        <AudioTrack
            v-for="mic in microphones"
            :key="mic.trackSid ?? nameOf(mic)"
            :track="mic"
            :volume="gainOf(mic)"
        />

        <Transition name="sheet">
            <div v-if="open" class="overlay" @click.self="close">
                <section class="sheet" role="dialog" aria-label="Sources audio">
                    <header>
                        <span class="title">Sources audio</span>
                        <button type="button" aria-label="Fermer" @click="close">
                            <Icon name="caret-down" :size="15" />
                        </button>
                    </header>

                    <p v-if="!microphones.length" class="empty lab">aucune source audio</p>

                    <div v-else class="sources">
                        <div
                            v-for="mic in microphones"
                            :key="mic.trackSid ?? nameOf(mic)"
                            class="source"
                            :class="{ off: volumeOf(mic) <= 0 }"
                        >
                            <button
                                type="button"
                                class="toggle"
                                :aria-label="`${volumeOf(mic) > 0 ? 'Couper' : 'Activer'} ${nameOf(mic)}`"
                                @click="toggle(mic)"
                            >
                                <Icon :name="volumeOf(mic) > 0 ? 'speaker-high' : 'speaker-slash'" :size="16" />
                            </button>

                            <div class="body">
                                <div class="line">
                                    <span class="name">{{ nameOf(mic) }}</span>
                                    <span class="lab">{{ describe(mic) }}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="1"
                                    :aria-label="`Volume ${nameOf(mic)}`"
                                    :value="Math.round(volumeOf(mic) * 100)"
                                    @input="setVolume(mic, $event)"
                                />
                            </div>
                        </div>
                    </div>

                    <hr />

                    <div class="master">
                        <span class="name">Volume général</span>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            aria-label="Volume général"
                            :value="Math.round(master * 100)"
                            @input="setMaster"
                        />
                        <span class="num readout">{{ Math.round(master * 100) }}</span>
                    </div>
                </section>
            </div>
        </Transition>
    </div>
</template>

<script setup lang="ts">
    /**
     * Audio engine and the sheet that controls it.
     *
     * The <audio> elements live here permanently — the sheet is only a panel
     * over them — so opening or closing it never interrupts playback. Levels
     * are stored per source name (not per LiveKit track SID, which changes on
     * every reconnect) so a viewer's mix survives the car dropping and coming
     * back.
     */
    import { ref, computed, onMounted, onBeforeUnmount } from "vue"
    import type { RemoteTrackPublication } from "livekit-client"
    import Icon from "@components/Icon.vue"
    import AudioTrack from "@components/AudioTrack.vue"
    import { Event, type Settings, defaultSettings, dispatchEvent, getSettings, saveSettings } from "@types"

    const microphones = ref<RemoteTrackPublication[]>([])
    const settings = ref<Settings>(defaultSettings)
    const open = ref(false)

    const master = computed(() => settings.value.volume ?? 0)

    function nameOf(mic: RemoteTrackPublication): string {
        return (mic as any)?.trackInfo?.name ?? (mic as any)?.trackName ?? "Micro"
    }

    /**
     * "stéréo · opus" / "mono" — read off the live track rather than assumed,
     * so it stays empty until the track is actually subscribed and reports
     * something. Channel count is only known once media is flowing.
     */
    function describe(mic: RemoteTrackPublication): string {
        const parts: string[] = []

        const channels = mic.track?.mediaStreamTrack?.getSettings?.().channelCount
        if (channels) parts.push(channels > 1 ? "stéréo" : "mono")

        const mime = (mic as any)?.mimeType
        if (mime) parts.push(String(mime).replace(/^audio\//i, "").toLowerCase())

        return parts.join(" · ")
    }

    /** Per-source level, defaulting to full when the viewer never set one. */
    function volumeOf(mic: RemoteTrackPublication): number {
        const saved = settings.value.volumes?.[nameOf(mic)]
        return typeof saved === "number" ? saved : 1
    }

    /** What the element actually plays at. */
    function gainOf(mic: RemoteTrackPublication): number {
        return volumeOf(mic) * master.value
    }

    function persistVolume(mic: RemoteTrackPublication, value: number): void {
        const volumes = { ...(settings.value.volumes ?? {}), [nameOf(mic)]: value }
        saveSettings({ ...settings.value, volumes: settings.value.rememberVolumes ? volumes : {} })

        // Apply immediately even when the preference is not being persisted.
        settings.value = { ...settings.value, volumes }
    }

    function setVolume(mic: RemoteTrackPublication, event: globalThis.Event): void {
        persistVolume(mic, Number((event.target as HTMLInputElement).value) / 100)
    }

    function toggle(mic: RemoteTrackPublication): void {
        persistVolume(mic, volumeOf(mic) > 0 ? 0 : 1)
    }

    function setMaster(event: globalThis.Event): void {
        saveSettings({ ...settings.value, volume: Number((event.target as HTMLInputElement).value) / 100 })
    }

    function close(): void {
        open.value = false
    }

    /* --- live state --- */

    function microphonesHandler(event: any): void {
        microphones.value = event.detail as RemoteTrackPublication[]
    }

    function settingsHandler(): void {
        settings.value = getSettings()
    }

    function showHandler(): void {
        open.value = !open.value
    }

    function keyHandler(event: KeyboardEvent): void {
        if (event.key === "Escape") close()
    }

    onMounted(() => {
        document.addEventListener(Event.MICROPHONES, microphonesHandler)
        document.addEventListener(Event.SETTINGS, settingsHandler)
        document.addEventListener(Event.SHOW_AUDIO, showHandler)
        document.addEventListener("keydown", keyHandler)

        settingsHandler()
        dispatchEvent(Event.RESEND, Event.MICROPHONES)
    })

    onBeforeUnmount(() => {
        document.removeEventListener(Event.MICROPHONES, microphonesHandler)
        document.removeEventListener(Event.SETTINGS, settingsHandler)
        document.removeEventListener(Event.SHOW_AUDIO, showHandler)
        document.removeEventListener("keydown", keyHandler)
    })
</script>

<style scoped>
    .overlay {
        position: fixed;
        inset: 0;
        z-index: 50;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        background: rgba(14, 16, 24, 0.62);
        backdrop-filter: blur(2px);
    }

    .sheet {
        width: min(520px, 100%);
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 14px 16px calc(18px + var(--safe-bottom));
        border-radius: var(--r-xl) var(--r-xl) 0 0;
        background: rgba(24, 26, 40, 0.94);
        backdrop-filter: blur(18px);
        box-shadow: 0 -1px 0 var(--line-5), 0 -20px 44px rgba(0, 0, 0, 0.6);
    }

    header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .title {
        font: 500 14px var(--font);
    }

    header button {
        display: flex;
        color: var(--text-4);
    }

    .empty {
        padding: 8px 0 4px;
        color: var(--text-5);
    }

    .sources {
        display: flex;
        flex-direction: column;
        gap: 14px;
    }

    .source {
        display: flex;
        align-items: center;
        gap: 11px;
    }

    .source.off {
        opacity: 0.45;
    }

    .toggle {
        flex: none;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: var(--r-md);
        color: var(--accent-soft);
        background: var(--accent-fill);
        box-shadow: inset 0 0 0 1px var(--accent-line);
    }

    .source.off .toggle {
        color: var(--text-4);
        background: none;
        box-shadow: inset 0 0 0 1px var(--line-5);
    }

    .body {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .line {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 10px;
    }

    .name {
        font: 400 12.5px var(--font);
    }

    hr {
        height: 1px;
        border: 0;
        background: linear-gradient(to right, transparent, var(--line-3) 15%, var(--line-3) 85%, transparent);
    }

    .master {
        display: flex;
        align-items: center;
        gap: 11px;
    }

    .master .name {
        font-weight: 500;
        color: var(--text-3);
    }

    .master input {
        flex: 1;
    }

    .readout {
        width: 22px;
        text-align: right;
        font: 400 11.5px var(--font);
        color: var(--text-4);
    }

    input[type="range"] {
        width: 100%;
        height: 4px;
        border-radius: 2px;
        background: var(--line-4);
        appearance: none;
        -webkit-appearance: none;
        cursor: pointer;
    }

    input[type="range"]::-webkit-slider-thumb {
        appearance: none;
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: var(--text);
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
    }

    input[type="range"]::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border: 0;
        border-radius: 50%;
        background: var(--text);
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
    }

    .sheet-enter-active,
    .sheet-leave-active {
        transition: opacity 0.2s ease;
    }

    .sheet-enter-active .sheet,
    .sheet-leave-active .sheet {
        transition: transform 0.2s ease;
    }

    .sheet-enter-from,
    .sheet-leave-to {
        opacity: 0;
    }

    .sheet-enter-from .sheet,
    .sheet-leave-to .sheet {
        transform: translateY(100%);
    }
</style>
