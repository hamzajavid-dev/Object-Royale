"use client";
import { motion, AnimatePresence } from "motion/react";

type DamagePopupProps = {
  amount: number;
  crit: boolean;
  superEffective: boolean;
  id: number;
};

export default function DamagePopup({ amount, crit, superEffective, id }: DamagePopupProps) {
  const colorClass = crit ? "neon-pink" : superEffective ? "neon-yellow" : "text-white";
  const sizeClass = crit ? "text-5xl" : "text-4xl";

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible">
      <AnimatePresence>
        <motion.span
          key={id}
          initial={{ opacity: 1, y: 0, scale: 1.4 }}
          animate={{ opacity: 0, y: -60, scale: 1 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className={`absolute font-display ${sizeClass} ${colorClass}`}
        >
          -{amount}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
