"use client";
import { motion } from "motion/react";

type HealthBarProps = {
  hp: number;
  maxHp: number;
  align: "left" | "right";
};

export default function HealthBar({ hp, maxHp, align }: HealthBarProps) {
  const pct = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
  const danger = pct <= 20;
  const colorClass = pct > 50 ? "bg-hp-high" : pct > 20 ? "bg-hp-mid" : "bg-hp-low";
  const origin = align === "right" ? "right" : "left";

  return (
    <div className="w-full">
      <div className="relative h-4 w-full overflow-hidden rounded-full border-2 border-panel-edge bg-black/60">
        {/* ghost layer: drains slowly, after a delay */}
        <motion.div
          className="absolute inset-y-0 bg-white/40"
          style={{ [origin]: 0 }}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, delay: 0.45, ease: "easeOut" }}
        />
        {/* colour layer: snaps quickly */}
        <motion.div
          className={`absolute inset-y-0 ${colorClass}`}
          style={{ [origin]: 0 }}
          initial={false}
          animate={{ width: `${pct}%`, opacity: danger ? [1, 0.5, 1] : 1 }}
          transition={
            danger
              ? { width: { duration: 0.2, ease: "easeOut" }, opacity: { duration: 0.9, repeat: Infinity, ease: "easeInOut" } }
              : { duration: 0.2, ease: "easeOut" }
          }
        />
        {/* segment ticks overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0_18px,rgba(0,0,0,.35)_18px_20px)]" />
      </div>
      <p
        className={`mt-0.5 font-display text-[10px] text-neutral-300 ${
          align === "right" ? "text-right" : "text-left"
        }`}
      >
        {Math.max(0, Math.round(hp))} / {maxHp}
      </p>
    </div>
  );
}
