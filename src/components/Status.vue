<template>
  <header :class="connected ? 'green-border' : 'red-border'">
    <p v-if="!connected">{{ $t("disconnected") }}</p>
    <div v-else>
      <p>
        <span v-if="online">{{ $t("system.connected") }}</span>
        <span v-else>{{ $t("system.disconnected") }}</span>
        <span v-if="ping"> ({{ ping }} ms)</span>
      </p>
      <p v-if="shutter" id="shutter"><span />{{ $t("shutter.record") }}</p>
      <p v-else>{{ $t("shutter.standby") }}</p>
    </div>
  </header>
</template>

<script>
import { state } from "@/socket";

export default {
  name: "StatusComponent",
  computed: {
    connected() {
      return state.connected;
    },
    online() {
      return state.online;
    },
    ping() {
      return state.ping;
    },
    shutter() {
      return state.shutter;
    },
  },
};
</script>

<style lang="scss" scoped>
header {
  background-color: white;
  border-radius: var(--border-radius);
  margin-bottom: 1rem;
  margin-inline: auto;
  min-width: max-content;
  padding: 1rem;
  text-align: center;
  width: 80%;

  div {
    align-items: center;
    display: flex;
    flex-flow: row wrap;
    gap: 2rem;
    justify-content: center;

    #shutter {
      padding-left: 24px;

      span {
        position: relative;

        &::before,
        &::after {
          background-color: red;
          border-radius: 50%;
          content: "";
          height: 18px;
          left: -24px;
          position: absolute;
          width: 18px;
        }

        &::after {
          animation: pulse-scale 2.6s infinite;
        }

        @keyframes pulse-scale {
          0% {
            opacity: 0.7;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(2.4);
          }
        }
      }
    }
  }
}

.green-border {
  animation: fade 3s ease-out forwards;
  box-shadow: inset 0 0 10px green;

  @keyframes fade {
    0% {
      box-shadow: inset 0 0 10px green;
    }
    50% {
      box-shadow: inset 0 0 10px green;
    }
    100% {
      box-shadow: inset 0 0 0 green;
    }
  }
}

.red-border {
  animation: pulse 3s linear infinite alternate;
  box-shadow: inset 0 0 10px red;

  @keyframes pulse {
    from {
      box-shadow: inset 0 0 10px red;
    }
    to {
      box-shadow: inset 0 0 0 red;
    }
  }
}
</style>
