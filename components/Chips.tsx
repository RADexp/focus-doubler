"use client";

export default function Chips({
  values,
  value,
  onChange,
  label,
}: {
  values: number[];
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="row" role="group" aria-label={label}>
      {values.map((v) => (
        <button
          key={v}
          type="button"
          className={`chip${v === value ? " active" : ""}`}
          aria-pressed={v === value}
          onClick={() => onChange(v)}
        >
          {v}
        </button>
      ))}
    </div>
  );
}
