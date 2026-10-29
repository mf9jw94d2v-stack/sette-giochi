/**
 * Small HTTP helpers shared by the Edge Functions. Standard `Request` /
 * `Response` only, so the same code runs in Deno (Supabase) and in Node
 * (the tests).
 */

export interface CorsOptions {
  /** Exact origins allowed to call. Empty = any origin (the API uses bearer
   *  tokens, not cookies, so a foreign page cannot ride on a session). */
  allowedOrigins?: readonly string[];
}

export function corsHeaders(
  req: Request,
  opts: CorsOptions,
): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const list = opts.allowedOrigins ?? [];
  const allow =
    list.length === 0 ? "*" : list.includes(origin) ? origin : list[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

export function json(
  status: number,
  body: unknown,
  headers: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
  });
}

export function bearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(\S+)$/i.exec(h);
  return m ? m[1] : null;
}

/** Read a JSON body of bounded size; null if too big or not JSON. */
export async function readJson(
  req: Request,
  maxBytes: number,
): Promise<unknown> {
  const text = await req.text();
  if (text.length > maxBytes) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}
