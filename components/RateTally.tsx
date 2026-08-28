import RateIcon from "./RateIcon";

/**
 * Para liczników oceny. Zero jest wygaszone — kolor pojawia się dopiero
 * wtedy, gdy naprawdę coś się wydarzyło.
 */
export default function RateTally({
  up,
  down,
  size = 13,
  className = "",
}: {
  up: number;
  down: number;
  size?: number;
  className?: string;
}) {
  return (
    <span className={`tally-pair${className ? ` ${className}` : ""}`}>
      <span className={up ? "up" : "up zero"}>
        <RateIcon rating="up" size={size} />
        {up}
      </span>
      <span className={down ? "down" : "down zero"}>
        <RateIcon rating="down" size={size} />
        {down}
      </span>
    </span>
  );
}
