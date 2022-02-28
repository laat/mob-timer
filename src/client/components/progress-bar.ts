import { TimerSseEvent } from "../../types.js";
import { room } from "../room-state.js";

const html = String.raw;
const template = document.createElement("template");
template.innerHTML = html`
  <style>
    :host {
      position: absolute;
      top: 0;
      right: 0;
      left: 0;
    }
    div {
      background-color: red;
      width: 0%;
      height: 4px;
      display: block;
      transition: width 0.4s linear;
    }
  </style>
  <div></div>
`;
export class TopProgressBar extends HTMLElement {
  private lastTimer: TimerSseEvent | undefined;

  private interval: number | undefined;

  barEl: HTMLDivElement;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
    this.barEl = this.shadowRoot!.querySelector("div")!;
  }
  onTimer = (e: CustomEvent) => {
    this.lastTimer = e.detail[e.detail.length - 1];
    this.render();
  };
  getPercent() {
    if (this.lastTimer == null) {
      return 0;
    }
    const start = new Date(this.lastTimer.starts).getTime();
    const max = new Date(this.lastTimer.ends).getTime() - start;
    const now = Date.now() - start;
    return now / max;
  }

  render() {
    const current = parseInt(this.barEl.style.width, 10);
    const next = Math.min(100, Math.floor(this.getPercent() * 100));
    this.barEl.style.width = `${next}%`;
    if (current > next || isNaN(current) || (current === 0 && next === 100)) {
      this.barEl.style.transition = "width 0s";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.barEl.style.transition = "width 1s linear";
        });
      });
    }
  }
  connectedCallback() {
    this.lastTimer = room.timers[room.timers.length - 1];
    room.addEventListener("timers", this.onTimer as any);
    this.interval = window.setInterval(() => this.render(), 200);
    this.render();
  }
  disconnectedCallback() {
    room.removeEventListener("timers", this.onTimer as any);
    window.clearInterval(this.interval);
  }
}

customElements.define("top-progress-bar", TopProgressBar);
