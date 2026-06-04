// Synthesised typing sound effects via the Web Audio API — no asset files.
// A soft key click, a bright two-note chime on word completion, and a low buzz
// on a wrong key. Settings persist in localStorage so they survive reloads.

type SoundSettings = { enabled: boolean; volume: number };

const KEY = "typing-sound";

function load(): SoundSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return { enabled: p.enabled !== false, volume: typeof p.volume === "number" ? p.volume : 0.5 };
    }
  } catch {}
  return { enabled: true, volume: 0.5 };
}

let settings = load();

export function getSoundSettings(): SoundSettings {
  return { ...settings };
}

export function setSoundSettings(next: Partial<SoundSettings>) {
  settings = { ...settings, ...next };
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch {}
}

let ctx: AudioContext | null = null;
function audioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0) {
  const ac = audioCtx();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  const peak = Math.max(0.0001, gain * settings.volume);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  key() {
    if (!settings.enabled) return;
    tone(420 + Math.random() * 60, 0.045, "triangle", 0.18);
  },
  correct() {
    if (!settings.enabled) return;
    tone(660, 0.09, "sine", 0.22);
    tone(880, 0.12, "sine", 0.2, 0.07);
  },
  wrong() {
    if (!settings.enabled) return;
    tone(150, 0.13, "sawtooth", 0.16);
  },
  finish() {
    if (!settings.enabled) return;
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, "sine", 0.2, i * 0.09));
  },
};

// Some browsers need the AudioContext kicked off inside a user gesture.
export function primeAudio() {
  audioCtx();
}
