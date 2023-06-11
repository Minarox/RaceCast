import { reactive } from "vue";
import { io } from "socket.io-client";

export const state = reactive({
  connected: false,
  online: false,
  mpu6050: null,
  gps: null,
  shutter: false,
  ping: null,
  lastConnection: null,
});

// "undefined" means the URL will be computed from the `window.location` object
const URL =
  process.env.NODE_ENV === "production"
    ? undefined
    : "https://rallye.minarox.fr";

export const socket = io(URL, {
  reconnectionDelay: 300,
  reconnectionDelayMax: 300,
  timeout: 300,
  retries: Infinity,
});

socket.on("connect", () => {
  state.connected = true;
});

socket.on("online", () => {
  state.online = true;
});

socket.on("mpu6050", (data) => {
  state.mpu6050 = data;
});

socket.on("gps", (data) => {
  state.gps = data;
});

socket.on("shutter", (boolean) => {
  state.shutter = boolean;
});

socket.on("latency", (value) => {
  state.ping = value;
});

socket.on("lastConnection", (timestamp) => {
  state.lastConnection = timestamp;
});

socket.on("offline", () => {
  state.online = false;
});

socket.on("disconnect", () => {
  state.connected = false;
  state.online = false;
});
