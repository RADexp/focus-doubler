export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function fmt(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  return pad(Math.floor(s / 60)) + ":" + pad(s % 60);
}

export function nowHM(): string {
  const d = new Date();
  return pad(d.getHours()) + ":" + pad(d.getMinutes());
}

export function todayKey(): string {
  const d = new Date();
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

const DAY_NAMES = [
  "niedziela",
  "poniedziałek",
  "wtorek",
  "środa",
  "czwartek",
  "piątek",
  "sobota",
];

export function dateLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return key;
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return "Dziś";
  if (diffDays === 1) return "Wczoraj";
  return pad(d) + "." + pad(m) + "." + y + " · " + DAY_NAMES[date.getDay()];
}

export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n - 1) + "…" : str;
}

/** Ile sekund liczymy jako "minutę" — podmieniane tylko przy testach. */
export const SECONDS_PER_MIN = 60;
