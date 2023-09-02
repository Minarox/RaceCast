<script lang="ts">
  export default {
    name: "WebRTC",
  };
</script>

<template>
  <iframe
    allowfullscreen="true"
    frameborder="0"
    mozallowfullscreen="true"
    src="https://rallye.minarox.fr/watch.html"
    webkitallowfullscreen="true"
  ></iframe>
</template>

<style lang="scss" scoped>
  iframe {
    bottom: 0;
    height: 100%;
    left: 0;
    position: absolute;
    right: 0;
    top: 0;
    width: 100%;
  }
</style>
