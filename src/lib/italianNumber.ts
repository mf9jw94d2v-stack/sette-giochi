/**
 * Reading numbers the way Italians write them.
 *
 * Several games had their answer field go through `Number()`, so a player
 * typing "1.200" — twelve hundred, with an Italian thousands point — was
 * scored on 1,2. This parser follows Italian conventions and refuses
 * anything ambiguous rather than guessing.
 */

/**
 * "1.200.000" → 1200000 · "1,5" → 1.5 · "1.234,5" → 1234.5 · "2 000" → 2000.
 * A lone point is a thousands point only in the exact form "1.234" / "12.345";
 * "3.5" is read as three and a half. Returns null for anything unreadable.
 */
export function parseItalianNumber(raw: string): number | null {
  const s = raw.trim().replace(/[\s  ']/g, "");
  if (s === "") return null;
  let normal: string;
  if (s.includes(",") && s.includes(".")) {
    // Both present: the point groups thousands, the comma is the decimal.
    if (s.lastIndexOf(",") < s.lastIndexOf(".")) return null;
    normal = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    if ((s.match(/,/g) ?? []).length > 1) return null;
    normal = s.replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) {
    normal = s.replace(/\./g, "");
  } else {
    normal = s;
  }
  if (!/^-?\d+(\.\d+)?$/.test(normal)) return null;
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}
