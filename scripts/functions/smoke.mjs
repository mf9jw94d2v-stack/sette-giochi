/**
 * Load the BUILT Edge Function bundle in plain Node — no Vite, no aliases —
 * and push a request through it. Proves the artifact that Deno will run is
 * self-contained and behaves like the source the unit tests cover.
 * (Deno itself is not installed here: see docs/DEPLOYMENT.md.)
 */
import {
  generatorVersion,
  handleDeleteAccount,
  handleSubmitDaily,
} from "../../supabase/functions/_shared/backend.js";

const today = new Date().toISOString().slice(0, 10);
let recorded = null;
const deps = {
  authenticate: async (t) =>
    t === "ok" ? "00000000-0000-4000-8000-000000000001" : null,
  record: async (row) => {
    recorded = row;
    return {
      created: true,
      result: {
        game_id: row.gameId,
        challenge_date: row.challengeDate,
        score: row.score,
        won: row.won,
        completed: true,
        detail: row.detail,
        verification: "server_replay",
        created_at: new Date().toISOString(),
      },
    };
  },
};

const versionProbe = await handleSubmitDaily(
  new Request("https://x.test", {
    method: "POST",
    headers: { authorization: "Bearer ok" },
    body: JSON.stringify({
      gameId: "geoslice",
      challengeDate: today,
      answers: [null, null, null],
      generatorVersion: "?",
    }),
  }),
  deps,
);
const fail = (msg) => {
  console.error("SMOKE FAILED:", msg);
  process.exit(1);
};
if (versionProbe.status !== 409)
  fail(`expected 409 version_mismatch, got ${versionProbe.status}`);

const ok = await handleSubmitDaily(
  new Request("https://x.test", {
    method: "POST",
    headers: { authorization: "Bearer ok" },
    body: JSON.stringify({
      gameId: "geoslice",
      challengeDate: today,
      answers: [null, null, null],
      generatorVersion: generatorVersion("geoslice"),
      clientScore: 3000,
    }),
  }),
  deps,
);
const okBody = await ok.json();
if (ok.status !== 200) fail(`expected 200, got ${ok.status}`);
if (
  recorded?.score !== 0 ||
  okBody.record.score !== 0 ||
  okBody.scoreAdjusted !== true
)
  fail("the bundle did not recompute the score from the answers");

const unauthorized = await handleSubmitDaily(
  new Request("https://x.test", { method: "POST", body: "{}" }),
  deps,
);
if (unauthorized.status !== 401)
  fail(`expected 401, got ${unauthorized.status}`);

const del = await handleDeleteAccount(
  new Request("https://x.test", {
    method: "POST",
    headers: { authorization: "Bearer ok" },
    body: JSON.stringify({ confirm: "ELIMINA" }),
  }),
  { authenticate: deps.authenticate, deleteUser: async () => {} },
);
if (del.status !== 200) fail(`delete-account expected 200, got ${del.status}`);
console.log(
  "Edge Function bundle smoke test passed: replay recomputed the score, version check, auth, delete-account.",
);
