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
const POSTER_SCALE = 0.78;

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
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 55,
        startVelocity: 55,
        origin: { x: 0, y: 1 },
        colors: ["#ff2e88", "#22d3ee", "#facc15"],
      });
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 55,
        startVelocity: 55,
        origin: { x: 1, y: 1 },
        colors: ["#ff2e88", "#22d3ee", "#facc15"],
      });
    } else {
      confetti({
        particleCount: 24,
        angle: 90,
        spread: 60,
        startVelocity: 20,
        origin: { x: 0.5, y: 1 },
        colors: ["#6b7280", "#9ca3af"],
      });
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

  return (
    <div className="no-select relative flex min-h-dvh flex-col items-center px-4 pb-8 pt-8">
      <motion.h1
        initial={{ scale: 2.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 15 }}
        className={`font-display text-5xl ${playerWon ? "neon-cyan" : "neon-pink"}`}
      >
        {playerWon ? "YOU WIN!" : "YOU LOSE!"}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-1 font-display text-xl neon-yellow"
      >
        {stats.headline}
      </motion.p>

      {!playerWon && (
        <p className="mt-1 text-center text-xs text-neutral-400">
          Defeated by a {cpu.objectName}. Tell your friends. Or don&apos;t.
        </p>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.35 }}
        className="mt-4 max-w-75 rounded-2xl border border-panel-edge bg-panel px-4 py-3 text-center"
      >
        <p className="text-xs text-neutral-500">{loser.fighterName}&apos;s last words:</p>
        <p className="mt-1 text-sm italic text-neutral-200">&ldquo;{lastWords}&rdquo;</p>
      </motion.div>

      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="mt-6"
      >
        <div
          style={{
            width: POSTER_WIDTH * POSTER_SCALE,
            height: POSTER_HEIGHT * POSTER_SCALE,
            overflow: "hidden",
            borderRadius: 20,
            boxShadow: "0 12px 40px rgba(0,0,0,.5)",
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

      {toast && (
        <div className="mt-3 rounded-lg border border-panel-edge bg-panel px-3 py-2 text-center text-xs text-neon-pink">
          {toast}
        </div>
      )}

      <div className="mt-6 flex w-full max-w-75 flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleSaveOrShare}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-panel-edge bg-panel py-3 font-display text-sm text-white disabled:opacity-60"
        >
          {saving ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-500 border-t-white" />
              Generating&hellip;
            </>
          ) : canShareFiles ? (
            "📤 SHARE"
          ) : (
            "📥 SAVE POSTER"
          )}
        </button>

        <button
          type="button"
          onClick={onRematch}
          className="w-full rounded-2xl bg-neon-yellow py-4 font-display text-xl text-black shadow-[0_0_30px_rgba(250,204,21,.6)]"
        >
          🔁 REMATCH
        </button>

        <button
          type="button"
          onClick={onRoster}
          className="w-full rounded-2xl border-2 border-neon-cyan py-3 font-display text-base text-neon-cyan"
        >
          🥊 NEW MATCHUP
        </button>

        <button type="button" onClick={onNewArena} className="text-sm text-neutral-400 underline">
          📸 NEW ARENA
        </button>
      </div>
    </div>
  );
}
