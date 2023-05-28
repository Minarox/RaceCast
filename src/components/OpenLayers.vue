<template>
  <section>
    <Heading :title="$t('map')" />
    <div id="map" ref="map" />
  </section>
</template>

<script>
import { state } from "@/socket";
import Heading from "@/components/Heading.vue";
import { Feature, Map, View } from "ol/index";
import { OSM, Vector as VectorSource } from "ol/source";
import { Point } from "ol/geom";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { useGeographic } from "ol/proj";
import {
  defaults as defaultControls,
  FullScreen,
  ScaleLine,
} from "ol/control.js";
import { Circle as CircleStyle, Stroke, Style } from "ol/style.js";
import { easeOut } from "ol/easing.js";
import { getVectorContext } from "ol/render.js";
import { unByKey } from "ol/Observable.js";
import "ol/ol.css";

export default {
  name: "OpenLayersComponent",
  components: {
    Heading,
  },
  computed: {
    location() {
      return [state.location.longitude, state.location.latitude];
    },
  },
  data() {
    return {
      map: null,
      tileLayer: null,
      source: null,
      vector: null,
      duration: 3000,
      start: null,
      flashGeom: null,
      listenerKey: null,
      interval: null,
    };
  },
  mounted() {
    useGeographic();
    this.createMap();

    this.flash();
    this.interval = setInterval(() => {
      this.flash();
    }, 3000);
  },
  beforeUnmount() {
    clearInterval(this.interval);
  },
  methods: {
    createMap() {
      this.tileLayer = new TileLayer({
        source: new OSM({
          wrapX: false,
        }),
      });

      this.source = new VectorSource({
        wrapX: false,
        features: [new Feature(new Point(this.location))],
      });

      this.vector = new VectorLayer({
        source: this.source,
        style: {
          "circle-radius": 12,
          "circle-fill-color": "rgba(255,255,255,0.6)",
          "circle-stroke-color": "#3399CC",
          "circle-stroke-width": 1.8,
        },
      });

      this.map = new Map({
        target: this.$refs.map,
        controls: defaultControls({ attribution: false, zoom: true }).extend([
          new ScaleLine({
            units: "metric",
          }),
          new FullScreen(),
        ]),
        layers: [this.tileLayer, this.vector],
        view: new View({
          center: this.location,
          zoom: 15,
        }),
      });
    },
    flash() {
      this.start = Date.now();
      this.flashGeom = this.map
        .getLayers()
        .getArray()[1]
        .getSource()
        .getFeatures()[0]
        .getGeometry()
        .clone();
      this.listenerKey = this.tileLayer.on("postrender", this.animate);
    },
    animate(event) {
      const frameState = event.frameState;
      const elapsed = frameState.time - this.start;
      if (elapsed >= this.duration) {
        unByKey(this.listenerKey);
        return;
      }
      const vectorContext = getVectorContext(event);
      const elapsedRatio = elapsed / this.duration;
      // radius will be 8 at start and 30 at end.
      const radius = easeOut(elapsedRatio) * 25 + 12;
      const opacity = easeOut(1 - elapsedRatio);

      const style = new Style({
        image: new CircleStyle({
          radius: radius,
          stroke: new Stroke({
            color: "rgba(255, 0, 0, " + opacity + ")",
            width: 0.25 + opacity,
          }),
        }),
      });

      vectorContext.setStyle(style);
      vectorContext.drawGeometry(this.flashGeom);
      this.map.render();
    },
  },
  watch: {
    location(position) {
      this.map
        .getLayers()
        .getArray()[1]
        .getSource()
        .getFeatures()[0]
        .getGeometry()
        .setCoordinates(position);
      setTimeout(() => {
        this.map.getView().animate({
          center: position,
          duration: 300,
        });
      }, 1);
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

  #map {
    height: 100%;
    width: 100%;
  }
}
</style>
