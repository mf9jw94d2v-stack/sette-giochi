import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getGameMeta } from "@/games/registry";

const TITLES: Record<string, string> = {
  "/": "Sette Giochi",
  "/games": "I giochi",
  "/daily": "Sfide di oggi",
  "/archive": "Archivio",
  "/stats": "Statistiche",
  "/history": "Cronologia",
  "/profile": "Profilo",
  "/settings": "Impostazioni",
  "/leaderboard": "Classifiche",
  "/privacy": "Privacy e dati",
  "/login": "Accedi",
  "/signup": "Crea un account",
  "/forgot-password": "Password dimenticata",
  "/reset-password": "Nuova password",
  "/account": "Account",
};

/** Keep the browser tab's title in step with the page, as links are followed. */
export function useDocumentTitle(): void {
  const { pathname } = useLocation();
  useEffect(() => {
    const path = pathname.replace(/\/+$/, "") || "/";
    const game = /^\/(games|archive)\/([^/]+)/.exec(path);
    const meta = game ? getGameMeta(game[2]) : undefined;
    const page = meta
      ? game![1] === "archive"
        ? `${meta.name}, archivio`
        : meta.name
      : TITLES[path];
    document.title =
      page && page !== "Sette Giochi"
        ? `${page} · Sette Giochi`
        : "Sette Giochi";
  }, [pathname]);
}
