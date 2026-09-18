"use client";

// Client hook that drives the whole "scan a photo into an arena" flow:
// resize -> POST /api/scan -> crop portraits -> done. Race-safe against
// overlapping start()/reset() calls, and always resolves to a terminal
// status (never leaves the caller stuck mid-flight).

import { useCallback, useRef, useState } from "react";
import type { Arena } from "./types";
import { resizeImage, attachPortraits } from "./image";

export type ScanStatus = "idle" | "preparing" | "scanning" | "cropping" | "done" | "error";

const SCAN_TIMEOUT_MS = 35_000;
const CREDITS_ERROR_MESSAGE = "The AI ran out of fuel (credits). Try the demo arena!";
const GENERIC_ERROR_MESSAGE = "The scanner blinked. Try another photo, with good light and a few clear objects.";

type ScanApiError = { error?: string; detail?: string };

export function useArenaScan(): {
  status: ScanStatus;
  photoDataUrl: string | null;
  arena: Arena | null;
  error: string | null;
  start: (file: File) => Promise<void>;
  reset: () => void;
} {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [arena, setArena] = useState<Arena | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Bumped on every start()/reset() so in-flight async work can detect it
  // has been superseded and quietly bail out instead of clobbering state.
  const requestIdRef = useRef(0);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    setStatus("idle");
    setPhotoDataUrl(null);
    setArena(null);
    setError(null);
  }, []);

  const start = useCallback(async (file: File) => {
    const requestId = ++requestIdRef.current;
    const isStale = () => requestIdRef.current !== requestId;

    setStatus("preparing");
    setArena(null);
    setError(null);

    let resized: Awaited<ReturnType<typeof resizeImage>>;
    try {
      resized = await resizeImage(file);
    } catch {
      if (isStale()) return;
      setPhotoDataUrl(null);
      setError(GENERIC_ERROR_MESSAGE);
      setStatus("error");
      return;
    }

    if (isStale()) return;
    setPhotoDataUrl(resized.dataUrl);
    setStatus("scanning");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);

    let rawArena: Arena;
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: resized.base64 }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let detail = "";
        try {
          const body = (await res.json()) as ScanApiError;
          detail = body.detail ?? body.error ?? "";
        } catch {
          // ignore unparsable error bodies
        }
        const message = detail.toLowerCase().includes("credits") ? CREDITS_ERROR_MESSAGE : GENERIC_ERROR_MESSAGE;
        throw new Error(message);
      }

      rawArena = (await res.json()) as Arena;
    } catch (err) {
      if (isStale()) return;
      const message = err instanceof Error && (err.message === CREDITS_ERROR_MESSAGE || err.message === GENERIC_ERROR_MESSAGE)
        ? err.message
        : GENERIC_ERROR_MESSAGE;
      setError(message);
      setStatus("error");
      return;
    } finally {
      clearTimeout(timeoutId);
    }

    if (isStale()) return;
    setStatus("cropping");

    let croppedArena: Arena;
    try {
      croppedArena = await attachPortraits(rawArena, resized.dataUrl);
    } catch {
      // attachPortraits never throws by design, but guard anyway so a
      // portrait-cropping bug can't strand the UI mid-flight.
      croppedArena = rawArena;
    }

    if (isStale()) return;
    setArena(croppedArena);
    setStatus("done");
  }, []);

  return { status, photoDataUrl, arena, error, start, reset };
}
