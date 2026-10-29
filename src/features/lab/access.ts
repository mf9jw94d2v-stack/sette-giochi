/**
 * Who may open the Game Quality Lab.
 *
 * HONEST LIMITATION — this is NOT authentication. The Lab is a technical
 * dashboard, so it must not be part of the public app; until Supabase Auth
 * exists there is no server that could verify a role. What we do instead is
 * keep the Lab out of production builds altogether unless it is explicitly
 * switched on at build time: the route is not registered and the code is
 * tree-shaken away, so there is nothing to reach by guessing the URL.
 *
 * When Supabase lands this becomes a real check — an `is_admin` claim verified
 * server-side plus RLS on the quality tables (see docs/security-design.md).
 * The data shown here is derived from the generators in the bundle, so it
 * leaks nothing a reader of the bundle could not already compute.
 *
 * The router repeats this condition inline rather than calling this function,
 * so the bundler can fold it and drop the Lab chunk from a default production
 * build. This function is the page's own second guard.
 */
export function isQualityLabEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  return import.meta.env.VITE_ENABLE_QUALITY_LAB === "true";
}
