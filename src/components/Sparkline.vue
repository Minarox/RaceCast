<template>
    <svg class="spark" :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" aria-hidden="true">
        <path v-if="area" :d="area" class="fill" />
        <path v-if="line" :d="line" class="stroke" />
    </svg>
</template>

<script setup lang="ts">
    /**
     * Minimal filled sparkline. Deliberately hand-drawn SVG rather than a
     * charting library: the design's charts have no axes, ticks, tooltips or
     * legend, and shipping a chart engine to draw two <path>s would dominate
     * the page's JavaScript budget.
     *
     * The viewBox is fixed and stretched with preserveAspectRatio="none", so
     * the same component fits both the 260×70 sidebar slot and the full-width
     * telemetry card without recomputing on resize.
     */
    import { computed } from "vue"

    const props = withDefaults(
        defineProps<{
            values: number[]
            /** Lower bound of the y axis; the upper bound is the series max. */
            min?: number
        }>(),
        { min: 0 }
    )

    const W = 260
    const H = 70

    const points = computed<Array<[number, number]>>(() => {
        const values = props.values
        if (values.length < 2) return []

        const max = Math.max(...values, props.min + 1)
        const span = max - props.min || 1
        const step = W / (values.length - 1)

        return values.map((value, index) => {
            const y = H - ((value - props.min) / span) * H
            return [index * step, Math.max(0, Math.min(H, y))]
        })
    })

    const line = computed(() => {
        if (!points.value.length) return ""
        return points.value.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ")
    })

    const area = computed(() => (line.value ? `${line.value} L${W} ${H} L0 ${H} Z` : ""))
</script>

<style scoped>
    .spark {
        display: block;
        width: 100%;
        height: 100%;
    }

    .stroke {
        fill: none;
        stroke: var(--accent);
        stroke-width: 1.6;
        vector-effect: non-scaling-stroke;
        stroke-linejoin: round;
    }

    .fill {
        fill: rgba(145, 132, 217, 0.13);
        stroke: none;
    }
</style>
