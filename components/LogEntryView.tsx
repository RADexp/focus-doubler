import type { Entry } from "@/lib/types";

export default function LogEntryView({ entry }: { entry: Entry }) {
  if (entry.type === "system") {
    return (
      <div className="log-entry system">
        <div className="log-entry-head">
          <span>{entry.time}</span>
        </div>
        <p>{entry.note}</p>
      </div>
    );
  }

  const cls = entry.rating === "up" ? "up" : entry.rating === "down" ? "down" : "";
  const rateSymbol =
    entry.rating === "up" ? "👍" : entry.rating === "down" ? "👎" : "·";

  return (
    <div className={`log-entry ${cls}`}>
      <div className="log-entry-head">
        <span>{entry.time}</span>
        <span className="rate">{rateSymbol}</span>
      </div>
      {entry.done && (
        <>
          <p className="label">Zrobione:</p>
          <p>{entry.done}</p>
        </>
      )}
      {entry.working && (
        <>
          <p className="label">Teraz:</p>
          <p>{entry.working}</p>
        </>
      )}
      {entry.note && (
        <>
          <p className="label">Notatka:</p>
          <p>{entry.note}</p>
        </>
      )}
    </div>
  );
}
