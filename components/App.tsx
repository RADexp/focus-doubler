"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ActiveSession,
  BlockRecord,
  CheckinEntry,
  Entry,
  SessionRecord,
} from "@/lib/types";
import { SECONDS_PER_MIN, fmt, hmSpan, nowHM, todayKey } from "@/lib/time";
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
  appendBlock,
  appendSession,
  clearActive,
  clearActiveBlock,
  loadActive,
  loadActiveBlock,
  loadBlockEnabled,
  loadBlockMin,
  loadBlocks,
  loadLengthMin,
  loadSessions,
  loadSoundEnabled,
  saveActive,
  saveActiveBlock,
  saveBlockEnabled,
  saveBlockMin,
  saveBlocks,
  saveLengthMin,
  loadNotifyEnabled,
  saveNotifyEnabled,
  saveSessions,
  saveSoundEnabled,
} from "@/lib/storage";
import BlockEndScreen from "./BlockEndScreen";
import BlockRail from "./BlockRail";
import BreakScreen, { type BreakView } from "./BreakScreen";
import CheckinModal from "./CheckinModal";
import History from "./History";
import SessionScreen from "./SessionScreen";
import SetupScreen from "./SetupScreen";
import { clampLengthMin } from "./LengthStepper";
import SummaryScreen from "./SummaryScreen";

type Phase = "setup" | "session" | "summary" | "break" | "blockEnd";

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
  /** Czy ten ostatni check-in liczy się jako pełny czas (dla `endSession`). */
  finalCompleted: boolean;
  /** Ręczne, wcześniejsze zakończenie — nie naturalny koniec czasu sesji. */
  earlyEnd: boolean;
  resumed: boolean;
}

/**
 * Jaką część interwału musi mieć nieoceniona końcówka sesji, żeby wymusić
 * ostatni check-in. Chroni tylko przed pytaniem o ocenę kilku sekund pracy —
 * przy check-inie co 10 min to próg 30 s.
 */
const MIN_FINAL_CHECKIN_RATIO = 0.05;

/**
 * Ręczne "Zakończ" w trakcie sesji: jeśli od ostatniego check-inu minęło
 * więcej niż ta część interwału, dajemy możliwość oceny tego odcinka
 * zamiast po cichu go pomijać.
 */
const EARLY_END_RATIO_THRESHOLD = 0.5;

/** Blok deep work w trakcie — rama, w której odpalamy kolejne sesje. */
interface LiveBlock {
  id: number;
  date: string;
  plannedMin: number;
  startedAt: string;
  remainingSec: number;
  /** Czas bloku wyczerpany; trwająca sesja ma prawo dobiec do końca. */
  expired: boolean;
  overtimeSec: number;
  sessionIds: number[];
  marks: number[];
}

/** Domyślna długość bloku przy pierwszym uruchomieniu. */
const DEFAULT_BLOCK_MIN = 120;

/** Domyślna długość sesji, zanim użytkownik wybierze własną. */
const DEFAULT_LENGTH_MIN = 45;

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
  const [lengthMin, setLengthMinState] = useState(DEFAULT_LENGTH_MIN);
  const [freqMin, setFreqMin] = useState(15);

  const [live, setLive] = useState<Live | null>(null);
  const [summary, setSummary] = useState<SessionRecord | null>(null);
  const [blocks, setBlocks] = useState<BlockRecord[]>([]);
  const [block, setBlock] = useState<LiveBlock | null>(null);
  const [blockEnabled, setBlockEnabledState] = useState(false);
  const [blockMin, setBlockMinState] = useState(DEFAULT_BLOCK_MIN);
  /** Zamknięty przed chwilą blok — do ekranu podsumowania. */
  const [blockSummary, setBlockSummary] = useState<BlockRecord | null>(null);
  /** Trwająca przerwa; null = ekran wyboru długości. */
  const [brk, setBrk] = useState<Brk | null>(null);

  const liveRef = useRef<Live | null>(null);
  liveRef.current = live;
  const blockRef = useRef<LiveBlock | null>(null);
  blockRef.current = block;
  /** Dzwonek o końcu bloku ma zabrzmieć raz. */
  const blockAlerted = useRef(false);
  const soundRef = useRef(soundEnabled);
  soundRef.current = soundEnabled;
  const notifyRef = useRef(notifyEnabled);
  notifyRef.current = notifyEnabled;

  // ---------- start: wczytaj dane z localStorage ----------
  useEffect(() => {
    setSessions(loadSessions());
    setBlocks(loadBlocks());
    setBlockEnabledState(loadBlockEnabled());
    setBlockMinState(loadBlockMin(DEFAULT_BLOCK_MIN));
    setLengthMinState(clampLengthMin(loadLengthMin(DEFAULT_LENGTH_MIN)));
    setSoundEnabled(loadSoundEnabled());
    setNotifyEnabled(loadNotifyEnabled() && notifyPermission() === "granted");
    setLoaded(true);
    registerServiceWorker();

    const activeBlock = loadActiveBlock();
    if (activeBlock) {
      setBlock({
        id: activeBlock.id,
        date: activeBlock.date,
        plannedMin: activeBlock.plannedMin,
        startedAt: activeBlock.startedAt,
        remainingSec: activeBlock.remainingSec,
        expired: activeBlock.expired,
        overtimeSec: activeBlock.overtimeSec || 0,
        sessionIds: activeBlock.sessionIds || [],
        marks: activeBlock.marks || [],
      });
      blockAlerted.current = activeBlock.expired;
    }

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
        finalCompleted: true,
        earlyEnd: false,
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

  // ---------- zegar bloku ----------
  // Blok liczy się także w przerwie i między sesjami (przerwa jest jego częścią),
  // ale stoi razem z sesją: pauza i otwarty check-in zatrzymują oba zegary.
  const blockTicking =
    !!block &&
    phase !== "blockEnd" &&
    !(phase === "session" && !!live && (live.paused || live.checkinOpen));

  useEffect(() => {
    if (!blockTicking) return;
    let last = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now();
      const delta = (now - last) / 1000;
      last = now;
      setBlock((b) => {
        if (!b) return b;
        if (b.remainingSec > 0) {
          const rem = b.remainingSec - delta;
          return rem > 0
            ? { ...b, remainingSec: rem }
            : { ...b, remainingSec: 0, expired: true, overtimeSec: -rem };
        }
        return { ...b, overtimeSec: b.overtimeSec + delta };
      });
    }, 250);
    return () => window.clearInterval(id);
  }, [blockTicking]);

  // ---------- koniec czasu bloku ----------
  useEffect(() => {
    if (!block?.expired || blockAlerted.current) return;
    blockAlerted.current = true;
    if (soundRef.current) playChime();
    if (notifyRef.current && !document.hasFocus()) {
      void notify(
        "◈ Koniec bloku deep work",
        "Trwająca sesja dobiegnie końca, potem podsumowanie.",
        "block-end",
      );
    }
  }, [block?.expired]);

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

  // ---------- zapis aktywnego bloku ----------
  useEffect(() => {
    if (!block) return;
    const persist = () => {
      const b = blockRef.current;
      if (!b) return;
      saveActiveBlock({ ...b, savedAt: Date.now() });
    };
    persist();
    const id = window.setInterval(persist, 5000);
    window.addEventListener("beforeunload", persist);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("beforeunload", persist);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block?.id]);

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

    const b = blockRef.current;
    const record: SessionRecord = {
      id: Date.now(),
      date: todayKey(),
      startedAt: s.startedAt,
      endedAt: new Date().toISOString(),
      task: s.task,
      lengthMin: s.lengthMin,
      checkinFreqMin: s.freqMin,
      entries,
      up,
      down,
      completed,
      blockId: b?.id,
    };

    if (b) {
      const elapsedSec =
        b.plannedMin * SECONDS_PER_MIN - b.remainingSec + b.overtimeSec;
      const next: LiveBlock = {
        ...b,
        sessionIds: [...b.sessionIds, record.id],
        marks: [...b.marks, elapsedSec],
      };
      blockRef.current = next;
      setBlock(next);
    }

    if (completed && notifyRef.current && !document.hasFocus()) {
      void notify(
        "Sesja zakończona",
        `${s.task} · skupiony ${up} · rozproszony ${down}`,
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

  /** Domknięcie bloku: zapis rekordu i przejście na ekran podsumowania. */
  const closeBlock = useCallback(() => {
    const b = blockRef.current;
    if (!b) return;
    const ended = new Date();
    // Liczymy zegarem bloku, nie ściennym — pauzy nie mają udawać dogrywki.
    const actualMin = Math.round(
      (b.plannedMin * SECONDS_PER_MIN -
        Math.max(0, b.remainingSec) +
        b.overtimeSec) /
        SECONDS_PER_MIN,
    );
    const record: BlockRecord = {
      id: b.id,
      date: b.date,
      startedAt: b.startedAt,
      endedAt: ended.toISOString(),
      plannedMin: b.plannedMin,
      actualMin,
      sessionIds: b.sessionIds,
    };
    void closeNotifications("block-end");
    setBlocks(appendBlock(record));
    clearActiveBlock();
    blockRef.current = null;
    setBlock(null);
    setBrk(null);
    setSummary(null);
    setBlockSummary(record);
    setPhase("blockEnd");
  }, []);

  // Blok czeka tylko na trwającą sesję — poza nią domyka się sam.
  useEffect(() => {
    if (!block?.expired) return;
    if (phase !== "setup" && phase !== "break") return;
    closeBlock();
  }, [block?.expired, phase, closeBlock]);

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
      s
        ? {
            ...s,
            checkinOpen: true,
            finalCheckin: timeUp,
            finalCompleted: true,
            earlyEnd: false,
          }
        : s,
    );
  }, [ticking, live, endSession]);

  /** Ręczne "Zakończ": poniżej progu kończy od razu, powyżej — pyta o ocenę odcinka. */
  const requestEnd = useCallback(() => {
    const s = liveRef.current;
    if (!s) return;
    const intervalSec = s.freqMin * SECONDS_PER_MIN;
    const elapsedSec = intervalSec - Math.max(0, s.checkinRemainingSec);
    const pastThreshold =
      intervalSec > 0 && elapsedSec / intervalSec > EARLY_END_RATIO_THRESHOLD;
    if (!pastThreshold) {
      endSession(false);
      return;
    }
    setLive((cur) =>
      cur
        ? {
            ...cur,
            checkinOpen: true,
            finalCheckin: true,
            finalCompleted: false,
            earlyEnd: true,
          }
        : cur,
    );
  }, [endSession]);

  /** Długość sesji zostaje na kolejny start — jak długość bloku. */
  function setLengthMin(v: number) {
    setLengthMinState(v);
    saveLengthMin(v);
  }

  function setBlockEnabled(v: boolean) {
    setBlockEnabledState(v);
    saveBlockEnabled(v);
  }

  function setBlockMin(v: number) {
    setBlockMinState(v);
    saveBlockMin(v);
  }

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

    // Pierwsza sesja otwiera blok; kolejne wchodzą do już otwartego.
    let inBlock = blockRef.current;
    if (!inBlock && blockEnabled) {
      const started = new Date();
      const fresh: LiveBlock = {
        id: started.getTime(),
        date: todayKey(),
        plannedMin: blockMin,
        startedAt: started.toISOString(),
        remainingSec: blockMin * SECONDS_PER_MIN,
        expired: false,
        overtimeSec: 0,
        sessionIds: [],
        marks: [],
      };
      blockAlerted.current = false;
      blockRef.current = fresh;
      setBlock(fresh);
      inBlock = fresh;
    }

    setLive({
      task: finalTask,
      lengthMin,
      freqMin,
      startedAt: new Date().toISOString(),
      entries: [
        {
          type: "system",
          time: nowHM(),
          note: inBlock
            ? `Sesja rozpoczęta: „${finalTask}” · ${lengthMin} min · check-in co ${freqMin} min · blok ${hmSpan(inBlock.plannedMin)}`
            : `Sesja rozpoczęta: „${finalTask}” · ${lengthMin} min · check-in co ${freqMin} min`,
        },
      ],
      remainingSec: totalSec,
      checkinRemainingSec: freqMin * SECONDS_PER_MIN,
      paused: false,
      checkinOpen: false,
      finalCheckin: false,
      finalCompleted: true,
      earlyEnd: false,
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
      endSession(s.finalCompleted);
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
    const s = liveRef.current;
    endSession(!!s?.finalCheckin && s.finalCompleted);
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

  function handleImport(
    importedSessions: SessionRecord[],
    importedBlocks: BlockRecord[],
  ): number {
    const existingBlocks = loadBlocks();
    const seenBlocks = new Set(existingBlocks.map((b) => b.id));
    const freshBlocks = importedBlocks.filter(
      (b) => b && typeof b === "object" && b.id && !seenBlocks.has(b.id),
    );
    if (freshBlocks.length) {
      const mergedBlocks = [...existingBlocks, ...freshBlocks];
      saveBlocks(mergedBlocks);
      setBlocks(mergedBlocks);
    }

    const existing = loadSessions();
    const seen = new Set(existing.map((s) => s.id));
    const fresh = importedSessions.filter(
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

      {block && phase !== "blockEnd" && (
        <BlockRail
          plannedMin={block.plannedMin}
          remainingSec={block.remainingSec}
          expired={block.expired}
          overtimeSec={block.overtimeSec}
          marks={block.marks}
          sessionCount={block.sessionIds.length}
          paused={phase === "session" && !!live && live.paused}
          startedAt={block.startedAt}
          canClose={phase === "setup" || phase === "break"}
          onClose={closeBlock}
        />
      )}

      {phase === "setup" && (
        <>
          <SetupScreen
            task={task}
            setTask={setTask}
            lengthMin={lengthMin}
            setLengthMin={setLengthMin}
            freqMin={freqMin}
            setFreqMin={setFreqMin}
            blockActive={!!block}
            blockEnabled={blockEnabled}
            setBlockEnabled={setBlockEnabled}
            blockMin={blockMin}
            setBlockMin={setBlockMin}
            onStart={startSession}
          />
          <History
            sessions={sessions}
            blocks={blocks}
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
          onEnd={requestEnd}
        />
      )}

      {phase === "summary" && summary && (
        <SummaryScreen
          record={summary}
          blockExpired={!!block?.expired}
          onBreak={() => {
            if (block?.expired) {
              closeBlock();
              return;
            }
            setBrk(null);
            setPhase("break");
          }}
        />
      )}

      {phase === "break" && (
        <BreakScreen
          view={breakView}
          blockLeftSec={block ? block.remainingSec : null}
          lengthMin={lengthMin}
          onPick={startBreak}
          onSkip={leaveBreak}
        />
      )}

      {phase === "blockEnd" && blockSummary && (
        <BlockEndScreen
          record={blockSummary}
          sessions={sessions.filter((s) => s.blockId === blockSummary.id)}
          onNewBlock={() => {
            setBlockSummary(null);
            setBlockMin(blockSummary.plannedMin);
            setBlockEnabled(true);
            setTask("");
            setPhase("setup");
          }}
          onDone={() => {
            setBlockSummary(null);
            setBlockEnabled(false);
            setTask("");
            setPhase("setup");
          }}
        />
      )}

      {phase === "session" && live?.checkinOpen && (
        <CheckinModal
          final={live.finalCheckin}
          earlyEnd={live.earlyEnd}
          onSave={saveCheckin}
          onAbort={abortFromCheckin}
        />
      )}

      <footer className="app-version">Focus Doubler v{APP_VERSION}</footer>
    </div>
  );
}
