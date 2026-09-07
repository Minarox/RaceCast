<template>
    <div class="map">
        <div ref="host" class="canvas"></div>

        <div v-if="!hasFix" class="nofix">
            <span class="lab">pas de fix gps</span>
        </div>

        <span v-if="readout && hasFix" class="readout num">
            <span>{{ altitude }}</span>
            <span>{{ satellites }}</span>
        </span>

        <button
            v-if="!following"
            class="recenter"
            type="button"
            aria-label="Recentrer sur la voiture"
            @click="recenter"
        >
            <Icon name="crosshair" :size="13" />
        </button>

        <!-- Required by the OSM tile usage policy. -->
        <a class="credit" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">
            © OpenStreetMap
        </a>
    </div>
</template>

<script setup lang="ts">
    /**
     * OpenStreetMap view of the car's live position.
     *
     * OSM's raster tiles are light; rather than pull in a themed tile
     * provider (and an API key with it) the layer is inverted in CSS to sit
     * in the dark UI. The map follows the car until the viewer pans away —
     * fighting a viewer for control of the viewport is worse than showing a
     * recentre button, so panning latches `following` off until they ask for
     * it back.
     */
    import { ref, computed, onMounted, onBeforeUnmount, shallowRef } from "vue"
    import { Feature, Map, View } from "ol/index"
    import { Point } from "ol/geom"
    import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer"
    import { OSM, Vector as VectorSource } from "ol/source"
    import { useGeographic } from "ol/proj"
    import "ol/ol.css"
    import Icon from "@components/Icon.vue"
    import { Event, type Metadata } from "@types"
    import { dispatchEvent } from "@types"
    import { num, EMPTY } from "@lib/format"

    withDefaults(defineProps<{ readout?: boolean }>(), { readout: false })

    const host = ref<HTMLElement | null>(null)
    const map = shallowRef<Map | null>(null)
    const marker = shallowRef<Point | null>(null)

    const following = ref(true)
    const hasFix = ref(false)
    const alt = ref<number | null>(null)
    const sat = ref<number | null>(null)

    const altitude = computed(() => (alt.value === null ? EMPTY : `${num(alt.value)} m`))
    const satellites = computed(() => (sat.value === null ? EMPTY : `${num(sat.value)} sat`))

    function recenter(): void {
        following.value = true

        const position = marker.value?.getCoordinates()
        if (position && map.value) map.value.getView().animate({ center: position, duration: 300 })
    }

    function metadataHandler(event: any): void {
        const { modem } = event.detail as Metadata
        if (!modem) return

        alt.value = modem.alt
        sat.value = modem.sat

        if (modem.lat === null || modem.lon === null) {
            hasFix.value = false
            return
        }

        hasFix.value = true

        const position: [number, number] = [modem.lon, modem.lat]
        marker.value?.setCoordinates(position)

        if (following.value) map.value?.getView().animate({ center: position, duration: 300 })
    }

    onMounted(() => {
        useGeographic()

        const point = new Point([0, 0])
        marker.value = point

        const instance = new Map({
            target: host.value as HTMLElement,
            controls: [],
            layers: [
                new TileLayer({ source: new OSM({ wrapX: false }), className: "osm-dark" }),
                new VectorLayer({
                    source: new VectorSource({ features: [new Feature(point)], wrapX: false }),
                    style: {
                        "circle-radius": 6,
                        "circle-fill-color": "#9184d9",
                        "circle-stroke-color": "rgba(145,132,217,0.35)",
                        "circle-stroke-width": 6
                    }
                })
            ],
            view: new View({ center: [0, 0], zoom: 15 })
        })

        // Any manual pan/zoom hands control to the viewer until they ask to
        // follow the car again.
        instance.on("pointerdrag", () => (following.value = false))
        map.value = instance

        document.addEventListener(Event.METADATA, metadataHandler)
        dispatchEvent(Event.RESEND, Event.METADATA)
    })

    onBeforeUnmount(() => {
        document.removeEventListener(Event.METADATA, metadataHandler)
        map.value?.setTarget(undefined)
        map.value = null
    })
</script>

<style scoped>
    .map {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: var(--surface-2);
    }

    .canvas {
        width: 100%;
        height: 100%;
    }

    /* Dark-mode OSM without a themed tile provider. */
    .canvas :deep(.osm-dark) {
        filter: invert(1) hue-rotate(180deg) brightness(0.82) contrast(0.92) saturate(0.7);
    }

    .nofix {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--surface-2);
    }

    .readout {
        position: absolute;
        left: 11px;
        bottom: 11px;
        display: flex;
        gap: 12px;
        padding: 5px 9px;
        border-radius: var(--r-sm);
        font: 400 10.5px var(--font);
        color: var(--text-2);
        background: rgba(14, 16, 24, 0.68);
        backdrop-filter: blur(8px);
        pointer-events: none;
    }

    .credit {
        position: absolute;
        right: 4px;
        bottom: 2px;
        font: 400 8.5px var(--font);
        color: var(--text-5);
        background: rgba(14, 16, 24, 0.5);
        padding: 1px 4px;
        border-radius: 3px;
    }

    .recenter {
        position: absolute;
        right: 9px;
        top: 9px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        border-radius: var(--r-sm);
        color: var(--text-2);
        background: rgba(14, 16, 24, 0.72);
        backdrop-filter: blur(8px);
    }
</style>
