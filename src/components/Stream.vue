<template>
  <section>
    <video autoplay controls />
  </section>
</template>

<script>
export default {
  name: "StreamComponent",
};
</script>

<style lang="scss" scoped>
section {
  align-items: center;
  background-color: lightgrey;
  border-radius: var(--border-radius);
  display: flex;
  justify-content: center;
  overflow: hidden;
  position: relative;

  video {
    bottom: 0;
    height: 100%;
    left: 0;
    position: absolute;
    right: 0;
    top: 0;
    width: 100%;
  }
}
</style>
