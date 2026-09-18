"use client";
import { motion } from "motion/react";
import type { Fighter } from "@/lib/types";
import { TYPE_STYLES } from "@/lib/typeStyles";
import { ABILITY_META } from "@/lib/effectMeta";
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

  const outline =
    selectedAs === "player" ? "border-cobalt" : selectedAs === "opponent" ? "border-rival" : "border-ink";

  return (
    <motion.button
      type="button"
      onClick={onTap}
      initial={{ opacity: 0, y: 30, rotate: -6 }}
      animate={{
        opacity: 1,
        y: 0,
        rotate: selectedAs === "player" ? -1 : selectedAs === "opponent" ? 1 : 0,
        scale: selectedAs ? 1.03 : 1,
      }}
      transition={{ type: "spring", stiffness: 500, damping: 26, delay: index * 0.05 }}
      className={`press relative w-full border-[3px] bg-card p-3 text-left shadow-hard ${outline}`}
    >
      {selectedAs === "player" && (
        <span className="absolute -top-3 -left-3 z-10 -rotate-3 border-[2px] border-ink bg-cobalt px-2 py-0.5 font-mono text-[11px] uppercase tracking-widest text-card">
          You
        </span>
      )}
      {selectedAs === "opponent" && (
        <span className="absolute -top-3 -left-3 z-10 rotate-3 border-[2px] border-ink bg-rival px-2 py-0.5 font-mono text-[11px] uppercase tracking-widest text-card">
          Rival
        </span>
      )}

      <FighterPortrait fighter={fighter} size="md" className="mx-auto" />

      <p className="headline mt-2 truncate text-xl text-ink">{fighter.fighterName}</p>
      <p className="truncate text-xs italic text-ink-soft">{fighter.title}</p>

      <div className="mt-2 flex flex-wrap items-center gap-1">
        <span
          className={`inline-flex items-center gap-1 border-[2px] border-ink px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest ${typeStyle.bg} ${typeStyle.onBg}`}
        >
          {typeStyle.icon} {typeStyle.label}
        </span>
        <span
          className={`inline-flex items-center gap-1 border-[2px] border-ink px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest ${weaknessStyle.bg} ${weaknessStyle.onBg}`}
        >
          WEAK {weaknessStyle.icon}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-ink-soft">
        <span>{fighter.moves.length} MOVES</span>
        <span className="flex items-center gap-1 text-sm">
          {fighter.abilities.map((a) => (
            <span key={a.name} title={a.name} aria-label={a.name}>
              {ABILITY_META[a.kind].icon}
            </span>
          ))}
        </span>
      </div>

      <p className="mt-1 text-right font-mono text-sm text-ink">HP {fighter.hp}</p>
    </motion.button>
  );
}
