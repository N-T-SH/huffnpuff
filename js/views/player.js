// Pulse — guided workout player (timed circuits + sets/reps logging).
import * as store from '../store.js';
import * as stats from '../stats.js';
import { getWorkout } from '../workouts.js';
import { getEx, MUSCLES } from '../exercises.js';
import { ClayPlayer } from '../clay.js';
import { esc, icon, $, $$, thumb, mmss, sheet, stepper, bindSteppers, look, units, toast, hydrateThumbs } from '../ui.js';
import { ring } from '../charts.js';
import { beep, say, buzz, keepAwake, unlock } from '../audio.js';
import { go } from '../app.js';
import { setFresh } from './summary.js';

/* ---------- plan building ---------- */
function applyTweak(w, q) {
  const t = { ...w, items: w.items.map((i) => ({ ...i })) };
  for (const k of ['work', 'rest', 'rounds', 'roundRest']) if (q[k] != null && q[k] !== '') t[k] = +q[k];
  return t;
}

function buildSteps(w) {
  const cd = store.settings().countdown ?? 10;
  const steps = [];
  if (cd > 0) steps.push({ kind: 'ready', dur: cd, ex: w.items[0].ex });
  if (w.mode === 'circuit') {
    const R = w.rounds || 1;
    for (let r = 0; r < R; r++) {
      w.items.forEach((it, i) => {
        steps.push({ kind: 'work', ex: it.ex, dur: it.work || w.work || 40, round: r, rounds: R, entry: i });
        const lastInRound = i === w.items.length - 1;
        const lastOverall = lastInRound && r === R - 1;
        if (lastOverall) return;
        if (lastInRound && (w.roundRest || 0) > 0) steps.push({ kind: 'rest', dur: w.roundRest, next: w.items[0].ex, label: `Round ${r + 2} next` });
        else if ((w.rest || 0) > 0) steps.push({ kind: 'rest', dur: w.rest, next: lastInRound ? w.items[0].ex : w.items[i + 1].ex });
      });
    }
  } else {
    w.items.forEach((it, i) => {
      const ex = getEx(it.ex);
      const isTime = !!it.time || (ex?.type === 'time' && !it.reps);
      for (let s = 0; s < it.sets; s++) {
        steps.push({ kind: 'set', ex: it.ex, entry: i, set: s, sets: it.sets, reps: it.reps, time: isTime ? it.time || ex.time : 0, isTime });
        const last = i === w.items.length - 1 && s === it.sets - 1;
        if (!last) steps.push({ kind: 'rest', dur: it.rest ?? store.settings().defaultRest, next: s < it.sets - 1 ? it.ex : w.items[i + 1].ex, nextSet: s < it.sets - 1 ? s + 1 : 0 });
      }
    });
  }
  return steps;
}

/* ---------- state ---------- */
let S = null; // session runtime
let clay = null;
let timer = null;
let root = null;
let leaving = false;

function persist() {
  if (!S) return;
  store.set('active', {
    workoutId: S.id, workout: S.w, idx: S.idx, log: S.log, start: S.start, pausedMs: S.pausedMs + (S.pauseAt ? Date.now() - S.pauseAt : 0),
    remaining: S.remaining, activeSec: S.activeSec, updated: Date.now(),
  });
}

const cur = () => S.steps[S.idx];
const workSteps = () => S.steps.filter((s) => s.kind === 'work' || s.kind === 'set');

function enterStep(i, { silent = false } = {}) {
  S.idx = i;
  const st = cur();
  if (!st) return finish();
  S.remaining = st.kind === 'set' ? (st.isTime ? st.time : 0) : st.dur;
  S.stepElapsed = 0;
  S.timing = st.kind !== 'set'; // sets wait for user (time-sets wait for "Start")
  S.halfSaid = false;
  if (!silent) cue(st);
  paint();
  persist();
}

function exName(id) { return getEx(id)?.name || id; }

function cue(st) {
  if (st.kind === 'ready') { say(`Get ready. First up, ${exName(st.ex)}`); beep.rest(); }
  else if (st.kind === 'work') { beep.go(); buzz([60, 40, 60]); say(`${exName(st.ex)}. ${st.dur} seconds.`); }
  else if (st.kind === 'rest') { beep.rest(); buzz(80); say(`Rest. Next up, ${exName(st.next)}${st.label ? '. ' + st.label : ''}`); }
  else if (st.kind === 'set') { buzz(40); say(`${exName(st.ex)}. Set ${st.set + 1} of ${st.sets}.`); }
}

function logWork(st, seconds) {
  const e = S.log[st.entry];
  e.sets.push({ time: Math.round(seconds), done: true });
  S.activeSec[st.ex] = (S.activeSec[st.ex] || 0) + seconds;
}

function completeTimed() {
  const st = cur();
  if (st.kind === 'work') logWork(st, st.dur - Math.max(0, S.remaining));
  if (st.kind === 'set' && st.isTime) {
    const t = st.time - Math.max(0, S.remaining);
    S.log[st.entry].sets[st.set] = { time: Math.round(t), done: true };
    S.activeSec[st.ex] = (S.activeSec[st.ex] || 0) + t;
  }
  next();
}

function next() {
  if (S.idx + 1 >= S.steps.length) return finish();
  enterStep(S.idx + 1);
}

function prev() {
  let i = S.idx - 1;
  while (i > 0 && S.steps[i].kind === 'rest') i--;
  enterStep(Math.max(0, i));
}

function tick() {
  if (!S || S.paused) return;
  const now = performance.now();
  let dt = (now - (S.last || now)) / 1000;
  S.last = now;
  if (dt > 5) dt = 5; // throttled tab: avoid skipping steps too fast
  const st = cur();
  if (!st || !S.timing) return paintTimer();
  const before = Math.ceil(S.remaining);
  S.remaining -= dt;
  S.stepElapsed += dt;
  const after = Math.ceil(S.remaining);
  if (after !== before && after <= 3 && after > 0) { beep.tick(); buzz(20); }
  const total = st.kind === 'set' ? st.time : st.dur;
  if (!S.halfSaid && st.kind === 'work' && S.remaining <= total / 2 && total >= 20) {
    S.halfSaid = true;
    const ex = getEx(st.ex);
    say(ex?.perSide ? 'Switch sides' : 'Halfway there', { interrupt: false });
  }
  if (S.remaining <= 0) {
    if (st.kind === 'set') { beep.done(); completeTimed(); }
    else completeTimed();
    return;
  }
  paintTimer();
}

function togglePause(force) {
  S.paused = force ?? !S.paused;
  if (S.paused) { S.pauseAt = Date.now(); clay?.pause(); say('Paused'); }
  else { S.pausedMs += Date.now() - (S.pauseAt || Date.now()); S.pauseAt = null; S.last = performance.now(); clay?.play(); }
  paintControls();
  persist();
}

/* ---------- rendering ---------- */
function stageEx() {
  const st = cur();
  return st.kind === 'rest' ? st.next : st.ex;
}

function progressBar() {
  const ws = workSteps();
  const curWork = S.steps.slice(0, S.idx + 1).filter((s) => s.kind === 'work' || s.kind === 'set').length;
  if (ws.length > 32) {
    return `<div class="p-progress"><i class="cur" style="--p:${(curWork / ws.length).toFixed(3)}"></i></div>`;
  }
  const st = cur();
  return `<div class="p-progress">${ws.map((s, i) => {
    const idx = S.steps.indexOf(s);
    const cls = idx < S.idx ? 'done' : idx === S.idx ? 'cur' : '';
    return `<i class="${cls}" ${idx === S.idx ? 'id="curSeg"' : ''}></i>`;
  }).join('')}</div>`;
}

function phaseLabel(st) {
  if (st.kind === 'ready') return '<span class="pill y">GET READY</span>';
  if (st.kind === 'rest') return '<span class="pill t">REST</span>';
  if (st.kind === 'work') return '<span class="pill p">WORK</span>';
  return `<span class="pill p">SET ${st.set + 1}/${st.sets}</span>`;
}

function paint() {
  if (!root) return;
  const st = cur();
  const exId = stageEx();
  const ex = getEx(exId);
  const player = $('.player', root);
  player.classList.toggle('resting', st.kind === 'rest');
  player.classList.toggle('ready', st.kind === 'ready');
  $('#pTop', root).innerHTML = `<button class="icon-btn" id="quit" aria-label="End workout">${icon('x')}</button>${progressBar()}<button class="icon-btn" id="snd" aria-label="Toggle sound">${icon(store.settings().sound ? 'volume' : 'mute')}</button>`;
  // stage
  if (!clay) {
    clay = new ClayPlayer($('#pClay', root), ex, { look: look(), boil: store.settings().stopMotion, fps: store.settings().stopMotion ? 12 : 0 });
    clay.play();
  } else if (clay.ex.id !== ex.id) clay.setExercise(ex);
  clay.speed = st.kind === 'work' || st.kind === 'set' ? 1 : 0.6;
  if (S.paused) clay.pause(); else clay.play();
  $('#pPhase', root).innerHTML = phaseLabel(st);
  $('#pBadge', root).innerHTML = st.kind === 'work' && st.rounds > 1 ? `<span class="pill">Round ${st.round + 1}/${st.rounds}</span>` : '';
  // name + sub
  let sub = '';
  if (st.kind === 'rest') sub = st.label || (st.kind === 'rest' && S.w.mode === 'sets' && st.nextSet ? `Next: set ${st.nextSet + 1}` : 'Up next');
  else if (st.kind === 'ready') sub = 'First up';
  else sub = ex.primary.map((m) => MUSCLES[m]).join(' · ');
  $('#pName', root).innerHTML = `<div class="p-name">${esc(ex.name)}</div><div class="p-sub">${esc(sub)}</div>`;
  // centre
  const center = $('#pCenter', root);
  if (st.kind === 'set' && !st.isTime) center.innerHTML = setLogger(st, ex);
  else if (st.kind === 'set' && st.isTime && !S.timing) center.innerHTML = timeSetIntro(st);
  else center.innerHTML = `<div class="p-big-ring" id="pRing"></div>${st.kind === 'rest' ? `<div class="row gap mt" style="justify-content:center"><button class="btn small" id="add15">+15s</button><button class="btn small" id="skipRest">Skip rest ${icon('next')}</button></div>` : ''}${st.kind === 'set' ? `<div class="row gap mt" style="justify-content:center"><button class="btn small" id="doneEarly">${icon('check')} Done</button></div>` : ''}`;
  bindCenter(st, ex);
  paintTimer();
  paintControls();
  // next up
  const nx = upcoming();
  $('#pNext', root).innerHTML = nx ? `<div class="soft p-next"><div class="li-thumb">${thumb(nx.ex)}</div><div class="grow"><div class="tiny muted bold">NEXT</div><div class="bold">${esc(exName(nx.ex))}</div><div class="small muted">${nx.label}</div></div></div>` : `<div class="soft p-next center" style="justify-content:center"><span class="bold">🏁 Final stretch!</span></div>`;
  hydrateThumbs($('#pNext', root));
}

function upcoming() {
  for (let i = S.idx + 1; i < S.steps.length; i++) {
    const s = S.steps[i];
    if (s.kind === 'work') return { ex: s.ex, label: `${s.dur}s${s.rounds > 1 ? ` · round ${s.round + 1}` : ''}` };
    if (s.kind === 'set') return { ex: s.ex, label: `Set ${s.set + 1} of ${s.sets} · ${s.isTime ? s.time + 's' : s.reps + ' reps'}` };
  }
  return null;
}

function setLogger(st, ex) {
  const e = S.log[st.entry];
  const prevSet = e.sets[st.set] || e.sets[st.set - 1];
  const sug = st.set === 0 && !e.sets[0] ? stats.suggestNext(ex.id, st.reps) : null;
  const weighted = ex.weighted || !ex.equip.includes('none');
  const u = units();
  const w = prevSet?.weight ?? sug?.weight ?? stats.lastPerformance(ex.id)?.sets?.[0]?.weight ?? 0;
  const r = prevSet?.reps ?? sug?.reps ?? st.reps;
  S.pending = { reps: r, weight: w };
  return `<div class="rep-target">${st.reps}<small> reps${ex.perSide ? ' / side' : ''}</small></div>
    <div class="set-dots">${Array.from({ length: st.sets }, (_, i) => `<i class="${e.sets[i]?.done ? 'done' : i === st.set ? 'cur' : ''}"></i>`).join('')}</div>
    ${sug?.note ? `<div class="hint">💡 ${esc(sug.note)}</div>` : ''}
    <div class="set-logger" style="${weighted ? '' : 'grid-template-columns:1fr'}">
      <div><div class="lbl">Reps done</div>${stepper('reps', r, { step: 1, min: 0, max: 200, label: 'Reps' })}</div>
      ${weighted ? `<div><div class="lbl">Weight</div>${stepper('weight', w, { step: u === 'lb' ? 5 : 2.5, min: 0, max: 1000, unit: u, decimals: 1, label: 'Weight' })}</div>` : ''}
    </div>`;
}

function timeSetIntro(st) {
  const e = S.log[st.entry];
  return `<div class="rep-target">${mmss(st.time)}<small> hold</small></div>
    <div class="set-dots">${Array.from({ length: st.sets }, (_, i) => `<i class="${e.sets[i]?.done ? 'done' : i === st.set ? 'cur' : ''}"></i>`).join('')}</div>
    <p class="center muted small mt">Get into position, then tap start.</p>`;
}

function bindCenter(st) {
  const c = $('#pCenter', root);
  bindSteppers(c, (k, v) => { S.pending[k] = v; });
  $('#add15', c)?.addEventListener('click', () => { S.remaining += 15; cur().dur += 15; paintTimer(); });
  $('#skipRest', c)?.addEventListener('click', next);
  $('#doneEarly', c)?.addEventListener('click', () => completeTimed());
}

function paintTimer() {
  const st = cur();
  const el = $('#pRing', root);
  const seg = $('#curSeg', root);
  const total = st.kind === 'set' ? st.time : st.dur;
  const p = total ? 1 - Math.max(0, S.remaining) / total : 0;
  if (seg) seg.style.setProperty('--p', st.kind === 'rest' ? 0 : p.toFixed(3));
  if (!el) return;
  const col = st.kind === 'rest' ? 'var(--teal)' : st.kind === 'ready' ? 'var(--accent)' : 'var(--primary)';
  const size = Math.round(Math.min(170, Math.max(104, window.innerHeight * 0.17)));
  el.innerHTML = ring(1 - p, { size, stroke: 12, color: col, inner: `<div class="p-timer" style="font-size:${Math.round(size * 0.34)}px;margin:0">${mmss(Math.ceil(Math.max(0, S.remaining)))}</div>` });
}

function paintControls() {
  const st = cur();
  const c = $('#pControls', root);
  let main;
  if (st.kind === 'set' && !st.isTime) main = `<button class="p-main" id="pMain" aria-label="Complete set">${icon('check')}</button>`;
  else if (st.kind === 'set' && st.isTime && !S.timing) main = `<button class="p-main" id="pMain" aria-label="Start timer">${icon('play')}</button>`;
  else main = `<button class="p-main" id="pMain" aria-label="${S.paused ? 'Resume' : 'Pause'}">${icon(S.paused ? 'play' : 'pause')}</button>`;
  c.innerHTML = `<button class="icon-btn" id="pPrev" aria-label="Previous">${icon('prev')}</button>${main}<button class="icon-btn" id="pSkip" aria-label="Skip">${icon('next')}</button>`;
  $('#pPrev', c).onclick = prev;
  $('#pSkip', c).onclick = () => { if (cur().kind === 'work') logWork(cur(), cur().dur - Math.max(0, S.remaining)); next(); };
  $('#pMain', c).onclick = () => {
    unlock();
    const s = cur();
    if (s.kind === 'set' && !s.isTime) {
      const p = S.pending || {};
      S.log[s.entry].sets[s.set] = { reps: +p.reps || 0, weight: +p.weight || 0, done: true };
      S.activeSec[s.ex] = (S.activeSec[s.ex] || 0) + Math.max(20, (+p.reps || 0) * 3.5);
      beep.pop();
      buzz(30);
      next();
    } else if (s.kind === 'set' && s.isTime && !S.timing) {
      S.timing = true; S.last = performance.now(); beep.go(); say('Go!'); paint();
    } else togglePause();
  };
}

/* ---------- quitting & finishing ---------- */
function hasProgress() { return S.log.some((e) => e.sets.some((s) => s?.done)); }

function popGuard() {
  return new Promise((resolve) => {
    if (!history.state?.guard) return resolve();
    const done = () => { window.removeEventListener('popstate', done); resolve(); };
    window.addEventListener('popstate', done);
    history.back();
    setTimeout(done, 400);
  });
}

async function leave(path) {
  leaving = true;
  await popGuard();
  go(path, { replace: true });
}

function askQuit() {
  const was = S.paused;
  if (!was) togglePause(true);
  const progress = hasProgress();
  sheet(`<div class="dialog"><h3>${progress ? 'Wrap it up?' : 'Leave this workout?'}</h3>
    <p class="muted">${progress ? 'Save what you’ve done so far — every rep counts.' : 'Nothing has been logged yet.'}</p>
    ${progress ? '<button class="btn primary block" data-a="save">Finish & save</button>' : ''}
    <button class="btn ghost block" data-a="discard" style="color:var(--danger)">${progress ? 'Discard workout' : 'Leave'}</button>
    <button class="btn block" data-a="keep">Keep going</button></div>`, {
    onMount(el, close) {
      $$('[data-a]', el).forEach((b) => (b.onclick = async () => {
        const a = b.dataset.a;
        await close();
        if (a === 'keep') { pushGuard(); if (!was) togglePause(false); }
        if (a === 'save') finish(true);
        if (a === 'discard') { store.set('active', null); S = null; leave('/'); }
      }));
    },
    // dismissing the sheet (backdrop / back button) = keep going
    onDismiss() { if (!S) return; pushGuard(); if (!was) togglePause(false); },
  });
}

function pushGuard() {
  if (!history.state?.guard) history.pushState({ ...(history.state || {}), guard: true }, '');
}

async function finish(early = false) {
  if (!S || S.finished) return;
  S.finished = true;
  clearInterval(timer);
  const end = Date.now();
  const pausedMs = S.pausedMs + (S.pauseAt ? end - S.pauseAt : 0);
  const duration = Math.max(1, Math.round((end - S.start - pausedMs) / 1000));
  const entries = S.log.map((e) => ({ ex: e.ex, sets: e.sets.filter((x) => x && x.done) })).filter((e) => e.sets.length);
  const kcal = stats.calories(Object.entries(S.activeSec).map(([ex, activeSec]) => ({ ex, activeSec })), duration);
  const session = {
    id: store.uid(), workoutId: S.id, name: S.w.name, emoji: S.w.emoji, color: S.w.color, mode: S.w.mode,
    start: S.start, end, duration, calories: kcal, entries, early, units: units(), rating: null, notes: '',
  };
  session.prs = stats.findPRs(session);
  await store.addSession(session);
  await store.set('active', null);
  setFresh(stats.evaluateBadges());
  beep.done();
  say(early ? 'Workout saved. Nice effort!' : 'Workout complete. Amazing job!');
  buzz([100, 60, 100, 60, 200]);
  S = null;
  leave('/done/' + session.id);
}

/* ---------- view ---------- */
export const view = {
  immersive: true,
  title: 'Workout',
  render([id]) {
    if (!getWorkout(id) && !store.get('active')) return `<div class="view no-nav"><div class="empty"><h3>Workout not found</h3><a class="btn primary mt" href="#/">Go home</a></div></div>`;
    return `<div class="player">
      <div class="p-top" id="pTop"></div>
      <div class="p-stage"><div class="p-inner"><div class="clay-stage" id="pClay"></div><div class="p-phase" id="pPhase"></div><div class="p-badge" id="pBadge"></div></div></div>
      <div id="pName"></div>
      <div class="p-center" id="pCenter"></div>
      <div class="p-controls" id="pControls"></div>
      <div id="pNext"></div>
    </div>`;
  },
  mount(el, [id], query) {
    root = el;
    leaving = false;
    const active = store.get('active');
    let w;
    // resume explicitly, or automatically after a reload / app restart mid-workout
    if (active && active.workoutId === id && (query.resume || Date.now() - (active.updated || 0) < 12 * 3600e3)) {
      w = active.workout;
      S = { id, w, steps: buildSteps(w), log: active.log, start: active.start, pausedMs: active.pausedMs || 0, activeSec: active.activeSec || {}, paused: true, pauseAt: Date.now() };
      enterStep(Math.min(active.idx, S.steps.length - 1), { silent: true });
      if (active.remaining > 0 && cur().kind !== 'set') S.remaining = active.remaining;
      paint();
      toast('Paused — tap play when ready', { icon: '⏸️' });
    } else {
      const base = getWorkout(id);
      if (!base) return;
      w = applyTweak(base, query);
      S = { id, w, steps: buildSteps(w), log: w.items.map((it) => ({ ex: it.ex, sets: [] })), start: Date.now(), pausedMs: 0, activeSec: {}, paused: false };
      enterStep(0);
    }
    S.last = performance.now();
    timer = setInterval(tick, 200);
    keepAwake.wanted = true;
    keepAwake(true);
    pushGuard();
    const onPop = () => {
      if (leaving || !S) return;
      if (document.querySelector('.sheet-wrap')) return;
      if (!history.state?.guard) askQuit();
    };
    window.addEventListener('popstate', onPop);
    el.addEventListener('click', (e) => {
      if (e.target.closest('#quit')) askQuit();
      if (e.target.closest('#snd')) {
        const on = !store.settings().sound;
        store.setSetting('sound', on);
        store.setSetting('voice', on);
        e.target.closest('#snd').innerHTML = icon(store.settings().sound ? 'volume' : 'mute');
        if (!store.settings().sound) speechSynthesis?.cancel?.();
      }
    });
    const onKey = (e) => {
      if (!S || e.target.matches('input')) return;
      if (e.key === ' ') { e.preventDefault(); $('#pMain', root)?.click(); }
      if (e.key === 'ArrowRight') $('#pSkip', root)?.click();
      if (e.key === 'ArrowLeft') $('#pPrev', root)?.click();
    };
    document.addEventListener('keydown', onKey);
    const onResize = () => paintTimer();
    window.addEventListener('resize', onResize);
    return () => {
      clearInterval(timer);
      window.removeEventListener('popstate', onPop);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      keepAwake.wanted = false;
      keepAwake(false);
      try { speechSynthesis?.cancel(); } catch { /* ignore */ }
      clay?.destroy(); clay = null;
      if (S && !S.finished) persist();
      S = null; root = null;
    };
  },
};
