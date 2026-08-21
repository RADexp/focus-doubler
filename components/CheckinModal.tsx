"use client";

import { useEffect, useRef, useState } from "react";
import type { CheckinEntry, Rating } from "@/lib/types";
import { nowHM } from "@/lib/time";

export default function CheckinModal({
  onSave,
  onSkip,
}: {
  onSave: (entry: CheckinEntry) => void;
  onSkip: () => void;
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
    onSave({
      type: "checkin",
      time: nowHM(),
      done: done.trim(),
      working: working.trim(),
      note: note.trim(),
      rating,
    });
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Check-in">
      <div className="panel modal">
        <p className="modal-title">◈ Check-in</p>
        <p className="modal-sub">
          Timer wstrzymany. Krótki status i wracasz do pracy.
        </p>

        <label className="field-label" htmlFor="doneInput">
          Co udało się zrobić?
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
            Nad czym pracujesz teraz?
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

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={save}>
            Zapisz i wróć do pracy
          </button>
          <button className="btn btn-ghost" onClick={onSkip}>
            Pomiń
          </button>
        </div>
      </div>
    </div>
  );
}
