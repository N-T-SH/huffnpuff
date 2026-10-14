// Huff n Puff — a workout someone shared with you: preview it, then save your own copy.
// Custom workouts travel inside the link itself (#/w/<data>), so nothing goes through a server.
import * as store from '../store.js';
import { getEx, MUSCLES } from '../exercises.js';
import { esc, icon, thumb, $, toast } from '../ui.js';
import { go } from '../app.js';
import { estimateMinutes } from '../workouts.js';

const FIELDS = ['name', 'emoji', 'color', 'focus', 'mode', 'work', 'rest', 'rounds', 'roundRest', 'level', 'desc'];
const ITEM = ['ex', 'sets', 'reps', 'time', 'rest', 'work'];

// a workout → the short, URL-safe text that goes in a link
export function encodeWorkout(w) {
  const o = {};
  for (const k of FIELDS) if (w[k] != null && w[k] !== '') o[k] = w[k];
  o.items = w.items.map((it) => { const r = {}; for (const k of ITEM) if (it[k] != null && it[k] !== '') r[k] = it[k]; return r; });
  const bytes = new TextEncoder().encode(JSON.stringify(o));
  let bin = ''; bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function decodeWorkout(s) {
  try {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
    const o = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0))));
    // keep only what a workout is made of, and only moves the app knows
    const w = {};
    for (const k of FIELDS) if (o[k] != null) w[k] = typeof o[k] === 'string' ? o[k].slice(0, 300) : +o[k] || o[k];
    w.mode = w.mode === 'sets' ? 'sets' : 'circuit';
    w.items = (Array.isArray(o.items) ? o.items : []).filter((it) => getEx(it?.ex)).slice(0, 40).map((it) => {
      const r = { ex: it.ex };
      for (const k of ITEM.slice(1)) if (it[k] != null && Number.isFinite(+it[k])) r[k] = Math.max(0, Math.min(999, +it[k]));
      return r;
    });
    if (!w.items.length || !w.name) return null;
    if (!/^#[0-9a-f]{3,8}$/i.test(w.color || '')) w.color = '#8f7cff';
    return w;
  } catch { return null; }
}

export const view = {
  title: 'Shared workout',
  render([data]) {
    const w = decodeWorkout(data);
    if (!w) return `<div class="view"><div class="empty"><h3>This link doesn’t open</h3><p class="muted small mt">It may have been cut short when it was shared.</p><a class="btn primary mt" href="#/workouts">Browse workouts</a></div></div>`;
    return `<div class="view">
      <div class="topbar"><a class="icon-btn" href="#/" aria-label="Home">${icon('back')}</a><span class="grow"></span></div>
      <div class="clay-stage">${thumb(w.items[0].ex)}</div>
      <div class="mt row gap"><div class="emoji-badge" style="background:${esc(w.color)}">${esc(w.emoji || '💪')}</div><div class="grow"><div class="muted tiny bold">SHARED WITH YOU</div><h1 style="font-size:26px">${esc(w.name)}</h1><div class="muted small bold">${esc(w.focus || '')} · ${estimateMinutes(w)} min · ${w.items.length} moves</div></div></div>
      ${w.desc ? `<p class="muted mt">${esc(w.desc)}</p>` : ''}
      <div class="section"><div class="list">${w.items.map((it) => {
        const ex = getEx(it.ex);
        return `<div class="li"><div class="li-thumb">${thumb(ex.id)}</div><div class="li-main"><div class="li-title">${esc(ex.name)}</div><div class="li-sub">${ex.primary.map((m) => MUSCLES[m]).join(', ')}</div></div></div>`;
      }).join('')}</div></div>
      <div style="height:90px"></div>
      <div style="position:fixed;left:0;right:0;bottom:calc(var(--nav-h) + 22px + var(--safe-b));display:flex;justify-content:center;z-index:20">
        <button class="btn primary big" id="save" style="width:min(528px,calc(100% - 32px))">${icon('plus')} Save to my workouts</button></div>
    </div>`;
  },
  mount(root, [data]) {
    const w = decodeWorkout(data);
    $('#save', root)?.addEventListener('click', async () => {
      const id = 'c-' + store.uid();
      await store.saveCustom({ ...w, id });
      toast(`${w.name} saved to your workouts`, { icon: '💾' });
      go('/workout/' + encodeURIComponent(id), { replace: true });
    });
  },
};
