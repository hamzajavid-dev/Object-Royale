import { forwardRef } from "react";
import type { Fighter, MoveType } from "@/lib/types";
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

// Hex-only palette (mirrors app/globals.css). html-to-image can't reliably
// resolve CSS custom properties when it inlines styles, so every colour on
// this card is a literal hex value.
const PAPER = "#eee6d3";
const PAPER_DARK = "#e0d5bc";
const CARD = "#fbf7ee";
const INK = "#141210";
const INK_SOFT = "#5b544a";
const FIGHT = "#e23b26";
const GOLD = "#f4c21b";
const COBALT = "#1f4fd6";

const TYPE_HEX: Record<MoveType, string> = {
  heat: "#e8552d",
  sharp: "#9aa3ad",
  electric: "#f4c21b",
  liquid: "#2f7be0",
  blunt: "#a0784e",
  chaos: "#c23a93",
};

function PosterPortrait({ fighter, size, dim }: { fighter: Fighter; size: number; dim?: boolean }) {
  const tint = TYPE_HEX[fighter.type];
  return (
    <div style={{ position: "relative", width: size, height: size, overflow: "hidden", background: PAPER_DARK }}>
      {fighter.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- captured by html-to-image, must be a real <img>
        <img
          src={fighter.imageUrl}
          alt={fighter.objectName}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: dim ? "grayscale(1) brightness(0.75)" : undefined,
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `${tint}33`,
          }}
        >
          <span style={{ fontSize: size * 0.5, lineHeight: 1, filter: dim ? "grayscale(1)" : undefined }}>
            {fighter.emoji}
          </span>
        </div>
      )}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(${tint} 1.3px, transparent 1.5px)`,
          backgroundSize: "8px 8px",
          opacity: dim ? 0.12 : 0.28,
        }}
      />
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
        background: PAPER,
        fontFamily: "var(--font-body), system-ui, sans-serif",
        color: INK,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px 20px 16px",
        boxSizing: "border-box",
        border: `6px solid ${INK}`,
      }}
    >
      {/* halftone corner */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 200,
          height: 200,
          backgroundImage: `radial-gradient(${INK} 1.6px, transparent 1.8px)`,
          backgroundSize: "10px 10px",
          opacity: 0.14,
          pointerEvents: "none",
        }}
      />

      {/* header */}
      <div style={{ position: "relative", textAlign: "center", zIndex: 1 }}>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: 3,
            margin: 0,
            textTransform: "uppercase",
            color: INK_SOFT,
          }}
        >
          Object Royale Presents
        </p>
        <p
          style={{
            fontFamily: "var(--font-display)",
            textTransform: "uppercase",
            fontSize: 17,
            margin: "4px 0 0",
            color: INK,
          }}
        >
          {arenaName}
        </p>
      </div>

      {/* fighters */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          marginTop: 20,
          width: "100%",
          height: 220,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ position: "relative", transform: "rotate(-2deg)" }}>
          <div
            style={{
              width: 188,
              height: 188,
              border: `5px solid ${INK}`,
              boxShadow: `6px 6px 0 0 ${INK}`,
              overflow: "hidden",
            }}
          >
            <PosterPortrait fighter={winner} size={178} />
          </div>
          <span
            style={{
              position: "absolute",
              top: -18,
              left: -14,
              transform: "rotate(-8deg)",
              background: GOLD,
              border: `3px solid ${INK}`,
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: 1,
              padding: "3px 8px",
              color: INK,
            }}
          >
            ★ CHAMPION
          </span>

          <div
            style={{
              position: "absolute",
              bottom: -22,
              right: -34,
              transform: "rotate(8deg)",
              width: 84,
              height: 84,
              border: `3px solid ${INK}`,
              overflow: "hidden",
              background: CARD,
            }}
          >
            <PosterPortrait fighter={loser} size={78} dim />
            {/* crossed-out mark, drawn (no emoji decoration) */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ position: "absolute", width: "130%", height: 5, background: FIGHT, transform: "rotate(45deg)" }} />
              <div style={{ position: "absolute", width: "130%", height: 5, background: FIGHT, transform: "rotate(-45deg)" }} />
            </div>
          </div>
        </div>
      </div>

      {/* headline */}
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", marginTop: 6 }}>
        <p
          style={{
            fontFamily: "var(--font-display)",
            textTransform: "uppercase",
            fontSize: 32,
            margin: 0,
            lineHeight: 1.02,
            color: INK,
            textShadow: `3px 3px 0 ${FIGHT}, -2px -1px 0 ${COBALT}`,
          }}
        >
          {stats.headline}
        </p>
        <p
          style={{
            marginTop: 8,
            display: "inline-block",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: 1,
            color: INK,
            border: `2px solid ${INK}`,
            padding: "2px 8px",
            background: CARD,
          }}
        >
          {methodLabel}
        </p>
        <p style={{ marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: INK_SOFT }}>{stats.resultLine}</p>
      </div>

      {/* stats chips */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          marginTop: 12,
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            background: CARD,
            border: `2px solid ${INK}`,
            padding: "4px 8px",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
          }}
        >
          💥 BIGGEST HIT {stats.biggestHit?.damage ?? 0}
        </span>
        <span
          style={{
            background: CARD,
            border: `2px solid ${INK}`,
            padding: "4px 8px",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
          }}
        >
          ⚡ {stats.superEffectiveCount} SUPER-EFFECTIVE
        </span>
        <span
          style={{
            background: CARD,
            border: `2px solid ${INK}`,
            padding: "4px 8px",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
          }}
        >
          ❤️ {stats.winnerHpLeftPct}% HP LEFT
        </span>
      </div>

      {/* footer */}
      <div style={{ position: "relative", zIndex: 1, marginTop: "auto", width: "100%", textAlign: "center" }}>
        <div style={{ height: 3, width: "100%", background: INK, marginBottom: 10 }} />
        <p style={{ fontSize: 12, fontStyle: "italic", color: INK_SOFT, margin: 0 }}>&ldquo;{winner.catchphrase}&rdquo;</p>
        <p style={{ marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 0.5, color: INK_SOFT }}>
          Play: object-royale.vercel.app
        </p>
      </div>
    </div>
  );
});

export default PosterCard;
