/** Parse a `YYYY-MM-DD` day at UTC noon, so local formatting never shifts it. */
export function parseDay(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

const long = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const medium = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const short = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
});

/** "martedì 27 ottobre" */
export function formatDayLong(date: string): string {
  return long.format(parseDay(date));
}

/** "27 ott 2026" */
export function formatDayMedium(date: string): string {
  return medium.format(parseDay(date));
}

/** "27/10" */
export function formatDayShort(date: string): string {
  return short.format(parseDay(date));
}

/** "oggi" / "ieri" / "27 ott 2026" */
export function formatDayRelative(date: string, today: string): string {
  if (date === today) return "oggi";
  const [y, m, d] = today.split("-").map(Number);
  const yest = new Date(Date.UTC(y, m - 1, d) - 86_400_000);
  const pad = (v: number) => String(v).padStart(2, "0");
  const yesterday = `${yest.getUTCFullYear()}-${pad(yest.getUTCMonth() + 1)}-${pad(yest.getUTCDate())}`;
  if (date === yesterday) return "ieri";
  return formatDayMedium(date);
}
