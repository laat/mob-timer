import { IRoomConfig } from "../../types.js";
import { room } from "../room-state.js";

const html = String.raw;
const template = document.createElement("template");
template.innerHTML = html`
  <style>
    form {
      display: flex;
      flex-direction: column;
    }
  </style>
  <details>
    <summary>Config</summary>
    <form>
      <label><input type="number" name="minutes" /> Minutes</label>
      <label
        ><input type="number" name="break-every" /> Break every
        <span id="break-time"></span
      ></label>
      <label
        ><input type="number" name="break-minutes" /> Minutes per break</label
      >
      <button type="submit">Update</button>
    </form>
  </details>
`;
export class RoomConfig extends HTMLElement {
  form: HTMLFormElement;
  config: IRoomConfig | undefined;
  minutesEl: HTMLInputElement;
  breakMinutesEl: HTMLInputElement;
  breakEveryEl: HTMLInputElement;
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
    this.form = this.shadowRoot!.querySelector("form")!;
    this.minutesEl = this.form.querySelector("input[name=minutes]")!;
    this.breakMinutesEl = this.form.querySelector("input[name=break-minutes]")!;
    this.breakEveryEl = this.form.querySelector("input[name=break-every]")!;
  }
  connectedCallback() {
    this.form.addEventListener("submit", this.onSubmit);
    room.addEventListener("config", this.onConfig);
  }
  disconnectedCallback() {
    this.form.removeEventListener("submit", this.onSubmit);
    room.removeEventListener("config", this.onConfig);
  }
  onConfig = (e: CustomEvent<IRoomConfig>) => {
    this.config = e.detail;
    this.render();
  };
  onSubmit = (e: Event) => {
    e.preventDefault();
    const data = new FormData(this.form);
    const config = {
      minutes: parseInt((data.get("minutes") as string) || "0"),
      breakMinutes: parseInt((data.get("break-minutes") as string) || "0"),
      breakEvery: parseInt((data.get("break-every") as string) || "0"),
    };
    room.setConfig(config);
  };

  render() {
    this.minutesEl.value = this.config?.minutes?.toString() || "";
    this.breakEveryEl.value = this.config?.breakEvery?.toString() || "";
    this.breakMinutesEl.value = this.config?.breakMinutes?.toString() || "";
  }
}

customElements.define("room-config", RoomConfig);
