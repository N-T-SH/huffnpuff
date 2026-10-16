// Huff n Puff — swap a move: a sheet offering a few safe stand-ins that work the same muscles.
import { getEx, MUSCLES, CATS } from './exercises.js';
import { alternativesFor } from './workouts.js';
import { sheet, thumb, esc, icon, $$ } from './ui.js';

// resolves to the chosen move's id, or null if dismissed
export function pickSwap(exId, { used = [] } = {}) {
  const ex = getEx(exId);
  const alts = alternativesFor(exId, { used: new Set(used), n: 4 });
  return new Promise((resolve) => {
    let picked = null;
    const rows = alts.map((a) => `<button class="li" data-ex="${a.id}"><div class="li-thumb">${thumb(a.id)}</div><div class="li-main"><div class="li-title">${esc(a.name)}</div>
      <div class="li-sub">${a.primary.map((m) => MUSCLES[m]).join(', ')} · ${esc(CATS[a.cat] || a.cat)}</div></div><span class="pill p small">${icon('swap')} Swap</span></button>`).join('');
    sheet(`<div class="dialog"><h3>Swap ${esc(ex?.name || 'this move')}</h3>
      <p class="muted small">Works the same muscles, and suits your equipment and limits.</p>
      ${alts.length ? `<div class="list">${rows}</div>` : '<p class="muted mt">No good stand-ins for this one.</p>'}</div>`, {
      onMount(el, close) {
        $$('[data-ex]', el).forEach((b) => (b.onclick = async () => { picked = b.dataset.ex; await close(); resolve(picked); }));
      },
      onDismiss() { resolve(picked); },
    });
  });
}
