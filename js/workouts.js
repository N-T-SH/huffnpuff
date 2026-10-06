// Huff n Puff — built-in routines and the weekly plan generator.
import { getEx, EXERCISES } from './exercises.js';
import * as store from './store.js';

// mode 'circuit': timed intervals (work/rest) for N rounds.
// mode 'sets': strength style — sets × reps with rest timers and weight logging.
const W = [];
const add = (o) => W.push({ builtin: true, level: 'beginner', equip: ['none'], ...o });
const c = (ex, o = {}) => ({ ex, ...o });
const s = (ex, sets, reps, rest = 60, o = {}) => ({ ex, sets, reps, rest, ...o });

add({
  id: 'starter-7', name: 'The Classic 7', emoji: '⏱️', color: '#ff6b57', focus: 'Full body', tag: 'Quick',
  desc: 'The famous science-backed 7-minute circuit. 12 moves, 30 seconds each, zero equipment.',
  mode: 'circuit', work: 30, rest: 10, rounds: 1, roundRest: 0, equip: ['none', 'chair'],
  items: [c('jumping-jack'), c('wall-sit'), c('push-up'), c('crunch'), c('squat'), c('chair-dip'), c('plank'), c('high-knees'), c('lunge'), c('knee-push-up'), c('bird-dog'), c('mountain-climber')],
});
add({
  id: 'first-steps', name: 'First Steps', emoji: '🌱', color: '#5bc46a', focus: 'Full body', tag: 'Beginner',
  desc: 'A gentle full-body intro. Low impact, lots of rest, big confidence boost.',
  mode: 'circuit', work: 30, rest: 30, rounds: 2, roundRest: 60,
  items: [c('march'), c('squat'), c('wall-push-up'), c('glute-bridge'), c('bird-dog'), c('dead-bug')],
});
add({
  id: 'bw-strength', name: 'Bodyweight Strength', emoji: '💪', color: '#8f7cff', focus: 'Full body', level: 'intermediate',
  desc: 'Classic sets and reps with nothing but your body. Track reps and beat them next time.',
  mode: 'sets',
  items: [s('push-up', 3, 10, 60), s('squat', 3, 15, 60), s('lunge', 3, 10, 60), s('superman', 3, 12, 45), s('glute-bridge', 3, 15, 45), s('plank', 3, 0, 45, { time: 40 })],
});
add({
  id: 'hiit-burn', name: 'HIIT Burner', emoji: '🔥', color: '#ff8a3d', focus: 'Cardio', level: 'intermediate', tag: 'Sweaty',
  desc: '40 seconds on, 20 off. Three rounds of heart-pumping intervals.',
  mode: 'circuit', work: 40, rest: 20, rounds: 3, roundRest: 60,
  items: [c('burpee'), c('mountain-climber'), c('jump-squat'), c('high-knees'), c('shadow-box')],
});
add({
  id: 'core-crusher', name: 'Core Crusher', emoji: '🧱', color: '#8f7cff', focus: 'Core', level: 'intermediate',
  desc: 'Eight core moves hitting abs, obliques and deep stabilisers.',
  mode: 'circuit', work: 40, rest: 15, rounds: 2, roundRest: 45, equip: ['none', 'mat'],
  items: [c('crunch'), c('bicycle'), c('leg-raise'), c('flutter-kick'), c('plank'), c('russian-twist'), c('hollow-hold'), c('dead-bug')],
});
add({
  id: 'mobility-flow', name: 'Mobility Flow', emoji: '🧘', color: '#2ec4b6', focus: 'Mobility', tag: 'Recovery',
  desc: 'Unwind tight hips, hamstrings and spine. Perfect for rest days.',
  mode: 'circuit', work: 45, rest: 10, rounds: 1, roundRest: 0, equip: ['none', 'mat'],
  items: [c('cat-cow'), c('down-dog'), c('cobra'), c('childs-pose'), c('hip-flexor-stretch'), c('hamstring-stretch'), c('arm-circles'), c('knee-hug')],
});
add({
  id: 'desk-break', name: 'Desk Break', emoji: '🪑', color: '#4f9dff', focus: 'Mobility', tag: '5 min',
  desc: 'Undo hours of sitting in five minutes. No sweat, no mat needed.',
  mode: 'circuit', work: 40, rest: 10, rounds: 1, roundRest: 0,
  items: [c('arm-circles'), c('march'), c('squat-reach'), c('toe-touch'), c('calf-raise'), c('hamstring-stretch')],
});
add({
  id: 'morning-wake', name: 'Morning Wake-up', emoji: '☀️', color: '#ffc93c', focus: 'Full body', tag: 'Energise',
  desc: 'Get the blood flowing before coffee kicks in.',
  mode: 'circuit', work: 35, rest: 10, rounds: 1, roundRest: 0,
  items: [c('march'), c('arm-circles'), c('squat-reach'), c('inchworm'), c('jumping-jack'), c('cat-cow'), c('high-plank')],
});
add({
  id: 'bedtime-stretch', name: 'Bedtime Unwind', emoji: '🌙', color: '#3d3a6b', focus: 'Mobility', tag: 'Calm',
  desc: 'Slow stretches to calm the nervous system before sleep.',
  mode: 'circuit', work: 50, rest: 10, rounds: 1, roundRest: 0, equip: ['none', 'mat'],
  items: [c('childs-pose'), c('cat-cow'), c('knee-hug'), c('cobra'), c('hip-flexor-stretch'), c('hamstring-stretch')],
});
add({
  id: 'low-impact', name: 'Quiet Cardio', emoji: '🤫', color: '#ff7eb6', focus: 'Cardio', tag: 'No jumping',
  desc: 'Apartment-friendly cardio — no jumps, no noise, still sweaty.',
  mode: 'circuit', work: 45, rest: 15, rounds: 2, roundRest: 45,
  items: [c('march'), c('shadow-box'), c('squat-reach'), c('reverse-lunge'), c('butt-kick'), c('high-plank')],
});
add({
  id: 'abs-glutes', name: 'Abs & Glutes', emoji: '🍑', color: '#ff6b57', focus: 'Core', level: 'intermediate',
  desc: 'Sculpt your midsection and posterior chain.',
  mode: 'circuit', work: 40, rest: 15, rounds: 2, roundRest: 45, equip: ['none', 'mat'],
  items: [c('glute-bridge'), c('reverse-crunch'), c('single-leg-bridge'), c('bicycle'), c('superman'), c('v-up'), c('sumo-squat')],
});
add({
  id: 'db-upper', name: 'Dumbbell Upper Body', emoji: '🏋️', color: '#ff8a3d', focus: 'Upper body', level: 'intermediate', equip: ['dumbbell'],
  desc: 'Press, row and curl your way to a stronger upper body.',
  mode: 'sets',
  items: [s('db-press', 3, 10, 90), s('db-row', 3, 10, 90), s('floor-press', 3, 10, 90), s('bicep-curl', 3, 12, 60), s('tricep-ext', 3, 12, 60), s('front-raise', 2, 12, 60)],
});
add({
  id: 'db-lower', name: 'Dumbbell Lower Body', emoji: '🦵', color: '#2ec4b6', focus: 'Lower body', level: 'intermediate', equip: ['dumbbell'],
  desc: 'Build strong legs and glutes with a pair of dumbbells.',
  mode: 'sets',
  items: [s('goblet-squat', 4, 10, 90), s('db-rdl', 3, 10, 90), s('reverse-lunge', 3, 10, 75), s('glute-bridge', 3, 15, 60), s('calf-raise', 3, 20, 45)],
});
add({
  id: 'db-full', name: 'Dumbbell Total Body', emoji: '⚡', color: '#8f7cff', focus: 'Full body', level: 'intermediate', equip: ['dumbbell'],
  desc: 'One pair of dumbbells, every major muscle. Efficient and effective.',
  mode: 'sets',
  items: [s('goblet-squat', 3, 12, 75), s('db-press', 3, 10, 75), s('db-rdl', 3, 10, 75), s('db-row', 3, 10, 75), s('plank', 3, 0, 45, { time: 40 })],
});
add({
  id: 'push-day', name: 'Push Day', emoji: '🫸', color: '#ff6b57', focus: 'Upper body', level: 'advanced', equip: ['barbell', 'bench', 'dumbbell'],
  desc: 'Chest, shoulders and triceps. Heavy compounds then accessories.',
  mode: 'sets',
  items: [s('bb-bench', 4, 6, 150), s('bb-ohp', 3, 8, 120), s('db-bench', 3, 10, 90), s('tricep-ext', 3, 12, 60), s('push-up', 2, 15, 60)],
});
add({
  id: 'pull-day', name: 'Pull Day', emoji: '🫷', color: '#4f9dff', focus: 'Upper body', level: 'advanced', equip: ['pullupbar', 'barbell', 'dumbbell'],
  desc: 'Back and biceps. Build a wide, strong back.',
  mode: 'sets',
  items: [s('pull-up', 4, 6, 120), s('bb-row', 4, 8, 120), s('db-row', 3, 10, 75), s('hammer-curl', 3, 12, 60), s('bicep-curl', 2, 12, 60), s('dead-hang', 2, 0, 60, { time: 30 })],
});
add({
  id: 'leg-day', name: 'Leg Day', emoji: '🦿', color: '#2ec4b6', focus: 'Lower body', level: 'advanced', equip: ['barbell', 'dumbbell'],
  desc: 'Squat, hinge and lunge. Never skip it.',
  mode: 'sets',
  items: [s('bb-squat', 5, 5, 180), s('bb-deadlift', 3, 5, 180), s('reverse-lunge', 3, 10, 90), s('calf-raise', 3, 20, 60), s('wall-sit', 2, 0, 60, { time: 45 })],
});
add({
  id: 'kb-power', name: 'Kettlebell Power', emoji: '🔔', color: '#3d3a6b', focus: 'Full body', level: 'intermediate', equip: ['kettlebell'],
  desc: 'Explosive swings and squats for power and conditioning.',
  mode: 'circuit', work: 40, rest: 20, rounds: 3, roundRest: 60,
  items: [c('kb-swing'), c('goblet-squat'), c('push-up'), c('kb-swing'), c('mountain-climber')],
});
add({
  id: 'jump-rope', name: 'Rope Intervals', emoji: '🪢', color: '#ffc93c', focus: 'Cardio', level: 'intermediate', equip: ['rope'],
  desc: 'Skipping intervals mixed with bodyweight moves. Feel like a boxer.',
  mode: 'circuit', work: 45, rest: 15, rounds: 3, roundRest: 60,
  items: [c('jump-rope'), c('squat'), c('jump-rope'), c('push-up'), c('jump-rope'), c('plank')],
});
add({
  id: 'pullup-builder', name: 'Pull-up Builder', emoji: '🧗', color: '#c98b55', focus: 'Upper body', level: 'beginner', equip: ['pullupbar'],
  desc: 'Hangs, chin-ups and core work to earn your first strict pull-up.',
  mode: 'sets',
  items: [s('dead-hang', 3, 0, 60, { time: 25 }), s('chin-up', 3, 4, 120), s('superman', 3, 12, 45), s('hollow-hold', 3, 0, 45, { time: 25 })],
});

/* ---------- more variety: gentle, no-floor, glutes, arms, quick abs, tabata, lunch break ---------- */
add({
  id: 'standing-strength', name: 'Standing Strength', emoji: '🧍', color: '#22c7b4', focus: 'Full body', tag: 'No floor',
  desc: 'Every move on your feet — kind to knees and wrists, no getting down to the floor.',
  mode: 'circuit', work: 40, rest: 20, rounds: 2, roundRest: 45,
  items: [c('march'), c('squat'), c('wall-push-up'), c('calf-raise'), c('squat-reach'), c('arm-circles')],
});
add({
  id: 'apartment-cardio', name: 'Apartment Cardio', emoji: '🏠', color: '#4f9dff', focus: 'Cardio', tag: 'No jumping',
  desc: 'Heart-rate up without a single jump — the downstairs neighbours will never know.',
  mode: 'circuit', work: 40, rest: 15, rounds: 3, roundRest: 45,
  items: [c('march'), c('shadow-box'), c('squat-reach'), c('calf-raise'), c('squat')],
});
add({
  id: 'glute-lab', name: 'Glute Lab', emoji: '🍑', color: '#ff7eb6', focus: 'Lower body', level: 'intermediate',
  desc: 'Bridges, sumo squats and lunges: a focused session for strong hips and glutes.',
  mode: 'sets', equip: ['none', 'mat'],
  items: [s('glute-bridge', 3, 15, 45), s('sumo-squat', 3, 15, 60), s('reverse-lunge', 3, 10, 60), s('single-leg-bridge', 2, 10, 45), s('bird-dog', 2, 10, 30)],
});
add({
  id: 'arm-day', name: 'Arm Day', emoji: '💪', color: '#ffb21f', focus: 'Upper body', equip: ['dumbbell'],
  desc: 'Curls, extensions and presses with a pair of dumbbells. Pump guaranteed.',
  mode: 'sets',
  items: [s('bicep-curl', 3, 12, 45), s('tricep-ext', 3, 12, 45), s('hammer-curl', 3, 10, 45), s('front-raise', 2, 12, 45), s('db-press', 3, 10, 60)],
});
add({
  id: 'ten-min-abs', name: 'Ten-Minute Abs', emoji: '🎯', color: '#7b3fe4', focus: 'Core', tag: 'Quick', equip: ['none', 'mat'],
  desc: 'Six core moves, no fuss. Short enough for any day.',
  mode: 'circuit', work: 40, rest: 15, rounds: 2, roundRest: 30,
  items: [c('crunch'), c('reverse-crunch'), c('bicycle'), c('plank'), c('dead-bug'), c('hollow-hold')],
});
add({
  id: 'tabata-4', name: 'Tabata Four', emoji: '⚡', color: '#e5484d', focus: 'Cardio', level: 'advanced', tag: 'Intense',
  desc: '20 seconds all-out, 10 seconds rest, four rounds. Short and savage.',
  mode: 'circuit', work: 20, rest: 10, rounds: 4, roundRest: 60,
  items: [c('jump-squat'), c('mountain-climber'), c('high-knees'), c('burpee')],
});
add({
  id: 'lunch-break', name: 'Lunch Break Sweat', emoji: '🥪', color: '#5bc46a', focus: 'Full body', tag: 'Quick',
  desc: 'A balanced 12-minute circuit that fits between meetings.',
  mode: 'circuit', work: 35, rest: 15, rounds: 2, roundRest: 30,
  items: [c('jumping-jack'), c('squat'), c('push-up'), c('reverse-lunge'), c('plank'), c('high-knees')],
});
add({
  id: 'gentle-mobility', name: 'Gentle Joints', emoji: '🌤️', color: '#2ec4b6', focus: 'Mobility', tag: 'Gentle',
  desc: 'Slow, easy movement for stiff joints — a great recovery day.',
  mode: 'circuit', work: 45, rest: 15, rounds: 1,
  items: [c('march'), c('arm-circles'), c('cat-cow'), c('hamstring-stretch'), c('squat-reach'), c('knee-hug')],
});

export const BUILTIN_WORKOUTS = W;

/* ---------- limitations: moves to steer around (set in onboarding / profile) ---------- */
const FLOOR = ['push-up', 'knee-push-up', 'high-plank', 'plank', 'mountain-climber', 'burpee', 'inchworm', 'bird-dog', 'down-dog', 'childs-pose', 'cobra', 'cat-cow',
  'glute-bridge', 'single-leg-bridge', 'superman', 'hip-flexor-stretch', 'knee-hug', 'floor-press', 'crunch', 'sit-up', 'bicycle', 'leg-raise', 'flutter-kick',
  'hollow-hold', 'dead-bug', 'russian-twist', 'v-up', 'reverse-crunch'];
export const LIMITS = {
  knees: { label: 'Knees', emoji: '🦵', sub: 'No jumping, deep lunges or kneeling',
    avoid: ['jump-squat', 'lunge', 'reverse-lunge', 'burpee', 'jump-rope', 'high-knees', 'butt-kick', 'bb-squat', 'sumo-squat', 'goblet-squat', 'wall-sit', 'jumping-jack', 'hip-flexor-stretch', 'knee-push-up', 'childs-pose', 'bird-dog', 'mountain-climber'] },
  back: { label: 'Lower back', emoji: '🔙', sub: 'No heavy hinges or sit-ups',
    avoid: ['bb-deadlift', 'db-rdl', 'bb-row', 'db-row', 'kb-swing', 'bb-squat', 'sit-up', 'v-up', 'russian-twist', 'superman', 'toe-touch', 'leg-raise', 'flutter-kick', 'burpee'] },
  shoulders: { label: 'Shoulders', emoji: '🤷', sub: 'Nothing overhead or hanging',
    avoid: ['db-press', 'bb-ohp', 'pull-up', 'chin-up', 'dead-hang', 'chair-dip', 'tricep-ext', 'bb-bench', 'burpee', 'arm-circles', 'front-raise', 'push-up'] },
  wrists: { label: 'Wrists', emoji: '✋', sub: 'No weight on your hands',
    avoid: ['push-up', 'knee-push-up', 'wall-push-up', 'high-plank', 'mountain-climber', 'burpee', 'inchworm', 'bird-dog', 'down-dog', 'cobra', 'chair-dip', 'cat-cow'] },
  impact: { label: 'No jumping', emoji: '🔇', sub: 'Low impact only',
    avoid: ['jumping-jack', 'jump-squat', 'burpee', 'high-knees', 'butt-kick', 'jump-rope', 'mountain-climber'] },
  floor: { label: 'No floor work', emoji: '🪑', sub: 'Everything standing or seated',
    avoid: FLOOR },
};
export function limits() { return store.get('profile')?.limits || []; }
export function avoided(ids = limits()) {
  const out = new Set();
  for (const id of ids) for (const ex of LIMITS[id]?.avoid || []) out.add(ex);
  return out;
}
const REGION = { chest: 'upper', shoulders: 'upper', triceps: 'upper', biceps: 'upper', forearms: 'upper', lats: 'upper', traps: 'upper',
  quads: 'lower', hamstrings: 'lower', glutes: 'lower', calves: 'lower', adductors: 'lower', hipflexors: 'lower', abs: 'core', obliques: 'core', lowerback: 'core' };
const regionOf = (m) => REGION[m] || 'core';
const owns = (ex, owned) => ex.equip.some((q) => q === 'none' || q === 'mat' || owned.includes(q));

// safe stand-ins for a move, best first: most muscles in common, then the same part of the body,
// then the same kind of move; nothing to avoid, nothing needing kit you don't have, no thumbs-down
// moves, and moves already in the workout (used) only as a last resort
export function alternativesFor(exId, { avoid = avoided(), owned = store.get('profile')?.equipment || [], used = new Set(), n = 3 } = {}) {
  const ex = getEx(exId);
  if (!ex) return [];
  const disliked = store.settings().moveFeedback || {};
  const region = (e) => regionOf(e.primary[0]);
  const all = [...ex.primary, ...ex.secondary];
  return EXERCISES
    .filter((c2) => c2.id !== ex.id && !avoid.has(c2.id) && owns(c2, owned) && !c2.mascot && !(disliked[c2.id] < 0))
    .map((c2) => {
      const share = c2.primary.filter((m) => ex.primary.includes(m)).length * 6 + c2.primary.filter((m) => ex.secondary.includes(m)).length * 2 + c2.secondary.filter((m) => all.includes(m)).length;
      return { ex: c2, sc: share + (region(c2) === region(ex) ? 4 : 0) + (c2.cat === ex.cat ? 2 : 0) + (used.has(c2.id) ? -8 : 0) + (c2.type === ex.type ? 1 : 0) };
    })
    .sort((a, b) => b.sc - a.sc)
    .slice(0, n)
    .map((x) => x.ex);
}
// the closest safe stand-in
export function substituteFor(exId, opts = {}) {
  return alternativesFor(exId, { ...opts, n: 1 })[0] || null;
}

// a workout item doing a different move: reps stay reps, and a timed move gets a time (and back)
export function retarget(it, sub, mode) {
  const n = { ...it, ex: sub.id };
  if (mode === 'sets' && sub.type === 'time' && !it.time) { n.time = sub.time || 30; n.reps = 0; }
  if (mode === 'sets' && sub.type !== 'time' && it.time && !it.reps) { n.reps = sub.reps || 10; delete n.time; }
  return n;
}

/* ---------- your own swaps: a move swapped out of a workout stays swapped (by item position) ---------- */
export const userSwaps = (id) => (store.get('swaps') || {})[id] || {};
export function swapMove(workoutId, i, exId) {
  const all = { ...(store.get('swaps') || {}) };
  const base = allWorkouts().find((w) => w.id === workoutId);
  const map = { ...(all[workoutId] || {}) };
  if (!base?.items[i] || base.items[i].ex === exId) delete map[i]; else map[i] = exId;
  if (Object.keys(map).length) all[workoutId] = map; else delete all[workoutId];
  return store.set('swaps', all);
}
export function resetSwaps(workoutId) {
  const all = { ...(store.get('swaps') || {}) };
  delete all[workoutId];
  return store.set('swaps', all);
}
// every item remembers its place in the original workout (_i), so a swap can find it again
function applySwaps(w) {
  const map = userSwaps(w.id);
  const mine = [];
  const items = w.items.map((it, i) => {
    const sub = map[i] && getEx(map[i]);
    if (!sub) return { ...it, _i: i };
    mine.push([it.ex, sub.id]);
    return { ...retarget(it, sub, w.mode), _i: i };
  });
  return { ...w, items, mine };
}

// a copy of the workout with every move the user should avoid swapped for a safe stand-in
export function adaptWorkout(w, ids = limits()) {
  if (!w || !ids.length) return w;
  const avoid = avoided(ids);
  if (!w.items.some((it) => avoid.has(it.ex))) return w;
  const used = new Set(w.items.map((it) => it.ex));
  const swaps = [];
  const items = w.items.map((it) => {
    if (!avoid.has(it.ex)) return it;
    const sub = substituteFor(it.ex, { avoid, used });
    if (!sub) return null;
    used.add(sub.id);
    swaps.push([it.ex, sub.id]);
    return retarget(it, sub, w.mode);
  }).filter(Boolean);
  return { ...w, items: items.length ? items : w.items, swaps };
}

/* ---------- fit to the user: equipment, level, goal ---------- */
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const GOAL_FOCUS = { strength: ['Upper body', 'Lower body', 'Full body'], lose: ['Cardio', 'Full body'], mobility: ['Mobility'], fit: ['Full body', 'Core', 'Cardio'] };
export function fitsMe(w, profile = store.get('profile') || {}) {
  if (!canDo(w, profile.equipment || [])) return false;
  const lv = LEVELS.indexOf(profile.level || 'beginner');
  if (LEVELS.indexOf(w.level || 'beginner') > lv + 1) return false;
  // keeps at least half its own moves once the limits are applied (the rest get swapped)
  const avoid = avoided(profile.limits || []);
  return w.items.filter((it) => !avoid.has(it.ex)).length >= Math.ceil(w.items.length / 2);
}
// how well a workout suits the user (higher first)
export function suitScore(w, profile = store.get('profile') || {}) {
  let sc = 0;
  if ((GOAL_FOCUS[profile.goal] || []).includes(w.focus)) sc += 3;
  if ((w.level || 'beginner') === (profile.level || 'beginner')) sc += 2;
  const avoid = avoided(profile.limits || []);
  sc -= w.items.filter((it) => avoid.has(it.ex)).length;
  return sc;
}

/* ---------- warm-ups: short, easy, and tailored to the workout and the user ---------- */
const WARM_POOL = {
  default: ['march', 'arm-circles', 'squat-reach', 'inchworm', 'jumping-jack'],
  Mobility: ['march', 'arm-circles', 'cat-cow'],
  'Lower body': ['march', 'squat-reach', 'butt-kick', 'hamstring-stretch', 'calf-raise'],
  'Upper body': ['march', 'arm-circles', 'wall-push-up', 'shadow-box', 'squat-reach'],
  Cardio: ['march', 'butt-kick', 'arm-circles', 'jumping-jack', 'squat-reach'],
  Core: ['march', 'cat-cow', 'arm-circles', 'squat-reach', 'bird-dog'],
};
export function warmupFor(w, ids = limits()) {
  const avoid = avoided(ids);
  const pool = (WARM_POOL[w.focus] || WARM_POOL.default).filter((id) => !avoid.has(id) && getEx(id));
  const extra = ['march', 'squat-reach', 'calf-raise', 'arm-circles'].filter((id) => !avoid.has(id) && !pool.includes(id));
  const moves = [...pool, ...extra].slice(0, 5);
  // shorter than the main work: 20-25 s each
  const main = w.mode === 'circuit' ? w.work || 40 : 40;
  const d = Math.max(15, Math.min(25, main - 10));
  return moves.map((ex) => ({ ex, dur: d }));
}

/* ---------- progressive overload: planned workouts get a little harder week by week ----------
   Each workout in your weekly plan has a level. Finishing it in a new week earns credit toward the
   next level (how much depends on the pace); quitting early twice in a row steps it back; rating a
   session "Brutal" takes back what it earned; every 4th week is lighter. A level adds work time
   then a round to circuits, and reps then a set (and longer holds) to sets workouts. */
export const PACES = { gentle: { label: 'Gentle', per: 0.5 }, steady: { label: 'Steady', per: 1 }, bold: { label: 'Bold', per: 1.5 } };
export const MAX_LEVEL = 12;
const progOn = () => store.settings().progOn !== false;
export const plannedIds = () => new Set(Object.values(store.get('plan') || {}).filter(Boolean));
export const levelRec = (id) => (store.get('levels') || {})[id] || { level: 0, credit: 0, weeks: 0 };
function weekKey(t) {
  const d = new Date(t); d.setHours(0, 0, 0, 0);
  const ws = store.settings().weekStart ?? 1;
  d.setDate(d.getDate() - ((d.getDay() - ws + 7) % 7));
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
// this week is the lighter one (every 4th week you train this workout)
export function lighterWeek(id) {
  if (store.settings().progDeload === false) return false;
  const r = levelRec(id);
  return r.level > 0 && r.weeks > 0 && r.weeks % 4 === 3 && r.week !== weekKey(Date.now());
}
// what a level does to a workout
function levelUp(w, lvl) {
  const changes = [];
  if (!lvl) return { w, changes };
  if (w.mode === 'circuit') {
    const work0 = w.work || 40, rounds0 = w.rounds || 1;
    const work = Math.max(work0, Math.min(work0 + 20, 60, work0 + 5 * Math.min(lvl, 4))); // +5 s a level, to +20 s (60 s at most)
    const rounds = Math.min(rounds0 + 2, rounds0 + Math.floor(lvl / 4)); // then a round every 4 levels
    if (work !== w.work) changes.push(`+${work - work0}s work`);
    if (rounds !== rounds0) changes.push(`+${rounds - rounds0} round${rounds - rounds0 > 1 ? 's' : ''}`);
    return { w: { ...w, work, rounds }, changes };
  }
  let dReps = 0, dSets = 0, dTime = 0;
  const items = w.items.map((it) => {
    const ex = getEx(it.ex);
    const timed = !!it.time || (ex?.type === 'time' && !it.reps);
    const n = { ...it };
    if (timed) {
      const t0 = it.time || ex?.time || 30;
      n.time = t0 + 5 * Math.min(lvl, 6); dTime = n.time - t0; // longer holds, to +30 s
    } else {
      const cap = Math.max(2, Math.round((it.reps || 10) * 0.5)); // reps grow by up to half again…
      n.reps = (it.reps || 10) + Math.min(lvl, cap); dReps = Math.max(dReps, n.reps - (it.reps || 10));
    }
    if (lvl >= 6) { n.sets = (it.sets || 3) + 1; dSets = 1; } // …then one more set
    return n;
  });
  if (dReps) changes.push(`+${dReps} reps`);
  if (dTime) changes.push(`+${dTime}s holds`);
  if (dSets) changes.push('+1 set');
  return { w: { ...w, items }, changes };
}
// a planned workout at its current level (lighter week: two levels easier)
function applyProgression(w) {
  if (!progOn() || w.adhoc || !plannedIds().has(w.id)) return w;
  const r = levelRec(w.id);
  const light = lighterWeek(w.id);
  const lvl = Math.max(0, r.level - (light ? 2 : 0));
  const { w: out, changes } = levelUp(w, lvl);
  return { ...out, prog: { level: r.level, light, changes } };
}
// after a planned workout: earn credit (once a week), or step back after two early quits in a row
export async function noteProgress(session) {
  const id = session.workoutId;
  if (!progOn() || !plannedIds().has(id)) return null;
  const all = { ...(store.get('levels') || {}) };
  const r = { level: 0, credit: 0, weeks: 0, strikes: 0, ...(all[id] || {}) };
  const before = r.level;
  let note = null;
  if (session.early) {
    r.strikes = (r.strikes || 0) + 1;
    if (r.strikes >= 2 && r.level > 0) { r.credit = Math.max(0, r.credit - PACES.steady.per); r.level = Math.floor(r.credit + 1e-6); r.strikes = 0; note = 'eased'; }
  } else {
    r.strikes = 0;
    const wk = weekKey(session.start);
    if (r.week !== wk) {
      const light = lighterWeek(id);
      r.week = wk; r.weeks = (r.weeks || 0) + 1;
      if (!light) {
        const per = (PACES[store.settings().progPace] || PACES.steady).per;
        r.credit = Math.min(MAX_LEVEL, (r.credit || 0) + per);
        r.level = Math.floor(r.credit + 1e-6);
        r.lastGain = per;
      } else r.lastGain = 0;
      note = r.level > before ? 'up' : light ? 'light' : 'building';
    }
  }
  all[id] = r;
  await store.set('levels', all);
  return note ? { note, from: before, to: r.level } : null;
}
// a "Brutal" rating takes back what that session earned
export async function undoProgress(id) {
  const all = { ...(store.get('levels') || {}) };
  const r = all[id];
  if (!r?.lastGain) return false;
  r.credit = Math.max(0, r.credit - r.lastGain); r.level = Math.floor(r.credit + 1e-6); r.lastGain = 0;
  await store.set('levels', all);
  return true;
}
export async function setLevel(id, level) {
  const all = { ...(store.get('levels') || {}) };
  const r = { level: 0, credit: 0, weeks: 0, ...(all[id] || {}) };
  r.level = Math.max(0, Math.min(MAX_LEVEL, level)); r.credit = r.level; r.lastGain = 0;
  all[id] = r;
  return store.set('levels', all);
}
// what the next level will change (for the summary)
export function nextChanges(id) {
  const base = allWorkouts().find((w) => w.id === id);
  if (!base) return [];
  const r = levelRec(id);
  return levelUp(base, r.level).changes;
}

/* ---------- cool-downs: about two minutes of slow stretches for what you just worked ---------- */
const COOL_POOL = {
  default: ['march', 'hamstring-stretch', 'cat-cow', 'childs-pose', 'knee-hug'],
  'Lower body': ['march', 'hamstring-stretch', 'hip-flexor-stretch', 'knee-hug', 'childs-pose'],
  'Upper body': ['arm-circles', 'cat-cow', 'cobra', 'childs-pose', 'down-dog'],
  Core: ['cat-cow', 'cobra', 'knee-hug', 'childs-pose'],
  Cardio: ['march', 'hamstring-stretch', 'hip-flexor-stretch', 'childs-pose'],
};
export function cooldownFor(w, ids = limits()) {
  const avoid = avoided(ids);
  const pool = (COOL_POOL[w.focus] || COOL_POOL.default).filter((id) => !avoid.has(id) && getEx(id));
  // standing stretches for anyone off the floor
  const extra = ['march', 'hamstring-stretch', 'toe-touch', 'arm-circles'].filter((id) => !avoid.has(id) && !pool.includes(id) && getEx(id));
  const moves = [...pool, ...extra].slice(0, 4);
  // four moves plus the short gaps between them ≈ 2 minutes
  const mr = store.settings().moveRest ?? 10;
  const d = Math.max(20, Math.min(30, Math.round((120 - (moves.length - 1) * mr) / moves.length)));
  return moves.map((ex) => ({ ex, dur: d }));
}

/* ---------- estimates ---------- */
export function workoutExercises(w) {
  return [...new Set(w.items.map((i) => i.ex))].map(getEx).filter(Boolean);
}

export function estimateMinutes(w) {
  if (w.mode === 'circuit') {
    const n = w.items.length;
    const per = n * (w.work || 40) + Math.max(0, n - 1) * (store.settings().moveRest ?? 10);
    return Math.round(((per * (w.rounds || 1)) + (w.rounds - 1) * (store.settings().moveRest ?? 10) + 10) / 60);
  }
  let t = 0;
  for (const it of w.items) {
    const ex = getEx(it.ex);
    const work = ex?.type === 'time' || it.time ? it.time || ex.time : (it.reps || 10) * 3.5 * (ex?.perSide ? 2 : 1);
    t += it.sets * (work + 15) + it.sets * (store.settings().moveRest ?? 10);
  }
  return Math.max(1, Math.round(t / 60));
}

export function workoutMuscles(w) {
  const m = new Set();
  for (const ex of workoutExercises(w)) ex.primary.forEach((x) => m.add(x));
  return [...m];
}

export function equipmentFor(w) {
  const e = new Set();
  for (const ex of workoutExercises(w)) if (!ex.equip.includes('none')) ex.equip.filter((q) => q !== 'mat').forEach((q) => e.add(q));
  return [...e];
}

export function canDo(w, owned) {
  const have = new Set(['none', 'mat', ...(owned || [])]);
  return workoutExercises(w).every((ex) => ex.equip.some((q) => have.has(q)));
}

/* ---------- plan generator ---------- */
// days: array of weekday numbers (0=Sun) the user wants to train.
export function generatePlan(profile) {
  const { goal = 'fit', level = 'beginner', equipment = [], days = [1, 3, 5] } = profile;
  const ok = (id) => { const w = W.find((x) => x.id === id); return w && canDo(w, equipment); };
  const pick = (...ids) => ids.find(ok) || 'starter-7';
  const has = (q) => equipment.includes(q);
  let rotation;
  const strengthA = has('barbell') && level !== 'beginner' ? ['push-day', 'leg-day', 'pull-day'] : has('dumbbell') ? ['db-upper', 'db-lower', 'db-full'] : ['bw-strength', 'abs-glutes', 'bw-strength'];
  switch (goal) {
    case 'strength':
      rotation = [...strengthA, pick('core-crusher')];
      break;
    case 'lose':
      rotation = [pick(level === 'beginner' ? 'low-impact' : 'hiit-burn'), strengthA[0], pick(has('rope') ? 'jump-rope' : 'starter-7'), strengthA[1], pick('core-crusher')];
      break;
    case 'mobility':
      rotation = ['mobility-flow', 'desk-break', 'morning-wake', 'bedtime-stretch', 'first-steps'];
      break;
    default:
      rotation = [level === 'beginner' ? 'first-steps' : 'starter-7', strengthA[0], pick('core-crusher'), pick(has('kettlebell') ? 'kb-power' : 'low-impact'), strengthA[1]];
  }
  if (level === 'beginner' && goal !== 'mobility') rotation = rotation.map((id) => (id === 'hiit-burn' ? 'low-impact' : id));
  // with limitations, a workout that would lose most of its moves gives way to a gentler one
  const avoid = avoided(profile.limits || []);
  if (avoid.size) {
    rotation = rotation.map((id) => {
      const w = W.find((x) => x.id === id);
      if (!w || w.items.filter((it) => !avoid.has(it.ex)).length >= w.items.length / 2) return id;
      const alt = ['standing-strength', 'apartment-cardio', 'gentle-mobility', 'desk-break'].find((a) => {
        const aw = W.find((x) => x.id === a);
        return aw && aw.items.filter((it) => !avoid.has(it.ex)).length >= aw.items.length * 0.6 && (w.focus !== 'Cardio' || aw.focus === 'Cardio');
      });
      return alt || id;
    });
  }
  const plan = {};
  days.slice().sort().forEach((d, i) => { plan[d] = rotation[i % rotation.length]; });
  return plan;
}

/* ---------- lookup (built-ins + user-made) ---------- */
export function allWorkouts() {
  return [...W, ...(store.get('custom') || [])];
}
export function getWorkout(id) {
  if (id?.startsWith('ex:')) {
    // ad-hoc single exercise session
    const ex = getEx(id.slice(3));
    if (!ex) return null;
    const isTime = ex.type === 'time';
    return {
      id, name: ex.name, emoji: '🎯', color: '#ff6b57', focus: 'Single move', mode: 'sets', adhoc: true,
      items: [{ ex: ex.id, sets: 3, reps: isTime ? 0 : ex.reps, time: isTime ? ex.time : undefined, rest: 60 }],
    };
  }
  const base = allWorkouts().find((w) => w.id === id);
  return base ? adaptWorkout(applyProgression(applySwaps(base))) : null;
}
