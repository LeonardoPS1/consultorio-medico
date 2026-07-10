const STORAGE_KEY = 'aicoremed:sound-enabled';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx || audioCtx.state === 'closed') {
    try {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) return true;
  return stored !== 'false';
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, String(enabled));
}

function tone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.08,
  ramp?: { freqEnd?: number; volEnd?: number },
): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  if (ramp?.freqEnd) osc.frequency.linearRampToValueAtTime(ramp.freqEnd, ctx.currentTime + duration);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  if (ramp?.volEnd !== undefined) gain.gain.linearRampToValueAtTime(ramp.volEnd, ctx.currentTime + duration);
  else gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

export function playClick(): void {
  tone(800, 0.025, 'sine', 0.06);
}

export function playToggle(checked: boolean): void {
  tone(checked ? 600 : 500, 0.02, 'sine', 0.05);
}

export function playSuccess(): void {
  const ctx = getAudioContext();
  if (!ctx || !isSoundEnabled()) return;
  const now = ctx.currentTime;
  [
    { freq: 523, start: 0, dur: 0.08 },   // C5
    { freq: 659, start: 0.08, dur: 0.1 }, // E5
  ].forEach(({ freq, start, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + start);
    gain.gain.setValueAtTime(0.07, now + start);
    gain.gain.linearRampToValueAtTime(0, now + start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + start);
    osc.stop(now + start + dur);
  });
}

export function playError(): void {
  const ctx = getAudioContext();
  if (!ctx || !isSoundEnabled()) return;
  const now = ctx.currentTime;
  [
    { freq: 330, start: 0, dur: 0.1 },   // E4
    { freq: 262, start: 0.1, dur: 0.12 }, // C4
  ].forEach(({ freq, start, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + start);
    gain.gain.setValueAtTime(0.06, now + start);
    gain.gain.linearRampToValueAtTime(0, now + start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + start);
    osc.stop(now + start + dur);
  });
}

export function playModalOpen(): void {
  tone(400, 0.06, 'sine', 0.06, { freqEnd: 600 });
}

export function playModalClose(): void {
  tone(600, 0.05, 'sine', 0.05, { freqEnd: 350 });
}

export function playNavigate(): void {
  tone(550, 0.03, 'sine', 0.04, { freqEnd: 700, volEnd: 0.02 });
}

export function playNotification(): void {
  tone(1200, 0.08, 'sine', 0.07);
}