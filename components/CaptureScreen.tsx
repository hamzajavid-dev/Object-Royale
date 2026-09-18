"use client";
import type { ChangeEvent } from "react";
import { motion } from "motion/react";

type CaptureScreenProps = {
  onPhoto: (file: File) => void;
  onDemo: () => void;
};

export default function CaptureScreen({ onPhoto, onDemo }: CaptureScreenProps) {
  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      onPhoto(file);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-8 text-center">
      <div className="flex flex-col items-center font-display">
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0 }}
          className="text-6xl text-white"
        >
          OBJECT
        </motion.div>
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.15 }}
          className="neon-pink text-7xl -rotate-2"
        >
          ROYALE
        </motion.div>
      </div>

      <p className="text-lg text-neutral-300">
        Photograph your surroundings.
        <br />
        Make everything fight.
      </p>

      <motion.label
        className="w-full py-5 rounded-2xl font-display text-2xl bg-neon-pink text-black shadow-[0_0_30px_rgba(255,46,136,.6)] cursor-pointer flex items-center justify-center"
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        whileTap={{ scale: 0.95 }}
      >
        📸 SCAN YOUR ARENA
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
        className="text-neon-cyan underline-offset-4 hover:underline"
      >
        or try the demo arena →
      </button>

      <p className="text-xs text-neutral-500 mt-auto">
        Objects only. No humans were harmed in the making of these fights.
      </p>
    </div>
  );
}
