// SuperSweatClub — cues: beeps (WebAudio), voice (SpeechSynthesis), haptics, wake lock.
import { settings } from './store.js';

let ctx = null;
function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Call from a user gesture so mobile browsers allow audio later.
export function unlock() {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  g.gain.value = 0;
  o.connect(g).connect(c.destination);
  o.start(); o.stop(c.currentTime + 0.01);
  if ('speechSynthesis' in window) speechSynthesis.getVoices();
}

function tone(freq, dur = 0.12, type = 'sine', vol = 0.25, when = 0) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const beep = {
  tick() { if (settings().sound) tone(880, 0.09, 'sine', 0.22); },
  go() { if (settings().sound) { tone(660, 0.1, 'triangle', 0.25); tone(990, 0.22, 'triangle', 0.28, 0.1); } },
  rest() { if (settings().sound) { tone(740, 0.12, 'sine', 0.2); tone(494, 0.24, 'sine', 0.2, 0.12); } },
  done() {
    if (!settings().sound) return;
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.25, i * 0.12));
  },
  pop() { if (settings().sound) tone(1200, 0.06, 'sine', 0.12); },
};

let voice = null;
function pickVoice() {
  if (voice || !('speechSynthesis' in window)) return voice;
  const vs = speechSynthesis.getVoices();
  voice = vs.find((v) => /en[-_](US|GB)/i.test(v.lang) && /female|samantha|google/i.test(v.name)) || vs.find((v) => /^en/i.test(v.lang)) || null;
  return voice;
}

export function say(text, { interrupt = true } = {}) {
  if (!settings().voice || !('speechSynthesis' in window)) return;
  try {
    if (interrupt) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = 1.05;
    u.pitch = 1.05;
    speechSynthesis.speak(u);
  } catch { /* ignore */ }
}

export function buzz(pattern = 30) {
  if (settings().haptics && navigator.vibrate) navigator.vibrate(pattern);
}

let lock = null;
export async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator) {
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener?.('release', () => { lock = null; });
    } else if (!on && lock) {
      await lock.release();
      lock = null;
    }
  } catch { /* ignore */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && keepAwake.wanted) keepAwake(true);
});
