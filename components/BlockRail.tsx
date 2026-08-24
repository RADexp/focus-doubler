"use client";

import { SECONDS_PER_MIN, hm, hmLeft, hmSpan } from "@/lib/time";

/**
 * Pasek bloku deep work — rama nad wszystkimi ekranami. Celowo cichszy niż
 * licznik check-inu: blok ma przypominać o sobie, a nie przejmować uwagę.
 */
export default function BlockRail({
  plannedMin,
  remainingSec,
  expired,
  overtimeSec,
  marks,
  sessionCount,
  paused,
  startedAt,
  canClose,
  onClose,
}: {
  plannedMin: number;
  remainingSec: number;
  expired: boolean;
  overtimeSec: number;
  marks: number[];
  /** Ile sesji już się w bloku zamknęło. */
  sessionCount: number;
  paused: boolean;
  startedAt: string;
  /** Zamknięcie z ręki ma sens tylko poza trwającą sesją. */
  canClose: boolean;
  onClose: () => void;
}) {
  const totalSec = plannedMin * SECONDS_PER_MIN;
  const elapsed = Math.min(totalSec, totalSec - Math.max(0, remainingSec));
  const pct = totalSec > 0 ? (elapsed / totalSec) * 100 : 0;

  const start = new Date(startedAt);
  const end = new Date(start.getTime() + totalSec * 1000);

  const label = expired
    ? "Czas bloku wyczerpany"
    : paused
      ? "Blok wstrzymany"
      : "Blok deep work";

  const left = expired
    ? `dogrywka ${hmLeft(overtimeSec)} — czekamy na koniec sesji`
    : paused
      ? "zegar bloku stoi razem z sesją"
      : `minęło ${hmLeft(elapsed)} · ${sessionCount === 0 ? "pierwsza sesja" : `sesja ${sessionCount + 1}`}`;

  const right = expired
    ? `plan ${hm(start)} → ${hm(end)}`
    : `zostało ${hmLeft(remainingSec)} · koniec ${hm(end)}`;

  return (
    <div
      className={`blk-rail${expired ? " done" : ""}${paused && !expired ? " paused" : ""}`}
    >
      <div className="blk-rail-top">
        <i />
        {label}
        <b>{hmSpan(plannedMin)}</b>
        {canClose && (
          <button type="button" className="blk-close" onClick={onClose}>
            Zamknij blok
          </button>
        )}
      </div>
      <div className="blk-bar">
        <i style={{ width: `${pct.toFixed(1)}%` }} />
        {marks.map((sec, i) => {
          const at = totalSec > 0 ? (sec / totalSec) * 100 : 0;
          if (at <= 0 || at >= 100) return null;
          return (
            <span key={i} className="tick" style={{ left: `${at.toFixed(1)}%` }} />
          );
        })}
      </div>
      <div className="blk-rail-meta">
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}
