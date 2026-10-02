// SuperSweatClub — guided workout player (timed circuits + sets/reps logging).
import * as store from '../store.js';
import * as stats from '../stats.js';
import { getWorkout } from '../workouts.js';
import { getEx, MUSCLES } from '../exercises.js';
import { ClayPlayer } from '../clay.js';
import { esc, icon, $, $$, thumb, mmss, sheet, stepper, bindSteppers, look, units, toast } from '../ui.js';
import { beep, say, hush, prefetchVoice, speechSeconds, buzz, keepAwake, unlock } from '../audio.js';
import { LINES, exLine, secondsLine, setLine, labelLine, roundLabel, WARMUP_LABEL, WARMUP_DONE_LABEL } from '../voice-lines.js';
import { go } from '../app.js';
import { setFresh } from './summary.js';
import { characterFor, quipFor, nameOf } from '../cast.js';
import { logSkip, logDone } from '../feedback.js';

/* ---------- plan building ---------- */
const WARMUP = [{ ex: 'march', dur: 40 }, { ex: 'arm-circles', dur: 30 }, { ex: 'squat-reach', dur: 40 }, { ex: 'inchworm', dur: 40 }, { ex: 'jumping-jack', dur: 30 }];

function applyTweak(w, q) {
  const t = { ...w, items: w.items.map((i) => ({ ...i })) };
  for (const k of ['work', 'rounds']) if (q[k] != null && q[k] !== '') t[k] = +q[k];
  if (q.warm === '1') t.warmup = WARMUP;
  return t;
}

function buildLog(w) {
  return [...(w.warmup || []).map((x) => ({ ex: x.ex, sets: [], warm: true })), ...w.items.map((it) => ({ ex: it.ex, sets: [] }))];
}

function buildSteps(w) {
  const cd = 3; // a quick 3-2-1, big and centred over the scene
  const mr = store.settings().moveRest ?? 10;
  const steps = [];
  const warm = w.warmup || [];
  const off = warm.length;
  if (cd > 0) steps.push({ kind: 'ready', dur: cd, ex: (warm[0] || w.items[0]).ex });
  warm.forEach((x, i) => {
    steps.push({ kind: 'work', ex: x.ex, dur: x.dur, round: 0, rounds: 1, entry: i, warm: true });
    if (i < off - 1 && !mr) return;
    steps.push({ kind: 'rest', dur: i === off - 1 ? Math.max(mr, 10) : mr, next: i === off - 1 ? w.items[0].ex : warm[i + 1].ex, label: i === off - 1 ? WARMUP_DONE_LABEL : WARMUP_LABEL });
  });
  if (w.mode === 'circuit') {
    const R = w.rounds || 1;
    for (let r = 0; r < R; r++) {
      w.items.forEach((it, i) => {
        steps.push({ kind: 'work', ex: it.ex, dur: it.work || w.work || 40, round: r, rounds: R, entry: i + off });
        const lastInRound = i === w.items.length - 1;
        const lastOverall = lastInRound && r === R - 1;
        if (lastOverall) return;
        if (lastInRound && mr > 0) steps.push({ kind: 'rest', dur: mr, next: w.items[0].ex, label: roundLabel(r + 2) });
        else if (mr > 0) steps.push({ kind: 'rest', dur: mr, next: lastInRound ? w.items[0].ex : w.items[i + 1].ex });
      });
    }
  } else {
    w.items.forEach((it, i) => {
      const ex = getEx(it.ex);
      const isTime = !!it.time || (ex?.type === 'time' && !it.reps);
      for (let s = 0; s < it.sets; s++) {
        steps.push({ kind: 'set', ex: it.ex, entry: i + off, set: s, sets: it.sets, reps: it.reps, time: isTime ? it.time || ex.time : 0, isTime });
        const last = i === w.items.length - 1 && s === it.sets - 1;
        if (!last && mr > 0) steps.push({ kind: 'rest', dur: mr, next: s < it.sets - 1 ? it.ex : w.items[i + 1].ex, nextSet: s < it.sets - 1 ? s + 1 : 0 });
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
let keepVoice = false;

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
  const was = S.steps[S.idx];
  S.idx = i;
  const st = cur();
  if (!st) return finish();
  S.remaining = st.kind === 'set' ? (st.isTime ? st.time : 0) : st.dur;
  S.stepElapsed = 0;
  S.timing = st.kind !== 'set'; // sets wait for user (time-sets wait for "Start")
  S.halfSaid = false;
  if (!silent) cue(st);
  S.countShown = null;
  if (was?.kind === 'ready' && st.kind !== 'ready' && !silent) bigCount('GO!', 'go');
  else if (st.kind !== 'ready') bigCount('');
  paint();
  persist();
}

function exName(id) { return getEx(id)?.name || id; }

// what the coach says for a step, as pre-recorded parts (js/voice-lines.js)
const exPart = (id) => (getEx(id) ? exLine(getEx(id)) : `${id}.`);
// "Next up: Wall Sit. Round 2 next." (plus the set, in sets & reps workouts)
// (more sets of the move you just did: skip its name, just say which set / round)
function nextParts(st, i = S.idx) {
  const nx = S.steps[i + 1];
  const same = st.next === prevWorkEx(i);
  const head = same ? [] : [LINES.nextUp, exPart(st.next)];
  return [...head, st.label && labelLine(st.label), nx?.kind === 'set' && setLine(nx.set + 1, nx.sets)].filter(Boolean);
}
function cueParts(st, i) {
  if (st.kind === 'ready') return [LINES.getReady, exPart(st.ex)];
  if (st.kind === 'work') return [exPart(st.ex), secondsLine(st.dur)];
  if (st.kind === 'rest') return [LINES.rest, LINES.restNext, ...nextParts(st, i)]; // everything a rest may say (prefetch)
  if (st.kind === 'set') return [exPart(st.ex), setLine(st.set + 1, st.sets)];
  return [];
}

// Rests: say "Rest." now, and announce the next move late enough to be useful but early
// enough that the whole name is spoken before the final 3-second countdown.
function planRest(st) {
  const parts = nextParts(st);
  const lead = Math.max(5, speechSeconds(parts) + 3 + 0.6);
  S.annFor = null;
  S.annAt = lead;
  if (!parts.length) { S.annFor = S.idx + 0.5; say(LINES.rest); return; } // same move, nothing new to say
  if (st.dur < lead + 2) { // too short to split: say it all at once
    S.annFor = S.idx;
    say(parts[0] === LINES.nextUp ? [LINES.restNext, ...parts.slice(1)] : [LINES.rest, ...parts]);
  } else say(LINES.rest);
}

function cue(st) {
  const announced = S.annFor != null && S.annFor === S.idx - 1;
  if (st.kind === 'ready') beep.rest();
  else if (st.kind === 'work') { beep.go(); buzz([60, 40, 60]); }
  else if (st.kind === 'rest') { beep.rest(); buzz(80); return planRest(st); }
  else if (st.kind === 'set') buzz(40);
  // the move was just announced at the end of the rest: keep the start short
  if (announced && st.kind === 'work') return say(LINES.go);
  if (announced && st.kind === 'set') return; // "Set n of m" was the announcement
  // straight on with more of the same move: don't repeat its name
  const again = (st.kind === 'work' || st.kind === 'set') && st.ex === prevWorkEx();
  if (again && st.kind === 'work') return say(LINES.go);
  if (again && st.kind === 'set') return say(setLine(st.set + 1, st.sets));
  say(cueParts(st));
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
  // a hitch (e.g. building the next scene) or a throttled background tab must not eat the timer
  if (dt > 1.2) dt = 1.2;
  const st = cur();
  if (!st || !S.timing) return paintTimer();
  const before = Math.ceil(S.remaining);
  S.remaining -= dt;
  S.stepElapsed += dt;
  const after = Math.ceil(S.remaining);
  if (st.kind === 'rest' && S.annFor !== S.idx && S.annFor !== S.idx + 0.5 && S.remaining <= S.annAt) { S.annFor = S.idx; say(nextParts(st)); }
  if (after !== before && after <= 3 && after > 0) { beep.tick(); buzz(20); }
  const total = st.kind === 'set' ? st.time : st.dur;
  if (!S.halfSaid && st.kind === 'work' && S.remaining <= total / 2 && total >= 20) {
    S.halfSaid = true;
    const ex = getEx(st.ex);
    say(ex?.perSide ? LINES.switchSides : LINES.halfway, { interrupt: false });
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
  if (S.paused) { S.pauseAt = Date.now(); clay?.pause(); say(LINES.paused); }
  else { S.pausedMs += Date.now() - (S.pauseAt || Date.now()); S.pauseAt = null; S.last = performance.now(); clay?.play(); }
  paintControls();
  paintMode();
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
    return `<div class="p-progress"><i class="cur" id="curSeg" style="--p:${(curWork / ws.length).toFixed(3)}"></i></div>`;
  }
  return `<div class="p-progress">${ws.map((s) => {
    const idx = S.steps.indexOf(s);
    const cls = idx < S.idx ? 'done' : idx === S.idx ? 'cur' : '';
    return `<i class="${cls}" ${idx === S.idx ? 'id="curSeg"' : ''}></i>`;
  }).join('')}</div>`;
}

let quipN = 0;
function showQuip(char) {
  const el = $('#pQuip', root);
  if (!el || !char) return;
  el.innerHTML = `<span class="who">${char.emoji} ${esc(nameOf(char))}</span>${esc(quipFor(char.id, quipN++))}`;
  el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
  clearTimeout(showQuip.t);
  showQuip.t = setTimeout(() => el.classList.remove('in'), 3200);
}

function paint() {
  if (!root) return;
  const st = cur();
  const exId = stageEx();
  const ex = getEx(exId);
  const player = $('.player', root);
  paintMode();
  player.classList.toggle('ready', st.kind === 'ready');
  player.dataset.kind = st.kind === 'set' && !st.isTime ? 'reps' : 'timed';
  $('#pTop', root).innerHTML = `<button class="icon-btn glass" id="quit" aria-label="End workout">${icon('x')}</button>${progressBar()}<button class="icon-btn glass" id="ovw" aria-label="All exercises">${icon('list')}</button><button class="icon-btn glass" id="snd" aria-label="Toggle sound">${icon(store.settings().sound ? 'volume' : 'mute')}</button>`;
  // stage
  const char = characterFor(ex);
  if (!clay) {
    clay = window.__pulsePlayer = new ClayPlayer($('#pClay', root), ex, { look: look(), boil: store.settings().stopMotion, fps: store.settings().stopMotion ? 12 : 0, safe: hudSafe(), noStill: true, maxDpr: 2.5, directed: true });
    clay.play();
    // before the workout: the character hangs about in their set, then gets ready for the first move
    if (st.kind === 'ready') { S.ilFor = S.idx; clay.interlude({ from: { ex }, to: { ex }, total: st.dur, wait: true }); }
    else setTimeout(() => showQuip(char), 600);
  } else if (st.kind === 'ready') {
    if (S.ilFor !== S.idx) { S.ilFor = S.idx; clay.interlude({ from: { ex }, to: { ex }, total: st.dur, wait: true }); }
  } else if (st.kind === 'rest' && prevWorkEx()) {
    // rest = a little film: handover to the next character, or a breather, then getting ready
    if (S.ilFor !== S.idx) {
      S.ilFor = S.idx;
      clay.interlude({ from: { ex: getEx(prevWorkEx()) }, to: { ex }, total: st.dur });
    }
  } else if (clay.ex.id !== ex.id || clay.inInterlude) {
    const changedChar = characterFor(clay.ex).id !== char.id;
    // coming out of a rest-period film the scene is already in place: the camera eases into the
    // move's framing, so skip the squish pop and the extra quip (they just spoke in the film)
    const fromFilm = clay.inInterlude;
    S.ilFor = null;
    clay.setExercise(ex);
    const stg = $('#pClay', root);
    stg.classList.remove('squish', 'slide-l', 'slide-r'); void stg.offsetWidth;
    if (S.swipeDir || !fromFilm) stg.classList.add(S.swipeDir ? (S.swipeDir > 0 ? 'slide-l' : 'slide-r') : 'squish');
    S.swipeDir = 0;
    if (!fromFilm && (changedChar || st.kind !== 'rest')) showQuip(char);
  }
  clay.speed = st.kind === 'work' || st.kind === 'set' || clay.inInterlude ? 1 : 0.6;
  if (S.paused) clay.pause(); else clay.play();
  // the drawer already says what's happening; only a round counter earns a chip
  $('#pChips', root).innerHTML = st.kind === 'work' && st.rounds > 1 ? `<span class="pill glass">Round ${st.round + 1}/${st.rounds}</span>` : '';
  // name + sub
  let sub = '';
  if (st.kind === 'rest') sub = st.label || (S.w.mode === 'sets' && st.nextSet ? `Up next: set ${st.nextSet + 1}` : 'Up next');
  else if (st.kind === 'ready') sub = 'First up';
  else if (st.kind === 'set' && !st.isTime) sub = `${ex.perSide ? 'Per side · ' : ''}${ex.primary.map((m) => MUSCLES[m]).join(', ')}`;
  else if (st.kind === 'set') sub = 'Get set, then tap play';
  else sub = ex.primary.map((m) => MUSCLES[m]).join(' · ');
  if (st.kind === 'rest') {
    // rest: one clear "up next" (the footer line would only repeat it)
    const nx = upcoming();
    const eyebrow = st.label || (S.w.mode === 'sets' && st.nextSet ? `Up next · set ${st.nextSet + 1}` : 'Up next');
    $('#pName', root).innerHTML = `<div class="p-name">${esc(ex.name)}</div><div class="p-upnext"><b>${esc(eyebrow)}</b>${nx ? ` · ${esc(nx.label)}` : ''}</div>`;
  } else $('#pName', root).innerHTML = `<div class="p-name">${esc(ex.name)}</div><div class="p-sub">${esc(sub)}</div>`;
  // centre
  const center = $('#pCenter', root);
  if (st.kind === 'set' && !st.isTime) center.innerHTML = setLogger(st, ex);
  else if (st.kind === 'set' && st.isTime && !S.timing) center.innerHTML = timeSetIntro(st);
  else center.innerHTML = st.kind === 'set' ? `<button class="chip glass" id="doneEarly">${icon('check')} Done</button>` : '';
  paintTimer();
  paintControls();
  // next up
  const nx = upcoming();
  if (st.kind === 'set') {
    $('#pNext', root).innerHTML = `<div class="p-setmeta">${setDots(st)}<button class="link small" id="addSet">${icon('plus')} Set</button></div>${S.hint && st.set === 0 ? `<div class="hint">💡 ${esc(S.hint)}</div>` : nx ? `<div class="muted small">Next: ${esc(exName(nx.ex))}</div>` : ''}`;
    $('#addSet', root)?.addEventListener('click', addSet);
  } else {
    $('#pNext', root).innerHTML = st.kind === 'rest' ? `<button class="chip glass" id="add15">+15s</button><button class="chip glass" id="skipRest">Skip ${icon('next')}</button>` : nx ? `<span class="tiny muted bold">NEXT</span> <b>${esc(exName(nx.ex))}</b> <span class="muted small">· ${nx.label}</span>` : '<b>🏁 Final stretch!</b>';
  }
  bindCenter(st, ex);
  requestAnimationFrame(updateSafe);
}

// the move that was just performed (for rest-period handovers)
function prevWorkEx(at = S.idx) {
  for (let i = at - 1; i >= 0; i--) {
    const s = S.steps[i];
    if (s.kind === 'work' || s.kind === 'set') return s.ex;
    if (s.kind === 'ready') return null;
  }
  return null;
}

function upcoming() {
  for (let i = S.idx + 1; i < S.steps.length; i++) {
    const s = S.steps[i];
    if (s.kind === 'work') return { ex: s.ex, label: `${s.dur}s${s.rounds > 1 ? ` · round ${s.round + 1}` : ''}` };
    if (s.kind === 'set') return { ex: s.ex, label: `Set ${s.set + 1}/${s.sets} · ${s.isTime ? s.time + 's' : s.reps + ' reps'}` };
  }
  return null;
}

function setDots(st) {
  const e = S.log[st.entry];
  return `<div class="set-dots">${Array.from({ length: st.sets }, (_, i) => `<i class="${e.sets[i]?.done ? 'done' : i === st.set ? 'cur' : ''}"></i>`).join('')}</div>`;
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
  S.hint = sug?.note || '';
  return `<div class="p-logrow">
      <div class="p-step">${stepper('reps', r, { step: 1, min: 0, max: 200, unit: 'reps', label: 'Reps' })}</div>
      ${weighted ? `<div class="p-step">${stepper('weight', w, { step: u === 'lb' ? 5 : 2.5, min: 0, max: 1000, unit: u, decimals: 1, label: 'Weight' })}</div>` : ''}
    </div>`;
}

function timeSetIntro() {
  return '';
}

function bindCenter(st) {
  const c = $('#pCenter', root);
  bindSteppers(c, (k, v) => { S.pending[k] = v; });
  $('#add15', root)?.addEventListener('click', () => { S.remaining += 15; cur().dur += 15; paintTimer(); });
  $('#skipRest', root)?.addEventListener('click', next);
  $('#doneEarly', c)?.addEventListener('click', () => completeTimed());
}

// giant 3-2-1 over the scene during get-ready
function bigCount(txt, cls = '') {
  const el = root && $('#pCount', root);
  if (!el) return;
  clearTimeout(bigCount.t);
  if (!txt) { el.innerHTML = ''; return; }
  el.innerHTML = `<b class="${cls}">${txt}</b>`;
  if (cls === 'go') bigCount.t = setTimeout(() => { el.innerHTML = ''; }, 900);
}

function paintTimer() {
  const st = cur();
  if (st.kind === 'ready') {
    const n = Math.max(1, Math.ceil(S.remaining));
    if (n !== S.countShown) { S.countShown = n; bigCount(String(n), 'n' + n); }
  }
  const el = $('#pRing', root);
  paintBars();
  if (!el) return;
  const reps = st.kind === 'set' && !st.isTime;
  const showRing = !reps && !(st.kind === 'set' && st.isTime && !S.timing);
  // no ring: the time sits big and translucent under the top HUD, and the drawer fills up as it runs
  const timed = showRing && st.kind !== 'ready';
  const clock = $('#pClock', root);
  if (clock) clock.textContent = timed ? mmss(Math.ceil(Math.max(0, S.remaining))) : '';
  el.innerHTML = showRing ? '' : reps ? `<div class="p-reps"><b>${st.reps}</b><span>reps</span></div>` : `<div class="p-reps"><b>${mmss(st.time)}</b><span>hold</span></div>`;
}

// the progress fills run every frame, eased between the 200ms timer ticks, so they glide instead of stepping
function paintBars() {
  const st = cur();
  if (!st || !root) return;
  const total = st.kind === 'set' ? st.time : st.dur;
  const running = !S.paused && S.timing && S.last;
  const left = Math.max(0, S.remaining - (running ? Math.min(0.25, (performance.now() - S.last) / 1000) : 0));
  const p = total ? Math.min(1, 1 - left / total) : 0;
  const seg = $('#curSeg', root);
  if (seg) seg.style.setProperty('--p', st.kind === 'rest' ? 0 : p.toFixed(4));
  const timed = st.kind !== 'ready' && !(st.kind === 'set' && (!st.isTime || !S.timing));
  $('#pBgFill', root)?.setAttribute('width', timed ? `${(p * 100).toFixed(3)}%` : '0');
}
function barLoop() {
  if (!S || !root) { barLoop.raf = 0; return; }
  paintBars();
  barLoop.raf = requestAnimationFrame(barLoop);
}

// rests and pauses open the drawer up with a big word cut out of it (REST / PAUSED)
function paintMode() {
  const st = cur();
  const player = root && $('.player', root);
  if (!st || !player) return;
  const word = S.paused ? 'PAUSED' : st.kind === 'rest' ? 'REST' : '';
  player.classList.toggle('resting', st.kind === 'rest');
  player.classList.toggle('paused', !!S.paused);
  player.classList.toggle('worded', !!word);
  const el = $('#pBgWord', root);
  if (el) {
    const size = Math.round(Math.min(word.length > 4 ? 96 : 132, window.innerWidth * (word.length > 4 ? 0.2 : 0.3)));
    el.textContent = word;
    el.setAttribute('font-size', size);
    el.setAttribute('y', Math.round(size * 0.8 + 6));
    $('.p-hud-bottom', root).style.setProperty('--rw', size + 'px');
  }
  requestAnimationFrame(updateSafe);
}

function paintControls() {
  const st = cur();
  const c = $('#pControls', root);
  let main;
  if (st.kind === 'set' && !st.isTime) main = `<button class="p-main" id="pMain" aria-label="Complete set">${icon('check')}</button>`;
  else if (st.kind === 'set' && st.isTime && !S.timing) main = `<button class="p-main" id="pMain" aria-label="Start timer">${icon('play')}</button>`;
  else main = `<button class="p-main" id="pMain" aria-label="${S.paused ? 'Resume' : 'Pause'}">${icon(S.paused ? 'play' : 'pause')}</button>`;
  c.innerHTML = `<button class="icon-btn" id="pPrev" aria-label="Previous">${icon('prev')}</button>${main}<button class="icon-btn" id="pSkip" aria-label="Skip">${icon('next')}</button>`;
  $('#pPrev', c).onclick = () => goPrev();
  $('#pSkip', c).onclick = () => goNext();
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
      S.timing = true; S.last = performance.now(); beep.go(); say(LINES.go); paint();
    } else togglePause();
  };
}

function goNext(swipe = false) {
  const st = cur();
  // bailing out of a move early counts as a skip (feeds the move-library refresh)
  if (st.kind === 'work' && !st.warm && S.stepElapsed < st.dur * 0.5) logSkip(st.ex);
  if (st.kind === 'set' && !S.log[st.entry].sets[st.set]?.done) logSkip(st.ex);
  if (st.kind === 'work') logWork(st, st.dur - Math.max(0, S.remaining));
  S.swipeDir = swipe ? 1 : 0;
  next();
}
function goPrev(swipe = false) {
  S.swipeDir = swipe ? -1 : 0;
  prev();
}

// camera safe area = whatever the floating HUD leaves visible
function hudSafe() {
  if (!root) return { top: 0.1, bottom: 0.25 };
  const H = window.innerHeight || 800;
  const t = $('.p-hud-top', root)?.getBoundingClientRect();
  const c = $('#pClock', root);
  const cb = c?.textContent ? c.getBoundingClientRect().bottom : 0;
  const b = $('.p-hud-bottom', root)?.getBoundingClientRect();
  return { top: Math.min(0.2, t ? (Math.max(t.bottom, cb) + 6) / H : 0.1), bottom: Math.min(0.34, b ? (H - b.top + 8) / H : 0.25) };
}
function updateSafe() {
  if (!clay || !root) return;
  const s = hudSafe();
  if (Math.abs(s.top - (S._safe?.top || 0)) > 0.005 || Math.abs(s.bottom - (S._safe?.bottom || 0)) > 0.005) {
    S._safe = s;
    clay.setSafe(s);
  }
}

function addSet() {
  const st = cur();
  if (st.kind !== 'set') return;
  let last = S.idx;
  for (let i = S.idx; i < S.steps.length; i++) if (S.steps[i].kind === 'set' && S.steps[i].entry === st.entry) last = i;
  const n = st.sets + 1;
  S.steps.forEach((x) => { if (x.kind === 'set' && x.entry === st.entry) x.sets = n; });
  const restDur = S.steps[S.idx + 1]?.kind === 'rest' ? S.steps[S.idx + 1].dur : store.settings().moveRest ?? 10;
  const nextSet = { ...S.steps[last], set: n - 1, sets: n };
  S.steps.splice(last + 1, 0, { kind: 'rest', dur: restDur, next: st.ex, nextSet: n - 1 }, nextSet);
  // keep the original "rest before next exercise" after the new set
  toast(`Set ${n} added`, { icon: '➕', ms: 1500 });
  paint();
  persist();
}

function overview() {
  const was = S.paused;
  const rows = S.log.map((e, i) => {
    const total = S.steps.filter((x) => (x.kind === 'set' || x.kind === 'work') && x.entry === i).length;
    const done = e.sets.filter((x) => x?.done).length;
    const curE = cur().entry === i;
    return `<button class="li" data-entry="${i}" style="${curE ? 'box-shadow:var(--sh-clay),0 0 0 3px var(--primary)' : ''}"><div class="li-thumb">${thumb(e.ex)}</div><div class="li-main"><div class="li-title">${e.warm ? '🔥 ' : ''}${esc(exName(e.ex))}</div><div class="li-sub">${done}/${total} ${S.w.mode === 'sets' && !e.warm ? 'sets' : 'intervals'} done</div></div>${done >= total ? icon('check') : icon('chev', 'chev')}</button>`;
  }).join('');
  sheet(`<div class="dialog"><h3>Workout overview</h3><p class="muted small">Tap an exercise to jump to it.</p><div class="list">${rows}</div></div>`, {
    onMount(el, close) {
      $$('[data-entry]', el).forEach((b) => (b.onclick = async () => {
        const i = +b.dataset.entry;
        await close();
        let target = S.steps.findIndex((x) => (x.kind === 'set' && x.entry === i && !S.log[i].sets[x.set]?.done));
        if (target < 0) target = S.steps.findIndex((x) => (x.kind === 'work' || x.kind === 'set') && x.entry === i && x.round >= (S.log[i].sets.length || 0));
        if (target < 0) target = S.steps.findIndex((x) => (x.kind === 'work' || x.kind === 'set') && x.entry === i);
        if (target >= 0) enterStep(target);
        if (!was && S.paused) togglePause(false);
      }));
    },
  });
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
  // whoever performed the last move takes the bow on the summary screen
  const lastEx = getEx(prevWorkEx(S.idx + 1) || stageEx());
  if (lastEx) session.star = characterFor(lastEx).id;
  session.prs = stats.findPRs(session);
  for (const e of entries) logDone(e.ex);
  await store.addSession(session);
  await store.set('active', null);
  setFresh(stats.evaluateBadges());
  beep.done();
  say(early ? LINES.saved : LINES.complete);
  keepVoice = true; // let the closing line finish over the summary
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
    return `<div class="player fs">
      <div class="clay-stage p-canvas" id="pClay"></div>
      <div class="p-hud-top"><div class="p-top" id="pTop"></div><div class="p-chips" id="pChips"></div></div>
      <div class="p-quip" id="pQuip" aria-live="polite"></div>
      <div class="p-count" id="pCount" aria-live="assertive"></div>
      <div class="p-swipe-hint" id="pHint">${icon('prev')} swipe to change moves ${icon('next')}</div>
      <div class="p-clock" id="pClock" aria-live="off"></div>
      <div class="p-hud-bottom">
        <svg class="p-bg" aria-hidden="true"><defs><mask id="pBgMask"><rect width="100%" height="100%" fill="#fff"/><text id="pBgWord" x="50%" text-anchor="middle" fill="#000"></text></mask></defs>
          <g mask="url(#pBgMask)"><rect class="p-bg-base" width="100%" height="100%"/><rect class="p-bg-fill" id="pBgFill" width="0" height="100%"/></g></svg>
        <div class="p-row1"><div class="grow" id="pName"></div><div id="pRing"></div></div>
        <div class="p-center" id="pCenter"></div>
        <div class="p-row3"><div class="p-controls" id="pControls"></div><div class="p-next" id="pNext"></div></div>
      </div>
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
      S = { id, w, steps: buildSteps(w), log: buildLog(w), start: Date.now(), pausedMs: 0, activeSec: {}, paused: false };
      enterStep(0);
    }
    S.last = performance.now();
    prefetchVoice([...S.steps.flatMap((st, i) => cueParts(st, i)), LINES.halfway, LINES.switchSides, LINES.paused, LINES.go, LINES.saved, LINES.complete].filter(Boolean));
    timer = setInterval(tick, 200);
    cancelAnimationFrame(barLoop.raf);
    barLoop.raf = requestAnimationFrame(barLoop);
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
      if (e.target.closest('#ovw')) overview();
      if (e.target.closest('#snd')) {
        const on = !store.settings().sound;
        store.setSetting('sound', on);
        store.setSetting('voice', on);
        e.target.closest('#snd').innerHTML = icon(store.settings().sound ? 'volume' : 'mute');
        if (!store.settings().sound) hush();
      }
    });
    const onKey = (e) => {
      if (!S || e.target.matches('input')) return;
      if (e.key === ' ') { e.preventDefault(); $('#pMain', root)?.click(); }
      if (e.key === 'ArrowRight') $('#pSkip', root)?.click();
      if (e.key === 'ArrowLeft') $('#pPrev', root)?.click();
    };
    document.addEventListener('keydown', onKey);
    // swipe left/right on the scene to skip between moves
    let sx = null, sy = 0, st0 = 0;
    const stageEl = $('#pClay', el);
    stageEl.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; st0 = Date.now(); });
    stageEl.addEventListener('pointerup', (e) => {
      if (sx == null || !S) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      sx = null;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4 && Date.now() - st0 < 800) {
        buzz(15);
        if (dx < 0) goNext(true); else goPrev(true);
        try { localStorage.setItem('pulse:swiped', '1'); } catch { /* ignore */ }
        $('#pHint', el)?.classList.remove('in');
      }
    });
    stageEl.addEventListener('pointercancel', () => (sx = null));
    try { if (!localStorage.getItem('pulse:swiped')) setTimeout(() => $('#pHint', el)?.classList.add('in'), 2500); } catch { /* ignore */ }
    const onResize = () => { paintMode(); paintTimer(); };
    window.addEventListener('resize', onResize);
    return () => {
      clearInterval(timer);
      cancelAnimationFrame(barLoop.raf);
      window.removeEventListener('popstate', onPop);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      keepAwake.wanted = false;
      keepAwake(false);
      if (!keepVoice) hush();
      keepVoice = false;
      clay?.destroy(); clay = null;
      if (S && !S.finished) persist();
      S = null; root = null;
    };
  },
};
