"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ActiveSession,
  CheckinEntry,
  Entry,
  SessionRecord,
} from "@/lib/types";
import { SECONDS_PER_MIN, fmt, nowHM, todayKey } from "@/lib/time";
import { APP_VERSION } from "@/lib/version";
import { playChime } from "@/lib/chime";
import {
  closeNotifications,
  notify,
  notifyPermission,
  notifySupported,
  registerServiceWorker,
  requestNotifyPermission,
} from "@/lib/notify";
import {
  appendSession,
  clearActive,
  loadActive,
  loadSessions,
  loadSoundEnabled,
  saveActive,
  loadNotifyEnabled,
  saveNotifyEnabled,
  saveSessions,
  saveSoundEnabled,
} from "@/lib/storage";
import BreakScreen, { type BreakView } from "./BreakScreen";
import CheckinModal from "./CheckinModal";
import History from "./History";
import SessionScreen from "./SessionScreen";
import SetupScreen from "./SetupScreen";
import SummaryScreen from "./SummaryScreen";

type Phase = "setup" | "session" | "summary" | "break";

interface Live {
  task: string;
  lengthMin: number;
  freqMin: number;
  startedAt: string;
  entries: Entry[];
  remainingSec: number;
  checkinRemainingSec: number;
  paused: boolean;
  checkinOpen: boolean;
  /** Ten check-in jest ostatni — po zapisaniu oceny sesja się kończy. */
  finalCheckin: boolean;
  resumed: boolean;
}

/**
 * Jaką część interwału musi mieć nieoceniona końcówka sesji, żeby wymusić
 * ostatni check-in. Chroni tylko przed pytaniem o ocenę kilku sekund pracy —
 * przy check-inie co 10 min to próg 30 s.
 */
const MIN_FINAL_CHECKIN_RATIO = 0.05;

interface Brk {
  totalSec: number;
  leftSec: number;
  /** Czas przerwy dobiegł końca — czekamy na powrót do pracy. */
  finished: boolean;
}

export default function App() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [hint, setHint] = useState("");

  const [task, setTask] = useState("");
  const [lengthMin, setLengthMin] = useState(45);
  const [freqMin, setFreqMin] = useState(15);

  const [live, setLive] = useState<Live | null>(null);
  const [summary, setSummary] = useState<SessionRecord | null>(null);
  /** Trwająca przerwa; null = ekran wyboru długości. */
  const [brk, setBrk] = useState<Brk | null>(null);

  const liveRef = useRef<Live | null>(null);
  liveRef.current = live;
  const soundRef = useRef(soundEnabled);
  soundRef.current = soundEnabled;
  const notifyRef = useRef(notifyEnabled);
  notifyRef.current = notifyEnabled;

  // ---------- start: wczytaj dane z localStorage ----------
  useEffect(() => {
    setSessions(loadSessions());
    setSoundEnabled(loadSoundEnabled());
    setNotifyEnabled(loadNotifyEnabled() && notifyPermission() === "granted");
    setLoaded(true);
    registerServiceWorker();

    const active = loadActive();
    if (active) {
      setLive({
        task: active.task,
        lengthMin: active.lengthMin,
        freqMin: active.freqMin,
        startedAt: active.startedAt,
        entries: active.entries || [],
        remainingSec: active.remainingSec,
        checkinRemainingSec: active.checkinRemainingSec,
        paused: true,
        checkinOpen: false,
        finalCheckin: false,
        resumed: true,
      });
      setTask(active.task);
      setLengthMin(active.lengthMin);
      setFreqMin(active.freqMin);
      setPhase("session");
    }
  }, []);

  // ---------- zegar (liczony z realnego czasu, odporny na throttling kart) ----------
  const ticking =
    phase === "session" && !!live && !live.paused && !live.checkinOpen;

  useEffect(() => {
    if (!ticking) return;
    let last = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now();
      const delta = (now - last) / 1000;
      last = now;
      setLive((s) =>
        s
          ? {
              ...s,
              remainingSec: s.remainingSec - delta,
              checkinRemainingSec: s.checkinRemainingSec - delta,
            }
          : s,
      );
    }, 250);
    return () => window.clearInterval(id);
  }, [ticking]);

  // ---------- zegar przerwy ----------
  const breakTicking = phase === "break" && !!brk && !brk.finished;

  useEffect(() => {
    if (!breakTicking) return;
    let last = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now();
      const delta = (now - last) / 1000;
      last = now;
      setBrk((b) => (b ? { ...b, leftSec: b.leftSec - delta } : b));
    }, 250);
    return () => window.clearInterval(id);
  }, [breakTicking]);

  useEffect(() => {
    if (!breakTicking || !brk || brk.leftSec > 0) return;
    if (soundRef.current) playChime();
    if (notifyRef.current && !document.hasFocus()) {
      void notify("◈ Koniec przerwy", "Czas na kolejną sesję skupienia.", "break-end");
    }
    setBrk((b) => (b ? { ...b, leftSec: 0, finished: true } : b));
  }, [breakTicking, brk]);

  // ---------- zapis aktywnej sesji (przetrwa odświeżenie) ----------
  useEffect(() => {
    if (phase !== "session") return;
    const persist = () => {
      const s = liveRef.current;
      if (!s) return;
      const snapshot: ActiveSession = {
        task: s.task,
        lengthMin: s.lengthMin,
        freqMin: s.freqMin,
        startedAt: s.startedAt,
        remainingSec: s.remainingSec,
        checkinRemainingSec: s.checkinRemainingSec,
        entries: s.entries,
        savedAt: Date.now(),
      };
      saveActive(snapshot);
    };
    persist();
    const id = window.setInterval(persist, 5000);
    window.addEventListener("beforeunload", persist);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("beforeunload", persist);
    };
  }, [phase, live?.entries]);

  // ---------- tytuł karty ----------
  useEffect(() => {
    if (phase === "session" && live) {
      document.title = `${fmt(live.remainingSec)} · Focus Doubler`;
    } else if (phase === "break" && brk && !brk.finished) {
      document.title = `${fmt(brk.leftSec)} · Przerwa`;
    } else {
      document.title = "Focus Doubler";
    }
  }, [phase, live?.remainingSec, live, brk]);

  const endSession = useCallback((completed: boolean) => {
    const s = liveRef.current;
    if (!s) return;
    const up = s.entries.filter(
      (e) => e.type === "checkin" && e.rating === "up",
    ).length;
    const down = s.entries.filter(
      (e) => e.type === "checkin" && e.rating === "down",
    ).length;
    const entries: Entry[] = [
      ...s.entries,
      {
        type: "system",
        time: nowHM(),
        note: completed
          ? "Sesja zakończona — pełny czas."
          : "Sesja zakończona wcześniej.",
      },
    ];

    const record: SessionRecord = {
      id: Date.now(),
      date: todayKey(),
      startedAt: s.startedAt,
      task: s.task,
      lengthMin: s.lengthMin,
      checkinFreqMin: s.freqMin,
      entries,
      up,
      down,
      completed,
    };

    if (completed && notifyRef.current && !document.hasFocus()) {
      void notify(
        "Sesja zakończona",
        `${s.task} · 👍 ${up} 👎 ${down}`,
        "session-end",
      );
    }
    void closeNotifications("checkin");

    setSessions(appendSession(record));
    clearActive();
    setSummary(record);
    setLive(null);
    setPhase("summary");
  }, []);

  // ---------- reakcja na wyzerowanie liczników ----------
  useEffect(() => {
    if (!ticking || !live) return;
    const timeUp = live.remainingSec <= 0;
    const checkinDue = live.checkinRemainingSec <= 0;
    if (!timeUp && !checkinDue) return;

    // Koniec sesji nigdy nie wyprzedza check-inu: najpierw ocena odcinka,
    // dopiero po niej podsumowanie. Pomijamy tylko końcówki krótsze niż próg.
    if (timeUp) {
      const intervalSec = live.freqMin * SECONDS_PER_MIN;
      const unratedSec = intervalSec - Math.max(0, live.checkinRemainingSec);
      if (unratedSec < intervalSec * MIN_FINAL_CHECKIN_RATIO) {
        endSession(true);
        return;
      }
    }

    if (soundRef.current) playChime();
    if (notifyRef.current && !document.hasFocus()) {
      void notify(
        timeUp ? "◈ Ostatni check-in" : "◈ Check-in",
        `Krótki status: ${live.task}`,
        "checkin",
      );
    }
    setLive((s) =>
      s ? { ...s, checkinOpen: true, finalCheckin: timeUp } : s,
    );
  }, [ticking, live, endSession]);

  /** Start przerwy o zadanej długości. */
  function startBreak(min: number) {
    const sec = min * SECONDS_PER_MIN;
    setBrk({ totalSec: sec, leftSec: sec, finished: false });
  }

  /** Koniec przerwy — z powrotem do ekranu nowej sesji. */
  function leaveBreak() {
    void closeNotifications("break-end");
    setBrk(null);
    setSummary(null);
    setTask("");
    setPhase("setup");
  }

  function startSession() {
    const finalTask = task.trim() || "Sesja skupienia";
    const totalSec = lengthMin * SECONDS_PER_MIN;
    setLive({
      task: finalTask,
      lengthMin,
      freqMin,
      startedAt: new Date().toISOString(),
      entries: [
        {
          type: "system",
          time: nowHM(),
          note: `Sesja rozpoczęta: „${finalTask}” · ${lengthMin} min · check-in co ${freqMin} min`,
        },
      ],
      remainingSec: totalSec,
      checkinRemainingSec: freqMin * SECONDS_PER_MIN,
      paused: false,
      checkinOpen: false,
      finalCheckin: false,
      resumed: false,
    });
    setPhase("session");
  }

  function saveCheckin(entry: CheckinEntry) {
    const s = liveRef.current;
    if (!s) return;
    void closeNotifications("checkin");
    const entries = [...s.entries, entry];
    if (s.finalCheckin || s.remainingSec <= 0) {
      liveRef.current = { ...s, entries, checkinOpen: false };
      setLive(liveRef.current);
      endSession(true);
      return;
    }
    setLive({
      ...s,
      entries,
      checkinOpen: false,
      checkinRemainingSec: s.freqMin * SECONDS_PER_MIN,
    });
  }

  /** Wyjście awaryjne z check-inu: nie wraca do pracy, tylko kończy sesję. */
  function abortFromCheckin() {
    void closeNotifications("checkin");
    endSession(liveRef.current?.finalCheckin ?? false);
  }

  function flashHint(msg: string) {
    setHint(msg);
    window.setTimeout(() => setHint(""), 6000);
  }

  function toggleSound() {
    setSoundEnabled((v) => {
      saveSoundEnabled(!v);
      return !v;
    });
  }

  async function toggleNotify() {
    if (notifyEnabled) {
      setNotifyEnabled(false);
      saveNotifyEnabled(false);
      return;
    }
    if (!notifySupported()) {
      flashHint("Ta przeglądarka nie obsługuje powiadomień systemowych.");
      return;
    }
    const perm = await requestNotifyPermission();
    if (perm === "granted") {
      setNotifyEnabled(true);
      saveNotifyEnabled(true);
      void notify(
        "Powiadomienia włączone",
        "Tak wygląda przypomnienie o check-inie.",
        "test",
      );
      return;
    }
    flashHint(
      perm === "denied"
        ? "Powiadomienia są zablokowane w ustawieniach przeglądarki dla tej strony."
        : "Zgoda na powiadomienia nie została udzielona.",
    );
  }

  function handleImport(imported: SessionRecord[]): number {
    const existing = loadSessions();
    const seen = new Set(existing.map((s) => s.id));
    const fresh = imported.filter(
      (s) => s && typeof s === "object" && s.id && !seen.has(s.id),
    );
    if (!fresh.length) return 0;
    const merged = [...existing, ...fresh];
    saveSessions(merged);
    setSessions(merged);
    return fresh.length;
  }

  const dotPulsing =
    (phase === "session" && !!live && !live.paused) ||
    (phase === "break" && !!brk && !brk.finished);

  const breakView: BreakView = !brk
    ? { kind: "pick" }
    : brk.finished
      ? { kind: "done" }
      : { kind: "run", leftSec: brk.leftSec, totalSec: brk.totalSec };

  return (
    <div className="app">
      <div className="brand">
        <span className={`dot${dotPulsing ? " pulse" : ""}`} />
        <span>System</span> <b>Focus&nbsp;Doubler</b>
        <div className="brand-tools">
          <button
            className={`sound-toggle${notifyEnabled ? "" : " off"}`}
            aria-pressed={notifyEnabled}
            title={`Powiadomienia systemowe: ${notifyEnabled ? "włączone" : "wyłączone"}`}
            onClick={() => void toggleNotify()}
          >
            {notifyEnabled ? "🔔" : "🔕"}
          </button>
          <button
            className={`sound-toggle${soundEnabled ? "" : " off"}`}
            aria-pressed={soundEnabled}
            title={`Dźwięk check-inu: ${soundEnabled ? "włączony" : "wyłączony"}`}
            onClick={toggleSound}
          >
            {soundEnabled ? "🔊" : "🔇"}
          </button>
        </div>
      </div>

      {hint && <div className="hint">{hint}</div>}

      {phase === "setup" && (
        <>
          <SetupScreen
            task={task}
            setTask={setTask}
            lengthMin={lengthMin}
            setLengthMin={setLengthMin}
            freqMin={freqMin}
            setFreqMin={setFreqMin}
            onStart={startSession}
          />
          <History
            sessions={sessions}
            loaded={loaded}
            onImport={handleImport}
          />
        </>
      )}

      {phase === "session" && live && (
        <SessionScreen
          task={live.task}
          totalSec={live.lengthMin * SECONDS_PER_MIN}
          remainingSec={live.remainingSec}
          checkinRemainingSec={live.checkinRemainingSec}
          freqMin={live.freqMin}
          startedAt={live.startedAt}
          paused={live.paused}
          entries={live.entries}
          resumed={live.resumed && live.paused}
          onTogglePause={() =>
            setLive((s) =>
              s ? { ...s, paused: !s.paused, resumed: false } : s,
            )
          }
          onEnd={() => endSession(false)}
        />
      )}

      {phase === "summary" && summary && (
        <SummaryScreen
          record={summary}
          onBreak={() => {
            setBrk(null);
            setPhase("break");
          }}
        />
      )}

      {phase === "break" && (
        <BreakScreen
          view={breakView}
          onPick={startBreak}
          onSkip={leaveBreak}
        />
      )}

      {phase === "session" && live?.checkinOpen && (
        <CheckinModal
          final={live.finalCheckin}
          onSave={saveCheckin}
          onAbort={abortFromCheckin}
        />
      )}

      <footer className="app-version">Focus Doubler v{APP_VERSION}</footer>
    </div>
  );
}
