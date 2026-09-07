<template>
    <section class="expandable">
        <button type="button" class="head" :aria-expanded="open" @click="open = !open">
            <span class="name">{{ name }}</span>
            <span class="right">
                <span class="num lab summary">{{ summary }}</span>
                <Icon :name="open ? 'caret-up' : 'caret-down'" :size="13" />
            </span>
        </button>

        <div v-if="open" class="rows">
            <div v-for="[label, value] in rows" :key="label" class="row">
                <span>{{ label }}</span>
                <span class="num">{{ value }}</span>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
    /**
     * A telemetry group that shows its headline value collapsed and the full
     * channel list when opened — the pattern the design uses for GPS, system,
     * connectivity and battery.
     */
    import { ref } from "vue"
    import Icon from "@components/Icon.vue"

    defineProps<{
        name: string
        /** Headline shown while collapsed, e.g. "44.0812 · 7.4021". */
        summary: string
        rows: Array<[string, string]>
    }>()

    const open = ref(false)
</script>

<style scoped>
    .expandable {
        border-top: 1px solid var(--line);
    }

    .head {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 15px 16px;
        text-align: left;
    }

    .name {
        font: 500 13px var(--font);
    }

    .right {
        display: flex;
        align-items: center;
        gap: 9px;
        color: var(--text-5);
    }

    .summary {
        letter-spacing: 0.06em;
        color: var(--text-3);
    }

    .rows {
        display: flex;
        flex-direction: column;
        gap: 7px;
        padding: 0 16px 15px;
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
</style>
