/**
 * Ocena odcinka jako ikona: kciuk rysowany kreską na siatce 24 px.
 * Kolor dziedziczy z otoczenia (currentColor), więc barwi go klasa rodzica.
 */
export default function RateIcon({
  rating,
  size = 16,
  strokeWidth,
}: {
  rating: "up" | "down";
  size?: number;
  /** Domyślnie grubsza kreska w małych rozmiarach, żeby nie znikała. */
  strokeWidth?: number;
}) {
  const sw = strokeWidth ?? (size <= 14 ? 2 : size <= 17 ? 1.9 : 1.7);
  const shape = (
    <>
      <path d="M8.4 10.6 11.2 4.1a2.2 2.2 0 0 1 4 .95V9.7h4.15a2.1 2.1 0 0 1 2.05 2.53l-1.24 5.85a2.1 2.1 0 0 1-2.05 1.62H8.4Z" />
      <rect x="2.4" y="10.6" width="5.2" height="9.1" rx="1.5" />
    </>
  );

  return (
    <svg
      className="rate-ic"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {rating === "down" ? (
        <g transform="translate(0 24) scale(1 -1)">{shape}</g>
      ) : (
        shape
      )}
    </svg>
  );
}
