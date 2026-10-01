// SillySweatClub — move feedback: what gets skipped, what gets a thumbs up/down.
// Feeds the next move-library refresh: most-skipped and thumbs-down moves get archived
// (see ARCHIVED in exercises.js), thumbs-up moves steer which new moves get made.
import * as store from './store.js';
import { EX_BY_ID, EXERCISES, CATS, MUSCLES } from './exercises.js';

export const vote = (id) => (store.settings().moveFeedback || {})[id] || 0;
export const votes = () => store.settings().moveFeedback || {};

export function setVote(id, v) {
  const fb = { ...votes() };
  if (!v || fb[id] === v) delete fb[id]; else fb[id] = v;
  return store.setSetting('moveFeedback', fb).then(() => fb[id] || 0);
}

function bump(id, field) {
  if (!id || !EX_BY_ID[id] || EX_BY_ID[id].hidden) return;
  const all = { ...(store.get('moveStats') || {}) };
  const r = { skips: 0, done: 0, ...(all[id] || {}) };
  r[field]++;
  r.last = Date.now();
  all[id] = r;
  store.set('moveStats', all);
}
export const logSkip = (id) => bump(id, 'skips');
export const logDone = (id) => bump(id, 'done');

export function mostSkipped(n = 10) {
  const all = store.get('moveStats') || {};
  return Object.entries(all)
    .filter(([id, r]) => r.skips > 0 && EX_BY_ID[id])
    .map(([id, r]) => ({ id, ...r, rate: r.skips / (r.skips + r.done) }))
    .sort((a, b) => b.skips - a.skips || b.rate - a.rate)
    .slice(0, n);
}

// Plain-text report to paste when asking for a move-library refresh
export function report() {
  const fb = votes();
  const name = (id) => EX_BY_ID[id]?.name || id;
  const up = Object.keys(fb).filter((id) => fb[id] > 0);
  const down = Object.keys(fb).filter((id) => fb[id] < 0);
  const skipped = mostSkipped(12);
  const upCats = {};
  const upMuscles = {};
  for (const id of up) {
    const ex = EX_BY_ID[id];
    if (!ex) continue;
    upCats[ex.cat] = (upCats[ex.cat] || 0) + 1;
    for (const m of ex.primary) upMuscles[m] = (upMuscles[m] || 0) + 1;
  }
  const top = (o, map) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${map[k] || k} (${v})`).join(', ') || '—';
  return [
    `SillySweatClub move feedback · ${new Date().toISOString().slice(0, 10)} · ${EXERCISES.length} moves in library`,
    '',
    `ARCHIVE (most skipped): ${skipped.map((s) => `${s.id} [${s.skips} skips / ${s.done} done]`).join(', ') || 'none yet'}`,
    `ARCHIVE (thumbs down): ${down.join(', ') || 'none'}`,
    `MORE LIKE (thumbs up): ${up.join(', ') || 'none'}`,
    `Liked styles: ${top(upCats, CATS)} · liked muscles: ${top(upMuscles, MUSCLES)}`,
    '',
    `Names: ${[...new Set([...skipped.map((s) => s.id), ...down, ...up])].map((id) => `${id} = ${name(id)}`).join('; ') || '—'}`,
  ].join('\n');
}
