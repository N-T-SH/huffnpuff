// Huff n Puff — your clay twin: name, story, and the parts and colours they're sculpted from (linked from You).
// The twin is the user's own character; the cast keep their own names and moves.
import * as store from '../store.js';
import { ClayPlayer } from '../clay.js';
import { getEx } from '../exercises.js';
import { esc, icon, $, toast, promptDialog } from '../ui.js';
import { myAvatar, bioOf } from '../cast.js';
import { go, back } from '../app.js';
import { avatarEditor, bindAvatarEditor } from './avatar-editor.js';

let clay = null;

export const view = {
  tab: 'me',
  title: 'Your clay twin',
  keepScroll: true,
  render() {
    const p = store.get('profile') || {};
    const av = myAvatar();
    return `<div class="view settings">
      <div class="topbar"><button class="icon-btn" data-back aria-label="Back">${icon('back')}</button><h1>Your clay twin</h1></div>
      <div class="card me-card" style="padding:14px">
        <div class="clay-stage" id="me" style="aspect-ratio:4/3"></div>
        <div class="row between mt"><div><h2 id="nm" class="graffiti">${esc(p.name || 'Champ')}</h2><p class="muted small">The newest member of the crew</p></div>
          <button class="btn small" id="rename">${icon('edit')} Name</button></div>
      </div>
      <div class="section"><div class="section-h"><h2>Their story</h2></div>
        <textarea class="input" id="bio" rows="3" maxlength="240" placeholder="${esc(bioOf({ id: 'me' }))}">${esc(av.bio || '')}</textarea></div>
      <div class="section"><div class="section-h"><h2>Sculpt</h2></div>
        <div class="card" id="avEdit">${avatarEditor(av)}</div></div>
      <a class="card mt row gap cast-link" href="#/cast"><span style="font-size:30px">🎬</span><div class="grow"><b>Meet the cast</b><div class="muted small">7 clay characters, each with their own set. Choose who performs your moves.</div></div>${icon('chev', 'chev')}</a>
    </div>`;
  },
  mount(root) {
    clay = new ClayPlayer($('#me', root), getEx('wave'), { charId: 'me' });
    clay.play();
    root.querySelector('[data-back]').onclick = () => back('/me');
    const edit = $('#avEdit', root);
    const bind = () => bindAvatarEditor(edit, myAvatar, async (av, { reshape }) => {
      await store.setSetting('avatar', av);
      clay.setExercise(getEx('wave'), 'me');
      clay.draw(true);
      // a new part can add or drop colour slots (shoes when barefoot, band colour without a band…)
      if (reshape) { edit.innerHTML = avatarEditor(av); bind(); }
    });
    bind();
    $('#bio', root).onchange = (e) => store.setSetting('avatar', { ...myAvatar(), bio: e.target.value.trim() });
    $('#rename', root).onclick = async () => {
      const v = await promptDialog('Your name', { value: store.get('profile')?.name || '' });
      if (v == null) return;
      await store.set('profile', { ...store.get('profile'), name: v.trim() });
      $('#nm', root).textContent = v.trim() || 'Champ';
      toast('Name saved', { icon: '✏️' });
    };
    return () => { clay?.destroy(); clay = null; };
  },
};
