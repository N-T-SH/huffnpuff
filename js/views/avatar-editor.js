// Huff n Puff — the clay-twin maker: part chips and colour swatches, shared by onboarding (a short
// version) and the character screen (everything).
import { AVATAR_PARTS, AVATAR_PART_LABELS, AVATAR_COLORS, AVATAR_COLOR_LABELS } from '../cast.js';
import { esc, $$ } from '../ui.js';

const QUICK_PARTS = ['body', 'hair'];
const QUICK_COLORS = ['skin', 'top', 'hair'];

// colour slots that show on this build (no shoe colour barefoot, no band colour without a band…)
function colorKeys(av, quick) {
  return (quick ? QUICK_COLORS : Object.keys(AVATAR_COLORS)).filter((k) =>
    !(k === 'shoes' && av.feet === 'bare') && !(k === 'accent' && av.hat !== 'headband') && !(k === 'hair' && av.hair === 'bald' && av.facial === 'none'));
}

export function avatarEditor(av, { quick = false } = {}) {
  const parts = quick ? QUICK_PARTS : Object.keys(AVATAR_PARTS);
  return `<div class="av-edit">
    ${parts.map((k) => `<div class="av-row"><div class="muted tiny bold mb">${esc(AVATAR_PART_LABELS[k].toUpperCase())}</div>
      <div class="chips av-chips">${AVATAR_PARTS[k].map(([v, l]) => `<button class="chip ${av[k] === v ? 'on' : ''}" data-part="${k}" data-v="${v}">${esc(l)}</button>`).join('')}</div></div>`).join('')}
    ${colorKeys(av, quick).map((k) => `<div class="av-row"><div class="muted tiny bold mb">${esc((k === 'hair' && av.hair === 'bald' ? 'Face fuzz' : AVATAR_COLOR_LABELS[k]).toUpperCase())}</div>
      <div class="swatches">${AVATAR_COLORS[k].map((c) => `<button class="swatch ${av.colors[k] === c ? 'on' : ''}" style="background:${c}" data-col="${k}" data-c="${c}" aria-label="${esc(AVATAR_COLOR_LABELS[k])} ${c}"></button>`).join('')}</div></div>`).join('')}
  </div>`;
}

// onChange(nextAvatar, { reshape }) — reshape: a part changed, so the model and the editor redraw
export function bindAvatarEditor(root, getAv, onChange) {
  $$('[data-part]', root).forEach((b) => (b.onclick = () => {
    const av = getAv();
    if (av[b.dataset.part] === b.dataset.v) return;
    onChange({ ...av, [b.dataset.part]: b.dataset.v }, { reshape: true });
  }));
  $$('[data-col]', root).forEach((b) => (b.onclick = () => {
    const av = getAv();
    $$(`[data-col="${b.dataset.col}"]`, root).forEach((x) => x.classList.toggle('on', x === b));
    onChange({ ...av, colors: { ...av.colors, [b.dataset.col]: b.dataset.c } }, { reshape: false });
  }));
}
