"use client";

import { fmt } from "@/lib/time";

/** Długości przerwy do wyboru — minuty wraz z podpowiedzią, co się w nich mieści. */
const OPTIONS: { min: number; hint: string }[] = [
  { min: 5, hint: "szybki reset" },
  { min: 10, hint: "kawa, rozciągnięcie" },
  { min: 15, hint: "spacer, posiłek" },
];

const MAX_MIN = OPTIONS[OPTIONS.length - 1].min;

export type BreakView =
  | { kind: "pick" }
  | { kind: "run"; leftSec: number; totalSec: number }
  | { kind: "done" };

export default function BreakScreen({
  view,
  onPick,
  onSkip,
}: {
  view: BreakView;
  /** Start przerwy o zadanej długości. */
  onPick: (min: number) => void;
  /** Koniec przerwy — przejście do nowej sesji skupienia. */
  onSkip: () => void;
}) {
  if (view.kind === "run") {
    const frac = view.totalSec > 0 ? Math.max(0, view.leftSec / view.totalSec) : 0;
    return (
      <div className="br-screen">
        <div className="br-eyebrow">
          <i />
          Przerwa
        </div>
        <div className="br-center">
          <p className="br-meta">
            <i className="breathe" />
            {Math.round(view.totalSec / 60)} min przerwy
          </p>
          <p className="br-clock">{fmt(view.leftSec)}</p>
          <div className="br-bar">
            <i style={{ width: `${(frac * 100).toFixed(1)}%` }} />
          </div>
        </div>
        <div className="br-foot">
          <button type="button" className="br-link" onClick={onSkip}>
            Wróć do pracy teraz →
          </button>
        </div>
      </div>
    );
  }

  if (view.kind === "done") {
    return (
      <div className="br-screen">
        <div className="br-eyebrow">
          <i />
          Przerwa zakończona
        </div>
        <div className="br-center">
          <h1 className="br-h">Wracamy.</h1>
          <p className="br-sub br-sub-tight">
            Kolejny blok skupienia czeka na temat.
          </p>
        </div>
        <div className="br-foot">
          <button type="button" className="br-link accent" onClick={onSkip}>
            Nowa sesja skupienia →
          </button>
          <button type="button" className="br-link" onClick={() => onPick(5)}>
            Jeszcze 5 minut
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="br-screen">
      <div className="br-eyebrow">
        <i />
        Sesja zakończona
      </div>
      <div className="br-body">
        <h1 className="br-h">Odetchnij.</h1>
        <p className="br-sub">
          Jedno dotknięcie startuje przerwę. Bez potwierdzania.
        </p>

        {OPTIONS.map((o, i) => (
          <button
            key={o.min}
            type="button"
            className={`br-opt${i === OPTIONS.length - 1 ? " last" : ""}`}
            onClick={() => onPick(o.min)}
          >
            <span className="br-opt-top">
              <span className="br-opt-num">{o.min}</span>
              <span className="br-opt-unit">min</span>
              <span className="br-opt-desc">{o.hint}</span>
            </span>
            <span className="br-opt-bar">
              <i style={{ width: `${(o.min / MAX_MIN) * 100}%` }} />
            </span>
          </button>
        ))}

        <button type="button" className="br-link accent" onClick={onSkip}>
          Bez przerwy — startuj kolejną sesję →
        </button>
      </div>
    </div>
  );
}
