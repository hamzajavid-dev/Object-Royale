"use client";
import { useState } from "react";
import { motion } from "motion/react";
import { MAX_ENERGY, type BattleFighter } from "@/lib/battle";
import { ABILITY_META, EFFECT_META } from "@/lib/effectMeta";

type StatusBadgesProps = {
  bf: BattleFighter;
  align?: "left" | "right";
};

/** Compact ink-pip meter: filled = gold, empty = paper-dark, with a font-mono readout. */
function EnergyMeter({ energy, align }: { energy: number; align: "left" | "right" }) {
  const pips = Array.from({ length: MAX_ENERGY }, (_, i) => i < energy);
  return (
    <div className={`flex items-center gap-1 ${align === "right" ? "flex-row-reverse" : ""}`}>
      <motion.div
        key={energy}
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 20 }}
        className={`flex gap-0.5 ${align === "right" ? "flex-row-reverse" : ""}`}
      >
        {pips.map((filled, i) => (
          <span key={i} className={`h-2 w-3 border border-ink ${filled ? "bg-gold" : "bg-paper-dark"}`} />
        ))}
      </motion.div>
      <span className="font-mono text-[9px] uppercase tracking-widest text-ink-soft">
        ⚡ {energy}/{MAX_ENERGY}
      </span>
    </div>
  );
}

/** Small stamped chips for active statuses, plus the equipped ability as a tappable/hoverable ink chip. */
export default function StatusBadges({ bf, align = "left" }: StatusBadgesProps) {
  const [showRule, setShowRule] = useState(false);
  const s = bf.statuses;
  const abilityMeta = ABILITY_META[bf.ability.kind];

  const chips: { key: string; icon: string; label: string }[] = [];
  if (s.burnTurns > 0) chips.push({ key: "burn", icon: EFFECT_META.burn.icon, label: `BURN ×${s.burnTurns}` });
  if (s.stunned) chips.push({ key: "stun", icon: EFFECT_META.stun.icon, label: "STUN" });
  if (s.shielded) chips.push({ key: "shield", icon: EFFECT_META.shield.icon, label: "SHIELD" });
  if (s.boosted) chips.push({ key: "boost", icon: EFFECT_META.boost.icon, label: "BOOST" });
  if (s.weakened) chips.push({ key: "weak", icon: EFFECT_META.weaken.icon, label: "WEAK" });

  return (
    <div className={`flex flex-col gap-1 ${align === "right" ? "items-end" : "items-start"}`}>
      <EnergyMeter energy={bf.energy} align={align} />
      <div className={`flex flex-wrap items-center gap-1 ${align === "right" ? "justify-end" : "justify-start"}`}>
      {chips.map((c) => (
        <span
          key={c.key}
          className="border-2 border-ink bg-card px-1 py-0.5 font-mono text-[8px] uppercase tracking-widest text-ink"
        >
          {c.icon} {c.label}
        </span>
      ))}
      <button
        type="button"
        onClick={() => setShowRule((v) => !v)}
        onMouseEnter={() => setShowRule(true)}
        onMouseLeave={() => setShowRule(false)}
        className="relative border-2 border-ink bg-ink px-1 py-0.5 font-mono text-[8px] uppercase tracking-widest text-card"
        aria-label={`Ability: ${bf.ability.name}. ${abilityMeta.rule}`}
      >
        {abilityMeta.icon} {bf.ability.name}
        {showRule && (
          <span
            className={`absolute top-full z-10 mt-1 w-max max-w-[160px] border-2 border-ink bg-card px-1.5 py-1 text-left text-[9px] normal-case tracking-normal text-ink shadow-hard-sm ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            {abilityMeta.rule}
          </span>
        )}
      </button>
      </div>
    </div>
  );
}
