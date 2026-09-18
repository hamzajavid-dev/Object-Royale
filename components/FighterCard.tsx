"use client";
import { motion } from "motion/react";
import type { Fighter } from "@/lib/types";
import { TYPE_STYLES } from "@/lib/typeStyles";
import FighterPortrait from "./FighterPortrait";

type FighterCardProps = {
  fighter: Fighter;
  selectedAs: "player" | "opponent" | null;
  onTap: () => void;
  index: number;
};

export default function FighterCard({ fighter, selectedAs, onTap, index }: FighterCardProps) {
  const typeStyle = TYPE_STYLES[fighter.type];
  const weaknessStyle = TYPE_STYLES[fighter.weakness];

  const borderClass =
    selectedAs === "player"
      ? "border-neon-cyan shadow-[0_0_24px_rgba(34,211,238,.55)]"
      : selectedAs === "opponent"
      ? "border-neon-pink shadow-[0_0_24px_rgba(255,46,136,.55)]"
      : "border-panel-edge";

  return (
    <motion.button
      type="button"
      onClick={onTap}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, scale: selectedAs ? 1.03 : 1 }}
      transition={{ delay: index * 0.07, duration: 0.35 }}
      whileTap={{ scale: 0.96 }}
      className={`relative bg-panel rounded-2xl border-2 p-3 text-left ${borderClass}`}
    >
      {selectedAs === "player" && (
        <span className="absolute -top-2 -left-2 z-10 rounded-full bg-neon-cyan px-2 py-0.5 font-display text-[10px] text-black">
          P1
        </span>
      )}
      {selectedAs === "opponent" && (
        <span className="absolute -top-2 -left-2 z-10 rounded-full bg-neon-pink px-2 py-0.5 font-display text-[10px] text-black">
          CPU
        </span>
      )}

      <FighterPortrait fighter={fighter} size="md" />

      <p className="mt-2 truncate font-display text-base text-white">{fighter.fighterName}</p>
      <p className="truncate text-xs italic text-neutral-400">{fighter.title}</p>

      <div className="mt-2 flex items-center gap-1.5">
        <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold text-black ${typeStyle.bg}`}>
          {typeStyle.icon} {typeStyle.label}
        </span>
        <span className="inline-flex items-center gap-1 rounded bg-panel-edge px-1.5 py-0.5 text-[10px] text-neutral-300">
          WEAK: {weaknessStyle.icon}
        </span>
      </div>

      <p className="mt-1 text-right font-display text-sm text-white">❤️ {fighter.hp}</p>
    </motion.button>
  );
}
