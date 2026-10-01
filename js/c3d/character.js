// Pulse 3D — clay characters built from a cast spec (see js/cast.js).
import {
  Group, Vector3, Quaternion, SphereGeometry, TorusGeometry, CylinderGeometry,
} from '../vendor/three.js';
import { clay, capsule, sphere, mesh, placeSeg, lumpify, at, Y } from './kit.js';

const BODIES = {
  human: { torsoR: 16, torsoZ: 1.24, headR: 18, neckR: 6.5, upper: 7.2, fore: 6.6, hand: 8, thigh: 9.6, shin: 8.2, foot: 7, zs: 19, zh: 9.5 },
  slim: { torsoR: 12.5, torsoZ: 1.3, headR: 16, neckR: 5.2, upper: 5.6, fore: 5.1, hand: 6.4, thigh: 7.6, shin: 6.5, foot: 6, zs: 16, zh: 8 },
  doll: { torsoR: 12.5, torsoZ: 1.25, headR: 17, neckR: 4.8, upper: 5.4, fore: 5, hand: 6.2, thigh: 7.8, shin: 6.6, foot: 6, zs: 15.5, zh: 7.8 },
  bean: { torsoR: 27, torsoZ: 1.22, headR: 22, neckR: 0, upper: 8.6, fore: 8.2, hand: 8.8, thigh: 10.8, shin: 9.8, foot: 8.5, zs: 21, zh: 11, bean: true },
  chunky: { torsoR: 21, torsoZ: 1.2, headR: 18.5, neckR: 7, upper: 8.6, fore: 7.8, hand: 8.6, thigh: 11, shin: 9.6, foot: 8, zs: 23, zh: 11 },
  alien: { torsoR: 13.5, torsoZ: 1.12, headR: 23, neckR: 4.4, upper: 5.6, fore: 5.1, hand: 7, thigh: 7.6, shin: 6.6, foot: 7.5, zs: 17, zh: 8.5 },
};

const tA = new Vector3(), tB = new Vector3();
const lerp = (a, b, t) => new Vector3().lerpVectors(a, b, t);
const QZ = new Vector3(0, 0, 1);

export class Character {
  constructor(spec, colors) {
    this.spec = spec;
    this.b = BODIES[spec.body] || BODIES.human;
    this.group = new Group();
    this.c = colors || spec.colors;
    const c = this.c;
    const unique = spec.id === 'pip'; // Pip's colours change live
    const mk = (col, o = {}) => clay(col, { ...o, unique });
    this.M = {
      skin: mk(c.skin), top: mk(c.top), bottom: mk(c.bottom), shoes: mk(c.shoes, { gloss: 0.15 }), hair: mk(c.hair, { rough: 0.72 }),
      accent: mk(c.accent), sole: clay('#fbf6ef'), eye: clay('#fffdf8', { rough: 0.25, bump: 0.2, sheen: 0 }),
      pupil: clay('#160f1d', { rough: 0.12, bump: 0, sheen: 0, gloss: 0.8 }), mouth: clay('#6e2626', { bump: 0.4 }), cheek: clay('#ff8f8f', { rough: 0.8 }),
      felt: mk(c.accent, { felt: true }), gold: clay('#e8b53c', { rough: 0.3, metal: 0.6, gloss: 0.6, bump: 0.5 }),
      shade: clay('#141414', { rough: 0.1, gloss: 1, bump: 0, sheen: 0 }), white: clay('#f8f5ef'),
    };
    this.build();
  }

  add(geo, mat, parent = this.group) {
    const m = mesh(geo, mat);
    parent.add(m);
    return m;
  }

  build() {
    const { b, spec, M } = this;
    const P = (this.p = {});
    const top = spec.top, bottom = spec.bottom;
    const torsoMat = top === 'none' ? M.skin : M.top;
    const lowerMat = bottom === 'leotard' || top === 'robe' ? M.top : top === 'none' && bottom === 'none' ? M.skin : M.bottom;
    P.lower = this.add(capsule(b.torsoR + 0.5, 12, 3, 0.7), lowerMat);
    P.upper = this.add(capsule(b.torsoR, b.bean ? 40 : 33, 4, 0.7), torsoMat);
    P.lower.scale.set(1, 1, b.torsoZ + 0.04);
    P.upper.scale.set(1, 1, b.torsoZ);
    if (b.neckR) P.neck = this.add(capsule(b.neckR, 8, 5), M.skin);
    const fullSleeve = top === 'track' || top === 'robe';
    for (const s of ['r', 'l']) {
      const o = s === 'r' ? 0 : 1;
      P[s + 'Upper'] = this.add(capsule(b.upper, 31, 6 + o), M.skin);
      P[s + 'Fore'] = this.add(capsule(b.fore, 29, 8 + o), M.skin);
      P[s + 'Hand'] = this.add(sphere(b.hand, 12 + o), M.skin);
      P[s + 'Hand'].scale.set(1, 1, 0.9);
      if (top === 'tee' || top === 'apron') P[s + 'Sleeve'] = this.add(capsule(b.upper + 2.2, 14, 10 + o, 0.6), M.top);
      if (fullSleeve) {
        P[s + 'SleeveU'] = this.add(capsule(b.upper + 1.6, 31, 10 + o, 0.6), M.top);
        P[s + 'SleeveF'] = this.add(capsule(b.fore + 1.8, 22, 24 + o, 0.6), M.top);
      }
      P[s + 'Thigh'] = this.add(capsule(b.thigh, 44, 14 + o), M.skin);
      P[s + 'Shin'] = this.add(capsule(b.shin, 43, 16 + o), M.skin);
      if (bottom === 'shorts') P[s + 'Leg'] = this.add(capsule(b.thigh + 2, 22, 18 + o, 0.6), M.bottom);
      if (bottom === 'trunks') P[s + 'Leg'] = this.add(capsule(b.thigh + 1.4, 9, 18 + o, 0.5), M.bottom);
      if (bottom === 'pants') {
        P[s + 'PantU'] = this.add(capsule(b.thigh + 1.6, 44, 26 + o, 0.6), M.bottom);
        P[s + 'PantL'] = this.add(capsule(b.shin + 1.8, 36, 28 + o, 0.6), M.bottom);
      }
      if (spec.feet === 'sneakers' || spec.feet === 'boots') {
        P[s + 'Shoe'] = this.add(capsule(b.foot + (spec.feet === 'boots' ? 1.2 : 0), 21, 20 + o), M.shoes);
        P[s + 'Shoe'].scale.set(1, 1, 1.18);
        P[s + 'Sole'] = this.add(capsule(b.foot * 0.63, 23, 22, 0.25), spec.feet === 'boots' ? M.pupil : M.sole);
        P[s + 'Sole'].scale.set(1, 1, 1.35);
        if (spec.feet === 'boots') P[s + 'Cuff'] = this.add(capsule(b.shin + 3, 10, 30 + o), M.shoes);
      } else {
        P[s + 'Shoe'] = this.add(capsule(b.foot * 0.8, 18, 20 + o), M.skin);
        P[s + 'Shoe'].scale.set(1, 0.85, 1.25);
      }
      if (spec.extras?.includes('legwarmers')) P[s + 'Warmer'] = this.add(capsule(b.shin + 3, 20, 32 + o, 1.1), M.felt);
      if (spec.extras?.includes('wristbands')) P[s + 'Wrist'] = this.add(capsule(b.fore + 1.8, 4, 34 + o), M.accent);
      if (top === 'track') P[s + 'Stripe'] = this.add(capsule(1.2, 30, 36 + o, 0.1), M.accent);
    }
    if (top === 'robe') {
      const skirt = lumpify(new CylinderGeometry(b.torsoR * 1.08, b.torsoR * 2.1, 58, 24, 4, true), 0.9, 0.08, 40);
      P.skirt = this.add(skirt, M.top);
      P.skirt.material = clay(this.c.top, { unique: this.spec.id === 'pip' });
      P.skirt.material.side = 2;
      P.hem = this.add(lumpify(new TorusGeometry(b.torsoR * 2.05, 2.2, 10, 40), 0.3, 0.2, 41), M.accent);
    }
    if (top === 'apron') {
      P.apron = this.add(capsule(b.torsoR * 0.82, 38, 42, 0.4), M.accent);
      P.apron.scale.set(0.3, 1, 1.4);
    }
    if (spec.extras?.includes('belt')) P.belt = this.add(lumpify(new TorusGeometry(b.torsoR + 0.6, 2, 10, 32), 0.2, 0.2, 43), M.accent);
    if (spec.extras?.includes('chain')) P.chain = this.add(new TorusGeometry(b.torsoR * 0.7, 1.4, 8, 32), M.gold);
    if (spec.extras?.includes('whistle')) {
      P.whistle = this.add(new TorusGeometry(b.torsoR * 0.75, 0.8, 6, 32), M.accent);
      P.whistleBody = this.add(capsule(2.4, 4, 44, 0.1), M.accent);
    }
    this.head = this.buildHead();
    this.group.add(this.head);
  }

  buildHead() {
    const { spec, M, b } = this;
    const h = new Group();
    const inner = new Group();
    inner.scale.setScalar(b.headR / 18);
    h.add(inner);
    const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = null) => at(this.add(geo, mat, inner), x, y, z, rx, ry, rz, s);
    add(sphere(18, 30, 0.5), M.skin, 0, 0, 0, 0, 0, 0, [1, 1.02, spec.body === 'bean' ? 1.05 : 0.97]);
    // eyes
    this.eyes = [];
    const eyes = spec.eyes || 'big';
    for (const z of [7.4, -7.4]) {
      const sg = Math.sign(z);
      if (eyes === 'beady') {
        this.eyes.push(add(sphere(2.5, 36, 0.02), M.pupil, 16.4, 4, z * 0.9, 0, 0, 0, [0.7, 1.15, 1]));
      } else if (eyes === 'alien') {
        this.eyes.push(add(sphere(6.2, 36, 0.05), M.pupil, 13.6, 2.5, z * 1.05, 0, -0.35 * sg, 0.25 * sg, [0.55, 1.3, 0.9]));
        add(sphere(1.4, 37, 0), M.white, 16.6, 5.4, z * 1.02);
      } else {
        this.eyes.push(add(sphere(4.3, 35, 0.05), M.eye, 14.8, 3.8, z, 0, 0, 0, [0.62, 1.15, 1]));
        this.eyes.push(add(sphere(2.6, 36, 0.02), M.pupil, 17.4, 3.6, z * 1.03, 0, 0, 0, [0.6, 1.1, 1]));
        if (eyes === 'lashes') for (const k of [0, 1, 2]) add(capsule(0.55, 3, 37, 0), M.pupil, 15.4 - k * 0.5, 8.4 + k * 0.4, z + sg * (k * 2.2 - 1), 0, 0, 0.5 + k * 0.25);
      }
      if (eyes !== 'alien') add(capsule(1, 4.6, 37, 0.05), spec.hair === 'bald' || spec.hair === 'none' ? M.mouth : M.hair, 15.4, eyes === 'beady' ? 8.4 : 10, z, Math.PI / 2, 0, 0.12 * sg);
      if (eyes === 'big' || eyes === 'lashes') add(sphere(3.3, 38, 0.1), M.cheek, 13.6, -3.8, z * 1.45, 0, 0, 0, [0.45, 0.85, 1]);
      if (spec.ears !== false) add(sphere(4.4, 39, 0.3), M.skin, -1, 0, sg * 17.4, 0, 0, 0, [0.62, 1, 0.5]);
    }
    if (spec.nose !== 'none') add(sphere(spec.body === 'chunky' ? 5.4 : 4.4, 40, 0.3), M.skin, 18.6, -1.2, 0, 0, 0, 0, [1, 0.9, 1.05]);
    this.smile = add(new TorusGeometry(3.4, 0.85, 8, 16, Math.PI), M.mouth, 16.6, -6.4, 0, Math.PI, Math.PI / 2, 0);
    this.oMouth = add(new TorusGeometry(2.2, 1.1, 8, 16), M.mouth, 16.8, -7, 0, 0, Math.PI / 2, 0, [1, 1.3, 1]);
    this.oMouth.visible = false;
    // facial hair
    if (spec.facial === 'mustache' || spec.facial === 'beard') {
      for (const z of [3.8, -3.8]) add(capsule(spec.body === 'bean' ? 3 : 2.3, 6.5, 45, 0.2), M.hair, 18, -4, z, Math.PI / 2 + Math.sign(z) * 0.5, 0, -0.25);
    }
    if (spec.facial === 'beard') {
      const beard = clay(this.c.hair, { felt: true });
      const pts = [[12, -10, 0, 9], [10, -15, 6, 7], [10, -15, -6, 7], [9, -21, 0, 8], [7, -27, 0, 6], [5, -32, 0, 4.5], [13, -11, 9, 6], [13, -11, -9, 6]];
      pts.forEach(([x, y, z, r], i) => add(sphere(r, 46 + i, 0.6), beard, x, y, z));
    }
    // hair
    const hair = spec.hair || 'cap';
    if (hair === 'cap' || hair === 'silver' || hair === 'bun') {
      add(lumpify(new SphereGeometry(19, 32, 18, 0, Math.PI * 2, 0, Math.PI * (hair === 'silver' ? 0.4 : 0.47)), 0.7, 0.16, 31), M.hair, -1.2, 0.8, 0, 0, 0, hair === 'silver' ? 0.9 : 0.62);
      if (hair === 'silver') for (const z of [14, -14]) add(sphere(5, 47, 0.8), M.hair, -6, 4, z);
      if (hair === 'bun') add(sphere(7.5, 48, 0.8), M.hair, -11, 17, 0);
    } else if (hair === 'curly') {
      const rnd = (i) => Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
      for (let i = 0; i < 46; i++) {
        const th = rnd(i) * Math.PI * 2, ph = rnd(i + 99) * 1.9;
        const x = Math.cos(th) * Math.sin(ph) * 21 - 5, y = Math.cos(ph) * 21 + 3, z = Math.sin(th) * Math.sin(ph) * 25;
        if (x > 9 && y < 14) continue; // keep the face clear
        add(sphere(6 + rnd(i + 7) * 3, 50 + (i % 6), 0.9, 16), M.hair, x, y, z);
      }
    } else if (hair === 'afro') {
      add(sphere(25, 49, 1.6, 36), clay(this.c.hair, { felt: true }), -9, 11, 0, 0, 0, 0, [0.92, 1, 1.12]);
    }
    // hats
    const hat = spec.hat;
    if (hat === 'headband') {
      const band = new Group();
      at(band, -0.6, 5.6, 0, 0, 0, 0.28);
      inner.add(band);
      at(this.add(lumpify(new TorusGeometry(hair === 'curly' ? 20 : 17.6, 2.3, 14, 48), 0.25, 0.2, 32), hair === 'curly' ? M.felt : M.accent, band), 0, 0, 0, Math.PI / 2, 0, 0);
      if (hair !== 'curly') {
        at(this.add(sphere(3.2, 33), M.accent, band), -18.6, 0, 0);
        for (const [z, rz] of [[2.6, 2.3], [-2.6, 2.6]]) at(this.add(capsule(1.7, 7, 34, 0.1), M.accent, band), -21.5, -3.6, z, 0, 0, rz);
      }
    } else if (hat === 'wizard') {
      const g = new Group();
      at(g, -3, 12, 0, 0, 0, 0.35);
      inner.add(g);
      at(this.add(lumpify(new CylinderGeometry(27, 27, 2.5, 32), 0.6, 0.1, 52), M.top, g), 0, 0, 0);
      const cone = lumpify(new CylinderGeometry(1.2, 17, 46, 24, 6), 0.8, 0.08, 53);
      at(this.add(cone, M.top, g), -3, 24, 0, 0, 0, 0.18);
      for (let i = 0; i < 6; i++) at(this.add(sphere(1.8, 54, 0), clay(this.c.accent, { emissive: this.c.accent, ei: 0.6 }), g), -3 + Math.sin(i) * 8, 8 + i * 6, Math.cos(i * 2) * (14 - i * 2));
      at(this.add(new TorusGeometry(17.5, 1.8, 8, 32), M.accent, g), 0, 3, 0, Math.PI / 2, 0, 0);
    } else if (hat === 'chef') {
      const w = M.white;
      at(this.add(lumpify(new CylinderGeometry(17.5, 17, 10, 28, 2, true), 0.4, 0.15, 55), w), -1, 12, 0, 0, 0, 0.12);
      [[0, 26, 0, 12], [-8, 24, 8, 9], [-8, 24, -8, 9], [7, 24, 6, 8.5], [7, 24, -6, 8.5], [-11, 21, 0, 9]].forEach(([x, y, z, r], i) => add(sphere(r, 56 + i, 0.9), w, x - 1, y, z));
    } else if (hat === 'swimcap') {
      add(lumpify(new SphereGeometry(19.3, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.55), 0.3, 0.16, 57), clay(this.c.hair, { gloss: 0.6, rough: 0.3 }), -0.6, 0.4, 0, 0, 0, 0.45);
      for (const z of [7, -7]) add(new TorusGeometry(3.6, 1.3, 8, 18), clay('#58c4f2', { gloss: 0.8, rough: 0.2 }), 12.5, 12.5, z, 0, Math.PI / 2 - 0.5, 0);
    } else if (hat === 'antenna') {
      for (const z of [6, -6]) {
        add(capsule(0.9, 14, 58, 0.1), M.skin, -1, 24, z * 1.3, Math.sign(z) * 0.35, 0, 0.15);
        add(sphere(2.8, 59, 0.1), clay(this.c.accent, { emissive: this.c.accent, ei: 0.8 }), -2, 31.5, z * 2.1);
      }
    }
    if (spec.eyewear === 'sunglasses') {
      for (const z of [7.4, -7.4]) add(sphere(5.2, 60, 0), M.shade, 17, 4, z, 0, 0, 0, [0.35, 0.8, 1.15]);
      add(capsule(0.8, 4, 61, 0), M.gold, 18.4, 5.2, 0, Math.PI / 2, 0, 0);
    }
    return h;
  }

  setColors(c) {
    this.c = c;
    const map = { skin: 'skin', top: 'top', bottom: 'bottom', shoes: 'shoes', hair: 'hair', accent: 'accent' };
    for (const [k, v] of Object.entries(map)) this.M[k].color.set(c[v]);
    this.M.felt.color.set(c.accent);
  }

  // 2D rig points → 3D joints for this body (Y up, floor at 0, Z toward the near side)
  joints(pts, fit) {
    const { zs, zh } = this.b;
    const cx = (fit.bbox.x0 + fit.bbox.x1) / 2;
    const V = (p, z = 0) => new Vector3(p[0] - cx, fit.G - p[1], z);
    const ux = pts.neck[0] - pts.pelvis[0], uy = pts.neck[1] - pts.pelvis[1];
    const ul = Math.hypot(ux, uy) || 1;
    const sh = [pts.shoulder[0] + (ux / ul) * 2, pts.shoulder[1] + (uy / ul) * 2];
    return {
      pelvis: V(pts.pelvis), neck: V(pts.neck), head: V(pts.head), shoulder: V(pts.shoulder),
      rShoulder: V(sh, zs), lShoulder: V(sh, -zs), rElbow: V(pts.rElbow, zs + 1), lElbow: V(pts.lElbow, -zs - 1), rHand: V(pts.rHand, zs), lHand: V(pts.lHand, -zs),
      rHip: V(pts.pelvis, zh), lHip: V(pts.pelvis, -zh), rKnee: V(pts.rKnee, zh + 0.5), lKnee: V(pts.lKnee, -zh - 0.5),
      rAnkle: V(pts.rAnkle, zh + 0.5), lAnkle: V(pts.lAnkle, -zh - 0.5), rHeel: V(pts.rHeel, zh + 1), lHeel: V(pts.lHeel, -zh - 1), rToe: V(pts.rToe, zh + 1.5), lToe: V(pts.lToe, -zh - 1.5),
    };
  }

  pose(J, { blink = false, effort = false } = {}) {
    const { p, b } = this;
    const d = tA.copy(J.neck).sub(J.pelvis).normalize();
    const fwd = new Vector3(d.y, -d.x, 0);
    const waist = lerp(J.pelvis, J.neck, 0.22);
    placeSeg(p.lower, J.pelvis, waist);
    placeSeg(p.upper, waist, lerp(J.pelvis, J.neck, b.bean ? 0.95 : 0.82));
    if (p.neck) placeSeg(p.neck, lerp(J.pelvis, J.neck, 0.84), J.neck.clone().add(tB.copy(J.head).sub(J.neck).multiplyScalar(0.25)));
    const ring = (m, pos) => { m.position.copy(pos); m.quaternion.setFromUnitVectors(QZ, d); };
    if (p.belt) ring(p.belt, lerp(J.pelvis, J.neck, 0.24));
    if (p.chain) ring(p.chain, lerp(J.pelvis, J.neck, 0.86).addScaledVector(fwd, 3));
    if (p.whistle) {
      ring(p.whistle, lerp(J.pelvis, J.neck, 0.84).addScaledVector(fwd, 2));
      p.whistleBody.position.copy(lerp(J.pelvis, J.neck, 0.6)).addScaledVector(fwd, b.torsoR + 2);
    }
    if (p.apron) {
      placeSeg(p.apron, lerp(J.pelvis, J.neck, -0.15).addScaledVector(fwd, b.torsoR * 0.86), lerp(J.pelvis, J.neck, 0.7).addScaledVector(fwd, b.torsoR * 0.86));
    }
    if (p.skirt) {
      const top = lerp(J.pelvis, J.neck, 0.18);
      p.skirt.quaternion.setFromUnitVectors(Y, d);
      p.skirt.position.copy(top).addScaledVector(d, -29);
      ring(p.hem, top.clone().addScaledVector(d, -57));
    }
    for (const s of ['r', 'l']) {
      const sh = J[s + 'Shoulder'], el = J[s + 'Elbow'], ha = J[s + 'Hand'];
      placeSeg(p[s + 'Upper'], sh, el);
      placeSeg(p[s + 'Fore'], el, ha);
      p[s + 'Hand'].position.copy(ha);
      if (p[s + 'Sleeve']) placeSeg(p[s + 'Sleeve'], sh, lerp(sh, el, 0.45));
      if (p[s + 'SleeveU']) { placeSeg(p[s + 'SleeveU'], sh, el); placeSeg(p[s + 'SleeveF'], el, lerp(el, ha, 0.72)); }
      if (p[s + 'Stripe']) placeSeg(p[s + 'Stripe'], sh.clone().setZ(sh.z + Math.sign(sh.z) * (b.upper + 1.2)), el.clone().setZ(el.z + Math.sign(el.z) * (b.upper + 1.2)));
      if (p[s + 'Wrist']) placeSeg(p[s + 'Wrist'], lerp(el, ha, 0.78), lerp(el, ha, 0.9));
      const hip = J[s + 'Hip'], kn = J[s + 'Knee'], an = J[s + 'Ankle'];
      placeSeg(p[s + 'Thigh'], hip, kn);
      placeSeg(p[s + 'Shin'], kn, an);
      if (p[s + 'Leg']) placeSeg(p[s + 'Leg'], hip, lerp(hip, kn, this.spec.bottom === 'trunks' ? 0.22 : 0.5));
      if (p[s + 'PantU']) { placeSeg(p[s + 'PantU'], hip, kn); placeSeg(p[s + 'PantL'], kn, lerp(kn, an, 0.84)); }
      if (p[s + 'Warmer']) placeSeg(p[s + 'Warmer'], lerp(kn, an, 0.38), lerp(kn, an, 0.92));
      if (p[s + 'Cuff']) placeSeg(p[s + 'Cuff'], lerp(kn, an, 0.7), an);
      const heel = J[s + 'Heel'], toe = J[s + 'Toe'];
      placeSeg(p[s + 'Shoe'], heel, toe);
      if (p[s + 'Sole']) {
        const fd = tA.copy(toe).sub(heel).normalize();
        const down = new Vector3(fd.y, -fd.x, 0).multiplyScalar(b.foot * 0.48);
        placeSeg(p[s + 'Sole'], heel.clone().add(down), toe.clone().add(down));
      }
    }
    // head frame: local +Y along neck→head, local +X = facing direction
    const u = tA.copy(J.head).sub(J.neck).normalize();
    this.head.position.copy(J.head);
    if (b.bean) this.head.position.addScaledVector(u, -4);
    this.head.rotation.set(0, 0, Math.atan2(u.y, u.x) - Math.PI / 2);
    for (const e of this.eyes) { e.userData.sy ??= e.scale.y; e.scale.y = blink ? e.userData.sy * 0.12 : e.userData.sy; }
    this.smile.visible = !effort;
    this.oMouth.visible = effort;
  }

  jitter(rnd, amt) {
    for (const m of this.group.children) {
      if (!m.isMesh) continue;
      m.rotation.z += (rnd() - 0.5) * 0.02 * amt;
      m.position.x += (rnd() - 0.5) * 0.35 * amt;
      m.position.y += (rnd() - 0.5) * 0.35 * amt;
    }
  }
}

export const tmpQ = new Quaternion();
