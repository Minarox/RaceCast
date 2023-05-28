import { createApp } from "vue";
import App from "./App.vue";
import "./registerServiceWorker";
import i18n from "./i18n";
import Highcharts from "highcharts";
import HighchartsVue from "highcharts-vue";
import highchartsMore from "highcharts/highcharts-more";
import highchartsNoData from "highcharts/modules/no-data-to-display";

highchartsMore(Highcharts);
highchartsNoData(Highcharts);
createApp(App).use(i18n).use(HighchartsVue, { Highcharts }).mount("#app");
