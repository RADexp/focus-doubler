"use client";

import BlockSetup from "./BlockSetup";
import Chips from "./Chips";
import { hmSpan } from "@/lib/time";

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
}) {
  const startsBlock = blockEnabled && !blockActive;

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
          placeholder="np. Rozdział 3 scenariusza — research i pierwszy szkic"
        />

        <div className="group-title">Długość sesji (min)</div>
        <Chips
          label="Długość sesji"
          values={[30, 45, 60]}
          value={lengthMin}
          onChange={setLengthMin}
        />

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
