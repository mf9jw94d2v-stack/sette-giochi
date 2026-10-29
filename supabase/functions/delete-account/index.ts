// Supabase Edge Function: delete-account.
// Thin Deno wiring around src/backend/deleteAccount.ts (bundled into
// ../_shared/backend.js). Deleting an Auth user needs the admin API, hence
// the service role, hence a server function.
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { handleDeleteAccount } from "../_shared/backend.js";

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
  handleDeleteAccount(req, {
    allowedOrigins,
    async authenticate(token: string) {
      const { data, error } = await admin.auth.getUser(token);
      return error || !data.user ? null : data.user.id;
    },
    async deleteUser(userId: string) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw new Error(error.message);
    },
  }),
);
