// SuperSweatClub — "You": character, plan, preferences, data.
import * as store from '../store.js';
import * as stats from '../stats.js';
import { ClayPlayer } from '../clay.js';
import { getEx, EQUIPMENT } from '../exercises.js';
import { allWorkouts, getWorkout, generatePlan, estimateMinutes } from '../workouts.js';
import { esc, icon, $, $$, sheet, toast, confirmDialog, promptDialog, stepper, bindSteppers, thumb } from '../ui.js';
import { CAST, CAST_BY_ID, meId, myLook, lookFromColors, colorSlots, paletteFor } from '../cast.js';
import { go, install, promptInstall, VERSION } from '../app.js';
import { say, unlock, deviceVoices, naturalVoiceReady, naturalVoices, reloadVoice } from '../audio.js';
import { LINES } from '../voice-lines.js';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const GOALS = { fit: '🌟 Stay active', lose: '🔥 Burn fat', strength: '💪 Get strong', mobility: '🧘 Move better' };
const LEVELS = { beginner: '🌱 Beginner', intermediate: '🌿 Intermediate', advanced: '🌳 Advanced' };
let clay = null;

const lookNow = () => myLook();

function swatches(key, me) {
  const cur = lookNow()[key];
  const list = paletteFor(me, key);
  return `<div class="swatches">${list.map((c) => `<button class="swatch ${c === cur ? 'on' : ''}" style="background:${c}" data-look="${key}" data-c="${c}" aria-label="${key} ${c}"></button>`).join('')}</div>`;
}

function toggle(id, label, sub, on, ic, col) {
  return `<label class="li"><span class="set-ic" style="background:${col}">${icon(ic)}</span><div class="li-main"><div class="li-title">${label}</div>${sub ? `<div class="li-sub">${sub}</div>` : ''}</div><span class="switch"><input type="checkbox" data-set="${id}" ${on ? 'checked' : ''}><span></span></span></label>`;
}

function row(id, label, value, ic, col) {
  return `<button class="li" data-row="${id}"><span class="set-ic" style="background:${col}">${icon(ic)}</span><div class="li-main"><div class="li-title">${label}</div></div><span class="muted small bold">${value}</span>${icon('chev', 'chev')}</button>`;
}

export const view = {
  tab: 'me',
  title: 'You',
  keepScroll: true,
  render() {
    const p = store.get('profile') || {};
    const s = store.settings();
    const plan = store.get('plan') || {};
    const t = stats.totals();
    const order = [1, 2, 3, 4, 5, 6, 0];
    const me = CAST_BY_ID[meId()];
    return `<div class="view settings">
      <div class="topbar"><h1>You</h1></div>
      <div class="card me-card" style="padding:14px">
        <div class="row gap">
          <div class="clay-stage" id="me" style="width:46%;flex:none"></div>
          <div class="grow"><h2 id="nm" class="graffiti">${esc(p.name || 'Champ')}</h2><p class="muted small">Cast as ${me.emoji} ${esc(me.name)}<br>${GOALS[p.goal] || ''} · ${LEVELS[p.level] || ''}</p>
            <div class="row gap-s mt wrap"><span class="pill y">🏆 ${t.workouts}</span><span class="pill t">⏱️ ${t.minutes}m</span></div>
            <button class="btn small mt" id="rename">${icon('edit')} Name</button></div>
        </div>
        <div class="mt"><div class="muted tiny bold mb">PICK YOUR CHARACTER</div>
          <div class="cast-pick" id="castPick">${CAST.map((c) => `<button class="cast-pick-b ${c.id === me.id ? 'on' : ''}" data-me="${c.id}" aria-label="Play as ${esc(c.name)}">${thumb('wave', '', { portrait: true, char: c.id })}<span>${c.id === me.id ? esc(p.name || 'You') : esc(c.name)}</span></button>`).join('')}</div></div>
        <label class="col gap-s mt"><span class="muted tiny bold">YOUR CHARACTER’S STORY</span>
          <textarea class="input" id="bio" rows="3" maxlength="240" placeholder="${esc(me.bio)}">${esc(s.me?.bio || '')}</textarea></label>
        ${colorSlots(me).map(([k, label]) => `<div class="mt"><div class="muted tiny bold mb">${esc(label.toUpperCase())}</div>${swatches(k, me)}</div>`).join('')}
      </div>

      <a class="card mt row gap cast-link" href="#/cast"><span style="font-size:30px">🎬</span><div class="grow"><b>Meet the cast</b><div class="muted small">7 clay characters, each with their own set. Choose who performs your moves.</div></div>${icon('chev', 'chev')}</a>

      <div class="section"><div class="section-h"><h2>Weekly plan</h2><button class="link" id="regen">Rebuild</button></div>
        <div class="card">${order.map((d) => {
          const w = plan[d] ? getWorkout(plan[d]) : null;
          return `<button class="li" data-day="${d}"><span class="set-ic" style="background:${w ? w.color : 'var(--track)'};color:${w ? '#fff' : 'var(--muted)'}">${w ? w.emoji : '·'}</span><div class="li-main"><div class="li-title">${DAY_NAMES[d]}</div><div class="li-sub">${w ? `${esc(w.name)} · ${estimateMinutes(w)} min` : 'Rest day'}</div></div>${icon('chev', 'chev')}</button>`;
        }).join('')}</div></div>

      <div class="section"><div class="section-h"><h2>Training</h2></div>
        <div class="card">
          ${row('goal', 'Goal', GOALS[p.goal] || '—', 'sparkle', 'var(--primary)')}
          ${row('level', 'Level', LEVELS[p.level] || '—', 'chart', 'var(--green)')}
          ${row('equip', 'Equipment', (p.equipment || []).length ? `${p.equipment.length} item${p.equipment.length > 1 ? 's' : ''}` : 'None', 'dumbbell', 'var(--purple)')}
          <div class="li"><span class="set-ic" style="background:var(--accent)">${icon('calendar')}</span><div class="li-main"><div class="li-title">Weekly goal</div><div class="li-sub">Workout days per week</div></div><div style="width:150px">${stepper('weeklyGoal', s.weeklyGoal, { min: 1, max: 7, label: 'Weekly goal' })}</div></div>
          <div class="li"><span class="set-ic" style="background:var(--blue)">${icon('repeat')}</span><div class="li-main"><div class="li-title">Rest</div><div class="li-sub">Between every move and set, in all workouts</div></div><div style="width:150px">${stepper('moveRest', s.moveRest ?? 10, { min: 0, max: 120, step: 5, unit: 's', label: 'Rest' })}</div></div>
        </div></div>

      <div class="section"><div class="section-h"><h2>Preferences</h2></div>
        <div class="card">
          <div class="li"><span class="set-ic" style="background:var(--ink)">${icon('scale')}</span><div class="li-main"><div class="li-title">Units</div></div><div class="seg" style="width:150px" id="units"><button class="${s.units === 'kg' ? 'on' : ''}" data-u="kg">kg</button><button class="${s.units === 'lb' ? 'on' : ''}" data-u="lb">lb</button></div></div>
          <div class="li"><span class="set-ic" style="background:#3d3a6b">${icon('sparkle')}</span><div class="li-main"><div class="li-title">Theme</div></div><div class="seg" style="width:190px" id="theme">${['auto', 'light', 'dark'].map((t2) => `<button class="${s.theme === t2 ? 'on' : ''}" data-t="${t2}">${t2[0].toUpperCase() + t2.slice(1)}</button>`).join('')}</div></div>
          <div class="li"><span class="set-ic" style="background:var(--pink)">${icon('calendar')}</span><div class="li-main"><div class="li-title">Week starts on</div></div><div class="seg" style="width:150px" id="wstart"><button class="${s.weekStart === 1 ? 'on' : ''}" data-w="1">Mon</button><button class="${s.weekStart === 0 ? 'on' : ''}" data-w="0">Sun</button></div></div>
          ${toggle('sound', 'Sound effects', 'Beeps & countdown ticks', s.sound, 'volume', 'var(--primary)')}
          ${toggle('voice', 'Voice coach', 'Spoken cues during workouts', s.voice, 'info', 'var(--purple)')}
          <div class="li"><span class="set-ic" style="background:var(--purple)">${icon('volume')}</span><div class="li-main"><div class="li-title">Coach voice</div><div class="li-sub" id="voiceSub">${s.voiceEngine === 'device' ? 'Your phone’s own voice' : 'Natural voice, recorded for the app'}</div></div>
            <div class="seg" style="width:170px" id="vEngine"><button class="${s.voiceEngine !== 'device' ? 'on' : ''}" data-v="natural">Natural</button><button class="${s.voiceEngine === 'device' ? 'on' : ''}" data-v="device">Device</button></div></div>
          ${s.voiceEngine !== 'device' ? `<div class="li"><span class="set-ic" style="background:var(--purple)">${icon('sparkle')}</span><div class="li-main"><div class="li-title">Voice</div></div><select class="input" id="nPick" style="width:190px;padding:8px 10px"><option value="">Default</option></select></div>` : ''}
          ${s.voiceEngine === 'device' ? `<div class="li"><span class="set-ic" style="background:var(--purple)">${icon('phone')}</span><div class="li-main"><div class="li-title">Device voice</div></div><select class="input" id="vPick" style="width:170px;padding:8px 10px"><option value="">Automatic</option></select></div>` : ''}
          <div class="li"><span class="set-ic" style="background:var(--purple)">${icon('clock')}</span><div class="li-main"><div class="li-title">Voice speed</div></div>
            <div class="seg" style="width:200px" id="vRate">${[[0.9, 'Slower'], [1, 'Normal'], [1.15, 'Faster']].map(([r, l]) => `<button class="${(s.voiceRate || 1) === r ? 'on' : ''}" data-r="${r}">${l}</button>`).join('')}</div></div>
          ${toggle('haptics', 'Vibration', 'Buzz on transitions', s.haptics, 'phone', 'var(--teal)')}
          ${toggle('stopMotion', 'Stop-motion style', 'Claymation boil at 12 fps (off = smooth)', s.stopMotion, 'sparkle', 'var(--accent)')}
        </div></div>

      <div class="section"><div class="section-h"><h2>Your data</h2></div>
        <div class="card">
          <div class="li" style="align-items:flex-start"><span class="set-ic" style="background:var(--green)">🔒</span><div class="li-main" style="white-space:normal"><div class="li-title">100% on this device</div><div class="li-sub" style="white-space:normal">No accounts, no tracking, no cloud. Back up regularly so you never lose progress.</div></div></div>
          <button class="li" id="export"><span class="set-ic" style="background:var(--blue)">${icon('download')}</span><div class="li-main"><div class="li-title">Export backup</div><div class="li-sub">Download a .json file</div></div></button>
          <button class="li" id="import"><span class="set-ic" style="background:var(--purple)">${icon('upload')}</span><div class="li-main"><div class="li-title">Import backup</div><div class="li-sub">Restore from a .json file</div></div></button>
          <button class="li" id="csv"><span class="set-ic" style="background:var(--teal)">${icon('list')}</span><div class="li-main"><div class="li-title">Export CSV</div><div class="li-sub">Every set, spreadsheet-ready</div></div></button>
          <button class="li" id="reset" style="color:var(--danger)"><span class="set-ic" style="background:var(--danger)">${icon('trash')}</span><div class="li-main"><div class="li-title">Erase everything</div></div></button>
          <input type="file" id="file" accept="application/json,.json" hidden>
        </div></div>

      <div class="section"><div class="card">
        ${install.installed ? '' : `<button class="li" id="install"><span class="set-ic" style="background:var(--primary)">${icon('phone')}</span><div class="li-main"><div class="li-title">Install app</div><div class="li-sub">${install.prompt ? 'Add SuperSweatClub to your home screen' : 'Use your browser menu → “Install app” / “Add to Home screen”'}</div></div></button>`}
        <button class="li" id="testVoice"><span class="set-ic" style="background:var(--purple)">${icon('volume')}</span><div class="li-main"><div class="li-title">Test sound & voice</div></div></button>
        <div class="li"><span class="set-ic" style="background:var(--accent)">${icon('heart')}</span><div class="li-main"><div class="li-title">SuperSweatClub v${VERSION}</div><div class="li-sub">Hand-sculpted with clay & code. Open source on GitHub.</div></div></div>
      </div></div>
    </div>`;
  },
  mount(root) {
    const me = CAST_BY_ID[meId()];
    clay = new ClayPlayer($('#me', root), getEx('flex'), { look: lookNow(), charId: me.id });
    clay.play();
    const rerender = () => go('/me', { replace: true });
    $$('[data-look]', root).forEach((b) => (b.onclick = () => {
      const look = { ...lookNow(), [b.dataset.look]: b.dataset.c };
      store.setSetting('look', look);
      $$(`[data-look="${b.dataset.look}"]`, root).forEach((x) => x.classList.toggle('on', x === b));
      clay.look = look;
      clay.draw?.(true);
    }));
    $$('[data-me]', root).forEach((b) => (b.onclick = async () => {
      const id = b.dataset.me;
      if (id === meId()) return;
      await store.set('settings', { ...store.settings(), me: { id, bio: '' }, look: lookFromColors(CAST_BY_ID[id].colors) });
      toast(`You’re playing ${CAST_BY_ID[id].name}’s part now`, { icon: CAST_BY_ID[id].emoji });
      rerender();
    }));
    $('#bio', root).onchange = (e) => store.setSetting('me', { id: meId(), bio: e.target.value.trim() });
    $('#rename', root).onclick = async () => {
      const v = await promptDialog('Your name', { value: store.get('profile')?.name || '' });
      if (v == null) return;
      await store.set('profile', { ...store.get('profile'), name: v.trim() });
      $('#nm', root).textContent = v.trim() || 'Champ';
    };
    $$('[data-set]', root).forEach((i) => (i.onchange = () => { store.setSetting(i.dataset.set, i.checked); if (i.checked && i.dataset.set === 'voice') { unlock(); say(LINES.voiceOn); } }));
    bindSteppers(root, (k, v) => store.setSetting(k, v));
    $$('#units button', root).forEach((b) => (b.onclick = async () => {
      const to = b.dataset.u;
      const from = store.settings().units;
      if (to === from) return;
      // convert logged weights so history stays correct
      const f = to === 'lb' ? 1 / 0.4536 : 0.4536;
      const round = (v) => Math.round(v * f * 2) / 2;
      const sessions = (store.get('sessions') || []).map((s) => ((s.units || from) === to ? s : {
        ...s, units: to,
        entries: s.entries.map((e) => ({ ...e, sets: e.sets.map((x) => (x.weight ? { ...x, weight: round(x.weight) } : x)) })),
        prs: (s.prs || []).map((p) => (p.type === 'weight' || p.type === 'e1rm' ? { ...p, value: round(p.value) } : p)),
      }));
      await store.set('sessions', sessions);
      await store.setSetting('units', to);
      toast(`Switched to ${to} — history converted`, { icon: '⚖️' });
      rerender();
    }));
    $$('#vEngine button', root).forEach((b) => (b.onclick = async () => { await store.setSetting('voiceEngine', b.dataset.v); unlock(); say(LINES.voiceOn); rerender(); }));
    $$('#vRate button', root).forEach((b) => (b.onclick = async () => { await store.setSetting('voiceRate', +b.dataset.r); $$('#vRate button', root).forEach((x) => x.classList.toggle('on', x === b)); unlock(); say(LINES.letsGo); }));
    const nPick = $('#nPick', root);
    if (nPick) {
      naturalVoices().then((list) => {
        const cur = store.settings().naturalVoice || list[0]?.id || '';
        nPick.innerHTML = list.length ? list.map((v, i) => `<option value="${esc(v.id)}" ${v.id === cur ? 'selected' : ''}>${esc(v.label)}${i === 0 ? ' (default)' : ''}</option>`).join('') : '<option value="">Not available yet</option>';
      });
      nPick.onchange = async () => { await store.setSetting('naturalVoice', nPick.value); await reloadVoice(); unlock(); say(LINES.letsGo); };
    }
    const pick = $('#vPick', root);
    if (pick) {
      const fill = () => {
        const cur = store.settings().deviceVoice;
        pick.innerHTML = '<option value="">Automatic</option>' + deviceVoices().map((v) => `<option value="${esc(v.name)}" ${v.name === cur ? 'selected' : ''}>${esc(v.name)}</option>`).join('');
      };
      fill();
      if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = fill;
      pick.onchange = async () => { await store.setSetting('deviceVoice', pick.value); unlock(); say(LINES.voiceOn); };
    }
    if (store.settings().voiceEngine !== 'device') naturalVoiceReady().then((ok) => { if (!ok && $('#voiceSub', root)) $('#voiceSub', root).textContent = 'Not available yet: using your phone’s voice'; });
    $$('#theme button', root).forEach((b) => (b.onclick = () => { store.setSetting('theme', b.dataset.t); rerender(); }));
    $$('#wstart button', root).forEach((b) => (b.onclick = () => { store.setSetting('weekStart', +b.dataset.w); rerender(); }));

    $$('[data-day]', root).forEach((b) => (b.onclick = () => pickWorkout(+b.dataset.day, rerender)));
    $('#regen', root).onclick = async () => {
      if (!(await confirmDialog('Rebuild your weekly plan?', 'We’ll pick routines for your training days based on your goal, level and equipment.', { ok: 'Rebuild' }))) return;
      const p = store.get('profile');
      const days = Object.keys(store.get('plan') || {}).map(Number);
      await store.set('plan', generatePlan({ ...p, days: days.length ? days : p.days }));
      toast('Fresh plan ready', { icon: '📅' });
      rerender();
    };
    $$('[data-row]', root).forEach((b) => (b.onclick = () => {
      const k = b.dataset.row;
      const p = store.get('profile');
      if (k === 'goal' || k === 'level') {
        const map = k === 'goal' ? GOALS : LEVELS;
        sheet(`<div class="dialog"><h3>${k === 'goal' ? 'Main goal' : 'Fitness level'}</h3><div class="list">${Object.entries(map).map(([v, l]) => `<button class="li ${p[k] === v ? 'on' : ''}" data-v="${v}"><div class="li-main"><div class="li-title">${l}</div></div>${p[k] === v ? icon('check') : ''}</button>`).join('')}</div></div>`, {
          onMount(el, close) { $$('[data-v]', el).forEach((x) => (x.onclick = async () => { await store.set('profile', { ...p, [k]: x.dataset.v }); await close(); rerender(); })); },
        });
      } else if (k === 'equip') {
        const sel = new Set(p.equipment || []);
        const keys = Object.keys(EQUIPMENT).filter((e) => e !== 'none' && e !== 'mat');
        sheet(`<div class="dialog"><h3>Your equipment</h3><div class="row wrap gap-s">${keys.map((e) => `<button class="chip ${sel.has(e) ? 'on' : ''}" data-e="${e}">${EQUIPMENT[e]}</button>`).join('')}</div><button class="btn primary block" id="eqSave">Save</button></div>`, {
          onMount(el, close) {
            $$('[data-e]', el).forEach((x) => (x.onclick = () => { sel.has(x.dataset.e) ? sel.delete(x.dataset.e) : sel.add(x.dataset.e); x.classList.toggle('on'); }));
            $('#eqSave', el).onclick = async () => { await store.set('profile', { ...p, equipment: [...sel] }); await close(); rerender(); };
          },
        });
      }
    }));

    $('#export', root).onclick = () => {
      const blob = new Blob([JSON.stringify(store.exportData(), null, 2)], { type: 'application/json' });
      download(blob, `pulse-backup-${new Date().toISOString().slice(0, 10)}.json`);
      toast('Backup downloaded', { icon: '💾' });
    };
    $('#csv', root).onclick = () => {
      const rows = [['date', 'workout', 'exercise', 'set', 'reps', 'weight', 'units', 'seconds']];
      for (const s of stats.sessions()) for (const e of s.entries) e.sets.forEach((st, i) => rows.push([new Date(s.start).toISOString(), s.name, getEx(e.ex)?.name || e.ex, i + 1, st.reps || '', st.weight || '', s.units || store.settings().units, st.time || '']));
      const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      download(new Blob([csv], { type: 'text/csv' }), `pulse-sets-${new Date().toISOString().slice(0, 10)}.csv`);
    };
    $('#import', root).onclick = () => $('#file', root).click();
    $('#file', root).onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        if (!(await confirmDialog('Restore this backup?', `It will replace your current data with ${data.sessions?.length || 0} workouts from the file.`, { ok: 'Restore' }))) return;
        await store.importData(data);
        toast('Backup restored', { icon: '✅' });
        rerender();
      } catch {
        toast('That file isn’t a valid SuperSweatClub backup', { icon: '⚠️' });
      }
    };
    $('#reset', root).onclick = async () => {
      if (!(await confirmDialog('Erase all data?', 'Workouts, records, weights and settings will be permanently deleted from this device.', { ok: 'Erase', danger: true }))) return;
      await store.resetAll();
      location.hash = '#/welcome';
      location.reload();
    };
    $('#install', root)?.addEventListener('click', async () => {
      if (install.prompt) { if (await promptInstall()) rerender(); }
      else toast('Open your browser menu and choose “Install app”', { icon: '📲', ms: 4000 });
    });
    $('#testVoice', root).onclick = () => { unlock(); import('../audio.js').then((a) => { a.beep.go(); a.say(LINES.letsGo); a.buzz([40, 30, 40]); }); };
    return () => { clay?.destroy(); clay = null; };
  },
};

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

function pickWorkout(day, done) {
  const plan = store.get('plan') || {};
  const list = allWorkouts();
  sheet(`<div class="dialog"><h3>${DAY_NAMES[day]}</h3><div class="list">
    <button class="li" data-w=""><span class="set-ic" style="background:var(--track);color:var(--muted)">💤</span><div class="li-main"><div class="li-title">Rest day</div></div>${!plan[day] ? icon('check') : ''}</button>
    ${list.map((w) => `<button class="li" data-w="${esc(w.id)}"><span class="set-ic" style="background:${w.color}">${w.emoji}</span><div class="li-main"><div class="li-title">${esc(w.name)}</div><div class="li-sub">${estimateMinutes(w)} min · ${esc(w.focus || '')}</div></div>${plan[day] === w.id ? icon('check') : ''}</button>`).join('')}
  </div></div>`, {
    onMount(el, close) {
      $$('[data-w]', el).forEach((b) => (b.onclick = async () => {
        const np = { ...plan };
        if (b.dataset.w) np[day] = b.dataset.w; else delete np[day];
        await store.set('plan', np);
        await close();
        done();
      }));
    },
  });
}
