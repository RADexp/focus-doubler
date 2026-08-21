"use client";

import { useEffect, useState } from "react";
import type { Entry } from "@/lib/types";
import { fmt } from "@/lib/time";
import EntryList from "./EntryList";
import Ring from "./Ring";

export default function SessionScreen({
  task,
  totalSec,
  remainingSec,
  checkinRemainingSec,
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
        <div className="ring-wrap">
          <Ring remainingSec={remainingSec} totalSec={totalSec} task={task} />
          <div className="checkin-counter">
            ◈ Następny check-in za <b>{fmt(Math.max(0, checkinRemainingSec))}</b>
          </div>
        </div>
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
