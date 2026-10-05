// Huff n Puff — the logo, drawn on a canvas: "huff" stacked over "puff" with a little "n" jammed
// between them, bending both words out of its way. Rendered to icons/logo.png and the app icons by
// tools/render-icons.mjs (the app itself just shows the PNG).
await (async () => {
  const f = new FontFace('Spray', `url(${new URL('../fonts/spray.woff2', import.meta.url)})`);
  await f.load(); document.fonts.add(f);
})();
const INK = '#2a1636';
// a word in the graffiti sticker style, built from the letter shapes as an image so a
// glyph can be retouched first: deep 3D shadow, dark outline, light rim, colour fill
function word(ctx, text, x, y, size, color, rot = 0, sx = 1, sy = 1) {
  const em = size, pad = Math.ceil(em * 0.5);
  const mc = document.createElement('canvas'), m = mc.getContext('2d');
  m.font = `${size}px Spray`;
  const w = Math.ceil(m.measureText(text).width);
  mc.width = w + pad * 2; mc.height = Math.ceil(em * 1.6) + pad;
  const bx = pad, by = Math.ceil(em * 1.05); // baseline origin inside the mask
  m.font = `${size}px Spray`; m.textBaseline = 'alphabetic'; m.fillStyle = '#fff';
  m.fillText(text, bx, by);
  if (text[0] === 'p') {
    // the font's p has a brush flick off the bottom-left of its stem: erase what pokes out left of the stem
    const d = m.getImageData(0, 0, mc.width, mc.height), D = d.data, W = mc.width;
    const filled = (X, Y) => D[(Y * W + X) * 4 + 3] > 100;
    const firstX = (Y) => { for (let X = 0; X < bx + em * 0.6; X++) if (filled(X, Y)) return X; return -1; };
    // the stem's left edge, from a row just under the baseline where the stem is clean
    const stemL = firstX(by + Math.round(em * 0.02));
    for (let Y = by + Math.round(em * 0.02); Y < mc.height; Y++) for (let X = 0; X < stemL; X++) D[(Y * W + X) * 4 + 3] = 0;
    m.putImageData(d, 0, 0);
  }
  const tint = (c) => { const t = document.createElement('canvas'); t.width = mc.width; t.height = mc.height; const g = t.getContext('2d'); g.drawImage(mc, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = c; g.fillRect(0, 0, t.width, t.height); return t; };
  const ink = tint(INK), rim = tint('rgba(255,255,255,.5)'), fill = tint(color);
  const out = document.createElement('canvas'); out.width = mc.width + pad; out.height = mc.height + pad; const o = out.getContext('2d');
  // a fattened stamp of the ink shape = the outline
  const fat = (dx, dy, r) => { for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; o.drawImage(ink, dx + Math.cos(a) * r, dy + Math.sin(a) * r); } o.drawImage(ink, dx, dy); };
  for (const [dx, dy] of [[.03, .04], [.05, .07], [.07, .1]]) fat(dx * em, dy * em, em * 0.03);
  fat(0, 0, em * 0.035);
  o.drawImage(rim, -.02 * em, -.025 * em);
  o.drawImage(fill, 0, 0);
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot * Math.PI / 180); ctx.scale(sx, sy);
  ctx.drawImage(out, -bx - w / 2, -by);
  ctx.restore();
}
// dent a word away from the gap at (cx, cy): dir -1 bends it up (huff), +1 down (puff)
function dent(src, cx, cy, Rx, Ry, A, dir) {
  const W = src.width, H = src.height, sctx = src.getContext('2d');
  const a = sctx.getImageData(0, 0, W, H), b = sctx.createImageData(W, H);
  const S = a.data, D = b.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const along = Math.exp(-(((x - cx) / Rx) ** 2));
    const away = Math.max(0, (y - cy) * dir); // distance from the gap into the word
    const v = A * along * Math.exp(-((away / Ry) ** 2)) * dir; // how far this row moved
    // a touch of sideways bulge, like squashed clay spreading
    const h = A * 0.25 * Math.tanh((x - cx) / (Rx * 0.6)) * along * Math.exp(-((away / Ry) ** 2));
    const sxp = x - h, syp = y - v;
    const x0 = Math.floor(sxp), y0 = Math.floor(syp), fx = sxp - x0, fy = syp - y0;
    if (x0 < 0 || y0 < 0 || x0 >= W - 1 || y0 >= H - 1) continue;
    const o = (y * W + x) * 4;
    for (let c = 0; c < 4; c++) {
      const i = (y0 * W + x0) * 4 + c;
      D[o + c] = (S[i] * (1 - fx) + S[i + 4] * fx) * (1 - fy) + (S[i + W * 4] * (1 - fx) + S[i + W * 4 + 4] * fx) * fy;
    }
  }
  sctx.putImageData(b, 0, 0);
}
const layer = (W, H) => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };

// k: resolution (1 ≈ 900 px wide). Returns a canvas trimmed to the artwork.
export function drawLogo(k = 1) {
  const W = Math.round(1000 * k), H = Math.round(1000 * k), C = 500 * k;
  const top = layer(W, H), bot = layer(W, H), c = layer(W, H), ctx = c.getContext('2d');
  // stacked tight: the gap between huff's baseline and puff's x-height is where the n gets jammed
  word(top.getContext('2d'), 'huff', C - 30 * k, 440 * k, 320 * k, '#ff5fa8', -3);
  word(bot.getContext('2d'), 'puff', C + 20 * k, 650 * k, 340 * k, '#22c7b4', -2);
  const gy = 460 * k;
  // the squeeze: huff arches up and puff dips down where the n pushes in
  dent(top, C, gy + 20 * k, 120 * k, 150 * k, 64 * k, -1);
  dent(bot, C, gy - 30 * k, 132 * k, 195 * k, 90 * k, 1);
  ctx.drawImage(top, 0, 0); ctx.drawImage(bot, 0, 0); // puff sits over huff
  // the n itself, squashed flat
  const ns = 250 * k;
  word(ctx, 'n', C, gy + ns * 0.26 * 0.82, ns, '#ffb21f', 5, 1.12, 0.82);
  const d = ctx.getImageData(0, 0, W, H).data; let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const p = Math.round(12 * k), t = layer(x1 - x0 + p * 2, y1 - y0 + p * 2);
  t.getContext('2d').drawImage(c, x0 - p, y0 - p, t.width, t.height, 0, 0, t.width, t.height);
  return t;
}

// the brand yellow, with a soft glow (app icon, welcome screen)
export const YELLOW = '#ffb21f';
export function paintYellow(ctx, W, H) {
  ctx.fillStyle = YELLOW; ctx.fillRect(0, 0, W, H);
  const g1 = ctx.createRadialGradient(W * 0.25, H * 0.18, 0, W * 0.25, H * 0.18, W * 0.7);
  g1.addColorStop(0, '#ffc24a'); g1.addColorStop(1, 'rgba(255,194,74,0)');
  ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);
  const g2 = ctx.createRadialGradient(W * 0.8, H * 0.88, 0, W * 0.8, H * 0.88, W * 0.7);
  g2.addColorStop(0, '#ffa915'); g2.addColorStop(1, 'rgba(255,169,21,0)');
  ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
}
