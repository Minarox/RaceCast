<template>
    <svg
        class="icon"
        :viewBox="VIEW_BOX"
        :style="{ width: size + 'px', height: size + 'px' }"
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
        v-html="icons[name]"
    />
</template>

<script setup lang="ts">
    import { icons, VIEW_BOX, type IconName } from "@assets/icons"

    withDefaults(
        defineProps<{
            name: IconName
            size?: number
        }>(),
        { size: 16 }
    )
</script>

<style scoped>
    .icon {
        display: block;
        flex: none;
    }
</style>
