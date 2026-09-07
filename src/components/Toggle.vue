<template>
    <label class="toggle">
        <span class="label">{{ label }}</span>
        <button
            type="button"
            class="switch"
            role="switch"
            :aria-checked="on"
            :aria-label="label"
            @click="emit('change', !on)"
        >
            <span class="knob"></span>
        </button>
    </label>
</template>

<script setup lang="ts">
    /** Labelled on/off switch, styled to match the design's settings rows. */
    defineProps<{
        label: string
        on: boolean
    }>()

    const emit = defineEmits<{ change: [value: boolean] }>()
</script>

<style scoped>
    .toggle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        font: 400 12.5px var(--font);
    }

    .switch {
        flex: none;
        position: relative;
        width: 36px;
        height: 20px;
        border-radius: 11px;
        background: var(--line-2);
        box-shadow: inset 0 0 0 1px var(--line-5);
        transition: background 0.15s ease, box-shadow 0.15s ease;
    }

    .switch[aria-checked="true"] {
        background: var(--accent-fill-strong);
        box-shadow: inset 0 0 0 1px var(--accent-line);
    }

    .knob {
        position: absolute;
        left: 2px;
        top: 2px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--text-5);
        transition: transform 0.15s ease, background 0.15s ease;
    }

    .switch[aria-checked="true"] .knob {
        background: var(--accent-soft);
        transform: translateX(16px);
    }

    .switch:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
    }
</style>
