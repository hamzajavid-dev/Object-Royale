// Synthesized arcade sound effects using the Web Audio API. No audio files,
// no packages. Every export is a safe no-op on the server or in browsers
// without Web Audio support.

const SFX_STORAGE_KEY = "or-sfx";
const MASTER_GAIN = 0.25;

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as typeof window & { webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let sfxEnabled = true;

function readStoredSfxEnabled(): boolean {
  try {
    const raw = window.localStorage.getItem(SFX_STORAGE_KEY);
    if (raw === null) return true;
    return raw === "1" || raw === "true";
  } catch {
    return true;
  }
}

function writeStoredSfxEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(SFX_STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // ignore storage failures
  }
}

if (typeof window !== "undefined") {
  sfxEnabled = readStoredSfxEnabled();
}

function getCtx(): AudioContext | null {
  const Ctor = getAudioContextCtor();
  if (!Ctor) return null;
  if (!ctx) {
    try {
      ctx = new Ctor();
      masterGain = ctx.createGain();
      masterGain.gain.value = MASTER_GAIN;
      masterGain.connect(ctx.destination);
    } catch {
      ctx = null;
      masterGain = null;
    }
  }
  return ctx;
}

export function unlockAudio(): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") {
    c.resume().catch(() => {
      // ignore — best-effort unlock only
    });
  }
}

export function setSfxEnabled(enabled: boolean): void {
  sfxEnabled = enabled;
  if (typeof window !== "undefined") {
    writeStoredSfxEnabled(enabled);
  }
}

/** Creates an oscillator tone with a short attack/decay envelope. */
function tone(opts: {
  freq: number;
  endFreq?: number;
  type?: OscillatorType;
  start?: number;
  duration: number;
  peakGain?: number;
}): void {
  const c = getCtx();
  if (!c || !masterGain) return;

  const startAt = c.currentTime + (opts.start ?? 0);
  const duration = opts.duration;
  const peak = opts.peakGain ?? 0.9;

  const osc = c.createOscillator();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(opts.freq, startAt);
  if (opts.endFreq !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(opts.endFreq, 1), startAt + duration);
  }

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(peak, startAt + Math.min(0.02, duration / 4));
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  osc.connect(gain);
  gain.connect(masterGain);

  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

/** Creates a short burst of white noise with an envelope, for percussive hits. */
function noiseBurst(opts: { start?: number; duration: number; peakGain?: number; lowpass?: number }): void {
  const c = getCtx();
  if (!c || !masterGain) return;

  const startAt = c.currentTime + (opts.start ?? 0);
  const duration = opts.duration;
  const peak = opts.peakGain ?? 0.8;

  const bufferSize = Math.max(1, Math.floor(c.sampleRate * duration));
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = c.createBufferSource();
  source.buffer = buffer;

  const gain = c.createGain();
  gain.gain.setValueAtTime(peak, startAt);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  let lastNode: AudioNode = source;
  if (opts.lowpass) {
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = opts.lowpass;
    source.connect(filter);
    lastNode = filter;
  }

  lastNode.connect(gain);
  gain.connect(masterGain);

  source.start(startAt);
  source.stop(startAt + duration + 0.02);
}

function guarded(fn: () => void): void {
  if (!sfxEnabled) return;
  const c = getCtx();
  if (!c) return;
  try {
    fn();
  } catch {
    // ignore — sound effects are best-effort
  }
}

export const sfx = {
  /** Short bright blip for a UI tap / card select. */
  select(): void {
    guarded(() => {
      tone({ freq: 880, endFreq: 1200, type: "square", duration: 0.09, peakGain: 0.5 });
    });
  },

  /** Rising whoosh + gong-ish swell for "FIGHT!". */
  fight(): void {
    guarded(() => {
      tone({ freq: 160, endFreq: 640, type: "sawtooth", duration: 0.45, peakGain: 0.5 });
      tone({ freq: 220, endFreq: 55, type: "sine", start: 0.3, duration: 0.8, peakGain: 0.6 });
    });
  },

  /** Punchy thud: short noise burst + low sine drop. */
  hit(): void {
    guarded(() => {
      noiseBurst({ duration: 0.12, peakGain: 0.7, lowpass: 1800 });
      tone({ freq: 180, endFreq: 60, type: "sine", duration: 0.18, peakGain: 0.8 });
    });
  },

  /** Hit plus a higher metallic ring for a super-effective move. */
  superHit(): void {
    guarded(() => {
      noiseBurst({ duration: 0.12, peakGain: 0.7, lowpass: 2200 });
      tone({ freq: 200, endFreq: 60, type: "sine", duration: 0.18, peakGain: 0.8 });
      tone({ freq: 1400, endFreq: 900, type: "triangle", start: 0.06, duration: 0.35, peakGain: 0.4 });
    });
  },

  /** Sharp crack plus a quick high zap for a critical hit. */
  crit(): void {
    guarded(() => {
      noiseBurst({ duration: 0.06, peakGain: 0.9, lowpass: 4000 });
      tone({ freq: 2200, endFreq: 3200, type: "square", start: 0.02, duration: 0.12, peakGain: 0.35 });
    });
  },

  /** Big low boom with a long tail for a knockout. */
  ko(): void {
    guarded(() => {
      noiseBurst({ duration: 0.25, peakGain: 0.8, lowpass: 700 });
      tone({ freq: 110, endFreq: 30, type: "sine", duration: 1.1, peakGain: 0.9 });
    });
  },

  /** Four-note ascending arpeggio fanfare (square wave) for victory. */
  victory(): void {
    guarded(() => {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
      notes.forEach((freq, i) => {
        tone({ freq, type: "square", start: i * 0.14, duration: 0.32, peakGain: 0.35 });
      });
    });
  },
};
