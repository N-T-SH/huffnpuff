// Huff n Puff — Today screen.
import * as store from '../store.js';
import * as stats from '../stats.js';
import { getWorkout, estimateMinutes, allWorkouts, fitsMe, suitScore, adaptWorkout } from '../workouts.js';
import { esc, icon, greeting, thumb, relDay, dur, $, toast } from '../ui.js';
import { meId } from '../cast.js';
import { ring } from '../charts.js';
import { go, install, promptInstall } from '../app.js';

const TIPS = [
  ['💧', 'Sip water between sets — even 2% dehydration can sap strength.'],
  ['😴', 'Muscles grow while you sleep. Aim for 7–9 hours.'],
  ['📈', 'Progressive overload: add a rep or a little weight each week.'],
  ['🫁', 'Exhale on the effort, inhale on the easy part.'],
  ['🧠', 'Missed a day? Never miss two. Consistency beats perfection.'],
  ['🥚', 'Protein helps recovery — spread it across your meals.'],
  ['🐢', 'Slow the lowering phase to make any move harder.'],
  ['🎯', 'Small habits win: a 7-minute workout still counts.'],
  ['🔥', 'Warm up for 3–5 minutes before heavy lifts.'],
  ['🧘', 'Mobility days are training days too.'],
];

export function workoutCard(w, { wide = false } = {}) {
  const first = w.items[0]?.ex;
  return `<a class="wk-card" href="#/workout/${encodeURIComponent(w.id)}">
    <div class="wk-art">${thumb(first)}<span class="wk-emoji">${w.emoji || '💪'}</span>${w.tag ? `<span class="wk-tag pill">${esc(w.tag)}</span>` : ''}</div>
    <div class="wk-body"><div class="wk-title">${esc(w.name)}</div>
    <div class="muted small">${estimateMinutes(w)} min · ${esc(w.focus || '')}</div></div></a>`;
}

function todaysPick() {
  const plan = store.get('plan') || {};
  const dow = new Date().getDay();
  const doneToday = stats.sessions().some((s) => stats.dayKey(s.start) === stats.dayKey(Date.now()));
  const id = plan[dow];
  return { id, w: id ? getWorkout(id) : null, doneToday };
}

export const view = {
  tab: 'home',
  render() {
    const profile = store.get('profile') || {};
    const set = store.settings();
    const { w, doneToday } = todaysPick();
    const week = stats.weekSummary();
    const streak = stats.dayStreak();
    const tot = stats.totals();
    const goal = set.weeklyGoal || 3;
    const plan = store.get('plan') || {};

    // hero
    let hero;
    if (doneToday) {
      hero = `<div class="hero rest"><div class="hero-content"><div class="kicker">Today</div><h2>Nice work! ✨</h2><div class="meta">You trained today. Recover, hydrate, repeat.</div>
        <button class="btn" data-go="/workout/mobility-flow">${icon('sparkle')} Gentle stretch</button></div>${thumb('meditate', '', { bare: true })}</div>`;
    } else if (w) {
      hero = `<div class="hero"><div class="hero-content"><div class="kicker">Today’s plan</div><h2>${esc(w.name)}</h2><div class="meta">${estimateMinutes(w)} min · ${w.items.length} moves · ${esc(w.focus)}</div>
        <button class="btn" data-go="/play/${encodeURIComponent(w.id)}">${icon('play')} Start</button></div>${thumb(w.items[0].ex, '', { bare: true })}</div>`;
    } else {
      hero = `<div class="hero rest"><div class="hero-content"><div class="kicker">Rest day</div><h2>Recharge 🌿</h2><div class="meta">No session planned. Fancy a quick stretch?</div>
        <button class="btn" data-go="/workout/desk-break">${icon('play')} 5-min reset</button></div>${thumb('meditate', '', { bare: true })}</div>`;
    }

    // week strip
    const ws = stats.startOfWeek(Date.now());
    const doneDays = new Set(week.list.map((s) => stats.dayKey(s.start)));
    let strip = '';
    for (let i = 0; i < 7; i++) {
      const d = new Date(ws); d.setDate(ws.getDate() + i);
      const k = stats.dayKey(d);
      const isToday = k === stats.dayKey(Date.now());
      const done = doneDays.has(k);
      const planned = plan[d.getDay()] && !done && d >= stats.startOfDay(Date.now());
      strip += `<div class="d ${isToday ? 'is-today' : ''}">${d.toLocaleDateString(undefined, { weekday: 'narrow' })}<span class="dot ${done ? 'done' : ''} ${planned ? 'plan' : ''} ${isToday ? 'today' : ''}">${done ? '✓' : d.getDate()}</span></div>`;
    }

    // recent: what you started lately, finished or not (newest first, one per workout)
    const seen = new Set();
    const recent = [];
    const sessions = stats.sessions();
    const active = store.get('active');
    const attempts = [...(store.get('attempts') || [])].reverse();
    const pool = [...attempts.map((a) => ({ a })), ...[...sessions].reverse().map((s) => ({ s }))]
      .map((x) => ({ ...x, at: x.a ? x.a.at : x.s.start, id: x.a ? x.a.workoutId : x.s.workoutId }))
      .sort((p, q) => q.at - p.at);
    for (const x of pool) {
      if (seen.has(x.id)) continue;
      seen.add(x.id);
      const rw = getWorkout(x.id);
      if (!rw) continue;
      const s = x.s || sessions.find((ss) => ss.workoutId === x.id && Math.abs(ss.start - x.at) < 1000);
      const unfinished = !!x.a && !x.a.done && !s; // started, never saved
      const resumable = active && active.workoutId === x.id;
      recent.push({ s, w: rw, at: x.at, unfinished, pct: x.a?.pct || 0, resumable });
      if (recent.length >= 3) break;
    }
    // quick hits: short ones that suit you (equipment, level, limits), best matches for your goal first
    const quick = allWorkouts().filter((x) => estimateMinutes(x) <= 14 && fitsMe(x, profile))
      .sort((a, b) => suitScore(b, profile) - suitScore(a, profile)).slice(0, 6).map((x) => adaptWorkout(x));
    const tip = TIPS[Math.floor(Date.now() / 864e5) % TIPS.length];
    const lastSession = stats.sessions().at(-1);

    return `<div class="view">
      <div class="hello">
        <a class="avatar" href="#/me" aria-label="Profile">${thumb('wave', '', { portrait: true, char: meId() })}</a>
        <div class="grow"><div class="muted small bold">${greeting()}</div><h1>${esc(profile.name || 'Champ')}</h1></div>
        ${streak ? `<span class="pill y" title="Day streak">🔥 ${streak}</span>` : ''}
      </div>
      ${hero}
      <div class="card mt">
        <div class="row between mb"><div><h3>This week</h3><div class="muted small">${week.days} of ${goal} workout days</div></div>
          ${ring(week.days / goal, { size: 58, stroke: 8, inner: `<b class="small">${Math.min(100, Math.round((week.days / goal) * 100))}%</b>` })}</div>
        <div class="week">${strip}</div>
      </div>
      <div class="stats3 mt">
        <div class="stat"><div class="e">🔥</div><div class="v">${streak}</div><div class="l">Day streak</div></div>
        <div class="stat"><div class="e">⏱️</div><div class="v">${week.minutes}</div><div class="l">Min this wk</div></div>
        <div class="stat"><div class="e">🏆</div><div class="v">${tot.workouts}</div><div class="l">Workouts</div></div>
      </div>
      <div id="installSlot"></div>
      ${recent.length ? `<div class="section"><div class="section-h"><h2>Jump back in</h2><a href="#/progress?tab=history">History</a></div>
        <div class="list">${recent.map(({ s, w: rw, at, unfinished, pct, resumable }) => `<a class="li" href="#/workout/${encodeURIComponent(rw.id)}"><div class="emoji-badge" style="background:${rw.color}">${rw.emoji}</div>
          <div class="li-main"><div class="li-title">${esc(rw.name)}</div><div class="li-sub">${relDay(at)} · ${unfinished ? `<span class="unfin">${resumable ? 'Paused' : 'Unfinished'} · ${Math.round(pct * 100)}% done</span>` : `${dur(s?.duration || 0)}${s?.prs?.length ? ` · 🏅 ${s.prs.length} PR` : ''}`}</div></div>
          <button class="icon-btn" data-go="/play/${encodeURIComponent(rw.id)}${resumable ? '?resume=1' : ''}" aria-label="${resumable ? 'Resume' : 'Start'} ${esc(rw.name)}">${icon('play')}</button></a>`).join('')}</div></div>` : ''}
      <div class="section"><div class="section-h"><h2>Quick hits</h2><a href="#/workouts">See all</a></div>
        <div class="hscroll">${quick.map((x) => workoutCard(x)).join('')}</div></div>
      <div class="card tight row gap"><span style="font-size:28px">${tip[0]}</span><div><div class="bold small">Tip of the day</div><div class="muted small">${esc(tip[1])}</div></div></div>
      ${!lastSession ? `<div class="card mt center"><h3>Your first workout awaits</h3><p class="muted small mt">Tap <b>Start</b> above or browse the library — your clay coach will guide every rep.</p></div>` : ''}
    </div>`;
  },
  mount(root, _p, query) {
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-go]');
      if (b) { e.preventDefault(); e.stopPropagation(); go(b.dataset.go); }
    });
    const paintInstall = () => {
      const slot = $('#installSlot', root);
      if (!slot || install.installed || !install.prompt) return;
      slot.innerHTML = `<div class="card install-card mt"><span style="font-size:30px">📲</span><div class="grow"><div class="bold">Install Huff n Puff</div><div class="muted small">Full-screen, offline, one tap away.</div></div><button class="btn small primary" id="installBtn">Install</button></div>`;
      $('#installBtn', slot).onclick = async () => { if (await promptInstall()) slot.innerHTML = ''; };
    };
    paintInstall();
    document.addEventListener('pulse:installable', paintInstall);
    if (query.start) {
      const { w } = todaysPick();
      if (w) go('/play/' + encodeURIComponent(w.id), { replace: true });
      else toast('Rest day — no workout planned today', { icon: '🌿' });
    }
    return () => document.removeEventListener('pulse:installable', paintInstall);
  },
};
