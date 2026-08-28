"use client";

import { useRef, useState } from "react";
import type { BlockRecord, SessionRecord } from "@/lib/types";
import { dateLabel, hm, hmSpan } from "@/lib/time";
import EntryList from "./EntryList";
import RateTally from "./RateTally";

/**
 * Wiersz historii: albo blok deep work z sesjami w środku, albo pojedyncza
 * sesja odbyta poza blokiem.
 */
type Row =
  | { kind: "block"; block: BlockRecord; sessions: SessionRecord[] }
  | { kind: "session"; session: SessionRecord };

/** Sesje w kolejności od najnowszej, z podpięciem pod bloki tego samego dnia. */
function toRows(group: SessionRecord[], blocks: BlockRecord[]): Row[] {
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const rows: Row[] = [];
  const opened = new Map<number, Row & { kind: "block" }>();

  for (const s of group) {
    const block = s.blockId ? byId.get(s.blockId) : undefined;
    if (!block) {
      rows.push({ kind: "session", session: s });
      continue;
    }
    const existing = opened.get(block.id);
    if (existing) {
      existing.sessions.push(s);
      continue;
    }
    const row = { kind: "block" as const, block, sessions: [s] };
    opened.set(block.id, row);
    rows.push(row);
  }
  return rows;
}

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

function SessionItem({ session }: { session: SessionRecord }) {
  return (
    <details className="session-item">
      <summary>
        <span className="sess-task">{session.task || "Bez tytułu"}</span>
        <span className="sess-meta">
          {session.lengthMin} min
          <RateTally up={session.up || 0} down={session.down || 0} />
        </span>
      </summary>
      <div className="sess-entries">
        <EntryList
          entries={session.entries || []}
          emptyText="Brak zapisanych check-inów w tej sesji."
        />
      </div>
    </details>
  );
}

export default function History({
  sessions,
  blocks,
  loaded,
  onImport,
}: {
  sessions: SessionRecord[];
  blocks: BlockRecord[];
  loaded: boolean;
  onImport: (
    importedSessions: SessionRecord[],
    importedBlocks: BlockRecord[],
  ) => number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");

  function flash(msg: string) {
    setNote(msg);
    window.setTimeout(() => setNote(""), 4000);
  }

  function handleExport() {
    const payload = { version: 2, sessions, blocks };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
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
      // Pliki sprzed wersji 0.5 to goła lista sesji, nowsze mają też bloki.
      const shape =
        Array.isArray(parsed)
          ? { sessions: parsed as SessionRecord[], blocks: [] as BlockRecord[] }
          : parsed && typeof parsed === "object" &&
              Array.isArray((parsed as { sessions?: unknown }).sessions)
            ? {
                sessions: (parsed as { sessions: SessionRecord[] }).sessions,
                blocks: Array.isArray((parsed as { blocks?: unknown }).blocks)
                  ? (parsed as { blocks: BlockRecord[] }).blocks
                  : [],
              }
            : null;
      if (!shape) {
        flash("Nieprawidłowy plik — oczekiwano listy sesji.");
        return;
      }
      const added = onImport(shape.sessions, shape.blocks);
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
              <RateTally up={up} down={down} size={15} className="tally-day" />
            </div>
            {toRows(group, blocks).map((row) =>
              row.kind === "session" ? (
                <SessionItem key={row.session.id} session={row.session} />
              ) : (
                <div className="hist-block" key={row.block.id}>
                  <div className="hist-block-head">
                    <span>Blok {hmSpan(row.block.plannedMin)}</span>
                    <span className="hist-block-meta">
                      {hm(new Date(row.block.startedAt))} →{" "}
                      {hm(new Date(row.block.endedAt))} · {row.sessions.length}{" "}
                      {row.sessions.length === 1
                        ? "sesja"
                        : row.sessions.length < 5
                          ? "sesje"
                          : "sesji"}
                    </span>
                  </div>
                  {row.sessions.map((s) => (
                    <SessionItem key={s.id} session={s} />
                  ))}
                </div>
              ),
            )}
          </div>
        ))
      )}
    </div>
  );
}
