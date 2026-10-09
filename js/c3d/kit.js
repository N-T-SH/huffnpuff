// Huff n Puff 3D — shared kit: noise, procedural clay textures, materials and lumpy primitives.
import {
  Vector3, Color, Mesh, CanvasTexture, RepeatWrapping, SRGBColorSpace,
  CapsuleGeometry, SphereGeometry, ExtrudeGeometry, Shape,
  MeshPhysicalMaterial, MeshStandardMaterial,
} from '../vendor/three.js';

export const Y = new Vector3(0, 1, 0);
const tmp = new Vector3();

/* ---------- noise ---------- */
function hash(x, y, z) {
  let h = x * 374761393 + y * 668265263 + z * 2147483647;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) & 0xffff) / 0xffff;
}
export function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const s = (t) => t * t * (3 - 2 * t);
  const u = s(xf), v = s(yf), w = s(zf);
  const L = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash(xi + dx, yi + dy, zi + dz);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v), L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v), w) * 2 - 1;
}
export function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Push vertices along their normals with smooth noise: hand-pressed, imperfect clay.
// Noise depends only on position, so duplicated seam vertices move together (no cracks).
export function lumpify(geo, amp = 0.8, freq = 0.09, seed = 0) {
  const p = geo.attributes.position, n = geo.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const d = amp * (vnoise(x * freq + seed, y * freq, z * freq) + 0.5 * vnoise(x * freq * 2.3, y * freq * 2.3 + seed, z * freq * 2.3));
    p.setXYZ(i, x + n.getX(i) * d, y + n.getY(i) * d, z + n.getZ(i) * d);
  }
  geo.computeVertexNormals();
  return geo;
}

/* ---------- procedural textures ---------- */
const texCache = new Map();
function canvasTex(key, size, draw, { repeat = 1, color = false } = {}) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size, mulberry(key.length * 97 + size));
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(repeat, repeat);
  if (color) t.colorSpace = SRGBColorSpace;
  texCache.set(key, t);
  return t;
}
function grain(g, S, rnd, amt) {
  const img = g.getImageData(0, 0, S, S);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rnd() - 0.5) * amt;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
}

// fingerprints, dents and tool marks
export const clayBump = () => canvasTex('clay', 512, (g, S, rnd) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 260; i++) {
    const x = rnd() * S, y = rnd() * S, r = 6 + rnd() * 34;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rnd() > 0.5 ? 'rgba(255,255,255,.16)' : 'rgba(0,0,0,.16)');
    gr.addColorStop(1, 'rgba(128,128,128,0)');
    g.fillStyle = gr;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { g.beginPath(); g.arc(x + ox, y + oy, r, 0, 7); g.fill(); }
  }
  for (let k = 0; k < 9; k++) {
    g.save(); g.translate(rnd() * S, rnd() * S); g.rotate(rnd() * 3);
    g.strokeStyle = 'rgba(40,40,40,.10)'; g.lineWidth = 1.3;
    for (let r = 3; r < 26; r += 2.6) { g.beginPath(); g.ellipse(0, 0, r * 1.35, r, 0, rnd() * 2, 5.4 + rnd()); g.stroke(); }
    g.restore();
  }
  g.strokeStyle = 'rgba(30,30,30,.09)';
  for (let i = 0; i < 90; i++) {
    const x = rnd() * S, y = rnd() * S, a = rnd() * 7, l = 4 + rnd() * 16;
    g.lineWidth = 0.6 + rnd(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  grain(g, S, rnd, 14);
}, { repeat: 1.5 });

// fuzzy felt / flocking
export const feltBump = () => canvasTex('felt', 256, (g, S, rnd) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,.25)' : 'rgba(0,0,0,.25)';
    const a = rnd() * 7, l = 1 + rnd() * 3, x = rnd() * S, y = rnd() * S;
    g.fillRect(x, y, Math.cos(a) * l + 1, Math.sin(a) * l + 1);
  }
}, { repeat: 4 });

// woven fabric (mats, towels, canvas sneakers, pads)
export const weaveBump = () => canvasTex('weave', 256, (g, S, rnd) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, S, S);
  const c = 8;
  for (let y = 0; y < S; y += c) for (let x = 0; x < S; x += c) {
    const h = ((x + y) / c) % 2 === 0;
    const gr = h ? g.createLinearGradient(x, y, x, y + c) : g.createLinearGradient(x, y, x + c, y);
    gr.addColorStop(0, '#585858'); gr.addColorStop(0.5, '#cfcfcf'); gr.addColorStop(1, '#585858');
    g.fillStyle = gr; g.fillRect(x + 0.5, y + 0.5, c - 1, c - 1);
  }
  grain(g, S, rnd, 30);
}, { repeat: 5 });

// moulded rubber: fine stipple and the odd scuff (plates, kettlebells, grips)
export const rubberBump = () => canvasTex('rubber', 256, (g, S, rnd) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 5000; i++) {
    g.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,.22)' : 'rgba(0,0,0,.22)';
    g.beginPath(); g.arc(rnd() * S, rnd() * S, 0.6 + rnd() * 1.4, 0, 7); g.fill();
  }
  g.strokeStyle = 'rgba(0,0,0,.18)';
  for (let i = 0; i < 24; i++) { const x = rnd() * S, y = rnd() * S, a = rnd() * 7; g.lineWidth = 0.8 + rnd(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 18, y + Math.sin(a) * 18); g.stroke(); }
}, { repeat: 3 });

// diamond knurling on metal bars and handles
export const knurlBump = () => canvasTex('knurl', 128, (g, S) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, S, S);
  g.lineWidth = 2;
  for (let i = -S; i < 2 * S; i += 8) {
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(i, 0); g.lineTo(i + S, S); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.moveTo(i, S); g.lineTo(i + S, 0); g.stroke();
  }
}, { repeat: 6 });

export const woodTex = (base = '#b7834f') => canvasTex('wood' + base, 512, (g, S, rnd) => {
  const plank = S / 4;
  for (let p = 0; p < 4; p++) {
    const c = new Color(base).offsetHSL(0, 0, (rnd() - 0.5) * 0.08);
    g.fillStyle = '#' + c.getHexString(); g.fillRect(0, p * plank, S, plank);
    g.strokeStyle = 'rgba(60,30,10,.18)';
    for (let i = 0; i < 26; i++) {
      g.lineWidth = 0.6 + rnd() * 1.4; g.beginPath();
      const y0 = p * plank + rnd() * plank;
      g.moveTo(0, y0);
      for (let x = 0; x <= S; x += 32) g.lineTo(x, y0 + Math.sin(x * 0.02 + i) * 3 + (rnd() - 0.5) * 2);
      g.stroke();
    }
    g.fillStyle = 'rgba(40,20,5,.45)'; g.fillRect(0, p * plank, S, 2);
    const off = rnd() * S; g.fillRect(off, p * plank, 2, plank);
  }
  grain(g, S, rnd, 10);
}, { repeat: 3, color: true });

export const tileTex = (base = '#f4f4f0', grout = '#c9c6bd', n = 8) => canvasTex(`tile${base}${grout}${n}`, 512, (g, S, rnd) => {
  g.fillStyle = grout; g.fillRect(0, 0, S, S);
  const t = S / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const c = new Color(base).offsetHSL(0, 0, (rnd() - 0.5) * 0.04);
    g.fillStyle = '#' + c.getHexString();
    g.fillRect(i * t + 3, j * t + 3, t - 6, t - 6);
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(i * t + 6, j * t + 6, t * 0.4, 3);
  }
  grain(g, S, rnd, 6);
}, { repeat: 2, color: true });

export const brickTex = () => canvasTex('brick', 512, (g, S, rnd) => {
  g.fillStyle = '#5b4a45'; g.fillRect(0, 0, S, S);
  const h = S / 10, w = S / 4;
  for (let r = 0; r < 10; r++) for (let c = -1; c < 5; c++) {
    const x = c * w + (r % 2 ? w / 2 : 0);
    const col = new Color('#8b5a4a').offsetHSL((rnd() - 0.5) * 0.03, (rnd() - 0.5) * 0.1, (rnd() - 0.5) * 0.12);
    g.fillStyle = '#' + col.getHexString();
    g.beginPath(); g.roundRect(x + 3, r * h + 3, w - 6, h - 6, 4); g.fill();
  }
  grain(g, S, rnd, 22);
}, { repeat: 2, color: true });

export const regolithBump = () => canvasTex('regolith', 512, (g, S, rnd) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 160; i++) {
    const x = rnd() * S, y = rnd() * S, r = 3 + rnd() * 26;
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke();
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(x + 1, y + 1, r * 0.8, 0, 7); g.fill();
  }
  grain(g, S, rnd, 40);
}, { repeat: 3 });

/* ---------- materials ---------- */
const matCache = new Map();
const TEX = { weave: () => weaveBump(), rubber: () => rubberBump(), knurl: () => knurlBump(), wood: () => clayBump() };
export function clay(color, opts = {}) {
  const { rough = 0.55, sheen = 0.6, bump = 3, gloss = 0.04, felt = false, emissive = null, ei = 0, metal = 0, map = null, transparent = false, opacity = 1 } = opts;
  const key = JSON.stringify([color, opts]);
  if (!opts.unique && matCache.has(key)) return matCache.get(key);
  const m = new MeshPhysicalMaterial({
    color: new Color(color), roughness: felt ? 1 : rough, metalness: metal,
    sheen: felt ? 0.8 : sheen, sheenRoughness: felt ? 0.8 : 0.45, sheenColor: felt ? new Color(color).offsetHSL(0, 0.05, 0.12) : new Color('#ffffff'),
    clearcoat: gloss, clearcoatRoughness: 0.3,
    bumpMap: felt ? feltBump() : TEX[opts.tex]?.() || clayBump(), bumpScale: felt ? 4 : bump,
    map: map || (opts.tex === 'wood' ? woodTex(new Color(color).getStyle()) : null), transparent, opacity, vertexColors: !!opts.vc,
  });
  if (emissive) { m.emissive = new Color(emissive); m.emissiveIntensity = ei || 1; }
  if (opts.tex === 'wood') m.color.set('#ffffff'); // the grain map carries the colour
  if (!opts.unique) matCache.set(key, m);
  return m;
}
// Clothing on the sculpted body: a woven fabric bump (from object-space position) on every
// vertex flagged as cloth, so skin stays smooth clay while shirts, leotards and robes read as fabric.
export function fabricize(m) {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float cloth;\nvarying float vCloth;\nvarying vec3 vObj;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCloth = cloth;\nvObj = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vCloth;\nvarying vec3 vObj;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float fabU = vObj.y * 1.5, fabV = (vObj.x + vObj.z) * 1.5;
        // fade the weave out where it would be smaller than a pixel (no glitter)
        float fabAA = clamp(1.4 - fwidth(fabU) * 1.2 - fwidth(fabV) * 1.2, 0.0, 1.0);
        float fabH = (sin(fabU) * sin(fabV) * 0.5 + 0.18 * sin(2.0 * fabU + fabV)) * fabAA;
        diffuseColor.rgb *= 1.0 - vCloth * (0.03 + 0.035 * fabH);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        #ifdef USE_BUMPMAP
        if (vCloth > 0.01) normal = perturbNormalArb(-vViewPosition, normal, vec2(dFdx(fabH), dFdy(fabH)) * 0.28 * vCloth, faceDirection);
        #endif`);
  };
  m.customProgramCacheKey = () => 'fabric-v2';
  return m;
}

export function plain(color, opts = {}) {
  return new MeshStandardMaterial({ color: new Color(color), roughness: 0.9, ...opts });
}

/* ---------- lumpy primitives ---------- */
const geoCache = new Map();
export function capsule(r, len, seed = 1, amp = 0.55) {
  const k = `c${r}:${len}:${seed}:${amp}`;
  if (!geoCache.has(k)) geoCache.set(k, lumpify(new CapsuleGeometry(r, Math.max(0.01, len), 8, 18), amp, 0.11, seed));
  return geoCache.get(k);
}
export function sphere(r, seed = 1, amp = 0.45, seg = 28) {
  const k = `s${r}:${seed}:${amp}:${seg}`;
  if (!geoCache.has(k)) geoCache.set(k, lumpify(new SphereGeometry(r, seg, Math.round(seg * 0.7)), amp, 0.12, seed));
  return geoCache.get(k);
}
export function roundedBox(w, h, d, r = 3, seed = 2, amp = 0.4) {
  const k = `b${w}:${h}:${d}:${r}:${seed}:${amp}`;
  if (geoCache.has(k)) return geoCache.get(k);
  r = Math.min(r, w / 2 - 0.1, h / 2 - 0.1, d / 2 - 0.1);
  const s = new Shape();
  const x = -w / 2 + r, y = -d / 2 + r, W = w - 2 * r, D = d - 2 * r;
  s.moveTo(x, y); s.lineTo(x + W, y); s.lineTo(x + W, y + D); s.lineTo(x, y + D); s.lineTo(x, y);
  const geo = new ExtrudeGeometry(s, { depth: Math.max(0.1, h - 2 * r), bevelEnabled: true, bevelSize: r, bevelThickness: r, bevelSegments: 4, curveSegments: 6 });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -h / 2 + r, 0);
  const g2 = lumpify(geo, amp, 0.05, seed);
  geoCache.set(k, g2);
  return g2;
}

export function mesh(geo, mat, { cast = true, receive = true } = {}) {
  const m = new Mesh(geo, mat);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

// position/orient a Y-aligned mesh between two points
export function placeSeg(m, a, b) {
  m.position.copy(a).add(b).multiplyScalar(0.5);
  tmp.copy(b).sub(a);
  const l = tmp.length();
  if (l > 1e-6) m.quaternion.setFromUnitVectors(Y, tmp.multiplyScalar(1 / l));
}

export function at(m, x, y, z, rx = 0, ry = 0, rz = 0, s = null) {
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  if (s) Array.isArray(s) ? m.scale.set(...s) : m.scale.setScalar(s);
  return m;
}
