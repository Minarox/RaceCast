<script lang="ts">
  import { state } from "../socket";

  export default {
    name: "SpeedData",
    data() {
      const options = {
        lang: {
          noData: "Aucune donnée",
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
            spacing: [12, 10, 12, 10],
            backgroundColor: "transparent",
            animation: true,
          },
          time: {
            useUTC: true,
          },
          xAxis: {
            type: "datetime",
            tickPixelInterval: 150,
          },
          yAxis: {
            max: 200,
            gridLineColor: "#c0c0c0",
            gridLineWidth: 1,
            title: {
              text: null,
            },
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
            animation: true,
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
    computed: {
      speed(): number | null {
        if (state.data.gps) return state.data.gps.speed;
        return null;
      },
    },
    watch: {
      speed: {
        deep: true,
        handler(value): void {
          this.speedometer.series[0].data = [parseInt(value)];

          this.histogram.series[0].data.push([
            new Date().getTime() + 2 * 60 * 60 * 1000,
            value,
          ]);
          if (this.histogram.series[0].data.length > 100) {
            this.histogram.series[0].data.shift();
          }
        },
      },
    },
  };
</script>

<template>
  <article>
    <highcharts :options="histogram" />
  </article>
</template>

<style lang="scss" scoped>
  article {
    height: 180px;
    width: 100%;

    > * {
      height: inherit;
      width: 100%;
    }
  }
</style>
