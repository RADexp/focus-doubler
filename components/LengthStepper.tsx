"use client";

/** Długość sesji: od 20 do 60 minut, skokami po 5. */
export const LENGTH_STEP_MIN = 5;
export const LENGTH_MIN_MIN = 20;
export const LENGTH_MAX_MIN = 60;

/** Dwie długości pod ręką — reszta zakresu przez plus i minus. */
const QUICK = [30, 45];

/** Jedyne miejsce, które pilnuje granic — używa go też odczyt z localStorage. */
export function clampLengthMin(v: number): number {
  return Math.min(LENGTH_MAX_MIN, Math.max(LENGTH_MIN_MIN, v));
}

export default function LengthStepper({
  lengthMin,
  setLengthMin,
}: {
  lengthMin: number;
  setLengthMin: (v: number) => void;
}) {
  return (
    <>
      <div className="group-title">Długość sesji (min)</div>

      <div className="stepper">
        <button
          type="button"
          className={`step-btn${lengthMin <= LENGTH_MIN_MIN ? " dim" : ""}`}
          onClick={() => setLengthMin(clampLengthMin(lengthMin - LENGTH_STEP_MIN))}
          disabled={lengthMin <= LENGTH_MIN_MIN}
          aria-label="Skróć sesję o 5 minut"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M5 12h14" />
          </svg>
        </button>
        <span className="step-val">
          <span className="step-num">{lengthMin}</span>
          <span className="step-unit">minut</span>
        </span>
        <button
          type="button"
          className={`step-btn${lengthMin >= LENGTH_MAX_MIN ? " dim" : ""}`}
          onClick={() => setLengthMin(clampLengthMin(lengthMin + LENGTH_STEP_MIN))}
          disabled={lengthMin >= LENGTH_MAX_MIN}
          aria-label="Wydłuż sesję o 5 minut"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      <div className="step-meta">
        krok <b>{LENGTH_STEP_MIN} min</b> · zakres{" "}
        <b>
          {LENGTH_MIN_MIN}–{LENGTH_MAX_MIN}
        </b>
      </div>

      <div className="row step-quick" role="group" aria-label="Gotowe długości sesji">
        {QUICK.map((v) => (
          <button
            key={v}
            type="button"
            className={`chip${v === lengthMin ? " active" : ""}`}
            aria-pressed={v === lengthMin}
            onClick={() => setLengthMin(v)}
          >
            {v} min
          </button>
        ))}
      </div>
    </>
  );
}
