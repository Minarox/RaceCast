<template>
  <section>
    <Heading :title="$t('inertial')" />
    <div>
      <highcharts :options="accelChart" />
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
      return state.accelerometer;
    },
    gyroscope() {
      return state.gyroscope;
    },
  },
  data() {
    const options = {
      chart: {
        height: null,
        spacing: [10, 0, 0, 0],
        backgroundColor: "transparent",
        type: "scatter3d",
        options3d: {
          enabled: true,
          alpha: 10,
          beta: 20,
          depth: 400,
        },
      },
      lang: {
        noData: this.$t("no_data"),
      },
      credits: {
        enabled: false,
      },
      legend: {
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
      accelChart: {
        ...options,
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
  /*mounted() {
    function dragStart(eStart) {
      eStart = chart.pointer.normalize(eStart);

      var posX = eStart.chartX,
        posY = eStart.chartY,
        alpha = chart.options.chart.options3d.alpha,
        beta = chart.options.chart.options3d.beta,
        sensitivity = 5, // lower is more sensitive
        handlers = [];

      function drag(e) {
        // Get e.chartX and e.chartY
        e = chart.pointer.normalize(e);

        chart.update(
          {
            chart: {
              options3d: {
                alpha: alpha + (e.chartY - posY) / sensitivity,
                beta: beta + (posX - e.chartX) / sensitivity,
              },
            },
          },
          undefined,
          undefined,
          false
        );
      }

      function unbindAll() {
        handlers.forEach(function (unbind) {
          if (unbind) {
            unbind();
          }
        });
        handlers.length = 0;
      }

      handlers.push(H.addEvent(document, "mousemove", drag));
      handlers.push(H.addEvent(document, "touchmove", drag));

      handlers.push(H.addEvent(document, "mouseup", unbindAll));
      handlers.push(H.addEvent(document, "touchend", unbindAll));
    }

    H.addEvent(chart.container, "mousedown", dragStart);
    H.addEvent(chart.container, "touchstart", dragStart);
  },*/
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
