"use client";
import type { ChangeEvent } from "react";
import { motion } from "motion/react";
import AiCommentaryToggle from "@/components/AiCommentaryToggle";

type CaptureScreenProps = {
  onPhoto: (file: File) => void;
  onDemo: () => void;
};

const MARQUEE_TEXT =
  "YOUR MUG VS YOUR LAPTOP ✦ NO REFUNDS ✦ OBJECTS ONLY, NO HUMANS ✦ WINNER TAKES THE SHELF ✦ ";

export default function CaptureScreen({ onPhoto, onDemo }: CaptureScreenProps) {
  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      onPhoto(file);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* marquee ticker strip */}
      <div className="no-select -mx-4 overflow-hidden border-y-[3px] border-ink bg-ink py-1.5 sm:-mx-6 lg:-mx-10">
        <div className="marquee flex w-max whitespace-nowrap">
          {[0, 1].map((i) => (
            <span key={i} className="pr-8 font-mono text-[11px] uppercase tracking-widest text-card">
              {MARQUEE_TEXT}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 py-10 text-center md:grid md:grid-cols-2 md:items-center md:gap-12 md:text-left">
        {/* left: hero headline */}
        <div className="relative flex flex-col items-center md:items-start">
          <span className="absolute -top-7 right-0 z-10 rotate-6 border-2 border-ink bg-gold px-2 py-0.5 font-mono text-[11px] uppercase tracking-widest text-ink shadow-hard-sm md:right-auto md:left-2 md:-top-8">
            Tonight Only
          </span>

          <motion.div
            initial={{ scale: 1.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
            className="headline misprint -rotate-2 text-6xl text-ink sm:text-7xl md:text-8xl"
          >
            OBJECT
          </motion.div>
          <motion.div
            initial={{ scale: 1.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 22, delay: 0.08 }}
            className="headline -rotate-2 text-6xl text-fight sm:text-7xl md:text-8xl"
          >
            ROYALE
          </motion.div>

          <span className="mt-5 -rotate-1 border-2 border-ink bg-card px-2 py-0.5 font-mono text-[11px] uppercase tracking-widest text-ink shadow-hard-sm">
            All Objects Welcome
          </span>

          <p className="mt-6 max-w-xs font-body text-sm text-ink-soft md:max-w-sm md:text-base">
            Photograph your surroundings. AI turns everyday objects into fighters. You make them battle.
          </p>
        </div>

        {/* right: capture card */}
        <div className="ink-card mx-auto flex w-full max-w-sm flex-col items-center gap-4 p-6 md:mx-0">
          <motion.label
            whileTap={{ scale: 0.97 }}
            className="press flex w-full min-h-14 cursor-pointer items-center justify-center gap-2 border-[3px] border-ink bg-fight font-mono text-lg font-bold uppercase tracking-wide text-card shadow-hard"
          >
            📸 Scan Your Arena
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
          </motion.label>

          <button
            type="button"
            onClick={onDemo}
            className="press w-full min-h-11 border-[3px] border-ink bg-card py-3 font-mono text-sm uppercase tracking-widest text-ink shadow-hard-sm hover:-translate-y-0.5"
          >
            Try The Demo Card →
          </button>

          <AiCommentaryToggle />

          <p className="mt-1 text-center font-mono text-[11px] text-ink-faint">
            Objects only. No humans were harmed in the making of these fights.
          </p>
        </div>
      </div>
    </div>
  );
}
