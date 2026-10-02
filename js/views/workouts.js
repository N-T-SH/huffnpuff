// SuperSweatClub — workout catalogue and workout detail.
import * as store from '../store.js';
import { allWorkouts, getWorkout, estimateMinutes, workoutMuscles, equipmentFor, canDo, workoutExercises, fitsMe, suitScore, warmupFor } from '../workouts.js';
import { getEx, EQUIPMENT, MUSCLES } from '../exercises.js';
import { esc, icon, thumb, $, $$, toast, confirmDialog, sheet, stepper, bindSteppers, haptic } from '../ui.js';
import { bodyMap } from '../charts.js';
import { workoutCard } from './home.js';
import { go, back } from '../app.js';
import * as stats from '../stats.js';

const FILTERS = [
  ['foryou', '✨ For you'], ['all', 'All'], ['quick', '⚡ ≤ 12 min'], ['Full body', 'Full body'], ['Upper body', 'Upper'], ['Lower body', 'Lower'],
  ['Core', 'Core'], ['Cardio', 'Cardio'], ['Mobility', 'Mobility'], ['mine', '🧩 Mine'], ['fav', '♥ Saved'],
];
let filter = 'foryou'; // the library opens on what suits you
let onlyMine = false;

function filtered() {
  const profile = store.get('profile') || {};
  const owned = profile.equipment || [];
  const favs = new Set(store.get('favorites') || []);
  const list = allWorkouts().filter((w) => {
    if (onlyMine && !canDo(w, owned)) return false;
    if (filter === 'foryou') return fitsMe(w, profile);
    if (filter === 'all') return true;
    if (filter === 'quick') return estimateMinutes(w) <= 12;
    if (filter === 'mine') return !w.builtin;
    if (filter === 'fav') return favs.has(w.id);
    return w.focus === filter;
  });
  if (filter === 'foryou') list.sort((a, b) => suitScore(b, profile) - suitScore(a, profile));
  return list;
}

export const listView = {
  tab: 'workouts',
  title: 'Workouts',
  keepScroll: true,
  render() {
    const list = filtered();
    return `<div class="view">
      <div class="topbar"><h1>Workouts</h1><a class="btn small primary" href="#/build">${icon('plus')} Build</a></div>
      <div class="chips" id="wf">${FILTERS.map(([k, l]) => `<button class="chip ${filter === k ? 'on' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
      <label class="row gap mb small bold"><span class="switch"><input type="checkbox" id="onlyMine" ${onlyMine ? 'checked' : ''}><span></span></span>Only show what my equipment allows</label>
      ${list.length ? `<div class="wk-grid">${list.map((w) => workoutCard(w)).join('')}</div>` : `<div class="empty"><div class="clay-stage">${thumb('meditate')}</div><h3>Nothing here yet</h3><p class="muted small mt">${filter === 'mine' ? 'Build your own routine with the button above.' : filter === 'fav' ? 'Tap ♥ on any workout to save it here.' : 'Try another filter.'}</p></div>`}
    </div>`;
  },
  mount(root) {
    $$('#wf .chip', root).forEach((b) => (b.onclick = () => { filter = b.dataset.f; go('/workouts', { replace: true }); }));
    $('#onlyMine', root).onchange = (e) => { onlyMine = e.target.checked; go('/workouts', { replace: true }); };
    const on = $('#wf .chip.on', root);
    on?.scrollIntoView({ inline: 'center', block: 'nearest' });
  },
};

/* ---------- detail ---------- */
// the warm-up moves, listed ahead of the workout when the toggle is on
function warmSection(warm, on) {
  if (!on) return '';
  return `<div class="muted tiny bold mb" style="letter-spacing:.08em">WARM-UP</div><div class="list warm-list">${warm.map((x) => {
    const ex = getEx(x.ex);
    return ex ? `<a class="li" href="#/exercise/${ex.id}"><div class="li-thumb">${thumb(ex.id)}</div><div class="li-main"><div class="li-title">${esc(ex.name)}</div><div class="li-sub">${x.dur}s · easy</div></div>${icon('chev', 'chev')}</a>` : '';
  }).join('')}</div><div class="muted tiny bold mt mb" style="letter-spacing:.08em">WORKOUT</div>`;
}

function itemLine(w, it) {
  const ex = getEx(it.ex);
  if (!ex) return '';
  let meta;
  if (w.mode === 'circuit') meta = `${it.work || w.work}s`;
  else meta = `${it.sets} × ${it.time || (ex.type === 'time' && !it.reps) ? `${it.time || ex.time}s` : `${it.reps} reps`}${ex.perSide ? ' / side' : ''}`;
  return `<a class="li" href="#/exercise/${ex.id}"><div class="li-thumb">${thumb(ex.id)}</div><div class="li-main"><div class="li-title">${esc(ex.name)}</div><div class="li-sub">${meta} · ${ex.primary.map((m) => MUSCLES[m]).join(', ')}</div></div>${icon('chev', 'chev')}</a>`;
}

export const detailView = {
  tab: 'workouts',
  title: ([id]) => getWorkout(id)?.name || 'Workout',
  render([id]) {
    const w = getWorkout(id);
    if (!w) return `<div class="view"><div class="topbar"><button class="icon-btn" data-back>${icon('back')}</button><h2>Not found</h2></div><p class="muted">This workout doesn’t exist anymore.</p></div>`;
    const favs = new Set(store.get('favorites') || []);
    const eq = equipmentFor(w);
    const times = stats.sessions().filter((s) => s.workoutId === w.id);
    const last = times.at(-1);
    const items = w.mode === 'circuit' ? w.items : w.items;
    const fakeEx = { primary: workoutMuscles(w), secondary: [] };
    const warm = warmupFor(w);
    return `<div class="view">
      <div class="topbar"><button class="icon-btn" data-back aria-label="Back">${icon('back')}</button><span class="grow"></span>
        <button class="icon-btn${favs.has(w.id) ? ' on' : ''}" id="fav" aria-label="Save">${icon(favs.has(w.id) ? 'heartFill' : 'heart')}</button>
        <button class="icon-btn" id="more" aria-label="More">${icon('edit')}</button></div>
      <div class="clay-stage">${thumb(w.items[0]?.ex)}</div>
      <div class="mt row gap"><div class="emoji-badge" style="background:${w.color}">${w.emoji}</div><div class="grow"><h1 style="font-size:26px">${esc(w.name)}</h1><div class="muted small bold">${esc(w.focus || '')}${w.level ? ' · ' + esc(w.level[0].toUpperCase() + w.level.slice(1)) : ''}</div></div></div>
      ${w.desc ? `<p class="muted mt">${esc(w.desc)}</p>` : ''}
      <div class="row wrap gap-s mt">
        <span class="pill p">${icon('clock')} ${estimateMinutes(w)} min</span>
        <span class="pill v">${icon('list')} ${w.items.length} moves</span>
        <span class="pill t">${w.mode === 'circuit' ? `${icon('repeat')} ${w.rounds} round${w.rounds > 1 ? 's' : ''}` : `${icon('dumbbell')} Sets & reps`}</span>
        ${eq.length ? eq.map((q) => `<span class="pill y">${esc(EQUIPMENT[q])}</span>`).join('') : '<span class="pill y">No equipment</span>'}
      </div>
      ${last ? `<div class="card tight mt row gap"><span style="font-size:24px">📅</span><div class="grow small"><b>Done ${times.length}×</b><div class="muted">Last: ${new Date(last.start).toLocaleDateString()} · ${Math.round(last.duration / 60)} min</div></div><a class="link" href="#/session/${last.id}">View</a></div>` : ''}
      ${w.mode === 'circuit' ? `<div class="card mt"><h3>Today’s tweak</h3><p class="muted small">Applies to this session. Rest is set in You → Training.</p>
        <div class="set-logger">
          <div><div class="lbl">Work</div>${stepper('work', w.work, { step: 5, min: 10, max: 300, unit: 's', label: 'Work seconds' })}</div>
          <div><div class="lbl">Rounds</div>${stepper('rounds', w.rounds, { step: 1, min: 1, max: 10, label: 'Rounds' })}</div>
        </div></div>` : ''}
      ${w.focus !== 'Mobility' ? `<label class="card tight mt row gap"><span style="font-size:24px">🔥</span><div class="grow"><b>Add a warm-up</b><div class="muted small">${warm.length} short, easy moves first (~${Math.max(1, Math.round((warm.reduce((n, x) => n + x.dur, 0) + warm.length * (store.settings().moveRest ?? 10)) / 60))} min)</div></div><span class="switch"><input type="checkbox" id="warm" ${store.settings().warmup ? 'checked' : ''}><span></span></span></label>` : ''}
      ${w.swaps?.length ? `<div class="card tight mt row gap"><span style="font-size:24px">🩹</span><div class="grow small"><b>Adapted for you</b><div class="muted">${w.swaps.map(([a, b]) => `${esc(getEx(a)?.name || a)} → ${esc(getEx(b)?.name || b)}`).join(' · ')}</div></div><a class="link" href="#/me">Change</a></div>` : ''}
      <div class="section"><div class="section-h"><h2>The moves</h2></div>
        <div id="warmList">${warmSection(warm, store.settings().warmup && w.focus !== 'Mobility')}</div>
        <div class="list">${items.map((it) => itemLine(w, it)).join('')}</div></div>
      <div class="section card"><h3 class="graffiti center">Muscles worked</h3>${bodyMap({}, { highlight: fakeEx })}</div>
      <div style="height:80px"></div>
      <div style="position:fixed;left:0;right:0;bottom:calc(var(--nav-h) + 22px + var(--safe-b));display:flex;justify-content:center;z-index:20;pointer-events:none">
        <button class="btn primary big" id="start" style="pointer-events:auto;width:min(528px,calc(100% - 32px))">${icon('play')} Start workout</button></div>
    </div>`;
  },
  mount(root, [id]) {
    const w = getWorkout(id);
    root.querySelector('[data-back]')?.addEventListener('click', () => back('/workouts'));
    if (!w) return;
    const tweak = {};
    bindSteppers(root, (k, v) => { tweak[k] = v; });
    $('#warm', root)?.addEventListener('change', (e) => {
      store.setSetting('warmup', e.target.checked);
      $('#warmList', root).innerHTML = warmSection(warmupFor(w), e.target.checked);
    });
    $('#start', root).onclick = () => {
      haptic();
      if ($('#warm', root)?.checked) tweak.warm = '1';
      const qs = Object.keys(tweak).length ? '?' + new URLSearchParams(tweak).toString() : '';
      go('/play/' + encodeURIComponent(w.id) + qs);
    };
    $('#fav', root).onclick = async (e) => {
      const btn = e.currentTarget; // (currentTarget is gone once we've awaited)
      await store.toggleFavorite(w.id);
      const on = (store.get('favorites') || []).includes(w.id);
      btn.innerHTML = icon(on ? 'heartFill' : 'heart');
      btn.classList.toggle('on', on);
      toast(on ? 'Saved to your favourites' : 'Removed from favourites', { icon: on ? '💖' : '🤍' });
    };
    $('#more', root).onclick = () => {
      sheet(`<div class="dialog"><h3>${esc(w.name)}</h3><div class="list">
        ${!w.builtin ? `<button class="li" data-a="edit">${icon('edit')}<div class="li-main"><div class="li-title">Edit workout</div></div></button>` : ''}
        <button class="li" data-a="dup">${icon('copy')}<div class="li-main"><div class="li-title">${w.builtin ? 'Customise a copy' : 'Duplicate'}</div><div class="li-sub">Make it your own in the builder</div></div></button>
        <button class="li" data-a="plan">${icon('calendar')}<div class="li-main"><div class="li-title">Add to my weekly plan</div></div></button>
        ${!w.builtin ? `<button class="li" data-a="del" style="color:var(--danger)">${icon('trash')}<div class="li-main"><div class="li-title">Delete</div></div></button>` : ''}
      </div></div>`, {
        onMount(el, close) {
          $$('[data-a]', el).forEach((b) => (b.onclick = async () => {
            const a = b.dataset.a;
            await close();
            if (a === 'edit') go('/build/' + encodeURIComponent(w.id));
            if (a === 'dup') go('/build/' + encodeURIComponent(w.id) + '?copy=1');
            if (a === 'plan') pickDay(w);
            if (a === 'del' && (await confirmDialog('Delete this workout?', 'Your history stays intact.', { ok: 'Delete', danger: true }))) {
              await store.deleteCustom(w.id);
              toast('Workout deleted', { icon: '🗑️' });
              go('/workouts', { replace: true });
            }
          }));
        },
      });
    };
  },
};

function pickDay(w) {
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const plan = store.get('plan') || {};
  sheet(`<div class="dialog"><h3>Which day?</h3><div class="list">${names.map((n, i) => {
    const cur = plan[i] ? getWorkout(plan[i]) : null;
    return `<button class="li" data-d="${i}"><div class="li-main"><div class="li-title">${n}</div><div class="li-sub">${cur ? 'Currently: ' + esc(cur.name) : 'Rest day'}</div></div></button>`;
  }).join('')}</div></div>`, {
    onMount(el, close) {
      $$('[data-d]', el).forEach((b) => (b.onclick = async () => {
        await store.set('plan', { ...plan, [b.dataset.d]: w.id });
        await close();
        toast(`${w.name} planned for ${names[b.dataset.d]}`, { icon: '📅' });
      }));
    },
  });
}

export { workoutExercises };
