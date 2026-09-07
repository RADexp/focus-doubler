import type {
  ActiveBlock,
  ActiveSession,
  BlockRecord,
  SessionRecord,
} from "./types";

const SESSIONS_KEY = "focus-doubler:sessions";
const ACTIVE_KEY = "focus-doubler:active";
const SOUND_KEY = "focus-doubler:sound";
const NOTIFY_KEY = "focus-doubler:notify";
const BLOCKS_KEY = "focus-doubler:blocks";
const ACTIVE_BLOCK_KEY = "focus-doubler:active-block";
const BLOCK_ON_KEY = "focus-doubler:block-on";
const BLOCK_MIN_KEY = "focus-doubler:block-min";
const LENGTH_MIN_KEY = "focus-doubler:length-min";
const FREQ_MIN_KEY = "focus-doubler:freq-min";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadSessions(): SessionRecord[] {
  if (typeof window === "undefined") return [];
  const list = safeParse<SessionRecord[]>(
    window.localStorage.getItem(SESSIONS_KEY),
    [],
  );
  return Array.isArray(list) ? list : [];
}

export function saveSessions(list: SessionRecord[]): void {
  try {
    window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(list));
  } catch (e) {
    console.error("Zapis sesji nie powiódł się:", e);
  }
}

export function appendSession(session: SessionRecord): SessionRecord[] {
  const list = loadSessions();
  list.push(session);
  saveSessions(list);
  return list;
}

export function loadActive(): ActiveSession | null {
  if (typeof window === "undefined") return null;
  return safeParse<ActiveSession | null>(
    window.localStorage.getItem(ACTIVE_KEY),
    null,
  );
}

export function saveActive(active: ActiveSession): void {
  try {
    window.localStorage.setItem(ACTIVE_KEY, JSON.stringify(active));
  } catch (e) {
    console.error("Zapis aktywnej sesji nie powiódł się:", e);
  }
}

export function clearActive(): void {
  try {
    window.localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}

export function loadSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(SOUND_KEY) !== "0";
}

export function saveSoundEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(SOUND_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function loadNotifyEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(NOTIFY_KEY) === "1";
}

export function saveNotifyEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(NOTIFY_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function loadBlocks(): BlockRecord[] {
  if (typeof window === "undefined") return [];
  const list = safeParse<BlockRecord[]>(
    window.localStorage.getItem(BLOCKS_KEY),
    [],
  );
  return Array.isArray(list) ? list : [];
}

export function saveBlocks(list: BlockRecord[]): void {
  try {
    window.localStorage.setItem(BLOCKS_KEY, JSON.stringify(list));
  } catch (e) {
    console.error("Zapis bloków nie powiódł się:", e);
  }
}

export function appendBlock(block: BlockRecord): BlockRecord[] {
  const list = loadBlocks();
  list.push(block);
  saveBlocks(list);
  return list;
}

export function loadActiveBlock(): ActiveBlock | null {
  if (typeof window === "undefined") return null;
  return safeParse<ActiveBlock | null>(
    window.localStorage.getItem(ACTIVE_BLOCK_KEY),
    null,
  );
}

export function saveActiveBlock(block: ActiveBlock): void {
  try {
    window.localStorage.setItem(ACTIVE_BLOCK_KEY, JSON.stringify(block));
  } catch (e) {
    console.error("Zapis aktywnego bloku nie powiódł się:", e);
  }
}

export function clearActiveBlock(): void {
  try {
    window.localStorage.removeItem(ACTIVE_BLOCK_KEY);
  } catch {
    /* ignore */
  }
}

/** Ostatnie ustawienia bloku — żeby kolejny start nie zaczynał od zera. */
export function loadBlockEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(BLOCK_ON_KEY) === "1";
}

export function saveBlockEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(BLOCK_ON_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function loadBlockMin(fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const raw = Number(window.localStorage.getItem(BLOCK_MIN_KEY));
  return Number.isFinite(raw) && raw >= 60 ? raw : fallback;
}

export function saveBlockMin(min: number): void {
  try {
    window.localStorage.setItem(BLOCK_MIN_KEY, String(min));
  } catch {
    /* ignore */
  }
}

/** Ostatnio wybrana długość sesji. Granic pilnuje clampLengthMin po stronie App. */
export function loadLengthMin(fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const raw = Number(window.localStorage.getItem(LENGTH_MIN_KEY));
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

export function saveLengthMin(min: number): void {
  try {
    window.localStorage.setItem(LENGTH_MIN_KEY, String(min));
  } catch {
    /* ignore */
  }
}

/** Ostatnio wybrana częstotliwość check-inów. */
export function loadFreqMin(fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const raw = Number(window.localStorage.getItem(FREQ_MIN_KEY));
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

export function saveFreqMin(min: number): void {
  try {
    window.localStorage.setItem(FREQ_MIN_KEY, String(min));
  } catch {
    /* ignore */
  }
}
