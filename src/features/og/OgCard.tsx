import { useParams } from "react-router-dom";
import { GameCover } from "@/components/games/GameCover";
import { GAMES, getGameMeta } from "@/games/registry";
import { GAME_THEMES } from "@/games/theme";

/**
 * The 1200×630 images shown when a link is shared (Open Graph). Rendered by
 * the app itself, in development only, and photographed by
 * scripts/og/capture.mjs into public/og/: the previews are drawn from the
 * same covers and typefaces as the site, so they cannot drift from it.
 */
export function OgCard() {
  const { slug } = useParams();
  const meta = slug && slug !== "home" ? getGameMeta(slug) : undefined;
  return (
    <div
      id="og-card"
      style={{ width: 1200, height: 630 }}
      className="relative overflow-hidden"
    >
      {meta ? <GameCard id={meta.id} /> : <HomeCard />}
    </div>
  );
}

function GameCard({ id }: { id: (typeof GAMES)[number]["id"] }) {
  const meta = getGameMeta(id)!;
  const t = GAME_THEMES[id];
  return (
    <>
      <GameCover
        id={id}
        showName={false}
        className="absolute inset-0 rounded-none"
      />
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(90deg, ${t.from} 0%, ${t.from} 46%, ${t.from}00 82%)`,
        }}
      />
      <div
        className="absolute inset-y-0 left-0 flex w-[56%] flex-col justify-between p-16"
        style={{ color: t.fg }}
      >
        <p
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 28,
            fontWeight: 600,
            opacity: 0.85,
          }}
        >
          Sette Giochi
        </p>
        <div>
          <p
            style={{
              fontFamily: t.font,
              ...t.nameStyle,
              fontSize: 132,
              lineHeight: 0.95,
            }}
          >
            {meta.name}
          </p>
          <p
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 40,
              marginTop: 28,
              lineHeight: 1.2,
            }}
          >
            {meta.tagline}
          </p>
        </div>
        <p
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 26,
            opacity: 0.85,
          }}
        >
          {t.mechanic} · una sfida nuova ogni giorno
        </p>
      </div>
    </>
  );
}

function HomeCard() {
  return (
    <div
      className="absolute inset-0 flex"
      style={{ background: "#16130f", color: "#f4efe6" }}
    >
      <div className="flex w-[46%] flex-col justify-between p-16">
        <p
          className="flex items-center gap-3"
          style={{
            fontSize: 30,
            fontWeight: 700,
            fontFamily: "'Bricolage Grotesque', sans-serif",
          }}
        >
          <span
            className="grid place-items-center rounded-lg"
            style={{
              width: 52,
              height: 52,
              background: "#e8b04a",
              color: "#16130f",
            }}
          >
            7
          </span>
          Sette Giochi
        </p>
        <p
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: 76,
            fontWeight: 700,
            lineHeight: 1.02,
            letterSpacing: "-0.03em",
          }}
        >
          Sette giochi, una sfida nuova ogni giorno.
        </p>
        <p
          style={{
            fontSize: 26,
            opacity: 0.75,
            fontFamily: "Inter, sans-serif",
          }}
        >
          Gratis, nel browser, anche senza account.
        </p>
      </div>
      <div
        className="grid flex-1 grid-cols-3 gap-3 p-6"
        style={{ gridAutoRows: "1fr" }}
      >
        {GAMES.map((g, i) => (
          <GameCover
            key={g.id}
            id={g.id}
            nameSize="sm"
            className={i === 6 ? "col-span-3" : ""}
          />
        ))}
      </div>
    </div>
  );
}
