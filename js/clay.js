// Huff n Puff — claymation figure engine.
// A tiny 2D rig (side view, facing right) rendered as lumpy clay tubes,
// animated "on twos" with a boiling texture to mimic stop-motion clay.

const L = { shoulder: 46, torso: 55, neck: 7, headR: 18, upper: 31, fore: 29, thigh: 44, shin: 43, foot: 17 };
const R = {
  pelvis: 15, shoulder: 13, neck: 9, head: 19,
  rElbow: 6, lElbow: 6, rHand: 7, lHand: 7,
  rKnee: 8, lKnee: 8, rAnkle: 6, lAnkle: 6, rToe: 6, lToe: 6, rHeel: 6, lHeel: 6,
};
const POINTS = Object.keys(R);
export { R as JOINT_R };

const D2R = Math.PI / 180;
const dir = (a) => [Math.sin(a * D2R), Math.cos(a * D2R)];
const upv = (t) => [Math.sin(t * D2R), -Math.cos(t * D2R)];
const add = (p, v, s) => [p[0] + v[0] * s, p[1] + v[1] * s];
const lerp = (a, b, u) => a + (b - a) * u;

export const DEFAULT_LOOK = {
  skin: '#e9a77d', shirt: '#ff6b57', shorts: '#3d3a6b', shoes: '#2ec4b6', hair: '#3b2a20', band: '#ffc93c',
};

export const SKINS = ['#f6d1b5', '#e9a77d', '#c98a5e', '#9c6644', '#6e4529', '#4a2e1c'];
export const SHIRTS = ['#ff6b57', '#2ec4b6', '#8f7cff', '#ffc93c', '#4f9dff', '#ff7eb6', '#5bc46a', '#2b2340'];
export const HAIRS = ['#3b2a20', '#1b1512', '#8a4b22', '#d9a441', '#b8b0a8', '#c2452d'];

/* ---------- color helpers ---------- */
function hexToRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  const f = (c) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt);
  return '#' + [f(r), f(g), f(b)].map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
}

/* ---------- forward kinematics ---------- */
const DEF = { t: 0, ra: [6, 10], la: [-4, 0], rl: [2, 0], ll: [-2, 0], lift: 0, x: 0, y: 0, rot: 0 };

// 3D helpers: points are [x, y, z] (side view x/y, z toward the near side; right limbs +z)
const rot3 = (v, k, a) => {
  // Rodrigues: rotate v about unit axis k by a degrees
  if (!a) return v;
  const r = a * D2R, c = Math.cos(r), s = Math.sin(r);
  const d = (k[0] * v[0] + k[1] * v[1] + k[2] * v[2]) * (1 - c);
  return [
    v[0] * c + (k[1] * v[2] - k[2] * v[1]) * s + k[0] * d,
    v[1] * c + (k[2] * v[0] - k[0] * v[2]) * s + k[1] * d,
    v[2] * c + (k[0] * v[1] - k[1] * v[0]) * s + k[2] * d,
  ];
};
const add3 = (p, v, s = 1) => [p[0] + v[0] * s, p[1] + v[1] * s, (p[2] || 0) + v[2] * s];
const ab2 = (v) => (Array.isArray(v) ? v : [v || 0, v || 0]);

// Limbs move in the side (sagittal) plane by their angles, then leave it:
//   ab  [upper, lower]  — lift each segment out to the side about the body's front-to-back axis
//                         (jumping-jack arms, wide stances; 90 = straight out, 180 = overhead)
//   sw                  — swing the whole limb about the spine (knees out, arms twisting side to side)
//   to (legs)           — turn the toes out;  z (legs) — keep the ankle this far out to the side
// Positive always means away from the body's midline for that side.
function fk(p) {
  const t = p.t ?? 0;
  const n = p.n ?? t;
  const P = [0, 0, 0];
  const up = upv(t);
  const S = add3(P, [up[0], up[1], 0], L.shoulder);
  const N = add3(P, [up[0], up[1], 0], L.torso);
  const H = add(N, upv(n), L.neck + L.headR);
  H[2] = 0;
  const fwd = [Math.cos(t * D2R), Math.sin(t * D2R), 0]; // the chest's facing direction
  const spine = [up[0], up[1], 0];
  const seg = (a, len, sg, abd, sw) => {
    let v = [...dir(a), 0];
    v = rot3(v, fwd, sg * abd);
    v = rot3(v, spine, sg * sw);
    return [v[0] * len, v[1] * len, v[2] * len];
  };
  const arm = (a, sg, abd, sw) => {
    const [a1, a2] = ab2(abd);
    const E = add3(S, seg(a[0], L.upper, sg, a1, sw), 1);
    return [E, add3(E, seg(a[1], L.fore, sg, a2, sw), 1)];
  };
  const leg = (l, fo, sg, abd, sw, to, z) => {
    let [a1, a2] = ab2(abd);
    const K = add3(P, seg(l[0], L.thigh, sg, a1, sw), 1);
    // a planted foot keeps its sideways spot: solve the shin's side angle to land the ankle at z
    if (z != null) {
      let lo = -90, hi = 90;
      for (let i = 0; i < 24; i++) {
        const m = (lo + hi) / 2;
        if (sg * (K[2] + seg(l[1], L.shin, sg, m, sw)[2]) < Math.abs(z)) lo = m; else hi = m;
      }
      a2 = (lo + hi) / 2;
    }
    const A = add3(K, seg(l[1], L.shin, sg, a2, sw), 1);
    const fd = rot3(seg(l[1] + fo, 1, sg, 0, sw), spine, sg * (to || 0));
    return [K, A, add3(A, fd, L.foot), add3(A, fd, -4)];
  };
  const [rElbow, rHand] = arm(p.ra, 1, p.rab, p.rasw);
  const [lElbow, lHand] = arm(p.la, -1, p.lab, p.lasw);
  const [rKnee, rAnkle, rToe, rHeel] = leg(p.rl, p.rfo ?? 90, 1, p.rlab, p.rlsw, p.rto, p.rz);
  const [lKnee, lAnkle, lToe, lHeel] = leg(p.ll, p.lfo ?? 90, -1, p.llab, p.llsw, p.lto, p.lz);
  return { pelvis: P, shoulder: S, neck: N, head: H, rElbow, rHand, lElbow, lHand, rKnee, rAnkle, rToe, rHeel, lKnee, lAnkle, lToe, lHeel };
}

function rotatePts(pts, th) {
  if (!th) return pts;
  const c = Math.cos(th), s = Math.sin(th);
  const o = {};
  for (const k in pts) {
    const [x, y, z = 0] = pts[k];
    o[k] = [x * c - y * s, x * s + y * c, z];
  }
  return o;
}

// Rotation that puts two contact points' outer surfaces on the same level.
function levelAngle(pts, a, b) {
  const dx = pts[a][0] - pts[b][0];
  const dy = pts[a][1] - pts[b][1];
  const c = R[b] - R[a];
  const Rr = Math.hypot(dx, dy);
  if (Rr < 1e-6 || Math.abs(c) > Rr) return 0;
  const phi = Math.atan2(dx, dy);
  const ac = Math.acos(c / Rr);
  const norm = (x) => Math.atan2(Math.sin(x), Math.cos(x));
  const c1 = norm(phi + ac), c2 = norm(phi - ac);
  return Math.abs(c1) < Math.abs(c2) ? c1 : c2;
}

/* ---------- keyframe preparation ---------- */
const AB = ['rab', 'lab', 'rlab', 'llab'];
const SW = ['rasw', 'lasw', 'rlsw', 'llsw', 'rto', 'lto'];
const KEYS = ['t', 'n', 'lift', 'x', 'y', 'rfo', 'lfo', 'rot', 'tw', ...SW];

function normPose(p, anim) {
  const q = { ...DEF, ...p };
  if (q.n === undefined) q.n = q.t;
  q.ra = [...q.ra]; q.la = [...q.la]; q.rl = [...q.rl]; q.ll = [...q.ll];
  for (const k of AB) q[k] = ab2(q[k]);
  for (const k of SW) q[k] = q[k] || 0;
  // feet stay flat (absolute 90°) unless an offset is given; hanging feet follow the shin
  const hang = anim.anchor === 'hands';
  if (p.rfo === undefined) q.rfo = hang ? 90 : 90 - q.rl[1];
  if (p.lfo === undefined) q.lfo = hang ? 90 : 90 - q.ll[1];
  const lv = p.lv ?? anim.lv;
  q.rot = 0;
  if (lv) {
    const pts = fk(q);
    if (Array.isArray(lv[1])) {
      // choose the support contact that keeps the others above ground
      // valid = no other candidate dips below the ground; prefer the farthest support (the extended limb)
      let best = 0, bestScore = Infinity;
      for (const cand of lv[1]) {
        const th = levelAngle(pts, lv[0], cand);
        const r = rotatePts(pts, th);
        const base = r[lv[0]][1] + R[lv[0]];
        let pen = 0;
        for (const o of lv[1]) if (o !== cand) pen = Math.max(pen, r[o][1] + R[o] - base);
        const dist = Math.hypot(pts[cand][0] - pts[lv[0]][0], pts[cand][1] - pts[lv[0]][1]);
        const score = (pen > 1 ? 1000 + pen : 0) - dist;
        if (score < bestScore) { bestScore = score; best = th; }
      }
      q.rot = best;
    } else q.rot = levelAngle(pts, lv[0], lv[1]);
  }
  q.ax = p.ax ?? anim.ax ?? (anim.anchor === 'hands' ? 'rHand' : anim.anchor === 'abs' ? null : 'rAnkle');
  return q;
}

function swapSides(p) {
  return { ...p, ra: p.la, la: p.ra, rl: p.ll, ll: p.rl, rfo: p.lfo, lfo: p.rfo, rab: p.lab, lab: p.rab, rlab: p.llab, llab: p.rlab, rasw: p.lasw, lasw: p.rasw, rlsw: p.llsw, llsw: p.rlsw, rto: p.lto, lto: p.rto, rz: p.lz, lz: p.rz };
}
export { swapSides as swap };

// Claymation timing: hold each pose a beat, then move with a little anticipation and overshoot.
const HOLD = 0.14;
const backInOut = (x) => {
  const c1 = 1.05, c2 = c1 * 1.525;
  return x < 0.5 ? ((2 * x) ** 2 * ((c2 + 1) * 2 * x - c2)) / 2 : ((2 * x - 2) ** 2 * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2;
};
const easeInOut = (u, H = HOLD) => (u <= H ? 0 : u >= 1 - H ? 1 : backInOut((u - H) / (1 - 2 * H)));

// Move speed (profile setting 1-5) changes the *cadence* of reps, not the film speed: the movement
// between poses keeps its natural pace and the pauses at each end grow or shrink. Only once the pauses
// are gone does a faster setting speed the movement itself. Same rhythm for every character.
export const SPEEDS = [[1, 'Slowest'], [2, 'Slow'], [3, 'Normal'], [4, 'Fast'], [5, 'Fastest']];
const CADENCE = { 1: 0.6, 2: 0.8, 3: 1, 4: 1.25, 5: 1.55 };
export const cadenceFor = (level) => CADENCE[level] || 1;
// the hold fraction at each end of a move for a cadence (1 = the authored timing)
export const holdFor = (cad) => Math.max(0, (1 - Math.min(1, (1 - 2 * HOLD) * cad)) / 2);
const angLerp = (a, b, u, shortest) => {
  if (shortest) {
    let d = ((b - a + 540) % 360) - 180;
    return a + d * u;
  }
  return lerp(a, b, u);
};

function blendPose(A, B, u, shortest) {
  const o = {};
  for (const k of KEYS) o[k] = lerp(A[k] ?? 0, B[k] ?? 0, u);
  for (const k of ['ra', 'la', 'rl', 'll']) o[k] = [angLerp(A[k][0], B[k][0], u, shortest), angLerp(A[k][1], B[k][1], u, shortest)];
  for (const k of AB) o[k] = [lerp(A[k][0], B[k][0], u), lerp(A[k][1], B[k][1], u)];
  for (const k of ['rz', 'lz']) if (A[k] != null && B[k] != null) o[k] = lerp(A[k], B[k], u);
  return o;
}

// tw: the upper body turning about the spine (degrees, + = chest toward the near side). The 2D side
// view can't show it, so it rides along on the points for the 3D body (and the pose checker) to apply.
function withTwist(pts, p) {
  Object.defineProperty(pts, 'tw', { value: p.tw || 0, enumerable: false });
  return pts;
}

/* ---------- placement on the stage ---------- */
function placePose(p, anim, axA, axB, u) {
  let pts = rotatePts(fk(p), p.rot);
  const anchor = anim.anchor || 'floor';
  let dx = 0, dy = 0;
  if (anchor === 'floor') {
    let m = -Infinity;
    for (const k of POINTS) m = Math.max(m, pts[k][1] + R[k]);
    dy = -m - (p.lift || 0);
  } else if (anchor === 'hands') {
    dy = -pts.rHand[1] - (p.lift || 0);
  } else {
    dy = (p.y || 0) - pts.pelvis[1];
  }
  const ox = (name) => (name ? -pts[name][0] : (p.x || 0) - pts.pelvis[0]);
  dx = lerp(ox(axA), ox(axB), u) + (anim.anchor === 'abs' ? 0 : p.x || 0);
  const o = {};
  for (const k in pts) o[k] = [pts[k][0] + dx, pts[k][1] + dy, pts[k][2] || 0];
  return o;
}

export class Rig {
  constructor(anim) {
    this.anim = anim;
    this.frames = anim.frames.map((f) => normPose(f, anim));
    const n = this.frames.length;
    const w = anim.d || new Array(n).fill(1);
    const tot = w.reduce((a, b) => a + b, 0);
    this.cum = [0];
    for (let i = 0; i < n; i++) this.cum.push(this.cum[i] + w[i] / tot);
    this.tempo = anim.tempo || 2;
    this.bbox = this.computeBBox();
  }
  // phase in [0,1) · hold: the pause at each end of a move (see holdFor)
  pose(phase, hold = HOLD) {
    const n = this.frames.length;
    if (n === 1) {
      const f = this.frames[0];
      const b = Math.sin(phase * Math.PI * 2);
      const p = { ...f, ra: [...f.ra], la: [...f.la], rl: f.rl, ll: f.ll };
      // idle breathing for holds
      p.t = f.t + b * 1.2; p.n = f.n + b * 2;
      p.ra = [f.ra[0] + b * 1.5, f.ra[1] + b * 1.5];
      return { pts: withTwist(placePose(p, this.anim, f.ax, f.ax, 0), p), pose: p };
    }
    phase = ((phase % 1) + 1) % 1;
    let i = 0;
    while (i < n - 1 && phase >= this.cum[i + 1]) i++;
    const u0 = (phase - this.cum[i]) / (this.cum[i + 1] - this.cum[i]);
    const uc = Math.max(0, Math.min(1, u0));
    const u = this.anim.ease === 'linear' ? uc : easeInOut(uc, hold);
    const A = this.frames[i], B = this.frames[(i + 1) % n];
    const p = blendPose(A, B, u, this.anim.shortest);
    return { pts: withTwist(placePose(p, this.anim, A.ax, B.ax, u), p), pose: p };
  }
  computeBBox() {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const N = this.frames.length === 1 ? 1 : 24;
    for (let i = 0; i < N; i++) {
      const { pts } = this.pose(i / N);
      for (const k of POINTS) {
        const r = R[k] + (k === 'head' ? 6 : 2);
        x0 = Math.min(x0, pts[k][0] - r); x1 = Math.max(x1, pts[k][0] + r);
        y0 = Math.min(y0, pts[k][1] - r); y1 = Math.max(y1, pts[k][1] + r);
      }
    }
    return { x0, y0, x1, y1 };
  }
}

/* ---------- drawing ---------- */
const f1 = (n) => (Math.round(n * 10) / 10).toString();
const P = (p) => f1(p[0]) + ' ' + f1(p[1]);

function tube(pts, w, col, extra = '') {
  const d = 'M' + pts.map(P).join('L');
  const sh = shade(col, -0.25);
  const hi = shade(col, 0.35);
  return (
    `<path d="${d}" stroke="${sh}" stroke-width="${f1(w)}"${extra}/>` +
    `<path d="${d}" transform="translate(-.8 -1.2)" stroke="${col}" stroke-width="${f1(w - 3.2)}"${extra}/>` +
    `<path d="${d}" transform="translate(${f1(-w * 0.16)} ${f1(-w * 0.2)})" stroke="${hi}" stroke-width="${f1(w * 0.26)}" opacity=".55"${extra}/>`
  );
}
function blob(c, r, col) {
  const sh = shade(col, -0.25), hi = shade(col, 0.4);
  return (
    `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(r)}" fill="${sh}"/>` +
    `<circle cx="${f1(c[0] - 0.8)}" cy="${f1(c[1] - 1.2)}" r="${f1(r - 1.6)}" fill="${col}"/>` +
    `<circle cx="${f1(c[0] - r * 0.35)}" cy="${f1(c[1] - r * 0.4)}" r="${f1(r * 0.32)}" fill="${hi}" opacity=".55"/>`
  );
}
const mix = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
const norm = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };

function drawHead(pts, look, blink) {
  const H = pts.head;
  const u = norm([H[0] - pts.neck[0], H[1] - pts.neck[1]]);
  const f = [-u[1], u[0]];
  const at = (a, b) => [H[0] + f[0] * a + u[0] * b, H[1] + f[1] * a + u[1] * b];
  const r = L.headR;
  let s = '';
  // hair (back of head)
  s += blob(at(-3, 2), r + 0.5, look.hair);
  // face
  s += `<circle cx="${P(at(2, -1)).split(' ')[0]}" cy="${P(at(2, -1)).split(' ')[1]}" r="${r - 1.5}" fill="${shade(look.skin, -0.2)}"/>`;
  const fc = at(1.4, -2);
  s += `<circle cx="${f1(fc[0])}" cy="${f1(fc[1])}" r="${r - 3}" fill="${look.skin}"/>`;
  const hl = at(-2, 6);
  s += `<circle cx="${f1(hl[0] - 3)}" cy="${f1(hl[1] - 2)}" r="5" fill="${shade(look.skin, 0.4)}" opacity=".45"/>`;
  // ear
  const ear = at(-3, -2);
  s += `<circle cx="${f1(ear[0])}" cy="${f1(ear[1])}" r="4.2" fill="${shade(look.skin, -0.15)}"/><circle cx="${f1(ear[0] - 0.5)}" cy="${f1(ear[1] - 0.5)}" r="2.2" fill="${shade(look.skin, -0.3)}"/>`;
  // headband
  const b1 = at(-r + 1, 7), b2 = at(r - 3, 7.5);
  s += `<path d="M${P(b1)}L${P(b2)}" stroke="${shade(look.band, -0.25)}" stroke-width="6.5"/><path d="M${P(b1)}L${P(b2)}" transform="translate(-.5 -1)" stroke="${look.band}" stroke-width="4"/>`;
  const knot = at(-r + 1, 6);
  s += `<path d="M${P(knot)}L${P(at(-r - 6, 2))}" stroke="${look.band}" stroke-width="4"/>`;
  // nose
  const nose = at(r - 1, -2);
  s += `<circle cx="${f1(nose[0])}" cy="${f1(nose[1])}" r="4.2" fill="${shade(look.skin, -0.12)}"/><circle cx="${f1(nose[0] - 0.8)}" cy="${f1(nose[1] - 1)}" r="2.4" fill="${shade(look.skin, 0.12)}"/>`;
  // eye
  const eye = at(8.5, 2.5);
  if (blink) s += `<path d="M${P(at(6.5, 2.5))}L${P(at(11, 2.5))}" stroke="#231a2e" stroke-width="2"/>`;
  else s += `<ellipse cx="${f1(eye[0])}" cy="${f1(eye[1])}" rx="2.6" ry="3.4" transform="rotate(${f1(Math.atan2(u[1], u[0]) / D2R + 90)} ${P(eye).replace(' ', ' ')})" fill="#231a2e"/><circle cx="${f1(eye[0] + 0.9)}" cy="${f1(eye[1] - 1.1)}" r="1" fill="#fff"/>`;
  // brow
  s += `<path d="M${P(at(5.5, 7.5))}Q${P(at(8.5, 9))} ${P(at(11.5, 7.5))}" stroke="${shade(look.hair, 0)}" stroke-width="1.8" fill="none"/>`;
  // cheek
  const ch = at(6, -4.5);
  s += `<circle cx="${f1(ch[0])}" cy="${f1(ch[1])}" r="3.4" fill="#ff7a7a" opacity=".45"/>`;
  // mouth
  s += `<path d="M${P(at(9.5, -6))}Q${P(at(12.5, -9.5))} ${P(at(15, -6.5))}" stroke="#6b2a2a" stroke-width="1.8" fill="none"/>`;
  return s;
}

function drawFigure(pts, look, opt = {}) {
  const far = (c) => shade(c, -0.14);
  const fs = far(look.skin), fsh = far(look.shirt), fsho = far(look.shorts), fshoe = far(look.shoes);
  let s = '<g fill="none" stroke-linecap="round" stroke-linejoin="round">';
  // far arm
  const lSleeve = mix(pts.shoulder, pts.lElbow, 0.45);
  if (opt.propsBack) s += opt.propsBack;
  s += tube([pts.shoulder, pts.lElbow, pts.lHand], 12.5, fs);
  s += tube([pts.shoulder, lSleeve], 15, fsh);
  s += blob(pts.lHand, 6.6, fs);
  // far leg
  s += tube([pts.pelvis, pts.lKnee, pts.lAnkle], 16, fs);
  s += tube([pts.pelvis, mix(pts.pelvis, pts.lKnee, 0.5)], 19, fsho);
  s += tube([pts.lHeel, pts.lToe], 12, fshoe);
  // torso
  const waist = mix(pts.pelvis, pts.neck, 0.22);
  s += tube([pts.pelvis, mix(pts.pelvis, pts.neck, 0.82)], 33, look.shirt);
  s += tube([pts.pelvis, waist], 33, look.shorts);
  s += tube([mix(pts.pelvis, pts.neck, 0.84), pts.neck], 12, look.skin);
  // head
  s += drawHead(pts, look, opt.blink);
  // near leg
  s += tube([pts.pelvis, pts.rKnee, pts.rAnkle], 16.5, look.skin);
  s += tube([pts.pelvis, mix(pts.pelvis, pts.rKnee, 0.5)], 19.5, look.shorts);
  s += tube([pts.rHeel, pts.rToe], 12.5, look.shoes);
  s += tube([mix(pts.rHeel, pts.rToe, 0.15), mix(pts.rHeel, pts.rToe, 0.15)], 7, '#ffffff');
  // near arm
  const rSleeve = mix(pts.shoulder, pts.rElbow, 0.45);
  s += tube([pts.shoulder, pts.rElbow, pts.rHand], 13, look.skin);
  s += tube([pts.shoulder, rSleeve], 15.5, look.shirt);
  if (opt.propsFront) s += opt.propsFront;
  s += blob(pts.rHand, 6.8, look.skin);
  s += '</g>';
  return s;
}

/* ---------- props ---------- */
const WOOD = '#c98b55', METAL = '#5b5f7a', PLATE = '#2b2340', KB = '#3a3550';

function dumbbell(c, axis, near) {
  const a = norm(axis);
  const p = [-a[1], a[0]];
  const len = 13;
  const e1 = add(c, p, -len), e2 = add(c, p, len);
  let s = tube([e1, e2], 4.5, METAL);
  const col = near ? '#ff8a3d' : shade('#ff8a3d', -0.2);
  s += tube([add(e1, p, -1), add(e1, p, 3)], 13, col) + tube([add(e2, p, -3), add(e2, p, 1)], 13, col);
  return s;
}
function plate(c, r = 21, col = PLATE) {
  return blob(c, r, col) + `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(r * 0.36)}" fill="${shade(col, 0.25)}"/>` +
    `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="3" fill="${METAL}"/>`;
}
function kettlebell(c) {
  const body = [c[0], c[1] + 16];
  return `<path d="M${f1(c[0] - 8)} ${f1(c[1] + 6)}Q${f1(c[0])} ${f1(c[1] - 12)} ${f1(c[0] + 8)} ${f1(c[1] + 6)}" stroke="${KB}" stroke-width="5" fill="none"/>` + blob(body, 13, KB);
}
function medBall(c) { return blob(c, 13, '#8f7cff'); }

function handProps(type, pts) {
  let back = '', front = '';
  if (type === 'dumbbell' || type === 'dumbbells') {
    const axR = [pts.rHand[0] - pts.rElbow[0], pts.rHand[1] - pts.rElbow[1]];
    const axL = [pts.lHand[0] - pts.lElbow[0], pts.lHand[1] - pts.lElbow[1]];
    back += dumbbell(pts.lHand, [axL[1], -axL[0]], false);
    front += dumbbell(pts.rHand, [axR[1], -axR[0]], true);
  } else if (type === 'dumbbell1') {
    const axR = [pts.rHand[0] - pts.rElbow[0], pts.rHand[1] - pts.rElbow[1]];
    front += dumbbell(pts.rHand, [axR[1], -axR[0]], true);
  } else if (type === 'barbell') {
    front += plate(pts.rHand);
  } else if (type === 'barbellBack') {
    // bar rests on the upper back, behind the neck
    const u = norm([pts.neck[0] - pts.pelvis[0], pts.neck[1] - pts.pelvis[1]]);
    const c = mix(pts.shoulder, pts.neck, 0.5);
    back += plate([c[0] + u[1] * 12, c[1] - u[0] * 12]);
  } else if (type === 'kettlebell') {
    front += kettlebell(mix(pts.rHand, pts.lHand, 0.5));
  } else if (type === 'goblet') {
    const c = mix(pts.rHand, pts.lHand, 0.5);
    front += blob([c[0] + 6, c[1] + 2], 12, KB);
  } else if (type === 'medball') {
    front += medBall(mix(pts.rHand, pts.lHand, 0.5));
  }
  return { back, front };
}

function staticProp(pr, bbox, G) {
  switch (pr.type) {
    case 'mat': {
      const x0 = (pr.x0 ?? bbox.x0 - 8), x1 = (pr.x1 ?? bbox.x1 + 8);
      const col = pr.color || '#8f7cff';
      return `<rect x="${f1(x0)}" y="${f1(G - 4)}" width="${f1(x1 - x0)}" height="8" rx="4" fill="${shade(col, -0.2)}"/><rect x="${f1(x0 + 1)}" y="${f1(G - 5)}" width="${f1(x1 - x0 - 2)}" height="5" rx="2.5" fill="${col}"/>`;
    }
    case 'bench': {
      const { x0, x1, top } = pr;
      const legs = `<rect x="${f1(x0 + 8)}" y="${f1(top)}" width="9" height="${f1(G - top)}" rx="3" fill="${METAL}"/><rect x="${f1(x1 - 17)}" y="${f1(top)}" width="9" height="${f1(G - top)}" rx="3" fill="${METAL}"/>`;
      return legs + `<rect x="${f1(x0)}" y="${f1(top)}" width="${f1(x1 - x0)}" height="12" rx="6" fill="${shade('#ff6b57', -0.25)}"/><rect x="${f1(x0 + 1)}" y="${f1(top - 1)}" width="${f1(x1 - x0 - 2)}" height="9" rx="4.5" fill="#ff6b57"/><rect x="${f1(x0 + 6)}" y="${f1(top + 1)}" width="${f1((x1 - x0) * 0.5)}" height="2.5" rx="1.2" fill="#ffb0a5" opacity=".7"/>`;
    }
    case 'box': {
      const { x0, x1, top } = pr;
      return `<rect x="${f1(x0)}" y="${f1(top)}" width="${f1(x1 - x0)}" height="${f1(G - top)}" rx="7" fill="${shade(WOOD, -0.2)}"/><rect x="${f1(x0 + 1)}" y="${f1(top - 1)}" width="${f1(x1 - x0 - 2)}" height="${f1(G - top - 2)}" rx="6" fill="${WOOD}"/><rect x="${f1(x0 + 6)}" y="${f1(top + 4)}" width="${f1((x1 - x0) * 0.4)}" height="3" rx="1.5" fill="#f0c290" opacity=".7"/>`;
    }
    case 'bar': {
      const y = pr.y ?? 0;
      const x0 = bbox.x0 - 30, x1 = bbox.x1 + 30;
      return `<rect x="${f1(x0)}" y="${f1(y - 4)}" width="12" height="${f1(G - y + 4)}" rx="5" fill="${shade(WOOD, -0.15)}"/><rect x="${f1(x1 - 12)}" y="${f1(y - 4)}" width="12" height="${f1(G - y + 4)}" rx="5" fill="${shade(WOOD, -0.15)}"/>` +
        `<rect x="${f1(x0)}" y="${f1(y - 4)}" width="${f1(x1 - x0)}" height="8" rx="4" fill="${METAL}"/><rect x="${f1(x0 + 4)}" y="${f1(y - 3)}" width="${f1(x1 - x0 - 8)}" height="2.5" rx="1.2" fill="#9ea3c0"/>`;
    }
    case 'wall': {
      const x = pr.x;
      const w = 22;
      const xx = pr.side === 'right' ? x : x - w;
      return `<rect x="${f1(xx)}" y="${f1(G - 230)}" width="${w}" height="232" rx="8" fill="${shade('#f4a259', -0.2)}"/><rect x="${f1(xx + 2)}" y="${f1(G - 230)}" width="${w - 4}" height="230" rx="7" fill="#f4a259"/><rect x="${f1(xx + 5)}" y="${f1(G - 220)}" width="4" height="200" rx="2" fill="#ffd3a8" opacity=".6"/>`;
    }
  }
  return '';
}

function ropeProp(pts, phase) {
  // jump rope seen from the side: a narrow loop from the hands sweeping around the body
  const a = phase * Math.PI * 2;
  const H = mix(pts.rHand, pts.lHand, 0.5);
  const cx = pts.pelvis[0];
  const cy = (pts.head[1] + pts.rToe[1]) / 2;
  const ry = (pts.rToe[1] - pts.head[1]) / 2 + 22;
  const A = [cx + Math.sin(a) * 46, cy - Math.cos(a) * ry];
  const m = mix(H, A, 0.5);
  const pr = norm([-(A[1] - H[1]), A[0] - H[0]]);
  const w = 16;
  const d = `M${P(pts.rHand)}Q${P([m[0] + pr[0] * w, m[1] + pr[1] * w])} ${P(A)}Q${P([m[0] - pr[0] * w, m[1] - pr[1] * w])} ${P(pts.lHand)}`;
  return { d, behind: Math.sin(a) < 0 };
}

/* ---------- scene ---------- */
const VBW = 320, VBH = 250, GROUND = 222;

export function sceneFit(rig) {
  const anim = rig.anim;
  const G = anim.ground ?? (anim.anchor === 'hands' ? 225 : 0);
  let { x0, y0, x1, y1 } = rig.bbox;
  for (const pr of anim.props || []) {
    if (pr.type === 'bar') y0 = Math.min(y0, (pr.y ?? 0) - 10);
    if (pr.type === 'bench' || pr.type === 'box') { x0 = Math.min(x0, pr.x0); x1 = Math.max(x1, pr.x1); }
    if (pr.type === 'wall') { x0 = Math.min(x0, pr.x - 24); x1 = Math.max(x1, pr.x + 24); }
  }
  y1 = Math.max(y1, G);
  const availH = GROUND - 10;
  const s = Math.min(1, availH / (G - y0), (VBW - 40) / (x1 - x0));
  const cx = VBW / 2 - ((x0 + x1) / 2) * s;
  return { s, cx, G, bbox: { x0, y0, x1, y1 } };
}

let uid = 0;

function filterDef(id, seed, strong = true) {
  return `<filter id="${id}" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="${seed}" result="n"/>
<feDisplacementMap in="SourceGraphic" in2="n" scale="${strong ? 3.2 : 2.4}" xChannelSelector="R" yChannelSelector="G" result="w"/>
<feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="${seed + 11}" result="g"/>
<feColorMatrix in="g" type="matrix" values="0 0 0 0 0.1  0 0 0 0 0.05  0 0 0 0 0.12  0 0 0 -0.32 0.19" result="ga"/>
<feComposite in="ga" in2="w" operator="in" result="gin"/>
<feGaussianBlur in="w" stdDeviation="2.4" result="b"/>
<feSpecularLighting in="b" surfaceScale="3.5" specularConstant=".7" specularExponent="20" lighting-color="#fff6ea" result="s"><feDistantLight azimuth="235" elevation="50"/></feSpecularLighting>
<feComposite in="s" in2="w" operator="in" result="sin"/>
<feMerge><feMergeNode in="w"/><feMergeNode in="gin"/><feMergeNode in="sin"/></feMerge>
</filter>`;
}

const PALETTES = {
  strength: ['#ffe3d6', '#ffc7b0'],
  cardio: ['#fff1c9', '#ffd97a'],
  core: ['#e4defc', '#c9bdfb'],
  mobility: ['#d4f4ef', '#a5e6dc'],
  default: ['#ffe9d6', '#ffd0b0'],
};

function backdrop(cat, id) {
  const [a, b] = PALETTES[cat] || PALETTES.default;
  return `<defs><radialGradient id="bg${id}" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient></defs>
<rect width="${VBW}" height="${VBH}" fill="url(#bg${id})"/>
<circle cx="268" cy="46" r="20" fill="#fff" opacity=".35"/><circle cx="52" cy="70" r="11" fill="#fff" opacity=".3"/><circle cx="84" cy="38" r="6" fill="#fff" opacity=".3"/>
<rect x="-10" y="${GROUND}" width="${VBW + 20}" height="60" rx="16" fill="${shade(b, -0.12)}"/>
<rect x="-10" y="${GROUND - 2}" width="${VBW + 20}" height="8" rx="4" fill="${shade(b, 0.18)}" opacity=".7"/>`;
}

function shadowFor(pts, G) {
  let lowY = -Infinity, xs = [];
  for (const k of POINTS) {
    if (pts[k][1] + R[k] > G - 26) xs.push(pts[k][0]);
    lowY = Math.max(lowY, pts[k][1] + R[k]);
  }
  if (!xs.length) xs = [pts.pelvis[0]];
  const xa = Math.min(...xs), xb = Math.max(...xs);
  const gap = Math.max(0, G - lowY);
  const op = Math.max(0.08, 0.28 - gap / 120);
  return `<ellipse cx="${f1((xa + xb) / 2)}" cy="${f1(G + 1)}" rx="${f1((xb - xa) / 2 + 22)}" ry="6" fill="#2b2340" opacity="${f1(op * 100) / 100}"/>`;
}

function renderFrame(rig, fit, phase, look, opts = {}) {
  const { pts } = rig.pose(phase);
  const anim = rig.anim;
  let props = '';
  for (const pr of anim.props || []) props += staticProp(pr, fit.bbox, fit.G);
  let hp = { back: '', front: '' };
  if (anim.hold) hp = handProps(anim.hold, pts);
  let rope = null;
  if (anim.rope) {
    rope = ropeProp(pts, phase * (anim.ropeSpeed || 1));
    const r = `<path d="${rope.d}" stroke="#2b2340" stroke-width="2.6" fill="none"/>`;
    if (rope.behind) hp.back += r; else hp.front += r;
  }
  const fig = drawFigure(pts, look, { propsBack: hp.back, propsFront: hp.front, blink: opts.blink });
  return shadowFor(pts, fit.G) + props + fig;
}

function figureTransform(fit) {
  return `translate(${f1(fit.cx)} ${f1(GROUND - fit.G * fit.s)}) scale(${f1(fit.s * 1000) / 1000})`;
}

const rigCache = new Map();
export function rigFor(ex) {
  let r = rigCache.get(ex.id);
  if (!r) { r = new Rig(ex.anim); rigCache.set(ex.id, r); }
  return r;
}

// A static, lightweight SVG (thumbnails, lists).
// standalone: embeds its own filter so it can be used as an <img> source.
// bare: transparent background (no backdrop/floor).
export function clayStill(ex, look = DEFAULT_LOOK, phase, { standalone = false, bare = false } = {}) {
  const rig = rigFor(ex);
  const fit = sceneFit(rig);
  const id = 's' + ++uid;
  const ph = phase ?? ex.anim.still ?? (rig.frames.length > 1 ? rig.cum[1] : 0);
  const fid = standalone ? 'f' + id : 'clay-static';
  const head = standalone ? ` xmlns="http://www.w3.org/2000/svg" width="${VBW * 2}" height="${VBH * 2}"` : '';
  return `<svg${head} viewBox="0 0 ${VBW} ${VBH}" class="clay-svg" role="img" aria-label="${ex.name} clay illustration">${standalone ? `<defs>${filterDef(fid, 4, false)}</defs>` : ''}${bare ? '' : backdrop(ex.cat, id)}<g filter="url(#${fid})" transform="${figureTransform(fit)}">${renderFrame(rig, fit, ph, look)}</g></svg>`;
}

// A head-and-shoulders crop, used for avatars.
export function clayPortrait(ex, look = DEFAULT_LOOK, phase = 0.3) {
  const rig = rigFor(ex);
  const fit = sceneFit(rig);
  const { pts } = rig.pose(phase);
  const hx = fit.cx + pts.head[0] * fit.s;
  const hy = GROUND + (pts.head[1] - fit.G) * fit.s;
  const r = 40 * fit.s;
  const id = 'a' + ++uid;
  return `<svg viewBox="${f1(hx - r)} ${f1(hy - r * 0.8)} ${f1(r * 2)} ${f1(r * 2)}" class="clay-svg" role="img" aria-label="Your clay avatar">${backdrop('default', id)}<g filter="url(#clay-static)" transform="${figureTransform(fit)}">${renderFrame(rig, fit, phase, look)}</g></svg>`;
}

// A live 2D stop-motion animation (fallback when WebGL is unavailable).
export class SvgPlayer {
  constructor(el, ex, opts = {}) {
    this.el = el;
    this.look = opts.look || DEFAULT_LOOK;
    this.fps = opts.fps ?? 12;
    this.boil = opts.boil ?? true;
    this.speed = opts.speed ?? 1;
    this.playing = false;
    this.t = 0;
    this.setExercise(ex);
  }
  setExercise(ex) {
    this.ex = ex;
    this.rig = rigFor(ex);
    this.fit = sceneFit(this.rig);
    this.id = 'p' + ++uid;
    this.el.innerHTML = `<svg viewBox="0 0 ${VBW} ${VBH}" class="clay-svg" role="img" aria-label="${ex.name} clay animation"><defs>${filterDef('f' + this.id, 3)}</defs>${backdrop(ex.cat, this.id)}<g filter="url(#f${this.id})" transform="${figureTransform(this.fit)}"></g></svg>`;
    this.svg = this.el.querySelector('svg');
    this.g = this.svg.querySelector('g[filter]');
    this.turb = this.svg.querySelectorAll('feTurbulence');
    this.lastStep = -1;
    this.draw(true);
  }
  draw(force) {
    const stepT = this.fps ? Math.floor(this.t * this.fps) / this.fps : this.t;
    // stop-motion steps, or at most 30 redraws a second without it
    const step = Math.floor(this.t * (this.fps || 30));
    if (!force && step === this.lastStep) return;
    this.lastStep = step;
    const phase = stepT / this.rig.tempo;
    const blink = step % 41 === 0;
    this.g.innerHTML = renderFrame(this.rig, this.fit, phase, this.look, { blink });
    if (this.boil && this.turb.length) {
      const seed = (Math.floor(step / 2) % 5) + 1;
      this.turb[0].setAttribute('seed', seed);
    }
  }
  loop = (now) => {
    if (!this.playing) return;
    if (this.prev != null) this.t += ((now - this.prev) / 1000) * this.speed;
    this.prev = now;
    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  };
  play() {
    if (this.playing) return;
    this.playing = true;
    this.prev = null;
    this.raf = requestAnimationFrame(this.loop);
  }
  pause() { this.playing = false; cancelAnimationFrame(this.raf); }
  destroy() { this.pause(); this.el.innerHTML = ''; }
}

export const STATIC_FILTER = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${filterDef('clay-static', 4, false)}</defs></svg>`;

/* ---------- 3D with graceful fallback ---------- */
let mod3d = null;
export function load3D() {
  if (!mod3d) mod3d = import('./clay3d.js').then((m) => (m.supported() ? m : null)).catch((e) => { console.warn('3D clay unavailable', e); return null; });
  return mod3d;
}

// Live claymation player: shows a 2D still instantly, then upgrades to the 3D set.
export class ClayPlayer {
  constructor(el, ex, opts = {}) {
    this.el = el;
    this.opts = { ...opts };
    this._ex = ex;
    this._speed = opts.speed ?? 1;
    this._look = opts.look || DEFAULT_LOOK;
    this.want = false;
    this.dead = false;
    this.impl = null;
    if (!opts.noStill) el.innerHTML = clayStill(ex, this._look);
    load3D().then(async (m) => {
      if (this.dead) return;
      // a GPU context can briefly be unavailable (just lost, too many open): try again before
      // settling for the flat 2D figures
      for (let attempt = 0; m && !this.impl && attempt < 3; attempt++) {
        try {
          this.impl = new m.ClayPlayer3D(el, this._ex, { ...this.opts, look: this._look, speed: this._speed });
        } catch (e) {
          console.warn(e);
          this.impl = null;
          await new Promise((r) => setTimeout(r, 700));
          if (this.dead) return;
        }
      }
      if (!this.impl) this.impl = new SvgPlayer(el, this._ex, { ...this.opts, look: this._look, speed: this._speed });
      el.classList.toggle('is-3d', !!m && !(this.impl instanceof SvgPlayer));
      // a rest / get-ready film asked for while 3D was still loading: start it now, minus the time lost
      const q = this.pendingIl;
      this.pendingIl = null;
      if (q && this.impl.interlude) this.impl.interlude({ ...q, total: Math.max(3.5, q.total - (performance.now() - q.at) / 1000) });
      else if (q) this.inInterlude = false;
      if (this.want) this.impl.play();
    });
  }
  get ex() { return this._ex; }
  get playing() { return this.want; }
  get speed() { return this._speed; }
  set speed(v) { this._speed = v; if (this.impl) this.impl.speed = v; }
  get look() { return this._look; }
  set look(v) { this._look = v; if (this.impl?.setLook) this.impl.setLook(v); else if (this.impl) this.impl.look = v; }
  setExercise(ex, charId) {
    this._ex = ex;
    this.inInterlude = false;
    this.pendingIl = null;
    if (charId !== undefined) this.opts.charId = charId;
    if (this.impl) this.impl.setExercise(ex, this.opts.charId); else this.el.innerHTML = clayStill(ex, this._look);
  }
  // rest-period film (3D only); falls back to just showing the next move
  interlude(spec) {
    if (this.impl?.interlude) { this.impl.interlude(spec); this.inInterlude = true; return true; }
    if (!this.impl) { this.pendingIl = { ...spec, at: performance.now() }; this.inInterlude = true; return true; }
    this.setExercise(spec.to.ex);
    return false;
  }
  setSafe(safe) { this.opts.safe = { ...(this.opts.safe || {}), ...safe }; this.impl?.setSafe?.(this.opts.safe); }
  get character() { return this.impl?.character || null; }
  headScreen() { return this.impl?.headScreen?.() || null; }
  draw(force) { this.impl?.draw(force); }
  play() { this.want = true; this.impl?.play(); }
  pause() { this.want = false; this.impl?.pause(); }
  destroy() { this.dead = true; this.impl?.destroy(); this.el.innerHTML = ''; }
}
