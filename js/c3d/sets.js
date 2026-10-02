// SuperSweatClub 3D — ten tabletop stop-motion sets, each with its own light, lens, grade and
// little living details (props that move, pets that wander).
import {
  Group, Mesh, Color, BufferGeometry, Float32BufferAttribute, PlaneGeometry, CylinderGeometry, ConeGeometry,
  TorusGeometry, SphereGeometry, IcosahedronGeometry, BoxGeometry, CircleGeometry, PointLight, SpotLight, Vector3,
  MeshBasicMaterial, MeshStandardMaterial, AdditiveBlending, DoubleSide,
} from '../vendor/three.js';
import { clay, plain, capsule, sphere, roundedBox, mesh, lumpify, at, woodTex, tileTex, brickTex, mulberry } from './kit.js';

const M = clay;

function texMat(tex, opts = {}) {
  return new MeshStandardMaterial({ map: tex, roughness: 0.8, ...opts });
}

// floor that sweeps up into a curved back wall, like a tabletop animation set
function cyclorama(color, { r = 160, back = -30 } = {}) {
  const prof = [];
  for (let i = 0; i <= 12; i++) prof.push([520 - i * 46, 0]);
  for (let i = 1; i <= 12; i++) { const a = (i / 12) * Math.PI / 2; prof.push([back - Math.sin(a) * r, r - Math.cos(a) * r]); }
  for (let i = 1; i <= 8; i++) prof.push([back - r, r + i * 110]);
  const W = 2200, cols = 16, pos = [], idx = [];
  prof.forEach(([z, y], row) => {
    for (let c = 0; c <= cols; c++) pos.push(-W / 2 + (W * c) / cols, y, z);
    if (row > 0) for (let c = 0; c < cols; c++) {
      const a = (row - 1) * (cols + 1) + c, b = a + 1, d = row * (cols + 1) + c, e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
  });
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const m = new Mesh(geo, new MeshStandardMaterial({ color: new Color(color), roughness: 0.95, side: DoubleSide }));
  m.receiveShadow = true;
  return m;
}

function plant(x, z, s = 1, pot = '#d9744f', leaf = '#5bc46a') {
  const g = new Group();
  g.add(at(mesh(lumpify(new CylinderGeometry(15, 11, 26, 20), 0.5, 0.1, 50), M(pot)), 0, 13, 0));
  for (let i = 0; i < 7; i++) {
    const a = -1 + i * 0.33;
    g.add(at(mesh(capsule(4.5, 24, 51 + i, 0.5), M(leaf)), Math.sin(a) * 13, 40 + Math.cos(a) * 8, i % 2 ? 4 : -4, 0, 0, -a));
  }
  return at(g, x, 0, z, 0, 0, 0, s);
}

/* ---------- pets ---------- */
export function makePet(kind) {
  const C = {
    dog: { body: '#e39a4c', belly: '#fbf1e2', ear: '#e39a4c', len: 30, h: 13, leg: 9, tail: 6 },
    cat: { body: '#8a8f99', belly: '#e8e6e1', ear: '#8a8f99', len: 30, h: 17, leg: 14, tail: 26 },
    fox: { body: '#e3702b', belly: '#fbf1e2', ear: '#e3702b', len: 30, h: 16, leg: 12, tail: 24 },
  }[kind];
  const g = new Group();
  const body = new Group();
  g.add(body);
  const mb = M(C.body), mw = M(C.belly), dark = M('#2a1f1c', { gloss: 0.6, rough: 0.2 });
  body.add(at(mesh(capsule(9, C.len, 70, 0.6), mb), 0, C.h + 9, 0, 0, 0, Math.PI / 2));
  body.add(at(mesh(capsule(6.5, C.len * 0.7, 71, 0.4), mw), 1, C.h + 5.5, 0, 0, 0, Math.PI / 2, [1, 1, 1.05]));
  const head = new Group();
  at(head, C.len / 2 + 9, C.h + 19, 0);
  body.add(head);
  head.add(mesh(sphere(9.5, 72), mb));
  head.add(at(mesh(capsule(4.2, 7, 73, 0.2), kind === 'cat' ? mb : mw), 9, -2.5, 0, 0, 0, Math.PI / 2));
  head.add(at(mesh(sphere(2, 74, 0), dark), 14.5, -1.5, 0));
  for (const z of [4, -4]) {
    head.add(at(mesh(sphere(1.8, 75, 0), dark), 7.5, 2.5, z * 1.15));
    head.add(at(mesh(new ConeGeometry(kind === 'dog' ? 5.5 : 4.5, 11, 12), M(C.ear)), -1, 11, z * 1.4, z * 0.06, 0, 0.15));
  }
  const legs = [];
  for (const [x, z] of [[C.len / 2, 5], [C.len / 2, -5], [-C.len / 2, 5], [-C.len / 2, -5]]) {
    const leg = new Group();
    at(leg, x, C.h + 4, z);
    leg.add(at(mesh(capsule(3.2, C.leg, 76, 0.2), kind === 'fox' ? M('#3a2a24') : mb), 0, -C.leg / 2, 0));
    body.add(leg);
    legs.push(leg);
  }
  const tail = new Group();
  at(tail, -C.len / 2 - 6, C.h + 12, 0);
  body.add(tail);
  tail.add(at(mesh(capsule(kind === 'dog' ? 3.5 : 3.8, C.tail, 77, 0.5), mb), -C.tail / 2, C.tail / 3, 0, 0, 0, 1));
  if (kind === 'fox') tail.add(at(mesh(sphere(5, 78, 0.6), mw), -C.tail - 1, C.tail * 0.75, 0));
  g.userData = { body, head, legs, tail };
  return g;
}

// wander behind the actor: walk in, sit and watch, walk off
function petUpdate(pet, t, { z = -70, x0 = -300, x1 = 300, sitAt = -120 } = {}) {
  const L = 26, tt = t % L, v = 38;
  const { body, head, legs, tail } = pet.userData;
  const dir = x1 >= x0 ? 1 : -1;
  const walk1 = Math.abs(sitAt - x0) / v;
  let x, moving = true;
  if (tt < walk1) x = x0 + dir * tt * v;
  else if (tt < walk1 + 5) { x = sitAt; moving = false; }
  else { x = sitAt + dir * (tt - walk1 - 5) * v; if (dir * (x - x1) > 0) x = x1 + dir * 600; }
  pet.position.set(x, 0, z);
  pet.rotation.y = dir > 0 ? 0 : Math.PI;
  const w = t * 9;
  legs.forEach((l, i) => (l.rotation.z = moving ? Math.sin(w + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * 0.6 : i > 1 ? 1.2 : 0));
  body.position.y = moving ? Math.abs(Math.sin(w)) * 1.5 : -5;
  body.rotation.z = moving ? 0 : 0.18;
  head.rotation.y = moving ? 0 : 0.7 + Math.sin(t * 1.3) * 0.15;
  head.rotation.z = moving ? Math.sin(w * 0.5) * 0.05 : -0.2;
  tail.rotation.z = Math.sin(t * (moving ? 10 : 6)) * 0.35;
}

/* ---------- the sets ---------- */
const SETS = {};

SETS.studio = (ctx) => {
  const g = new Group();
  g.add(cyclorama('#f2c0a2'));
  g.add(plant(ctx.left - 120, -105));
  const ped = new Group();
  ped.add(at(mesh(roundedBox(50, 60, 50, 6), M('#ffd7c2')), 0, 30, 0));
  ped.add(at(mesh(lumpify(new TorusGeometry(20, 9, 20, 40), 0.6, 0.1, 80), M('#ff8a65')), 0, 85, 0, 0.3, 0.5, 0));
  g.add(at(ped, ctx.right + 120, 0, -110));
  [[ctx.right + 40, -40, 9, '#ffb59c'], [ctx.right + 62, -25, 6, '#8f7cff'], [ctx.left + 30, 50, 6, '#ffd166']].forEach(([x, z, r, c], i) => g.add(at(mesh(sphere(r, 60 + i, 0.6), M(c)), x, r * 0.8, z)));
  const dog = makePet('dog');
  g.add(dog);
  return {
    group: g,
    update: (t) => petUpdate(dog, t, { z: -75, x0: ctx.left - 320, sitAt: ctx.left - 60 }),
    env: {
      bg: '#f6cdb3', fog: ['#f6cdb3', 900, 2400], hemi: ['#fff4e6', '#b88a6e', 1.15], ambient: 0.15,
      key: { color: '#fff0dc', i: 2.6, pos: [-160, 330, 260] }, rim: { color: '#d8e6ff', i: 1.1 }, fill: { color: '#ffe6f0', i: 0.5 },
      cam: { az: 0.62, el: 0.17, fov: 30, move: 'orbit' }, dof: { aperture: 0.6, maxblur: 0.006 },
      grade: { vignette: 0.28, grain: 0.035, sat: 1.05, contrast: 1.03, tint: [1, 1, 1] },
    },
  };
};

// Bruno: Clay Boi's blue wall, a wooden workbench, cinder blocks and a coffee mug
SETS.workbench = (ctx) => {
  const g = new Group();
  g.add(at(mesh(new PlaneGeometry(2400, 1400), texMat(woodTex('#b9844f'))), 0, 0, 0, -Math.PI / 2));
  g.children[0].receiveShadow = true;
  g.add(at(mesh(new PlaneGeometry(2600, 1400), plain('#26508f', { roughness: 0.95 }), { cast: false }), 0, 600, -260));
  // cinder block tower on a pallet
  const blocks = new Group();
  const conc = M('#a8a8a3', { rough: 0.95, bump: 4, tex: 'rubber' }), hole = plain('#4b4b48');
  const pal = M('#c49a63', { tex: 'wood', bump: 1.5 });
  for (let i = 0; i < 4; i++) blocks.add(at(mesh(roundedBox(130, 5, 18, 2), pal), 0, 4, -40 + i * 26));
  for (let i = 0; i < 3; i++) blocks.add(at(mesh(roundedBox(14, 8, 100, 2), pal), -55 + i * 55, 10, 0));
  const placeBlock = (x, y, z, ry = 0) => {
    const b = new Group();
    b.add(mesh(roundedBox(40, 20, 20, 2, 5, 0.5), conc));
    for (const hx of [-10, 10]) b.add(at(mesh(new BoxGeometry(12, 1, 10), hole), hx, 10.1, 0));
    blocks.add(at(b, x, y + 10, z, 0, ry, 0));
  };
  [[-42, 14, -20], [0, 14, -20], [42, 14, -20], [-42, 14, 10], [0, 14, 10], [42, 14, 10], [-21, 34, -5], [21, 34, -5], [-21, 54, -5], [0, 74, -5, 0.3]].forEach((b) => placeBlock(...b));
  g.add(at(blocks, ctx.left - 140, 0, -130));
  // mug + pencil cup + jar
  const mug = new Group();
  mug.add(at(mesh(lumpify(new CylinderGeometry(16, 15, 34, 24), 0.4, 0.1, 81), M('#f3efe6', { gloss: 0.4 })), 0, 17, 0));
  mug.add(at(mesh(new TorusGeometry(9, 3, 10, 20), M('#f3efe6', { gloss: 0.4 })), 17, 18, 0, 0, 0, 0));
  mug.add(at(mesh(new CircleGeometry(14, 24), plain('#4a2c1a', { roughness: 0.3 })), 0, 31, 0, -Math.PI / 2));
  g.add(at(mug, ctx.right + 110, 0, -120, 0, -0.5, 0));
  const cup = new Group();
  cup.add(at(mesh(lumpify(new CylinderGeometry(12, 12, 40, 20, 1, true), 0.4, 0.1, 82), M('#2f2f33', { metal: 0.5, rough: 0.35 })), 0, 20, 0));
  ['#f2c14e', '#e85d4f', '#4f9dff', '#5bc46a'].forEach((c, i) => cup.add(at(mesh(new CylinderGeometry(2, 2, 70, 8), M(c)), Math.sin(i * 1.7) * 5, 38, Math.cos(i * 1.7) * 5, Math.sin(i) * 0.15, 0, Math.cos(i) * 0.15)));
  g.add(at(cup, ctx.right + 175, 0, -190));
  // blurry foreground tape roll
  g.add(at(mesh(lumpify(new TorusGeometry(16, 9, 16, 32), 0.4, 0.1, 83), M('#d9cfa8', { rough: 0.6 })), ctx.right + 70, 9, 160, Math.PI / 2, 0, 0));
  return {
    group: g, update: () => {},
    env: {
      bg: '#26508f', fog: null, hemi: ['#d9e6ff', '#7a5530', 0.85], ambient: 0.12, mat: '#3b8a5a',
      key: { color: '#ffe2bd', i: 3.1, pos: [-260, 300, 220] }, rim: { color: '#9ec3ff', i: 1.6 }, fill: { color: '#ffd9a8', i: 0.35 },
      cam: { az: 0.48, el: 0.07, fov: 26, move: 'dolly' }, dof: { aperture: 2.2, maxblur: 0.012 },
      grade: { vignette: 0.38, grain: 0.05, sat: 1.1, contrast: 1.06, tint: [1.03, 1, 0.97] },
    },
  };
};

// Jolene: 80s aerobics VHS — pink wall, foam weights, dancing sneakers, walkman
SETS.aerobics = (ctx) => {
  const g = new Group();
  g.add(at(mesh(new PlaneGeometry(2400, 1400), texMat(woodTex('#d9a86e'), { roughness: 0.55 })), 0, 0, 0, -Math.PI / 2));
  g.children[0].receiveShadow = true;
  g.add(at(mesh(new PlaneGeometry(2600, 1200), plain('#f3b3ad', { roughness: 1 }), { cast: false }), 0, 600, -200));
  g.add(at(mesh(roundedBox(2600, 22, 8, 2), M('#fff6f0')), 0, 11, -195));
  // foam dumbbells
  const foam = M('#3cc3e8', { felt: true });
  const db = (x, z, ry) => {
    const d = new Group();
    d.add(at(mesh(new CylinderGeometry(3, 3, 26, 10), M('#e6e6e6')), 0, 0, 0, Math.PI / 2));
    for (const s of [-1, 1]) d.add(at(mesh(lumpify(new CylinderGeometry(11, 11, 14, 22), 0.6, 0.15, 84), foam), 0, 0, s * 15, Math.PI / 2));
    return at(d, x, 11, z, 0, ry, 0);
  };
  g.add(db(ctx.left - 90, -120, 0.4), db(ctx.left - 60, -150, 1.2));
  // sneakers that hop on their own
  const shoe = () => {
    const s = new Group();
    s.add(at(mesh(capsule(11, 30, 85, 0.6), M('#f4f4f4', { tex: 'weave', bump: 1.6 })), 0, 11, 0, 0, 0, Math.PI / 2, [1, 0.9, 1]));
    s.add(at(mesh(capsule(8, 34, 86, 0.3), M('#9fb1c4', { tex: 'rubber', bump: 1.4 })), 0, 4, 0, 0, 0, Math.PI / 2, [1, 0.6, 1.25]));
    s.add(at(mesh(capsule(4, 14, 87, 0.3), M('#5d7fa8')), 6, 16, 9, 0.5, 0, 0.3));
    return s;
  };
  const s1 = at(shoe(), ctx.right + 90, 0, -110, 0, -0.4, 0), s2 = at(shoe(), ctx.right + 120, 0, -80, 0, -0.6, 0);
  g.add(s1, s2);
  // walkman with spinning reels + water bottle + towel
  const wm = new Group();
  wm.add(at(mesh(roundedBox(40, 54, 14, 3), M('#2f3d4a', { gloss: 0.3, tex: 'rubber', bump: 1 })), 0, 27, 0));
  const reels = [];
  for (const x of [-9, 9]) { const r = at(mesh(new TorusGeometry(5, 1.5, 6, 12), M('#e6e6e6')), x, 30, 7.5); reels.push(r); wm.add(r); }
  wm.add(at(mesh(roundedBox(30, 6, 8, 2), M('#ff5a4f')), 0, 50, 2));
  g.add(at(wm, ctx.right + 190, 0, -170, 0, -0.5, 0));
  const bottle = new Group();
  bottle.add(at(mesh(lumpify(new CylinderGeometry(12, 12, 50, 22), 0.3, 0.1, 88), M('#fbfbfb', { gloss: 0.5 })), 0, 25, 0));
  bottle.add(at(mesh(new CylinderGeometry(7, 9, 10, 18), M('#1f5fa8')), 0, 55, 0));
  bottle.add(at(mesh(lumpify(new CylinderGeometry(12.3, 12.3, 10, 22, 1, true), 0.2, 0.1, 89), M('#1f5fa8')), 0, 18, 0));
  g.add(at(bottle, ctx.left - 150, 0, -60));
  g.add(at(mesh(roundedBox(70, 10, 40, 4), M('#ffd166', { felt: true })), ctx.left - 10, 5, -170, 0, 0.2, 0));
  return {
    group: g,
    update: (t) => {
      const hop = (s, ph, bx) => { const k = Math.max(0, Math.sin(t * 5 + ph)); s.position.y = k * 10; s.rotation.z = k * 0.3; s.position.x = bx + Math.sin(t * 0.6 + ph) * 10; };
      hop(s1, 0, ctx.right + 90); hop(s2, Math.PI, ctx.right + 120);
      reels.forEach((r) => (r.rotation.z = t * 4));
    },
    env: {
      bg: '#f3b3ad', fog: ['#f3b3ad', 700, 1800], hemi: ['#ffe9f0', '#c0805a', 1.3], ambient: 0.25, mat: '#3cc3e8',
      key: { color: '#fff3e8', i: 2.2, pos: [140, 320, 300] }, rim: { color: '#c9f0ff', i: 1 }, fill: { color: '#ffd6e8', i: 0.8 },
      cam: { az: 0.9, el: 0.1, fov: 30, move: 'handheld' }, dof: { aperture: 1.2, maxblur: 0.008 },
      grade: { vignette: 0.32, grain: 0.07, sat: 1.25, contrast: 0.94, tint: [1.05, 0.98, 1.03], vhs: 1 },
    },
  };
};


// DJ Dee: light-up dance floor, disco ball, speakers and sweeping coloured beams
SETS.disco = (ctx) => {
  const g = new Group();
  g.add(at(mesh(new PlaneGeometry(2400, 1400), plain('#151025', { roughness: 0.35, metalness: 0.3 })), 0, -0.5, 0, -Math.PI / 2));
  g.add(at(mesh(new PlaneGeometry(2600, 1400), plain('#120d24', { roughness: 1 }), { cast: false }), 0, 600, -260));
  const tiles = [];
  const n = 7, ts = 42;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const m = new MeshStandardMaterial({ color: '#222', emissive: new Color('#ff3ea5'), emissiveIntensity: 0.4, roughness: 0.25 });
    // tiles stay below an exercise mat's top (y 3) so the two never z-fight
    const tl = at(mesh(roundedBox(ts - 3, 1.6, ts - 3, 0.6, 6, 0.1), m, { cast: false }), (i - (n - 1) / 2) * ts, 0.8, (j - (n - 1) / 2) * ts);
    tiles.push(tl);
    g.add(tl);
  }
  const speaker = (x) => {
    const s = new Group();
    s.add(at(mesh(roundedBox(70, 130, 60, 6), M('#1d1b22', { rough: 0.7, tex: 'weave', bump: 1.4 })), 0, 65, 0));
    for (const [y, r] of [[95, 20], [45, 26]]) {
      s.add(at(mesh(new TorusGeometry(r, 3, 10, 28), M('#3a3744', { metal: 0.4 })), 0, y, 31));
      s.add(at(mesh(sphere(r * 0.45, 90, 0.2), M('#2a2830', { tex: 'rubber', bump: 1.5 })), 0, y, 30, 0, 0, 0, [1, 1, 0.4]));
    }
    return at(s, x, 0, -180);
  };
  g.add(speaker(ctx.left - 120), speaker(ctx.right + 120));
  const ball = new Mesh(new IcosahedronGeometry(30, 2), new MeshStandardMaterial({ color: '#d9dde6', metalness: 1, roughness: 0.15, flatShading: true }));
  ball.position.set(0, 330, -80);
  g.add(ball, at(mesh(new CylinderGeometry(0.8, 0.8, 300, 6), plain('#666')), 0, 510, -80));
  const red = new PointLight('#ff2d6f', 2.6, 0, 0), blue = new PointLight('#2d7bff', 2.6, 0, 0);
  g.add(red, blue);
  // moving-head lights on a truss: each beam is a cone from its lamp to where it lands on the floor
  // (it ends there, never through the floor or wall), brightest at the lamp, with a pool of light
  // on the floor and a real spotlight so whoever it sweeps over is lit in its colour
  const truss = at(mesh(new CylinderGeometry(3, 3, 760, 10), M('#3a3744', { metal: 0.6, rough: 0.35 })), 0, 470, -40, 0, 0, Math.PI / 2);
  g.add(truss);
  const HALF = 0.085; // beam half-angle (radians): a narrow stage beam
  const fade = (geo, bright, dim, axis = 'y', lo = -1, hi = 0) => {
    const pos = geo.attributes.position, col = [];
    for (let k = 0; k < pos.count; k++) {
      const v = axis === 'r' ? Math.hypot(pos.getX(k), pos.getY(k)) : pos.getY(k);
      const u = (v - lo) / (hi - lo); // 0 at lo … 1 at hi
      const a = dim + (bright - dim) * Math.max(0, Math.min(1, axis === 'r' ? 1 - u : u)) ** 1.4;
      col.push(a, a, a);
    }
    geo.setAttribute('color', new Float32BufferAttribute(col, 3));
    return geo;
  };
  const coneGeo = fade(new ConeGeometry(1, 1, 32, 6, true).translate(0, -0.5, 0), 1, 0.12); // apex at 0, base at y = -1
  const poolGeo = fade(new CircleGeometry(1, 40), 0.9, 0, 'r', 0, 1);
  const DOWN = new Vector3(0, -1, 0);
  const beams = ['#ff2d6f', '#2d7bff', '#ffd23f'].map((c, i) => {
    const src = new Vector3((i - 1) * 230, 462, -40);
    const head = new Group();
    head.add(at(mesh(new CylinderGeometry(11, 14, 26, 16), M('#24222b', { metal: 0.5, rough: 0.4 })), 0, -10, 0));
    head.add(at(mesh(new CircleGeometry(10, 20), new MeshBasicMaterial({ color: c })), 0, -23.2, 0, Math.PI / 2, 0, 0));
    head.position.copy(src);
    g.add(head);
    const beam = new Mesh(coneGeo, new MeshBasicMaterial({ color: c, vertexColors: true, transparent: true, opacity: 0.2, blending: AdditiveBlending, depthWrite: false }));
    beam.position.copy(src);
    const pool = new Mesh(poolGeo, new MeshBasicMaterial({ color: c, vertexColors: true, transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false }));
    pool.rotation.x = -Math.PI / 2;
    const spot = new SpotLight(c, 3, 0, HALF * 1.4, 0.5, 0);
    spot.position.copy(src);
    g.add(beam, pool, spot, spot.target);
    return { src, head, beam, pool, spot, phase: i * 2.1 };
  });
  const aim = new Vector3(), dir = new Vector3();
  const cols = ['#ff3ea5', '#2dd4ff', '#ffd23f', '#8f5bff', '#3dff8a'];
  return {
    group: g,
    update: (t) => {
      ball.rotation.y = t * 0.8;
      red.position.set(Math.sin(t * 1.3) * 250, 200, 120 + Math.cos(t) * 60);
      blue.position.set(Math.cos(t * 1.1) * 250, 180, 80 + Math.sin(t * 0.9) * 60);
      for (const b of beams) {
        // sweep a landing point around the dance floor
        aim.set(Math.sin(t * 0.55 + b.phase) * 160, 0, -10 + Math.cos(t * 0.43 + b.phase * 1.3) * 90);
        dir.subVectors(aim, b.src);
        const len = dir.length();
        dir.multiplyScalar(1 / len);
        const r = len * Math.tan(HALF);
        b.beam.quaternion.setFromUnitVectors(DOWN, dir);
        b.beam.scale.set(r, len, r);
        b.head.quaternion.copy(b.beam.quaternion);
        // the pool: a circle stretched along the beam's slant where it meets the floor
        const cosI = Math.max(0.35, -dir.y);
        b.pool.position.set(aim.x, 1.9, aim.z);
        b.pool.rotation.set(-Math.PI / 2, 0, -Math.atan2(dir.z, dir.x));
        b.pool.scale.set(r / cosI, r, 1);
        b.spot.target.position.copy(aim);
      }
      const beat = Math.floor(t * 2.2);
      tiles.forEach((tl, k) => {
        const on = mulberry(k * 31 + beat)() > 0.55;
        tl.material.emissive.set(cols[(k + beat) % cols.length]);
        tl.material.emissiveIntensity = on ? 1.2 : 0.08;
      });
    },
    env: {
      bg: '#0d0a1c', fog: ['#0d0a1c', 700, 1600], hemi: ['#7a68c9', '#1a1030', 0.8], ambient: 0.12, mat: '#2a2340', noMat: true,
      key: { color: '#ffffff', i: 2.4, pos: [-120, 380, 300] }, rim: { color: '#ff3ea5', i: 2.6 }, fill: { color: '#2d7bff', i: 1.6 },
      cam: { az: 0.72, el: 0.2, fov: 32, move: 'orbit' }, dof: { aperture: 1, maxblur: 0.008 },
      grade: { vignette: 0.42, grain: 0.05, sat: 1.25, contrast: 1.08, tint: [1, 0.98, 1.05] },
    },
  };
};

// Fern: mossy clearing, pines, mushrooms, drifting clouds and a curious fox
SETS.forest = (ctx) => {
  const g = new Group();
  g.add(cyclorama('#8fc9ea', { r: 220, back: -120 }));
  g.add(at(mesh(lumpify(new CylinderGeometry(520, 540, 10, 64, 2), 2, 0.03, 91), M('#5f9a3c', { felt: true })), 0, -2, 40));
  const pine = (x, z, s) => {
    const p = new Group();
    p.add(at(mesh(capsule(6, 40, 92, 0.6), M('#6b4423', { tex: 'wood', bump: 2 })), 0, 20, 0));
    for (let i = 0; i < 4; i++) p.add(at(mesh(lumpify(new ConeGeometry(42 - i * 8, 50, 16, 2), 1.2, 0.08, 93 + i), M(i % 2 ? '#2f6b3f' : '#3a7d48', { felt: true })), 0, 55 + i * 26, 0));
    return at(p, x, 0, z, 0, x, 0, s);
  };
  [[ctx.left - 140, -170, 1.3], [ctx.left - 260, -110, 1], [ctx.right + 150, -190, 1.5], [ctx.right + 270, -90, 1.05], [ctx.left - 210, 140, 1.4]].forEach((p) => g.add(pine(...p)));
  const shroom = (x, z, s) => {
    const m = new Group();
    m.add(at(mesh(capsule(3.5, 10, 94, 0.3), M('#f5ecd9')), 0, 7, 0));
    m.add(at(mesh(lumpify(new SphereGeometry(10, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), 0.3, 0.2, 95), M('#e04a3a', { gloss: 0.3 })), 0, 13, 0));
    for (let i = 0; i < 5; i++) m.add(at(mesh(sphere(1.6, 96, 0), M('#fff')), Math.sin(i * 2.4) * 6, 20 - (i % 2) * 2, Math.cos(i * 2.4) * 6));
    return at(m, x, 0, z, 0, 0, 0, s);
  };
  g.add(shroom(ctx.right + 70, -40, 1.2), shroom(ctx.right + 95, -20, 0.8), shroom(ctx.left - 70, 60, 1));
  g.add(at(mesh(capsule(14, 90, 97, 1.2), M('#7a5230', { tex: 'wood', bump: 2 })), ctx.right + 40, 13, -120, 0, 0.6, Math.PI / 2));
  const clouds = [];
  for (let i = 0; i < 4; i++) {
    const c = new Group();
    for (let k = 0; k < 5; k++) c.add(at(mesh(sphere(18 + (k % 3) * 8, 98 + k, 1), M('#ffffff', { rough: 0.9 }), { cast: false }), k * 22 - 44, (k % 2) * 8, 0));
    c.userData.y = 330 + i * 60;
    c.userData.x0 = -500 + i * 330;
    clouds.push(c);
    g.add(at(c, 0, c.userData.y, -340 - i * 20));
  }
  const fox = makePet('fox');
  g.add(fox);
  return {
    group: g,
    update: (t) => {
      clouds.forEach((c, i) => { c.position.x = ((c.userData.x0 + t * (8 + i * 2) + 700) % 1400) - 700; });
      petUpdate(fox, t + 7, { z: -95, x0: ctx.left - 360, sitAt: ctx.right + 60, x1: 400 });
    },
    env: {
      bg: '#8fc9ea', fog: ['#a9d6ee', 700, 2200], hemi: ['#d9f0ff', '#4d6b2a', 1.1], ambient: 0.1, mat: '#c9a66b',
      key: { color: '#ffe8b8', i: 2.9, pos: [-220, 360, 180] }, rim: { color: '#ffe6a8', i: 1.2 }, fill: { color: '#bfe6ff', i: 0.5 },
      cam: { az: 0.52, el: 0.12, fov: 30, move: 'orbit' }, dof: { aperture: 1.6, maxblur: 0.01 },
      grade: { vignette: 0.3, grain: 0.04, sat: 1.12, contrast: 1.02, tint: [1, 1.02, 0.97] },
    },
  };
};

// Merlin: brick tower, moonlit window, bookshelf, skull, flickering candles, glowing crystal ball
SETS.tower = (ctx) => {
  const g = new Group();
  g.add(at(mesh(new PlaneGeometry(2400, 1400), texMat(tileTex('#7d7a86', '#4e4b55', 6), { roughness: 0.9 })), 0, 0, 0, -Math.PI / 2));
  g.children[0].receiveShadow = true;
  g.add(at(mesh(new PlaneGeometry(2600, 1400), texMat(brickTex(), { roughness: 0.95 }), { cast: false }), 0, 600, -230));
  // arched window with the moon
  const win = new Group();
  win.add(at(mesh(new PlaneGeometry(110, 150), new MeshBasicMaterial({ color: '#1c2a6b' })), 0, 0, 0));
  win.add(at(mesh(new CircleGeometry(26, 32), new MeshBasicMaterial({ color: '#f4f1d9' })), 18, 30, 1));
  win.add(at(mesh(roundedBox(124, 12, 14, 3), M('#4a3a2e', { tex: 'wood', bump: 1.5 })), 0, -78, 6));
  win.add(at(mesh(roundedBox(10, 150, 14, 3), M('#4a3a2e', { tex: 'wood', bump: 1.5 })), 0, 0, 6));
  g.add(at(win, ctx.right + 40, 260, -222));
  // bookshelf
  const shelf = new Group();
  shelf.add(at(mesh(roundedBox(120, 200, 40, 4), M('#5a3c27', { tex: 'wood', bump: 1.5 })), 0, 100, 0));
  const bcols = ['#c0392b', '#2e86c1', '#f1c40f', '#27ae60', '#8e44ad', '#d35400', '#16a085'];
  for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) shelf.add(at(mesh(roundedBox(14, 40 + (i * 7 % 13), 26, 2, 100 + i), M(bcols[(i + r) % 7])), -42 + i * 17, 30 + r * 60 + (20 + (i * 7 % 13)) / 2 - 18, 10, 0, 0, i === 4 ? 0.2 : 0));
  g.add(at(shelf, ctx.left - 150, 0, -170));
  // skull
  const skull = new Group();
  skull.add(at(mesh(sphere(13, 101, 0.6), M('#efe6d0')), 0, 14, 0));
  skull.add(at(mesh(roundedBox(14, 8, 14, 3), M('#efe6d0')), 4, 3, 0));
  for (const z of [5, -5]) skull.add(at(mesh(sphere(3.8, 102, 0), plain('#1a1414')), 11, 16, z));
  g.add(at(skull, ctx.right + 100, 0, -60, 0, -0.6, 0));
  // candles
  const flames = [], lights = [];
  [[ctx.left - 50, -100, 34], [ctx.left - 30, -120, 24], [ctx.right + 150, -130, 40]].forEach(([x, z, h], i) => {
    g.add(at(mesh(capsule(5, h, 103 + i, 0.6), M('#f6ecd2')), x, h / 2 + 5, z));
    const f = at(mesh(sphere(3.5, 104, 0), new MeshBasicMaterial({ color: '#ffb347' })), x, h + 13, z, 0, 0, 0, [1, 1.8, 1]);
    flames.push(f);
    g.add(f);
    const L = new PointLight('#ff9a3c', 1.4, 400, 1.2);
    L.position.set(x, h + 20, z);
    lights.push(L);
    g.add(L);
  });
  // crystal ball
  const orb = new Mesh(new SphereGeometry(16, 32, 24), new MeshStandardMaterial({ color: '#b48cff', emissive: new Color('#8a4bff'), emissiveIntensity: 0.8, roughness: 0.05, transparent: true, opacity: 0.85 }));
  orb.position.set(ctx.left - 80, 26, 30);
  g.add(orb, at(mesh(lumpify(new CylinderGeometry(8, 13, 10, 18), 0.3, 0.1, 105), M('#6b4a2e', { tex: 'wood', bump: 1.5 })), ctx.left - 80, 5, 30));
  const orbLight = new PointLight('#9b6bff', 1.2, 300, 1.4);
  orbLight.position.copy(orb.position);
  g.add(orbLight);
  return {
    group: g,
    update: (t) => {
      flames.forEach((f, i) => { const k = 0.85 + Math.sin(t * 13 + i * 5) * 0.08 + Math.sin(t * 29 + i) * 0.07; f.scale.set(k, 1.8 * k, k); lights[i].intensity = 1.4 * k; });
      orb.material.emissiveIntensity = 0.6 + Math.sin(t * 2) * 0.35;
      orbLight.intensity = 1 + Math.sin(t * 2) * 0.5;
    },
    env: {
      bg: '#1b1426', fog: ['#1b1426', 500, 1300], hemi: ['#6a6aa8', '#2a1c14', 0.7], ambient: 0.1, mat: '#8a2f3b',
      key: { color: '#ffc58a', i: 2.6, pos: [-200, 260, 220] }, rim: { color: '#7d9cff', i: 1.8 }, fill: { color: '#ff9a3c', i: 0.5 },
      cam: { az: 0.55, el: 0.15, fov: 30, move: 'orbit' }, dof: { aperture: 1.4, maxblur: 0.01 },
      grade: { vignette: 0.5, grain: 0.06, sat: 1.05, contrast: 1.08, tint: [1.06, 0.98, 0.94] },
    },
  };
};

// Chef Bao: kitchen countertop, tiled backsplash, mint cabinets, pans and a cat
SETS.kitchen = (ctx) => {
  const g = new Group();
  g.add(at(mesh(new PlaneGeometry(2400, 1400), plain('#e9e6e0', { roughness: 0.35 })), 0, 0, 0, -Math.PI / 2));
  g.children[0].receiveShadow = true;
  g.add(at(mesh(new PlaneGeometry(2600, 1400), texMat(tileTex('#f6f5f0', '#c8c4bb', 10), { roughness: 0.3 }), { cast: false }), 0, 600, -200));
  g.children[g.children.length - 1].material.map.repeat.set(6, 3);
  g.add(at(mesh(roundedBox(2600, 140, 70, 6), M('#7cc6a4')), 0, 420, -165));
  for (let i = -6; i <= 6; i++) g.add(at(mesh(capsule(2.5, 18, 106, 0.1), M('#d9d9d9', { metal: 0.7, rough: 0.3 })), i * 150 + 60, 365, -128, 0, 0, Math.PI / 2));
  g.add(at(mesh(roundedBox(170, 120, 300, 4), texMat(woodTex('#d7a36a'))), 0, -2, 0, 0, 0, 0, [Math.max(1, ctx.width / 150), 0.05, 0.5]));
  // grater, dish soap, eggs, pan
  const grater = new Group();
  grater.add(at(mesh(new CylinderGeometry(18, 30, 90, 4, 1, true), M('#cfd3d8', { metal: 0.9, rough: 0.35, bump: 6 })), 0, 45, 0, 0, Math.PI / 4, 0));
  grater.add(at(mesh(new TorusGeometry(10, 3, 8, 16), M('#222')), 0, 98, 0));
  g.add(at(grater, ctx.left - 120, 0, -120));
  const soap = new Group();
  soap.add(at(mesh(capsule(16, 50, 107, 0.2), new MeshStandardMaterial({ color: '#5fd068', roughness: 0.1, transparent: true, opacity: 0.75 })), 0, 40, 0));
  soap.add(at(mesh(new CylinderGeometry(5, 7, 16, 12), M('#ffffff')), 0, 90, 0));
  g.add(at(soap, ctx.right + 100, 0, -140));
  [[ctx.right + 40, -60], [ctx.right + 58, -48], [ctx.right + 30, -40]].forEach(([x, z], i) => g.add(at(mesh(sphere(7, 108 + i, 0.2), M('#f7efe2')), x, 6, z, 0, 0, 0, [1, 1.3, 1])));
  const pan = new Group();
  pan.add(at(mesh(lumpify(new CylinderGeometry(30, 26, 8, 28), 0.3, 0.1, 109), M('#2b2b2b', { gloss: 0.6, tex: 'rubber', bump: 1.2 })), 0, 4, 0));
  pan.add(at(mesh(capsule(3.5, 40, 110, 0.2), M('#2b2b2b')), 50, 6, 0, 0, 0, Math.PI / 2));
  pan.add(at(mesh(sphere(9, 111, 0.4), M('#ffd23f')), 0, 9, 0, 0, 0, 0, [1, 0.4, 1]));
  pan.add(at(mesh(sphere(18, 112, 0.4), M('#ffffff')), 0, 8.5, 0, 0, 0, 0, [1, 0.2, 1]));
  g.add(at(pan, ctx.left - 40, 0, 150, 0, 0.6, 0));
  const cat = makePet('cat');
  g.add(cat);
  return {
    group: g,
    update: (t) => petUpdate(cat, t + 3, { z: -85, x0: ctx.right + 300, sitAt: ctx.right + 70, x1: -400 }),
    env: {
      bg: '#f6f5f0', fog: ['#f6f5f0', 900, 2400], hemi: ['#ffffff', '#a59b8a', 1.15], ambient: 0.2, mat: '#d7a36a',
      key: { color: '#fff6e8', i: 2.5, pos: [220, 360, 200] }, rim: { color: '#d0f0ff', i: 1 }, fill: { color: '#fff1d6', i: 0.6 },
      cam: { az: 0.42, el: 0.24, fov: 30, move: 'dolly' }, dof: { aperture: 1.1, maxblur: 0.008 },
      grade: { vignette: 0.2, grain: 0.035, sat: 1.06, contrast: 1.02, tint: [1.02, 1.01, 0.98] },
    },
  };
};



export const SET_IDS = Object.keys(SETS);

// ctx: { left, right, width } — the actor's extent, so decor is placed around them
export function buildSet(id, ctx) {
  return (SETS[id] || SETS.studio)(ctx);
}
