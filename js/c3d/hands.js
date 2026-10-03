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
  jolene: { n: 4, fr: 0.14, fl: [0.52, 0.44], palm: [0.98, 0.36, 0.96], thumb: 0.17, nails: true },
  dee: { n: 4, fr: 0.17, fl: [0.44, 0.38], palm: [1, 0.42, 1], thumb: 0.2, glove: true },
  fern: { n: 3, fr: 0.15, fl: [0.6, 0.52], palm: [0.96, 0.36, 0.94], thumb: 0.16 },
  merlin: { n: 4, fr: 0.13, fl: [0.58, 0.5], palm: [1.02, 0.36, 0.96], thumb: 0.15, ring: true },
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

// one smooth finger segment from its joint (x = 0) to the next (x = len). The rounded ends are
// centred on the joints and circular in the bending plane, so a bent finger stays seamless.
function bar(len, thick, width, mat, seed) {
  return at(mesh(capsule(0.5, Math.max(0.01, len / thick), seed, 0), mat), len / 2, 0, 0, 0, 0, -Math.PI / 2, [thick, thick, width]);
}

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
    this.inner.add(at(mesh(sphere(0.5, 130, 0.03, 36), palmMat), -0.1, 0, 0, 0, 0, 0, [pl * 1.04, pt, pw]));
    // the wrist: a soft, stretched ball the forearm runs into (covers the arm's open end)
    this.cuff = at(mesh(sphere(1, 139, 0.04), palmMat), -0.56, 0, 0, 0, 0, 0, [cuff / size * 1.5, cuff / size * 0.98, cuff / size * 0.98]);
    this.group.add(this.cuff);
    // fingers sit side by side and touch, so the hand reads as one smooth piece of clay
    this.fingers = [];
    const n = st.n;
    const fw = st.paddle || Math.min(st.fr * 2.2, (pw * 0.96) / ((n - 1) * 0.88 + 1)); // finger width
    const ft = st.paddle ? st.fr * 1.6 : st.fr * 2; // finger thickness
    const gap = fw * 0.88;
    for (let i = 0; i < n; i++) {
      const z = (i - (n - 1) / 2) * gap;
      const len = st.fl.map((l) => l * (n === 1 ? 1 : 1 - Math.abs(i / (n - 1) - 0.4) * 0.22));
      const k = new Group();
      at(k, 0.3 * pl, 0, z);
      k.add(bar(len[0], ft, fw, mats.skin, 132));
      const d = new Group();
      at(d, len[0], 0, 0);
      d.add(bar(len[1], ft, fw, mats.skin, 134));
      if (st.nails) d.add(at(mesh(sphere(0.5, 135, 0), mats.accent), len[1] + ft * 0.14, ft * 0.3, 0, 0, 0, 0, [fw * 0.62, ft * 0.32, fw * 0.66]));
      if (st.ring && i === 2) k.add(at(mesh(sphere(0.5, 136, 0), mats.gold), len[0] * 0.35, 0, 0, 0, 0, 0, [fw * 0.4, ft * 1.22, fw * 1.18]));
      k.add(d);
      this.inner.add(k);
      this.fingers.push({ k, d });
    }
    // a roll of clay across the knuckles fills the grooves where the fingers meet the palm
    if (n > 1) this.inner.add(at(mesh(capsule(0.5, ((n - 1) * gap) / ft, 140, 0), mats.skin), 0.3 * pl, 0, 0, Math.PI / 2, 0, 0, [ft, ft, ft]));
    // thumb: a fleshy pad at the heel of the palm, then two smooth segments angled out
    const th = st.thumb * 2;
    this.inner.add(at(mesh(sphere(0.5, 141, 0.02), mats.skin), -0.2 * pl, -0.06, -0.3 * pw, 0, 0.5, 0, [0.5 * pl, pt * 0.86, th * 1.5]));
    const tb = new Group();
    at(tb, -0.18 * pl, -0.12, -0.42 * pw);
    tb.add(bar(0.34, th, th, mats.skin, 137));
    const tt = new Group();
    at(tt, 0.34, 0, 0);
    tt.add(bar(0.26, th, th, mats.skin, 138));
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
