<template>
    <section class="history">
        <header>
            <span :class="titleClass">{{ title }}</span>
            <span class="num lab stats">{{ stats }}</span>
        </header>
        <div class="chart">
            <Sparkline :values="samples" />
        </div>
    </section>
</template>

<script setup lang="ts">
    /**
     * Rolling speed chart.
     *
     * Room metadata arrives roughly once a second, so the sample buffer is
     * simply capped at `seconds` entries rather than resampled against a real
     * clock — close enough for a trend line, and it costs no timer of its own.
     * A missing GPS speed is skipped, not recorded as 0, so a dropout leaves a
     * flat segment instead of a false dive to zero.
     */
    import { ref, computed, onMounted, onBeforeUnmount } from "vue"
    import Sparkline from "@components/Sparkline.vue"
    import { Event, type Metadata, dispatchEvent } from "@types"
    import { speedKmh, num, EMPTY } from "@lib/format"

    const props = withDefaults(
        defineProps<{
            seconds?: number
            title?: string
            average?: boolean
            /** Small monospace heading (sidebar) vs. regular text (telemetry page). */
            compact?: boolean
        }>(),
        { seconds: 45, title: "", average: false, compact: false }
    )

    const samples = ref<number[]>([])

    const titleClass = computed(() => (props.compact ? "lab" : "name"))

    const stats = computed(() => {
        if (!samples.value.length) return EMPTY

        const max = Math.max(...samples.value)
        if (!props.average) return `max ${num(max)}`

        const mean = samples.value.reduce((a, b) => a + b, 0) / samples.value.length
        return `max ${num(max)} · moy ${num(mean)}`
    })

    function metadataHandler(event: any): void {
        const speed = speedKmh((event.detail as Metadata).modem?.spd)
        if (speed === null) return

        samples.value.push(speed)
        if (samples.value.length > props.seconds) samples.value.splice(0, samples.value.length - props.seconds)
    }

    onMounted(() => {
        document.addEventListener(Event.METADATA, metadataHandler)
        dispatchEvent(Event.RESEND, Event.METADATA)
    })

    onBeforeUnmount(() => document.removeEventListener(Event.METADATA, metadataHandler))
</script>

<style scoped>
    .history {
        display: flex;
        flex-direction: column;
        gap: 7px;
        min-height: 0;
    }

    header {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 10px;
    }

    .name {
        font: 500 13px var(--font);
        color: var(--text);
    }

    .stats {
        letter-spacing: 0.06em;
        color: var(--text-4);
    }

    .chart {
        flex: 1;
        min-height: 56px;
        border-radius: var(--r-md);
        background: var(--surface-2);
        box-shadow: inset 0 0 0 1px var(--line-2);
        overflow: hidden;
    }
</style>
