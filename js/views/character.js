// Huff n Puff — your character: who you play, their name, story and colours (linked from You).
import * as store from '../store.js';
import { ClayPlayer } from '../clay.js';
import { getEx } from '../exercises.js';
import { esc, icon, $, $$, toast, promptDialog, thumb } from '../ui.js';
import { CAST, CAST_BY_ID, meId, myLook, lookFromColors, colorSlots, paletteFor } from '../cast.js';
import { go, back } from '../app.js';

let clay = null;

function swatches(key, me) {
  const cur = myLook()[key];
  const list = paletteFor(me, key);
  return `<div class="swatches">${list.map((c) => `<button class="swatch ${c === cur ? 'on' : ''}" style="background:${c}" data-look="${key}" data-c="${c}" aria-label="${key} ${c}"></button>`).join('')}</div>`;
}

export const view = {
  tab: 'me',
  title: 'Your character',
  keepScroll: true,
  render() {
    const p = store.get('profile') || {};
    const s = store.settings();
    const me = CAST_BY_ID[meId()];
    return `<div class="view settings">
      <div class="topbar"><button class="icon-btn" data-back aria-label="Back">${icon('back')}</button><h1>Your character</h1></div>
      <div class="card me-card" style="padding:14px">
        <div class="clay-stage" id="me" style="aspect-ratio:4/3"></div>
        <div class="row between mt"><div><h2 id="nm" class="graffiti">${esc(p.name || 'Champ')}</h2><p class="muted small">Cast as ${me.emoji} ${esc(me.name)}</p></div>
          <button class="btn small" id="rename">${icon('edit')} Name</button></div>
      </div>
      <div class="section"><div class="section-h"><h2>Pick your character</h2></div>
        <div class="cast-pick" id="castPick">${CAST.map((c) => `<button class="cast-pick-b ${c.id === me.id ? 'on' : ''}" data-me="${c.id}" aria-label="Play as ${esc(c.name)}">${thumb('wave', '', { portrait: true, char: c.id })}<span>${c.id === me.id ? esc(p.name || 'You') : esc(c.name)}</span></button>`).join('')}</div></div>
      <div class="section"><div class="section-h"><h2>Their story</h2></div>
        <textarea class="input" id="bio" rows="3" maxlength="240" placeholder="${esc(me.bio)}">${esc(s.me?.bio || '')}</textarea></div>
      <div class="section"><div class="section-h"><h2>Colours</h2></div>
        <div class="card">${colorSlots(me).map(([k, label], i) => `<div class="${i ? 'mt' : ''}"><div class="muted tiny bold mb">${esc(label.toUpperCase())}</div>${swatches(k, me)}</div>`).join('')}</div></div>
      <a class="card mt row gap cast-link" href="#/cast"><span style="font-size:30px">🎬</span><div class="grow"><b>Meet the cast</b><div class="muted small">7 clay characters, each with their own set. Choose who performs your moves.</div></div>${icon('chev', 'chev')}</a>
    </div>`;
  },
  mount(root) {
    const me = CAST_BY_ID[meId()];
    clay = new ClayPlayer($('#me', root), getEx('flex'), { look: myLook(), charId: me.id });
    clay.play();
    root.querySelector('[data-back]').onclick = () => back('/me');
    $$('[data-look]', root).forEach((b) => (b.onclick = () => {
      const look = { ...myLook(), [b.dataset.look]: b.dataset.c };
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
      go('/me/character', { replace: true });
    }));
    $('#bio', root).onchange = (e) => store.setSetting('me', { id: meId(), bio: e.target.value.trim() });
    $('#rename', root).onclick = async () => {
      const v = await promptDialog('Your name', { value: store.get('profile')?.name || '' });
      if (v == null) return;
      await store.set('profile', { ...store.get('profile'), name: v.trim() });
      $('#nm', root).textContent = v.trim() || 'Champ';
    };
    return () => { clay?.destroy(); clay = null; };
  },
};
