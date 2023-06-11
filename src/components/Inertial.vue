<template>
  <section>
    <Heading :title="$t('inertial')" />
    <div>
      <highcharts id="accel-chart" :options="accelChart" />
      <highcharts :options="gyroChart" />
    </div>
  </section>
</template>

<script>
import { state } from "@/socket";
import Heading from "@/components/Heading.vue";

export default {
  name: "InertialComponent",
  components: {
    Heading,
  },
  computed: {
    accelerometer() {
      if (state.mpu6050 && state.mpu6050.accel) {
        return {
          x: state.mpu6050.accel.x,
          y: state.mpu6050.accel.z * -1,
          z: state.mpu6050.accel.y,
        };
      }
      return null;
    },
    gyroscope() {
      if (state.mpu6050 && state.mpu6050.gyro) {
        return {
          x: state.mpu6050.gyro.y,
          y: state.mpu6050.gyro.x * -1,
        };
      }
      return null;
    },
  },
  data() {
    const options = {
      lang: {
        noData: this.$t("no_data"),
      },
      credits: {
        enabled: false,
      },
      legend: {
        enabled: false,
      },
      tooltip: {
        enabled: false,
      },
      plotOptions: {
        series: {
          marker: {
            radius: 6,
          },
        },
      },
    };
    return {
      element: null,
      pose: null,
      animation: true,
      accelChart: {
        ...options,
        chart: {
          height: null,
          spacing: [10, 10, 4, 10],
          backgroundColor: "transparent",
          type: "scatter3d",
          animation: false,
          options3d: {
            enabled: true,
            alpha: 10,
            beta: 20,
            depth: 300,
            // fitToPlot: false,
          },
        },
        title: {
          text: this.$t("accelerometer"),
        },
        yAxis: {
          min: -2.5,
          max: 2.5,
          title: null,
        },
        xAxis: {
          min: -2.5,
          max: 2.5,
          gridLineWidth: 1,
        },
        zAxis: {
          min: -2.5,
          max: 2.5,
          showFirstLabel: false,
        },
        series: [
          {
            name: "data",
            data: [[0, 0, 0]],
            color: "#FF0000",
          },
          {
            name: "origin",
            data: [[0, 0, 0]],
            color: "#888888",
          },
        ],
      },
      gyroChart: {
        ...options,
        chart: {
          height: null,
          spacing: [10, 10, 4, 10],
          backgroundColor: "transparent",
          type: "scatter",
          animation: false,
        },
        title: {
          text: this.$t("gyroscope"),
        },
        yAxis: {
          min: -260,
          max: 260,
          title: null,
        },
        xAxis: {
          min: -260,
          max: 260,
          gridLineWidth: 1,
        },
        series: [
          {
            name: "data",
            data: [[0, 0]],
            color: "#FF0000",
          },
          {
            name: "origin",
            data: [[0, 0]],
            color: "#888888",
          },
        ],
      },
    };
  },
  mounted() {
    ["mouseup", "touchend"].forEach((type) => {
      document.addEventListener(type, this.release, {
        passive: true,
      });
    });
    ["mousedown", "touchstart"].forEach((type) => {
      document
        .getElementById("accel-chart")
        .addEventListener(type, this.click, {
          passive: true,
        });
    });
  },
  methods: {
    click(event) {
      this.element = event.target;
      while (this.element.id !== "accel-chart") {
        this.element = this.element.parentNode;
      }

      this.pose = {
        x: event.pageX,
        y: event.pageY,
      };

      ["mousemove", "touchmove"].forEach((type) => {
        document.addEventListener(type, this.drag, {
          passive: true,
        });
      });
    },
    drag(event) {
      if (this.animation) {
        this.animation = false;

        // TODO: compute mouse movement and apply to graph
        if (this.element.id === "accel-chart") {
          this.accelChart.chart.options3d.alpha +=
            (event.pageY - this.pose.y) / 2;
          this.accelChart.chart.options3d.beta -=
            (event.pageX - this.pose.x) / 2;
        }

        this.pose = {
          x: event.pageX,
          y: event.pageY,
        };

        requestAnimationFrame(() => {
          this.animation = true;
        });
      }
    },
    release() {
      ["mousemove", "touchmove"].forEach((type) => {
        document.removeEventListener(type, this.drag, {
          passive: true,
        });
      });
      this.pose = this.element = null;
    },
  },
  watch: {
    accelerometer(value) {
      this.accelChart.series[0].data = [value];
    },
    gyroscope(value) {
      this.gyroChart.series[0].data = [value];
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

  > div {
    border: 1px solid transparent;
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(2, 1fr);
    height: 100%;
    width: 100%;

    > * {
      height: inherit;
      width: 100%;
    }
  }
}
</style>
