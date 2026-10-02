// SuperSweatClub 3D — clay hands: a flat palm, jointed fingers and a thumb that curl to grip.
// Built for the right hand in its own frame and mirrored for the left. Local frame:
//   +X out along the fingers · +Y the back of the hand · −Z the thumb side (right hand).
// The hand's origin is the rig's hand point, which is also the *grip centre*: a bar, handle or
// stick held in the hand passes through it, so props sit in the fist instead of floating.
import { Group, Vector3 } from '../vendor/three.js';
import { capsule, sphere, mesh, at } from './kit.js';

// per-character hand designs (sizes are in units of the body's hand size)
const STYLES = {
  // mittens: one opposable thumb, the other fingers together in a single clay paddle
  pip: { n: 1, paddle: 0.86, fr: 0.27, fl: [0.46, 0.4], palm: [1, 0.46, 0.98], thumb: 0.24 },
  bruno: { n: 1, paddle: 0.92, fr: 0.3, fl: [0.5, 0.44], palm: [1.08, 0.5, 1.06], thumb: 0.28 },
  jolene: { n: 4, fr: 0.14, fl: [0.52, 0.44], palm: [0.98, 0.36, 0.84], thumb: 0.17, nails: true },
  dee: { n: 4, fr: 0.17, fl: [0.44, 0.38], palm: [1, 0.42, 0.94], thumb: 0.2, glove: true },
  fern: { n: 3, fr: 0.15, fl: [0.6, 0.52], palm: [0.96, 0.36, 0.8], thumb: 0.16 },
  merlin: { n: 4, fr: 0.13, fl: [0.58, 0.5], palm: [1.02, 0.36, 0.86], thumb: 0.15, ring: true },
  bao: { n: 1, paddle: 0.94, fr: 0.3, fl: [0.42, 0.36], palm: [1.04, 0.5, 1.02], thumb: 0.26 },
};

// pose of each mode: finger curl (0 flat … 1 fist), thumb wrap, and how far the palm sits off the grip
const MODES = {
  relax: { curl: 0.28, thumb: 0.2, lift: 0 },
  grip: { curl: 1, thumb: 1, lift: 0.4 },
  stick: { curl: 1, thumb: 1, lift: 0.36 },
  flat: { curl: 0, thumb: 0, lift: 0.18 },
};

const UP = new Vector3(0, 1, 0), FWD = new Vector3(1, 0, 0), SIDE = new Vector3(0, 0, 1);
const vX = new Vector3(), vY = new Vector3(), vZ = new Vector3(), tmp = new Vector3();
// rotation matrix (columns x, y, z; row-major m[r][c]) → quaternion, written into q
function quatFromBasis(q, m) {
  const [[m00, m01, m02], [m10, m11, m12], [m20, m21, m22]] = m;
  const tr = m00 + m11 + m22;
  if (tr > 0) { const s = 0.5 / Math.sqrt(tr + 1); q.set((m21 - m12) * s, (m02 - m20) * s, (m10 - m01) * s, 0.25 / s); }
  else if (m00 > m11 && m00 > m22) { const s = 2 * Math.sqrt(1 + m00 - m11 - m22); q.set(0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s); }
  else if (m11 > m22) { const s = 2 * Math.sqrt(1 + m11 - m00 - m22); q.set((m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s); }
  else { const s = 2 * Math.sqrt(1 + m22 - m00 - m11); q.set((m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s); }
  return q.normalize();
}
const orth = (v, x) => v.addScaledVector(x, -v.dot(x)).normalize();

export class Hand {
  // mats: { skin, accent, gold, glove }
  // size: the hand's length scale · cuff: the forearm's radius (the wrist is capped to meet it)
  constructor(spec, size, mats, side, cuff = size * 0.4) {
    const st = STYLES[spec.id] || STYLES.pip;
    this.st = st;
    this.side = side; // 'r' | 'l'
    this.size = size;
    this.group = new Group();
    this.inner = new Group(); // slides the palm off the grip centre
    this.group.add(this.inner);
    const [pl, pt, pw] = st.palm;
    const palmMat = st.glove ? mats.glove : mats.skin;
    this.inner.add(at(mesh(sphere(0.5, 130, 0.25), palmMat), -0.12, 0, 0, 0, 0, 0, [pl, pt, pw]));
    // the wrist: a soft ball the forearm runs into (covers the arm's open end)
    this.cuff = at(mesh(sphere(1, 139, 0.15), palmMat), -0.56, 0, 0, 0, 0, 0, cuff / size * 1.08);
    this.group.add(this.cuff);
    // knuckle bumps soften the palm into the fingers
    this.fingers = [];
    const n = st.n;
    for (let i = 0; i < n; i++) {
      const z = n === 1 ? 0 : (i / (n - 1) - 0.5) * pw * 0.66;
      const len = st.fl.map((l) => l * (n === 1 ? 1 : 1 - Math.abs(i / (n - 1) - 0.4) * 0.22));
      const k = new Group();
      at(k, 0.3 * pl, 0, z);
      const r = st.fr;
      const seg1 = st.paddle ? at(mesh(sphere(0.5, 131, 0.2), mats.skin), len[0] / 2, 0, 0, 0, 0, 0, [len[0] + r, r * 1.6, st.paddle]) : at(mesh(capsule(r, len[0], 132 + i, 0.08), mats.skin), len[0] / 2, 0, 0, 0, 0, -Math.PI / 2);
      k.add(seg1);
      const d = new Group();
      at(d, len[0], 0, 0);
      const seg2 = st.paddle ? at(mesh(sphere(0.5, 133, 0.2), mats.skin), len[1] / 2, 0, 0, 0, 0, 0, [len[1] + r, r * 1.5, st.paddle * 0.96]) : at(mesh(capsule(r * 0.94, len[1], 134 + i, 0.08), mats.skin), len[1] / 2, 0, 0, 0, 0, -Math.PI / 2);
      d.add(seg2);
      if (st.nails) d.add(at(mesh(sphere(r * 0.7, 135, 0), mats.accent), len[1] + r * 0.2, r * 0.5, 0, 0, 0, 0, [0.9, 0.45, 0.9]));
      if (st.ring && i === 2) k.add(at(mesh(sphere(r * 1.25, 136, 0), mats.gold), len[0] * 0.3, 0, 0, 0, 0, 0, [0.5, 1, 1]));
      k.add(d);
      this.inner.add(k);
      this.fingers.push({ k, d });
    }
    // thumb: from the heel of the palm on the thumb side, angled out
    const tb = new Group();
    at(tb, -0.18 * pl, -0.12, -0.42 * pw);
    tb.add(at(mesh(capsule(st.thumb, 0.34, 137, 0.08), mats.skin), 0.17, 0, 0, 0, 0, -Math.PI / 2));
    const tt = new Group();
    at(tt, 0.34, 0, 0);
    tt.add(at(mesh(capsule(st.thumb * 0.92, 0.26, 138, 0.08), mats.skin), 0.13, 0, 0, 0, 0, -Math.PI / 2));
    tb.add(tt);
    this.inner.add(tb);
    this.thumb = { tb, tt };
    this.mode = 'relax';
    this.pose = { ...MODES.relax };
  }

  // ha: grip centre · fd: forearm direction (elbow → hand) · mode: relax | grip | stick | flat
  // face: the body's facing direction (for palms flat on the floor)
  place(ha, fd, mode = 'relax', face = FWD) {
    const P = MODES[mode] || MODES.relax;
    this.mode = mode;
    this.pose = P;
    const sg = this.side === 'r' ? 1 : -1;
    // work in right-hand space (mirror the left hand's inputs through the body's midplane)
    vX.copy(fd); vX.z *= sg; vX.normalize();
    if (mode === 'flat') {
      // palm on the floor, fingers forward (a bent wrist, as in a push-up)
      vY.copy(UP);
      vX.copy(face); vX.z *= sg; orth(vX, vY);
      vZ.crossVectors(vX, vY);
    } else if (mode === 'grip') {
      // a bar across the body runs through the fist
      vZ.copy(SIDE); orth(vZ, vX);
      vY.crossVectors(vZ, vX);
    } else if (mode === 'stick') {
      // the held thing stands up out of the thumb side of the fist
      vZ.copy(UP).negate(); if (Math.abs(vZ.dot(vX)) > 0.95) vZ.copy(face).negate(); orth(vZ, vX);
      vY.crossVectors(vZ, vX);
    } else {
      // relaxed: back of the hand faces out, palm toward the body, thumb forward
      vY.copy(SIDE); orth(vY, vX);
      vZ.crossVectors(vX, vY);
    }
    const m = [[vX.x, vY.x, vZ.x], [vX.y, vY.y, vZ.y], [vX.z, vY.z, vZ.z]];
    // left hand: reflect back through the midplane (conjugate by the z-mirror)
    if (sg < 0) { m[0][2] = -m[0][2]; m[1][2] = -m[1][2]; m[2][0] = -m[2][0]; m[2][1] = -m[2][1]; }
    quatFromBasis(this.group.quaternion, m);
    this.group.position.copy(ha);
    this.group.scale.set(this.size, this.size, this.size * sg);
    // curl the fingers round the grip, the thumb over them
    this.inner.position.set(0, P.lift, 0);
    for (const f of this.fingers) { f.k.rotation.z = -P.curl * 1.45; f.d.rotation.z = -P.curl * 1.65; }
    this.thumb.tb.rotation.set(P.thumb * 0.6, 0.55 - P.thumb * 0.35, -0.35 - P.thumb * 0.95);
    this.thumb.tt.rotation.z = -0.25 - P.thumb * 0.7;
  }

  // the direction a held stick points (the thumb side of the fist), world-ish (character space)
  stickDir(out = new Vector3()) {
    return out.set(0, 0, -1).applyQuaternion(this.group.quaternion).multiplyScalar(this.side === 'r' ? 1 : -1).normalize();
  }
  // lowest point (character space) for floor contact
  bottom() {
    const s = this.size;
    if (this.mode === 'flat') return this.group.position.y + s * (this.pose.lift - this.st.palm[1] * 0.5);
    tmp.set(1, 0, 0).applyQuaternion(this.group.quaternion);
    return this.group.position.y - s * (0.55 + Math.max(0, -tmp.y) * 0.75);
  }
}
