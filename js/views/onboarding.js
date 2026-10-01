// SillySweatClub — first-run onboarding.
import * as store from '../store.js';
import { EQUIPMENT } from '../exercises.js';
import { generatePlan, getWorkout } from '../workouts.js';
import { esc, icon, $, $$, thumb, hydrateThumbs } from '../ui.js';
import { CAST, CAST_BY_ID, lookFromColors } from '../cast.js';
import { go } from '../app.js';
import { unlock } from '../audio.js';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const GOALS = [
  ['fit', '🌟', 'Stay active', 'Feel good & build a habit'],
  ['lose', '🔥', 'Burn fat', 'Sweaty cardio + strength'],
  ['strength', '💪', 'Get strong', 'Lift more, build muscle'],
  ['mobility', '🧘', 'Move better', 'Flexibility & recovery'],
];
const LEVELS = [
  ['beginner', '🌱', 'Beginner', 'New or returning'],
  ['intermediate', '🌿', 'Intermediate', 'Train now & then'],
  ['advanced', '🌳', 'Advanced', 'Train regularly'],
];
const EQUIP = ['dumbbell', 'kettlebell', 'barbell', 'bench', 'pullupbar', 'chair', 'rope'];
const EQUIP_EMOJI = { dumbbell: '🏋️', kettlebell: '🔔', barbell: '🏋️‍♀️', bench: '🛋️', pullupbar: '🧗', chair: '🪑', rope: '🪢' };

let st = null;
let clay = null;

// Who floats around the welcome screen, and what silly thing they're doing
const FLOATERS = [['pip', 'celebrate'], ['jolene', 'jumping-jack'], ['bruno', 'flex'], ['dee', 'shadow-box'], ['fern', 'arm-circles'], ['merlin', 'wave'], ['bao', 'butt-kick']];
// [x%, y%, drift x, drift y, start rot, end rot, seconds, scale]
const SLOTS = [
  [6, 4, 18, 10, -18, 12, 9, 0.9], [62, 2, -16, 14, 20, -8, 11, 0.8], [70, 30, -22, -12, 90, 70, 13, 0.75], [-6, 30, 20, 14, -95, -70, 12, 0.8],
  [40, 62, 12, -16, 170, 200, 14, 0.7], [-2, 66, 22, -8, 12, -14, 10, 0.95], [66, 66, -14, -14, -16, 22, 9.5, 0.9], [30, -6, 10, 12, 175, 150, 15, 0.62],
  [20, 40, -10, 16, 40, 65, 16, 0.55], [52, 44, 14, 10, -45, -20, 12.5, 0.6],
];

function step0() {
  return `<div class="welcome">
    <div class="wl-float" id="wlFloat" aria-hidden="true">${SLOTS.map((sl, i) => {
      const [x, y, dx, dy, r0, r1, dur, sc] = sl;
      return `<div class="wl-sprite" style="left:${x}%;top:${y}%;--dx:${dx}vw;--dy:${dy}vh;--r0:${r0}deg;--r1:${r1}deg;--dur:${dur}s;--s:${sc};--del:${(-i * 1.7).toFixed(1)}s;${i % 3 === 1 ? '--flip:-1;' : ''}" data-slot="${i}"><img alt="" draggable="false"></div>`;
    }).join('')}</div>
    <div class="wl-center">
      <h1 class="ssc-logo" aria-label="SillySweatClub"><span class="w silly">Silly</span><span class="w sweat">Sweat</span><span class="w club">Club</span><i class="drop d1"></i><i class="drop d2"></i><i class="drop d3"></i></h1>
      <p class="wl-tag">Seven clay misfits. Zero judgement.<br>Your sweat stays on your phone.</p>
    </div>
    <button class="btn big wl-join" data-next>Join Them</button>
  </div>`;
}

let floatTimer = null;
async function startFloaters(root) {
  const slots = $$('.wl-sprite', root);
  const { spriteFrames } = await import('../ui.js');
  const frames = new Map();
  let tick = 0;
  clearInterval(floatTimer);
  floatTimer = setInterval(() => {
    tick++;
    slots.forEach((el, i) => {
      const f = frames.get(i % FLOATERS.length);
      if (!f) return;
      const img = el.firstElementChild;
      const src = f[(tick + i) % f.length];
      if (img.src !== src) img.src = src;
      el.classList.add('in');
    });
  }, 1000 / 7);
  for (let k = 0; k < FLOATERS.length; k++) {
    if (!floatTimer || !root.isConnected) return;
    const [who, ex] = FLOATERS[k];
    try { frames.set(k, await spriteFrames(ex, who, 4)); } catch { /* skip */ }
  }
}

function choiceGrid(list, key, multi = false) {
  return `<div class="choice-grid">${list.map(([id, e, t, d]) => {
    const on = multi ? st[key].includes(id) : st[key] === id;
    return `<button class="choice ${on ? 'on' : ''}" data-${key}="${id}"><span class="e">${e}</span><b>${esc(t)}</b>${d ? `<span>${esc(d)}</span>` : ''}</button>`;
  }).join('')}</div>`;
}

const steps = [
  { html: step0 },
  {
    html: () => `<div class="onb-body"><h1>What should we call you?</h1><p class="muted">Just for greetings. It never leaves this device.</p>
      <input class="input" id="name" maxlength="24" placeholder="Your name" value="${esc(st.name)}" autocomplete="given-name"></div>
      <button class="btn primary big block" data-next>Continue</button>`,
    mount(root) { const i = $('#name', root); setTimeout(() => i.focus(), 300); i.oninput = () => (st.name = i.value.trim()); i.onkeydown = (e) => { if (e.key === 'Enter') next(); }; },
  },
  {
    html: () => {
      const c = CAST_BY_ID[st.me];
      return `<div class="onb-body"><h1>Pick your clay twin</h1><p class="muted">They’ll take your name${st.name ? `, ${esc(st.name)}` : ''}, and you can recolour them later in You.</p>
      <div class="cast-pick big">${CAST.map((x) => `<button class="cast-pick-b ${x.id === st.me ? 'on' : ''}" data-me="${x.id}">${thumb('wave', '', { portrait: true, char: x.id })}<span>${x.id === st.me ? esc(st.name || 'You') : esc(x.name)}</span></button>`).join('')}</div>
      <div class="card tight"><b>${c.emoji} ${esc(st.name || 'You')}</b> <span class="muted small">· cast as ${esc(c.name)}</span><p class="muted small">${esc(c.tagline)}</p>
      <textarea class="input mt" id="bio" rows="3" maxlength="240" placeholder="Describe your character… (${esc(c.bio.slice(0, 60))}…)">${esc(st.bio)}</textarea></div></div>
      <button class="btn primary big block" data-next>That’s me!</button>`;
    },
    mount(root) {
      $$('[data-me]', root).forEach((b) => (b.onclick = () => { st.me = b.dataset.me; paint(); }));
      $('#bio', root).oninput = (e) => (st.bio = e.target.value);
      hydrateThumbs(root);
    },
  },
  { html: () => `<div class="onb-body"><h1>What’s your main goal?</h1>${choiceGrid(GOALS, 'goal')}</div><button class="btn primary big block" data-next>Continue</button>` },
  { html: () => `<div class="onb-body"><h1>How fit do you feel?</h1><p class="muted">We’ll pick routines that match. You can change it anytime.</p>${choiceGrid(LEVELS, 'level')}</div><button class="btn primary big block" data-next>Continue</button>` },
  {
    html: () => `<div class="onb-body"><h1>Any equipment?</h1><p class="muted">Bodyweight workouts are always included. Tap what you have.</p>
      ${choiceGrid(EQUIP.map((q) => [q, EQUIP_EMOJI[q], EQUIPMENT[q], '']), 'equipment', true)}</div>
      <button class="btn primary big block" data-next>${st.equipment.length ? 'Continue' : 'Just my body'}</button>`,
  },
  {
    html: () => `<div class="onb-body"><h1>Which days work for you?</h1><p class="muted">Pick your training days — we’ll build a weekly plan around them.</p>
      <div class="daypick">${DAYS.map((d, i) => `<button class="${st.days.includes(i) ? 'on' : ''}" data-day="${i}" aria-label="${DAY_NAMES[i]}">${d}</button>`).join('')}</div>
      <p class="center bold">${st.days.length} day${st.days.length === 1 ? '' : 's'} a week</p></div>
      <button class="btn primary big block" data-next ${st.days.length ? '' : 'disabled'}>Continue</button>`,
  },
  {
    html: () => `<div class="onb-body"><h1>A couple of details</h1><p class="muted">Used for weights and calorie estimates. Optional.</p>
      <div class="seg" id="units"><button class="${st.units === 'kg' ? 'on' : ''}" data-u="kg">Kilograms</button><button class="${st.units === 'lb' ? 'on' : ''}" data-u="lb">Pounds</button></div>
      <label class="col gap-s"><span class="bold">Body weight (${st.units})</span><input class="input" id="bw" type="number" inputmode="decimal" placeholder="e.g. ${st.units === 'kg' ? 70 : 155}" value="${st.bw || ''}"></label></div>
      <button class="btn primary big block" data-next>Build my plan</button>`,
    mount(root) {
      $$('#units button', root).forEach((b) => (b.onclick = () => { st.units = b.dataset.u; paint(); }));
      $('#bw', root).oninput = (e) => (st.bw = e.target.value);
    },
  },
  {
    html: () => {
      const plan = generatePlan(st);
      const rows = Object.entries(plan).map(([d, id]) => {
        const w = getWorkout(id);
        return `<div class="li"><div class="emoji-badge" style="background:${w.color}">${w.emoji}</div><div class="li-main"><div class="li-title">${esc(w.name)}</div><div class="li-sub">${FULL_DAYS[d]} · ${esc(w.focus)}</div></div></div>`;
      }).join('');
      return `<div class="onb-body"><h1>Your plan is ready${st.name ? ', ' + esc(st.name) : ''}! 🎉</h1><p class="muted">Here’s your week. Swap anything later from the You tab.</p><div class="list">${rows}</div></div>
      <button class="btn primary big block" data-finish>Let’s get silly</button>`;
    },
  },
];

function paint() {
  const root = $('#onb');
  if (!root) return;
  clay?.destroy(); clay = null;
  const s = steps[st.i];
  clearInterval(floatTimer); floatTimer = null;
  root.classList.toggle('is-welcome', st.i === 0);
  if (st.i === 0) {
    root.innerHTML = s.html();
    root.querySelector('[data-next]').addEventListener('click', next);
    startFloaters(root);
    return;
  }
  root.innerHTML = `<div class="row between">${st.i ? `<button class="icon-btn flat" data-back aria-label="Back">${icon('back')}</button>` : '<span></span>'}
    <div class="dots">${steps.map((_, i) => `<i class="${i === st.i ? 'on' : ''}"></i>`).join('')}</div><span style="width:44px"></span></div>${s.html()}`;
  root.querySelector('[data-next]')?.addEventListener('click', next);
  root.querySelector('[data-back]')?.addEventListener('click', () => { st.i--; paint(); });
  root.querySelector('[data-finish]')?.addEventListener('click', finish);
  $$('[data-goal]', root).forEach((b) => (b.onclick = () => { st.goal = b.dataset.goal; next(); }));
  $$('[data-level]', root).forEach((b) => (b.onclick = () => { st.level = b.dataset.level; next(); }));
  $$('[data-equipment]', root).forEach((b) => (b.onclick = () => {
    const q = b.dataset.equipment;
    st.equipment = st.equipment.includes(q) ? st.equipment.filter((x) => x !== q) : [...st.equipment, q];
    paint();
  }));
  $$('[data-day]', root).forEach((b) => (b.onclick = () => {
    const d = +b.dataset.day;
    st.days = st.days.includes(d) ? st.days.filter((x) => x !== d) : [...st.days, d].sort();
    paint();
  }));
  s.mount?.(root);
}

function next() {
  unlock();
  st.i = Math.min(steps.length - 1, st.i + 1);
  paint();
}

async function finish() {
  const bw = parseFloat(st.bw);
  const kg = bw ? (st.units === 'lb' ? bw * 0.4536 : bw) : null;
  const profile = { name: st.name || '', goal: st.goal, level: st.level, equipment: st.equipment, days: st.days, weightKg: kg, created: Date.now() };
  await store.set('profile', profile);
  await store.set('plan', generatePlan(st));
  await store.set('settings', { ...store.settings(), units: st.units, weeklyGoal: Math.max(1, st.days.length), me: { id: st.me, bio: (st.bio || '').trim() }, look: lookFromColors(CAST_BY_ID[st.me].colors) });
  if (bw) await store.addWeight({ date: Date.now(), kg, value: bw });
  go('/', { replace: true });
}

export const view = {
  immersive: true,
  title: 'Welcome',
  render() {
    st = { i: 0, name: '', me: 'pip', bio: '', goal: 'fit', level: 'beginner', equipment: [], days: [1, 3, 5], units: navigator.language === 'en-US' ? 'lb' : 'kg', bw: '' };
    return '<div class="onb" id="onb"></div>';
  },
  mount() {
    paint();
    return () => { clay?.destroy(); clay = null; clearInterval(floatTimer); floatTimer = null; };
  },
};
