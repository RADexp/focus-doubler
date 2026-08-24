"use client";

import { useEffect, useState } from "react";
import { hm, hmSpan } from "@/lib/time";

/** Blok liczymy od godziny w górę, skokami po pół godziny. */
export const BLOCK_STEP_MIN = 30;
export const BLOCK_MIN_MIN = 60;
export const BLOCK_MAX_MIN = 480;
const QUICK = [60, 90, 120, 180];

/** Ile mniej więcej trwa przerwa między sesjami — tylko do szacunku „zmieści się". */
const BREAK_GUESS_MIN = 10;

export default function BlockSetup({
  blockMin,
  setBlockMin,
  lengthMin,
  onDisable,
}: {
  blockMin: number;
  setBlockMin: (v: number) => void;
  /** Długość pojedynczej sesji — z niej liczymy, ile ich się zmieści. */
  lengthMin: number;
  onDisable: () => void;
}) {
  // Godzina zakończenia zależy od „teraz", więc liczymy ją dopiero po montażu.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const clamp = (v: number) =>
    Math.min(BLOCK_MAX_MIN, Math.max(BLOCK_MIN_MIN, v));
  const fits = Math.max(
    1,
    Math.floor((blockMin + BREAK_GUESS_MIN) / (lengthMin + BREAK_GUESS_MIN)),
  );
  const sessionWord = fits === 1 ? "sesję" : fits < 5 ? "sesje" : "sesji";

  return (
    <div className="panel">
      <div className="blk-head">
        <span className="group-title">Blok deep work</span>
        <button type="button" className="blk-off" onClick={onDisable}>
          Wyłącz
        </button>
      </div>

      <div className="stepper">
        <button
          type="button"
          className={`step-btn${blockMin <= BLOCK_MIN_MIN ? " dim" : ""}`}
          onClick={() => setBlockMin(clamp(blockMin - BLOCK_STEP_MIN))}
          disabled={blockMin <= BLOCK_MIN_MIN}
          aria-label="Skróć blok o 30 minut"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M5 12h14" />
          </svg>
        </button>
        <span className="step-val">
          <span className="step-num">{hmSpan(blockMin)}</span>
          <span className="step-unit">godz : min</span>
        </span>
        <button
          type="button"
          className={`step-btn${blockMin >= BLOCK_MAX_MIN ? " dim" : ""}`}
          onClick={() => setBlockMin(clamp(blockMin + BLOCK_STEP_MIN))}
          disabled={blockMin >= BLOCK_MAX_MIN}
          aria-label="Wydłuż blok o 30 minut"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      <div className="blk-meta">
        {now !== null && (
          <>
            koniec ok. <b>{hm(new Date(now + blockMin * 60000))}</b> ·{" "}
          </>
        )}
        zmieści <b>{fits}</b> {sessionWord} po {lengthMin} min
      </div>

      <div className="row blk-quick" role="group" aria-label="Gotowe długości bloku">
        {QUICK.map((v) => (
          <button
            key={v}
            type="button"
            className={`chip${v === blockMin ? " active" : ""}`}
            aria-pressed={v === blockMin}
            onClick={() => setBlockMin(v)}
          >
            {hmSpan(v)}
          </button>
        ))}
      </div>
    </div>
  );
}
