export type Rating = "up" | "down" | null;

export interface CheckinEntry {
  type: "checkin";
  time: string;
  done: string;
  working: string;
  note: string;
  rating: Rating;
}

export interface SystemEntry {
  type: "system";
  time: string;
  note: string;
}

export type Entry = CheckinEntry | SystemEntry;

export interface SessionRecord {
  id: number;
  date: string;
  startedAt: string;
  task: string;
  lengthMin: number;
  checkinFreqMin: number;
  entries: Entry[];
  up: number;
  down: number;
  completed: boolean;
}

/** Sesja w trakcie — trzymana osobno, żeby przeżyła odświeżenie strony. */
export interface ActiveSession {
  task: string;
  lengthMin: number;
  freqMin: number;
  startedAt: string;
  remainingSec: number;
  checkinRemainingSec: number;
  entries: Entry[];
  savedAt: number;
}
