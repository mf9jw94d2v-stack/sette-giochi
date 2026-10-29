import {
  bearerToken,
  corsHeaders,
  json,
  readJson,
  type CorsOptions,
} from "./http";

/**
 * The `delete-account` Edge Function. Deleting a Supabase Auth user needs the
 * admin API, which needs the service role — so it cannot happen in the
 * browser. Profile, results and preferences go with it (ON DELETE CASCADE).
 *
 * The body must repeat the confirmation word the page asked for, so a stray
 * request with a valid token is not enough.
 */
export interface DeleteAccountDeps extends CorsOptions {
  authenticate(token: string): Promise<string | null>;
  deleteUser(userId: string): Promise<void>;
}

export const DELETE_CONFIRMATION = "ELIMINA";

export async function handleDeleteAccount(
  req: Request,
  deps: DeleteAccountDeps,
): Promise<Response> {
  const cors = corsHeaders(req, deps);
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST")
    return json(405, { error: "method_not_allowed" }, cors);

  const token = bearerToken(req);
  const userId = token ? await deps.authenticate(token) : null;
  if (!userId) return json(401, { error: "unauthorized" }, cors);

  const body = await readJson(req, 1_000);
  if (
    typeof body !== "object" ||
    body === null ||
    (body as { confirm?: unknown }).confirm !== DELETE_CONFIRMATION
  ) {
    return json(400, { error: "confirmation_required" }, cors);
  }

  try {
    await deps.deleteUser(userId);
  } catch {
    return json(500, { error: "server_error" }, cors);
  }
  return json(200, { deleted: true }, cors);
}
