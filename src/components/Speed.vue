<template>
  <section>
    <Heading :title="$t('speed')" />
    <div>
      <div class="chart-container">
        <canvas id="speed-chart" />
      </div>
      <p>{{ speed }} km/h</p>
    </div>
  </section>
</template>

<script>
import { onMounted } from "vue";
import { state } from "@/socket";
import Heading from "@/components/Heading.vue";
import Chart from "chart.js/auto";

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
  setup() {
    let chartInstance;

    onMounted(() => {
      const ctx = document.getElementById("speed-chart").getContext("2d");
      let width, height, gradient;

      function getGradient(ctx, chartArea) {
        const chartWidth = chartArea.right - chartArea.left;
        const chartHeight = chartArea.bottom - chartArea.top;
        if (!gradient || width !== chartWidth || height !== chartHeight) {
          // Create the gradient because this is either the first render
          // or the size of the chart has changed
          width = chartWidth;
          height = chartHeight;
          gradient = ctx.createLinearGradient(
            0,
            chartArea.bottom,
            0,
            chartArea.top
          );
          gradient.addColorStop(0, "#00e604");
          gradient.addColorStop(0.5, "#bea900");
          gradient.addColorStop(1, "#ff0000");
        }

        return gradient;
      }

      chartInstance = new Chart(ctx, {
        type: "line",
        data: {
          labels: [],
          datasets: [
            {
              data: [],
              borderColor: function (context) {
                const chart = context.chart;
                const { ctx, chartArea } = chart;

                if (!chartArea) {
                  // This case happens on initial chart load
                  return;
                }
                return getGradient(ctx, chartArea);
              },
            },
          ],
        },
        options: {
          elements: {
            point: {
              radius: 0,
            },
            line: {
              tension: 0.3,
              fill: true,
            },
          },
          plugins: {
            legend: {
              display: false,
            },
          },
          maintainAspectRatio: false,
          scales: {
            x: {
              grid: {
                display: false,
              },
              ticks: {
                display: false,
              },
            },
            y: {
              beginAtZero: true,
              min: 0,
              max: 160,
            },
          },
        },
      });
    });

    const addData = (label, value) => {
      chartInstance.data.labels.push(label);
      chartInstance.data.datasets[0].data.push(value);

      if (chartInstance.data.labels.length > 100) {
        chartInstance.data.labels.shift();
        chartInstance.data.datasets[0].data.shift();
      }

      chartInstance.update("none");
    };

    return { addData };
  },
  watch: {
    speed(value) {
      this.addData(new Date().toLocaleTimeString(), value);
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
    align-items: center;
    display: flex;
    flex-flow: row nowrap;
    height: 100%;
    justify-content: center;
    width: 100%;

    > p {
      font-size: 1.6em;
      padding: 0.9rem;
      text-align: center;
      width: 250px;
    }
  }
}
</style>
