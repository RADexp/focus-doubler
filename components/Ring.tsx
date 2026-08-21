import { fmt, truncate } from "@/lib/time";

const R = 100;
const CIRCUMFERENCE = 2 * Math.PI * R;

const TICKS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i * 30 * Math.PI) / 180;
  return {
    i,
    x1: 120 + 88 * Math.cos(angle),
    y1: 120 + 88 * Math.sin(angle),
    x2: 120 + 98 * Math.cos(angle),
    y2: 120 + 98 * Math.sin(angle),
  };
});

export default function Ring({
  remainingSec,
  totalSec,
  task,
}: {
  remainingSec: number;
  totalSec: number;
  task: string;
}) {
  const frac = totalSec > 0 ? Math.max(0, remainingSec / totalSec) : 0;

  return (
    <svg className="ring-svg" width="240" height="240" viewBox="0 0 240 240">
      <g>
        {TICKS.map((t) => (
          <line
            key={t.i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={t.i % 3 === 0 ? "var(--accent-dim)" : "var(--border)"}
            strokeWidth="2"
          />
        ))}
      </g>
      <circle
        cx="120"
        cy="120"
        r={R}
        fill="none"
        stroke="var(--border)"
        strokeWidth="10"
      />
      <circle
        cx="120"
        cy="120"
        r={R}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="10"
        strokeLinecap="round"
        transform="rotate(-90 120 120)"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - frac)}
      />
      <text x="120" y="122" textAnchor="middle" className="ring-center-time">
        {fmt(remainingSec)}
      </text>
      <text x="120" y="146" textAnchor="middle" className="ring-center-task">
        {truncate(task, 30)}
      </text>
    </svg>
  );
}
