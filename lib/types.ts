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
  /** Moment zamknięcia sesji — brak w rekordach sprzed wersji 0.5. */
  endedAt?: string;
  task: string;
  lengthMin: number;
  checkinFreqMin: number;
  entries: Entry[];
  up: number;
  down: number;
  completed: boolean;
  /** Blok deep work, w którym odbyła się sesja (jeśli w ogóle). */
  blockId?: number;
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

/**
 * Zamknięty blok deep work — rama, w której zmieściło się kilka sesji.
 * Zapisywany w historii jako osobny rekord, ponad sesjami.
 */
export interface BlockRecord {
  id: number;
  date: string;
  startedAt: string;
  endedAt: string;
  /** Zamówiona długość bloku w minutach (1h + wielokrotności 30 min). */
  plannedMin: number;
  /** Ile faktycznie trwał — z dogrywką na dokończenie ostatniej sesji. */
  actualMin: number;
  sessionIds: number[];
}

/** Blok w trakcie — jak ActiveSession, przeżywa odświeżenie strony. */
export interface ActiveBlock {
  id: number;
  date: string;
  plannedMin: number;
  startedAt: string;
  remainingSec: number;
  /** Czas bloku wyczerpany — czekamy tylko na koniec trwającej sesji. */
  expired: boolean;
  overtimeSec: number;
  sessionIds: number[];
  /** Sekundy od startu bloku, w których kończyły się kolejne sesje. */
  marks: number[];
  savedAt: number;
}
