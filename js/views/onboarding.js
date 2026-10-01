// Pulse — first-run onboarding.
import * as store from '../store.js';
import { ClayPlayer, DEFAULT_LOOK } from '../clay.js';
import { getEx, EQUIPMENT } from '../exercises.js';
import { generatePlan, getWorkout } from '../workouts.js';
import { esc, icon, $, $$ } from '../ui.js';
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

function step0() {
  return `<div class="onb-body center">
    <div class="logo" style="justify-content:center"><img src="icons/icon.svg" width="48" height="48" alt="">Pulse</div>
    <div class="splash-clay" id="onbClay"></div>
    <h1>Meet your clay coach</h1>
    <p class="muted">Guided workouts, hand-sculpted moves and smart tracking. Everything stays on your phone — no account, no cloud.</p>
  </div>
  <button class="btn primary big block" data-next>Let’s get moving</button>`;
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
      <button class="btn primary big block" data-finish>Start Pulse</button>`;
    },
  },
];

function paint() {
  const root = $('#onb');
  if (!root) return;
  clay?.destroy(); clay = null;
  const s = steps[st.i];
  root.innerHTML = `<div class="row between">${st.i ? `<button class="icon-btn flat" data-back aria-label="Back">${icon('back')}</button>` : '<span></span>'}
    <div class="dots">${steps.map((_, i) => `<i class="${i === st.i ? 'on' : ''}"></i>`).join('')}</div><span style="width:44px"></span></div>${s.html()}`;
  const el = $('#onbClay', root);
  if (el) { clay = new ClayPlayer(el, getEx('wave'), { look: DEFAULT_LOOK }); clay.play(); }
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
  await store.set('settings', { ...store.settings(), units: st.units, weeklyGoal: Math.max(1, st.days.length) });
  if (bw) await store.addWeight({ date: Date.now(), kg, value: bw });
  go('/', { replace: true });
}

export const view = {
  immersive: true,
  title: 'Welcome',
  render() {
    st = { i: 0, name: '', goal: 'fit', level: 'beginner', equipment: [], days: [1, 3, 5], units: navigator.language === 'en-US' ? 'lb' : 'kg', bw: '' };
    return '<div class="onb" id="onb"></div>';
  },
  mount() {
    paint();
    return () => { clay?.destroy(); clay = null; };
  },
};
