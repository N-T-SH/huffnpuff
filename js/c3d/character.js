// SuperSweatClub 3D — soft clay characters (see js/cast.js for the cast).
// Built like a real plasticine puppet: one sculpted, bendable body; noodle limbs that
// curve through elbows and knees; mitten hands; squash & stretch; a head that lags a
// beat behind; and a surface that "boils" a little on every frame.
import {
  Group, Vector3, BufferGeometry, BufferAttribute, Color, Mesh, CatmullRomCurve3,
  SphereGeometry, TorusGeometry, CylinderGeometry, DoubleSide,
} from '../vendor/three.js';
import { clay, capsule, sphere, mesh, placeSeg, lumpify, at, Y, vnoise, fabricize } from './kit.js';
import { JOINT_R } from '../clay.js';
import { Hand } from './hands.js';
import { faceFor, mixFace, FACE_KEYS } from './faces.js';

// torso profile: [t along spine, radius factor] (bottom → top)
const PROFILES = {
  human: [[0, 0], [0.05, 0.62], [0.14, 0.92], [0.26, 1], [0.42, 0.9], [0.62, 0.96], [0.78, 1.02], [0.9, 0.86], [0.97, 0.5], [1, 0]],
  doll: [[0, 0], [0.05, 0.6], [0.15, 0.95], [0.27, 1], [0.45, 0.78], [0.66, 0.9], [0.8, 0.92], [0.91, 0.72], [0.97, 0.42], [1, 0]],
  chunky: [[0, 0], [0.05, 0.66], [0.15, 0.96], [0.32, 1.08], [0.5, 1.1], [0.68, 1], [0.82, 0.92], [0.92, 0.72], [0.98, 0.38], [1, 0]],
  // Bruno: one pear-shaped bean from bum to the top of his head
  bean: [[0, 0], [0.04, 0.66], [0.12, 0.94], [0.26, 1.02], [0.44, 0.98], [0.6, 0.9], [0.74, 0.8], [0.86, 0.72], [0.94, 0.56], [0.985, 0.3], [1, 0]],
};

const BODIES = {
  human: { torsoR: 17, torsoZ: 1.22, headR: 19, neckR: 6.5, upper: 7.8, fore: 6.8, hand: 8.6, thigh: 10.4, shin: 8.6, foot: 7.4, zs: 19, zh: 9.5, below: 13, profile: 'human' },
  doll: { torsoR: 13.5, torsoZ: 1.25, headR: 18, neckR: 5, upper: 6, fore: 5.4, hand: 7, thigh: 8.6, shin: 7.2, foot: 6.4, zs: 16, zh: 8, below: 12, profile: 'doll' },
  chunky: { torsoR: 21, torsoZ: 1.2, headR: 19.5, neckR: 7.5, upper: 9, fore: 8, hand: 9.4, thigh: 11.6, shin: 10, foot: 8.4, zs: 24, zh: 11, below: 14, profile: 'chunky', legScale: 0.86 },
  bean: { torsoR: 29, torsoZ: 1.2, headR: 22, neckR: 0, upper: 9.4, fore: 8.6, hand: 9.2, thigh: 12.6, shin: 11.6, foot: 9.5, zs: 30, zh: 12, below: 15, profile: 'bean', bean: true, legScale: 0.58 },
};

const tB = new Vector3(), tC = new Vector3(), tD = new Vector3();
// scratch vectors private to the mesh builders (pose() keeps its own)
const nP = new Vector3(), nT = new Vector3(), nN = new Vector3(), nB = new Vector3();
const Z = new Vector3(0, 0, 1);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function profileAt(prof, t) {
  for (let i = 1; i < prof.length; i++) {
    if (t <= prof[i][0]) {
      const [t0, r0] = prof[i - 1], [t1, r1] = prof[i];
      const u = (t - t0) / (t1 - t0 || 1);
      const s = u * u * (3 - 2 * u);
      return r0 + (r1 - r0) * s;
    }
  }
  return 0;
}

/* ---------- a deformable tube ("noodle") with per-vertex colour ---------- */
class Noodle {
  constructor(mat, tub = 18, rad = 12, { open = false } = {}) {
    this.tub = tub; this.rad = rad;
    const n = (tub + 1) * (rad + 1);
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('normal', new BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('color', new BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('cloth', new BufferAttribute(new Float32Array(n), 1));
    const idx = [];
    for (let i = 0; i < tub; i++) for (let j = 0; j < rad; j++) {
      const a = i * (rad + 1) + j, b = a + rad + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    g.setIndex(idx);
    this.geo = g;
    this.mesh = new Mesh(g, mat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    if (open) mat.side = DoubleSide;
  }
  // curve: CatmullRom through the limb joints; rFn(u) radius; cFn(u) → Color
  update(curve, u0, u1, rFn, cFn, seed, boil) {
    const { tub, rad } = this;
    const P = this.geo.attributes.position.array, N = this.geo.attributes.normal.array, C = this.geo.attributes.color.array, F = this.geo.attributes.cloth.array;
    let k = 0;
    for (let i = 0; i <= tub; i++) {
      const u = u0 + ((u1 - u0) * i) / tub;
      curve.getPointAt(u, nP);
      curve.getTangentAt(u, nT);
      // ring frame: perpendicular to the tangent, referenced to Z (or Y when the limb points sideways)
      if (Math.abs(nT.z) < 0.9) nN.set(nT.y, -nT.x, 0); else nN.set(0, nT.z, -nT.y);
      nN.normalize();
      nB.crossVectors(nN, nT);
      const r = rFn(u);
      const col = cFn(u);
      for (let j = 0; j <= rad; j++) {
        const th = (j / rad) * Math.PI * 2;
        const c = Math.cos(th), s = Math.sin(th);
        const wob = 1 + boil * 0.03 * vnoise(u * 3.1 + seed * 7.3 + s * 0.9, c * 0.9, seed * 1.7); // periodic round the tube: no seam
        const rr = r * wob;
        const nx = nN.x * c + nB.x * s, ny = nN.y * c + nB.y * s, nz = nN.z * c + nB.z * s;
        P[k] = nP.x + nx * rr; P[k + 1] = nP.y + ny * rr; P[k + 2] = nP.z + nz * rr;
        N[k] = nx; N[k + 1] = ny; N[k + 2] = nz;
        C[k] = col.r; C[k + 1] = col.g; C[k + 2] = col.b;
        F[k / 3] = col.cloth || 0;
        k += 3;
      }
    }
    this.geo.attributes.cloth.needsUpdate = true;
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.normal.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
    this.geo.computeBoundingSphere();
  }
}

/* ---------- the sculpted, bendable torso (a lathe that follows a curved spine) ---------- */
class Torso {
  constructor(mat, rings = 30, seg = 26) {
    this.rings = rings; this.seg = seg;
    const n = (rings + 1) * (seg + 1);
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('normal', new BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('color', new BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('cloth', new BufferAttribute(new Float32Array(n), 1));
    const idx = [];
    for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) {
      const a = i * (seg + 1) + j, b = a + seg + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    g.setIndex(idx);
    this.geo = g;
    this.mesh = new Mesh(g, mat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
  }
  // spine(t, out) → point; tangent(t, out); rFn(t); colFn(t, theta); belly(t) front bulge
  update(spine, tangent, rFn, cFn, depth, belly, seed, boil) {
    const { rings, seg } = this;
    const P = this.geo.attributes.position.array, C = this.geo.attributes.color.array, F = this.geo.attributes.cloth.array;
    let k = 0;
    for (let i = 0; i <= rings; i++) {
      const t = i / rings;
      spine(t, nP);
      tangent(t, nT);
      nN.set(nT.y, -nT.x, 0).normalize(); // facing direction
      const r = rFn(t);
      for (let j = 0; j <= seg; j++) {
        const th = (j / seg) * Math.PI * 2;
        const c = Math.cos(th), s = Math.sin(th);
        const front = c > 0 ? 1 + belly(t) * c * c : 1;
        const wob = 1 + boil * 0.018 * vnoise(t * 5 + seed * 3.1 + s * 1.3, c * 1.3, seed); // periodic: no seam
        const rr = r * wob;
        P[k] = nP.x + nN.x * c * rr * front;
        P[k + 1] = nP.y + nN.y * c * rr * front;
        P[k + 2] = nP.z + s * rr * depth;
        const col = cFn(t, th);
        C[k] = col.r; C[k + 1] = col.g; C[k + 2] = col.b;
        F[k / 3] = col.cloth || 0;
        k += 3;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
    this.geo.attributes.cloth.needsUpdate = true;
    this.geo.computeVertexNormals();
    // the lathe's first and last columns are the same place: share their normals so no seam shows
    const N = this.geo.attributes.normal.array;
    for (let i = 0; i <= rings; i++) {
      const a = i * (seg + 1) * 3, z = (i * (seg + 1) + seg) * 3;
      for (let k = 0; k < 3; k++) { const m = (N[a + k] + N[z + k]) / 2; N[a + k] = m; N[z + k] = m; }
    }
    this.geo.computeBoundingSphere();
  }
}

export class Character {
  constructor(spec, colors) {
    this.spec = spec;
    this.b = BODIES[spec.body] || BODIES.human;
    this.group = new Group();
    // everything sculpted lives in .body, which slides up/down so the real clay surface meets the floor
    this.body = new Group();
    this.group.add(this.body);
    this.c = colors || spec.colors;
    const unique = true; // colours can change live (the user's own character)
    const mk = (col, o = {}) => clay(col, { ...o, unique });
    const c = this.c;
    this.M = {
      skin: mk(c.skin), top: mk(c.top), bottom: mk(c.bottom), shoes: mk(c.shoes, { gloss: 0.12, tex: spec.feet === 'sneakers' ? 'weave' : undefined, bump: spec.feet === 'sneakers' ? 1.6 : 3 }), hair: mk(c.hair, { rough: 0.72 }),
      accent: mk(c.accent), sole: clay('#fbf6ef'), eye: clay('#fffdf8', { rough: 0.25, bump: 0.2, sheen: 0 }),
      pupil: clay('#160f1d', { rough: 0.12, bump: 0, sheen: 0, gloss: 0.8 }), mouth: clay('#5a1e22', { bump: 0.3 }), tongue: clay('#e8606a', { bump: 0.4 }),
      cheek: clay('#ff8f8f', { rough: 0.8 }), felt: mk(c.accent, { felt: true }), gold: clay('#e8b53c', { rough: 0.3, metal: 0.6, gloss: 0.6, bump: 0.5 }),
      shade: clay('#141414', { rough: 0.1, gloss: 1, bump: 0, sheen: 0 }), white: clay('#f8f5ef'),
      body: clay('#ffffff', { unique: true, vc: true }),
    };
    this.M.body.vertexColors = true;
    fabricize(this.M.body);
    this.cols = {};
    this.setColors(c, false);
    this.build();
  }

  setColors(c, live = true) {
    this.c = c;
    for (const k of ['skin', 'top', 'bottom', 'shoes', 'hair', 'accent']) {
      this.cols[k] = new Color(c[k]);
      this.cols[k].cloth = k === 'skin' ? 0 : 1; // drives the fabric weave on the body shader
      if (live || this.M[k]) this.M[k]?.color.set(c[k]);
    }
    this.M.felt?.color.set(c.accent);
    this.M.robe?.color.set(c.top);
  }

  add(m, parent = this.body) { parent.add(m); return m; }

  build() {
    const { b, spec, M } = this;
    this.torso = new Torso(M.body);
    this.add(this.torso.mesh);
    this.limbs = {};
    for (const s of ['r', 'l']) {
      this.limbs[s + 'Arm'] = new Noodle(M.body, 22, 14);
      this.limbs[s + 'Leg'] = new Noodle(M.body, 22, 14);
      this.add(this.limbs[s + 'Arm'].mesh);
      this.add(this.limbs[s + 'Leg'].mesh);
      if (spec.extras?.includes('legwarmers')) { this.limbs[s + 'Warm'] = new Noodle(M.felt, 10, 12); this.add(this.limbs[s + 'Warm'].mesh); }
    }
    if (b.neckR) { this.neck = new Noodle(M.body, 6, 12); this.add(this.neck.mesh); }
    // hands: palm, fingers and thumb in each character's own style (js/c3d/hands.js)
    this.hands = {};
    this.handObj = {};
    for (const s of ['r', 'l']) {
      const h = new Hand(spec, b.hand * 2, { skin: M.skin, accent: M.accent, gold: M.gold, glove: M.accent }, s, b.fore);
      this.handObj[s] = h;
      this.hands[s] = this.add(h.group);
    }
    // feet: rounded clay wedges (shoes or bare)
    this.feet = {};
    for (const s of ['r', 'l']) {
      const f = new Group();
      const shod = spec.feet === 'sneakers' || spec.feet === 'boots';
      f.add(at(mesh(sphere(b.foot, 20, 0.7), shod ? M.shoes : M.skin), 0, 0, 0, 0, 0, 0, [shod ? 1.75 : 1.6, shod ? 0.88 : 0.78, shod ? 1.08 : 1]));
      if (shod) f.add(at(mesh(sphere(b.foot * 0.98, 22, 0.25), M.sole), 0, -b.foot * 0.45, 0, 0, 0, 0, [1.82, 0.38, 1.12]));
      if (spec.feet === 'sneakers') f.add(at(mesh(capsule(1.1, b.foot * 0.9, 23, 0.1), M.white), b.foot * 0.35, b.foot * 0.62, 0, Math.PI / 2, 0, 0.2));
      this.feet[s] = this.add(f);
    }
    // costume extras
    const P = (this.p = {});
    if (spec.top === 'robe') {
      P.skirt = this.add(mesh(lumpify(new CylinderGeometry(b.torsoR * 1.05, b.torsoR * 1.55, 44, 26, 5, true), 1.2, 0.07, 40), M.robe = clay(this.c.top, { unique: true, tex: 'weave', bump: 1.8 })));
      P.skirt.material.side = DoubleSide;
      P.hem = this.add(mesh(lumpify(new TorusGeometry(b.torsoR * 1.53, 2.4, 10, 40), 0.4, 0.2, 41), M.accent));
    }
    if (spec.extras?.includes('belt')) P.belt = this.add(mesh(lumpify(new TorusGeometry(1, 0.16, 10, 36), 0.02, 2, 43), M.accent));
    if (spec.extras?.includes('chain')) P.chain = this.add(mesh(new TorusGeometry(b.torsoR * 0.66, 1.4, 8, 32), M.gold));
    if (spec.extras?.includes('wristbands')) for (const s of ['r', 'l']) P[s + 'Wrist'] = this.add(mesh(lumpify(new TorusGeometry(b.fore + 0.6, 2.2, 10, 24), 0.3, 0.2, 44), M.accent));
    this.head = this.buildHead();
    this.body.add(this.head);
  }

  buildHead() {
    const { spec, M, b } = this;
    const h = new Group();
    const inner = new Group();
    this.headInner = inner;
    inner.scale.setScalar(b.headR / 18);
    h.add(inner);
    const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = null) => at(this.add(mesh(geo, mat), inner), x, y, z, rx, ry, rz, s);
    if (!b.bean) add(sphere(18, 30, 0.6), M.skin, 0, 0, 0, 0, 0, 0, [1.02, 1.03, 0.98]);
    const fx = b.bean ? 1.5 : 0; // the bean's face sits on a flatter front
    // eyes
    this.eyes = [];
    this.brows = [];
    this.cheeks = [];
    const eyes = spec.eyes || 'big';
    const arc = new TorusGeometry(eyes === 'beady' ? 2.4 : 3.3, 0.78, 6, 14, Math.PI);
    for (const z of [7.4, -7.4]) {
      const sg = Math.sign(z);
      const ey = { sg };
      if (eyes === 'beady') {
        ey.pupil = add(sphere(2.6, 36, 0.02), M.pupil, 16.4 + fx, 4, z * 0.9, 0, 0, 0, [0.7, 1.2, 1]);
        ey.at = [17.4 + fx, 4, z * 0.9];
      } else {
        ey.white = add(sphere(4.4, 35, 0.05), M.eye, 14.8, 3.8, z, 0, 0, 0, [0.62, 1.15, 1]);
        ey.pupil = add(sphere(2.6, 36, 0.02), M.pupil, 17.4, 3.6, z * 1.03, 0, 0, 0, [0.6, 1.1, 1]);
        ey.at = [17.6, 3.8, z];
        if (eyes === 'lashes') ey.lashes = [0, 1, 2].map((k) => add(capsule(0.55, 3, 37, 0), M.pupil, 15.4 - k * 0.5, 8.4 + k * 0.4, z + sg * (k * 2.2 - 1), 0, 0, 0.5 + k * 0.25));
      }
      // closed eyes: ^ when beaming, ‿ when relaxed or asleep
      ey.happy = add(arc, M.pupil, ...ey.at, 0, Math.PI / 2, 0);
      ey.shut = add(arc, M.pupil, ey.at[0], ey.at[1] + 1, ey.at[2], 0, Math.PI / 2, Math.PI);
      ey.pupil.userData.p0 = ey.pupil.position.clone();
      ey.pupil.userData.s0 = ey.pupil.scale.clone();
      if (ey.white) ey.white.userData.s0 = ey.white.scale.clone();
      this.eyes.push(ey);
      const brow = new Group();
      at(brow, 15.2 + fx, eyes === 'beady' ? 8.6 : 10.2, z);
      brow.add(at(mesh(capsule(1.15, 5, 37, 0.1), spec.hair === 'bald' || spec.hair === 'none' ? M.mouth : M.hair), 0, 0, 0, Math.PI / 2, 0, 0));
      brow.userData.sg = sg;
      brow.userData.y0 = brow.position.y;
      inner.add(brow);
      this.brows.push(brow);
      // cheeks: a blush that deepens (and puffs out when holding a breath)
      const ck = add(sphere(3.3, 38, 0.1), eyes === 'beady' ? M.skin : M.cheek, 13.6, -3.8, z * 1.45, 0, 0, 0, [0.45, 0.85, 1]);
      ck.userData.s0 = ck.scale.clone(); ck.userData.p0 = ck.position.clone(); ck.userData.sg = sg;
      ck.visible = eyes !== 'beady';
      this.cheeks.push(ck);
      if (spec.ears !== false && !b.bean) add(sphere(4.4, 39, 0.4), M.skin, -1, 0, sg * 17.4, 0, 0, 0, [0.62, 1, 0.5]);
    }
    if (spec.nose !== 'none') add(sphere(spec.body === 'chunky' ? 5.4 : 4.6, 40, 0.35), M.skin, 18.6, -1.2, 0, 0, 0, 0, [1, 0.9, 1.05]);
    // mouths: a curve (smile ↔ frown, with a smirk), a flat line, or open (talking, laughing, panting,
    // straining — with teeth and tongue as the face needs)
    // below a moustache, or out on the front of a beard, so it always shows
    // (the bean's body bulges forward below the face: bring the mouth out onto it)
    const my = b.bean ? -4.5 : spec.facial === 'mustache' ? -4.5 : spec.facial === 'beard' ? -3 : 0;
    const mx = b.bean ? 4.2 : spec.facial === 'mustache' ? -0.6 : spec.facial === 'beard' ? 5.4 : 0;
    this.smile = add(new TorusGeometry(3.6, 0.95, 8, 16, Math.PI), M.mouth, 16.6 + fx + mx, -6.6 + my, 0, Math.PI, Math.PI / 2, 0);
    this.smile.userData.p0 = this.smile.position.clone();
    this.line = add(capsule(0.9, 5.2, 44, 0.05), M.mouth, 17.4 + fx + mx, -6.4 + my, 0, Math.PI / 2, 0, 0);
    const strain = new Group();
    at(strain, 16 + fx + mx, -8 + my, 0);
    strain.userData.y0 = strain.position.y;
    this.mouthHole = strain.add(at(mesh(sphere(5.6, 41, 0.2), M.mouth), 0, 0, 0, 0, 0, 0, [0.5, 0.75, 1.25])).children[0];
    this.tongue = at(mesh(sphere(3.4, 42, 0.2), M.tongue), 1.2, -2, 0, 0, 0, 0, [0.6, 0.55, 1.1]);
    strain.add(this.tongue);
    this.teeth = at(mesh(capsule(1.5, 6.4, 47, 0.05), M.white), 1.9, 2.4, 0, Math.PI / 2, 0, 0, [1, 1, 0.75]);
    strain.add(this.teeth);
    this.lip = at(mesh(capsule(1.6, 12, 43, 0.2), M.skin), 1.8, 4.4, 0, Math.PI / 2, 0, 0); // upper lip (a grimace)
    strain.add(this.lip);
    inner.add(strain);
    this.strain = strain;
    strain.visible = false;
    this.fc = null; // the face as currently posed (eases toward each new target)
    // facial hair
    if (spec.facial === 'mustache' || spec.facial === 'beard') {
      for (const z of [4, -4]) add(capsule(b.bean ? 3.2 : 2.4, 6.5, 45, 0.25), M.hair, 18.2 + fx, -3.8, z, Math.PI / 2 + Math.sign(z) * 0.5, 0, -0.25);
    }
    if (spec.facial === 'beard') {
      const beard = clay(this.c.hair, { felt: true });
      [[12, -10, 0, 9], [10, -15, 6, 7], [10, -15, -6, 7], [9, -21, 0, 8], [7, -27, 0, 6], [5, -32, 0, 4.5], [13, -11, 9, 6], [13, -11, -9, 6]].forEach(([x, y, z, r], i) => add(sphere(r, 46 + i, 0.7), beard, x, y, z));
    }
    // hair
    const hair = spec.hair || 'cap';
    if (hair === 'cap' || hair === 'silver' || hair === 'bun') {
      add(lumpify(new SphereGeometry(19, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.47), 0.9, 0.16, 31), M.hair, -1.2, 0.8, 0, 0, 0, 0.62);
      if (hair === 'bun') add(sphere(7.5, 48, 0.9), M.hair, -11, 17, 0);
    } else if (hair === 'curly') {
      const rnd = (i) => Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
      for (let i = 0; i < 46; i++) {
        const th = rnd(i) * Math.PI * 2, ph = rnd(i + 99) * 1.9;
        const x = Math.cos(th) * Math.sin(ph) * 21 - 5, y = Math.cos(ph) * 21 + 3, z = Math.sin(th) * Math.sin(ph) * 25;
        if (x > 9 && y < 14) continue;
        add(sphere(6 + rnd(i + 7) * 3, 50 + (i % 6), 1, 16), M.hair, x, y, z);
      }
    } else if (hair === 'afro') {
      add(sphere(25, 49, 1.8, 36), clay(this.c.hair, { felt: true }), -9, 11, 0, 0, 0, 0, [0.92, 1, 1.12]);
    }
    // hats
    const hat = spec.hat;
    if (hat === 'headband') {
      const band = new Group();
      at(band, -0.6, 5.6, 0, 0, 0, 0.28);
      inner.add(band);
      at(this.add(mesh(lumpify(new TorusGeometry(hair === 'curly' ? 20 : 17.6, 2.3, 14, 48), 0.3, 0.2, 32), hair === 'curly' ? M.felt : M.accent), band), 0, 0, 0, Math.PI / 2, 0, 0);
      if (hair !== 'curly') {
        at(this.add(mesh(sphere(3.2, 33), M.accent), band), -18.6, 0, 0);
        for (const [z, rz] of [[2.6, 2.3], [-2.6, 2.6]]) at(this.add(mesh(capsule(1.7, 7, 34, 0.1), M.accent), band), -21.5, -3.6, z, 0, 0, rz);
      }
    } else if (hat === 'wizard') {
      const g = new Group();
      at(g, -3, 12, 0, 0, 0, 0.35);
      inner.add(g);
      at(this.add(mesh(lumpify(new CylinderGeometry(27, 27, 2.5, 32), 0.7, 0.1, 52), M.top), g), 0, 0, 0);
      const cone = lumpify(new CylinderGeometry(1.2, 17, 46, 24, 6), 1, 0.08, 53);
      at(this.add(mesh(cone, M.top), g), -3, 24, 0, 0, 0, 0.18);
      for (let i = 0; i < 6; i++) at(this.add(mesh(sphere(1.8, 54, 0), clay(this.c.accent, { emissive: this.c.accent, ei: 0.6 })), g), -3 + Math.sin(i) * 8, 8 + i * 6, Math.cos(i * 2) * (14 - i * 2));
      at(this.add(mesh(new TorusGeometry(17.5, 1.8, 8, 32), M.accent), g), 0, 3, 0, Math.PI / 2, 0, 0);
      this.hatTip = g;
    } else if (hat === 'chef') {
      const w = clay('#f8f5ef', { tex: 'weave', bump: 1.4, sheen: 0.8 });
      at(this.add(mesh(lumpify(new CylinderGeometry(17.5, 17, 10, 28, 2, true), 0.5, 0.15, 55), w), inner), -1, 12, 0, 0, 0, 0.12);
      [[0, 26, 0, 12], [-8, 24, 8, 9], [-8, 24, -8, 9], [7, 24, 6, 8.5], [7, 24, -6, 8.5], [-11, 21, 0, 9]].forEach(([x, y, z, r], i) => add(sphere(r, 56 + i, 1), w, x - 1, y, z));
    }
    if (spec.eyewear === 'sunglasses') {
      for (const z of [7.4, -7.4]) add(sphere(5.2, 60, 0), M.shade, 17, 4, z, 0, 0, 0, [0.35, 0.8, 1.15]);
      add(capsule(0.8, 4, 61, 0), M.gold, 18.4, 5.2, 0, Math.PI / 2, 0, 0);
    }
    return h;
  }

  // 2D rig points → 3D joints (Y up, floor at 0, Z toward the near side)
  joints(pts, fit, anim = {}) {
    const { zs, zh, legScale = 1 } = this.b;
    const cx = (fit.bbox.x0 + fit.bbox.x1) / 2;
    // z: the body's own depth offset (shoulder / hip width) plus any sideways reach from the rig
    const V = (p, z = 0) => new Vector3(p[0] - cx, fit.G - p[1], z + (p[2] || 0));
    this._pts = pts;
    const J = this.rawJoints(V, zs, zh);
    // upper-body twist: shoulders, arms and head turn together about the spine
    J.tw = pts.tw || 0;
    if (J.tw) {
      const ax = J.neck.clone().sub(J.pelvis).normalize();
      for (const k of ['rShoulder', 'lShoulder', 'rElbow', 'lElbow', 'rHand', 'lHand']) J[k].sub(J.pelvis).applyAxisAngle(ax, -J.tw * Math.PI / 180).add(J.pelvis);
    }
    if (legScale < 1) {
      // stubby legs: shorten thigh & shin, then (when standing on the floor) sink the body so the feet still land
      const low = (j) => Math.min(j.rHeel.y, j.rToe.y, j.lHeel.y, j.lToe.y, j.pelvis.y - 15);
      const before = low(J);
      for (const s of ['r', 'l']) {
        const hip = J[s + 'Hip'], kn = J[s + 'Knee'], an = J[s + 'Ankle'];
        const kn2 = hip.clone().add(kn.clone().sub(hip).multiplyScalar(legScale));
        const an2 = kn2.clone().add(an.clone().sub(kn).multiplyScalar(legScale));
        const d = an2.clone().sub(an);
        J[s + 'Knee'] = kn2; J[s + 'Ankle'] = an2;
        J[s + 'Heel'].add(d); J[s + 'Toe'].add(d);
      }
      if ((anim.anchor || 'floor') === 'floor') {
        const dy = before - low(J);
        for (const k in J) if (J[k].isVector3) J[k].y += dy;
      }
    }
    // standing on the floor: how high the rig's lowest contact sits (0 = touching, >0 = mid-jump)
    if ((anim.anchor || 'floor') === 'floor') {
      let m = -Infinity;
      for (const k in JOINT_R) m = Math.max(m, pts[k][1] + JOINT_R[k]);
      J.lift = Math.max(0, fit.G - m);
    } else J.lift = null;
    return J;
  }

  rawJoints(V, zs, zh) {
    const pts = this._pts;
    return {
      pelvis: V(pts.pelvis), neck: V(pts.neck), head: V(pts.head), shoulder: V(pts.shoulder),
      rShoulder: V(pts.shoulder, zs), lShoulder: V(pts.shoulder, -zs), rElbow: V(pts.rElbow, zs + 1), lElbow: V(pts.lElbow, -zs - 1), rHand: V(pts.rHand, zs), lHand: V(pts.lHand, -zs),
      rHip: V(pts.pelvis, zh), lHip: V(pts.pelvis, -zh), rKnee: V(pts.rKnee, zh + 0.5), lKnee: V(pts.lKnee, -zh - 0.5),
      rAnkle: V(pts.rAnkle, zh + 0.5), lAnkle: V(pts.lAnkle, -zh - 0.5), rHeel: V(pts.rHeel, zh + 1), lHeel: V(pts.lHeel, -zh - 1), rToe: V(pts.rToe, zh + 1.5), lToe: V(pts.lToe, -zh - 1.5),
    };
  }

  // squash: <1 squashed, >1 stretched; lag: secondary-motion offset for the head
  // Crossfade from the last pose into whatever comes next (a new act, the next move), over `dur`
  // seconds of the caller's clock `now` — instead of the puppet snapping between poses.
  startBlend(now, dur = 0.38) {
    if (this.lastJ) this.blend = { from: this.lastJ, t0: now, dur };
  }
  blendJoints(J, now) {
    const bl = this.blend;
    if (!bl) return J;
    const u = now == null ? 1 : (now - bl.t0) / bl.dur;
    if (u >= 1 || u < 0) { this.blend = null; return J; }
    const e = u * u * (3 - 2 * u);
    // keep the feet where they are: line the old pose up on the new one's feet before mixing
    const mid = (j) => j.rHeel.clone().add(j.lHeel).add(j.rToe).add(j.lToe).multiplyScalar(0.25);
    const off = mid(J).sub(mid(bl.from)).setY(0);
    const out = { ...J };
    for (const k in J) if (J[k]?.isVector3 && bl.from[k]) out[k] = bl.from[k].clone().add(off).lerp(J[k], e);
    return out;
  }

  pose(J, { blink = false, effort = 0, squash = 1, lag = null, seed = 0, boil = 0, pinHands = false, now = null, hands = null, face = null, talk = 0 } = {}) {
    const { b, spec, cols } = this;
    J = this.blendJoints(J, now);
    this.lastJ = J;
    this._handIn ??= {};
    this.face ??= new Vector3(1, 0, 0);
    // ---- spine: from the bum to the shoulders (or the top of the head for the bean)
    const u = new Vector3().copy(J.neck).sub(J.pelvis).normalize();
    const uH = new Vector3().copy(J.head).sub(J.neck).normalize();
    const bottom = J.pelvis.clone().addScaledVector(u, -b.below);
    let top, ctrl;
    const s = squash;
    if (b.bean) {
      top = J.head.clone().addScaledVector(uH, b.headR * 0.9);
      ctrl = J.neck.clone();
    } else {
      top = J.neck.clone().addScaledVector(u, 3);
      // bend the spine toward where the head is looking (a soft, curvy back)
      const bend = clamp(u.x * uH.y - u.y * uH.x, -0.6, 0.6);
      ctrl = J.pelvis.clone().lerp(J.neck, 0.55).addScaledVector(new Vector3(u.y, -u.x, 0), -bend * 12);
    }
    // squash & stretch around the pelvis (legs stay planted)
    const pivot = J.pelvis;
    const sq = (v) => v.sub(pivot).multiplyScalar(s).add(pivot);
    sq(top); sq(ctrl);
    const spine = (t, out) => {
      const m = 1 - t;
      return out.set(m * m * bottom.x + 2 * m * t * ctrl.x + t * t * top.x, m * m * bottom.y + 2 * m * t * ctrl.y + t * t * top.y, 0);
    };
    const tangent = (t, out) => out.set(2 * (1 - t) * (ctrl.x - bottom.x) + 2 * t * (top.x - ctrl.x), 2 * (1 - t) * (ctrl.y - bottom.y) + 2 * t * (top.y - ctrl.y), 0).normalize();
    const prof = PROFILES[b.profile];
    const rw = 1 / Math.sqrt(s);
    const total = bottom.distanceTo(ctrl) + ctrl.distanceTo(top);
    const tWaist = (b.below + 12) / total;
    const tShoulder = clamp((b.below + 44 * s) / total, 0.5, 0.92);
    const top_ = spec.top, bot_ = spec.bottom;
    const upperCol = top_ === 'none' ? cols.skin : cols.top;
    const lowerCol = bot_ === 'leotard' || top_ === 'robe' ? cols.top : cols.bottom;
    const ridge = (t, at, w = 0.025) => Math.max(0, 1 - Math.abs(t - at) / w);
    const rFn = (t) => b.torsoR * rw * profileAt(prof, t) * (1 + 0.06 * ridge(t, tWaist));
    // an apron is pressed onto the front like a separate sheet of clay
    const apron = top_ === 'apron';
    const cFn = (t, th) => {
      if (apron && Math.cos(th) > 0.42 && t > tWaist - 0.16 && t < 0.8) return cols.accent;
      return b.bean ? (t < tWaist ? lowerCol : cols.skin) : t < tWaist ? lowerCol : upperCol;
    };
    const belly = (t) => (spec.body === 'chunky' ? 0.12 * smooth(0.2, 0.45, t) * (1 - smooth(0.55, 0.8, t)) : 0);
    this.torso.update(spine, tangent, rFn, cFn, b.torsoZ, belly, seed, boil);
    // shoulders ride on the deformed torso
    const shoulderPt = spine(tShoulder, new Vector3());
    const shDelta = pinHands ? new Vector3() : shoulderPt.clone().sub(J.shoulder);
    const out = { ...J };
    for (const k of ['rShoulder', 'lShoulder', 'rElbow', 'lElbow', 'rHand', 'lHand']) out[k] = J[k].clone().add(shDelta);
    // ---- arms & legs as noodles with a smooth bend through the elbow/knee
    const armR = (u0) => (uu) => {
      const r = b.upper + (b.fore - b.upper) * smooth(0.3, 0.7, uu);
      const bicep = 1 + 0.12 * Math.exp(-(((uu - 0.22) / 0.12) ** 2)) * (1 + effort);
      return r * bicep * (1 + 0.08 * ridge(uu, u0, 0.04));
    };
    const legR = (uu) => {
      const r = b.thigh + (b.shin - b.thigh) * smooth(0.35, 0.65, uu);
      return r * (1 + 0.1 * Math.exp(-(((uu - 0.62) / 0.1) ** 2)) * 0.6);
    };
    const sleeveEnd = top_ === 'tee' || top_ === 'apron' ? 0.24 : top_ === 'track' || top_ === 'robe' ? 0.86 : -1;
    const legEnd = top_ === 'robe' ? 0.62 : bot_ === 'pants' ? 0.9 : bot_ === 'shorts' ? 0.26 : bot_ === 'trunks' ? 0.12 : -1;
    const legCol = top_ === 'robe' ? cols.top : cols.bottom;
    for (const sd of ['r', 'l']) {
      const sg = sd === 'r' ? 1 : -1;
      const sh = out[sd + 'Shoulder'].clone().add(new Vector3(0, 0, -sg * 4)).addScaledVector(u, -3);
      const el = out[sd + 'Elbow'], ha = out[sd + 'Hand'];
      const fd = tB.copy(ha).sub(el).normalize();
      const wrist = ha.clone().addScaledVector(fd, -b.hand * 0.55);
      const armCurve = new CatmullRomCurve3([sh, el, wrist], false, 'centripetal');
      this.limbs[sd + 'Arm'].update(armCurve, 0, 1, armR(sleeveEnd), (uu) => (uu < sleeveEnd ? cols.top : cols.skin), seed + (sg > 0 ? 1 : 2), boil);
      // the hand: relaxed, gripping a held prop, or flat on the floor
      const mode = hands?.[sd] && hands[sd] !== 'auto' ? hands[sd] : ha.y < b.hand * 1.6 && fd.y < 0.3 ? 'flat' : 'relax';
      this._handIn[sd] = { ha: ha.clone(), fd: fd.clone() };
      this.handObj[sd].place(ha, fd, mode, this.face);
      if (this.p[sd + 'Wrist']) { this.p[sd + 'Wrist'].position.copy(wrist).addScaledVector(fd, -3); this.p[sd + 'Wrist'].quaternion.setFromUnitVectors(Z, fd); }
      const hip = J[sd + 'Hip'].clone().addScaledVector(u, 4), kn = J[sd + 'Knee'], an = J[sd + 'Ankle'];
      const legCurve = new CatmullRomCurve3([hip, kn, an], false, 'centripetal');
      this.limbs[sd + 'Leg'].update(legCurve, 0, 1, legR, (uu) => (uu < legEnd ? legCol : cols.skin), seed + (sg > 0 ? 3 : 4), boil);
      if (this.limbs[sd + 'Warm']) this.limbs[sd + 'Warm'].update(legCurve, 0.58, 0.97, (uu) => legR(uu) + 3, () => this.M.felt.color, seed + 5, boil * 1.5);
      // feet flatten into the floor when they carry weight
      const heel = J[sd + 'Heel'], toe = J[sd + 'Toe'];
      const foot = this.feet[sd];
      foot.position.lerpVectors(heel, toe, 0.42);
      const fdir = tC.copy(toe).sub(heel).normalize();
      foot.quaternion.setFromUnitVectors(new Vector3(1, 0, 0), fdir);
      const grounded = foot.position.y < b.foot * 1.4;
      foot.scale.set(grounded ? 1.04 : 1, grounded ? 0.9 : 1, 1);
    }
    // ---- neck + head (lagging a touch behind the body: secondary motion)
    const headPos = J.head.clone().add(shDelta);
    if (lag) headPos.add(lag);
    if (b.bean) {
      // the bean's face lives on the upper body
      const tf = 0.8;
      const p = spine(tf, new Vector3());
      const tg = tangent(tf, new Vector3());
      this.head.position.copy(p);
      this.head.rotation.set(0, 0, Math.atan2(tg.y, tg.x) - Math.PI / 2);
      const faceR = b.torsoR * rw * profileAt(prof, tf);
      this.headInner.scale.setScalar(faceR / 18);
    } else {
      this.neck.update(new CatmullRomCurve3([top.clone().addScaledVector(u, -4), J.neck.clone().add(shDelta).lerp(headPos, 0.5)], false), 0, 1, () => b.neckR, () => cols.skin, seed + 6, boil);
      this.head.position.copy(headPos);
      const uh = tD.copy(headPos).sub(J.neck.clone().add(shDelta)).normalize();
      this.head.rotation.set(0, -(J.tw || 0) * 0.012, Math.atan2(uh.y, uh.x) - Math.PI / 2, 'YXZ');
      this.head.scale.set(1 / Math.sqrt(s) * 0.5 + 0.5, s * 0.5 + 0.5, 1);
    }
    // ---- face acting: the expression asked for (or the character's own working ↔ straining face),
    // eased toward, plus blinks, talking and panting
    const target = face || mixFace(faceFor('work', spec.id), faceFor('strain', spec.id), clamp(effort, 0, 1));
    this.applyFace(target, { blink, talk, now });
    // ---- costume extras that ride on the body
    const d = tangent(tWaist, new Vector3());
    const ring = (m, t, scale = 1) => {
      spine(t, m.position);
      m.quaternion.setFromUnitVectors(Z, tangent(t, tD));
      const r = rFn(t);
      m.scale.set(r * scale, r * b.torsoZ * scale, r);
    };
    if (this.p.belt) ring(this.p.belt, tWaist + 0.015, 1.04);
    if (this.p.chain) { spine(0.9, this.p.chain.position).addScaledVector(new Vector3(d.y, -d.x, 0), 2); this.p.chain.quaternion.setFromUnitVectors(Z, tangent(0.9, tD)); }
    if (this.p.skirt) {
      const t0 = tWaist + 0.04;
      const p0 = spine(t0, new Vector3());
      const dd = tangent(t0, new Vector3());
      // the robe hangs along the thighs, so it swings, lifts and tucks with the legs
      const hipM = J.rHip.clone().add(J.lHip).multiplyScalar(0.5);
      const kneeM = J.rKnee.clone().add(J.lKnee).multiplyScalar(0.5);
      const up = hipM.sub(kneeM).normalize();
      const ax = dd.clone().lerp(up, 0.8).normalize();
      this.p.skirt.quaternion.setFromUnitVectors(Y, ax);
      this.p.skirt.position.copy(p0).addScaledVector(ax, -22);
      this.p.hem.position.copy(p0).addScaledVector(ax, -44);
      this.p.hem.quaternion.setFromUnitVectors(Z, ax);
    }
    // ---- ground contact: rest the actual clay (soles, bum, knees, hands…) on the floor, so feet
    // neither hover nor sink whatever each body's proportions; a jump keeps its height.
    // Lying, planking or crawling, the body also settles like a real one under gravity: it pivots
    // on its lowest point toward its centre of mass until a second part touches down too.
    let dy = 0, th = 0, px = 0, py = 0;
    this.body.rotation.z = 0;
    if (J.lift != null) {
      const pts = this.contactPoints(J);
      let p0 = pts[0];
      for (const q of pts) if (q[1] < p0[1]) p0 = q;
      px = p0[0]; py = p0[1];
      const u = tD.copy(J.neck).sub(J.pelvis).normalize();
      if (Math.abs(u.y) < 0.72 && J.lift < 2) {
        const com = J.pelvis.x * 0.65 + J.neck.x * 0.35;
        let dir = Math.sign(com - px);
        // already standing on supports either side of the centre of mass (hands and knees): stable
        const near = pts.filter((q) => q[1] < py + 1.5);
        const stable = near.some((q) => q[0] < com - 4) && near.some((q) => q[0] > com + 4);
        // tip about the outermost support on the centre-of-mass side (a forearm resting on the floor
        // next to the hand is one support, not a pivot)
        for (const q of near) if ((q[0] - px) * dir > 0) { px = q[0]; py = Math.min(py, q[1]); }
        dir = stable ? 0 : Math.sign(com - px);
        if (dir && Math.abs(com - px) > 4) {
          let a = 0.3; // never tip more than ~17°
          for (const q of pts) {
            const dx = (q[0] - px) * dir;
            if (dx > 6) a = Math.min(a, Math.atan2(Math.max(0, q[1] - py), dx));
          }
          th = -dir * a;
        }
      }
      dy = J.lift - py;
      if (Math.abs(dy) > 40) { dy = 0; th = 0; } // something odd (e.g. a prop pose): leave the rig's placement
    }
    const c = Math.cos(th), sn = Math.sin(th);
    this.body.rotation.z = th;
    // rotate about the pivot (px, py), then drop onto the floor
    this.body.position.set(px - (px * c - py * sn), py - (px * sn + py * c) + dy, 0);
    if (dy || th) for (const k in out) if (out[k]?.isVector3) { out[k] = out[k].clone().applyAxisAngle(Z, th).add(this.body.position); }
    return out;
  }

  // points along the underside of the sculpted body (character space, before settling)
  contactPoints(J) {
    const { b, spec } = this;
    const pts = [];
    const scan = (geo, step = 1) => { const a = geo.attributes.position.array; for (let i = 0; i < a.length; i += 3 * step) pts.push([a[i], a[i + 1]]); };
    scan(this.torso.geo, 2);
    for (const k in this.limbs) scan(this.limbs[k].geo, 2);
    const shod = spec.feet === 'sneakers' || spec.feet === 'boots';
    for (const s of ['r', 'l']) {
      // the sole: heel and toe ends and the middle, a foot's thickness below the bone
      const h = J[s + 'Heel'], t = J[s + 'Toe'], th = b.foot * (shod ? 0.82 : 0.75);
      for (const k of [0, 0.5, 1]) pts.push([h.x + (t.x - h.x) * k, h.y + (t.y - h.y) * k - th]);
      pts.push([this.handObj[s].group.position.x, this.handObj[s].bottom()]);
    }
    if (!b.bean) pts.push([this.head.position.x, this.head.position.y - b.headR * 0.95]);
    return pts;
  }
  applyFace(target, { blink = false, talk = 0, now = null } = {}) {
    const f = (this.fc ??= { ...target });
    for (const k of FACE_KEYS) f[k] += (target[k] - f[k]) * 0.45;
    const T = now ?? performance.now() / 1000;
    // eyes: open / ^ / ‿ / wink; pupils look about (or cross when dizzy)
    const closedHappy = f.happy > 0.5, closedShut = f.shut > 0.5;
    this.eyes.forEach((ey, i) => {
      const winkThis = f.wink > 0.5 && i === 0;
      const happy = closedHappy || winkThis, shut = !happy && (closedShut || blink);
      const open = clamp(f.open, 0.08, 1.4);
      const showOpen = !happy && !shut;
      for (const m of [ey.white, ey.pupil, ...(ey.lashes || [])]) if (m) m.visible = showOpen;
      ey.happy.visible = happy;
      ey.shut.visible = shut;
      if (ey.white) ey.white.scale.set(ey.white.userData.s0.x, ey.white.userData.s0.y * open, ey.white.userData.s0.z * (0.92 + open * 0.08));
      const p = ey.pupil;
      p.scale.set(p.userData.s0.x, p.userData.s0.y * Math.min(1, open * 1.25), p.userData.s0.z);
      p.position.copy(p.userData.p0);
      p.position.y += f.lookY * 1.3 - (1 - Math.min(1, open)) * 0.8;
      p.position.z += f.lookX * 1.3 - ey.sg * f.cross * 1.5;
    });
    // brows: up/down, angry ↔ worried tilt, one raised
    for (const br of this.brows) {
      const sg = br.userData.sg;
      br.position.y = br.userData.y0 + f.browY * 2.2 + sg * f.browAsym * 1.3;
      br.rotation.x = -sg * f.browTilt * 0.45;
      br.rotation.z = 0;
    }
    // cheeks
    for (const ck of this.cheeks) {
      const k = 1 + f.blush * 0.25 + f.puff * 0.7;
      ck.scale.set(ck.userData.s0.x * (1 + f.puff * 1.2), ck.userData.s0.y * k, ck.userData.s0.z * k);
      ck.position.copy(ck.userData.p0);
      ck.position.z += ck.userData.sg * f.puff * 1.5;
      ck.visible = this.spec.eyes !== 'beady' || f.puff > 0.3;
    }
    // mouth: open while talking, panting or as the face says; else a curve or a flat line
    let open = f.mouth;
    if (talk) open = Math.max(open, 0.16 + 0.34 * Math.abs(Math.sin(T * 13)));
    if (f.pant > 0.3) open = Math.max(open, 0.3 + 0.3 * Math.abs(Math.sin(T * 8)));
    const isOpen = open > 0.14;
    this.strain.visible = isOpen;
    if (isOpen) {
      this.strain.scale.set(1, 0.35 + open * 1.05, f.mouthW);
      this.strain.position.y = this.strain.userData.y0 + f.smile * 0.6 - open * 0.8;
      this.tongue.visible = f.tongue > 0.3;
      this.teeth.visible = f.teeth > 0.4;
      this.lip.visible = f.teeth > 0.5 && f.smile < 0.3;
    }
    const curve = Math.abs(f.smile) >= 0.18;
    this.smile.visible = !isOpen && curve;
    this.line.visible = !isOpen && !curve;
    if (this.smile.visible) {
      const s = Math.sign(f.smile) * (0.35 + Math.abs(f.smile) * 0.65);
      this.smile.scale.set(1, s, f.mouthW * (1 + f.smirk * 0.1));
      this.smile.rotation.set(Math.PI + f.smirk * 0.32, Math.PI / 2, 0);
      this.smile.position.copy(this.smile.userData.p0);
      this.smile.position.z += f.smirk * 1.6;
      this.smile.position.y += f.smile < 0 ? -1.6 : 0;
    }
  }

  // re-pose one hand after the fact (e.g. the director puts a prop in it): 'grip' | 'stick' | 'relax' | 'flat'
  setHand(side, mode) {
    const h = this._handIn?.[side];
    if (!h) return;
    this.handObj[side].place(h.ha, h.fd, mode, this.face);
  }



  // stop-motion "boil": a hand-placed puppet is never re-set exactly, but planted hands and feet
  // don't move between frames — only the head gets a hair of re-sculpting
  jitter(rnd, amt) {
    this.head.rotation.z += (rnd() - 0.5) * 0.012 * amt;
  }
}
