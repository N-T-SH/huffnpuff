// Pulse — a single logged session.
import * as store from '../store.js';
import * as stats from '../stats.js';
import { getEx } from '../exercises.js';
import { getWorkout } from '../workouts.js';
import { esc, icon, $, mmss, num, fmtTime, thumb, confirmDialog, toast } from '../ui.js';
import { prLabel } from './summary.js';
import { go, back } from '../app.js';

const MOODS = ['😵', '😮‍💨', '🙂', '😄', '🤩'];

export const view = {
  tab: 'progress',
  title: 'Session',
  render([id]) {
    const s = stats.sessions().find((x) => x.id === id);
    if (!s) return `<div class="view"><div class="topbar"><button class="icon-btn" data-back>${icon('back')}</button><h2>Not found</h2></div></div>`;
    const vol = stats.sessionVolume(s);
    const u = s.units || store.settings().units;
    return `<div class="view">
      <div class="topbar"><button class="icon-btn" data-back aria-label="Back">${icon('back')}</button><span class="grow"></span><button class="icon-btn" id="del" aria-label="Delete">${icon('trash')}</button></div>
      <div class="row gap"><div class="emoji-badge" style="background:${s.color || 'var(--primary)'}">${s.emoji || '💪'}</div><div class="grow"><h1 style="font-size:24px">${esc(s.name)}</h1>
        <div class="muted small bold">${new Date(s.start).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} · ${fmtTime(s.start)}</div></div>${s.rating ? `<span style="font-size:30px">${MOODS[s.rating - 1]}</span>` : ''}</div>
      <div class="stats3 mt">
        <div class="stat"><div class="v">${mmss(s.duration)}</div><div class="l">Time</div></div>
        <div class="stat"><div class="v">${num(s.calories)}</div><div class="l">kcal</div></div>
        <div class="stat"><div class="v">${vol ? num(Math.round(vol)) : stats.sessionReps(s) || s.entries.reduce((a, e) => a + e.sets.length, 0)}</div><div class="l">${vol ? u : 'Reps / sets'}</div></div>
      </div>
      ${s.notes ? `<div class="card mt"><div class="muted small bold">NOTES</div><p class="mt">${esc(s.notes)}</p></div>` : ''}
      ${s.prs?.length ? `<div class="section"><div class="section-h"><h2>Records</h2></div><div class="list">${s.prs.map(prLabel).join('')}</div></div>` : ''}
      <div class="section"><div class="section-h"><h2>Exercises</h2></div><div class="list">
        ${s.entries.map((e) => {
          const ex = getEx(e.ex);
          return `<div class="card tight"><a class="row gap" href="#/exercise/${e.ex}"><div class="li-thumb">${thumb(e.ex)}</div><div class="grow"><div class="bold">${esc(ex?.name || e.ex)}</div><div class="muted small">${e.sets.length} set${e.sets.length > 1 ? 's' : ''}</div></div></a>
          <div class="mt">${e.sets.map((st, i) => `<div class="set-row small"><span class="pill">${i + 1}</span><span class="grow bold">${st.reps ? `${st.reps} reps` : st.time ? mmss(st.time) : '—'}${st.weight ? ` × ${st.weight} ${u}` : ''}</span>${st.weight && st.reps ? `<span class="muted">1RM ~${Math.round(stats.e1rm(st.weight, st.reps))}</span>` : ''}</div>`).join('')}</div></div>`;
        }).join('')}
      </div></div>
      ${getWorkout(s.workoutId) ? `<button class="btn primary big block mt" id="again">${icon('repeat')} Do it again</button>` : ''}
    </div>`;
  },
  mount(root, [id]) {
    root.querySelector('[data-back]')?.addEventListener('click', () => back('/progress'));
    const s = stats.sessions().find((x) => x.id === id);
    if (!s) return;
    $('#again', root)?.addEventListener('click', () => go('/play/' + encodeURIComponent(s.workoutId)));
    $('#del', root).onclick = async () => {
      if (await confirmDialog('Delete this session?', 'This removes it from your history and stats.', { ok: 'Delete', danger: true })) {
        await store.deleteSession(id);
        toast('Session deleted', { icon: '🗑️' });
        back('/progress');
      }
    };
  },
};
