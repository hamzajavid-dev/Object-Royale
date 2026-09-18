"use client";
import { useEffect, useState } from "react";
import { setSfxEnabled, isSfxEnabled } from "@/lib/sfx";
import { setVoiceEnabled, isVoiceEnabled } from "@/lib/speak";

export default function SoundToggles() {
  // Read the real persisted values after mount to avoid a hydration mismatch
  // (they come from localStorage, which isn't available during SSR).
  const [sfxOn, setSfxOn] = useState(true);
  const [voiceOn, setVoiceOn] = useState(true);

  useEffect(() => {
    // Reads the real persisted values after mount (localStorage isn't
    // available during SSR), intentionally overriding the render-time guess.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSfxOn(isSfxEnabled());
    setVoiceOn(isVoiceEnabled());
  }, []);

  function toggleSfx() {
    const next = !sfxOn;
    setSfxEnabled(next);
    setSfxOn(next);
  }

  function toggleVoice() {
    const next = !voiceOn;
    setVoiceEnabled(next);
    setVoiceOn(next);
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={toggleSfx}
        aria-label={sfxOn ? "Mute sound effects" : "Unmute sound effects"}
        className="press flex h-8 w-8 items-center justify-center border-[3px] border-ink bg-card text-sm shadow-hard-sm"
      >
        {sfxOn ? "🔊" : "🔇"}
      </button>
      <button
        type="button"
        onClick={toggleVoice}
        aria-label={voiceOn ? "Mute commentator voice" : "Unmute commentator voice"}
        className="press flex h-8 w-8 items-center justify-center border-[3px] border-ink bg-card text-sm shadow-hard-sm"
      >
        {voiceOn ? "🗣️" : "🤐"}
      </button>
    </div>
  );
}
