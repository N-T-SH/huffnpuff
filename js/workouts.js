// SuperSweatClub — built-in routines and the weekly plan generator.
import { getEx } from './exercises.js';
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

export const BUILTIN_WORKOUTS = W;

/* ---------- estimates ---------- */
export function workoutExercises(w) {
  return [...new Set(w.items.map((i) => i.ex))].map(getEx).filter(Boolean);
}

export function estimateMinutes(w) {
  if (w.mode === 'circuit') {
    const n = w.items.length;
    const per = n * (w.work || 40) + Math.max(0, n - 1) * (store.settings().moveRest ?? 10);
    return Math.round(((per * (w.rounds || 1)) + (w.rounds - 1) * (w.roundRest || 0) + 10) / 60);
  }
  let t = 0;
  for (const it of w.items) {
    const ex = getEx(it.ex);
    const work = ex?.type === 'time' || it.time ? it.time || ex.time : (it.reps || 10) * 3.5 * (ex?.perSide ? 2 : 1);
    t += it.sets * (work + 15) + (it.sets - 1) * (it.rest || 60) + 45;
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
  return allWorkouts().find((w) => w.id === id) || null;
}
