// Browser-side helper for calling the /api/narrate route. Never throws:
// every failure path resolves to the local fallback line so narration can
// never break the game.

import { fallbackLine, type NarrateInput } from "./narrate";

const CLIENT_TIMEOUT_MS = 4500;
const AI_NARRATION_STORAGE_KEY = "or-ai-narration";

// Off by default (during development and unless a viewer explicitly opted
// in) so the game never makes a paid narration call by accident. Only "1"
// in localStorage turns it on; a missing/other value stays OFF.
function readStoredAiNarrationEnabled(): boolean {
  try {
    return window.localStorage.getItem(AI_NARRATION_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeStoredAiNarrationEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(AI_NARRATION_STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // ignore storage failures (private mode, quota, etc.)
  }
}

let aiNarrationEnabled = false;
if (typeof window !== "undefined") {
  aiNarrationEnabled = readStoredAiNarrationEnabled();
}

/**
 * "Save credits" switch for rehearsals/demos. When disabled, getNarration
 * resolves immediately to the fallback line with no network call.
 */
export function setAiNarration(enabled: boolean): void {
  aiNarrationEnabled = enabled;
  if (typeof window !== "undefined") {
    writeStoredAiNarrationEnabled(enabled);
  }
}

/** Current in-memory value of the AI commentary switch (see setAiNarration). */
export function isAiNarrationEnabled(): boolean {
  return aiNarrationEnabled;
}

export async function getNarration(input: NarrateInput): Promise<string> {
  if (!aiNarrationEnabled) {
    return fallbackLine(input);
  }

  if (typeof fetch !== "function") {
    return fallbackLine(input);
  }

  const controller = typeof AbortController !== "undefined" ? new AbortController() : undefined;
  const timeoutId = controller ? setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS) : undefined;

  try {
    const res = await fetch("/api/narrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: controller?.signal,
    });

    if (!res.ok) {
      return fallbackLine(input);
    }

    const data: unknown = await res.json();
    const line = (data as { line?: unknown })?.line;

    if (typeof line !== "string" || line.trim().length === 0) {
      return fallbackLine(input);
    }

    return line;
  } catch {
    return fallbackLine(input);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}
