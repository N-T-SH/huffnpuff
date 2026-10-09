// Huff n Puff — meet the clay cast; switch characters on/off.
import * as store from '../store.js';
import { CAST, movesFor, isEnabled, characterFor, isMe, nameOf, bioOf, taglineOf } from '../cast.js';
import { getEx, EXERCISES } from '../exercises.js';
import { esc, icon, $$, thumb, toast } from '../ui.js';
import { back, go } from '../app.js';

const SETS = {
  studio: 'Pastel studio', workbench: 'Workbench gym', aerobics: '80s aerobics studio (VHS)',
  disco: 'Disco dance floor', forest: 'Mossy forest clearing', tower: 'Wizard’s tower', kitchen: 'Kitchen countertop',
};

export const view = {
  tab: 'me',
  title: 'The cast',
  keepScroll: true,
  render() {
    const counts = {};
    for (const ex of EXERCISES) { const c = characterFor(ex).id; counts[c] = (counts[c] || 0) + 1; }
    return `<div class="view">
      <div class="topbar"><button class="icon-btn" data-back aria-label="Back">${icon('back')}</button><h1>Meet the cast</h1></div>
      <p class="muted">Every move is performed by a clay character on their own miniature set, picked for their personality. Switch anyone off and the closest match steps in for their moves.</p>
      <div class="cast-list mt">
        ${CAST.map((c) => {
          const on = isEnabled(c.id);
          const first = movesFor(c.id).find((m) => getEx(m) && !getEx(m).hidden) || movesFor(c.id)[0];
          const moves = movesFor(c.id).map(getEx).filter((e) => e && !e.hidden);
          return `<div class="cast-card card ${on ? '' : 'off'}" data-c="${c.id}">
            <button class="cast-art" data-preview="${first}" aria-label="Preview ${esc(c.name)}">${thumb(first, '', { char: c.id, tall: true })}</button>
            <div class="cast-info">
              <div class="row between"><h2 class="graffiti">${c.emoji} ${esc(nameOf(c))}</h2>
                ${isMe(c) ? '<a class="pill p" href="#/me">That’s you ✏️</a>' : c.always ? '<span class="pill">Always on</span>' : `<label class="switch" aria-label="Use ${esc(c.name)}"><input type="checkbox" data-toggle="${c.id}" ${on ? 'checked' : ''}><span></span></label>`}</div>
              <div class="bold small" style="color:var(--primary)">${esc(taglineOf(c))}</div>
              <p class="small muted mt">${esc(bioOf(c))}</p>
              <div class="tiny bold muted mt">SET</div><div class="small">${esc(SETS[c.set] || c.set)}${c.pet ? ` · with a ${c.pet}` : ''}</div>
              <div class="tiny bold muted mt">PERFORMS ${on ? `(${counts[c.id] || 0} moves)` : '(off)'}</div>
              <div class="row wrap gap-s mt">${moves.slice(0, 8).map((e) => `<a class="pill" href="#/exercise/${e.id}">${esc(e.name)}</a>`).join('')}${moves.length > 8 ? `<span class="pill">+${moves.length - 8}</span>` : ''}</div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  },
  mount(root) {
    root.querySelector('[data-back]').onclick = () => back('/me');
    $$('[data-toggle]', root).forEach((i) => (i.onchange = async () => {
      const off = new Set(store.settings().castOff || []);
      if (i.checked) off.delete(i.dataset.toggle); else off.add(i.dataset.toggle);
      await store.setSetting('castOff', [...off]);
      toast(i.checked ? 'Back in the show!' : 'Taking a break — someone else will cover', { icon: i.checked ? '🎬' : '☕' });
      go('/cast', { replace: true });
    }));
    $$('[data-preview]', root).forEach((b) => (b.onclick = () => go('/exercise/' + b.dataset.preview)));
  },
};
