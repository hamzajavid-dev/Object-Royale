"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import confetti from "canvas-confetti";
import { toPng } from "html-to-image";
import type { Fighter } from "@/lib/types";
import type { BattleState } from "@/lib/battle";
import { computeFightStats } from "@/lib/fightStats";
import { sfx } from "@/lib/sfx";
import PosterCard from "./PosterCard";

type VictoryScreenProps = {
  player: Fighter;
  cpu: Fighter;
  battle: BattleState;
  arenaName: string;
  onRematch: () => void;
  onRoster: () => void;
  onNewArena: () => void;
};

// At least 10 funny, generic last words. Picked at random for the loser.
const LAST_WORDS: Array<(loser: Fighter) => string> = [
  () => "Tell my charger... I always loved her.",
  () => "I should have stayed in the drawer.",
  () => "Tell the recycling bin... I forgive it.",
  (f) => `${f.fighterName}, out. Somebody update my warranty status.`,
  (f) => `I regret nothing, except being a ${f.objectName}.`,
  () => "This is exactly why I never wanted to be picked up.",
  () => "Please don't donate me. I have plans.",
  () => "Tell the shelf I said hi. And also goodbye.",
  () => "I was rated for drops. I was NOT rated for this.",
  () => "Somebody grab my extended warranty, quick!",
  () => "At least I'll trend on the fridge for a week.",
  () => "Worth it. Tell my batteries they did their best.",
  () => "I saw this coming. I have no eyes, but I saw it.",
];

function pickLastWords(loser: Fighter): string {
  const template = LAST_WORDS[Math.floor(Math.random() * LAST_WORDS.length)];
  return template(loser);
}

const POSTER_WIDTH = 360;
const POSTER_HEIGHT = 640;
const POSTER_SCALE = 0.72;

// Print-only confetti palette (fight, gold, cobalt, ink) — no neon.
const WIN_CONFETTI = ["#e23b26", "#f4c21b", "#1f4fd6", "#141210"];
const LOSE_CONFETTI = ["#9b9283", "#5b544a"];

export default function VictoryScreen({
  player,
  cpu,
  battle,
  arenaName,
  onRematch,
  onRoster,
  onNewArena,
}: VictoryScreenProps) {
  const playerWon = battle.winner === "player";
  const winner = playerWon ? player : cpu;
  const loser = playerWon ? cpu : player;

  const stats = useMemo(() => computeFightStats(battle), [battle]);
  const [lastWords] = useState(() => pickLastWords(loser));

  const posterRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [canShareFiles] = useState(() => {
    if (typeof navigator === "undefined") return false;
    try {
      const probe = new File([], "probe.png", { type: "image/png" });
      return Boolean(navigator.canShare?.({ files: [probe] }));
    } catch {
      return false;
    }
  });

  useEffect(() => {
    sfx.victory();
    if (playerWon) {
      confetti({ particleCount: 80, angle: 60, spread: 55, startVelocity: 55, origin: { x: 0, y: 1 }, colors: WIN_CONFETTI });
      confetti({ particleCount: 80, angle: 120, spread: 55, startVelocity: 55, origin: { x: 1, y: 1 }, colors: WIN_CONFETTI });
    } else {
      confetti({ particleCount: 24, angle: 90, spread: 60, startVelocity: 20, origin: { x: 0.5, y: 1 }, colors: LOSE_CONFETTI });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once on mount only
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function handleSaveOrShare() {
    if (!posterRef.current || saving) return;
    setSaving(true);
    setToast(null);
    try {
      const dataUrl = await toPng(posterRef.current, { pixelRatio: 2, cacheBust: true });
      const filename = `object-royale-${winner.id}.png`;

      if (canShareFiles) {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], filename, { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: "Object Royale", text: stats.resultLine });
            return;
          } catch (err) {
            // User closed the share sheet: not an error.
            if (err instanceof DOMException && err.name === "AbortError") return;
            // Otherwise (e.g. iOS lost the tap's activation while rendering), fall back to download.
          }
        }
      }

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = filename;
      link.click();
    } catch {
      setToast("Couldn't save. Take a screenshot!");
    } finally {
      setSaving(false);
    }
  }

  const tapeRows: Array<{ label: string; value: string }> = [
    { label: "METHOD", value: battle.winMethod === "decision" ? "DECISION" : "K.O." },
    { label: "TOTAL MOVES", value: String(stats.totalMoves) },
    {
      label: "BIGGEST HIT",
      value: stats.biggestHit ? `${stats.biggestHit.damage} (${stats.biggestHit.move})` : "—",
    },
    { label: "SUPER-EFFECTIVE HITS", value: String(stats.superEffectiveCount) },
    { label: "CRITS", value: String(stats.critCount) },
    { label: "WINNER HP LEFT", value: `${stats.winnerHpLeftPct}%` },
  ];

  return (
    <div className="no-select relative flex min-h-dvh flex-col items-center px-4 pb-8 pt-8">
      <div className="flex w-full max-w-5xl flex-col gap-6 md:grid md:grid-cols-[minmax(0,340px)_1fr] md:items-start md:gap-10">
        {/* title block */}
        <div className="flex flex-col items-center text-center md:col-start-2 md:items-start md:text-left">
          <motion.h1
            initial={{ scale: 2.2, opacity: 0, rotate: -6 }}
            animate={{ scale: 1, opacity: 1, rotate: -3 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
            className={`headline misprint text-6xl sm:text-7xl ${playerWon ? "text-ink" : "text-fight"}`}
          >
            {playerWon ? "WINNER" : "DEFEATED"}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-1 -rotate-1 border-2 border-ink bg-card px-2 py-0.5 font-mono text-[11px] uppercase tracking-widest text-ink shadow-hard-sm"
          >
            {stats.headline}
          </motion.p>

          <p className="mt-3 font-mono text-xs text-ink-soft">{stats.resultLine}</p>

          {!playerWon && (
            <p className="mt-1 font-mono text-[11px] text-ink-faint">
              Defeated by a {cpu.objectName}. Tell your friends. Or don&apos;t.
            </p>
          )}
        </div>

        {/* last words speech bubble */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="relative -rotate-1 border-[3px] border-ink bg-card px-4 py-3 shadow-hard md:col-start-2"
        >
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
            {loser.fighterName}&apos;s last words
          </p>
          <p className="mt-1 text-sm italic text-ink">&ldquo;{lastWords}&rdquo;</p>
          <span className="absolute -bottom-2 left-6 h-4 w-4 rotate-45 border-r-[3px] border-b-[3px] border-ink bg-card" />
        </motion.div>

        {/* poster */}
        <motion.div
          initial={{ opacity: 0, scale: 1.15, rotate: -4 }}
          animate={{ opacity: 1, scale: 1, rotate: -1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 20 }}
          className="mx-auto md:col-start-1 md:row-start-1 md:row-span-4 md:mx-0 md:self-start md:sticky md:top-8"
        >
          <div
            style={{
              width: POSTER_WIDTH * POSTER_SCALE,
              height: POSTER_HEIGHT * POSTER_SCALE,
              overflow: "hidden",
              boxShadow: "8px 8px 0 0 #141210",
            }}
          >
            <div
              style={{
                width: POSTER_WIDTH,
                height: POSTER_HEIGHT,
                transform: `scale(${POSTER_SCALE})`,
                transformOrigin: "top left",
              }}
            >
              <PosterCard ref={posterRef} winner={winner} loser={loser} battle={battle} arenaName={arenaName} stats={stats} />
            </div>
          </div>
        </motion.div>

        {/* tale of the tape */}
        <div className="w-full max-w-sm md:col-start-2">
          <p className="headline text-lg text-ink">Tale Of The Tape</p>
          <div className="mt-1 border-[3px] border-ink bg-card shadow-hard-sm">
            {tapeRows.map((row, i) => (
              <div
                key={row.label}
                className={`flex items-center justify-between px-3 py-1.5 font-mono text-[11px] ${
                  i > 0 ? "border-t-2 border-ink" : ""
                }`}
              >
                <span className="uppercase tracking-widest text-ink-soft">{row.label}</span>
                <span className="text-ink">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {toast && (
          <div className="border-2 border-fight bg-card px-3 py-2 text-center font-mono text-xs text-fight md:col-start-2">
            {toast}
          </div>
        )}

        {/* actions */}
        <div className="flex w-full max-w-sm flex-col items-stretch gap-3 md:col-start-2">
          <button
            type="button"
            onClick={handleSaveOrShare}
            disabled={saving}
            className="press flex min-h-12 w-full items-center justify-center gap-2 border-[3px] border-ink bg-card font-mono text-sm uppercase tracking-widest text-ink shadow-hard disabled:opacity-60"
          >
            {saving ? "Generating…" : canShareFiles ? "📤 Share" : "📥 Save Poster"}
          </button>

          <button
            type="button"
            onClick={onRematch}
            className="press min-h-14 w-full border-[3px] border-ink bg-fight font-mono text-lg font-bold uppercase tracking-wide text-card shadow-hard"
          >
            🔁 Rematch
          </button>

          <button
            type="button"
            onClick={onRoster}
            className="press min-h-12 w-full border-[3px] border-ink bg-cobalt font-mono text-sm uppercase tracking-widest text-card shadow-hard-sm"
          >
            🥊 New Matchup
          </button>

          <button type="button" onClick={onNewArena} className="font-mono text-xs uppercase tracking-widest text-ink-soft underline">
            📸 New Arena
          </button>
        </div>
      </div>
    </div>
  );
}
