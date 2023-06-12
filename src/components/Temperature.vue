<template>
  <section>
    <Heading :title="$t('temperature')" />
    <p v-if="temperature">{{ temperature }} °C</p>
    <p v-else>{{ $t("no_data") }}</p>
  </section>
</template>

<script>
import { state } from "@/socket";
import Heading from "@/components/Heading.vue";

export default {
  name: "TemperatureComponent",
  components: {
    Heading,
  },
  computed: {
    temperature() {
      if (state.mpu6050 && state.mpu6050.temp) {
        return state.mpu6050.temp;
      }
      return null;
    },
  },
};
</script>

<style lang="scss" scoped>
section {
  align-items: center;
  background-color: #f6f6f6;
  border-radius: var(--border-radius);
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  overflow: hidden;

  > p {
    font-size: 1.6em;
    padding: 0.9rem;
  }
}
</style>
