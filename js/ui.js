// SillySweatClub — small UI toolkit: escaping, icons, toasts, sheets, dialogs, formatting.
import { clayStill, load3D } from './clay.js';
import { getEx } from './exercises.js';
import { characterFor, isMe } from './cast.js';
import * as store from './store.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, el = document) => el.querySelector(sel);
export const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

const IC = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 9.8V20h13V9.8"/><path d="M10 20v-5h4v5"/>',
  dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor"/>',
  pause: '<rect x="6" y="4.5" width="4" height="15" rx="1.5" fill="currentColor"/><rect x="14" y="4.5" width="4" height="15" rx="1.5" fill="currentColor"/>',
  next: '<path d="M5 5v14l10-7z" fill="currentColor"/><path d="M18 5v14"/>',
  prev: '<path d="M19 5v14L9 12z" fill="currentColor"/><path d="M6 5v14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  back: '<path d="M15 5 8 12l7 7"/>',
  chev: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m5 9 7 7 7-7"/>',
  up: '<path d="m5 15 7-7 7 7"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  fire: '<path d="M12 21c-4 0-6.5-2.7-6.5-6.2 0-3.6 3-5.6 3.8-9.3 2.5 1.6 3.5 3.8 3.4 6 1-1 1.7-2.4 1.7-4 2.4 1.9 4.1 4.6 4.1 7.4 0 3.5-2.5 6.1-6.5 6.1Z"/>',
  bolt: '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>',
  trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10.2C4.5 7 6.5 5 9 5c1.4 0 2.4.6 3 1.6.6-1 1.6-1.6 3-1.6 2.5 0 4.5 2 4.5 4.8C19.5 15.4 12 20 12 20Z"/>',
  heartFill: '<path d="M12 20s-7.5-4.6-7.5-10.2C4.5 7 6.5 5 9 5c1.4 0 2.4.6 3 1.6.6-1 1.6-1.6 3-1.6 2.5 0 4.5 2 4.5 4.8C19.5 15.4 12 20 12 20Z" fill="currentColor"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4 5.3 5.3"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 16V5M7 9.5l5-5 5 5M5 20h14"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.1"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
  volume: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  mute: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5c0 3 1.5 4.5 3.7 4.8M16 6h3.5c0 3-1.5 4.5-3.7 4.8M12 13v4M8.5 20h7M10 17h4v3h-4z"/>',
  scale: '<rect x="3.5" y="4" width="17" height="16" rx="4"/><path d="M8.5 9.5a5 5 0 0 1 7 0L13 12"/>',
  sparkle: '<path d="M12 3.5 13.8 10 20.5 12l-6.7 2-1.8 6.5-1.8-6.5L3.5 12l6.7-2z"/>',
  drag: '<path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01"/>',
  repeat: '<path d="M4 11V9a3 3 0 0 1 3-3h12l-3-3M20 13v2a3 3 0 0 1-3 3H5l3 3"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
};
export function icon(name, cls = '') {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[name] || ''}</svg>`;
}

/* ---------- formatting ---------- */
export const pad = (n) => String(n).padStart(2, '0');
export function mmss(sec) {
  sec = Math.max(0, Math.round(sec));
  return `${Math.floor(sec / 60)}:${pad(sec % 60)}`;
}
export function dur(sec) {
  sec = Math.round(sec);
  if (sec < 60) return `${sec}s`;
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
export function fmtDate(d, opts = { weekday: 'short', month: 'short', day: 'numeric' }) {
  return new Date(d).toLocaleDateString(undefined, opts);
}
export function fmtTime(d) {
  return new Date(d).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
export function relDay(d) {
  const a = new Date(d); a.setHours(0, 0, 0, 0);
  const b = new Date(); b.setHours(0, 0, 0, 0);
  const diff = Math.round((b - a) / 864e5);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return a.toLocaleDateString(undefined, { weekday: 'long' });
  return fmtDate(d);
}
export const num = (n) => Number(n || 0).toLocaleString();
export const units = () => store.settings().units;
export const fmtW = (w) => (w ? `${+(+w).toFixed(1)} ${units()}` : 'BW');

export function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Up late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/* ---------- clay thumbnails (lazy) ---------- */
let io = null;
export function look() {
  return store.settings().look || undefined;
}
export function thumb(exId, cls = '', { bare = false, portrait = false, char = null, tall = false } = {}) {
  return `<div class="clay-thumb ${cls}${tall ? ' tall' : ''}" data-ex="${exId}"${bare ? ' data-bare="1"' : ''}${portrait ? ' data-portrait="1"' : ''}${char ? ` data-char="${char}"` : ''}${tall ? ' data-tall="1"' : ''}></div>`;
}

// Thumbnails are rendered once in 3D, stored in Cache Storage (instant next launch)
// and shown as plain <img>s so lists scroll smoothly. A 2D SVG fills in while rendering.
const THUMB_VERSION = 'v7';
const thumbCache = new Map();
function svgURL(ex, bare) {
  const svg = clayStill(ex, look(), undefined, { standalone: true, bare });
  return URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
}
function hashStr(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
async function thumbURL(ex, { bare = false, portrait = false, char = null, tall = false } = {}) {
  const lk = look();
  const who = char || characterFor(ex).id;
  const key = `${THUMB_VERSION}/${ex.id}/${who}/${bare ? 'b' : portrait ? 'p' : tall ? 't' : 'n'}/${isMe(who) ? hashStr(JSON.stringify(lk || '')) : '0'}`;
  if (thumbCache.has(key)) return thumbCache.get(key);
  const job = (async () => {
    const m = await load3D();
    if (!m) return svgURL(ex, bare);
    const req = new Request(`${location.pathname.replace(/[^/]*$/, '')}__thumbs/${key}`);
    let cache = null;
    try { cache = await caches.open('pulse-thumbs'); } catch { /* no cache storage */ }
    const hit = cache && (await cache.match(req));
    if (hit) return URL.createObjectURL(await hit.blob());
    const blob = await m.renderStill(ex, lk, portrait ? { portrait: true, width: 320, height: 320, charId: who } : tall ? { width: 390, height: 640, charId: who } : { bare, charId: who });
    if (!blob) return svgURL(ex, bare);
    cache?.put(req, new Response(blob, { headers: { 'content-type': blob.type } })).catch(() => {});
    return URL.createObjectURL(blob);
  })().catch(() => svgURL(ex, bare));
  thumbCache.set(key, job);
  return job;
}
// Transparent stop-motion flipbook frames of a character doing a move (welcome screen)
export async function spriteFrames(exId, charId, n = 4, { width = 300, height = 330 } = {}) {
  const ex = getEx(exId);
  const m = await load3D();
  if (!m || !ex) return [svgURL(ex || getEx('wave'), true)];
  let cache = null;
  try { cache = await caches.open('pulse-thumbs'); } catch { /* no cache storage */ }
  const lk = look();
  const out = [];
  for (let i = 0; i < n; i++) {
    const key = `${THUMB_VERSION}/sprite2/${exId}/${charId}/${i}of${n}/${width}x${height}/${isMe(charId) ? hashStr(JSON.stringify(lk || '')) : '0'}`;
    const req = new Request(`${location.pathname.replace(/[^/]*$/, '')}__thumbs/${key}`);
    const hit = cache && (await cache.match(req));
    if (hit) { out.push(URL.createObjectURL(await hit.blob())); continue; }
    const blob = await m.renderStill(ex, lk, { bare: true, floor: false, width, height, charId, phase: i / n + 0.001, t: 1 + i * 0.37 });
    if (!blob) break;
    cache?.put(req, new Response(blob, { headers: { 'content-type': blob.type } })).catch(() => {});
    out.push(URL.createObjectURL(blob));
  }
  return out.length ? out : [svgURL(ex, true)];
}

export async function clearThumbs() {
  thumbCache.clear();
  try { await caches.delete('pulse-thumbs'); } catch { /* ignore */ }
}
export function hydrateThumbs(root = document) {
  if (!io) {
    io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target;
        io.unobserve(el);
        const ex = getEx(el.dataset.ex);
        if (!ex) continue;
        thumbURL(ex, { bare: !!el.dataset.bare, portrait: !!el.dataset.portrait, char: el.dataset.char || null, tall: !!el.dataset.tall }).then((url) => {
          el.innerHTML = `<img src="${url}" alt="${esc(ex.name)}" draggable="false" decoding="async">`;
          el.classList.add('ready');
        });
      }
    }, { rootMargin: '300px' });
  }
  $$('.clay-thumb:empty', root).forEach((el) => io.observe(el));
}

/* ---------- toast ---------- */
export function toast(msg, { icon: ic = null, ms = 2600, action = null } = {}) {
  const host = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `${ic ? `<span class="toast-ic">${ic}</span>` : ''}<span>${esc(msg)}</span>${action ? `<button class="toast-btn">${esc(action.label)}</button>` : ''}`;
  host.appendChild(el);
  if (action) el.querySelector('.toast-btn').onclick = () => { action.run(); close(); };
  requestAnimationFrame(() => el.classList.add('in'));
  const close = () => { el.classList.remove('in'); setTimeout(() => el.remove(), 300); };
  setTimeout(close, ms);
  return close;
}

/* ---------- bottom sheet ---------- */
export function sheet(html, { onMount, onDismiss, cls = '', dismissable = true } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet-backdrop"></div><div class="sheet ${cls}" role="dialog" aria-modal="true"><div class="sheet-grab"></div>${html}</div>`;
  document.body.appendChild(wrap);
  const el = wrap.querySelector('.sheet');
  let closed = false;
  // returns a promise that settles once the history entry has been popped,
  // so callers can safely navigate afterwards
  const close = () => new Promise((resolve) => {
    if (closed) return resolve();
    closed = true;
    wrap.classList.remove('in');
    window.removeEventListener('popstate', onPop);
    setTimeout(() => wrap.remove(), 280);
    if (history.state?.sheet) {
      const done = () => { window.removeEventListener('popstate', done); clearTimeout(t); resolve(); };
      const t = setTimeout(done, 400);
      window.addEventListener('popstate', done);
      history.back();
    } else resolve();
  });
  const onPop = () => { if (!closed) { closed = true; window.removeEventListener('popstate', onPop); wrap.classList.remove('in'); setTimeout(() => wrap.remove(), 280); onDismiss?.(); } };
  history.pushState({ ...(history.state || {}), sheet: true }, '');
  window.addEventListener('popstate', onPop);
  if (dismissable) wrap.querySelector('.sheet-backdrop').onclick = () => close().then(() => onDismiss?.());
  requestAnimationFrame(() => wrap.classList.add('in'));
  onMount?.(el, close);
  hydrateThumbs(el);
  return close;
}

export function confirmDialog(title, body = '', { ok = 'OK', cancel = 'Cancel', danger = false } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const close = sheet(`<div class="dialog"><h3>${esc(title)}</h3>${body ? `<p class="muted">${esc(body)}</p>` : ''}<div class="row gap"><button class="btn ghost grow" data-a="no">${esc(cancel)}</button><button class="btn ${danger ? 'danger' : 'primary'} grow" data-a="yes">${esc(ok)}</button></div></div>`, {
      onMount(el, c) {
        el.querySelector('[data-a=yes]').onclick = () => { done = true; resolve(true); c(); };
        el.querySelector('[data-a=no]').onclick = () => { done = true; resolve(false); c(); };
      },
    });
    const t = setInterval(() => { if (!document.querySelector('.sheet-wrap')) { clearInterval(t); if (!done) resolve(false); } }, 400);
    return close;
  });
}

export function promptDialog(title, { value = '', placeholder = '', type = 'text', ok = 'Save', step } = {}) {
  return new Promise((resolve) => {
    let done = false;
    sheet(`<form class="dialog"><h3>${esc(title)}</h3><input class="input" name="v" type="${type}" ${step ? `step="${step}"` : ''} inputmode="${type === 'number' ? 'decimal' : 'text'}" value="${esc(value)}" placeholder="${esc(placeholder)}" required><div class="row gap"><button type="button" class="btn ghost grow" data-a="no">Cancel</button><button class="btn primary grow">${esc(ok)}</button></div></form>`, {
      onMount(el, c) {
        const inp = el.querySelector('input');
        setTimeout(() => inp.focus(), 250);
        el.querySelector('form').onsubmit = (e) => { e.preventDefault(); done = true; resolve(inp.value); c(); };
        el.querySelector('[data-a=no]').onclick = () => { done = true; resolve(null); c(); };
      },
    });
    const t = setInterval(() => { if (!document.querySelector('.sheet-wrap')) { clearInterval(t); if (!done) resolve(null); } }, 400);
  });
}

/* ---------- confetti made of clay blobs ---------- */
export function confetti(n = 60) {
  const host = document.createElement('div');
  host.className = 'confetti';
  const cols = ['#ff6b57', '#ffc93c', '#2ec4b6', '#8f7cff', '#ff7eb6', '#4f9dff'];
  for (let i = 0; i < n; i++) {
    const b = document.createElement('i');
    const s = 8 + Math.random() * 12;
    b.style.cssText = `left:${Math.random() * 100}%;width:${s}px;height:${s * (0.7 + Math.random() * 0.6)}px;background:${cols[i % cols.length]};animation-delay:${Math.random() * 0.6}s;animation-duration:${1.8 + Math.random() * 1.4}s;--dx:${(Math.random() - 0.5) * 160}px;--r:${(Math.random() - 0.5) * 720}deg`;
    host.appendChild(b);
  }
  document.body.appendChild(host);
  setTimeout(() => host.remove(), 4000);
}

export function stepper(name, value, { step = 1, min = 0, max = 9999, label = '', unit = '', decimals = 0 } = {}) {
  return `<div class="stepper" data-name="${name}" data-step="${step}" data-min="${min}" data-max="${max}" data-dec="${decimals}">
    <button type="button" class="step-btn" data-d="-1" aria-label="Decrease ${esc(label)}">${icon('minus')}</button>
    <label class="step-val"><input type="number" inputmode="decimal" step="any" value="${value}" aria-label="${esc(label)}"><span class="step-unit">${esc(unit)}</span></label>
    <button type="button" class="step-btn" data-d="1" aria-label="Increase ${esc(label)}">${icon('plus')}</button>
  </div>`;
}
export function bindSteppers(root, onChange) {
  $$('.stepper', root).forEach((st) => {
    const inp = st.querySelector('input');
    const stepv = +st.dataset.step, min = +st.dataset.min, max = +st.dataset.max, dec = +st.dataset.dec;
    const setv = (v) => {
      v = Math.min(max, Math.max(min, v));
      inp.value = dec ? +v.toFixed(dec) : Math.round(v);
      onChange?.(st.dataset.name, +inp.value);
    };
    st.querySelectorAll('.step-btn').forEach((b) => {
      let timer = null, rep = null;
      const fire = () => setv((+inp.value || 0) + stepv * +b.dataset.d);
      const stop = () => { clearTimeout(timer); clearInterval(rep); timer = rep = null; };
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); fire(); timer = setTimeout(() => (rep = setInterval(fire, 90)), 420); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, stop));
    });
    inp.addEventListener('change', () => setv(+inp.value || 0));
  });
}

export function haptic(ms = 12) {
  if (store.settings().haptics && navigator.vibrate) navigator.vibrate(ms);
}
