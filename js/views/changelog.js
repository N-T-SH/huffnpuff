// Huff n Puff — what's new (from the version line in More settings).
import { esc, icon } from '../ui.js';
import { back } from '../app.js';
import { CHANGELOG } from '../changelog.js';

const fmt = (d) => new Date(d + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export const view = {
  tab: 'me',
  title: 'What’s new',
  render() {
    return `<div class="view settings">
      <div class="topbar"><button class="icon-btn" data-back aria-label="Back">${icon('back')}</button><h1>What’s new</h1></div>
      ${CHANGELOG.map((r, i) => `<div class="card ${i ? 'mt' : ''}">
        <div class="row between"><h3>${esc(r.title)}</h3><span class="pill ${i ? '' : 'y'}">v${esc(r.v)}</span></div>
        <div class="muted tiny bold mb">${esc(fmt(r.date))}</div>
        <ul class="small changes">${r.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>`).join('')}
    </div>`;
  },
  mount(root) {
    root.querySelector('[data-back]').onclick = () => back('/me/more');
  },
};
