<template>
    <div class="live">
        <div
            class="stage"
            @touchstart.passive="onTouchStart"
            @touchend.passive="onTouchEnd"
        >
            <VideoPlayer :track="mainCamera" :label="mainLabel" />

            <div v-if="mainCamera" class="scrim"></div>

            <span v-if="mainCamera" class="badge">
                <span class="dot"></span>
                {{ badge }}
            </span>

            <!-- Desktop and fullscreen show the speed over the picture; the
                 phone portrait layout has its own row under the video. -->
            <div v-if="showSpeedOverlay" class="speed-overlay">
                <span class="num value">{{ speed }}</span>
                <span class="unit">km/h</span>
            </div>

            <div v-if="cameras.length > 1" class="dots">
                <button
                    v-for="(camera, index) in cameras"
                    :key="camera.trackSid ?? index"
                    type="button"
                    class="dot-btn"
                    :class="{ on: index === mainIndex }"
                    :aria-label="`Caméra ${index + 1}`"
                    @click="mainIndex = index"
                ></button>
            </div>
        </div>

        <!-- Phone portrait: numbers under the picture, then a large map. -->
        <div class="phone-meta">
            <div class="speed-inline">
                <span class="num value">{{ speed }}</span>
                <span class="unit">km/h</span>
            </div>
            <div class="quick">
                <div class="quick-item">
                    <span class="lab">rapport</span>
                    <span class="num">{{ f.num(ecu.gear) }}</span>
                </div>
                <div class="quick-item">
                    <span class="lab">rpm</span>
                    <span class="num">{{ f.num(ecu.rpm) }}</span>
                </div>
            </div>
        </div>

        <div v-if="settings.showMap" class="phone-map">
            <MiniMap readout />
        </div>

        <!-- Desktop: the other cameras and the map sit in a strip under the hero. -->
        <div class="strip">
            <template v-if="settings.showOtherCameras">
                <button
                    v-for="(camera, index) in secondaryCameras"
                    :key="camera.trackSid ?? index"
                    type="button"
                    class="thumb"
                    :aria-label="`Afficher ${nameOf(camera)}`"
                    @click="mainIndex = indexOf(camera)"
                >
                    <VideoPlayer :track="camera" :label="nameOf(camera)" />
                    <span class="thumb-label">{{ labelOf(camera) }}</span>
                </button>
            </template>

            <div v-if="settings.showMap" class="strip-map">
                <MiniMap />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    /**
     * The whole live surface: hero picture, camera switching, speed readout,
     * and the map. It is one island rather than several because every part of
     * it reads the same two streams (the camera list and room metadata), and
     * splitting them would mean each fragment separately re-requesting state
     * over the event bus on mount.
     *
     * The desktop and phone layouts differ structurally, not just in spacing —
     * desktop puts the other cameras and the map in a strip under the hero,
     * phone stacks numbers and a full-width map and switches cameras by
     * swiping. Both markups are always present and CSS picks one, except the
     * speed readout, which would otherwise be announced twice by a screen
     * reader; that one is chosen in JS.
     */
    import { ref, computed, defineAsyncComponent, onMounted, onBeforeUnmount } from "vue"
    import type { RemoteTrackPublication } from "livekit-client"
    import VideoPlayer from "@components/VideoPlayer.vue"

    // OpenLayers is by far the heaviest thing on this page and nothing about
    // the video needs it, so the map loads on its own after the picture is up
    // — and never at all for viewers who turn it off.
    const MiniMap = defineAsyncComponent(() => import("@components/MiniMap.vue"))
    import {
        Event,
        type Metadata,
        type Settings,
        defaultMetadata,
        defaultSettings,
        dispatchEvent,
        getSettings
    } from "@types"
    import * as f from "@lib/format"

    const cameras = ref<RemoteTrackPublication[]>([])
    const metadata = ref<Metadata>(defaultMetadata)
    const settings = ref<Settings>(defaultSettings)
    const mainIndex = ref(0)
    const isPhone = ref(false)

    let media: MediaQueryList | null = null

    const mainCamera = computed(() => cameras.value[mainIndex.value] ?? null)
    const secondaryCameras = computed(() => cameras.value.filter((_, i) => i !== mainIndex.value))

    const ecu = computed(() => metadata.value.ecu ?? {})

    const speed = computed(() => {
        const value = f.speedKmh(metadata.value.modem?.spd)
        return value === null ? f.EMPTY : f.num(value)
    })

    const mainLabel = computed(() => (mainCamera.value ? nameOf(mainCamera.value) : "en attente du direct"))
    const badge = computed(() => (mainCamera.value ? labelOf(mainCamera.value) : ""))

    // Portrait phones get the speed in its own row; everyone else overlays it.
    const showSpeedOverlay = computed(() => !isPhone.value && settings.value.showSpeed)

    function nameOf(camera: RemoteTrackPublication): string {
        return (camera as any)?.trackInfo?.name ?? (camera as any)?.trackName ?? "Caméra"
    }

    function indexOf(camera: RemoteTrackPublication): number {
        return cameras.value.indexOf(camera)
    }

    function labelOf(camera: RemoteTrackPublication): string {
        return `CAM ${indexOf(camera) + 1} · ${nameOf(camera).toUpperCase()}`
    }

    /* --- swipe between cameras on touch devices --- */

    let touchX = 0

    function onTouchStart(event: TouchEvent): void {
        touchX = event.changedTouches[0]?.clientX ?? 0
    }

    function onTouchEnd(event: TouchEvent): void {
        if (cameras.value.length < 2) return

        const delta = (event.changedTouches[0]?.clientX ?? 0) - touchX
        if (Math.abs(delta) < 48) return

        const count = cameras.value.length
        mainIndex.value = (mainIndex.value + (delta < 0 ? 1 : count - 1)) % count
    }

    /* --- live state --- */

    function camerasHandler(event: any): void {
        cameras.value = event.detail as RemoteTrackPublication[]
        if (mainIndex.value >= cameras.value.length) mainIndex.value = 0
    }

    function metadataHandler(event: any): void {
        metadata.value = event.detail as Metadata
    }

    function settingsHandler(): void {
        settings.value = getSettings()

        const preferred = Number(settings.value.mainCamera)
        if (Number.isFinite(preferred) && preferred < cameras.value.length) mainIndex.value = preferred
    }

    function mediaHandler(event: MediaQueryListEvent | MediaQueryList): void {
        isPhone.value = event.matches
    }

    onMounted(() => {
        media = window.matchMedia("(max-width: 768px)")
        mediaHandler(media)
        media.addEventListener("change", mediaHandler)

        document.addEventListener(Event.CAMERAS, camerasHandler)
        document.addEventListener(Event.METADATA, metadataHandler)
        document.addEventListener(Event.SETTINGS, settingsHandler)

        settingsHandler()
        dispatchEvent(Event.RESEND, Event.CAMERAS)
        dispatchEvent(Event.RESEND, Event.METADATA)
    })

    onBeforeUnmount(() => {
        media?.removeEventListener("change", mediaHandler)
        document.removeEventListener(Event.CAMERAS, camerasHandler)
        document.removeEventListener(Event.METADATA, metadataHandler)
        document.removeEventListener(Event.SETTINGS, settingsHandler)
    })
</script>

<style scoped>
    .live {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 14px;
    }

    .stage {
        flex: 1;
        min-height: 0;
        position: relative;
        border-radius: var(--r-lg);
        overflow: hidden;
        box-shadow: 0 0 0 1px var(--line-5);
    }

    .scrim {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(to top, rgba(14, 16, 24, 0.82) 0%, rgba(14, 16, 24, 0) 42%);
    }

    .badge {
        position: absolute;
        left: 14px;
        top: 14px;
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 6px 11px;
        border-radius: var(--r-sm);
        font: 500 11px var(--font);
        letter-spacing: 0.06em;
        color: var(--text);
        background: rgba(14, 16, 24, 0.72);
        backdrop-filter: blur(10px);
        box-shadow: inset 0 0 0 1px rgba(233, 233, 237, 0.14);
        pointer-events: none;
    }

    .badge .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--accent);
        box-shadow: 0 0 8px var(--accent);
    }

    .speed-overlay {
        position: absolute;
        left: 18px;
        bottom: 16px;
        display: flex;
        align-items: flex-end;
        gap: 8px;
        pointer-events: none;
    }

    .speed-overlay .value {
        font: 500 76px/0.84 var(--font);
        letter-spacing: -0.03em;
        text-shadow: 0 2px 24px rgba(0, 0, 0, 0.6);
    }

    .unit {
        font: 500 14px/1 var(--font);
        color: var(--text-3);
        padding-bottom: 8px;
    }

    .dots {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 10px;
        display: none;
        justify-content: center;
        gap: 6px;
    }

    .dot-btn {
        width: 6px;
        height: 3px;
        border-radius: 2px;
        background: rgba(233, 233, 237, 0.35);
        transition: width 0.2s ease;
    }

    .dot-btn.on {
        width: 16px;
        background: var(--accent);
    }

    .strip {
        flex: none;
        height: 128px;
        display: flex;
        gap: 12px;
    }

    .thumb {
        flex: 1;
        position: relative;
        min-width: 0;
        padding: 0;
        border-radius: var(--r-lg);
        overflow: hidden;
        box-shadow: 0 0 0 1px var(--line-5);
    }

    .thumb:hover {
        box-shadow: 0 0 0 1.5px var(--accent);
    }

    .thumb-label {
        position: absolute;
        left: 9px;
        top: 9px;
        padding: 4px 7px;
        border-radius: var(--r-xs);
        font: 500 9.5px var(--font-mono);
        letter-spacing: 0.1em;
        color: var(--text-2);
        background: rgba(14, 16, 24, 0.72);
        backdrop-filter: blur(8px);
        pointer-events: none;
    }

    .strip-map {
        width: 230px;
        flex: none;
        position: relative;
        border-radius: var(--r-lg);
        overflow: hidden;
        box-shadow: 0 0 0 1px var(--line-5);
    }

    .phone-meta,
    .phone-map {
        display: none;
    }

    @media (max-width: 768px) {
        .live {
            padding: 0;
            gap: 0;
            overflow-y: auto;
        }

        .stage {
            flex: none;
            aspect-ratio: 16 / 9;
            border-radius: 0;
            box-shadow: none;
        }

        .dots {
            display: flex;
        }

        .strip {
            display: none;
        }

        .phone-meta {
            flex: none;
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 12px;
            padding: 14px 16px 12px;
        }

        .speed-inline {
            display: flex;
            align-items: flex-end;
            gap: 7px;
        }

        .speed-inline .value {
            font: 500 62px/0.84 var(--font);
            letter-spacing: -0.03em;
        }

        .speed-inline .unit {
            font-size: 13px;
            padding-bottom: 6px;
        }

        .quick {
            display: flex;
            gap: 16px;
        }

        .quick-item {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 3px;
        }

        .quick-item .num {
            font: 500 18px/1 var(--font);
        }

        .phone-map {
            display: block;
            flex: 1;
            min-height: 210px;
            margin: 0 16px 14px;
            border-radius: var(--r-lg);
            overflow: hidden;
            box-shadow: 0 0 0 1px var(--line-5);
        }
    }

    /* Fullscreen (design 07): the picture fills the screen and everything
       else floats over it. */
    :global(html:fullscreen) .live {
        padding: 0;
        gap: 0;
    }

    :global(html:fullscreen) .stage {
        border-radius: 0;
        box-shadow: none;
    }

    :global(html:fullscreen) .strip,
    :global(html:fullscreen) .phone-meta,
    :global(html:fullscreen) .phone-map {
        display: none;
    }
</style>
