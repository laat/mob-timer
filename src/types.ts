export type TimerSseEvent = {
  type: "timer" | "breakTimer";
  user?: string;
  starts: string | Date;
  ends: string | Date;
};

export type IRoomConfig = {
  minutes?: number;
  breakMinutes?: number;
  breakEvery?: number;
};
