<script lang="ts">
  import Status from "@/components/Status.vue";
  import State from "@/components/State.vue";

  export default {
    name: "SidePanel",
    components: { Status, State },
    data() {
      return {
        open: false,
      };
    },
    watch: {
      open() {
        setTimeout(() => {
          this.open = false;
        }, 500);
      },
    },
  };
</script>

<template>
  <aside :class="open ? 'opened' : ''" @click="open = !open">
    <Status />
    <State />
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
    transition: transform 0.3s ease-in-out;
    width: 300px;
    z-index: 100;

    &.opened {
      transform: translateX(calc(300px + 4rem));
    }

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
</style>
