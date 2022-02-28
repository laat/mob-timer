export const source = new EventSource(location.pathname);
class Room extends EventTarget {
  private _timers: any[] = [];
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
export const roomState = new Room();
