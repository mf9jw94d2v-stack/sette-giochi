/** Format a year for display: negative = a.C., positive = d.C. */
export function formatYear(year: number): string {
  if (!Number.isFinite(year)) return "—";
  const y = Math.round(year);
  return y < 0 ? `${-y} a.C.` : `${y} d.C.`;
}
