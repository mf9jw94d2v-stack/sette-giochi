// Supabase Edge Function: submit-daily.
// Thin Deno wiring around src/backend/submitDaily.ts (bundled into
// ../_shared/backend.js). All logic and its tests live in src/backend.
//
// Secrets: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the
// Supabase runtime itself. They are never sent to the browser or logged.
// Optional: ALLOWED_ORIGINS, a comma-separated list of the site's origins.
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { handleSubmitDaily } from "../_shared/backend.js";

const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

Deno.serve((req: Request) =>
  handleSubmitDaily(req, {
    allowedOrigins,
    async authenticate(token: string) {
      const { data, error } = await admin.auth.getUser(token);
      return error || !data.user ? null : data.user.id;
    },
    async record(row) {
      const { data, error } = await admin.rpc("record_verified_daily_result", {
        p_user_id: row.userId,
        p_game_id: row.gameId,
        p_challenge_date: row.challengeDate,
        p_score: row.score,
        p_won: row.won,
        p_rounds: row.rounds,
        p_answers: row.answers,
        p_detail: row.detail,
        p_duration_ms: row.durationMs,
        p_generator_version: row.generatorVersion,
      });
      // The message carries the SQL exception name (e.g. challenge_closed),
      // which the handler maps to a status. No row data is logged.
      if (error) throw new Error(error.message);
      return data;
    },
  }),
);
