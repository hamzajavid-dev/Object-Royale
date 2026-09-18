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
      aria-label={`AI commentary ${enabled ? "on" : "off"}`}
      className={`press flex min-h-11 items-center justify-center gap-2 rotate-1 border-2 border-ink px-3 py-2 font-mono text-[11px] uppercase tracking-widest shadow-hard-sm ${
        enabled ? "bg-gold text-ink" : "bg-card text-ink-soft"
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-2 w-2 border border-ink ${enabled ? "bg-fight" : "bg-ink-faint"}`}
      />
      AI Commentary: {enabled ? "ON" : "OFF"}
    </button>
  );
}
