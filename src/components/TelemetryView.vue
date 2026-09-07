<template>
    <div class="telemetry">
        <div class="cards">
            <div class="card">
                <span class="lab">vitesse</span>
                <span class="num value">{{ speed }}</span>
                <span class="lab sub">km/h</span>
            </div>
            <div class="card">
                <span class="lab">rpm</span>
                <span class="num value">{{ f.num(ecu.rpm) }}</span>
                <span class="lab sub">tr/min</span>
            </div>
            <div class="card">
                <span class="lab">rapport</span>
                <span class="num value">{{ f.num(ecu.gear) }}</span>
                <span class="lab sub">{{ ecu.gears ? `sur ${ecu.gears}` : "—" }}</span>
            </div>
        </div>

        <section class="section">
            <SpeedHistory :seconds="180" title="Vitesse" average />
        </section>

        <section class="section">
            <div class="section-head">
                <span class="name">Calculateur</span>
            </div>
            <div class="grid">
                <div class="pair"><span>Papillon</span><span class="num">{{ f.unit(ecu.throttle, "%") }}</span></div>
                <div class="pair"><span>Temp. eau</span><span class="num">{{ f.unit(ecu.water, "°C") }}</span></div>
                <div class="pair"><span>Press. huile</span><span class="num">{{ f.unit(ecu.oil, "bar", 1) }}</span></div>
                <div class="pair"><span>Tension</span><span class="num">{{ f.unit(ecu.volt, "V", 1) }}</span></div>
            </div>
            <span class="lab note">canaux à confirmer</span>
        </section>

        <Expandable
            v-for="group in groups"
            :key="group.name"
            :name="group.name"
            :summary="group.summary"
            :rows="group.rows"
        />
    </div>
</template>

<script setup lang="ts">
    /**
     * The Télémétrie tab: everything the car reports, in full precision.
     *
     * Engine channels (`ecu`) are not emitted by the current pipeline — the
     * design marks them "canaux à confirmer" — so they render as placeholders
     * rather than being hidden, which keeps the page honest about what exists
     * and what is merely planned. GPS, connectivity and battery are live.
     */
    import { ref, computed, onMounted, onBeforeUnmount } from "vue"
    import SpeedHistory from "@components/SpeedHistory.vue"
    import Expandable from "@components/Expandable.vue"
    import { Event, type Metadata, defaultMetadata, dispatchEvent } from "@types"
    import * as f from "@lib/format"

    const metadata = ref<Metadata>(defaultMetadata)

    const modem = computed(() => metadata.value.modem ?? {})
    const ups = computed(() => metadata.value.ups ?? {})
    const ecu = computed(() => metadata.value.ecu ?? {})
    const sys = computed(() => metadata.value.system ?? {})

    const speed = computed(() => {
        const value = f.speedKmh(modem.value.spd)
        return value === null ? f.EMPTY : f.num(value)
    })

    /** "86 % · 12.4 V", or a single dash when neither half is known. */
    function pair(left: string, right: string): string {
        if (left === f.EMPTY && right === f.EMPTY) return f.EMPTY
        return `${left} · ${right}`
    }

    const groups = computed(() => [
        {
            name: "GPS",
            summary: pair(f.coord(modem.value.lat), f.coord(modem.value.lon)),
            rows: [
                ["Latitude", f.coord(modem.value.lat)],
                ["Longitude", f.coord(modem.value.lon)],
                ["Altitude", f.unit(modem.value.alt, "m")],
                ["Satellites", f.num(modem.value.sat)],
                ["HDOP", f.num(modem.value.hdop, 1)]
            ] as Array<[string, string]>
        },
        {
            name: "Système",
            summary: pair(f.unit(sys.value.cpu, "%"), f.unit(sys.value.temp, "°C")),
            rows: [
                ["Charge CPU", f.unit(sys.value.cpu, "%")],
                ["Consommation", f.unit(sys.value.watt, "W")],
                ["Température", f.unit(sys.value.temp, "°C")],
                ["Ambiante", f.unit(sys.value.ambient, "°C")]
            ] as Array<[string, string]>
        },
        {
            name: "Connectivité",
            summary: pair(modem.value.tech ?? f.EMPTY, f.unit(modem.value.signal, "%")),
            rows: [
                ["Technologie", modem.value.tech ?? f.EMPTY],
                ["Signal", f.unit(modem.value.signal, "%")]
            ] as Array<[string, string]>
        },
        {
            name: "Batterie",
            summary: pair(f.unit(ups.value.p, "%"), f.unit(ups.value.v, "V", 1)),
            rows: [
                ["Charge", f.unit(ups.value.p, "%")],
                ["Tension", f.unit(ups.value.v, "V", 1)],
                ["Courant", f.unit(ups.value.a, "A", 2)],
                ["Puissance", f.unit(ups.value.w, "W", 1)]
            ] as Array<[string, string]>
        }
    ])

    function metadataHandler(event: any): void {
        metadata.value = event.detail as Metadata
    }

    onMounted(() => {
        document.addEventListener(Event.METADATA, metadataHandler)
        dispatchEvent(Event.RESEND, Event.METADATA)
    })

    onBeforeUnmount(() => document.removeEventListener(Event.METADATA, metadataHandler))
</script>

<style scoped>
    .telemetry {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        width: 100%;
        max-width: 720px;
        margin: 0 auto;
    }

    .cards {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        padding: 14px 16px;
    }

    .card {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 11px 12px;
        border-radius: 9px;
        background: var(--surface-4);
        box-shadow: inset 0 0 0 1px var(--line-4);
    }

    .card .lab {
        letter-spacing: 0.1em;
    }

    .card .sub {
        letter-spacing: 0.06em;
    }

    .value {
        font: 500 27px/1.2 var(--font);
    }

    .section {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 14px 16px;
        border-top: 1px solid var(--line);
    }

    .section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .name {
        font: 500 13px var(--font);
    }

    .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px 18px;
    }

    .pair {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        font: 400 12px var(--font);
        color: var(--text-4);
    }

    .pair .num {
        color: var(--text);
    }

    .note {
        color: var(--text-3);
        letter-spacing: 0.06em;
    }

    /* The speed chart is short on phones and taller where there is room. */
    .section :deep(.chart) {
        height: 104px;
    }

    @media (min-width: 769px) {
        .section :deep(.chart) {
            height: 160px;
        }
    }
</style>
