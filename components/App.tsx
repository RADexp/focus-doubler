"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ActiveSession,
  CheckinEntry,
  Entry,
  SessionRecord,
} from "@/lib/types";
import { SECONDS_PER_MIN, fmt, nowHM, todayKey } from "@/lib/time";
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
import CheckinModal from "./CheckinModal";
import History from "./History";
import SessionScreen from "./SessionScreen";
import SetupScreen from "./SetupScreen";
import SummaryScreen from "./SummaryScreen";

type Phase = "setup" | "session" | "summary";

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
  resumed: boolean;
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
    if (active && active.remainingSec > 0) {
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
    } else {
      document.title = "Focus Doubler";
    }
  }, [phase, live?.remainingSec, live]);

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
    if (live.remainingSec <= 0) {
      endSession(true);
      return;
    }
    if (live.checkinRemainingSec <= 0) {
      if (soundRef.current) playChime();
      if (notifyRef.current && !document.hasFocus()) {
        void notify("◈ Check-in", `Krótki status: ${live.task}`, "checkin");
      }
      setLive((s) => (s ? { ...s, checkinOpen: true } : s));
    }
  }, [ticking, live, endSession]);

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
      resumed: false,
    });
    setPhase("session");
  }

  function closeCheckinAndResume(entry?: CheckinEntry) {
    const s = liveRef.current;
    if (!s) return;
    void closeNotifications("checkin");
    const entries = entry ? [...s.entries, entry] : s.entries;
    if (s.remainingSec <= 0) {
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

  const dotPulsing = phase === "session" && !!live && !live.paused;

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
          onNewSession={() => {
            setTask("");
            setSummary(null);
            setPhase("setup");
          }}
        />
      )}

      {phase === "session" && live?.checkinOpen && (
        <CheckinModal
          onSave={(entry) => closeCheckinAndResume(entry)}
          onSkip={() => closeCheckinAndResume()}
        />
      )}
    </div>
  );
}
