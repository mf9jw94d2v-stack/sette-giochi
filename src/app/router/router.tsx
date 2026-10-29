import { Suspense, type ReactNode } from "react";
import {
  createBrowserRouter,
  Navigate,
  type RouteObject,
} from "react-router-dom";
import { GAME_IDS } from "@/types/game";
import { GAME_SLUG, gamePath } from "@/games/slugs";
import { RootLayout, type RouteHandle } from "@/app/layouts/RootLayout";
import { HomePage } from "@/features/home/HomePage";
import { GamesIndexPage } from "@/features/games/GamesIndexPage";
import { GameDetailPage } from "@/features/games/GameDetailPage";
import { DailyPage } from "@/features/daily/DailyPage";
import { StatsPage } from "@/features/stats/StatsPage";
import { HistoryPage } from "@/features/history/HistoryPage";
import { ArchivePage } from "@/features/archive/ArchivePage";
import { ArchiveGamePage } from "@/features/archive/ArchiveGamePage";
import { ArchiveReplayPage } from "@/features/archive/ArchiveReplayPage";
import { ProfilePage } from "@/features/profile/ProfilePage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { NotFound } from "@/components/shared/NotFound";
import { AuthGate } from "@/features/auth/AuthGate";

/**
 * The seven game pages and the Quality Lab are lazy: each game bundles its own
 * dataset (Fact Map alone carries ~127 KB of real map geometry), so the
 * homepage must not pay for code the visitor has not opened.
 */
function Loading(): ReactNode {
  return (
    <p className="py-16 text-center text-sm text-muted-foreground">
      Caricamento…
    </p>
  );
}

function lazyRoute(
  path: string,
  load: () => Promise<{ default: () => ReactNode }>,
  handle?: RouteHandle,
): RouteObject {
  return {
    path,
    handle,
    lazy: async () => {
      const { default: Component } = await load();
      const page = () => (
        <Suspense fallback={<Loading />}>
          <Component />
        </Suspense>
      );
      return {
        // Game boards wait for the session (see AuthGate).
        Component: handle?.immersive
          ? () => <AuthGate>{page()}</AuthGate>
          : page,
      };
    },
  };
}

const IMMERSIVE: RouteHandle = { immersive: true };

/** Old addresses, with the internal id, keep working. */
const legacyGameRoutes: RouteObject[] = GAME_IDS.filter(
  (id) => GAME_SLUG[id] !== id,
).map((id) => ({
  path: `games/${id}`,
  element: <Navigate replace to={gamePath(id)} />,
}));

const gameRoutes: RouteObject[] = [
  lazyRoute(
    `games/${GAME_SLUG["gazillion"]}`,
    async () => ({
      default: (await import("@/games/gazillion/GazillionGame"))
        .GazillionPlayPage,
    }),
    IMMERSIVE,
  ),
  lazyRoute(
    `games/${GAME_SLUG["estimania"]}`,
    async () => ({
      default: (await import("@/games/estimania/EstimaniaGame"))
        .EstimaniaPlayPage,
    }),
    IMMERSIVE,
  ),
  lazyRoute(
    `games/${GAME_SLUG["size-it-up"]}`,
    async () => ({
      default: (await import("@/games/size-it-up/SizeItUpGame"))
        .SizeItUpPlayPage,
    }),
    IMMERSIVE,
  ),
  lazyRoute(
    `games/${GAME_SLUG["plain"]}`,
    async () => ({
      default: (await import("@/games/plain/PlainGame")).PlainPlayPage,
    }),
    IMMERSIVE,
  ),
  lazyRoute(
    `games/${GAME_SLUG["krillion"]}`,
    async () => ({
      default: (await import("@/games/krillion/KrillionGame")).KrillionPlayPage,
    }),
    IMMERSIVE,
  ),
  lazyRoute(
    `games/${GAME_SLUG["geoslice"]}`,
    async () => ({
      default: (await import("@/games/geoslice/GeoSliceGame")).GeoSlicePlayPage,
    }),
    IMMERSIVE,
  ),
  lazyRoute(
    `games/${GAME_SLUG["fact-map"]}`,
    async () => ({
      default: (await import("@/games/fact-map/FactMapGame")).FactMapPlayPage,
    }),
    IMMERSIVE,
  ),
];

/**
 * The Quality Lab is a technical dashboard: in a production build its route
 * exists only when explicitly switched on, so the code is tree-shaken away
 * otherwise (see src/features/lab/access.ts — this is not authentication).
 */
const labRoutes: RouteObject[] =
  // Written inline, not behind a helper, so the bundler can fold the condition
  // at build time and drop the import entirely (verified: no QualityLabPage
  // chunk is emitted unless the flag is set).
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_QUALITY_LAB === "true"
    ? [
        lazyRoute("lab", async () => ({
          default: (await import("@/features/lab/QualityLabPage"))
            .QualityLabPage,
        })),
      ]
    : [];

/** Account pages: loaded on demand, so guests never download them. */
const accountRoutes: RouteObject[] = [
  lazyRoute("login", async () => ({
    default: (await import("@/features/auth/LoginPage")).LoginPage,
  })),
  lazyRoute("signup", async () => ({
    default: (await import("@/features/auth/SignupPage")).SignupPage,
  })),
  lazyRoute("forgot-password", async () => ({
    default: (await import("@/features/auth/ForgotPasswordPage"))
      .ForgotPasswordPage,
  })),
  lazyRoute("reset-password", async () => ({
    default: (await import("@/features/auth/ResetPasswordPage"))
      .ResetPasswordPage,
  })),
  lazyRoute("auth/callback", async () => ({
    default: (await import("@/features/auth/AuthCallbackPage"))
      .AuthCallbackPage,
  })),
  lazyRoute("account", async () => {
    const [{ AccountPage }, { RequireAuth }] = await Promise.all([
      import("@/features/account/AccountPage"),
      import("@/features/auth/RequireAuth"),
    ]);
    return {
      default: () => (
        <RequireAuth>
          <AccountPage />
        </RequireAuth>
      ),
    };
  }),
  lazyRoute("leaderboard", async () => ({
    default: (await import("@/features/leaderboard/LeaderboardPage"))
      .LeaderboardPage,
  })),
  lazyRoute("privacy", async () => ({
    default: (await import("@/features/privacy/PrivacyPage")).PrivacyPage,
  })),
];

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <RootLayout />,
      // A lazy route matched on the very first load has nothing to render yet.
      hydrateFallbackElement: <Loading />,
      children: [
        { index: true, element: <HomePage /> },
        { path: "games", element: <GamesIndexPage /> },
        ...gameRoutes,
        ...legacyGameRoutes,
        { path: "games/:gameId", element: <GameDetailPage /> },
        { path: "daily", element: <DailyPage /> },
        { path: "archive", element: <ArchivePage /> },
        { path: "archive/:gameId", element: <ArchiveGamePage /> },
        {
          path: "archive/:gameId/:date",
          element: (
            <AuthGate>
              <ArchiveReplayPage />
            </AuthGate>
          ),
          handle: IMMERSIVE,
        },
        { path: "stats", element: <StatsPage /> },
        { path: "history", element: <HistoryPage /> },
        { path: "profile", element: <ProfilePage /> },
        { path: "settings", element: <SettingsPage /> },
        ...accountRoutes,
        ...labRoutes,
        { path: "*", element: <NotFound /> },
      ],
    },
  ],
  {
    // "/" locally; "/<repository>" on GitHub Pages (see vite.config.ts).
    basename: import.meta.env.BASE_URL.replace(/\/$/, "") || "/",
  },
);
