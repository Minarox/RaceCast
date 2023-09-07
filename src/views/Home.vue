<script lang="ts">
  import SidePanel from "@/components/SidePanel.vue";
  import Player from "@/components/Player.vue";

  export default {
    name: "HomePage",
    components: {
      SidePanel,
      Player,
    },
    data() {
      return {
        webrtc: false as boolean,
      };
    },
    methods: {
      webrtcHandler(value: boolean) {
        this.webrtc = value;
      },
    },
  };
</script>

<template>
  <Player @webrtc="webrtcHandler" />
  <SidePanel :webrtc="webrtc" />
</template>
