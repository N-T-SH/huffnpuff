// Huff n Puff — derived stats: streaks, records, muscle load, achievements.
import * as store from './store.js';
import { getEx } from './exercises.js';

export const dayKey = (d) => {
  d = new Date(d);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const startOfDay = (d) => { d = new Date(d); d.setHours(0, 0, 0, 0); return d; };
export function startOfWeek(d, weekStart = store.settings().weekStart) {
  d = startOfDay(d);
  const diff = (d.getDay() - weekStart + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

export const sessions = () => store.get('sessions') || [];

export function bodyWeightKg() {
  const w = store.get('weights');
  if (w?.length) return w[w.length - 1].kg;
  return store.get('profile')?.weightKg || 70;
}

export function e1rm(weight, reps) {
  if (!weight || !reps) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30); // Epley
}

export function dayStreak() {
  const days = new Set(sessions().map((s) => dayKey(s.start)));
  let d = startOfDay(Date.now());
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

export function weekStreak() {
  const goal = store.settings().weeklyGoal || 3;
  const byWeek = {};
  for (const s of sessions()) {
    const k = dayKey(startOfWeek(s.start));
    byWeek[k] = (byWeek[k] || new Set()).add(dayKey(s.start));
  }
  let w = startOfWeek(Date.now());
  let n = 0;
  const cur = byWeek[dayKey(w)];
  if (cur && cur.size >= goal) n++;
  w.setDate(w.getDate() - 7);
  while (byWeek[dayKey(w)] && byWeek[dayKey(w)].size >= goal) { n++; w.setDate(w.getDate() - 7); }
  return n;
}

export function bestDayStreak() {
  const days = [...new Set(sessions().map((s) => dayKey(s.start)))].sort();
  let best = 0, run = 0, prev = null;
  for (const k of days) {
    const d = new Date(k + 'T00:00');
    if (prev && (d - prev) / 864e5 === 1) run++; else run = 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export function weekSummary(offset = 0) {
  const ws = startOfWeek(Date.now());
  ws.setDate(ws.getDate() + offset * 7);
  const we = new Date(ws); we.setDate(we.getDate() + 7);
  const list = sessions().filter((s) => s.start >= ws && s.start < we);
  return {
    start: ws,
    count: list.length,
    days: new Set(list.map((s) => dayKey(s.start))).size,
    minutes: Math.round(list.reduce((a, s) => a + (s.duration || 0), 0) / 60),
    calories: Math.round(list.reduce((a, s) => a + (s.calories || 0), 0)),
    volume: Math.round(list.reduce((a, s) => a + sessionVolume(s), 0)),
    list,
  };
}

export function totals() {
  const all = sessions();
  return {
    workouts: all.length,
    minutes: Math.round(all.reduce((a, s) => a + (s.duration || 0), 0) / 60),
    calories: Math.round(all.reduce((a, s) => a + (s.calories || 0), 0)),
    volume: Math.round(all.reduce((a, s) => a + sessionVolume(s), 0)),
    reps: all.reduce((a, s) => a + s.entries.reduce((b, e) => b + e.sets.reduce((c, st) => c + (st.done ? st.reps || 0 : 0), 0), 0), 0),
    exercises: new Set(all.flatMap((s) => s.entries.map((e) => e.ex))).size,
  };
}

export function sessionVolume(s) {
  let v = 0;
  for (const e of s.entries) for (const st of e.sets) if (st.done && st.weight && st.reps) v += st.weight * st.reps;
  return v;
}

export function sessionReps(s) {
  let v = 0;
  for (const e of s.entries) for (const st of e.sets) if (st.done) v += st.reps || 0;
  return v;
}

// Personal records for an exercise, optionally only from sessions before `before`.
export function records(exId, before = Infinity, list = sessions()) {
  const r = { weight: 0, e1rm: 0, reps: 0, time: 0, volume: 0, sessions: 0 };
  for (const s of list) {
    if (s.start >= before) continue;
    let touched = false;
    for (const e of s.entries) {
      if (e.ex !== exId) continue;
      for (const st of e.sets) {
        if (!st.done) continue;
        touched = true;
        if (st.weight) r.weight = Math.max(r.weight, st.weight);
        r.e1rm = Math.max(r.e1rm, e1rm(st.weight, st.reps));
        if (st.reps) r.reps = Math.max(r.reps, st.reps);
        if (st.time) r.time = Math.max(r.time, st.time);
        if (st.weight && st.reps) r.volume += st.weight * st.reps;
      }
    }
    if (touched) r.sessions++;
  }
  return r;
}

export function findPRs(session) {
  const prs = [];
  const seen = new Set();
  for (const e of session.entries) {
    if (seen.has(e.ex)) continue;
    seen.add(e.ex);
    const prev = records(e.ex, session.start);
    if (!prev.sessions) continue; // first time isn't a "record"
    const now = records(e.ex, Infinity, [session]);
    const ex = getEx(e.ex);
    if (now.weight > prev.weight) prs.push({ ex: e.ex, type: 'weight', value: now.weight });
    else if (now.e1rm > prev.e1rm + 0.01 && now.weight) prs.push({ ex: e.ex, type: 'e1rm', value: Math.round(now.e1rm * 10) / 10 });
    else if (!now.weight && now.reps > prev.reps && ex?.type !== 'time') prs.push({ ex: e.ex, type: 'reps', value: now.reps });
    if (now.time > prev.time && prev.time && ex?.type === 'time') prs.push({ ex: e.ex, type: 'time', value: now.time });
  }
  return prs;
}

export function lastPerformance(exId) {
  const all = sessions();
  for (let i = all.length - 1; i >= 0; i--) {
    const e = all[i].entries.find((x) => x.ex === exId && x.sets.some((s) => s.done));
    if (e) return { date: all[i].start, sets: e.sets.filter((s) => s.done) };
  }
  return null;
}

// Simple progressive overload suggestion
export function suggestNext(exId, target) {
  const last = lastPerformance(exId);
  if (!last) return null;
  const best = last.sets.reduce((a, s) => ((s.weight || 0) > (a.weight || 0) ? s : a), last.sets[0]);
  const allHit = last.sets.every((s) => (s.reps || 0) >= (target || 0));
  const units = store.settings().units;
  const step = units === 'lb' ? 5 : 2.5;
  if (best.weight) return { weight: allHit ? best.weight + step : best.weight, reps: target, note: allHit ? `+${step} ${units} — you hit every rep last time` : 'Same weight — own every rep' };
  if (best.reps) return { reps: allHit ? Math.max(target, best.reps + 1) : target, note: allHit ? 'One more rep than last time' : null };
  return null;
}

export function exerciseHistory(exId) {
  const out = [];
  for (const s of sessions()) {
    const sets = s.entries.filter((e) => e.ex === exId).flatMap((e) => e.sets.filter((x) => x.done));
    if (!sets.length) continue;
    out.push({
      date: s.start,
      sets,
      best: Math.max(...sets.map((x) => x.weight || 0)),
      e1rm: Math.max(...sets.map((x) => e1rm(x.weight, x.reps))),
      reps: sets.reduce((a, x) => a + (x.reps || 0), 0),
      maxReps: Math.max(...sets.map((x) => x.reps || 0)),
      time: Math.max(...sets.map((x) => x.time || 0)),
    });
  }
  return out;
}

export function muscleLoad(days = 7) {
  const since = Date.now() - days * 864e5;
  const load = {};
  for (const s of sessions()) {
    if (s.start < since) continue;
    for (const e of s.entries) {
      const ex = getEx(e.ex);
      if (!ex) continue;
      const n = e.sets.filter((x) => x.done).length;
      ex.primary.forEach((m) => (load[m] = (load[m] || 0) + n));
      ex.secondary.forEach((m) => (load[m] = (load[m] || 0) + n * 0.5));
    }
  }
  return load;
}

export function calories(entries, durationSec) {
  // entries: [{ex, activeSec}]
  const kg = bodyWeightKg();
  let kcal = 0, active = 0;
  for (const e of entries) {
    const ex = getEx(e.ex);
    kcal += ((ex?.met || 4) * 3.5 * kg / 200) * (e.activeSec / 60);
    active += e.activeSec;
  }
  kcal += (1.8 * 3.5 * kg / 200) * Math.max(0, durationSec - active) / 60;
  return Math.round(kcal);
}

/* ---------- achievements ---------- */
export const BADGES = [
  { id: 'first', name: 'First Squish', desc: 'Complete your first workout', icon: '🌟', test: (t) => t.workouts >= 1 },
  { id: 'five', name: 'High Five', desc: 'Complete 5 workouts', icon: '🖐️', test: (t) => t.workouts >= 5 },
  { id: 'ten', name: 'Double Digits', desc: 'Complete 10 workouts', icon: '🔟', test: (t) => t.workouts >= 10 },
  { id: 'fifty', name: 'Clay Legend', desc: 'Complete 50 workouts', icon: '🏆', test: (t) => t.workouts >= 50 },
  { id: 'hundred', name: 'Centurion', desc: 'Complete 100 workouts', icon: '💯', test: (t) => t.workouts >= 100 },
  { id: 'streak3', name: 'On a Roll', desc: '3-day streak', icon: '🔥', test: (t, x) => x.bestStreak >= 3 },
  { id: 'streak7', name: 'Week Warrior', desc: '7-day streak', icon: '⚡', test: (t, x) => x.bestStreak >= 7 },
  { id: 'streak30', name: 'Unstoppable', desc: '30-day streak', icon: '🌋', test: (t, x) => x.bestStreak >= 30 },
  { id: 'hour', name: 'Hour Power', desc: '60 total minutes', icon: '⏳', test: (t) => t.minutes >= 60 },
  { id: 'tenhours', name: 'Time Lord', desc: '10 total hours', icon: '🕰️', test: (t) => t.minutes >= 600 },
  { id: 'reps1k', name: 'Rep Machine', desc: '1,000 total reps', icon: '🔁', test: (t) => t.reps >= 1000 },
  { id: 'ton', name: 'Ton Lifter', desc: 'Lift 1,000 kg total volume', icon: '🏋️', test: (t) => t.volumeKg >= 1000 },
  { id: 'tenton', name: 'Iron Mountain', desc: 'Lift 10,000 kg total volume', icon: '⛰️', test: (t) => t.volumeKg >= 10000 },
  { id: 'variety', name: 'Explorer', desc: 'Try 20 different exercises', icon: '🧭', test: (t) => t.exercises >= 20 },
  { id: 'early', name: 'Early Bird', desc: 'Work out before 7 am', icon: '🐦', test: (t, x) => x.early },
  { id: 'night', name: 'Night Owl', desc: 'Work out after 9 pm', icon: '🦉', test: (t, x) => x.night },
  { id: 'pr', name: 'Record Breaker', desc: 'Set a personal record', icon: '📈', test: (t, x) => x.prs >= 1 },
  { id: 'pr10', name: 'PR Collector', desc: 'Set 10 personal records', icon: '🎖️', test: (t, x) => x.prs >= 10 },
  { id: 'builder', name: 'Architect', desc: 'Build a custom workout', icon: '🧩', test: (t, x) => x.custom >= 1 },
  { id: 'weekgoal', name: 'Goal Getter', desc: 'Hit your weekly goal', icon: '🎯', test: (t, x) => x.weekGoal },
];

export function evaluateBadges() {
  const t = totals();
  const units = store.settings().units;
  t.volumeKg = units === 'lb' ? t.volume * 0.4536 : t.volume;
  const all = sessions();
  const x = {
    bestStreak: bestDayStreak(),
    early: all.some((s) => new Date(s.start).getHours() < 7),
    night: all.some((s) => new Date(s.start).getHours() >= 21),
    prs: all.reduce((a, s) => a + (s.prs?.length || 0), 0),
    custom: (store.get('custom') || []).length,
    weekGoal: weekStreak() >= 1,
  };
  const have = { ...(store.get('badges') || {}) };
  const fresh = [];
  for (const b of BADGES) {
    if (!have[b.id] && b.test(t, x)) { have[b.id] = Date.now(); fresh.push(b); }
  }
  if (fresh.length) store.set('badges', have);
  return fresh;
}
