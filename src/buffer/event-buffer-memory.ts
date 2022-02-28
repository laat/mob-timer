import EventEmitter from "events";
import { IBuffer, IBufferConfig, ISseEvent, SSE_EVENT } from "./interface.js";

interface IHistoricEvent {
  timestamp: number;
  event: ISseEvent;
}
export class EventBufferMemory extends EventEmitter implements IBuffer {
  constructor(
    private replayConfig: IBufferConfig = {
      replay: 0,
      ttl: 0,
      events: {},
    },
    private history = new Map<string, IHistoricEvent[]>()
  ) {
    super();
  }

  public static SSE_EVENT = SSE_EVENT;

  async publish(event: ISseEvent): Promise<void> {
    const eventName = event.event || "__undefined__";
    const cfg = this.replayConfig.events[eventName] ?? this.replayConfig;

    const configuredStore = cfg.replay != null || cfg.ttl != null;

    if (configuredStore) {
      let history = this.history.get(eventName) || [];
      history.push({ timestamp: Date.now(), event });

      if (cfg.replay != null && history.length > cfg.replay) {
        history.shift();
      }

      const ttl = cfg.ttl;
      if (ttl) {
        history = history.filter((e) => Date.now() - e.timestamp < ttl);
      }

      this.history.set(eventName, history);
    }
    this.emit(SSE_EVENT, event);
  }

  async getMessages(
    lastEventId: string | string[] | undefined | null
  ): Promise<ISseEvent[]> {
    const history = Array.from(this.history.entries())
      .map(([k, history]) => {
        const ttl = (this.replayConfig.events[k] ?? this.replayConfig).ttl;
        return ttl
          ? history.filter((e) => Date.now() - e.timestamp < ttl)
          : history;
      })
      .flat()
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((e) => e.event);

    const last = Array.isArray(lastEventId) ? lastEventId[0] : lastEventId;
    const index = history.findIndex((h) => h.id === last);
    if (index === -1) {
      return history;
    } else {
      return history.slice(index + 1);
    }
  }
}
