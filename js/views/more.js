// Huff n Puff — more settings (from the bottom of You): your data, backups, feedback, install, about.
import * as store from '../store.js';
import * as stats from '../stats.js';
import { getEx } from '../exercises.js';
import { icon, $, $$, sheet, toast, confirmDialog } from '../ui.js';
import { go, back, install, promptInstall, VERSION } from '../app.js';
import { unlock } from '../audio.js';
import { LINES } from '../voice-lines.js';
import { trackEvent } from '../analytics.js';
import { report as moveReport } from '../feedback.js';

function toggle(id, label, sub, on, ic, col) {
  return `<label class="li"><span class="set-ic" style="background:${col}">${icon(ic)}</span><div class="li-main"><div class="li-title">${label}</div>${sub ? `<div class="li-sub">${sub}</div>` : ''}</div><span class="switch"><input type="checkbox" data-set="${id}" ${on ? 'checked' : ''}><span></span></span></label>`;
}

export const view = {
  tab: 'me',
  title: 'More settings',
  render() {
    const s = store.settings();
    return `<div class="view settings">
      <div class="topbar"><button class="icon-btn" data-back aria-label="Back">${icon('back')}</button><h1>More settings</h1></div>
      <div class="section"><div class="section-h"><h2>Your data</h2></div>
        <div class="card">
          <div class="li" style="align-items:flex-start"><span class="set-ic" style="background:var(--green)">🔒</span><div class="li-main" style="white-space:normal"><div class="li-title">Your workouts stay on this device</div><div class="li-sub" style="white-space:normal">No accounts, no cloud, no cookies. Back up regularly so you never lose progress.</div></div></div>
          ${toggle('analytics', 'Anonymous usage stats', 'Counts screens opened and workouts finished so we can make Huff n Puff better. Never your name, workouts, sets or body stats.', s.analytics !== false, 'chart', 'var(--teal)')}
          <button class="li" id="feedback"><span class="set-ic" style="background:var(--pink)">${icon('sparkle')}</span><div class="li-main"><div class="li-title">Send feedback</div><div class="li-sub">Ideas, bugs, or a little love</div></div>${icon('chev', 'chev')}</button>
          <button class="li" id="export"><span class="set-ic" style="background:var(--blue)">${icon('download')}</span><div class="li-main"><div class="li-title">Export backup</div><div class="li-sub">Download a .json file</div></div></button>
          <button class="li" id="import"><span class="set-ic" style="background:var(--purple)">${icon('upload')}</span><div class="li-main"><div class="li-title">Import backup</div><div class="li-sub">Restore from a .json file</div></div></button>
          <button class="li" id="csv"><span class="set-ic" style="background:var(--teal)">${icon('list')}</span><div class="li-main"><div class="li-title">Export CSV</div><div class="li-sub">Every set, spreadsheet-ready</div></div></button>
          <button class="li" id="reset" style="color:var(--danger)"><span class="set-ic" style="background:var(--danger)">${icon('trash')}</span><div class="li-main"><div class="li-title">Erase everything</div></div></button>
          <input type="file" id="file" accept="application/json,.json" hidden>
        </div></div>

      <div class="section"><div class="card">
        ${install.installed ? '' : `<button class="li" id="install"><span class="set-ic" style="background:var(--primary)">${icon('phone')}</span><div class="li-main"><div class="li-title">Install app</div><div class="li-sub">${install.prompt ? 'Add Huff n Puff to your home screen' : 'Use your browser menu → “Install app” / “Add to Home screen”'}</div></div></button>`}
        <button class="li" id="testVoice"><span class="set-ic" style="background:var(--purple)">${icon('volume')}</span><div class="li-main"><div class="li-title">Test sound & voice</div></div></button>
        <a class="li" href="#/changelog"><span class="set-ic" style="background:var(--accent)">${icon('heart')}</span><div class="li-main"><div class="li-title">Huff n Puff v${VERSION}</div><div class="li-sub">What’s new · hand-sculpted with clay & code</div></div>${icon('chev', 'chev')}</a>
      </div></div>
    </div>`;
  },
  mount(root) {
    root.querySelector('[data-back]').onclick = () => back('/me');
    $$('[data-set]', root).forEach((i) => (i.onchange = () => store.setSetting(i.dataset.set, i.checked)));
    $('#feedback', root).onclick = () => feedbackSheet();
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
        go('/me/more', { replace: true });
      } catch {
        toast('That file isn’t a valid Huff n Puff backup', { icon: '⚠️' });
      }
    };
    $('#reset', root).onclick = async () => {
      if (!(await confirmDialog('Erase all data?', 'Workouts, records, weights and settings will be permanently deleted from this device.', { ok: 'Erase', danger: true }))) return;
      await store.resetAll();
      location.hash = '#/welcome';
      location.reload();
    };
    $('#install', root)?.addEventListener('click', async () => {
      if (install.prompt) { if (await promptInstall()) go('/me/more', { replace: true }); }
      else toast('Open your browser menu and choose “Install app”', { icon: '📲', ms: 4000 });
    });
    $('#testVoice', root).onclick = () => { unlock(); import('../audio.js').then((a) => { a.beep.go(); a.say(LINES.letsGo); a.buzz([40, 30, 40]); }); };
  },
};

// feedback goes out as an email draft: nothing is sent until the person sends it themselves
const FEEDBACK_TO = 'hello@huffnpuff.club';
function feedbackSheet() {
  const kinds = [['idea', '💡 Idea'], ['bug', '🐞 Bug'], ['love', '💖 Love'], ['other', '💬 Other']];
  let kind = 'idea';
  sheet(`<div class="dialog"><h3>Send feedback</h3><p class="muted small">It opens as an email you can check before sending.</p>
    <div class="chips mt" id="fbKind">${kinds.map(([k, l]) => `<button class="chip ${k === kind ? 'on' : ''}" data-k="${k}">${l}</button>`).join('')}</div>
    <textarea class="input mt" id="fbText" rows="5" placeholder="What’s on your mind?"></textarea>
    <label class="row gap mt small bold"><span class="switch"><input type="checkbox" id="fbMoves" checked><span></span></span>Include my move ratings (thumbs up/down, skips)</label>
    <button class="btn primary big mt" id="fbSend" style="width:100%">Write the email</button></div>`, {
    onMount(el, close) {
      $$('#fbKind .chip', el).forEach((b) => (b.onclick = () => { kind = b.dataset.k; $$('#fbKind .chip', el).forEach((x) => x.classList.toggle('on', x === b)); }));
      $('#fbSend', el).onclick = async () => {
        const text = $('#fbText', el).value.trim();
        const label = kinds.find(([k]) => k === kind)[1].replace(/^\S+\s/, '');
        const extra = $('#fbMoves', el).checked ? `\n\n---\n${moveReport()}` : '';
        const body = `${text || '(write here)'}${extra}\n\n— Huff n Puff v${VERSION} · ${navigator.userAgent.match(/Android [\d.]+|iPhone OS [\d_]+|Windows NT [\d.]+|Mac OS X [\d_]+/)?.[0] || 'browser'}`;
        trackEvent('feedback');
        await close();
        location.href = `mailto:${FEEDBACK_TO}?subject=${encodeURIComponent(`Huff n Puff feedback: ${label}`)}&body=${encodeURIComponent(body)}`;
      };
    },
  });
}

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

