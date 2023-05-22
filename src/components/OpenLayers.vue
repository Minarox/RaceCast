<template>
  <div ref="map-root" style="width: 100%; height: 100%"></div>
</template>

<script>
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
import "ol/ol.css";

export default {
  name: "OpenLayersComponent",
  data() {
    return {
      map: null,
      place: [2.3488, 48.8534],
    };
  },
  mounted() {
    useGeographic();

    this.createMap();
  },
  methods: {
    createMap() {
      this.map = new Map({
        target: this.$refs["map-root"],
        controls: defaultControls({ attribution: false, zoom: true }).extend([
          new ScaleLine(),
          new FullScreen(),
        ]),
        layers: [
          new TileLayer({
            source: new OSM(),
          }),
          new VectorLayer({
            source: new VectorSource({
              features: [new Feature(new Point(this.place))],
            }),
            style: {
              "circle-radius": 8,
              "circle-fill-color": "red",
            },
          }),
        ],
        view: new View({
          center: this.place,
          zoom: 15,
          constrainResolution: false,
          constrainOnlyCenter: false,
          constrainRotation: false,
        }),
      });
    },
  },
};
</script>

<style lang="scss" scoped>
div {
  height: 300px !important;
  width: 400px !important;
}
</style>
