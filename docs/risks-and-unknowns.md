# Risks and Unknowns

_Last updated: 2026-10-27_

## External dependencies (need you / an account)

- **Supabase project.** Required for accounts, server-side daily-challenge
  integrity, RLS and cross-device sync. Cannot be created autonomously. The app
  runs on a local fallback until it exists.
- **Deployment (Vercel/Supabase/domain).** Requires authorization and possibly
  paid resources. Nothing will be deployed without explicit go-ahead.

## Game analysis unknowns

- Some of the seven sites may be inaccessible, post-training, or JS-heavy. If a
  game's rules can't be verified, they will be documented as PENDING rather
  than invented, and screenshots may be requested.
- **Fact Map** and **GeoSlice** likely rely on proprietary datasets/imagery we
  cannot reproduce; plan is original/open data with documented differences.

## Content-generation risks

- "Hundreds or thousands of levels per game" is a target, not a guarantee. Some
  games may not support that many _valid, varied, non-duplicate_ levels. Real
  counts will be reported; the target will not be faked with near-duplicates.
- Independent verification isn't fully possible for every game; confidence will
  be labelled (`verified | heuristic | unverified`).

## Toolchain risks

- **TypeScript 7** is the new native compiler; some ecosystem tools
  (e.g. `typescript-eslint`) don't yet declare support. Mitigated by using
  `tsc` for type checking and JS-level ESLint only (ADR-0003).
- Pinned major versions are very new (Vite 8, Vitest 5); watch for plugin gaps.

## Security considerations (to implement)

- Never trust client-reported scores/results for official challenges.
- Keep secrets out of the repo and the client bundle; service-role key is
  server-only.
- Daily-challenge integrity must be enforced by DB constraints + transactions,
  not the browser.
