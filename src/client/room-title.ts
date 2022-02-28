import { TimerSseEvent } from "../types.js";
import { room } from "./room-state.js";

let currentTimer: TimerSseEvent | undefined =
  room.timers[room.timers.length - 1];

room.addEventListener(
  "timers",
  (event) => (currentTimer = event.detail[event.detail.length - 1])
);

const getTitle = () => {
  if (!currentTimer) return "00:00";

  const diff = new Date(currentTimer.ends).getTime() - Date.now();

  if (diff < 0) return "00:00";

  const time = new Date(diff);
  const minutes = String(time.getMinutes()).padStart(2, "0");
  const seconds = String(time.getSeconds()).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const setTitle = () => {
  const nextTitle = getTitle();
  if (nextTitle !== document.title) {
    document.title = nextTitle;
  }
};

setInterval(setTitle, 1000);
