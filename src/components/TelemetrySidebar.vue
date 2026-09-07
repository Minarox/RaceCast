<template>
    <aside class="sidebar">
        <section class="block">
            <span class="lab">moteur</span>
            <div class="cards">
                <div class="card">
                    <div class="lab tight">rpm</div>
                    <div class="num value">{{ f.num(ecu.rpm) }}</div>
                </div>
                <div class="card narrow">
                    <div class="lab tight">rapport</div>
                    <div class="num value">{{ f.num(ecu.gear) }}</div>
                </div>
            </div>

            <div class="bar">
                <span class="lab">papillon</span>
                <div class="track"><span class="fill accent" :style="{ width: pct(ecu.throttle) }"></span></div>
                <span class="num readout">{{ f.unit(ecu.throttle, "%") }}</span>
            </div>
            <div class="bar">
                <span class="lab">frein</span>
                <div class="track"><span class="fill" :style="{ width: pct(ecu.brake) }"></span></div>
                <span class="num readout">{{ f.unit(ecu.brake, "%") }}</span>
            </div>
        </section>

        <hr />

        <section class="block tight-gap">
            <span class="lab">calculateur</span>
            <div class="row"><span>Température eau</span><span class="num">{{ f.unit(ecu.water, "°C") }}</span></div>
            <div class="row"><span>Pression huile</span><span class="num">{{ f.unit(ecu.oil, "bar", 1) }}</span></div>
            <div class="row"><span>Tension</span><span class="num">{{ f.unit(ecu.volt, "V", 1) }}</span></div>
            <span class="lab note">canaux à confirmer</span>
        </section>

        <hr />

        <section class="block tight-gap">
            <span class="lab">système</span>
            <div class="row">
                <span>Charge CPU</span>
                <span class="num">{{ pair(f.unit(sys.cpu, "%"), f.unit(sys.watt, "W")) }}</span>
            </div>
            <div class="row">
                <span>Température</span>
                <span class="num">{{ pair(f.unit(sys.temp, "°C"), f.unit(sys.ambient, "°C")) }}</span>
            </div>
            <div class="row">
                <span>Batterie</span>
                <span class="num">{{ pair(f.unit(ups.p, "%"), f.unit(ups.v, "V", 1)) }}</span>
            </div>
        </section>

        <SpeedHistory class="speed" :seconds="45" title="vitesse · 45 s" compact />
    </aside>
</template>

<script setup lang="ts">
    /**
     * The desktop live sidebar.
     *
     * `moteur` and `calculateur` describe engine channels the emitter does not
     * send yet (the design labels them "canaux à confirmer"); they render as
     * placeholders rather than being hidden, so the panel keeps its designed
     * shape and starts showing real values the day those channels exist. The
     * `système` and battery rows work the same way — only the UPS half of the
     * battery row has live data today.
     */
    import { ref, computed, onMounted, onBeforeUnmount } from "vue"
    import SpeedHistory from "@components/SpeedHistory.vue"
    import { Event, type Metadata, defaultMetadata, dispatchEvent } from "@types"
    import * as f from "@lib/format"

    const metadata = ref<Metadata>(defaultMetadata)

    const ecu = computed(() => metadata.value.ecu ?? {})
    const sys = computed(() => metadata.value.system ?? {})
    const ups = computed(() => metadata.value.ups ?? {})

    /** A 0-100 channel as a CSS width; unknown reads as an empty bar. */
    function pct(value: number | null | undefined): string {
        return typeof value === "number" && Number.isFinite(value)
            ? `${Math.max(0, Math.min(100, value))}%`
            : "0%"
    }

    /** "86 % · 12.4 V", collapsing to a single em dash when neither is known. */
    function pair(left: string, right: string): string {
        if (left === f.EMPTY && right === f.EMPTY) return f.EMPTY
        return `${left} · ${right}`
    }

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
    .sidebar {
        width: 306px;
        flex: none;
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 16px;
        overflow-y: auto;
        border-left: 1px solid var(--line);
        background: rgba(26, 28, 42, 0.7);
    }

    .block {
        display: flex;
        flex-direction: column;
        gap: 9px;
    }

    .block.tight-gap {
        gap: 7px;
    }

    .lab.tight {
        letter-spacing: 0.1em;
    }

    .cards {
        display: flex;
        gap: 9px;
    }

    .card {
        flex: 1;
        padding: 10px 12px;
        border-radius: var(--r-md);
        background: var(--surface-4);
        box-shadow: inset 0 0 0 1px var(--line-4);
    }

    .card.narrow {
        flex: none;
        width: 76px;
    }

    .value {
        font: 500 26px/1.25 var(--font);
    }

    .bar {
        display: flex;
        align-items: center;
        gap: 9px;
    }

    .bar .lab {
        width: 52px;
    }

    .track {
        flex: 1;
        height: 6px;
        border-radius: 3px;
        background: var(--line-2);
        overflow: hidden;
    }

    .fill {
        display: block;
        height: 100%;
        background: var(--text-6);
        transition: width 0.2s linear;
    }

    .fill.accent {
        background: linear-gradient(90deg, var(--accent-line), var(--accent));
    }

    .readout {
        width: 44px;
        text-align: right;
        font: 400 11px var(--font);
        color: var(--text-3);
    }

    hr {
        height: 1px;
        border: 0;
        background: linear-gradient(to right, transparent, var(--line-2) 20%, var(--line-2) 80%, transparent);
    }

    .row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        font: 400 12px var(--font);
        color: var(--text-4);
    }

    .row .num {
        color: var(--text);
    }

    .note {
        color: var(--text-3);
        letter-spacing: 0.06em;
    }

    .speed {
        flex: 1;
        min-height: 74px;
    }
</style>
