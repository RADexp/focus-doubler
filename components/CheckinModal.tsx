"use client";

import { useEffect, useRef, useState } from "react";
import type { CheckinEntry, Rating } from "@/lib/types";
import { nowHM } from "@/lib/time";

export default function CheckinModal({
  final = false,
  earlyEnd = false,
  onSave,
  onAbort,
}: {
  /** Ostatni check-in sesji — po zapisie od razu podsumowanie. */
  final?: boolean;
  /** Ręczne, wcześniejsze zakończenie — nieoceniony odcinek dobiegł >50% interwału. */
  earlyEnd?: boolean;
  onSave: (entry: CheckinEntry) => void;
  onAbort: () => void;
}) {
  const [done, setDone] = useState("");
  const [working, setWorking] = useState("");
  const [note, setNote] = useState("");
  const [rating, setRating] = useState<Rating>(null);
  const firstField = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    firstField.current?.focus();
  }, []);

  function save() {
    if (!rating) return;
    onSave({
      type: "checkin",
      time: nowHM(),
      done: done.trim(),
      working: working.trim(),
      note: note.trim(),
      rating,
    });
  }

  const title = earlyEnd ? "◈ Koniec sesji" : `◈ Check-in${final ? " — ostatni" : ""}`;
  const sub = earlyEnd
    ? "Ostatni odcinek jeszcze nieoceniony — możesz go ocenić albo pominąć."
    : final
      ? "Czas sesji minął. Oceń ostatni odcinek i zamknij sesję."
      : "Timer wstrzymany. Krótki status i wracasz do pracy.";

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Check-in">
      <div className="panel modal">
        <p className="modal-title">{title}</p>
        <p className="modal-sub">{sub}</p>

        <label className="field-label" htmlFor="doneInput">
          Co udało się zrobić? (opcjonalnie)
        </label>
        <textarea
          id="doneInput"
          ref={firstField}
          rows={2}
          value={done}
          onChange={(e) => setDone(e.target.value)}
          placeholder="np. Dokończyłem research do sekcji 2"
        />

        <div className="field-inline">
          <label className="field-label" htmlFor="workingInput">
            Nad czym pracujesz teraz? (opcjonalnie)
          </label>
          <textarea
            id="workingInput"
            rows={2}
            value={working}
            onChange={(e) => setWorking(e.target.value)}
            placeholder="np. Piszę pierwszy szkic akapitu"
          />
        </div>

        <div className="field-inline">
          <label className="field-label" htmlFor="noteInput">
            Notatka (opcjonalnie)
          </label>
          <textarea
            id="noteInput"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Dodatkowe uwagi…"
          />
        </div>

        <div className="rate-row">
          <button
            className={`btn btn-good${rating === "up" ? " on" : ""}`}
            aria-pressed={rating === "up"}
            onClick={() => setRating((r) => (r === "up" ? null : "up"))}
          >
            👍 Skupiony
          </button>
          <button
            className={`btn btn-bad${rating === "down" ? " on" : ""}`}
            aria-pressed={rating === "down"}
            onClick={() => setRating((r) => (r === "down" ? null : "down"))}
          >
            👎 Rozproszony
          </button>
        </div>

        {/* zawsze w drzewie — inaczej przyciski przeskakują po wyborze oceny */}
        <p className={`rate-required${rating ? " done" : ""}`}>
          Ocena jest wymagana — reszta pól jest opcjonalna.
        </p>

        <div className="modal-actions">
          <button
            className="btn btn-primary"
            onClick={save}
            disabled={!rating}
            title={rating ? undefined : "Najpierw oceń swoje skupienie"}
          >
            {final ? "Zapisz i zakończ sesję" : "Zapisz i wróć do pracy"}
          </button>
          {(!final || earlyEnd) && (
            <button className="btn btn-ghost" onClick={onAbort}>
              {earlyEnd ? "Zakończ bez oceny" : "Zakończ sesję"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
