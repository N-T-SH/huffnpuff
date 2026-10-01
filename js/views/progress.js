// SillySweatClub — progress: overview charts, history, body weight, records & badges.
import * as store from '../store.js';
import * as stats from '../stats.js';
import { getEx } from '../exercises.js';
import { esc, icon, $, $$, num, dur, fmtW, units, relDay, fmtTime, toast, promptDialog, confirmDialog, thumb } from '../ui.js';
import { barChart, lineChart, heatmap, bodyMap, ring } from '../charts.js';
import { go } from '../app.js';

let tab = 'overview';
let metric = 'minutes';

function overview() {
  const t = stats.totals();
  const goal = store.settings().weeklyGoal || 3;
  const wk = stats.weekSummary();
  const weeks = [];
  for (let i = -7; i <= 0; i++) {
    const w = stats.weekSummary(i);
    weeks.push({ label: w.start.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }), value: metric === 'minutes' ? w.minutes : metric === 'workouts' ? w.count : metric === 'calories' ? w.calories : w.volume, highlight: i === 0 });
  }
  const perDay = {};
  for (const s of stats.sessions()) { const k = stats.dayKey(s.start); perDay[k] = (perDay[k] || 0) + Math.max(1, Math.round(s.duration / 60)); }
  const load = stats.muscleLoad(7);
  const recs = topRecords();
  const have = store.get('badges') || {};
  return `
    <div class="card row gap-l">
      ${ring(wk.days / goal, { size: 96, stroke: 12, inner: `<div><div class="display" style="font-size:24px">${wk.days}/${goal}</div><div class="tiny muted bold">days</div></div>` })}
      <div class="grow"><h3>Weekly goal</h3><p class="muted small">${wk.days >= goal ? 'Goal reached — legend! 🎉' : `${goal - wk.days} more day${goal - wk.days > 1 ? 's' : ''} to hit your goal`}</p>
        <div class="row gap-s wrap mt"><span class="pill y">🔥 ${stats.dayStreak()} day streak</span><span class="pill t">📆 ${stats.weekStreak()} week streak</span></div></div>
    </div>
    <div class="stats3 mt">
      <div class="stat"><div class="v">${num(t.workouts)}</div><div class="l">Workouts</div></div>
      <div class="stat"><div class="v">${t.minutes >= 600 ? Math.round(t.minutes / 60) + 'h' : num(t.minutes)}</div><div class="l">${t.minutes >= 600 ? 'Hours' : 'Minutes'}</div></div>
      <div class="stat"><div class="v">${num(t.calories)}</div><div class="l">kcal</div></div>
    </div>
    <div class="card mt">
      <div class="row between"><h3>Last 8 weeks</h3></div>
      <div class="chips mt" style="margin:8px 0 0;padding:4px 0 8px" id="metric">${[['minutes', 'Minutes'], ['workouts', 'Workouts'], ['calories', 'kcal'], ['volume', 'Volume']].map(([k, l]) => `<button class="chip ${metric === k ? 'on' : ''}" data-m="${k}">${l}</button>`).join('')}</div>
      ${barChart(weeks, { fmt: (v) => (v >= 10000 ? Math.round(v / 1000) + 'k' : Math.round(v)) })}
    </div>
    <div class="card mt"><h3 class="mb">Activity</h3>${heatmap(perDay, { weekStart: store.settings().weekStart, dayKey: stats.dayKey })}
      <div class="legend mt"><span>Less</span>${[0, 1, 2, 3, 4].map((i) => `<i style="background:var(--hm${i})"></i>`).join('')}<span>More</span></div></div>
    <div class="card mt"><h3>Muscles · last 7 days</h3><p class="muted small mb">Sets per muscle group. Balance the cool spots!</p>${bodyMap(load)}
      <div class="legend mt"><span><i style="background:var(--muscle0)"></i>Rested</span><span><i style="background:var(--muscle1)"></i>Light</span><span><i style="background:var(--muscle2)"></i>Worked</span><span><i style="background:var(--muscle3)"></i>Hammered</span></div></div>
    ${recs.length ? `<div class="section"><div class="section-h"><h2>Personal records</h2></div><div class="list">${recs.map((r) => `<a class="li" href="#/exercise/${r.ex.id}"><div class="li-thumb">${thumb(r.ex.id)}</div><div class="li-main"><div class="li-title">${esc(r.ex.name)}</div><div class="li-sub">${r.label}</div></div>${icon('chev', 'chev')}</a>`).join('')}</div></div>` : ''}
    <div class="section"><div class="section-h"><h2>Badges</h2><span class="muted small bold">${Object.keys(have).length}/${stats.BADGES.length}</span></div>
      <div class="card"><div class="badges">${stats.BADGES.map((b) => `<div class="badge ${have[b.id] ? '' : 'locked'}" title="${esc(b.desc)}"><div class="medal">${b.icon}</div>${esc(b.name)}<span class="tiny muted" style="font-weight:600">${esc(b.desc)}</span></div>`).join('')}</div></div></div>`;
}

function topRecords() {
  const ids = [...new Set(stats.sessions().flatMap((s) => s.entries.map((e) => e.ex)))];
  return ids.map((id) => {
    const ex = getEx(id);
    if (!ex) return null;
    const r = stats.records(id);
    let label;
    if (r.weight) label = `${fmtW(r.weight)} best · ~${fmtW(Math.round(r.e1rm))} 1RM`;
    else if (ex.type === 'time' || (r.time && !r.reps)) label = `${r.time}s longest`;
    else if (r.reps) label = `${r.reps} reps best set`;
    else return null;
    return { ex, label, n: r.sessions };
  }).filter(Boolean).sort((a, b) => b.n - a.n).slice(0, 8);
}

function history() {
  const list = [...stats.sessions()].reverse();
  if (!list.length) return `<div class="empty"><div class="clay-stage">${thumb('meditate')}</div><h3>No workouts yet</h3><p class="muted small mt">Finish a workout and it’ll appear here.</p><a class="btn primary mt" href="#/workouts">Find a workout</a></div>`;
  let out = '', month = '';
  for (const s of list) {
    const m = new Date(s.start).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    if (m !== month) { month = m; out += `<h4 class="muted" style="margin:18px 6px 8px">${m}</h4>`; }
    const sets = s.entries.reduce((a, e) => a + e.sets.length, 0);
    out += `<a class="li" href="#/session/${s.id}" style="margin-bottom:10px"><div class="emoji-badge" style="background:${s.color || 'var(--primary)'}">${s.emoji || '💪'}</div>
      <div class="li-main"><div class="li-title">${esc(s.name)}</div><div class="li-sub">${relDay(s.start)} · ${fmtTime(s.start)} · ${dur(s.duration)} · ${sets} sets${s.prs?.length ? ' · 🏅' + s.prs.length : ''}</div></div>${icon('chev', 'chev')}</a>`;
  }
  return out;
}

function body() {
  const w = store.get('weights') || [];
  const u = units();
  const conv = (kg) => (u === 'lb' ? kg / 0.4536 : kg);
  const latest = w.at(-1);
  const first = w[0];
  const h = store.get('profile')?.heightCm;
  const bmi = latest && h ? latest.kg / (h / 100) ** 2 : null;
  const change = latest && first && w.length > 1 ? conv(latest.kg) - conv(first.kg) : null;
  return `<div class="card">
      <div class="row between"><div><h3>Body weight</h3><p class="muted small">${latest ? `Last logged ${relDay(latest.date).toLowerCase()}` : 'Track your trend over time'}</p></div>
      <button class="btn small primary" id="addW">${icon('plus')} Log</button></div>
      <div class="kv mt">
        <div><div class="v">${latest ? conv(latest.kg).toFixed(1) : '—'}</div><div class="l">Now (${u})</div></div>
        <div><div class="v">${change == null ? '—' : (change > 0 ? '+' : '') + change.toFixed(1)}</div><div class="l">Change</div></div>
        <div><div class="v">${bmi ? bmi.toFixed(1) : '—'}</div><div class="l">BMI</div></div>
      </div>
      <div class="mt">${lineChart(w.map((x) => ({ x: x.date, y: Math.round(conv(x.kg) * 10) / 10 })), { color: 'var(--purple)' })}</div>
    </div>
    ${!h ? `<div class="card tight mt row gap"><span style="font-size:24px">📏</span><div class="grow small">Add your height to see BMI.</div><button class="btn small" id="addH">Add height</button></div>` : ''}
    ${w.length ? `<div class="section"><div class="section-h"><h2>Log</h2></div><div class="list">${[...w].reverse().slice(0, 30).map((x) => `<div class="li"><div class="li-main"><div class="li-title">${conv(x.kg).toFixed(1)} ${u}</div><div class="li-sub">${new Date(x.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div></div><button class="icon-btn flat" data-delw="${x.date}" aria-label="Delete">${icon('trash')}</button></div>`).join('')}</div></div>` : ''}`;
}

export const view = {
  tab: 'progress',
  title: 'Progress',
  render(_p, query) {
    if (query.tab) tab = query.tab;
    const body_ = tab === 'overview' ? overview() : tab === 'history' ? history() : body();
    return `<div class="view">
      <div class="topbar"><h1>Progress</h1></div>
      <div class="seg mb" id="ptabs">${[['overview', 'Overview'], ['history', 'History'], ['body', 'Body']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-t="${k}">${l}</button>`).join('')}</div>
      <div id="pbody">${body_}</div>
    </div>`;
  },
  mount(root) {
    $$('#ptabs button', root).forEach((b) => (b.onclick = () => { tab = b.dataset.t; go('/progress', { replace: true }); }));
    $$('#metric .chip', root).forEach((b) => (b.onclick = () => { metric = b.dataset.m; go('/progress', { replace: true }); }));
    $('#addW', root)?.addEventListener('click', async () => {
      const u = units();
      const last = store.get('weights')?.at(-1);
      const v = await promptDialog(`Today’s weight (${u})`, { type: 'number', step: '0.1', value: last ? (u === 'lb' ? last.kg / 0.4536 : last.kg).toFixed(1) : '' });
      const n = parseFloat(v);
      if (!n) return;
      await store.addWeight({ date: Date.now(), kg: u === 'lb' ? n * 0.4536 : n });
      toast('Weight logged', { icon: '⚖️' });
      go('/progress', { replace: true });
    });
    $('#addH', root)?.addEventListener('click', async () => {
      const v = parseFloat(await promptDialog('Height (cm)', { type: 'number', placeholder: 'e.g. 175' }));
      if (!v) return;
      await store.set('profile', { ...store.get('profile'), heightCm: v });
      go('/progress', { replace: true });
    });
    $$('[data-delw]', root).forEach((b) => (b.onclick = async () => {
      if (await confirmDialog('Delete this entry?', '', { ok: 'Delete', danger: true })) { await store.deleteWeight(+b.dataset.delw); go('/progress', { replace: true }); }
    }));
  },
};
