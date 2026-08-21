import type { SessionRecord } from "@/lib/types";
import EntryList from "./EntryList";

export default function SummaryScreen({
  record,
  onBreak,
}: {
  record: SessionRecord;
  /** Dalej: ekran przerwy (stamtąd start kolejnej sesji). */
  onBreak: () => void;
}) {
  return (
    <>
      <div className="panel">
        <h1 className="setup-title">Podsumowanie sesji</h1>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "13.5px",
            marginTop: "-10px",
          }}
        >
          {record.task} · {record.lengthMin} min
        </p>
        <div className="summary-stats">
          <div className="stat-box up">
            <div className="num">{record.up}</div>
            <div className="lbl">👍 skupiony</div>
          </div>
          <div className="stat-box down">
            <div className="num">{record.down}</div>
            <div className="lbl">👎 rozproszony</div>
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          <button className="btn btn-primary" onClick={onBreak}>
            ◈ Przejdź do przerwy
          </button>
        </div>
      </div>
      <div className="panel">
        <div className="log-title">Pełny dziennik</div>
        <EntryList entries={record.entries} emptyText="Brak wpisów." newestFirst />
      </div>
    </>
  );
}
