"use client";

import { useEffect, useState } from "react";
import type { Entry } from "@/lib/types";
import EntryList from "./EntryList";
import SessionTimer from "./SessionTimer";

export default function SessionScreen({
  task,
  totalSec,
  remainingSec,
  checkinRemainingSec,
  freqMin,
  startedAt,
  paused,
  entries,
  resumed,
  onTogglePause,
  onEnd,
}: {
  task: string;
  totalSec: number;
  remainingSec: number;
  checkinRemainingSec: number;
  freqMin: number;
  startedAt: string;
  paused: boolean;
  entries: Entry[];
  resumed: boolean;
  onTogglePause: () => void;
  onEnd: () => void;
}) {
  const [endArmed, setEndArmed] = useState(false);

  useEffect(() => {
    if (!endArmed) return;
    const id = window.setTimeout(() => setEndArmed(false), 3500);
    return () => window.clearTimeout(id);
  }, [endArmed]);

  return (
    <>
      <div className="panel">
        {resumed && (
          <div className="resume-note">
            Wznowiono przerwaną sesję — timer stoi na pauzie.
          </div>
        )}
        <SessionTimer
          task={task}
          totalSec={totalSec}
          remainingSec={remainingSec}
          checkinRemainingSec={checkinRemainingSec}
          freqMin={freqMin}
          startedAt={startedAt}
          entries={entries}
        />
        <div className="session-controls">
          <button className="btn btn-ghost" onClick={onTogglePause}>
            {paused ? "▶ Wznów" : "⏸ Pauza"}
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              if (!endArmed) {
                setEndArmed(true);
              } else {
                setEndArmed(false);
                onEnd();
              }
            }}
          >
            {endArmed ? "■ Na pewno? Kliknij ponownie" : "■ Zakończ"}
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="log-title">Dziennik sesji</div>
        <EntryList
          entries={entries}
          emptyText="Brak wpisów — pierwszy check-in wkrótce."
          newestFirst
        />
      </div>
    </>
  );
}
