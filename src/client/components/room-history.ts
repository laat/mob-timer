import debounce from "lodash/debounce.js";
import { TimerSseEvent } from "../../types.js";
import { room } from "../room-state.js";

const html = String.raw;
const template = document.createElement("template");
template.innerHTML = html`
  <style>
    div {
      color: black;
      font-size: 16px;
    }
  </style>
  <h3>History</h3>
  <div></div>
`;
export class RoomHistory extends HTMLElement {
  history: TimerSseEvent[] = [];
  historyEl: HTMLDivElement;
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
    this.history = room.timers;
    this.historyEl = this.shadowRoot!.querySelector("div")!;
  }
  onTimer = (event: CustomEvent) => {
    this.history = event.detail;
    this.render();
  };
  connectedCallback() {
    room.addEventListener("timers", this.onTimer);
    this.render();
  }
  disconnectedCallback() {
    room.removeEventListener("timers", this.onTimer);
  }
  render = debounce(() => {
    const rows = this.history
      .map((x) => {
        const duration = new Date(
          new Date(x.ends).getTime() - new Date(x.starts).getTime()
        );
        const icon = x.type === "breakTimer" ? "☕️" : "⏲";
        const minutes = String(duration.getMinutes()).padStart(2, "0");
        const seconds = String(duration.getSeconds()).padStart(2, "0");
        return {
          ...x,
          date: new Date(x.starts),
          starts: new Date(x.starts).toLocaleTimeString(),
          duration: `${icon} ${minutes}:${seconds}`,
        };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .map(
        (x) =>
          `<tr><td>🕒 ${x.starts} ${x.duration}</td><td>${
            x.user ? `👤 ${x.user}` : ""
          }</td></tr>`
      )
      .join("\n");
    this.historyEl.innerHTML = `<table>${rows}</table>`;
  }, 100);
}

customElements.define("room-history", RoomHistory);
