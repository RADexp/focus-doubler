"use client";

import BlockSetup from "./BlockSetup";
import Chips from "./Chips";
import LengthStepper from "./LengthStepper";
import { hmSpan } from "@/lib/time";
import type { SessionRecord } from "@/lib/types";

const RECENT_LIMIT = 5;

/** Ostatnie unikalne tytuły sesji, od najnowszych — do szybkiego wstawienia. */
function recentTasks(sessions: SessionRecord[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of [...sessions].sort((a, b) => b.id - a.id)) {
    const t = s.task.trim();
    const key = t.toLowerCase();
    if (!t || seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length === RECENT_LIMIT) break;
  }
  return out;
}

export default function SetupScreen({
  task,
  setTask,
  lengthMin,
  setLengthMin,
  freqMin,
  setFreqMin,
  blockActive,
  blockEnabled,
  setBlockEnabled,
  blockMin,
  setBlockMin,
  onStart,
  sessions,
}: {
  task: string;
  setTask: (v: string) => void;
  lengthMin: number;
  setLengthMin: (v: number) => void;
  freqMin: number;
  setFreqMin: (v: number) => void;
  /** Blok już trwa — wtedy nie ma czego ustawiać, pasek jest wyżej. */
  blockActive: boolean;
  blockEnabled: boolean;
  setBlockEnabled: (v: boolean) => void;
  blockMin: number;
  setBlockMin: (v: number) => void;
  onStart: () => void;
  sessions: SessionRecord[];
}) {
  const startsBlock = blockEnabled && !blockActive;
  const recent = task.trim() ? [] : recentTasks(sessions);

  const pickRecent = (t: string) => {
    setTask(t);
    const el = document.getElementById("taskInput") as HTMLTextAreaElement | null;
    if (el) {
      el.focus();
      requestAnimationFrame(() => el.setSelectionRange(t.length, t.length));
    }
  };

  return (
    <>
      {startsBlock && (
        <BlockSetup
          blockMin={blockMin}
          setBlockMin={setBlockMin}
          lengthMin={lengthMin}
          onDisable={() => setBlockEnabled(false)}
        />
      )}

      <div className="panel">
        {!blockEnabled && !blockActive && (
          <button
            type="button"
            className="blk-on"
            onClick={() => setBlockEnabled(true)}
          >
            <span className="plus">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            Dodaj blok <b>DEEP WORK</b>
          </button>
        )}

        <h1 className="setup-title">
          {blockActive ? "Kolejna sesja w bloku" : "Nowa sesja skupienia"}
        </h1>
        <label className="field-label" htmlFor="taskInput">
          Nad czym pracujesz?
        </label>
        <textarea
          id="taskInput"
          rows={2}
          value={task}
          onChange={(e) => setTask(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onStart();
            }
          }}
          placeholder="np. Rozdział 3 scenariusza — research i pierwszy szkic"
        />
        {recent.length > 0 && (
          <div className="recent" role="group" aria-label="Ostatnie zadania">
            <span className="recent-lbl">Ostatnio</span>
            {recent.map((t) => (
              <button
                key={t}
                type="button"
                className="recent-chip"
                title={t}
                onClick={() => pickRecent(t)}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        <LengthStepper lengthMin={lengthMin} setLengthMin={setLengthMin} />

        <div className="group-title">Częstotliwość check-inów (min)</div>
        <Chips
          label="Częstotliwość check-inów"
          values={[10, 15, 20]}
          value={freqMin}
          onChange={setFreqMin}
        />

        <div style={{ marginTop: 22 }}>
          <button className="btn btn-primary" onClick={onStart}>
            {startsBlock ? `▶ Start bloku ${hmSpan(blockMin)}` : "▶ Start sesji"}
          </button>
          {startsBlock && (
            <div className="cta-sub">
              pierwsza sesja {lengthMin} min startuje od razu
            </div>
          )}
        </div>
      </div>
    </>
  );
}
