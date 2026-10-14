// Huff n Puff — share card: a picture of a finished workout (the character who took the bow, the
// workout, minutes, calories and streak) on the brand yellow, made on the phone to share anywhere.
import { load3D } from './clay.js';
import { getEx } from './exercises.js';
import { look, units } from './ui.js';

export const siteURL = () => location.origin + location.pathname.replace(/index\.html$/, '');

const img = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

function roundRect(x, X, y, w, h, r) { x.beginPath(); x.roundRect(X, y, w, h, r); }

// fit text to a width by shrinking the font
function fitText(x, text, maxW, size, weight = 700, family = 'Fredoka') {
  let s = size;
  do { x.font = `${weight} ${s}px ${family}, system-ui, sans-serif`; s -= 2; } while (x.measureText(text).width > maxW && s > 20);
}

export async function makeShareCard(session, { charId, streak = 0, lookFor = look() } = {}) {
  const W = 1080, H = 1350;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  await Promise.all(['700 64px Fredoka', '800 40px Nunito', '700 40px Nunito'].map((f) => document.fonts?.load(f).catch(() => {})));
  // the brand yellow, softly lit, with the welcome screen's speckles
  x.fillStyle = '#ffb21f'; x.fillRect(0, 0, W, H);
  const glow = (cx, cy, col) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, W * 0.75); g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,178,31,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H); };
  glow(W * 0.25, H * 0.15, '#ffc24a'); glow(W * 0.8, H * 0.9, '#ffa915');
  x.fillStyle = 'rgba(255,255,255,.22)';
  for (let yy = 12; yy < H; yy += 34) for (let xx = 12 + ((yy / 34) % 2) * 17; xx < W; xx += 34) { x.beginPath(); x.arc(xx, yy, 2.2, 0, Math.PI * 2); x.fill(); }
  // the logo
  const logo = await img('icons/logo.webp');
  if (logo) { const lw = 470, lh = lw * logo.height / logo.width; x.drawImage(logo, (W - lw) / 2, 54, lw, lh); }
  // the star of the workout, mid-celebration
  try {
    const m = await load3D();
    const blob = m && await m.renderStill(getEx('celebrate'), lookFor, { bare: true, floor: false, width: 760, height: 760, charId, phase: 0.28, t: 1.4 });
    const ch = blob && await img(URL.createObjectURL(blob));
    if (ch) {
      x.save(); x.fillStyle = 'rgba(90,40,0,.18)'; x.beginPath(); x.ellipse(W / 2, 1012, 250, 36, 0, 0, Math.PI * 2); x.fill(); x.restore();
      const cs = 1000; // big and bold: the feet tuck behind the stats panel
      x.drawImage(ch, (W - cs) / 2, 250, cs, cs);
    }
  } catch { /* no 3D: the card still works */ }
  // the stats panel
  const px = 60, pw = W - 120, py = 1010, ph = 280;
  x.save(); x.shadowColor = 'rgba(90,40,0,.28)'; x.shadowBlur = 30; x.shadowOffsetY = 12;
  roundRect(x, px, py, pw, ph, 48); x.fillStyle = '#fff5ea'; x.fill(); x.restore();
  x.fillStyle = '#2a1636'; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
  fitText(x, session.name, pw - 80, 66);
  x.fillText(session.name, W / 2, py + 96);
  const mins = Math.max(1, Math.round(session.duration / 60));
  const bits = [`⏱️ ${mins} min`, `🔥 ${session.calories} kcal`];
  if (streak > 1) bits.push(`📆 ${streak}-day streak`);
  const vol = session.entries?.reduce((n, e) => n + e.sets.reduce((a, st) => a + (st.weight || 0) * (st.reps || 0), 0), 0) || 0;
  if (vol && bits.length < 3) bits.push(`🏋️ ${Math.round(vol)} ${units()}`);
  fitText(x, bits.join('   '), pw - 80, 40, 800, 'Nunito');
  x.fillStyle = '#5b4b6e'; x.fillText(bits.join('   '), W / 2, py + 166);
  x.font = '800 30px Nunito, system-ui, sans-serif'; x.fillStyle = '#ff4f9a';
  x.fillText(siteURL().replace(/^https?:\/\//, '').replace(/\/$/, ''), W / 2, py + 232);
  return new Promise((res) => c.toBlob(res, 'image/png'));
}

// share an image (or fall back to the link, then to downloading the picture)
export async function shareImage(blob, { text, title = 'Huff n Puff', filename = 'huff-n-puff.png' } = {}) {
  const file = blob && new File([blob], filename, { type: 'image/png' });
  if (file && navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text, title }); return 'shared'; }
  if (blob) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
  }
  try { await navigator.clipboard?.writeText(text); } catch { /* ignore */ }
  return 'downloaded';
}
