<script lang="ts">
  import Status from "@/components/Status.vue";
  import State from "@/components/State.vue";
  import StreamSettings from "@/components/StreamSettings.vue";
  import OpenLayers from "@/components/OpenLayers.vue";
  import Speed from "@/components/Speed.vue";
  import Inertial from "@/components/Inertial.vue";

  export default {
    name: "SidePanel",
    components: { Status, State, StreamSettings, OpenLayers, Speed, Inertial },
    data() {
      return {
        open: true,
      };
    },
  };
</script>

<template>
  <aside :class="open ? 'opened' : ''">
    <Status />
    <State />
    <StreamSettings />
    <OpenLayers />
    <Speed />
    <Inertial />
  </aside>
</template>

<style lang="scss" scoped>
  aside {
    align-items: center;
    backdrop-filter: blur(4px);
    background-color: rgba(0, 0, 0, 0.5);
    border-radius: 8px;
    bottom: 0;
    display: flex;
    flex-flow: column nowrap;
    gap: 0.8rem;
    justify-content: flex-start;
    margin: 1rem;
    padding: 1rem;
    position: absolute;
    right: 0;
    top: 0;
    transform: translateX(calc(320px + 4rem));
    transition: transform 0.3s ease-in-out;
    width: 380px;
    z-index: 100;

    &.opened {
      transform: translateX(0);
    }

    > article {
      align-items: center;
      background-color: rgba(255, 255, 255, 0.87);
      border-radius: 6px;
      color: #242424;
      display: flex;
      justify-content: center;
      overflow: hidden;
      width: 100%;
    }
  }
</style>
