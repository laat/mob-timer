import { IRoomConfig } from "../../types.js";
import { room } from "../room-state.js";

const html = String.raw;
const template = document.createElement("template");
template.innerHTML = html`
  <style>
    div {
      color: black;
    }
    pre {
      color: darkred;
      font-size: 12px;
    }
  </style>
  <h3>Usage</h3>
  <code>
    <pre>
  export MOB_TIMER="<span class="timer">10</span>"
  export MOB_TIMER_URL=${window.origin}/
  export MOB_TIMER_ROOM=${window.location.pathname.substring(1)}

  mob start
  mob timer <span class="timer">10</span>
  mob break <span class="break-timer">5</span>
  </pre>
  </code>
`;
export class RoomTutorial extends HTMLElement {
  config: IRoomConfig | undefined;
  timerEls: HTMLSpanElement[];
  breakEls: HTMLSpanElement[];
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
    this.timerEls = Array.from(
      this.shadowRoot!.querySelectorAll(".timer")
    ) as HTMLSpanElement[];
    this.breakEls = Array.from(
      this.shadowRoot!.querySelectorAll(".break-timer")
    ) as HTMLSpanElement[];
  }
  connectedCallback() {
    room.addEventListener("config", this.onConfig);
    this.render();
  }
  disconnectedCallback() {
    room.removeEventListener("config", this.onConfig);
  }

  onConfig = (e: CustomEvent<IRoomConfig>) => {
    this.config = e.detail;
    this.render();
  };
  render() {
    this.timerEls.forEach(
      (x) => (x.innerText = this.config?.minutes?.toString() ?? "")
    );
    this.breakEls.forEach(
      (x) => (x.innerText = this.config?.breakMinutes?.toString() ?? "")
    );
  }
}

customElements.define("room-tutorial", RoomTutorial);
