// Huff n Puff — tiny SVG charts (bars, lines, rings, calendar heatmap) and a muscle body map.
import { esc } from './ui.js';
import { MUSCLES } from './exercises.js';

const f = (n) => Math.round(n * 10) / 10;

export function ring(p, { size = 64, stroke = 8, color = 'var(--primary)', track = 'var(--track)', inner = '' } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, p));
  return `<div class="ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${f(c)}" stroke-dashoffset="${f(c * (1 - v))}" transform="rotate(-90 ${size / 2} ${size / 2})" class="ring-arc"/>
  </svg><div class="ring-inner">${inner}</div></div>`;
}

export function barChart(data, { height = 140, color = 'var(--primary)', unit = '', fmt = (v) => Math.round(v) } = {}) {
  const W = 320, H = height, padB = 22, padT = 18;
  const max = Math.max(1, ...data.map((d) => d.value));
  const bw = (W / data.length) * 0.58;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img">`;
  data.forEach((d, i) => {
    const x = (W / data.length) * (i + 0.5);
    const h = ((H - padB - padT) * d.value) / max;
    const y = H - padB - h;
    const col = d.highlight ? 'var(--accent)' : color;
    if (d.value > 0) {
      s += `<rect x="${f(x - bw / 2)}" y="${f(y)}" width="${f(bw)}" height="${f(Math.max(h, 4))}" rx="${f(Math.min(bw / 2, 8))}" fill="${col}"/>`;
      s += `<rect x="${f(x - bw / 2 + 3)}" y="${f(y + 3)}" width="${f(bw * 0.22)}" height="${f(Math.max(h - 10, 0))}" rx="2" fill="#fff" opacity=".28"/>`;
      s += `<text x="${f(x)}" y="${f(y - 5)}" class="chart-val">${esc(fmt(d.value))}${unit}</text>`;
    } else {
      s += `<rect x="${f(x - bw / 2)}" y="${f(H - padB - 4)}" width="${f(bw)}" height="4" rx="2" fill="var(--track)"/>`;
    }
    s += `<text x="${f(x)}" y="${H - 6}" class="chart-lbl">${esc(d.label)}</text>`;
  });
  return s + '</svg>';
}

export function lineChart(points, { height = 150, color = 'var(--primary)', fmt = (v) => f(v), xfmt = (x) => new Date(x).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) } = {}) {
  if (!points.length) return '<div class="empty-chart muted">No data yet</div>';
  const W = 320, H = height, padL = 8, padR = 8, padT = 22, padB = 24;
  const xs = points.map((p) => +p.x), ys = points.map((p) => p.y);
  let x0 = Math.min(...xs), x1 = Math.max(...xs);
  if (x0 === x1) { x0 -= 864e5; x1 += 864e5; }
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pad = (y1 - y0) * 0.15 || Math.max(1, y1 * 0.1);
  y0 -= pad; y1 += pad;
  const X = (x) => padL + ((x - x0) / (x1 - x0)) * (W - padL - padR);
  const Y = (y) => padT + (1 - (y - y0) / (y1 - y0)) * (H - padT - padB);
  const pts = points.map((p) => [X(+p.x), Y(p.y)]);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + f(p[0]) + ' ' + f(p[1])).join('');
  const area = line + `L${f(pts[pts.length - 1][0])} ${H - padB}L${f(pts[0][0])} ${H - padB}Z`;
  const id = 'lg' + Math.random().toString(36).slice(2, 7);
  let s = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>`;
  s += `<path d="${area}" fill="url(#${id})"/><path d="${line}" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  const maxI = ys.indexOf(Math.max(...ys));
  pts.forEach((p, i) => {
    if (pts.length < 40 || i === pts.length - 1 || i === maxI) s += `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="${i === pts.length - 1 ? 5.5 : 3.5}" fill="var(--card)" stroke="${color}" stroke-width="2.5"/>`;
  });
  const last = pts[pts.length - 1];
  s += `<text x="${f(Math.min(W - 30, Math.max(30, last[0])))}" y="${f(last[1] - 10)}" class="chart-val">${esc(fmt(ys[ys.length - 1]))}</text>`;
  if (maxI !== ys.length - 1) s += `<text x="${f(Math.min(W - 30, Math.max(30, pts[maxI][0])))}" y="${f(pts[maxI][1] - 10)}" class="chart-val dim">${esc(fmt(ys[maxI]))}</text>`;
  s += `<text x="${padL}" y="${H - 6}" class="chart-lbl" text-anchor="start">${esc(xfmt(x0))}</text><text x="${W - padR}" y="${H - 6}" class="chart-lbl" text-anchor="end">${esc(xfmt(x1))}</text>`;
  return s + '</svg>';
}

// GitHub-style calendar of the last `weeks` weeks. values: {YYYY-MM-DD: minutes}
export function heatmap(values, { weeks = 18, weekStart = 1, dayKey } = {}) {
  const cell = 15, gap = 3;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - ((today.getDay() - weekStart + 7) % 7) - (weeks - 1) * 7);
  const W = weeks * (cell + gap), H = 7 * (cell + gap) + 14;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="heatmap" role="img" aria-label="Activity calendar">`;
  const d = new Date(start);
  let lastMonth = -1;
  for (let w = 0; w < weeks; w++) {
    for (let i = 0; i < 7; i++) {
      if (d > today) break;
      const v = values[dayKey(d)] || 0;
      const lvl = v === 0 ? 0 : v < 15 ? 1 : v < 30 ? 2 : v < 50 ? 3 : 4;
      if (i === 0 && d.getMonth() !== lastMonth) {
        lastMonth = d.getMonth();
        s += `<text x="${w * (cell + gap)}" y="10" class="chart-lbl" text-anchor="start">${d.toLocaleDateString(undefined, { month: 'short' })}</text>`;
      }
      const isToday = +d === +today;
      s += `<rect x="${w * (cell + gap)}" y="${14 + i * (cell + gap)}" width="${cell}" height="${cell}" rx="4" class="hm hm${lvl}${isToday ? ' hm-today' : ''}"><title>${d.toDateString()}: ${v} min</title></rect>`;
      d.setDate(d.getDate() + 1);
    }
  }
  return s + '</svg>';
}

/* ---------- body map ---------- */
const FRONT = {
  shoulders: ['<ellipse cx="27" cy="57" rx="10" ry="9"/>', '<ellipse cx="93" cy="57" rx="10" ry="9"/>'],
  chest: ['<path d="M36 58c8-4 18-3 22 1v16c-7 3-17 3-23-2-2-5-2-11 1-15Z"/>', '<path d="M84 58c-8-4-18-3-22 1v16c7 3 17 3 23-2 2-5 2-11-1-15Z"/>'],
  biceps: ['<ellipse cx="22" cy="81" rx="6" ry="13" transform="rotate(8 22 81)"/>', '<ellipse cx="98" cy="81" rx="6" ry="13" transform="rotate(-8 98 81)"/>'],
  forearms: ['<ellipse cx="16.5" cy="117" rx="5" ry="15" transform="rotate(6 16.5 117)"/>', '<ellipse cx="103.5" cy="117" rx="5" ry="15" transform="rotate(-6 103.5 117)"/>'],
  abs: ['<rect x="50" y="79" width="20" height="37" rx="7"/>'],
  obliques: ['<path d="M38 82c4 0 8 2 9 6l1 22c-4 3-9 2-11-2-2-9-2-18 1-26Z"/>', '<path d="M82 82c-4 0-8 2-9 6l-1 22c4 3 9 2 11-2 2-9 2-18-1-26Z"/>'],
  hipflexors: ['<ellipse cx="49" cy="124" rx="6.5" ry="5.5"/>', '<ellipse cx="71" cy="124" rx="6.5" ry="5.5"/>'],
  quads: ['<ellipse cx="46.5" cy="155" rx="9" ry="22"/>', '<ellipse cx="73.5" cy="155" rx="9" ry="22"/>'],
  adductors: ['<ellipse cx="52.6" cy="146" rx="3" ry="12" transform="rotate(-4 52.6 146)"/>', '<ellipse cx="67.4" cy="146" rx="3" ry="12" transform="rotate(4 67.4 146)"/>'],
  calves: ['<ellipse cx="45" cy="201" rx="5" ry="14"/>', '<ellipse cx="75" cy="201" rx="5" ry="14"/>'],
};
const BACK = {
  traps: ['<path d="M60 40 82 53 60 76 38 53Z"/>'],
  shoulders: ['<ellipse cx="27" cy="57" rx="10" ry="9"/>', '<ellipse cx="93" cy="57" rx="10" ry="9"/>'],
  lats: ['<path d="M36 62c6 0 14 6 20 14v18c-6 2-12 0-16-4-4-8-6-18-4-28Z"/>', '<path d="M84 62c-6 0-14 6-20 14v18c6 2 12 0 16-4 4-8 6-18 4-28Z"/>'],
  triceps: ['<ellipse cx="22" cy="82" rx="6" ry="13" transform="rotate(8 22 82)"/>', '<ellipse cx="98" cy="82" rx="6" ry="13" transform="rotate(-8 98 82)"/>'],
  forearms: ['<ellipse cx="16.5" cy="117" rx="5" ry="15" transform="rotate(6 16.5 117)"/>', '<ellipse cx="103.5" cy="117" rx="5" ry="15" transform="rotate(-6 103.5 117)"/>'],
  lowerback: ['<rect x="50" y="94" width="20" height="20" rx="6"/>'],
  glutes: ['<ellipse cx="49" cy="128" rx="11" ry="10"/>', '<ellipse cx="71" cy="128" rx="11" ry="10"/>'],
  hamstrings: ['<ellipse cx="47" cy="161" rx="8.5" ry="19"/>', '<ellipse cx="73" cy="161" rx="8.5" ry="19"/>'],
  calves: ['<ellipse cx="45" cy="201" rx="7" ry="14"/>', '<ellipse cx="75" cy="201" rx="7" ry="14"/>'],
};

// A little clay doll: lumpy plasticine body, glossy squished-on muscle blobs, ink outline.
let bmN = 0;
function clayFilter(id) {
  return `<filter id="${id}" x="-10%" y="-10%" width="120%" height="120%">
    <feTurbulence type="fractalNoise" baseFrequency=".09" numOctaves="2" seed="${7 + (bmN % 5)}" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feGaussianBlur in="d" stdDeviation="1.6" result="b"/>
    <feSpecularLighting in="b" surfaceScale="3.2" specularConstant=".55" specularExponent="16" lighting-color="#fff" result="s"><feDistantLight azimuth="235" elevation="52"/></feSpecularLighting>
    <feComposite in="s" in2="d" operator="in" result="s2"/>
    <feComposite in="d" in2="s2" operator="arithmetic" k2="1" k3=".7"/>
  </filter>`;
}

function silhouette(back) {
  const c = 'var(--body)';
  const limbs = `<path d="M24 54 18 100 14 140" stroke-width="15"/><path d="M96 54 102 100 106 140" stroke-width="15"/>
    <path d="M47 124 45 180 45 222" stroke-width="20"/><path d="M73 124 75 180 75 222" stroke-width="20"/>
    <path d="M40 228h8M72 228h8" stroke-width="10"/>`;
  const torso = '<path d="M28 48c10-6 54-6 64 0 4 14 2 34-6 50-2 10-2 20 0 30H34c2-10 2-20 0-30-8-16-10-36-6-50Z"/><rect x="53" y="30" width="14" height="16" rx="5"/><circle cx="60" cy="22" r="14"/><circle cx="13" cy="148" r="6"/><circle cx="107" cy="148" r="6"/>';
  // ink outline first (fatter strokes), then the clay on top
  return `<g class="bm-ink"><g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke="#2a1636" transform="translate(0 0)">${limbs.replace(/stroke-width="(\d+)"/g, (_, w) => `stroke-width="${+w + 4.4}"`)}</g><g fill="#2a1636" stroke="#2a1636" stroke-width="4.4" stroke-linejoin="round">${torso}</g></g>
  <g fill="none" stroke="${c}" stroke-linecap="round" stroke-linejoin="round">${limbs}</g><g fill="${c}">${torso}</g>
  ${back ? '<path d="M47 20q13-9 26 0" stroke="#2a1636" stroke-width="1.6" fill="none" opacity=".35"/>'
    : '<circle cx="55" cy="21" r="2.1" fill="#2a1636"/><circle cx="65" cy="21" r="2.1" fill="#2a1636"/><circle cx="55.7" cy="20.3" r=".7" fill="#fff"/><circle cx="65.7" cy="20.3" r=".7" fill="#fff"/><path d="M55.5 27q4.5 3.6 9 0" stroke="#2a1636" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="51" cy="26" r="2.2" fill="#ff8fb8" opacity=".6"/><circle cx="69" cy="26" r="2.2" fill="#ff8fb8" opacity=".6"/>'}`;
}

const sticker = (m, cls, extra = '') => `<button type="button" class="mz-sticker ${cls}" data-mz="${m}" aria-pressed="false">${MUSCLES[m]}${extra}</button>`;

export function bodyMap(load = {}, { highlight = null } = {}) {
  const max = Math.max(1, ...Object.values(load));
  const id = 'bmc' + ++bmN;
  const lvlOf = (m) => (highlight ? (highlight.primary.includes(m) ? 3 : highlight.secondary.includes(m) ? 1 : 0) : loadLevel(load[m], max));
  // resting muscles first, worked ones on top, so overlapping patches never cover a highlight
  const draw = (set) => Object.entries(set).sort(([a], [b]) => lvlOf(a) - lvlOf(b)).map(([m, shapes]) => {
    const lvl = lvlOf(m);
    return `<g fill="var(--muscle${lvl})" class="mz mz${lvl}" data-mz="${m}"${lvl ? ' stroke="#2a1636" stroke-width="1.6"' : ''}><title>${MUSCLES[m]}${highlight ? '' : `: ${Math.round(load[m] || 0)} sets`}</title>${shapes.join('')}</g>`;
  }).join('');
  const fig = (set, back, label) => `<figure><svg viewBox="-4 0 128 240"><defs>${clayFilter(id + label)}</defs><g filter="url(#${id + label})">${silhouette(back)}${draw(set)}</g></svg><figcaption>${label}</figcaption></figure>`;
  const worked = Object.keys(MUSCLES).filter((m) => load[m] > 0).sort((a, b) => load[b] - load[a]);
  const stickers = highlight
    ? `${highlight.primary.map((m) => sticker(m, 'p')).join('')}${highlight.secondary.map((m) => sticker(m, 's')).join('')}`
    : worked.map((m) => sticker(m, loadLevel(load[m], max) >= 2 ? 'p' : 's', ` · ${Math.round(load[m])}`)).join('');
  return `<div class="bodymap-wrap"><div class="bodymap">${fig(FRONT, false, 'Front')}${fig(BACK, true, 'Back')}</div><div class="mz-caption" aria-live="polite"></div>${stickers ? `<div class="mz-stickers">${stickers}</div>` : ''}</div>`;
}

// Tap a sticker (or a patch on the body) to spotlight that muscle group on both figures.
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const hit = e.target.closest?.('[data-mz]');
    const wrap = hit?.closest('.bodymap-wrap');
    if (!wrap) return;
    const m = hit.dataset.mz;
    const same = wrap.dataset.focus === m;
    wrap.dataset.focus = same ? '' : m;
    wrap.classList.toggle('focusing', !same);
    wrap.querySelectorAll('[data-mz]').forEach((el) => {
      const on = !same && el.dataset.mz === m;
      el.classList.toggle('on', on);
      if (el.tagName === 'BUTTON') el.setAttribute('aria-pressed', on);
    });
    const cap = wrap.querySelector('.mz-caption');
    if (cap) cap.textContent = same ? '' : MUSCLES[m];
  });
}

function loadLevel(v, max) {
  if (!v) return 0;
  const u = Math.min(1, v / Math.max(max, 6));
  return u < 0.34 ? 1 : u < 0.67 ? 2 : 3;
}

