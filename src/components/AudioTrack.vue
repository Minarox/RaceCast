<template>
    <audio ref="element" autoplay playsinline></audio>
</template>

<script setup lang="ts">
    /**
     * One <audio> element bound to a LiveKit audio publication.
     *
     * Kept as its own component so the list of microphones can be rendered
     * with v-for while each element still gets a stable ref and its own
     * attach/detach lifecycle — managing an array of element refs by hand is
     * where this kind of code usually starts leaking subscriptions.
     *
     * Audio always plays from the live WebRTC track, including while the video
     * is rewound: the receiver's HLS window carries audio as a separate stream
     * per microphone, and mixing a rewound picture with re-synced replay audio
     * is a bigger change than the design calls for. Rewinding therefore mutes
     * nothing — it just leaves the sound on the live edge.
     */
    import { ref, watch, onMounted, onBeforeUnmount } from "vue"
    import type { RemoteTrackPublication } from "livekit-client"

    const props = defineProps<{
        track: RemoteTrackPublication
        /** Final gain, already multiplied by the master volume. */
        volume: number
    }>()

    const element = ref<HTMLAudioElement | null>(null)

    function attach(): void {
        if (!element.value) return

        props.track.setSubscribed(true)
        props.track.track?.attach(element.value)
        apply()
    }

    function apply(): void {
        if (!element.value) return

        element.value.volume = Math.max(0, Math.min(1, props.volume))
        element.value.muted = props.volume <= 0
    }

    watch(() => props.volume, apply)
    watch(() => props.track, attach)

    onMounted(attach)

    onBeforeUnmount(() => {
        if (element.value) props.track.track?.detach(element.value)
    })
</script>

<style scoped>
    audio {
        display: none;
    }
</style>
