"use client";

import type { BlockRecord, SessionRecord } from "@/lib/types";
import { SECONDS_PER_MIN, hm, hmLeft, hmSpan } from "@/lib/time";
import RateIcon from "./RateIcon";
import RateTally from "./RateTally";

/** Ile minut dogrywki uznajemy jeszcze za „zmieścił się w czasie". */
const OVERTIME_TOLERANCE_MIN = 1;

/** Czas sesji: realny, jeśli znamy koniec — inaczej zamówiona długość. */
function sessionSec(s: SessionRecord): number {
  if (s.endedAt && s.startedAt) {
    const span =
      (new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 1000;
    if (span > 0) return span;
  }
  return (s.lengthMin || 0) * SECONDS_PER_MIN;
}

export default function BlockEndScreen({
  record,
  sessions,
  onNewBlock,
  onDone,
}: {
  record: BlockRecord;
  /** Sesje, które zmieściły się w tym bloku, od najstarszej. */
  sessions: SessionRecord[];
  onNewBlock: () => void;
  onDone: () => void;
}) {
  const workedSec = sessions.reduce((n, s) => n + sessionSec(s), 0);
  const up = sessions.reduce((n, s) => n + (s.up || 0), 0);
  const down = sessions.reduce((n, s) => n + (s.down || 0), 0);
  const rated = up + down;
  const overtime = record.actualMin - record.plannedMin;

  return (
    <>
      <div className="blk-rail done">
        <div className="blk-rail-top">
          <i />
          Blok zamknięty
          <b>{hmSpan(record.plannedMin)}</b>
        </div>
        <div className="blk-bar">
          <i style={{ width: "100%" }} />
        </div>
        <div className="blk-rail-meta">
          <span>
            {hm(new Date(record.startedAt))} → {hm(new Date(record.endedAt))}
          </span>
          <span>
            {sessions.length}{" "}
            {sessions.length === 1 ? "sesja" : sessions.length < 5 ? "sesje" : "sesji"}{" "}
            · {hmLeft(workedSec)} pracy
          </span>
        </div>
      </div>

      <div className="panel">
        <h1 className="setup-title">Blok domknięty.</h1>

        <div className="summary-stats three">
          <div className="stat-box">
            <div className="num">{sessions.length}</div>
            <div className="lbl">
              {sessions.length === 1 ? "sesja" : sessions.length < 5 ? "sesje" : "sesji"}
            </div>
          </div>
          <div className="stat-box">
            <div className="num">{hmLeft(workedSec)}</div>
            <div className="lbl">w sesjach</div>
          </div>
          <div className="stat-box up">
            <div className="num">
              {up}
              <span className="of">/{rated}</span>
            </div>
            <div className="lbl">
              <RateIcon rating="up" size={11} />
              check-inów
            </div>
          </div>
        </div>

        {sessions.length > 0 && (
          <>
            <div className="group-title">Co się zmieściło</div>
            {sessions.map((s) => (
              <div className="sess-row" key={s.id}>
                <span className="when">{hm(new Date(s.startedAt))}</span>
                <span className="what">{s.task || "Bez tytułu"}</span>
                <RateTally
                  up={s.up || 0}
                  down={s.down || 0}
                  className="tally-row"
                />
              </div>
            ))}
          </>
        )}

        {overtime > OVERTIME_TOLERANCE_MIN && (
          <div className="note-line">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            <span>
              Blok skończył się w trakcie ostatniej sesji — pozwoliliśmy jej dobiec
              do końca i zamknęliśmy go {overtime} min później.
            </span>
          </div>
        )}

        <div className="end-actions">
          <button className="btn btn-primary" onClick={onNewBlock}>
            ▶ Nowy blok {hmSpan(record.plannedMin)}
          </button>
          <button className="btn btn-ghost" onClick={onDone}>
            Koniec na dziś
          </button>
        </div>
      </div>
    </>
  );
}
