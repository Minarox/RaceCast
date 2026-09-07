<template>
    <Transition name="panel">
        <div v-if="open" class="overlay" @click.self="close">
            <section class="panel" role="dialog" aria-label="Réglages">
                <header>
                    <span class="title">Réglages</span>
                    <button type="button" aria-label="Fermer" @click="close">
                        <Icon name="x" :size="16" />
                    </button>
                </header>

                <div class="body">
                    <section class="group">
                        <span class="lab">affichage</span>

                        <label class="row">
                            <span>Caméra principale</span>
                            <select :value="settings.mainCamera" @change="setMainCamera">
                                <option v-if="!cameras.length" :value="0">—</option>
                                <option v-for="(camera, index) in cameras" :key="index" :value="index">
                                    {{ nameOf(camera) }}
                                </option>
                            </select>
                        </label>

                        <Toggle
                            label="Autres caméras"
                            :on="settings.showOtherCameras"
                            @change="update('showOtherCameras', $event)"
                        />
                        <Toggle
                            label="Vitesse en surimpression"
                            :on="settings.showSpeed"
                            @change="update('showSpeed', $event)"
                        />
                        <Toggle label="Carte GPS" :on="settings.showMap" @change="update('showMap', $event)" />
                    </section>

                    <hr />

                    <section class="group">
                        <span class="lab">image</span>

                        <Toggle
                            label="Amélioration d'image (FSR)"
                            :on="settings.fsr.enabled"
                            @change="setFSREnabled"
                        />

                        <label v-if="settings.fsr.enabled" class="row">
                            <span>Netteté</span>
                            <input
                                class="slider"
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                :value="sharpnessPercent"
                                @input="setSharpness"
                            />
                        </label>

                        <span class="lab note">
                            Rehausse l'image sur la caméra principale. Demande un GPU — à couper si
                            la lecture saccade.
                        </span>
                    </section>

                    <hr />

                    <section class="group">
                        <span class="lab">différé</span>

                        <div class="row">
                            <span>Taille du tampon</span>
                            <div class="segmented" role="group" aria-label="Taille du tampon">
                                <button
                                    v-for="choice in bufferChoices"
                                    :key="choice"
                                    type="button"
                                    :class="{ on: settings.bufferSeconds === choice }"
                                    @click="update('bufferSeconds', choice)"
                                >
                                    {{ f.bufferLabel(choice) }}
                                </button>
                            </div>
                        </div>

                        <Toggle
                            label="Marqueurs de coupure"
                            :on="settings.showMarkers"
                            @change="update('showMarkers', $event)"
                        />
                    </section>

                    <hr />

                    <section class="group">
                        <span class="lab">audio</span>

                        <label class="row">
                            <span>Volume général</span>
                            <input
                                class="slider"
                                type="range"
                                min="0"
                                max="100"
                                step="1"
                                :value="Math.round(settings.volume * 100)"
                                @input="setVolume"
                            />
                        </label>

                        <Toggle
                            label="Mémoriser par source"
                            :on="settings.rememberVolumes"
                            @change="update('rememberVolumes', $event)"
                        />
                    </section>

                    <hr />

                    <section class="group">
                        <span class="lab">diagnostic</span>
                        <div class="stat"><span>Dernière mise à jour</span><span class="num">{{ updated }}</span></div>
                        <div class="stat"><span>Spectateurs</span><span class="num">{{ viewers || f.EMPTY }}</span></div>
                        <div class="stat"><span>Pistes</span><span class="num">{{ tracks }}</span></div>
                    </section>
                </div>
            </section>
        </div>
    </Transition>
</template>

<script setup lang="ts">
    /**
     * Preferences sheet.
     *
     * Every control here changes something in this browser only — what to
     * show, how far back the rewind bar reaches, how loud each source is. The
     * diagnostic block at the bottom is read-only on purpose: it reports what
     * the site is receiving, and there is nothing on the car it could change.
     */
    import { ref, computed, onMounted, onBeforeUnmount } from "vue"
    import type { RemoteTrackPublication } from "livekit-client"
    import Icon from "@components/Icon.vue"
    import Toggle from "@components/Toggle.vue"
    import {
        Event,
        type Metadata,
        type Settings,
        defaultMetadata,
        defaultSettings,
        dispatchEvent,
        getSettings,
        saveSettings
    } from "@types"
    import * as f from "@lib/format"

    /** 2 min, 10 min, and "whatever the receiver still holds". */
    const bufferChoices = [120, 600, 0]

    const open = ref(false)
    const settings = ref<Settings>(defaultSettings)
    const cameras = ref<RemoteTrackPublication[]>([])
    const microphones = ref<RemoteTrackPublication[]>([])
    const metadata = ref<Metadata>(defaultMetadata)
    const viewers = ref(0)

    const updated = computed(() => f.clock(metadata.value.timestamp))

    const tracks = computed(() => `${cameras.value.length} vidéo · ${microphones.value.length} audio`)

    function nameOf(track: RemoteTrackPublication): string {
        return (track as any)?.trackInfo?.name ?? (track as any)?.trackName ?? "Caméra"
    }

    function update<K extends keyof Settings>(key: K, value: Settings[K]): void {
        saveSettings({ ...settings.value, [key]: value })
    }

    function setMainCamera(event: globalThis.Event): void {
        update("mainCamera", Number((event.target as HTMLSelectElement).value))
    }

    /**
     * RCAS reads sharpness as 0 = strongest … 2 = weakest, which is backwards
     * for a slider. The stored value keeps the renderer's own scale; only the
     * control is flipped, so "further right" means "sharper".
     */
    const sharpnessPercent = computed(() => Math.round(((2 - settings.value.fsr.sharpness) / 2) * 100))

    function setFSREnabled(enabled: boolean): void {
        update("fsr", { ...settings.value.fsr, enabled })
    }

    function setSharpness(event: globalThis.Event): void {
        const percent = Number((event.target as HTMLInputElement).value)
        update("fsr", { ...settings.value.fsr, sharpness: 2 - (percent / 100) * 2 })
    }

    function setVolume(event: globalThis.Event): void {
        update("volume", Number((event.target as HTMLInputElement).value) / 100)
    }

    function close(): void {
        open.value = false
    }

    /* --- live state --- */

    function settingsHandler(): void {
        settings.value = getSettings()
    }

    function camerasHandler(event: any): void {
        cameras.value = event.detail as RemoteTrackPublication[]
    }

    function microphonesHandler(event: any): void {
        microphones.value = event.detail as RemoteTrackPublication[]
    }

    function metadataHandler(event: any): void {
        metadata.value = event.detail as Metadata
    }

    function viewersHandler(event: any): void {
        viewers.value = event.detail as number
    }

    function showHandler(): void {
        open.value = !open.value
    }

    function keyHandler(event: KeyboardEvent): void {
        if (event.key === "Escape") close()
    }

    onMounted(() => {
        document.addEventListener(Event.SETTINGS, settingsHandler)
        document.addEventListener(Event.CAMERAS, camerasHandler)
        document.addEventListener(Event.MICROPHONES, microphonesHandler)
        document.addEventListener(Event.METADATA, metadataHandler)
        document.addEventListener(Event.VIEWERS, viewersHandler)
        document.addEventListener(Event.SHOW_SETTINGS, showHandler)
        document.addEventListener("keydown", keyHandler)

        settingsHandler()
        dispatchEvent(Event.RESEND, Event.CAMERAS)
        dispatchEvent(Event.RESEND, Event.MICROPHONES)
        dispatchEvent(Event.RESEND, Event.METADATA)
        dispatchEvent(Event.RESEND, Event.VIEWERS)
    })

    onBeforeUnmount(() => {
        document.removeEventListener(Event.SETTINGS, settingsHandler)
        document.removeEventListener(Event.CAMERAS, camerasHandler)
        document.removeEventListener(Event.MICROPHONES, microphonesHandler)
        document.removeEventListener(Event.METADATA, metadataHandler)
        document.removeEventListener(Event.VIEWERS, viewersHandler)
        document.removeEventListener(Event.SHOW_SETTINGS, showHandler)
        document.removeEventListener("keydown", keyHandler)
    })
</script>

<style scoped>
    .overlay {
        position: fixed;
        inset: 0;
        z-index: 60;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        background: rgba(14, 16, 24, 0.7);
        backdrop-filter: blur(2px);
    }

    .panel {
        width: min(390px, 100%);
        max-height: min(600px, 100%);
        display: flex;
        flex-direction: column;
        border-radius: var(--r-xl);
        background: var(--surface);
        box-shadow: 0 0 0 1px var(--line-5), 0 24px 60px rgba(0, 0, 0, 0.6);
        overflow: hidden;
    }

    header {
        flex: none;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 16px;
        border-bottom: 1px solid var(--line);
    }

    .title {
        font: 500 14px var(--font);
    }

    header button {
        display: flex;
        color: var(--text-4);
    }

    .body {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 18px;
    }

    .group {
        display: flex;
        flex-direction: column;
        gap: 11px;
    }

    .row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        font: 400 12.5px var(--font);
    }

    .note {
        letter-spacing: 0.04em;
        line-height: 1.5;
        text-transform: none;
        color: var(--text-5);
    }

    select {
        padding: 6px 10px;
        border-radius: var(--r-sm);
        font: 400 11.5px var(--font);
        color: var(--text-3);
        background: transparent;
        border: 1px solid var(--line-5);
        cursor: pointer;
    }

    select option {
        background: var(--surface);
        color: var(--text);
    }

    .segmented {
        display: flex;
        gap: 2px;
        padding: 3px;
        border-radius: 7px;
        background: var(--surface-3);
        box-shadow: inset 0 0 0 1px var(--line-2);
    }

    .segmented button {
        padding: 5px 9px;
        border-radius: 5px;
        font: 400 11px var(--font);
        color: var(--text-4);
    }

    .segmented button.on {
        font-weight: 500;
        color: var(--accent-soft);
        background: var(--accent-fill);
        box-shadow: inset 0 0 0 1px var(--accent-line);
    }

    .slider {
        width: 120px;
        height: 4px;
        border-radius: 2px;
        background: var(--line-4);
        appearance: none;
        -webkit-appearance: none;
        cursor: pointer;
    }

    .slider::-webkit-slider-thumb {
        appearance: none;
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: var(--text);
    }

    .slider::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border: 0;
        border-radius: 50%;
        background: var(--text);
    }

    hr {
        height: 1px;
        border: 0;
        background: linear-gradient(to right, transparent, var(--line-3) 15%, var(--line-3) 85%, transparent);
    }

    .stat {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        font: 400 12px var(--font);
        color: var(--text-4);
    }

    .stat .num {
        color: var(--text);
    }

    .panel-enter-active,
    .panel-leave-active {
        transition: opacity 0.18s ease;
    }

    .panel-enter-from,
    .panel-leave-to {
        opacity: 0;
    }
</style>
