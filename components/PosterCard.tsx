import { forwardRef } from "react";
import type { Fighter } from "@/lib/types";
import type { BattleState } from "@/lib/battle";
import type { FightStats } from "@/lib/fightStats";

type PosterCardProps = {
  winner: Fighter;
  loser: Fighter;
  battle: BattleState;
  arenaName: string;
  stats: FightStats;
};

const POSTER_WIDTH = 360;
const POSTER_HEIGHT = 640;

function PosterPortrait({
  fighter,
  size,
  grayscale,
}: {
  fighter: Fighter;
  size: number;
  grayscale?: boolean;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 16,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `radial-gradient(circle, var(--color-type-${fighter.type}, #333) 0%, #0a0a12 78%)`,
        filter: grayscale ? "grayscale(1) brightness(0.7)" : undefined,
      }}
    >
      {fighter.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- captured by html-to-image, must be a real <img>
        <img
          src={fighter.imageUrl}
          alt={fighter.objectName}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <span style={{ fontSize: size * 0.55, lineHeight: 1 }}>{fighter.emoji}</span>
      )}
    </div>
  );
}

const PosterCard = forwardRef<HTMLDivElement, PosterCardProps>(function PosterCard(
  { winner, loser, battle, arenaName, stats },
  ref
) {
  const methodLabel = battle.winMethod === "decision" ? "DECISION" : "K.O.";

  return (
    <div
      ref={ref}
      style={{
        width: POSTER_WIDTH,
        height: POSTER_HEIGHT,
        position: "relative",
        overflow: "hidden",
        background: "#0a0a12",
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        fontFamily: "var(--font-body), system-ui, sans-serif",
        color: "#f5f5f7",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "22px 20px",
        boxSizing: "border-box",
      }}
    >
      {/* diagonal light beam */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          left: "-30%",
          width: "160%",
          height: "70%",
          background:
            "linear-gradient(115deg, rgba(34,211,238,.22), rgba(255,46,136,.22) 60%, transparent 90%)",
          transform: "rotate(-8deg)",
          pointerEvents: "none",
        }}
      />

      {/* header */}
      <div style={{ position: "relative", textAlign: "center", zIndex: 1 }}>
        <p
          className="neon-pink"
          style={{ fontFamily: "var(--font-display)", fontSize: 12, letterSpacing: 2, margin: 0 }}
        >
          OBJECT ROYALE
        </p>
        <p
          className="neon-yellow"
          style={{ fontFamily: "var(--font-display)", fontSize: 15, margin: "4px 0 0" }}
        >
          {arenaName}
        </p>
      </div>

      {/* fighters */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          marginTop: 24,
          width: "100%",
          height: 230,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ position: "relative" }}>
          <div
            style={{
              width: 200,
              height: 200,
              borderRadius: 20,
              border: "4px solid #ffd700",
              boxShadow: "0 0 28px rgba(255,215,0,.45)",
              overflow: "hidden",
            }}
          >
            <PosterPortrait fighter={winner} size={192} />
          </div>
          <span
            style={{
              position: "absolute",
              top: -30,
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: 40,
            }}
          >
            👑
          </span>

          <div
            style={{
              position: "absolute",
              bottom: -18,
              right: -30,
              transform: "rotate(-10deg)",
              width: 90,
              height: 90,
              borderRadius: 14,
              border: "3px solid #4b4b5a",
              overflow: "hidden",
              opacity: 0.85,
            }}
          >
            <PosterPortrait fighter={loser} size={84} grayscale />
            <span
              style={{
                position: "absolute",
                top: -10,
                right: -10,
                fontSize: 26,
              }}
            >
              ❌
            </span>
          </div>
        </div>
      </div>

      {/* headline */}
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", marginTop: 8 }}>
        <p
          className="neon-yellow"
          style={{ fontFamily: "var(--font-display)", fontSize: 34, margin: 0, lineHeight: 1.05 }}
        >
          {stats.headline}
        </p>
        <p
          style={{
            marginTop: 6,
            display: "inline-block",
            fontSize: 10,
            letterSpacing: 1,
            color: "#9ca3af",
            border: "1px solid #2a2a40",
            borderRadius: 999,
            padding: "2px 8px",
          }}
        >
          {methodLabel}
        </p>
        <p style={{ marginTop: 6, fontSize: 12, color: "#d4d4d8" }}>{stats.resultLine}</p>
      </div>

      {/* stats chips */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          marginTop: 14,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            background: "#151522",
            border: "1px solid #2a2a40",
            borderRadius: 999,
            padding: "4px 10px",
            fontSize: 11,
          }}
        >
          💥 Biggest hit {stats.biggestHit?.damage ?? 0}
        </span>
        <span
          style={{
            background: "#151522",
            border: "1px solid #2a2a40",
            borderRadius: 999,
            padding: "4px 10px",
            fontSize: 11,
          }}
        >
          ⚡ {stats.superEffectiveCount} super-effective
        </span>
        <span
          style={{
            background: "#151522",
            border: "1px solid #2a2a40",
            borderRadius: 999,
            padding: "4px 10px",
            fontSize: 11,
          }}
        >
          ❤️ {stats.winnerHpLeftPct}% HP left
        </span>
      </div>

      {/* footer */}
      <div style={{ position: "relative", zIndex: 1, marginTop: "auto", textAlign: "center" }}>
        <p style={{ fontSize: 12, fontStyle: "italic", color: "#a3a3ad", margin: 0 }}>
          &ldquo;{winner.catchphrase}&rdquo;
        </p>
        <p style={{ marginTop: 10, fontSize: 9, letterSpacing: 0.5, color: "#5a5a6a" }}>
          Play: object-royale.vercel.app
        </p>
      </div>
    </div>
  );
});

export default PosterCard;
