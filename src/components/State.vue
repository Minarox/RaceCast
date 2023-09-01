<script lang="ts">
  import { state, State } from "../socket";

  export default {
    name: "DataSate",
    computed: {
      state(): State {
        return state.data.state;
      },
    },
  };
</script>

<template>
  <article>
    <p :class="state.mpu6050 ? 'green' : 'red'">MPU6050</p>
    <p :class="state.gps ? 'green' : 'red'">GPS</p>
    <p :class="state.webrtc ? 'green' : 'red'">WebRTC</p>
  </article>
</template>

<style lang="scss" scoped>
  article {
    display: grid !important;
    gap: 0.4rem;
    grid-template-columns: repeat(3, 1fr);
    height: 30px;
    justify-items: center;
    padding: 0.4rem;
    width: calc(100% - 0.8rem) !important;

    p {
      border-radius: 4px;
      color: white;
      line-height: 1.8em;
      text-align: center;
      transition: background-color 300ms linear;
      width: 100%;

      &.green {
        background-color: green;
      }

      &.red {
        background-color: #d20000;
      }
    }
  }
</style>
