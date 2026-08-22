import type { CheckinEntry, Entry } from "@/lib/types";
import { fmt, hm } from "@/lib/time";

const URGENT_THRESHOLD_SEC = 60;
const RATE_SYMBOL: Record<"up" | "down", string> = { up: "👍", down: "👎" };

export default function SessionTimer({
  task,
  totalSec,
  remainingSec,
  checkinRemainingSec,
  freqMin,
  startedAt,
  entries,
}: {
  task: string;
  totalSec: number;
  remainingSec: number;
  checkinRemainingSec: number;
  freqMin: number;
  startedAt: string;
  entries: Entry[];
}) {
  const lengthMin = totalSec / 60;
  const freqSec = freqMin * 60;
  const elapsed = Math.max(0, totalSec - remainingSec);
  const urgent = checkinRemainingSec > 0 && checkinRemainingSec <= URGENT_THRESHOLD_SEC;

  const checkins = entries.filter(
    (e): e is CheckinEntry => e.type === "checkin",
  );

  const segCount = Math.max(1, Math.ceil(totalSec / freqSec));
  const currentIdx = Math.min(segCount - 1, Math.floor(elapsed / freqSec));
  const cells = Array.from({ length: segCount }, (_, i) => {
    const segStart = i * freqSec;
    const segLen = Math.min(totalSec, segStart + freqSec) - segStart;
    const done = i < currentIdx;
    const current = i === currentIdx;
    const pct = done ? 100 : current ? Math.min(100, ((elapsed - segStart) / segLen) * 100) : 0;
    const rating = done ? checkins[i]?.rating ?? null : null;
    return { i, pct, done, current, rating };
  });

  const start = new Date(startedAt);
  const end = new Date(start.getTime() + totalSec * 1000);

  return (
    <div className="timer-wrap">
      <div className="task-block">
        <div className="task-block-head">
          <span className="lbl">Zadanie</span>
          <span className="lbl task-meta">
            {lengthMin} min · check-in co {freqMin}
          </span>
        </div>
        <div className="task-text">{task}</div>
      </div>

      <div className="hero-row">
        <div className="hero-col">
          <span className={`hero-lbl${urgent ? " hot" : ""}`}>Do check-inu</span>
          <span className={`hero-num${urgent ? " hot" : ""}`}>
            {fmt(Math.max(0, checkinRemainingSec))}
          </span>
        </div>
        <div className="hero-col hero-col-end">
          <span className="hero-lbl-dim">Koniec sesji za</span>
          <span className="sess-num">{fmt(Math.max(0, remainingSec))}</span>
        </div>
      </div>

      <div className="timeline">
        <div className="timeline-cells">
          {cells.map((c) => (
            <div
              key={c.i}
              className={`tl-cell${c.current ? " current" : ""}${
                c.current && urgent ? " hot" : ""
              }${c.rating ? ` ${c.rating}` : ""}`}
            >
              <div className="tl-fill" style={{ width: `${c.pct}%` }} />
            </div>
          ))}
        </div>
        <div className="timeline-caps">
          {cells.map((c) => (
            <span
              key={c.i}
              className={`tl-cap${c.done ? " done" : ""}${c.current ? " current" : ""}${
                c.rating ? ` ${c.rating}` : ""
              }`}
            >
              {c.rating ? RATE_SYMBOL[c.rating] : c.i + 1}
            </span>
          ))}
        </div>
        <div className="timeline-meta">
          <span>{hm(start)} start</span>
          <span>koniec {hm(end)}</span>
        </div>
      </div>
    </div>
  );
}
