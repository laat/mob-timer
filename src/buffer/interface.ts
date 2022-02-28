import EventEmitter from "events";

export interface ISseEvent {
  id?: string;
  event?: string;
  data: string;
}
export interface IBufferConfig {
  /** number of messages to keep */
  replay?: number;
  /** milliseconds */
  ttl?: number;
  events: {
    [event: string]: {
      /** number of messages to keep */
      replay?: number;
      /** milliseconds */
      ttl?: number;
    };
  };
}

export interface IBuffer extends EventEmitter {
  publish(event: ISseEvent): Promise<void>;
  getMessages(
    lastEventId: string | string[] | undefined | null
  ): Promise<ISseEvent[]>;
}

export const SSE_EVENT = Symbol("SSE_EVENT");
