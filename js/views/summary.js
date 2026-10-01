// Pulse — post-workout celebration & reflection.
import * as store from '../store.js';
import * as stats from '../stats.js';
import { getEx } from '../exercises.js';
import { ClayPlayer } from '../clay.js';
import { esc, icon, $, $$, mmss, num, fmtW, confetti, look, toast, units } from '../ui.js';
import { go } from '../app.js';

let fresh = [];
export function setFresh(b) { fresh = b || []; }

const MOODS = [['😵', 'Brutal'], ['😮‍💨', 'Hard'], ['🙂', 'Good'], ['😄', 'Great'], ['🤩', 'Amazing']];
let clay = null;

export function prLabel(p) {
  const ex = getEx(p.ex);
  const v = p.type === 'weight' ? `${fmtW(p.value)} heaviest` : p.type === 'e1rm' ? `${fmtW(p.value)} est. 1RM` : p.type === 'reps' ? `${p.value} reps` : `${mmss(p.value)} hold`;
  return `<div class="li" style="box-shadow:none;background:var(--card2)"><span style="font-size:24px">🏅</span><div class="li-main"><div class="li-title">${esc(ex?.name || p.ex)}</div><div class="li-sub">New record · ${v}</div></div></div>`;
}

export const view = {
  immersive: true,
  title: 'Workout complete',
  render([id]) {
    const s = stats.sessions().find((x) => x.id === id);
    if (!s) return `<div class="view no-nav"><div class="empty"><h3>Session not found</h3><a class="btn primary mt" href="#/">Home</a></div></div>`;
    const sets = s.entries.reduce((a, e) => a + e.sets.length, 0);
    const vol = stats.sessionVolume(s);
    const reps = stats.sessionReps(s);
    const streak = stats.dayStreak();
    const week = stats.weekSummary();
    const goal = store.settings().weeklyGoal || 3;
    return `<div class="view no-nav">
      <div class="summary-hero">
        <div class="clay-stage" id="cel" style="max-width:320px;margin:0 auto"></div>
        <h1 class="mt">${s.early ? 'Good effort!' : 'Workout complete!'}</h1>
        <p class="muted">${esc(s.name)} · ${new Date(s.start).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
      </div>
      <div class="stats3 mt">
        <div class="stat"><div class="e">⏱️</div><div class="v">${mmss(s.duration)}</div><div class="l">Time</div></div>
        <div class="stat"><div class="e">🔥</div><div class="v">${num(s.calories)}</div><div class="l">kcal (est.)</div></div>
        <div class="stat"><div class="e">${vol ? '🏋️' : '🔁'}</div><div class="v">${vol ? num(Math.round(vol)) : reps || sets}</div><div class="l">${vol ? units() + ' lifted' : reps ? 'Reps' : 'Intervals'}</div></div>
      </div>
      <div class="card mt row gap"><span style="font-size:30px">🔥</span><div class="grow"><b>${streak}-day streak</b><div class="muted small">${week.days}/${goal} days this week${week.days >= goal ? ' — weekly goal smashed! 🎯' : ''}</div></div></div>
      ${s.prs?.length ? `<div class="section"><div class="section-h"><h2>Personal records</h2></div><div class="list">${s.prs.map(prLabel).join('')}</div></div>` : ''}
      ${fresh.length ? `<div class="section"><div class="section-h"><h2>Badges unlocked</h2></div><div class="badges">${fresh.map((b) => `<div class="badge"><div class="medal">${b.icon}</div>${esc(b.name)}</div>`).join('')}</div></div>` : ''}
      <div class="section card">
        <h3 class="center">How did that feel?</h3>
        <div class="rating mt" id="rate">${MOODS.map(([e, l], i) => `<button data-r="${i + 1}" class="${s.rating === i + 1 ? 'on' : ''}" aria-label="${l}" title="${l}">${e}</button>`).join('')}</div>
        <textarea class="input mt" id="notes" placeholder="Notes for future you (optional)">${esc(s.notes || '')}</textarea>
      </div>
      <div class="row gap mt">
        <button class="btn grow" id="share">${icon('share')} Share</button>
        <button class="btn primary grow" id="done">Done</button>
      </div>
    </div>`;
  },
  mount(root, [id]) {
    const s = stats.sessions().find((x) => x.id === id);
    if (!s) return;
    clay = new ClayPlayer($('#cel', root), getEx('celebrate'), { look: look() });
    clay.play();
    setTimeout(() => confetti(), 200);
    const badge = fresh[0];
    if (badge) setTimeout(() => toast(`Badge unlocked: ${badge.name}`, { icon: badge.icon }), 900);
    $$('#rate button', root).forEach((b) => (b.onclick = () => {
      $$('#rate button', root).forEach((x) => x.classList.toggle('on', x === b));
      store.updateSession(id, { rating: +b.dataset.r });
    }));
    $('#notes', root).onchange = (e) => store.updateSession(id, { notes: e.target.value });
    $('#done', root).onclick = () => { store.updateSession(id, { notes: $('#notes', root).value }); fresh = []; go('/', { replace: true }); };
    $('#share', root).onclick = async () => {
      const text = `I just finished “${s.name}” on Pulse 💪 — ${Math.round(s.duration / 60)} min, ~${s.calories} kcal${s.prs?.length ? `, ${s.prs.length} new PR${s.prs.length > 1 ? 's' : ''}` : ''}! 🔥 ${stats.dayStreak()}-day streak.`;
      try {
        if (navigator.share) await navigator.share({ title: 'Pulse workout', text });
        else { await navigator.clipboard.writeText(text); toast('Copied to clipboard', { icon: '📋' }); }
      } catch { /* cancelled */ }
    };
    return () => { clay?.destroy(); clay = null; };
  },
};
