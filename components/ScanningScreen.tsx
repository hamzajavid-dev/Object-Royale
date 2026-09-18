"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Arena } from "@/lib/types";
import type { ScanStatus } from "@/lib/useArenaScan";
import { TYPE_STYLES } from "@/lib/typeStyles";
import { sfx } from "@/lib/sfx";

type ScanningScreenProps = {
  photoDataUrl: string | null;
  status: ScanStatus;
  arena: Arena | null;
  error: string | null;
  onContinue: () => void;
  onRetry: () => void;
  onUseDemo: () => void;
};

const SCAN_CAPTIONS = [
  "Detecting suspicious objects…",
  "Measuring threat levels…",
  "Negotiating with the chai cup…",
  "Assigning special moves…",
  "Checking fighter insurance…",
];

const BOX_STAGGER_SECONDS = 0.25;

function AnimatedEllipsis() {
  return (
    <span aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="inline-block"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
        >
          .
        </motion.span>
      ))}
    </span>
  );
}

function ScanLine() {
  return (
    <motion.div
      className="absolute left-0 right-0 z-20"
      initial={{ top: "0%" }}
      animate={{ top: "100%" }}
      transition={{ duration: 1.8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
      style={{ transform: "translateY(-100%)" }}
    >
      <div className="h-16 bg-gradient-to-b from-transparent to-neon-cyan/70" />
      <div className="h-[3px] bg-neon-cyan shadow-[0_0_16px_4px_rgba(34,211,238,0.9)]" />
    </motion.div>
  );
}

function ViewfinderCorners() {
  return (
    <>
      <div className="pointer-events-none absolute top-2 left-2 z-20 h-6 w-6 rounded-tl-md border-t-2 border-l-2 border-neon-cyan" />
      <div className="pointer-events-none absolute top-2 right-2 z-20 h-6 w-6 rounded-tr-md border-t-2 border-r-2 border-neon-cyan" />
      <div className="pointer-events-none absolute bottom-2 left-2 z-20 h-6 w-6 rounded-bl-md border-b-2 border-l-2 border-neon-cyan" />
      <div className="pointer-events-none absolute bottom-2 right-2 z-20 h-6 w-6 rounded-br-md border-b-2 border-r-2 border-neon-cyan" />
    </>
  );
}

function GridOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10"
      style={{
        backgroundImage:
          "linear-gradient(rgba(34,211,238,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.12) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    />
  );
}

export default function ScanningScreen({
  photoDataUrl,
  status,
  arena,
  error,
  onContinue,
  onRetry,
  onUseDemo,
}: ScanningScreenProps) {
  const isWorking = status === "preparing" || status === "scanning" || status === "cropping";
  const isDone = status === "done" && arena !== null;
  const isError = status === "error";

  const [captionIndex, setCaptionIndex] = useState(0);
  useEffect(() => {
    if (!isWorking) return;
    const id = setInterval(() => {
      setCaptionIndex((i) => (i + 1) % SCAN_CAPTIONS.length);
    }, 1200);
    return () => clearInterval(id);
  }, [isWorking]);

  const fightersWithBox = isDone ? arena.fighters.filter((f) => f.box) : [];

  // Fire the "lock-on" blip for each targeting box once, staggered, the
  // first time this arena finishes scanning. Guarded so re-renders (or a
  // parent re-mounting with the same arena) never replay the sequence.
  const playedForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isDone) return;
    const key = arena.arenaName + fightersWithBox.length;
    if (playedForRef.current === key) return;
    playedForRef.current = key;

    const timers = fightersWithBox.map((_, i) =>
      setTimeout(() => sfx.select(), i * BOX_STAGGER_SECONDS * 1000)
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDone, arena?.arenaName, fightersWithBox.length]);

  if (!photoDataUrl) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 pt-4 text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-neon-cyan/30 border-t-neon-cyan" />
        <p className="font-display text-lg text-neon-cyan">
          SCANNING ARENA<AnimatedEllipsis />
        </p>
      </div>
    );
  }

  const enterButtonDelay = fightersWithBox.length * BOX_STAGGER_SECONDS + 0.3;

  return (
    <div className="flex min-h-dvh flex-col gap-4 pt-4">
      <header className="text-center">
        {isDone ? (
          <h1 className="neon-yellow truncate font-display text-2xl uppercase">{arena.arenaName}</h1>
        ) : isError ? (
          <h1 className="font-display text-2xl text-red-400">SCAN FAILED</h1>
        ) : (
          <h1 className="font-display text-2xl text-neon-cyan">
            SCANNING ARENA<AnimatedEllipsis />
          </h1>
        )}
      </header>

      <div className="relative w-full overflow-hidden rounded-2xl border-2 border-neon-cyan/50">
        {/* eslint-disable-next-line @next/next/no-img-element -- data URL from the local camera/file capture, not a static asset */}
        <img src={photoDataUrl} alt="Scanned arena" className="block h-auto w-full" />

        {(isWorking || isError) && <div className="pointer-events-none absolute inset-0 z-10 bg-black/30" />}

        <ViewfinderCorners />

        <AnimatePresence>{isWorking && <GridOverlay key="grid" />}</AnimatePresence>
        <AnimatePresence>{isWorking && <ScanLine key="scanline" />}</AnimatePresence>

        {isDone &&
          fightersWithBox.map((fighter, i) => {
            const box = fighter.box!;
            const [ymin, xmin, ymax, xmax] = box;
            const typeStyle = TYPE_STYLES[fighter.type];
            return (
              <motion.div
                key={fighter.id}
                className={`absolute z-20 border-2 ${typeStyle.border}`}
                style={{
                  top: `${ymin / 10}%`,
                  left: `${xmin / 10}%`,
                  width: `${(xmax - xmin) / 10}%`,
                  height: `${(ymax - ymin) / 10}%`,
                }}
                initial={{ opacity: 0, scale: 1.3 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * BOX_STAGGER_SECONDS, type: "spring", stiffness: 260, damping: 18 }}
              >
                <span
                  className={`absolute top-0 left-0 whitespace-nowrap rounded px-1 py-0.5 font-display text-[10px] text-black ${typeStyle.bg}`}
                >
                  {fighter.emoji} {fighter.fighterName}
                </span>
              </motion.div>
            );
          })}
      </div>

      {isWorking && (
        <p className="text-center text-sm text-neutral-400">{SCAN_CAPTIONS[captionIndex]}</p>
      )}

      {isDone && (
        <div className="mt-auto flex flex-col items-center gap-2 pb-6">
          <motion.button
            type="button"
            onClick={onContinue}
            initial={{ opacity: 0, y: 40, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: enterButtonDelay, type: "spring", stiffness: 300, damping: 15 }}
            whileTap={{ scale: 0.95 }}
            className="w-full rounded-2xl bg-neon-yellow py-5 font-display text-2xl text-black shadow-[0_0_30px_rgba(250,204,21,.55)]"
          >
            ⚔️ ENTER THE ARENA
          </motion.button>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: enterButtonDelay }}
            className="text-xs text-neutral-400"
          >
            {arena.fighters.length} fighters found
          </motion.p>
        </div>
      )}

      {isError && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-auto mb-6 flex flex-col gap-3 rounded-2xl border-2 border-red-500 bg-panel p-4 text-center"
        >
          <p className="text-sm text-neutral-200">{error ?? "The scanner blinked. Try another photo, with good light and a few clear objects."}</p>
          <button
            type="button"
            onClick={onRetry}
            className="w-full rounded-xl bg-neon-pink py-3 font-display text-sm text-black"
          >
            🔄 Try another photo
          </button>
          <button
            type="button"
            onClick={onUseDemo}
            className="w-full rounded-xl border-2 border-neon-cyan py-3 font-display text-sm text-neon-cyan"
          >
            🎮 Use demo arena
          </button>
        </motion.div>
      )}
    </div>
  );
}
