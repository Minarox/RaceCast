<template>
  <section>
    <Heading :title="$t('inertial')" />
    <div>
      <p>{{ $t("accelerometer") }}</p>
      <p>{{ $t("gyroscope") }}</p>
    </div>
  </section>
</template>

<script>
import Heading from "@/components/Heading.vue";

export default {
  name: "InertialComponent",
  components: {
    Heading,
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
  height: 100%;
  justify-content: flex-start;
  overflow: hidden;

  > div {
    align-items: center;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    height: 100%;
    justify-content: center;
    text-align: center;
    width: 100%;
  }
}
</style>
