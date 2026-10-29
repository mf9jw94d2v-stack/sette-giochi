/**
 * The "day" a daily challenge belongs to is defined by a fixed timezone, never
 * the device clock. This computes that day as `YYYY-MM-DD`.
 *
 * NOTE: computing the boundary here (client-side) is for display/convenience.
 * Official daily integrity must ultimately be enforced server-side with the
 * same timezone (see docs/security-design.md) so a user changing their device
 * clock cannot gain extra official challenges.
 */
export const DEFAULT_TIMEZONE =
  import.meta.env?.VITE_DAILY_TIMEZONE?.trim() || "UTC";

/** Format a Date as `YYYY-MM-DD` in the given IANA timezone. */
export function challengeDate(
  date: Date = new Date(),
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  // en-CA formats as YYYY-MM-DD, which is exactly what we want.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(date);
}

/** Validate a `YYYY-MM-DD` string. */
export function isChallengeDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}
