import EventEmitter from "events";

export interface ISseEvent {
  id?: string;
  event?: string;
  data: string;
}
type IEventBufferConfig =
  | {
      /** number of messages to keep */
      size: number;
    }
  | {
      /** milliseconds */
      ttl: number;
    };
export interface ISseBufferConfig {
  default?: IEventBufferConfig;
  events?: { [event: string]: IEventBufferConfig };
}

export interface ISseBuffer extends EventEmitter {
  publish(event: ISseEvent): Promise<void>;
  getEvents(
    lastEventId: string | string[] | undefined | null
  ): Promise<ISseEvent[]>;
}

export const SSE_EVENT = Symbol("SSE_EVENT");
