"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useAnimation } from "motion/react";
import type { Fighter } from "@/lib/types";
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

export default function VsScreen({ player, cpu, onDone }: VsScreenProps) {
  const shakeControls = useAnimation();
  const doneRef = useRef(false);
  const [showFight, setShowFight] = useState(false);

  useEffect(() => {
    function finish() {
      if (doneRef.current) return;
      doneRef.current = true;
      onDone();
    }

    const shakeTimer = setTimeout(() => {
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
      <style>{`
        @keyframes vsStripeSlide {
          from { background-position: 0 0; }
          to { background-position: 240px 240px; }
        }
      `}</style>

      {/* diagonal split background: cyan (player) top-left, pink (cpu) bottom-right */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, rgba(34,211,238,.4), #0a0a12 60%)",
          clipPath: "polygon(0 0, 100% 0, 0 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, #0a0a12 40%, rgba(255,46,136,.4))",
          clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, rgba(255,255,255,.6) 0px, rgba(255,255,255,.6) 3px, transparent 3px, transparent 44px)",
          animation: "vsStripeSlide 5s linear infinite",
        }}
      />

      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-4">
        <div className="flex w-full max-w-md items-center justify-between px-2">
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0 }}
            className="flex flex-col items-center text-center"
          >
            <FighterPortrait fighter={player} size="lg" />
            <p className="mt-2 font-display text-lg text-neon-cyan">{player.fighterName}</p>
            <p className="text-xs italic text-neutral-400">{player.title}</p>
            <motion.p
              initial={{ opacity: 0, y: 8, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.8, duration: 0.3 }}
              className="mt-2 max-w-[130px] rounded-xl border border-panel-edge bg-panel px-2 py-1 text-[10px] text-neutral-200"
            >
              &ldquo;{player.catchphrase}&rdquo;
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.15 }}
            className="flex flex-col items-center text-center"
          >
            <FighterPortrait fighter={cpu} size="lg" />
            <p className="mt-2 font-display text-lg text-neon-pink">{cpu.fighterName}</p>
            <p className="text-xs italic text-neutral-400">{cpu.title}</p>
            <motion.p
              initial={{ opacity: 0, y: 8, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.8, duration: 0.3 }}
              className="mt-2 max-w-[130px] rounded-xl border border-panel-edge bg-panel px-2 py-1 text-[10px] text-neutral-200"
            >
              &ldquo;{cpu.catchphrase}&rdquo;
            </motion.p>
          </motion.div>
        </div>

        <motion.div
          initial={{ scale: 4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 300, damping: 12 }}
          className="pointer-events-none absolute font-display text-8xl neon-yellow"
        >
          VS
        </motion.div>

        {showFight && (
          <motion.div
            initial={{ opacity: 0, scale: 1.4 }}
            animate={{ opacity: 1, scale: 1, color: ["#ffffff", "#ffffff", "#facc15"] }}
            transition={{ duration: 0.6, times: [0, 0.3, 1] }}
            className="pointer-events-none absolute bottom-16 font-display text-3xl tracking-wide"
          >
            ROUND 1&hellip; FIGHT!
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
