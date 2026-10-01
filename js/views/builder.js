// SuperSweatClub — custom workout builder.
import * as store from '../store.js';
import { EXERCISES, getEx, MUSCLES, CATS } from '../exercises.js';
import { getWorkout, estimateMinutes } from '../workouts.js';
import { esc, icon, $, $$, thumb, sheet, toast, stepper, bindSteppers, hydrateThumbs } from '../ui.js';
import { go, back } from '../app.js';
import * as stats from '../stats.js';

const EMOJIS = ['💪', '🔥', '⚡', '🏋️', '🧘', '🦵', '🍑', '🧱', '🏃', '🥊', '🌞', '🌙', '🎯', '🚀', '🐻', '🦄'];
const COLORS = ['#ff6b57', '#ff8a3d', '#ffc93c', '#5bc46a', '#2ec4b6', '#4f9dff', '#8f7cff', '#ff7eb6', '#3d3a6b'];
const FOCI = ['Full body', 'Upper body', 'Lower body', 'Core', 'Cardio', 'Mobility'];

let d = null;

function blank() {
  return { id: 'c-' + store.uid(), name: '', emoji: '💪', color: '#8f7cff', focus: 'Full body', mode: 'circuit', work: 40, rest: 20, rounds: 2, roundRest: 60, items: [], level: 'intermediate', desc: '' };
}

function itemRow(it, i) {
  const ex = getEx(it.ex);
  const isTime = ex.type === 'time';
  let ctrls = '';
  if (d.mode === 'sets') {
    ctrls = `<div class="mini-steps">
      <div class="mini"><button data-i="${i}" data-k="sets" data-d="-1">–</button><span>${it.sets} sets</span><button data-i="${i}" data-k="sets" data-d="1">+</button></div>
      ${isTime || it.time ? `<div class="mini"><button data-i="${i}" data-k="time" data-d="-5">–</button><span>${it.time || ex.time}s</span><button data-i="${i}" data-k="time" data-d="5">+</button></div>`
        : `<div class="mini"><button data-i="${i}" data-k="reps" data-d="-1">–</button><span>${it.reps} reps</span><button data-i="${i}" data-k="reps" data-d="1">+</button></div>`}
    </div>`;
  } else {
    ctrls = `<div class="mini-steps"><div class="mini"><button data-i="${i}" data-k="work" data-d="-5">–</button><span>${it.work || d.work}s</span><button data-i="${i}" data-k="work" data-d="5">+</button></div></div>`;
  }
  return `<div class="b-item"><div class="li-thumb">${thumb(ex.id)}</div><div class="grow" style="min-width:0"><div class="bold" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(ex.name)}</div>${ctrls}</div>
    <div class="b-ctrl"><button data-mv="${i}" data-dir="-1" aria-label="Move up">${icon('up')}</button><button data-mv="${i}" data-dir="1" aria-label="Move down">${icon('down')}</button></div>
    <button class="icon-btn flat" data-rm="${i}" aria-label="Remove">${icon('x')}</button></div>`;
}

function itemsHTML() {
  if (!d.items.length) return `<div class="empty soft"><p class="muted">No moves yet. Add a few from the library.</p></div>`;
  return `<div class="list">${d.items.map(itemRow).join('')}</div>`;
}

function newItem(exId) {
  const ex = getEx(exId);
  if (d.mode === 'sets') return { ex: exId, sets: 3, reps: ex.type === 'time' ? 0 : ex.reps, time: ex.type === 'time' ? ex.time : undefined };
  return { ex: exId };
}

function convertItems() {
  d.items = d.items.map((it) => (d.mode === 'sets' ? { ...newItem(it.ex), ...(it.sets ? it : {}) } : { ex: it.ex, work: it.work }));
}

export const view = {
  tab: 'workouts',
  title: 'Build a workout',
  render([id], query) {
    if (id) {
      const src = getWorkout(id);
      if (src) {
        d = structuredClone(src);
        delete d.builtin;
        if (query.copy || src.builtin) { d.id = 'c-' + store.uid(); d.name = src.name + (query.copy ? ' (my version)' : ''); }
      } else d = blank();
    } else d = blank();
    d.work ??= 40; d.rest ??= 20; d.rounds ??= 2; d.roundRest ??= 60;
    return `<div class="view">
      <div class="topbar"><button class="icon-btn" data-back aria-label="Back">${icon('back')}</button><h2>${id && !query.copy && !getWorkout(id)?.builtin ? 'Edit workout' : 'New workout'}</h2><button class="btn small primary" id="save">Save</button></div>
      <div class="card">
        <div class="row gap"><button class="emoji-badge" id="emo" style="background:${d.color}" aria-label="Icon">${d.emoji}</button><input class="input grow" id="name" maxlength="40" placeholder="Workout name" value="${esc(d.name)}"></div>
        <div class="swatches mt" id="cols">${COLORS.map((c) => `<button class="swatch ${c === d.color ? 'on' : ''}" style="background:${c}" data-c="${c}" aria-label="Colour"></button>`).join('')}</div>
        <div class="muted tiny bold mt mb">FOCUS</div>
        <div class="row wrap gap-s" id="foci">${FOCI.map((f) => `<button class="chip ${d.focus === f ? 'on' : ''}" data-f="${f}">${f}</button>`).join('')}</div>
      </div>
      <div class="card mt">
        <h3 class="mb">Format</h3>
        <div class="seg" id="mode"><button class="${d.mode === 'circuit' ? 'on' : ''}" data-m="circuit">⏱️ Timed circuit</button><button class="${d.mode === 'sets' ? 'on' : ''}" data-m="sets">🏋️ Sets & reps</button></div>
        <div id="circ" class="${d.mode === 'circuit' ? '' : 'hidden'}"><div class="set-logger">
          <div><div class="lbl">Work</div>${stepper('work', d.work, { step: 5, min: 10, max: 300, unit: 's', label: 'Work' })}</div>
          <div><div class="lbl">Rounds</div>${stepper('rounds', d.rounds, { min: 1, max: 10, label: 'Rounds' })}</div>
        </div></div>
      </div>
      <div class="section"><div class="section-h"><h2>Moves</h2><span class="muted small bold" id="est"></span></div><div id="items"></div>
        <button class="btn block mt" id="add">${icon('plus')} Add exercises</button></div>
    </div>`;
  },
  mount(root) {
    const paintItems = () => {
      $('#items', root).innerHTML = itemsHTML();
      $('#est', root).textContent = d.items.length ? `~${estimateMinutes(d)} min` : '';
      hydrateThumbs(root);
    };
    paintItems();
    root.querySelector('[data-back]').onclick = () => back('/workouts');
    $('#name', root).oninput = (e) => (d.name = e.target.value);
    $('#emo', root).onclick = () => sheet(`<div class="dialog"><h3>Pick an icon</h3><div class="row wrap gap-s">${EMOJIS.map((e) => `<button class="emoji-badge" style="background:var(--card)" data-e="${e}">${e}</button>`).join('')}</div></div>`, {
      onMount(el, close) { $$('[data-e]', el).forEach((b) => (b.onclick = () => { d.emoji = b.dataset.e; $('#emo', root).textContent = d.emoji; close(); })); },
    });
    $$('#cols .swatch', root).forEach((b) => (b.onclick = () => { d.color = b.dataset.c; $('#emo', root).style.background = d.color; $$('#cols .swatch', root).forEach((x) => x.classList.toggle('on', x === b)); }));
    $$('#foci .chip', root).forEach((b) => (b.onclick = () => { d.focus = b.dataset.f; $$('#foci .chip', root).forEach((x) => x.classList.toggle('on', x === b)); }));
    $$('#mode button', root).forEach((b) => (b.onclick = () => {
      d.mode = b.dataset.m;
      $$('#mode button', root).forEach((x) => x.classList.toggle('on', x === b));
      $('#circ', root).classList.toggle('hidden', d.mode !== 'circuit');
      convertItems();
      paintItems();
    }));
    bindSteppers($('#circ', root), (k, v) => { d[k] = v; $('#est', root).textContent = d.items.length ? `~${estimateMinutes(d)} min` : ''; });
    $('#items', root).addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.rm != null) d.items.splice(+b.dataset.rm, 1);
      else if (b.dataset.mv != null) {
        const i = +b.dataset.mv, j = i + +b.dataset.dir;
        if (j < 0 || j >= d.items.length) return;
        [d.items[i], d.items[j]] = [d.items[j], d.items[i]];
      } else if (b.dataset.k) {
        const it = d.items[+b.dataset.i];
        const k = b.dataset.k;
        const ex = getEx(it.ex);
        const base = k === 'work' ? it.work || d.work : k === 'time' ? it.time || ex.time : it[k];
        const lim = { sets: [1, 10], reps: [1, 100], rest: [0, 300], work: [10, 300], time: [5, 600] }[k];
        it[k] = Math.min(lim[1], Math.max(lim[0], (base || 0) + +b.dataset.d));
      } else return;
      paintItems();
    });
    $('#add', root).onclick = () => openPicker(() => paintItems());
    $('#save', root).onclick = async () => {
      if (!d.name.trim()) { toast('Give your workout a name', { icon: '✏️' }); $('#name', root).focus(); return; }
      if (!d.items.length) { toast('Add at least one exercise', { icon: '➕' }); return; }
      const w = { ...d, name: d.name.trim(), builtin: false, created: d.created || Date.now(), desc: d.desc || `Custom ${d.mode === 'circuit' ? 'circuit' : 'strength'} workout with ${d.items.length} moves.` };
      await store.saveCustom(w);
      stats.evaluateBadges();
      toast('Workout saved', { icon: '🧩' });
      go('/workout/' + encodeURIComponent(w.id), { replace: true });
    };
  },
};

function openPicker(done) {
  const chosen = [];
  let q = '', cat = 'all';
  const listHTML = () => EXERCISES.filter((ex) => (cat === 'all' || ex.cat === cat) && (!q || (ex.name + ' ' + ex.primary.map((m) => MUSCLES[m]).join(' ')).toLowerCase().includes(q.toLowerCase())))
    .map((ex) => `<button class="li" data-x="${ex.id}" style="box-shadow:none;background:var(--card)"><div class="li-thumb">${thumb(ex.id)}</div><div class="li-main"><div class="li-title">${esc(ex.name)}</div><div class="li-sub">${ex.primary.map((m) => MUSCLES[m]).join(', ')}</div></div><span class="pill ${chosen.includes(ex.id) ? 'p' : ''}" data-cnt="${ex.id}">${chosen.filter((c) => c === ex.id).length ? '✓ ' + chosen.filter((c) => c === ex.id).length : '+'}</span></button>`).join('');
  sheet(`<div class="dialog" style="gap:10px"><h3>Add exercises</h3>
    <div class="search">${icon('search')}<input class="input" id="pq" placeholder="Search"></div>
    <div class="row gap-s wrap" id="pc">${[['all', 'All'], ...Object.entries(CATS)].map(([k, l]) => `<button class="chip ${k === 'all' ? 'on' : ''}" data-c="${k}">${l}</button>`).join('')}</div>
    <div class="list" id="pl" style="max-height:52vh;overflow:auto;padding:2px">${listHTML()}</div>
    <button class="btn primary block" id="padd">Add selected</button></div>`, {
    onMount(el, close) {
      const pl = $('#pl', el);
      const repaint = () => { pl.innerHTML = listHTML(); hydrateThumbs(pl); };
      $('#pq', el).oninput = (e) => { q = e.target.value; repaint(); };
      $$('#pc .chip', el).forEach((b) => (b.onclick = () => { cat = b.dataset.c; $$('#pc .chip', el).forEach((x) => x.classList.toggle('on', x === b)); repaint(); }));
      pl.addEventListener('click', (e) => {
        const b = e.target.closest('[data-x]');
        if (!b) return;
        chosen.push(b.dataset.x);
        const n = chosen.filter((c) => c === b.dataset.x).length;
        const pill = b.querySelector('[data-cnt]');
        pill.textContent = '✓ ' + n;
        pill.classList.add('p');
        $('#padd', el).textContent = `Add ${chosen.length} selected`;
      });
      $('#padd', el).onclick = async () => {
        for (const id of chosen) d.items.push(newItem(id));
        await close();
        done();
      };
    },
  });
}
