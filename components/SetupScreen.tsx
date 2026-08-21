"use client";

import Chips from "./Chips";

export default function SetupScreen({
  task,
  setTask,
  lengthMin,
  setLengthMin,
  freqMin,
  setFreqMin,
  onStart,
}: {
  task: string;
  setTask: (v: string) => void;
  lengthMin: number;
  setLengthMin: (v: number) => void;
  freqMin: number;
  setFreqMin: (v: number) => void;
  onStart: () => void;
}) {
  return (
    <div className="panel">
      <h1 className="setup-title">Nowa sesja skupienia</h1>
      <label className="field-label" htmlFor="taskInput">
        Nad czym pracujesz?
      </label>
      <textarea
        id="taskInput"
        rows={2}
        value={task}
        onChange={(e) => setTask(e.target.value)}
        placeholder="np. Rozdział 3 scenariusza — research i pierwszy szkic"
      />

      <div className="group-title">Długość sesji (min)</div>
      <Chips
        label="Długość sesji"
        values={[30, 45, 60]}
        value={lengthMin}
        onChange={setLengthMin}
      />

      <div className="group-title">Częstotliwość check-inów (min)</div>
      <Chips
        label="Częstotliwość check-inów"
        values={[10, 15, 20]}
        value={freqMin}
        onChange={setFreqMin}
      />

      <div style={{ marginTop: 22 }}>
        <button className="btn btn-primary" onClick={onStart}>
          ▶ Start sesji
        </button>
      </div>
    </div>
  );
}
