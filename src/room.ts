import { randomUUID } from "crypto";
import { EventEmitter } from "events";
import { Http2ServerRequest } from "http2";
import { EventBufferMemory } from "./buffer/event-buffer-memory.js";
import { SSE_EVENT } from "./buffer/interface.js";
import { IRoomConfig, TimerSseEvent } from "./types.js";

const __DEV__ = process.env.NODE_ENV !== "production";
export interface PutTimerData {
  timer: number;
  user: string;
}
export interface PutBreakTimerData {
  breaktimer: number;
  user: string;
}
export type PutTimer = PutTimerData | PutBreakTimerData;

const defaultCreateBuffer = () =>
  new EventBufferMemory({
    events: {
      timer: {
        ttl: 1000 * 60 * 60 * 24, // 24 hours
      },
      config: {
        size: 1,
      },
    },
  });

export class Room extends EventEmitter {
  static SSE_EVENT = SSE_EVENT;

  private static rooms = new Map<string, Room>();

  static async getOrCreate(
    req: Http2ServerRequest,
    createBuffer = defaultCreateBuffer
  ) {
    const pathname = new URL(req.url, "http://example.com").pathname;
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length === 0) return;

    const roomName = parts[0];

    const room = Room.rooms.get(roomName) ?? new Room(createBuffer());
    Room.rooms.set(roomName, room);

    !__DEV__ && room.setMaxListeners(Infinity);

    return room;
  }

  constructor(
    private buffer: EventBufferMemory,
    private _config: IRoomConfig = {
      minutes: 10,
      breakMinutes: 5,
      breakEvery: 3,
    }
  ) {
    super();
    this.buffer.on(SSE_EVENT, (event) => this.emit(SSE_EVENT, event));
    this.buffer.on("error", (err) => this.emit("error", err));
  }

  async putTimer(data: PutTimer) {
    const timer = "timer" in data ? data.timer : data.breaktimer;
    const type = "timer" in data ? "timer" : "breakTimer";
    const user = data.user;
    const starts = new Date();
    const ends = new Date(starts.getTime() + timer * 1000 * 60);
    const eventData: TimerSseEvent = { type, user, ends, starts };
    await this.buffer.publish({
      event: "timer",
      id: randomUUID(),
      data: JSON.stringify(eventData),
    });
  }
  async getConfig() {
    return this._config;
  }

  async setConfig(config: IRoomConfig) {
    this._config = config;
    await this.buffer.publish({
      event: "config",
      id: randomUUID(),
      data: JSON.stringify(config),
    });
  }

  async getSseMessages(lastEventId: string | string[] | undefined | null) {
    return this.buffer.getMessages(lastEventId);
  }

  close() {
    this.emit("close");
    this.buffer.removeAllListeners();
    this.removeAllListeners();
  }
}
