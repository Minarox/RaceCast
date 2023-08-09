<template>
  <section>
    <iframe
      allowfullscreen="true"
      frameborder="0"
      mozallowfullscreen="true"
      src="https://rallye.minarox.fr/watch.html"
      webkitallowfullscreen="true"
    ></iframe>
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

  iframe {
    border: none;
    height: 100%;
    width: 100%;
  }
}
</style>
