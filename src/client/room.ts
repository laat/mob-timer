import "./components/current-timer.js";
import "./components/room-tutorial.js";
import "./components/room-history.js";
import "./components/progress-bar.js";
fetch(location.pathname, {
  method: "PUT",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ timer: 1, user: "me" }),
});
