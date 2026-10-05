// Huff n Puff — cues: beeps (WebAudio), voice (SpeechSynthesis), haptics, wake lock.
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

/* ---------- voice coach ----------
   Natural voice: clips pre-recorded at deploy time with a neural voice (see tools/build-audio.py),
   listed per voice in audio/voice/<voice>/manifest.json and strung together part by part. If a part has no clip,
   the manifest can't load, or the user picks it, the device's own speech synthesis speaks instead. */
let manifest = null;
let manifestJob = null;
let voiceList = null;
const base = () => `audio/voice/${manifest?.voice || ''}/`;
// the natural voices recorded at deploy time (first = default) and the one in use
export function naturalVoices() {
  voiceList ??= fetch('audio/voice/voices.json').then((r) => (r.ok ? r.json() : [])).catch(() => []);
  return voiceList;
}
function loadManifest() {
  const want = settings().naturalVoice || '';
  if (manifestJob && manifestJob.voice === want) return manifestJob;
  manifest = null;
  manifestJob = naturalVoices()
    .then((list) => list.find((v) => v.id === want) || list[0])
    .then((v) => (v ? fetch(`audio/voice/${v.id}/manifest.json`).then((r) => (r.ok ? r.json() : null)) : null))
    .then((m) => (manifest = m))
    .catch(() => null);
  manifestJob.voice = want;
  return manifestJob;
}
loadManifest();
export const reloadVoice = () => loadManifest();
export const naturalVoiceReady = () => loadManifest().then(() => !!manifest && Object.keys(manifest.clips || {}).length > 0);
const clipFor = (part) => manifest?.clips?.[part];

// roughly how long the coach takes to say these parts (to time announcements)
export function speechSeconds(parts) {
  const list = (Array.isArray(parts) ? parts : [parts]).filter(Boolean);
  const rate = settings().voiceRate || 1;
  if (settings().voiceEngine !== 'device' && manifest && list.every(clipFor)) {
    return list.reduce((a, p) => a + (manifest.dur?.[p] ?? p.length * 0.065) + 0.05, 0) / rate;
  }
  return list.join(' ').length * 0.07 / rate + 0.3;
}

let playing = [];
let token = 0;
function stopClips() {
  token++;
  for (const a of playing) { try { a.pause(); } catch { /* ignore */ } }
  playing = [];
}
async function playClips(files) {
  const my = ++token;
  for (const f of files) {
    if (my !== token) return;
    const a = new Audio(base() + f);
    a.preservesPitch = true;
    a.playbackRate = settings().voiceRate || 1;
    playing = [a];
    try {
      await a.play();
      await new Promise((res) => { a.onended = res; a.onerror = res; a.onpause = res; });
    } catch { return; }
  }
}
// warm the cache for a workout's lines so the coach works offline mid-session
export function prefetchVoice(parts) {
  loadManifest().then(() => {
    if (!manifest) return;
    for (const f of new Set(parts.map(clipFor).filter(Boolean))) fetch(base() + f).catch(() => {});
  });
}

export function deviceVoices() {
  if (!('speechSynthesis' in window)) return [];
  return speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
}
function pickVoice() {
  const vs = deviceVoices();
  const want = settings().deviceVoice;
  return (want && vs.find((v) => v.name === want)) || vs.find((v) => /en[-_](US|GB)/i.test(v.lang) && /natural|neural|google|samantha|female/i.test(v.name)) || vs[0] || null;
}
function deviceSay(text) {
  if (!('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = 1.05 * (settings().voiceRate || 1);
    u.pitch = 1.05;
    speechSynthesis.speak(u);
  } catch { /* ignore */ }
}

// parts: a string or a list of clip-sized parts (see js/voice-lines.js)
export function say(parts, { interrupt = true } = {}) {
  if (!settings().voice) return;
  const list = (Array.isArray(parts) ? parts : [parts]).filter(Boolean);
  if (!list.length) return;
  if (interrupt) { stopClips(); try { speechSynthesis?.cancel(); } catch { /* ignore */ } }
  loadManifest();
  const files = settings().voiceEngine !== 'device' && manifest ? list.map(clipFor) : null;
  if (files && files.every(Boolean)) playClips(files);
  else deviceSay(list.join(' '));
}
export function hush() {
  stopClips();
  try { speechSynthesis?.cancel(); } catch { /* ignore */ }
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
