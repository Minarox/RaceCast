<template>
  <Status />
</template>

<script>
import Status from "@/components/Status.vue";

export default {
  name: "App",
  components: {
    Status,
  },
};
</script>

<style lang="scss">
:root {
  --border-radius: 8px;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background-color: #eeeeee;
  color: black;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  height: 100vh;
  -moz-osx-font-smoothing: grayscale;
  padding: 1rem;
  width: 100vw;
}
</style>
