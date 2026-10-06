// Huff n Puff — boot, theme, router, PWA plumbing.
import * as store from './store.js';
import { STATIC_FILTER } from './clay.js';
import { $, $$, toast, hydrateThumbs, icon } from './ui.js';
import { getWorkout, estimateMinutes } from './workouts.js';
import { calories } from './stats.js';

import * as home from './views/home.js';
import * as workouts from './views/workouts.js';
import * as library from './views/library.js';
import * as player from './views/player.js';
import * as summary from './views/summary.js';
import * as progress from './views/progress.js';
import * as session from './views/session.js';
import * as profile from './views/profile.js';
import * as builder from './views/builder.js';
import * as onboarding from './views/onboarding.js';
import * as cast from './views/cast.js';

export const VERSION = '1.0.0';

const routes = [
  [/^\/$/, home.view],
  [/^\/workouts$/, workouts.listView],
  [/^\/workout\/([^/]+)$/, workouts.detailView],
  [/^\/exercises$/, library.listView],
  [/^\/exercise\/([^/]+)$/, library.detailView],
  [/^\/play\/([^/]+)$/, player.view],
  [/^\/done\/([^/]+)$/, summary.view],
  [/^\/progress$/, progress.view],
  [/^\/session\/([^/]+)$/, session.view],
  [/^\/me$/, profile.view],
  [/^\/build(?:\/([^/]+))?$/, builder.view],
  [/^\/welcome$/, onboarding.view],
  [/^\/cast$/, cast.view],
];

let cleanup = null;
const scrollMem = {};
let currentPath = null;

function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  return { path: path || '/', query: Object.fromEntries(new URLSearchParams(qs || '')) };
}

export function go(path, { replace = false } = {}) {
  const url = '#' + path;
  if (replace) history.replaceState({ idx: Math.max(0, curIdx) }, '', url);
  else history.pushState({ idx: curIdx + 1 }, '', url);
  render();
}
let curIdx = -1;
let renderedHash = null;
export function back(fallback = '/') {
  if (curIdx > 0) history.back();
  else go(fallback, { replace: true });
}

async function render() {
  const st = history.state;
  if (st && st.idx != null) curIdx = st.idx;
  else { curIdx += 1; history.replaceState({ ...(st || {}), idx: curIdx }, ''); }
  renderedHash = location.hash;
  const { path, query } = parseHash();
  if (!store.get('profile') && path !== '/welcome') return go('/welcome', { replace: true });
  if (currentPath) scrollMem[currentPath] = window.scrollY;
  let view = null, params = [];
  for (const [re, v] of routes) {
    const m = path.match(re);
    if (m) { view = v; params = m.slice(1).map((x) => x && decodeURIComponent(x)); break; }
  }
  if (!view) return go('/', { replace: true });
  try { cleanup?.(); } catch (e) { console.error(e); }
  cleanup = null;
  // each route gets a fresh container so listeners never leak between views
  const app = document.createElement('div');
  app.className = 'route';
  app.innerHTML = await view.render(params, query);
  $('#app').replaceChildren(app);
  document.body.classList.toggle('immersive', !!view.immersive);
  $('#tabs').classList.toggle('hidden', !!view.immersive);
  $$('#tabs a').forEach((a) => a.classList.toggle('on', a.dataset.tab === view.tab));
  try { cleanup = (await view.mount?.(app, params, query)) || null; } catch (e) { console.error(e); }
  hydrateThumbs(app);
  const restore = scrollMem[path];
  window.scrollTo(0, view.keepScroll && restore ? restore : 0);
  currentPath = path;
  document.title = view.title ? `${typeof view.title === 'function' ? view.title(params) : view.title} · Huff n Puff` : 'Huff n Puff';
}
export const refresh = render;

/* ---------- theme ---------- */
const mq = matchMedia('(prefers-color-scheme: dark)');
export function applyTheme() {
  const t = store.settings().theme;
  const dark = t === 'dark' || (t === 'auto' && mq.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  try { localStorage.setItem('pulse:theme', JSON.stringify(t)); } catch { /* ignore */ }
  $$('meta[name=theme-color]').forEach((m) => m.setAttribute('content', dark ? '#1a1524' : '#fff5ea'));
}
mq.addEventListener?.('change', applyTheme);

/* ---------- install prompt ---------- */
export const install = { prompt: null, installed: matchMedia('(display-mode: standalone)').matches || navigator.standalone === true };
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  install.prompt = e;
  document.dispatchEvent(new CustomEvent('pulse:installable'));
});
window.addEventListener('appinstalled', () => {
  install.prompt = null;
  install.installed = true;
  toast('Huff n Puff installed — find it on your home screen', { icon: '📲' });
});
export async function promptInstall() {
  if (!install.prompt) return false;
  install.prompt.prompt();
  const r = await install.prompt.userChoice;
  install.prompt = null;
  return r.outcome === 'accepted';
}

/* ---------- service worker ---------- */
function registerSW() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw?.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          toast('A fresh version of Huff n Puff is ready', { icon: '✨', ms: 10000, action: { label: 'Reload', run: () => nw.postMessage('skipWaiting') } });
        }
      });
    });
  }).catch((e) => console.warn('SW registration failed', e));
  // only reload for an update the user accepted, not when a first-ever worker takes control
  let reloading = !navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) { reloading = false; return; }
    reloading = true;
    location.reload();
  });
}

/* ---------- one-off repair ---------- */
// Workouts saved before only on-screen time was counted could include hours the app sat suspended.
// Any that ran far past the workout's own length get a sensible duration, and their calories recounted.
async function repairDurations() {
  if (store.settings().durFixed) return;
  const list = store.get('sessions') || [];
  let changed = false;
  const fixed = list.map((s) => {
    const w = getWorkout(s.workoutId);
    const est = (w ? estimateMinutes(w) : 30) * 60;
    if (!s.duration || s.duration <= Math.max(est * 2, 20 * 60)) return s;
    // what was logged: timed sets and intervals by their time, reps at ~3.5 s each
    const per = (s.entries || []).map((e) => ({ ex: e.ex, activeSec: e.sets.reduce((n, x) => n + (x.time || Math.max(20, (x.reps || 0) * 3.5)), 0) }));
    const logged = per.reduce((n, e) => n + e.activeSec, 0);
    // finished: the workout's length; quit early: what was logged, plus rests
    const duration = Math.max(60, Math.round(Math.min(s.duration, s.early ? logged * 1.6 : Math.max(est, logged * 1.6))));
    changed = true;
    return { ...s, duration, calories: calories(per, duration) };
  });
  if (changed) await store.set('sessions', fixed);
  await store.setSetting('durFixed', true);
}

/* ---------- boot ---------- */
async function boot() {
  await store.init();
  await repairDurations().catch(() => {});
  applyTheme();
  document.body.insertAdjacentHTML('afterbegin', STATIC_FILTER);
  const onNav = () => { if (location.hash !== renderedHash) render(); };
  window.addEventListener('popstate', onNav);
  window.addEventListener('hashchange', onNav);
  store.onChange((k) => { if (k === 'settings') applyTheme(); });
  await render();
  registerSW();
  // offer to resume an interrupted workout
  const active = store.get('active');
  const { path } = parseHash();
  if (active && !path.startsWith('/play')) {
    const w = active.workout || getWorkout(active.workoutId);
    if (w && Date.now() - (active.updated || 0) < 12 * 3600e3) {
      toast(`Resume “${w.name}”?`, { icon: '⏯️', ms: 9000, action: { label: 'Resume', run: () => go('/play/' + encodeURIComponent(active.workoutId) + '?resume=1') } });
    } else store.set('active', null);
  }
}

boot();

// expose a tiny debug hook
window.pulse = { store, go, VERSION, icon };
