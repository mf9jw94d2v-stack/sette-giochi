import type { Page, Route } from "@playwright/test";
// The REAL Edge Function code, as bundled for Deno: answers sent by the
// browser are replayed by the same code that runs in production.
import {
  handleDeleteAccount,
  handleSubmitDaily,
} from "../../../supabase/functions/_shared/backend.js";

/**
 * An in-memory stand-in for the Supabase HTTP API (Auth, PostgREST, Edge
 * Functions), answering the browser through Playwright's request routing.
 *
 * It is a TEST DOUBLE, not Supabase: it reproduces the request and response
 * shapes supabase-js relies on and the rules this project's migrations
 * enforce (own rows only, one official result per day, guest imports outside
 * rankings). The SQL itself is tested on real PostgreSQL in src/backend.
 */

export const FAKE_URL = "http://supabase.e2e.test";

interface User {
  id: string;
  email: string;
  password: string;
  confirmed: boolean;
  createdAt: string;
  metadata: Record<string, unknown>;
}

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  show_in_leaderboards: boolean;
  created_at: string;
  updated_at: string;
}

export interface DailyRow {
  id: number;
  user_id: string;
  game_id: string;
  challenge_date: string;
  score: number;
  won: boolean;
  completed: boolean;
  rounds: number;
  answers: unknown;
  detail: Record<string, unknown>;
  duration_ms: number | null;
  verification: string;
  generator_version: string | null;
  created_at: string;
}

type Row = Record<string, unknown>;

const today = () => new Date().toISOString().slice(0, 10);
const uuid = () => crypto.randomUUID();
const b64url = (o: unknown) =>
  Buffer.from(JSON.stringify(o)).toString("base64url");

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  "access-control-expose-headers": "*",
};

export class FakeSupabase {
  users = new Map<string, User>();
  profiles = new Map<string, Profile>();
  daily: DailyRow[] = [];
  free: Row[] = [];
  prefs: Row[] = [];
  private tokens = new Map<string, string>();
  private links = new Map<string, { userId: string; type: string }>();
  private nextId = 1;
  /** Requests seen, for assertions ("the page never sent X"). */
  log: { method: string; path: string }[] = [];

  async install(page: Page): Promise<void> {
    await page.route(`${FAKE_URL}/**`, (route) => this.handle(route));
  }

  // ---- seeding & inspection helpers for tests -------------------------

  seedUser(
    email: string,
    password: string,
    username: string,
    confirmed = true,
  ): User {
    const user: User = {
      id: uuid(),
      email,
      password,
      confirmed,
      createdAt: new Date().toISOString(),
      metadata: { username },
    };
    this.users.set(user.id, user);
    this.createProfile(user);
    return user;
  }

  userByEmail(email: string): User | undefined {
    return [...this.users.values()].find((u) => u.email === email);
  }

  /** The link the confirmation email would contain. */
  confirmationLink(email: string): string {
    const user = this.userByEmail(email);
    if (!user) throw new Error(`no user ${email}`);
    const hash = `confirm-${uuid()}`;
    this.links.set(hash, { userId: user.id, type: "signup" });
    return `/auth/callback?token_hash=${hash}&type=signup`;
  }

  recoveryLink(email: string): string {
    const user = this.userByEmail(email);
    if (!user) throw new Error(`no user ${email}`);
    const hash = `recover-${uuid()}`;
    this.links.set(hash, { userId: user.id, type: "recovery" });
    return `/auth/callback?token_hash=${hash}&type=recovery`;
  }

  // ---- internals ---------------------------------------------------------

  private createProfile(user: User) {
    const wanted = String(user.metadata.username ?? "").toLowerCase();
    const taken = [...this.profiles.values()].some(
      (p) => p.username === wanted,
    );
    const username =
      /^[a-z0-9_]{3,20}$/.test(wanted) && !taken
        ? wanted
        : `giocatore_${user.id.replace(/-/g, "").slice(0, 10)}`;
    const now = new Date().toISOString();
    this.profiles.set(user.id, {
      id: user.id,
      username,
      display_name: null,
      show_in_leaderboards: true,
      created_at: now,
      updated_at: now,
    });
  }

  private userJson(u: User) {
    return {
      id: u.id,
      aud: "authenticated",
      role: "authenticated",
      email: u.email,
      email_confirmed_at: u.confirmed ? u.createdAt : null,
      confirmed_at: u.confirmed ? u.createdAt : null,
      created_at: u.createdAt,
      updated_at: u.createdAt,
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: u.metadata,
      identities: [],
    };
  }

  private session(u: User) {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const access = `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({ sub: u.id, email: u.email, role: "authenticated", aud: "authenticated", exp, session_id: uuid() })}.e2e`;
    this.tokens.set(access, u.id);
    const refresh = `refresh-${uuid()}`;
    this.tokens.set(refresh, u.id);
    return {
      access_token: access,
      token_type: "bearer",
      expires_in: 3600,
      expires_at: exp,
      refresh_token: refresh,
      user: this.userJson(u),
    };
  }

  private uid(route: Route): string | null {
    const h = route.request().headers()["authorization"] ?? "";
    const token = h.replace(/^Bearer\s+/i, "");
    return this.tokens.get(token) ?? null;
  }

  private async reply(
    route: Route,
    status: number,
    body?: unknown,
    headers: Record<string, string> = {},
  ) {
    await route.fulfill({
      status,
      headers: { ...CORS, "content-type": "application/json", ...headers },
      body: body === undefined ? "" : JSON.stringify(body),
    });
  }

  private authError(route: Route, status: number, code: string, msg: string) {
    return this.reply(route, status, { code: status, error_code: code, msg });
  }

  private async handle(route: Route): Promise<void> {
    const req = route.request();
    const url = new URL(req.url());
    this.log.push({ method: req.method(), path: url.pathname });
    if (req.method() === "OPTIONS")
      return route.fulfill({ status: 204, headers: CORS });
    const body = (() => {
      try {
        return req.postData() ? JSON.parse(req.postData() as string) : null;
      } catch {
        return null;
      }
    })();

    if (url.pathname.startsWith("/auth/v1/"))
      return this.auth(route, url, body);
    if (url.pathname.startsWith("/rest/v1/rpc/"))
      return this.rpc(route, url.pathname.slice("/rest/v1/rpc/".length), body);
    if (url.pathname.startsWith("/rest/v1/"))
      return this.rest(route, url, body);
    if (url.pathname.startsWith("/functions/v1/"))
      return this.fn(route, url, req.postData() ?? "");
    return this.reply(route, 404, { message: "not found" });
  }

  private async auth(route: Route, url: URL, body: Row | null): Promise<void> {
    const path = url.pathname.slice("/auth/v1".length);
    const grant = url.searchParams.get("grant_type");
    if (path === "/signup") {
      const email = String(body?.email ?? "");
      const password = String(body?.password ?? "");
      if (password.length < 8)
        return this.authError(
          route,
          422,
          "weak_password",
          "Password should be at least 8 characters.",
        );
      const existing = this.userByEmail(email);
      if (existing) {
        // Like Supabase with confirmations on: same answer, no new account.
        return this.reply(route, 200, {
          ...this.userJson(existing),
          identities: [],
        });
      }
      const user: User = {
        id: uuid(),
        email,
        password,
        confirmed: false,
        createdAt: new Date().toISOString(),
        metadata: (body?.data as Row) ?? {},
      };
      this.users.set(user.id, user);
      this.createProfile(user);
      return this.reply(route, 200, this.userJson(user));
    }
    if (path === "/token" && grant === "password") {
      const user = this.userByEmail(String(body?.email ?? ""));
      if (!user || user.password !== body?.password)
        return this.authError(
          route,
          400,
          "invalid_credentials",
          "Invalid login credentials",
        );
      if (!user.confirmed)
        return this.authError(
          route,
          400,
          "email_not_confirmed",
          "Email not confirmed",
        );
      return this.reply(route, 200, this.session(user));
    }
    if (path === "/token" && grant === "refresh_token") {
      const id = this.tokens.get(String(body?.refresh_token ?? ""));
      const user = id ? this.users.get(id) : undefined;
      if (!user)
        return this.authError(
          route,
          400,
          "refresh_token_not_found",
          "Invalid Refresh Token",
        );
      return this.reply(route, 200, this.session(user));
    }
    if (path === "/verify") {
      const link = this.links.get(String(body?.token_hash ?? ""));
      const user = link ? this.users.get(link.userId) : undefined;
      if (!link || !user)
        return this.authError(
          route,
          403,
          "otp_expired",
          "Email link is invalid or has expired",
        );
      this.links.delete(String(body?.token_hash));
      user.confirmed = true;
      return this.reply(route, 200, this.session(user));
    }
    if (path === "/user") {
      const id = this.uid(route);
      const user = id ? this.users.get(id) : undefined;
      if (!user)
        return this.authError(
          route,
          401,
          "session_not_found",
          "Session not found",
        );
      if (route.request().method() === "PUT") {
        if (typeof body?.password === "string") {
          if (body.password.length < 8)
            return this.authError(route, 422, "weak_password", "weak");
          if (body.password === user.password)
            return this.authError(route, 422, "same_password", "same");
          user.password = body.password;
        }
      }
      return this.reply(route, 200, this.userJson(user));
    }
    if (path === "/logout")
      return route.fulfill({ status: 204, headers: CORS });
    if (path === "/recover" || path === "/resend")
      return this.reply(route, 200, {});
    return this.reply(route, 404, {
      msg: `fake auth: ${path} not implemented`,
    });
  }

  private table(name: string): Row[] {
    if (name === "daily_results") return this.daily as unknown as Row[];
    if (name === "free_results") return this.free;
    if (name === "user_preferences") return this.prefs;
    if (name === "profiles")
      return [...this.profiles.values()] as unknown as Row[];
    return [];
  }

  private async rest(
    route: Route,
    url: URL,
    body: Row | Row[] | null,
  ): Promise<void> {
    const uid = this.uid(route);
    const name = url.pathname.slice("/rest/v1/".length);
    const method = route.request().method();
    const own = (r: Row) =>
      name === "profiles" ? r.id === uid : r.user_id === uid;
    const filters = [...url.searchParams.entries()].filter(
      ([k]) =>
        ![
          "select",
          "order",
          "offset",
          "limit",
          "on_conflict",
          "columns",
        ].includes(k),
    );
    const match = (r: Row) =>
      filters.every(
        ([k, v]) =>
          v.startsWith("eq.") &&
          String(r[k]) === decodeURIComponent(v.slice(3)),
      );
    const wantsObject = (route.request().headers()["accept"] ?? "").includes(
      "vnd.pgrst.object",
    );
    if (!uid)
      return this.reply(route, 401, {
        code: "42501",
        message: "permission denied",
      });

    if (method === "GET") {
      let rows = this.table(name).filter(own).filter(match);
      const order = url.searchParams.get("order");
      if (order) {
        const [col, dir] = order.split(",")[0].split(".");
        rows = [...rows].sort(
          (a, b) =>
            String(a[col]).localeCompare(String(b[col])) *
            (dir === "desc" ? -1 : 1),
        );
      }
      const offset = Number(url.searchParams.get("offset") ?? 0);
      const limit = Number(url.searchParams.get("limit") ?? 1000);
      rows = rows.slice(offset, offset + limit);
      if (wantsObject)
        return rows[0]
          ? this.reply(route, 200, rows[0])
          : this.reply(route, 406, { code: "PGRST116", message: "0 rows" });
      return this.reply(route, 200, rows);
    }
    if (method === "POST" && name === "free_results") {
      const input = (Array.isArray(body) ? body[0] : body) as Row;
      if (this.free.some((r) => r.id === input.id))
        return this.reply(route, 409, {
          code: "23505",
          message: "duplicate key",
        });
      const row = {
        ...input,
        user_id: uid,
        detail: input.detail ?? {},
        created_at: new Date().toISOString(),
      };
      this.free.push(row);
      return wantsObject
        ? this.reply(route, 201, row)
        : this.reply(route, 201, [row]);
    }
    if (method === "POST" && name === "user_preferences") {
      const input = (Array.isArray(body) ? body[0] : body) as Row;
      this.prefs = this.prefs.filter(
        (p) => !(p.user_id === uid && p.key === input.key),
      );
      this.prefs.push({
        ...input,
        user_id: uid,
        updated_at: new Date().toISOString(),
      });
      return this.reply(route, 201, null);
    }
    if (method === "PATCH" && name === "profiles") {
      const profile = uid ? this.profiles.get(uid) : undefined;
      if (
        !profile ||
        !filters.every(([k, v]) => k === "id" && v === `eq.${uid}`)
      )
        return route.fulfill({ status: 204, headers: CORS });
      const patch = body as Row;
      if (typeof patch.username === "string") {
        if (!/^[a-z0-9_]{3,20}$/.test(patch.username))
          return this.reply(route, 400, { code: "23514", message: "check" });
        if (
          [...this.profiles.values()].some(
            (p) => p.username === patch.username && p.id !== uid,
          )
        )
          return this.reply(route, 409, {
            code: "23505",
            message: "duplicate",
          });
        profile.username = patch.username;
      }
      if ("display_name" in patch)
        profile.display_name = (patch.display_name as string | null) ?? null;
      if (typeof patch.show_in_leaderboards === "boolean")
        profile.show_in_leaderboards = patch.show_in_leaderboards;
      return route.fulfill({ status: 204, headers: CORS });
    }
    // Everything else — notably any write to daily_results — is refused, as
    // the migrations refuse it.
    return this.reply(route, 403, {
      code: "42501",
      message: `permission denied for table ${name}`,
    });
  }

  private async rpc(route: Route, fn: string, args: Row | null): Promise<void> {
    const uid = this.uid(route);
    const a = args ?? {};
    if (fn === "username_available") {
      const n = String(a.p_username ?? "");
      return this.reply(
        route,
        200,
        /^[a-z0-9_]{3,20}$/.test(n) &&
          ![...this.profiles.values()].some((p) => p.username === n),
      );
    }
    if (fn === "daily_leaderboard") {
      const day = this.daily.filter(
        (r) =>
          r.game_id === a.p_game_id &&
          r.challenge_date === a.p_challenge_date &&
          r.verification === "server_replay",
      );
      const ranked = day
        .map((r) => ({
          r,
          rank: 1 + day.filter((x) => x.score > r.score).length,
        }))
        .sort(
          (x, y) =>
            x.rank - y.rank || x.r.created_at.localeCompare(y.r.created_at),
        );
      const rows = ranked
        .filter(
          ({ r }) =>
            this.profiles.get(r.user_id)?.show_in_leaderboards ||
            r.user_id === uid,
        )
        .map(({ r, rank }) => ({
          rank,
          username: this.profiles.get(r.user_id)?.username,
          display_name: this.profiles.get(r.user_id)?.display_name ?? null,
          score: r.score,
          is_me: r.user_id === uid,
        }));
      return this.reply(
        route,
        200,
        rows.slice(
          Number(a.p_offset ?? 0),
          Number(a.p_offset ?? 0) + Math.min(Number(a.p_limit ?? 50), 100),
        ),
      );
    }
    if (fn === "my_daily_standing") {
      const day = this.daily.filter(
        (r) =>
          r.game_id === a.p_game_id &&
          r.challenge_date === a.p_challenge_date &&
          r.verification === "server_replay",
      );
      const me = day.find((r) => r.user_id === uid);
      return this.reply(
        route,
        200,
        me
          ? [
              {
                rank: 1 + day.filter((x) => x.score > me.score).length,
                participants: day.length,
                score: me.score,
              },
            ]
          : [],
      );
    }
    if (fn === "weekly_leaderboard") return this.reply(route, 200, []);
    if (fn === "import_guest_results") {
      if (!uid)
        return this.reply(route, 401, {
          code: "42501",
          message: "permission denied",
        });
      let dailyIn = 0;
      let freeIn = 0;
      const daily = Array.isArray(a.p_daily) ? (a.p_daily as Row[]) : [];
      const free = Array.isArray(a.p_free) ? (a.p_free as Row[]) : [];
      for (const d of daily) {
        if (
          this.daily.some(
            (r) =>
              r.user_id === uid &&
              r.game_id === d.gameId &&
              r.challenge_date === d.challengeDate,
          )
        )
          continue;
        this.daily.push({
          id: this.nextId++,
          user_id: uid,
          game_id: String(d.gameId),
          challenge_date: String(d.challengeDate),
          score: Number(d.score),
          won: Boolean(d.won),
          completed: Boolean(d.completed),
          rounds: 5,
          answers: null,
          detail: {},
          duration_ms: null,
          verification: "guest_import",
          generator_version: null,
          created_at: String(d.createdAt),
        });
        dailyIn++;
      }
      for (const f of free) {
        this.free.push({
          id: uuid(),
          user_id: uid,
          game_id: f.gameId,
          level_id: f.levelId,
          mode: f.mode,
          score: f.score,
          won: f.won,
          completed: f.completed,
          detail: {},
          created_at: f.createdAt,
        });
        freeIn++;
      }
      return this.reply(route, 200, {
        dailyImported: dailyIn,
        freeImported: freeIn,
        skipped: daily.length + free.length - dailyIn - freeIn,
      });
    }
    return this.reply(route, 404, {
      message: `fake rpc ${fn} not implemented`,
    });
  }

  private async fn(route: Route, url: URL, raw: string): Promise<void> {
    const name = url.pathname.slice("/functions/v1/".length);
    const request = new Request(`${FAKE_URL}${url.pathname}`, {
      method: route.request().method(),
      headers: route.request().headers(),
      body: raw,
    });
    const authenticate = async (token: string) =>
      this.tokens.get(token) ?? null;
    let response: Response;
    if (name === "submit-daily") {
      response = await handleSubmitDaily(request, {
        authenticate,
        record: async (row) => {
          // public.record_verified_daily_result, in memory.
          if (row.challengeDate !== today())
            throw new Error("challenge_closed");
          const existing = this.daily.find(
            (r) =>
              r.user_id === row.userId &&
              r.game_id === row.gameId &&
              r.challenge_date === row.challengeDate,
          );
          if (existing) return { created: false, result: existing };
          const created: DailyRow = {
            id: this.nextId++,
            user_id: row.userId,
            game_id: row.gameId,
            challenge_date: row.challengeDate,
            score: row.score,
            won: row.won,
            completed: true,
            rounds: row.rounds,
            answers: row.answers,
            detail: row.detail,
            duration_ms: row.durationMs,
            verification: "server_replay",
            generator_version: row.generatorVersion,
            created_at: new Date().toISOString(),
          };
          this.daily.push(created);
          return { created: true, result: created };
        },
      });
    } else if (name === "delete-account") {
      response = await handleDeleteAccount(request, {
        authenticate,
        deleteUser: async (id) => {
          this.users.delete(id);
          this.profiles.delete(id);
          this.daily = this.daily.filter((r) => r.user_id !== id);
          this.free = this.free.filter((r) => r.user_id !== id);
          for (const [t, u] of this.tokens) if (u === id) this.tokens.delete(t);
        },
      });
    } else {
      return this.reply(route, 404, { error: "not_found" });
    }
    await route.fulfill({
      status: response.status,
      headers: { ...CORS, "content-type": "application/json" },
      body: await response.text(),
    });
  }
}
