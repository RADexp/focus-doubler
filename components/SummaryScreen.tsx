"use client";

import { useState } from "react";
import type { SessionRecord } from "@/lib/types";
import Chips from "./Chips";
import EntryList from "./EntryList";
import RateIcon from "./RateIcon";

/** Dostępne długości dogrywki, w minutach. */
const EXTEND_OPTIONS = [10, 15, 20, 30];

export default function SummaryScreen({
  record,
  blockExpired,
  onExtend,
  onBreak,
}: {
  record: SessionRecord;
  /** Czas bloku wyczerpał się w trakcie tej sesji — dalej idzie się do podsumowania bloku. */
  blockExpired: boolean;
  /** Dogrywka: rozciąga tę sesję o podaną liczbę minut. */
  onExtend: (min: number) => void;
  /** Dalej: ekran przerwy (stamtąd start kolejnej sesji). */
  onBreak: () => void;
}) {
  const [extraMin, setExtraMin] = useState(EXTEND_OPTIONS[0]);

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
            <div className="lbl">
              <RateIcon rating="up" size={12} />
              skupiony
            </div>
          </div>
          <div className="stat-box down">
            <div className="num">{record.down}</div>
            <div className="lbl">
              <RateIcon rating="down" size={12} />
              rozproszony
            </div>
          </div>
        </div>
        <div className="extend">
          <div className="extend-title">Chcesz jeszcze trochę?</div>
          <p className="extend-hint">
            Dodaj dogrywkę do tej sesji — wynik dopisze się do bieżącego.
          </p>
          <Chips
            values={EXTEND_OPTIONS}
            value={extraMin}
            onChange={setExtraMin}
            label="Długość dogrywki w minutach"
          />
          <button
            className="btn btn-ghost extend-btn"
            onClick={() => onExtend(extraMin)}
          >
            + Dodaj {extraMin} min
          </button>
        </div>
        <div style={{ marginTop: 18 }}>
          <button className="btn btn-primary" onClick={onBreak}>
            {blockExpired ? "◈ Zamknij blok" : "◈ Przejdź do przerwy"}
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
