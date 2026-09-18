"use client";
import { useEffect, useState } from "react";
import { setAiNarration, isAiNarrationEnabled } from "@/lib/narrateClient";

/** Tiny credit-saver switch shown on the title screen. Off by default. */
export default function AiCommentaryToggle() {
  // Read the real persisted value after mount to avoid a hydration mismatch
  // (it comes from localStorage, which isn't available during SSR).
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Reads the real persisted value after mount, intentionally overriding
    // the render-time guess.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(isAiNarrationEnabled());
  }, []);

  function toggle() {
    const next = !enabled;
    setAiNarration(next);
    setEnabled(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      className={`rounded-full border-2 border-panel-edge bg-panel px-3 py-1 text-xs ${
        enabled ? "text-neon-cyan" : "text-neutral-400"
      }`}
    >
      AI commentary: {enabled ? "ON" : "OFF"}
    </button>
  );
}
