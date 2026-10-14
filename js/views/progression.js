// Huff n Puff — progressive overload controls (shown on Progress): on/off, pace, lighter weeks, and
// each planned workout's level. All automatic; the steppers are there to nudge a level by hand.
import * as store from '../store.js';
import { getWorkout, PACES, MAX_LEVEL, plannedIds, levelRec, setLevel } from '../workouts.js';
import { esc, icon, $$, stepper, bindSteppers } from '../ui.js';

const toggle = (id, label, sub, on, ic, col) => `<label class="li"><span class="set-ic" style="background:${col}">${icon(ic)}</span><div class="li-main"><div class="li-title">${label}</div><div class="li-sub">${sub}</div></div><span class="switch"><input type="checkbox" data-prog="${id}" ${on ? 'checked' : ''}><span></span></span></label>`;

function progLine(id) {
  const w = getWorkout(id);
  return w?.prog?.light ? 'Lighter week' : w?.prog?.changes?.length ? w.prog.changes.join(' · ') : 'As written';
}

export function progSection() {
  const s = store.settings();
  const on = s.progOn !== false;
  const ids = [...plannedIds()];
  return `<div class="section"><div class="section-h"><h2>Progression</h2></div><div class="card">
    ${toggle('progOn', 'Progressive overload', 'Planned workouts get a little harder each week you finish them', on, 'chart', 'var(--green)')}
    ${on ? `<div class="li" style="flex-wrap:wrap"><span class="set-ic" style="background:var(--green)">${icon('bolt')}</span><div class="li-main"><div class="li-title">Pace</div><div class="li-sub">${{ gentle: 'Up every 2 weeks', steady: 'Up every week', bold: 'Up faster' }[s.progPace || 'steady']}</div></div>
        <div class="seg" style="width:210px" id="pace">${Object.entries(PACES).map(([k, v]) => `<button class="${(s.progPace || 'steady') === k ? 'on' : ''}" data-p="${k}">${v.label}</button>`).join('')}</div></div>
      ${toggle('progDeload', 'Lighter 4th week', 'Every 4th week eases off so you recover', s.progDeload !== false, 'heart', 'var(--teal)')}
      ${ids.length ? ids.map((id) => {
        const w = getWorkout(id);
        if (!w) return '';
        return `<div class="li"><span class="set-ic" style="background:${w.color}">${w.emoji}</span><div class="li-main"><div class="li-title">${esc(w.name)}</div><div class="li-sub" data-progsub="${esc(id)}">${esc(progLine(id))}</div></div>
          <div style="width:132px">${stepper('lvl:' + id, levelRec(id).level, { min: 0, max: MAX_LEVEL, label: `${w.name} level` })}</div></div>`;
      }).join('') : '<div class="li"><div class="li-main"><div class="li-sub">Plan some workouts in You → Weekly plan to start levelling them up.</div></div></div>'}` : ''}
  </div></div>`;
}

// rerender: redraw the host view after a change that alters the section's shape
export function bindProgression(root, rerender) {
  $$('[data-prog]', root).forEach((i) => (i.onchange = async () => {
    await store.setSetting(i.dataset.prog, i.checked);
    if (i.dataset.prog === 'progOn') rerender();
  }));
  $$('#pace button', root).forEach((b) => (b.onclick = async () => { await store.setSetting('progPace', b.dataset.p); rerender(); }));
  bindSteppers(root, async (k, v) => {
    if (!k.startsWith('lvl:')) return;
    const id = k.slice(4);
    await setLevel(id, v);
    const el = root.querySelector(`[data-progsub="${CSS.escape(id)}"]`);
    if (el) el.textContent = progLine(id);
  });
}
