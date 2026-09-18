// Browser text-to-speech wrapper around window.speechSynthesis. Every export
// is a safe no-op on the server or in browsers without speech synthesis
// support.

const VOICE_STORAGE_KEY = "or-voice";
const PREFERRED_VOICE_NAMES = ["Google UK English Male", "Daniel", "Google US English", "Samantha"];

function synthAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

let cachedVoice: SpeechSynthesisVoice | null = null;
let voiceListenerAttached = false;
let voiceEnabled = true;

function readStoredVoiceEnabled(): boolean {
  try {
    const raw = window.localStorage.getItem(VOICE_STORAGE_KEY);
    if (raw === null) return true;
    return raw === "1" || raw === "true";
  } catch {
    return true;
  }
}

function writeStoredVoiceEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(VOICE_STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // ignore storage failures (private mode, quota, etc.)
  }
}

if (synthAvailable()) {
  voiceEnabled = readStoredVoiceEnabled();
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (!synthAvailable()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  for (const name of PREFERRED_VOICE_NAMES) {
    const match = voices.find((v) => v.name.includes(name));
    if (match) return match;
  }

  const english = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith("en"));
  return english ?? voices[0] ?? null;
}

function ensureVoiceListener(): void {
  if (!synthAvailable() || voiceListenerAttached) return;
  voiceListenerAttached = true;
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    cachedVoice = pickVoice();
  });
  cachedVoice = pickVoice();
}

export function unlockSpeech(): void {
  if (!synthAvailable()) return;
  ensureVoiceListener();
  try {
    const utterance = new SpeechSynthesisUtterance("");
    utterance.volume = 0;
    window.speechSynthesis.speak(utterance);
  } catch {
    // ignore — best-effort unlock only
  }
}

export function speak(text: string, opts?: { rate?: number; pitch?: number; interrupt?: boolean }): void {
  if (!synthAvailable() || !voiceEnabled) return;
  const trimmed = (text ?? "").trim();
  if (trimmed.length === 0) return;

  ensureVoiceListener();

  const interrupt = opts?.interrupt ?? true;
  if (interrupt) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }

  try {
    const utterance = new SpeechSynthesisUtterance(trimmed);
    utterance.rate = opts?.rate ?? 1.1;
    utterance.pitch = opts?.pitch ?? 0.9;
    const voice = cachedVoice ?? pickVoice();
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  } catch {
    // ignore — speech is best-effort
  }
}

export function stopSpeech(): void {
  if (!synthAvailable()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // ignore
  }
}

export function setVoiceEnabled(enabled: boolean): void {
  voiceEnabled = enabled;
  if (synthAvailable()) {
    writeStoredVoiceEnabled(enabled);
    if (!enabled) stopSpeech();
  }
}

export function isVoiceEnabled(): boolean {
  return voiceEnabled;
}
