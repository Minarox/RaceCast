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
  border-radius: var(--border-radius);
  display: inline-flex;
  height: 480px;
  justify-content: center;
  overflow: hidden;
  width: 852px;

  video {
    height: 100%;
    object-fit: cover;
    width: 100%;
  }
}
</style>
