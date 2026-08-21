"use client";

import { useRef, useState } from "react";
import type { SessionRecord } from "@/lib/types";
import { dateLabel } from "@/lib/time";
import EntryList from "./EntryList";

function groupByDate(sessions: SessionRecord[]) {
  const byDate: Record<string, SessionRecord[]> = {};
  for (const s of sessions) {
    const key = s.date || "nieznana-data";
    (byDate[key] ||= []).push(s);
  }
  return Object.keys(byDate)
    .sort()
    .reverse()
    .map((key) => {
      const group = [...byDate[key]].sort((a, b) =>
        (b.startedAt || "").localeCompare(a.startedAt || ""),
      );
      return {
        key,
        group,
        up: group.reduce((n, s) => n + (s.up || 0), 0),
        down: group.reduce((n, s) => n + (s.down || 0), 0),
      };
    });
}

export default function History({
  sessions,
  loaded,
  onImport,
}: {
  sessions: SessionRecord[];
  loaded: boolean;
  onImport: (imported: SessionRecord[]) => number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");

  function flash(msg: string) {
    setNote(msg);
    window.setTimeout(() => setNote(""), 4000);
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(sessions, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `focus-doubler-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(file: File) {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!Array.isArray(parsed)) {
        flash("Nieprawidłowy plik — oczekiwano listy sesji.");
        return;
      }
      const added = onImport(parsed as SessionRecord[]);
      flash(added ? `Zaimportowano ${added} sesji.` : "Brak nowych sesji.");
    } catch {
      flash("Nie udało się odczytać pliku.");
    }
  }

  const groups = groupByDate(sessions);

  return (
    <div className="panel">
      <div className="history-head">
        <h2>Historia sesji</h2>
        <div className="history-tools">
          <button
            className="mini-btn"
            onClick={handleExport}
            disabled={!sessions.length}
          >
            Eksport
          </button>
          <button className="mini-btn" onClick={() => fileRef.current?.click()}>
            Import
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {note && (
        <div className="history-empty" style={{ paddingTop: 0 }}>
          {note}
        </div>
      )}

      {!loaded ? (
        <div className="history-empty">Wczytywanie…</div>
      ) : !sessions.length ? (
        <div className="history-empty">
          Brak zapisanych sesji. Twoja pierwsza pojawi się tutaj.
        </div>
      ) : (
        groups.map(({ key, group, up, down }) => (
          <div className="date-group" key={key}>
            <div className="date-group-head">
              <span>{dateLabel(key)}</span>
              <span className="tally">
                <span className="up">👍 {up}</span>
                &nbsp; <span className="down">👎 {down}</span>
              </span>
            </div>
            {group.map((s) => (
              <details className="session-item" key={s.id}>
                <summary>
                  <span className="sess-task">{s.task || "Bez tytułu"}</span>
                  <span className="sess-meta">
                    {s.lengthMin} min · 👍{s.up || 0} 👎{s.down || 0}
                  </span>
                </summary>
                <div className="sess-entries">
                  <EntryList
                    entries={s.entries || []}
                    emptyText="Brak zapisanych check-inów w tej sesji."
                  />
                </div>
              </details>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
