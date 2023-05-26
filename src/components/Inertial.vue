<template>
  <section>
    <Heading :title="$t('inertial')" />
    <div>
      <div>
        <p>{{ $t("accelerometer") }}</p>
        <div class="chart-container">
          <canvas id="accelerometer-chart" />
        </div>
      </div>
      <div>
        <p>{{ $t("gyroscope") }}</p>
        <div class="chart-container">
          <canvas id="gyroscope-chart" />
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { onMounted } from "vue";
import { state } from "@/socket";
import Heading from "@/components/Heading.vue";
import Chart from "chart.js/auto";

export default {
  name: "InertialComponent",
  components: {
    Heading,
  },
  computed: {
    acceleration() {
      return state.acceleration;
    },
    gyroscope() {
      return state.gyroscope;
    },
  },
  setup() {
    let accelerometerChart, gyroscopeChart;

    onMounted(() => {
      accelerometerChart = new Chart(
        document.getElementById("accelerometer-chart").getContext("2d"),
        {
          type: "bubble",
          data: {
            labels: [],
            datasets: [
              {
                data: [],
                backgroundColor: "#ff0000",
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
                min: -3,
                max: 3,
              },
              y: {
                min: -3,
                max: 3,
              },
            },
          },
        }
      );
      gyroscopeChart = new Chart(
        document.getElementById("gyroscope-chart").getContext("2d"),
        {
          type: "bubble",
          data: {
            labels: [],
            datasets: [
              {
                data: [],
                backgroundColor: "#ff0000",
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
                min: -3,
                max: 3,
              },
              y: {
                min: -3,
                max: 3,
              },
            },
          },
        }
      );
    });

    const addDataAccelerometer = (label, value) => {
      accelerometerChart.data.labels.push(label);
      accelerometerChart.data.datasets[0].data.push({
        x: value.x,
        y: value.y,
        r: 8,
      });

      if (accelerometerChart.data.labels.length > 1) {
        accelerometerChart.data.labels.shift();
        accelerometerChart.data.datasets[0].data.shift();
      }

      accelerometerChart.update("none");
    };

    const addDataGyroscope = (label, value) => {
      gyroscopeChart.data.labels.push(label);
      gyroscopeChart.data.datasets[0].data.push({
        x: value.x,
        y: value.y,
        r: 8,
      });

      if (gyroscopeChart.data.labels.length > 1) {
        gyroscopeChart.data.labels.shift();
        gyroscopeChart.data.datasets[0].data.shift();
      }

      gyroscopeChart.update("none");
    };

    return { addDataAccelerometer, addDataGyroscope };
  },
  watch: {
    acceleration(value) {
      this.addDataAccelerometer(new Date().toLocaleTimeString(), value);
    },
    gyroscope(value) {
      this.addDataGyroscope(new Date().toLocaleTimeString(), value);
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
