import { TimerSseEvent } from "../../types.js";
import { room } from "../room-state.js";
import { escapeHtml } from "../utils/escapeHtml.js";

const html = String.raw;
const template = document.createElement("template");
template.innerHTML = html`
  <style>
    .timer {
      color: black;
      font-size: 50px;
    }
    .wrapper {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
  </style>
  <div class="wrapper">
    <div class="timer"></div>
    <div class="user"></div>
  </div>
`;
export class CurrentTimer extends HTMLElement {
  private lastTimer: TimerSseEvent | undefined;

  private interval: number | undefined;

  private timerEl: HTMLDivElement;
  private userEl: HTMLDivElement;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
    this.timerEl = this.shadowRoot!.querySelector(".timer")!;
    this.userEl = this.shadowRoot!.querySelector(".user")!;
  }
  onTimer = (e: CustomEvent) => {
    this.lastTimer = e.detail[e.detail.length - 1];
    this.render();
  };

  render() {
    const icon = this.lastTimer?.type === "breakTimer" ? "☕️" : "⏲";
    if (this.lastTimer == null) {
      this.timerEl.innerHTML = `${icon} 00:00`;
      this.userEl.innerHTML = "";
    } else {
      const diff = new Date(this.lastTimer.ends).getTime() - Date.now();
      if (diff < 0) {
        this.timerEl.innerHTML = `${icon} 00:00`;
        this.userEl.innerHTML = "";
      } else {
        const time = new Date(diff);
        const minutes = String(time.getMinutes()).padStart(2, "0");
        const seconds = String(time.getSeconds()).padStart(2, "0");
        this.timerEl.innerText = `${icon} ${minutes}:${seconds}`;
        this.userEl.innerHTML = this.lastTimer.user
          ? `👤 ${escapeHtml(this.lastTimer.user)}`
          : "";
      }
    }
  }
  connectedCallback() {
    this.lastTimer = room.timers[room.timers.length - 1];
    room.addEventListener("timers", this.onTimer);
    this.interval = window.setInterval(() => this.render(), 500);
    this.render();
  }
  disconnectedCallback() {
    room.removeEventListener("timers", this.onTimer);
    window.clearInterval(this.interval);
  }
}

customElements.define("current-timer", CurrentTimer);
