<template>
  <section>
    <Heading :title="$t('inertial')" />
    <div>
      <highcharts id="accel-chart" :options="accelChart" />
      <highcharts id="gyro-chart" :options="gyroChart" />
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
      return state.accelerometer;
    },
    gyroscope() {
      return state.gyroscope;
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
    const origin = {
      name: "origin",
      data: [[0, 0, 0]],
      color: "#888888",
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
          options3d: {
            enabled: true,
            alpha: 10,
            beta: 20,
            depth: 400,
          },
        },
        title: {
          text: this.$t("accelerometer"),
        },
        yAxis: {
          min: -3,
          max: 3,
          title: null,
        },
        xAxis: {
          min: -3,
          max: 3,
          gridLineWidth: 1,
        },
        zAxis: {
          min: -3,
          max: 3,
          showFirstLabel: false,
        },
        series: [
          {
            name: "data",
            data: [[0, 0, 0]],
            color: "#FF0000",
          },
          origin,
        ],
      },
      gyroChart: {
        ...options,
        chart: {
          height: null,
          spacing: [10, 10, 4, 10],
          backgroundColor: "transparent",
          type: "scatter3d",
          options3d: {
            enabled: true,
            alpha: 10,
            beta: 20,
            depth: 400,
          },
        },
        title: {
          text: this.$t("gyroscope"),
        },
        yAxis: {
          min: -3,
          max: 3,
          title: null,
        },
        xAxis: {
          min: -3,
          max: 3,
          gridLineWidth: 1,
        },
        zAxis: {
          min: -3,
          max: 3,
          showFirstLabel: false,
        },
        series: [
          {
            name: "data",
            data: [[0, 0, 0]],
            color: "#FF0000",
          },
          origin,
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
      document.getElementById("gyro-chart").addEventListener(type, this.click, {
        passive: true,
      });
    });
  },
  methods: {
    click(event) {
      this.element = event.target;
      while (
        this.element.id !== "accel-chart" &&
        this.element.id !== "gyro-chart"
      ) {
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
        } else if (this.element.id === "gyro-chart") {
          this.gyroChart.chart.options3d.alpha +=
            (event.pageY - this.pose.y) / 2;
          this.gyroChart.chart.options3d.beta -=
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
