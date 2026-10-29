/**
 * Size It Up's own palette: a natural-history plate. Warm sand paper, indigo
 * ink for the known quantity, vermilion for the one being judged.
 *
 * Kept here rather than in Tailwind classes because the stage is an SVG whose
 * colours have to be addressable as values. They are CSS variables, defined
 * in size-it-up.css for the light plate and for the dark one, so the drawing
 * follows the theme like the rest of the page.
 */
export const C = {
  paper: "var(--siu-paper)",
  plate: "var(--siu-plate)",
  ink: "var(--siu-ink)",
  muted: "var(--siu-deco)",
  rule: "var(--siu-rule)",
  /** The reference: known, fixed, cool. */
  blue: "var(--siu-blue)",
  blueSoft: "var(--siu-blue-soft)",
  /** The target: the thing being judged, warm. */
  red: "var(--siu-red)",
  redSoft: "var(--siu-red-soft)",
  good: "var(--siu-good)",
  goodSoft: "var(--siu-good-soft)",
  track: "var(--siu-track)",
} as const;
