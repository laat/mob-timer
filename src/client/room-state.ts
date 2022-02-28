import { IRoomConfig, TimerSseEvent } from "../types.js";

export const source = new EventSource(location.pathname);

// https://dev.to/43081j/strongly-typed-event-emitters-using-eventtarget-in-typescript-3658
interface StateEventMap {
  timers: CustomEvent<TimerSseEvent[]>;
  config: CustomEvent<IRoomConfig>;
}
interface IRoomStateTarget extends EventTarget {
  addEventListener<K extends keyof StateEventMap>(
    type: K,
    listener: (ev: StateEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean
  ): void;
  removeEventListener<K extends keyof StateEventMap>(
    type: K,
    listener: (ev: StateEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean
  ): void;
}
const RoomStateTarget = EventTarget as {
  new (): IRoomStateTarget;
  prototype: IRoomStateTarget;
};
class Room extends RoomStateTarget {
  private _timers: TimerSseEvent[] = [];
  private _config: IRoomConfig = {};
  constructor() {
    super();
    source.addEventListener("timer", (e: any) => {
      this._timers.push(JSON.parse(e.data));
      this.dispatchEvent(new CustomEvent("timers", { detail: this._timers }));
    });
    source.addEventListener("config", (e: any) => {
      this._config = JSON.parse(e.data);
      this.dispatchEvent(new CustomEvent("config", { detail: this._config }));
    });
  }
  get timers(): readonly TimerSseEvent[] {
    return this._timers.slice();
  }
  async setConfig(config: {}) {
    await fetch(`${location.pathname}/config`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(config),
    });
  }
  async getConfig() {
    const response = await fetch(`${location.pathname}/config`, {
      headers: { accept: "application/json" },
    });
    return response.json();
  }
  async putTimer(timer: number, user?: string) {
    await fetch(location.pathname, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ timer, user }),
    });
  }
  async putBreaktimer(breaktimer: number, user?: string) {
    await fetch(location.pathname, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ breaktimer, user }),
    });
  }
}
export const room = new Room();
