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
      className="absolute left-0 right-0 z-20 h-[4px] bg-fight"
      initial={{ top: "0%" }}
      animate={{ top: "100%" }}
      transition={{ duration: 1.8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
      style={{ transform: "translateY(-100%)" }}
    />
  );
}

function ViewfinderCorners() {
  return (
    <>
      <div className="pointer-events-none absolute top-2 left-2 z-20 h-6 w-6 border-t-[3px] border-l-[3px] border-ink" />
      <div className="pointer-events-none absolute top-2 right-2 z-20 h-6 w-6 border-t-[3px] border-r-[3px] border-ink" />
      <div className="pointer-events-none absolute bottom-2 left-2 z-20 h-6 w-6 border-b-[3px] border-l-[3px] border-ink" />
      <div className="pointer-events-none absolute bottom-2 right-2 z-20 h-6 w-6 border-b-[3px] border-r-[3px] border-ink" />
    </>
  );
}

function GridOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10"
      style={{
        backgroundImage:
          "linear-gradient(rgba(20,18,16,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(20,18,16,0.15) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    />
  );
}

function TapeStrip({ className }: { className: string }) {
  return <div className={`pointer-events-none absolute z-30 h-4 w-14 border border-ink/40 bg-gold/70 ${className}`} />;
}

function CornerTicks({ colorClass }: { colorClass: string }) {
  return (
    <>
      <span className={`pointer-events-none absolute -top-1 -left-1 h-3 w-3 border-t-2 border-l-2 ${colorClass}`} />
      <span className={`pointer-events-none absolute -top-1 -right-1 h-3 w-3 border-t-2 border-r-2 ${colorClass}`} />
      <span className={`pointer-events-none absolute -bottom-1 -left-1 h-3 w-3 border-b-2 border-l-2 ${colorClass}`} />
      <span className={`pointer-events-none absolute -bottom-1 -right-1 h-3 w-3 border-b-2 border-r-2 ${colorClass}`} />
    </>
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
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-10 w-10 border-[3px] border-ink border-t-fight"
        />
        <p className="headline text-xl text-ink">
          Scanning Arena<AnimatedEllipsis />
        </p>
      </div>
    );
  }

  const enterButtonDelay = fightersWithBox.length * BOX_STAGGER_SECONDS + 0.3;

  return (
    <div className="flex min-h-dvh flex-col gap-4 pt-4">
      <header className="text-center">
        {isDone ? (
          <h1 className="headline truncate text-2xl text-ink">{arena.arenaName}</h1>
        ) : isError ? (
          <h1 className="-rotate-2 inline-block border-[3px] border-fight bg-card px-2 py-0.5 font-mono text-lg uppercase tracking-widest text-fight">
            Scan Failed
          </h1>
        ) : (
          <h1 className="headline text-2xl text-ink">
            Scanning Arena<AnimatedEllipsis />
          </h1>
        )}
      </header>

      <div className="relative mx-auto w-full max-w-md -rotate-1 border-[3px] border-ink bg-card p-2 shadow-hard">
        <TapeStrip className="-top-2 left-6 -rotate-6" />
        <TapeStrip className="-top-2 right-6 rotate-6" />

        <div className="relative w-full overflow-hidden border-2 border-ink">
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL from the local camera/file capture, not a static asset */}
          <img src={photoDataUrl} alt="Scanned arena" className="block h-auto w-full" />

          {(isWorking || isError) && <div className="pointer-events-none absolute inset-0 z-10 bg-ink/25" />}

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
                  className="absolute z-20 border-2 border-ink"
                  style={{
                    top: `${ymin / 10}%`,
                    left: `${xmin / 10}%`,
                    width: `${(xmax - xmin) / 10}%`,
                    height: `${(ymax - ymin) / 10}%`,
                  }}
                  initial={{ opacity: 0, scale: 1.3 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * BOX_STAGGER_SECONDS, type: "spring", stiffness: 400, damping: 20 }}
                >
                  <CornerTicks colorClass={typeStyle.border} />
                  <span
                    className={`absolute -top-3 left-0 whitespace-nowrap border-2 border-ink px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${typeStyle.bg} ${typeStyle.onBg}`}
                  >
                    {fighter.emoji} {fighter.fighterName}
                  </span>
                </motion.div>
              );
            })}
        </div>
      </div>

      {isWorking && (
        <p className="text-center font-mono text-xs uppercase tracking-widest text-ink-soft">
          {SCAN_CAPTIONS[captionIndex]}
        </p>
      )}

      {isDone && (
        <div className="mt-auto flex flex-col items-center gap-2 pb-6">
          <motion.button
            type="button"
            onClick={onContinue}
            initial={{ opacity: 0, y: 40, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: enterButtonDelay, type: "spring", stiffness: 500, damping: 22 }}
            className="press min-h-14 w-full max-w-md border-[3px] border-ink bg-fight font-mono text-lg font-bold uppercase tracking-wide text-card shadow-hard"
          >
            ⚔️ Enter The Arena
          </motion.button>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: enterButtonDelay }}
            className="font-mono text-xs text-ink-faint"
          >
            {arena.fighters.length} fighters found
          </motion.p>
        </div>
      )}

      {isError && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mx-auto mt-auto mb-6 flex w-full max-w-md flex-col gap-3 border-[3px] border-ink bg-card p-4 text-center shadow-hard"
        >
          <span className="absolute -top-4 right-4 rotate-6 border-2 border-fight bg-card px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-fight">
            Rejected
          </span>
          <p className="text-sm text-ink">{error ?? "The scanner blinked. Try another photo, with good light and a few clear objects."}</p>
          <button
            type="button"
            onClick={onRetry}
            className="press min-h-12 w-full border-[3px] border-ink bg-fight font-mono text-sm font-bold uppercase tracking-widest text-card shadow-hard-sm"
          >
            🔄 Try Another Photo
          </button>
          <button
            type="button"
            onClick={onUseDemo}
            className="press min-h-12 w-full border-[3px] border-ink bg-card font-mono text-sm uppercase tracking-widest text-ink shadow-hard-sm"
          >
            🎮 Use Demo Arena
          </button>
        </motion.div>
      )}
    </div>
  );
}
