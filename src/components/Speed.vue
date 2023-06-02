<template>
  <section>
    <Heading :title="$t('speed')" />
    <div>
      <highcharts :options="histogram" />
      <highcharts :options="speedometer" />
    </div>
  </section>
</template>

<script>
import { state } from "@/socket";
import Heading from "@/components/Heading.vue";

export default {
  name: "SpeedComponent",
  components: {
    Heading,
  },
  computed: {
    speed() {
      return state.speed;
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
      title: {
        text: null,
      },
      legend: {
        enabled: false,
      },
    };
    return {
      histogram: {
        ...options,
        chart: {
          type: "areaspline",
          height: null,
          spacing: [12, 10, 4, 10],
          backgroundColor: "transparent",
          animation: {
            duration: 40,
          },
        },
        time: {
          useUTC: true,
        },
        xAxis: {
          type: "datetime",
          tickPixelInterval: 150,
        },
        yAxis: {
          title: {
            text: null,
          },
          plotLines: [
            {
              value: 0,
              width: 1,
              color: "#808080",
            },
          ],
        },
        tooltip: {
          headerFormat: "",
          pointFormat: "{point.x:%Y-%m-%d %H:%M:%S}<br/>{point.y:.2f}",
        },
        plotOptions: {
          areaspline: {
            lineWidth: 3,
            fillOpacity: 0.2,
          },
          series: {
            marker: {
              enabled: false,
            },
          },
        },
        series: [
          {
            name: "data",
            data: [],
          },
        ],
      },
      speedometer: {
        ...options,
        chart: {
          type: "gauge",
          height: null,
          spacing: [10, 26, 0, 26],
          backgroundColor: "transparent",
          animation: {
            duration: 100,
          },
        },
        tooltip: {
          enabled: false,
        },
        plotOptions: {
          series: {
            enableMouseTracking: false,
          },
        },
        pane: {
          startAngle: -90,
          endAngle: 90,
          background: null,
        },
        yAxis: {
          min: 0,
          max: 200,
          tickPixelInterval: 60,
          minorTickInterval: null,
          tickPosition: "inside",
          tickColor: "#FFFFFF",
          tickLength: 20,
          tickWidth: 2,
          labels: {
            distance: 16,
            style: {
              fontSize: "14px",
            },
          },
          lineWidth: 0,
          plotBands: [
            {
              from: 0,
              to: 120,
              color: "#55BF3B",
              thickness: 20,
            },
            {
              from: 120,
              to: 160,
              color: "#DDDF0D",
              thickness: 20,
            },
            {
              from: 160,
              to: 200,
              color: "#DF5353",
              thickness: 20,
            },
          ],
        },
        series: [
          {
            name: "data",
            data: [0],
            tooltip: {
              valueSuffix: " km/h",
            },
            dataLabels: {
              format: "{y} km/h",
              borderWidth: 0,
              color: "#333333",
              style: {
                fontSize: "2.3em",
              },
            },
            dial: {
              radius: "80%",
              backgroundColor: "gray",
              baseWidth: 12,
              baseLength: "0%",
              rearLength: "0%",
            },
            pivot: {
              backgroundColor: "gray",
              radius: 6,
            },
          },
        ],
      },
    };
  },
  watch: {
    speed(value) {
      this.speedometer.series[0].data = [parseInt(value)];

      this.histogram.series[0].data.push([new Date().getTime(), value]);
      if (this.histogram.series[0].data.length > 100) {
        this.histogram.series[0].data.shift();
      }
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
    grid-template-columns: 1.4fr 0.6fr;
    height: 100%;
    width: 100%;

    > * {
      height: inherit;
      width: 100%;

      &:last-child {
        transform: translateY(14px);
      }
    }
  }
}
</style>
