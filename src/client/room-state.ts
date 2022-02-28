import { TimerSseEvent } from "../types.js";

export const source = new EventSource(location.pathname);

// https://dev.to/43081j/strongly-typed-event-emitters-using-eventtarget-in-typescript-3658
interface StateEventMap {
  timers: CustomEvent<TimerSseEvent[]>;
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
  constructor() {
    super();
    source.addEventListener("timer", (e: any) => {
      this._timers.push(JSON.parse(e.data));
      this.dispatchEvent(new CustomEvent("timers", { detail: this._timers }));
    });
  }
  get timers() {
    return this._timers.slice();
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
