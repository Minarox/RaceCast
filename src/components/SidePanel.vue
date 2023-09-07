<script lang="ts">
  import Status from "@/components/Status.vue";
  import State from "@/components/State.vue";
  import StreamSettings from "@/components/StreamSettings.vue";
  import OpenLayers from "@/components/OpenLayers.vue";
  import Speed from "@/components/Speed.vue";
  import Inertial from "@/components/Inertial.vue";
  import Speedometer from "@/components/Speedometer.vue";

  export default {
    name: "SidePanel",
    components: {
      Speedometer,
      Status,
      State,
      StreamSettings,
      OpenLayers,
      Speed,
      Inertial,
    },
    props: {
      webrtc: {
        type: Boolean,
        default: false,
        required: true,
      },
    },
    data() {
      return {
        open: false as boolean,
      };
    },
  };
</script>

<template>
  <aside :class="open ? 'opened' : ''">
    <div id="wrapper">
      <Status />
      <State :webrtc="webrtc" />
      <StreamSettings />
      <OpenLayers />
      <Speed />
      <Inertial />
    </div>
    <div id="arrow" @click.prevent="open = !open">
      <img :class="open ? 'opened' : ''" alt="Arrow" src="@/assets/arrow.svg" />
    </div>
    <div id="speed">
      <Speedometer />
    </div>
  </aside>
</template>

<style lang="scss" scoped>
  aside {
    bottom: 0;
    margin: 0.8rem;
    position: absolute;
    right: 0;
    top: 0;
    transform: translateX(calc(380px + 0.8rem));
    transition: transform 0.3s ease-in-out;
    width: 380px;
    z-index: 100;

    &.opened {
      transform: translateX(0);
    }

    > #wrapper {
      align-items: center;
      backdrop-filter: blur(4px);
      background-color: rgba(0, 0, 0, 0.5);
      border-radius: 8px;
      display: flex;
      flex-flow: column nowrap;
      gap: 0.8rem;
      height: 100%;
      justify-content: flex-start;
      overflow-y: overlay;
      padding: 1rem;

      > article {
        align-items: center;
        background-color: rgba(255, 255, 255, 0.87);
        border-radius: 6px;
        color: #242424;
        display: flex;
        justify-content: center;
        width: 100%;
      }
    }

    > #arrow {
      align-items: center;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      justify-content: center;
      padding: 14rem 0.6rem 14rem 2rem;
      position: absolute;
      right: 380px;
      top: 50%;
      transform: translateY(-50%);

      img {
        height: 40px;
        transform: rotate(180deg);
        transition: transform 180ms ease-in-out;
        width: 40px;

        &.opened {
          transform: rotate(0deg);
        }
      }
    }

    > #speed {
      align-items: center;
      border-radius: 8px;
      bottom: -2rem;
      display: flex;
      height: 220px;
      justify-content: center;
      pointer-events: none;
      position: absolute;
      right: calc(380px + 1rem);
      width: 260px;
    }
  }
</style>
