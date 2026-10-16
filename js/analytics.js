// Huff n Puff — anonymous usage counts (GoatCounter: no cookies, no personal data).
// What's counted: which screens are opened (with any ids stripped out), where a first visit came
// from, and a handful of moments (a workout finished, a share, an install). Never names, workouts'
// contents, sets, body data or anything typed. Off when the user switches it off in You, when the
// browser asks not to be tracked, and until a GoatCounter code is set at deploy time.
import { settings } from './store.js';

// filled in at deploy (repository variable GOATCOUNTER_CODE); empty = counting is off
const CODE = 'huffnpuff';
const ENDPOINT = /^[a-z0-9-]+$/.test(CODE) ? `https://${CODE}.goatcounter.com/count` : '';

export const analyticsAvailable = () => !!ENDPOINT;
function allowed() {
  if (!ENDPOINT || settings().analytics === false) return false;
  if (navigator.globalPrivacyControl || navigator.doNotTrack === '1') return false;
  return location.hostname !== 'localhost' && location.hostname !== '127.0.0.1';
}

// a route without anything that could identify a person's data: /workout/<own id> → /workout/:id
const BUILTIN = /^(?:[a-z0-9]+-)*[a-z0-9]+$/;
function cleanPath(path, builtinIds) {
  return path
    .replace(/^\/(done|session|w)\/[^/]+/, '/$1/:id')
    .replace(/^\/(workout|play|build)\/([^/]+)/, (m, a, id) => `/${a}/${builtinIds.has(decodeURIComponent(id)) || id.startsWith('ex%3A') || id.startsWith('ex:') ? decodeURIComponent(id) : ':custom'}`)
    .replace(/[?#].*$/, '');
}

let sentReferrer = false;
function send(params) {
  if (!allowed()) return;
  const q = new URLSearchParams({ ...params, s: `${screen.width},${screen.height},${devicePixelRatio || 1}`, rnd: Math.random().toString(36).slice(2, 8) });
  if (!sentReferrer && document.referrer && !document.referrer.startsWith(location.origin)) { q.set('r', document.referrer); sentReferrer = true; }
  try { (navigator.sendBeacon?.(`${ENDPOINT}?${q}`)) || fetch(`${ENDPOINT}?${q}`, { mode: 'no-cors', keepalive: true }).catch(() => {}); } catch { /* ignore */ }
}

let lastPath = null;
export function trackView(path, builtinIds) {
  const p = cleanPath(path, builtinIds);
  if (p === lastPath) return;
  lastPath = p;
  send({ p, t: document.title.replace(/ · Huff n Puff$/, '') });
}
// moments: 'workout-finished', 'share-card', 'share-workout', 'install', 'feedback'
export function trackEvent(name) { send({ p: name, e: 'true' }); }
