<template>
  <Status />
  <main>
    <section>
      <Stream />
      <div>
        <OpenLayers />
        <Temperature />
      </div>
    </section>
    <section>
      <Speed />
      <Inertial />
    </section>
  </main>
</template>

<script>
import Status from "@/components/Status.vue";
import Stream from "@/components/Stream.vue";
import OpenLayers from "@/components/OpenLayers.vue";
import Temperature from "@/components/Temperature.vue";
import Speed from "@/components/Speed.vue";
import Inertial from "@/components/Inertial.vue";

export default {
  name: "App",
  components: {
    Status,
    Stream,
    OpenLayers,
    Temperature,
    Speed,
    Inertial,
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

::-webkit-scrollbar {
  width: 14px;
}

::-webkit-scrollbar-thumb {
  border: solid 4px transparent;
  border-radius: 14px;
  box-shadow: inset 0 0 14px 14px black;
}

::-webkit-scrollbar-button {
  display: none;
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

  #app {
    display: flex;
    flex-flow: column nowrap;
    gap: 1rem;
    height: 100%;
    width: 100%;

    main {
      display: grid;
      grid-gap: 1rem;
      grid-template-rows: 1.4fr 0.6fr;
      height: 100%;
      width: 100%;

      > section {
        display: grid;
        grid-gap: 1rem;
        grid-template-columns: 1.3fr 0.7fr;

        &:last-of-type {
          grid-template-columns: 1.2fr 0.8fr;
        }

        > div {
          align-items: center;
          display: grid;
          flex-flow: column nowrap;
          grid-gap: 1rem;
          grid-template-rows: 1fr auto;
        }
      }
    }
  }
}
</style>
