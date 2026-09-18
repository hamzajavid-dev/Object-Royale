"use client";
import { motion, AnimatePresence } from "motion/react";

type DamagePopupProps = {
  amount: number;
  crit: boolean;
  superEffective: boolean;
  id: number;
};

const INK = "#141210";

export default function DamagePopup({ amount, crit, superEffective, id }: DamagePopupProps) {
  const colorClass = crit ? "text-fight" : superEffective ? "text-gold" : "text-ink";
  const sizeClass = crit ? "text-5xl" : "text-4xl";

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible">
      <AnimatePresence>
        <motion.span
          key={id}
          initial={{ opacity: 1, y: 0, scale: 1.4, rotate: crit ? -8 : 0 }}
          animate={{ opacity: 0, y: -60, scale: 1, rotate: crit ? -4 : 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className={`headline absolute ${sizeClass} ${colorClass}`}
          style={{ WebkitTextStroke: `2px ${INK}`, textShadow: `2px 2px 0 ${INK}` }}
        >
          -{amount}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
