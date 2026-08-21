import type { ActiveSession, SessionRecord } from "./types";

const SESSIONS_KEY = "focus-doubler:sessions";
const ACTIVE_KEY = "focus-doubler:active";
const SOUND_KEY = "focus-doubler:sound";
const NOTIFY_KEY = "focus-doubler:notify";

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
