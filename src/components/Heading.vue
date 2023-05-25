<template>
  <header>
    <p>{{ title }}</p>
  </header>
</template>

<script>
export default {
  name: "TitleComponent",
  props: {
    title: {
      type: String,
      required: true,
    },
  },
};
</script>

<style lang="scss" scoped>
header {
  background-color: white;
  border-radius: var(--border-radius) var(--border-radius) 0 0;
  padding: 0.9rem;
  text-align: center;
  width: 100%;
}
</style>
