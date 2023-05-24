import { reactive } from "vue";
import { io } from "socket.io-client";

export const state = reactive({
  connected: false,
  online: false,
  acceleration: null,
  gyroscope: null,
  speed: null,
  temperature: null,
  location: [2.213749, 46.227638],
  shutter: false,
  ping: null,
});

// "undefined" means the URL will be computed from the `window.location` object
const URL =
  process.env.NODE_ENV === "production" ? undefined : "http://localhost:3000";

export const socket = io(URL, {
  reconnectionDelay: 400,
  reconnectionDelayMax: 400,
  retries: Infinity,
});

socket.on("connect", () => {
  console.log("connected");
  state.connected = true;
});

socket.on("online", () => {
  console.log("online");
  state.online = true;
});

socket.on("acceleration", (data) => {
  state.acceleration = data;
});

socket.on("gyroscope", (data) => {
  state.gyroscope = data;
});

socket.on("speed", (value) => {
  state.speed = value;
});

socket.on("temperature", (value) => {
  state.temperature = value;
});

socket.on("location", (data) => {
  state.location = data;
});

socket.on("shutter", (boolean) => {
  state.shutter = boolean;
});

socket.on("ping", (value) => {
  console.log("ping:", value);
  state.ping = value;
});

socket.on("offline", () => {
  state.online = false;
});

socket.on("disconnect", () => {
  state.connected = false;
  state.online = false;
});
