<template>
  <main>
    <Status />
    <div>
      <Stream />
      <OpenLayers />
      <Speed />
      <Temperature />
    </div>
  </main>
</template>

<script>
import Status from "@/components/Status.vue";
import Stream from "@/components/Stream.vue";
import OpenLayers from "@/components/OpenLayers.vue";
import Speed from "@/components/Speed.vue";
import Temperature from "@/components/Temperature.vue";

export default {
  name: "App",
  components: {
    Status,
    Stream,
    OpenLayers,
    Speed,
    Temperature,
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
  overflow-x: hidden;
  padding: 1rem;
  width: 100vw;

  main {
    align-items: center;
    display: flex;
    flex-flow: column nowrap;
    gap: 1rem;
    justify-content: flex-start;

    > div {
      align-items: center;
      display: flex;
      flex-flow: row wrap;
      gap: 1rem;
      justify-content: flex-start;
    }
  }
}
</style>
