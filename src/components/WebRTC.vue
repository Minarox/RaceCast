<script lang="ts">
  export default {
    name: "WebRTC",
  };
</script>

<template>
  <video autoplay controls muted playsinline></video>
</template>

<style lang="scss" scoped>
  video {
    bottom: 0;
    height: 100%;
    left: 0;
    position: absolute;
    right: 0;
    top: 0;
    width: 100%;
  }
</style>
