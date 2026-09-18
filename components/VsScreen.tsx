"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useAnimation, useReducedMotion } from "motion/react";
import type { Fighter } from "@/lib/types";
import { TYPE_STYLES } from "@/lib/typeStyles";
import { sfx } from "@/lib/sfx";
import FighterPortrait from "./FighterPortrait";

type VsScreenProps = {
  player: Fighter;
  cpu: Fighter;
  onDone: () => void;
};

const TOTAL_DURATION_MS = 2200;
const SHAKE_AT_MS = 500;
const FIGHT_AT_MS = 1400;

function FighterSide({ fighter, side }: { fighter: Fighter; side: "player" | "cpu" }) {
  const typeStyle = TYPE_STYLES[fighter.type];
  const isPlayer = side === "player";
  return (
    <motion.div
      initial={{ x: isPlayer ? -260 : 260, opacity: 0, rotate: isPlayer ? -6 : 6 }}
      animate={{ x: 0, opacity: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 22, delay: isPlayer ? 0 : 0.1 }}
      className="flex flex-col items-center text-center"
    >
      <div className={`border-[3px] border-ink shadow-hard ${isPlayer ? "-rotate-2" : "rotate-2"}`}>
        <FighterPortrait fighter={fighter} size="lg" />
      </div>
      <p className={`headline mt-3 text-2xl sm:text-3xl ${isPlayer ? "text-cobalt" : "text-fight"}`}>{fighter.fighterName}</p>
      <p className="text-xs italic text-ink-soft">{fighter.title}</p>
      <span
        className={`mt-2 border-2 border-ink px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest ${typeStyle.bg} ${typeStyle.onBg}`}
      >
        {typeStyle.icon} {typeStyle.label}
      </span>
      <motion.p
        initial={{ opacity: 0, y: 8, scale: 0.85 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.8, duration: 0.3 }}
        className="mt-3 max-w-[140px] border-2 border-ink bg-card px-2 py-1 font-mono text-[10px] text-ink shadow-hard-sm"
      >
        &ldquo;{fighter.catchphrase}&rdquo;
      </motion.p>
    </motion.div>
  );
}

export default function VsScreen({ player, cpu, onDone }: VsScreenProps) {
  const shakeControls = useAnimation();
  const reduceMotion = useReducedMotion();
  const doneRef = useRef(false);
  const [showFight, setShowFight] = useState(false);

  useEffect(() => {
    function finish() {
      if (doneRef.current) return;
      doneRef.current = true;
      onDone();
    }

    const shakeTimer = setTimeout(() => {
      if (reduceMotion) return;
      shakeControls.start({
        x: [0, -14, 12, -8, 6, 0],
        y: [0, 6, -6, 4, -2, 0],
        transition: { duration: 0.4, ease: "easeInOut" },
      });
    }, SHAKE_AT_MS);

    const fightTimer = setTimeout(() => {
      setShowFight(true);
      sfx.fight();
    }, FIGHT_AT_MS);

    const doneTimer = setTimeout(finish, TOTAL_DURATION_MS);

    return () => {
      clearTimeout(shakeTimer);
      clearTimeout(fightTimer);
      clearTimeout(doneTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onDone identity churn shouldn't restart the intro timeline
  }, []);

  function handleTapSkip() {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }

  return (
    <motion.div
      animate={shakeControls}
      onClick={handleTapSkip}
      className="no-select relative min-h-dvh cursor-pointer overflow-hidden"
    >
      {/* diagonal split poster background: cobalt (player) vs fight red (cpu), hard cut, no gradient */}
      <div className="absolute inset-0 bg-cobalt" style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }} />
      <div className="absolute inset-0 bg-fight" style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }} />

      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center gap-10 px-4 py-8">
        <div className="flex w-full max-w-md items-center justify-between gap-4 sm:max-w-2xl">
          <FighterSide fighter={player} side="player" />
          <FighterSide fighter={cpu} side="cpu" />
        </div>

        <motion.div
          initial={{ scale: 1.6, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: -4 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 500, damping: 20 }}
          className="pointer-events-none absolute flex h-24 w-24 items-center justify-center border-[5px] border-ink bg-gold shadow-hard-lg sm:h-32 sm:w-32"
        >
          <span className="headline misprint text-4xl text-ink sm:text-5xl">VS</span>
        </motion.div>

        {showFight && (
          <motion.div
            initial={{ opacity: 0, scale: 1.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="pointer-events-none absolute bottom-14 -rotate-1 border-[3px] border-ink bg-card px-4 py-2 shadow-hard"
          >
            <span className="headline text-2xl text-ink sm:text-3xl">Round 1&hellip; Fight!</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
