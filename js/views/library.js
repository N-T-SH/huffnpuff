// Huff n Puff — exercise library and exercise detail (with live claymation).
import * as store from '../store.js';
import * as stats from '../stats.js';
import { EXERCISES, getEx, MUSCLES, EQUIPMENT, CATS } from '../exercises.js';
import { ClayPlayer } from '../clay.js';
import { esc, icon, thumb, $, $$, fmtW, look, units, mmss } from '../ui.js';
import { bodyMap, lineChart } from '../charts.js';
import { go, back } from '../app.js';
import { allWorkouts } from '../workouts.js';
import { characterFor, nameOf } from '../cast.js';
import { vote, setVote, votes, report, mostSkipped } from '../feedback.js';

let q = '';
let cat = 'all';
let muscle = null;
let equip = null;
let showHidden = false;

function matches(ex) {
  if (!showHidden && vote(ex.id) < 0) return false;
  if (showHidden === 'only' && vote(ex.id) >= 0) return false;
  if (cat !== 'all' && ex.cat !== cat) return false;
  if (muscle && !ex.primary.includes(muscle) && !ex.secondary.includes(muscle)) return false;
  if (equip && !ex.equip.includes(equip)) return false;
  if (q) {
    const hay = (ex.name + ' ' + ex.primary.map((m) => MUSCLES[m]).join(' ') + ' ' + ex.equip.map((e) => EQUIPMENT[e]).join(' ')).toLowerCase();
    return q.toLowerCase().split(/\s+/).every((t) => hay.includes(t));
  }
  return true;
}

export function voteBtns(id, cls = '') {
  const v = vote(id);
  return `<div class="votes ${cls}" data-votes="${id}"><button class="vote up ${v > 0 ? 'on' : ''}" data-vote="1" aria-label="Thumbs up" aria-pressed="${v > 0}">👍</button><button class="vote down ${v < 0 ? 'on' : ''}" data-vote="-1" aria-label="Thumbs down — hide this move" aria-pressed="${v < 0}">👎</button></div>`;
}

export function bindVotes(root, after) {
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-vote]');
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    const wrap = b.closest('[data-votes]');
    const id = wrap.dataset.votes;
    const v = await setVote(id, +b.dataset.vote);
    $$('[data-vote]', wrap).forEach((x) => { const on = +x.dataset.vote === v; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
    const { toast } = await import('../ui.js');
    toast(v > 0 ? 'More moves like this, coming up' : v < 0 ? 'Hidden from your library' : 'Vote cleared', { icon: v > 0 ? '👍' : v < 0 ? '🙈' : '↩️', ms: 1600 });
    after?.(id, v);
  });
}

function card(ex) {
  return `<div class="ex-wrap${vote(ex.id) < 0 ? ' voted-down' : ''}"><a class="ex-card" href="#/exercise/${ex.id}">${thumb(ex.id)}<div class="ex-name">${esc(ex.name)}</div><div class="ex-meta">${ex.primary.map((m) => MUSCLES[m]).slice(0, 2).join(' · ')}</div></a>${voteBtns(ex.id)}</div>`;
}

function feedbackSheet(sheet, toast) {
  const sk = mostSkipped(8);
  const fb = votes();
  const up = Object.keys(fb).filter((id) => fb[id] > 0).map(getEx).filter(Boolean);
  const down = Object.keys(fb).filter((id) => fb[id] < 0).map(getEx).filter(Boolean);
  const pills = (l) => (l.length ? `<div class="row wrap gap-s">${l.map((e) => `<a class="pill" href="#/exercise/${e.id}">${esc(e.name)}</a>`).join('')}</div>` : '<p class="muted small">Nothing yet.</p>');
  sheet(`<div class="dialog"><h3 class="graffiti">Move feedback</h3>
    <p class="muted small">Next time the move library gets refreshed, the most-skipped and thumbs-down moves are archived, and your thumbs-ups decide what new moves get sculpted.</p>
    <h4 class="mt">🏃 Skipped the most</h4>${sk.length ? `<div class="list">${sk.map((s) => `<a class="li" href="#/exercise/${s.id}"><div class="li-main"><div class="li-title">${esc(getEx(s.id).name)}</div><div class="li-sub">${s.skips} skip${s.skips > 1 ? 's' : ''} · ${s.done} finished</div></div></a>`).join('')}</div>` : '<p class="muted small">No skips logged yet.</p>'}
    <h4 class="mt">👍 More like these</h4>${pills(up)}
    <h4 class="mt">👎 Hidden</h4>${pills(down)}
    <button class="btn primary block mt" id="copyRep">${icon('list')} Copy report</button></div>`, {
    onMount(el) {
      $('#copyRep', el).onclick = async () => {
        try { await navigator.clipboard.writeText(report()); toast('Report copied — paste it when you ask for a library refresh', { icon: '📋', ms: 3500 }); }
        catch { toast('Couldn’t copy — long-press to select instead', { icon: '⚠️' }); }
      };
    },
  });
}

function grid() {
  const list = EXERCISES.filter(matches);
  return list.length ? `<div class="ex-grid">${list.map(card).join('')}</div>` : `<div class="empty"><h3>No moves found</h3><p class="muted small">Try a different search or filter.</p></div>`;
}

export const listView = {
  tab: 'exercises',
  title: 'Exercises',
  keepScroll: true,
  render() {
    return `<div class="view">
      <div class="topbar"><h1>Moves</h1><button class="pill" id="fbBtn">👍👎 Feedback</button></div>
      <div class="search mb">${icon('search')}<input class="input" id="q" type="search" placeholder="Search squats, chest, dumbbell…" value="${esc(q)}" autocomplete="off"></div>
      <div class="chips" id="cats">${[['all', 'All'], ...Object.entries(CATS)].map(([k, l]) => `<button class="chip ${cat === k ? 'on' : ''}" data-c="${k}">${l}</button>`).join('')}
        <button class="chip ${muscle ? 'on' : ''}" id="mBtn">${icon('filter')} ${muscle ? esc(MUSCLES[muscle]) : 'Muscle'}</button>
        <button class="chip ${equip ? 'on' : ''}" id="eBtn">${icon('dumbbell')} ${equip ? esc(EQUIPMENT[equip]) : 'Equipment'}</button>
        ${(() => { const n = Object.values(votes()).filter((v) => v < 0).length; return n ? `<button class="chip ${showHidden ? 'on' : ''}" id="hBtn">🙈 Hidden (${n})</button>` : ''; })()}</div>
      <div id="grid">${grid()}</div>
    </div>`;
  },
  mount(root) {
    const refresh = () => { $('#grid', root).innerHTML = grid(); import('../ui.js').then((m) => m.hydrateThumbs(root)); };
    $('#q', root).oninput = (e) => { q = e.target.value; refresh(); };
    $$('[data-c]', root).forEach((b) => (b.onclick = () => { cat = b.dataset.c; go('/exercises', { replace: true }); }));
    const pick = async (title, map, cur, set) => {
      const { sheet } = await import('../ui.js');
      sheet(`<div class="dialog"><h3>${title}</h3><div class="row wrap gap-s"><button class="chip ${!cur ? 'on' : ''}" data-v="">Any</button>${Object.entries(map).map(([k, l]) => `<button class="chip ${cur === k ? 'on' : ''}" data-v="${k}">${esc(l)}</button>`).join('')}</div></div>`, {
        onMount(el, close) {
          $$('[data-v]', el).forEach((b) => (b.onclick = async () => { set(b.dataset.v || null); await close(); go('/exercises', { replace: true }); }));
        },
      });
    };
    $('#mBtn', root).onclick = () => pick('Target muscle', MUSCLES, muscle, (v) => (muscle = v));
    $('#hBtn', root)?.addEventListener('click', () => { showHidden = showHidden ? false : 'only'; go('/exercises', { replace: true }); });
    $('#fbBtn', root).onclick = async () => { const ui = await import('../ui.js'); feedbackSheet(ui.sheet, ui.toast); };
    bindVotes($('#grid', root), (id, v) => {
      const w = $(`[data-votes="${id}"]`, root)?.closest('.ex-wrap');
      if (!w) return;
      w.classList.toggle('voted-down', v < 0);
      if ((v < 0 && !showHidden) || (v >= 0 && showHidden === 'only')) { w.classList.add('bye'); setTimeout(() => go('/exercises', { replace: true }), 380); }
    });
    $('#eBtn', root).onclick = () => pick('Equipment', EQUIPMENT, equip, (v) => (equip = v));
  },
};

/* ---------- detail ---------- */
let player = null;
let tab = 'how';

function historyTab(ex) {
  const h = stats.exerciseHistory(ex.id);
  const r = stats.records(ex.id);
  if (!h.length) return `<div class="empty"><p class="muted">No history yet. Log this move in a workout and your records will show up here.</p></div>`;
  const isTime = ex.type === 'time';
  const weighted = h.some((x) => x.best > 0);
  const series = h.map((x) => ({ x: x.date, y: isTime ? x.time : weighted ? Math.round(x.e1rm * 10) / 10 : x.maxReps }));
  return `<div class="kv">
      ${weighted ? `<div><div class="v">${fmtW(r.weight)}</div><div class="l">Heaviest</div></div><div><div class="v">${fmtW(Math.round(r.e1rm * 10) / 10)}</div><div class="l">Est. 1RM</div></div>` : ''}
      ${isTime ? `<div><div class="v">${mmss(r.time)}</div><div class="l">Longest</div></div>` : `<div><div class="v">${r.reps}</div><div class="l">Most reps</div></div>`}
      <div><div class="v">${r.sessions}</div><div class="l">Sessions</div></div>
    </div>
    <h4 class="mt">${isTime ? 'Hold time' : weighted ? `Estimated 1RM (${units()})` : 'Best set (reps)'}</h4>
    ${lineChart(series, { fmt: (v) => (isTime ? mmss(v) : v) })}
    <div class="list mt">${h.slice(-6).reverse().map((x) => `<div class="soft" style="padding:10px 12px"><div class="row between small"><b>${new Date(x.date).toLocaleDateString()}</b><span class="muted">${x.sets.length} sets</span></div>
      <div class="muted small">${x.sets.map((s) => (s.time && !s.reps ? mmss(s.time) : `${s.reps || 0}${s.weight ? '×' + s.weight : ''}`)).join(' · ')}</div></div>`).join('')}</div>`;
}

export const detailView = {
  tab: 'exercises',
  title: ([id]) => getEx(id)?.name || 'Exercise',
  render([id]) {
    const ex = getEx(id);
    if (!ex) return `<div class="view"><div class="topbar"><button class="icon-btn" data-back>${icon('back')}</button><h2>Not found</h2></div></div>`;
    return `<div class="view">
      <div class="topbar"><button class="icon-btn" data-back aria-label="Back">${icon('back')}</button><span class="grow"></span>
        <button class="icon-btn" id="speed" aria-label="Animation speed">1×</button>
        <button class="icon-btn" id="pp" aria-label="Pause animation">${icon('pause')}</button></div>
      <div class="clay-stage detail-stage" id="stage"></div>
      <h1 class="mt" style="font-size:27px">${esc(ex.name)}</h1>
      <div class="row between mt gap">${(() => { const c = characterFor(ex); return `<a class="pill p" href="#/cast" style="display:inline-flex">${c.emoji} Performed by ${esc(nameOf(c))}</a>`; })()}${voteBtns(ex.id, 'inline')}</div>
      <div class="row wrap gap-s mt">
        <span class="pill p">${esc(CATS[ex.cat])}</span>
        <span class="pill v">${ex.type === 'time' ? `${icon('clock')} ${ex.time}s hold` : `${ex.reps} reps${ex.perSide ? ' / side' : ''}`}</span>
        ${ex.equip.filter((e) => e !== 'mat').map((e) => `<span class="pill y">${esc(EQUIPMENT[e])}</span>`).join('')}
        <span class="pill t">${icon('fire')} ~${ex.met} MET</span>
      </div>
      <div class="seg mt" id="tabs2">${[['how', 'How to'], ['muscles', 'Muscles'], ['history', 'History']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-t="${k}">${l}</button>`).join('')}</div>
      <div class="card mt" id="tabBody"></div>
      <button class="btn primary big block mt" id="solo">${icon('play')} Practice this move</button>
      ${(() => {
        const ws = allWorkouts().filter((w) => w.items.some((i) => i.ex === ex.id)).slice(0, 6);
        return ws.length ? `<div class="section"><div class="section-h"><h2>Featured in</h2></div><div class="list">${ws.map((w) => `<a class="li" href="#/workout/${encodeURIComponent(w.id)}"><div class="emoji-badge" style="background:${w.color}">${w.emoji}</div><div class="li-main"><div class="li-title">${esc(w.name)}</div><div class="li-sub">${esc(w.focus || '')}</div></div>${icon('chev', 'chev')}</a>`).join('')}</div></div>` : '';
      })()}
    </div>`;
  },
  mount(root, [id]) {
    const ex = getEx(id);
    root.querySelector('[data-back]')?.addEventListener('click', () => back('/exercises'));
    if (!ex) return;
    player = new ClayPlayer($('#stage', root), ex, { look: look(), boil: store.settings().stopMotion, fps: store.settings().stopMotion ? 12 : 0 });
    player.play();
    const speeds = [1, 0.5, 0.25];
    let si = 0;
    $('#speed', root).onclick = (e) => { si = (si + 1) % speeds.length; player.speed = speeds[si]; e.currentTarget.textContent = speeds[si] + '×'; };
    $('#pp', root).onclick = (e) => {
      if (player.playing) { player.pause(); e.currentTarget.innerHTML = icon('play'); } else { player.play(); e.currentTarget.innerHTML = icon('pause'); }
    };
    const paintTab = () => {
      const body = $('#tabBody', root);
      if (tab === 'how') {
        body.innerHTML = `<h3 class="mb">Steps</h3><ol class="steps">${ex.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
          ${ex.tips.length ? `<h3 class="mt-l mb">Coach tips</h3><ul class="bullets">${ex.tips.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
          ${ex.mistakes.length ? `<h3 class="mt-l mb">Avoid</h3><ul class="bullets bad">${ex.mistakes.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}`;
      } else if (tab === 'muscles') {
        body.innerHTML = `<h3 class="graffiti center">What’s getting squished</h3>${bodyMap({}, { highlight: ex })}<div class="legend mt"><span><i style="background:var(--muscle3)"></i>Main event</span><span><i style="background:var(--muscle1)"></i>Supporting cast</span></div>`;
      } else body.innerHTML = historyTab(ex);
    };
    paintTab();
    $$('#tabs2 button', root).forEach((b) => (b.onclick = () => {
      tab = b.dataset.t;
      $$('#tabs2 button', root).forEach((x) => x.classList.toggle('on', x === b));
      paintTab();
    }));
    bindVotes(root);
    $('#solo', root).onclick = () => go('/play/' + encodeURIComponent('ex:' + ex.id));
    const onVis = () => { if (document.hidden) player?.pause(); else player?.play(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { player?.destroy(); player = null; document.removeEventListener('visibilitychange', onVis); };
  },
};
