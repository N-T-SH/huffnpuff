// Audits every exercise animation for impossible or unhelpful poses:
//   joint ranges (knees/elbows bending backwards, hips/shoulders/neck/ankles past what a body can do),
//   limbs passing through the body, and bodies passing through props (wall, bar, bench, box) or the floor.
// Usage: node tools/check-poses.mjs [exerciseId ...]   (exit code 1 if anything is flagged)
import { EX_BY_ID } from '../js/exercises.js';
import { Rig, sceneFit } from '../js/clay.js';
import { characterFor } from '../js/cast.js';

// body sizes per cast body type (from js/c3d/character.js BODIES)
const BODY = { human: { torsoR: 17, headR: 19, zs: 19, zh: 9.5 }, doll: { torsoR: 13.5, headR: 18, zs: 16, zh: 8 }, chunky: { torsoR: 21, headR: 19.5, zs: 24, zh: 11 }, bean: { torsoR: 29, headR: 22, zs: 30, zh: 12, bean: true } };

const R = { pelvis: 15, shoulder: 13, neck: 9, head: 19, rElbow: 6, lElbow: 6, rHand: 7, lHand: 7, rKnee: 8, lKnee: 8, rAnkle: 6, lAnkle: 6, rToe: 6, lToe: 6, rHeel: 6, lHeel: 6 };
const wrap = (a) => ((((a + 180) % 360) + 360) % 360) - 180;
const segDist = (p, a, b) => {
  const vx = b[0] - a[0], vy = b[1] - a[1];
  const u = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / (vx * vx + vy * vy || 1)));
  return Math.hypot(p[0] - a[0] - vx * u, p[1] - a[1] - vy * u);
};

// body-frame limits (degrees). Angles: 0 = down, 90 = forward, 180 = up; t = torso lean forward.
const LIM = {
  hip: [-60, 168], // thigh vs torso: extension behind / flexion toward chest
  knee: [-10, 162], // shin folds behind the thigh only
  shoulder: [-90, 215], // arm vs torso (overhead reach is fine, far behind is not)
  elbow: [-10, 165], // forearm folds toward the front of the upper arm only
  neck: [-65, 75], // head vs torso
  ankle: [-5, 138], // foot vs shin (90 = flat, smaller = pointed toes, larger = toes pulled up)
  armAb: [-35, 185], // arm lifted out to the side (90 = straight out, 180 = overhead); negative = across the body
  legAb: [-20, 50], // leg out to the side
  legSw: [-25, 55], // knee swung out (+) / in (−) about the spine
  toeOut: [-15, 50],
};

function check(ex) {
  const issues = new Map();
  const flag = (k, msg) => { if (!issues.has(k)) issues.set(k, msg); };
  const rig = new Rig(ex.anim);
  const who = characterFor(ex);
  const B = BODY[who.body] || BODY.human;
  const fit = sceneFit(rig);
  const props = ex.anim.props || [];
  // keyframe-to-keyframe moves must take the short way round (else a limb sweeps through the body)
  if (!ex.anim.shortest && !ex.anim.sweep) {
    const F = rig.frames;
    for (let i = 0; i < F.length && F.length > 1; i++) {
      const A = F[i], Bf = F[(i + 1) % F.length];
      for (const k of ['ra', 'la', 'rl', 'll']) for (const j of [0, 1]) {
        if (Math.abs(A[k][j] - Bf[k][j]) > 180) flag(`spin${k}${j}`, `${k}[${j}] swings the long way round between frames ${i} and ${(i + 1) % F.length} (${A[k][j]} → ${Bf[k][j]})`);
      }
      for (const k of ['t', 'n']) if (Math.abs((A[k] ?? 0) - (Bf[k] ?? 0)) > 180) flag('spin' + k, `${k} swings the long way round between frames ${i} and ${i + 1}`);
    }
  }
  const N = rig.frames.length === 1 ? 1 : 48;
  for (let i = 0; i < N; i++) {
    const ph = i / N;
    const { pts, pose: p } = rig.pose(ph);
    const at = `@${ph.toFixed(2)}`;
    const t = p.t, n = p.n ?? t;
    for (const s of ['r', 'l']) {
      const leg = p[s + 'l'], arm = p[s + 'a'];
      const hip = wrap(leg[0] + t), knee = wrap(leg[0] - leg[1]);
      const sh = ex.anim.shortest ? 0 : wrap(arm[0] + t) < -100 ? wrap(arm[0] + t) + 360 : wrap(arm[0] + t);
      const el = ex.anim.shortest || ex.anim.elbowsOut ? 0 : wrap(arm[1] - arm[0]);
      const fo = p[s + 'fo'] ?? 90;
      if (hip < LIM.hip[0] || hip > LIM.hip[1]) flag(`${s}hip`, `${s} hip ${hip.toFixed(0)}° ${at}`);
      if (knee < LIM.knee[0] || knee > LIM.knee[1]) flag(`${s}knee`, `${s} knee bends ${knee < 0 ? 'backwards' : 'too far'} (${knee.toFixed(0)}°) ${at}`);
      if (sh < LIM.shoulder[0] || sh > LIM.shoulder[1]) flag(`${s}sh`, `${s} shoulder ${sh.toFixed(0)}° ${at}`);
      if (el < LIM.elbow[0] || el > LIM.elbow[1]) flag(`${s}el`, `${s} elbow bends ${el < 0 ? 'backwards' : 'too far'} (${el.toFixed(0)}°) ${at}`);
      if (fo < LIM.ankle[0] || fo > LIM.ankle[1]) flag(`${s}ank`, `${s} ankle ${fo.toFixed(0)}° ${at}`);
    }
    for (const s of ['r', 'l']) {
      const [a1, a2] = p[s + 'ab'] || [0, 0], [l1, l2] = p[s + 'lab'] || [0, 0];
      for (const a of [a1, a2]) if (a < LIM.armAb[0] || a > LIM.armAb[1]) flag(`${s}ab`, `${s} arm out to the side ${a.toFixed(0)}° ${at}`);
      for (const a of [l1, l2]) if (a < LIM.legAb[0] || a > LIM.legAb[1]) flag(`${s}lab`, `${s} leg out to the side ${a.toFixed(0)}° ${at}`);
      const sw = p[s + 'lsw'] || 0, to = p[s + 'to'] || 0;
      if (sw < LIM.legSw[0] || sw > LIM.legSw[1]) flag(`${s}lsw`, `${s} knee swung ${sw.toFixed(0)}° ${at}`);
      if (to < LIM.toeOut[0] || to > LIM.toeOut[1]) flag(`${s}to`, `${s} toes turned ${to.toFixed(0)}° ${at}`);
    }
    // in 3D: hands, elbows and knees must stay outside the torso; the two legs must not cross
    {
      const top = B.bean ? pts.head : pts.neck;
      const z3 = (k) => (pts[k][2] || 0) + (k[0] === 'r' ? 1 : -1) * (/Elbow|Hand/.test(k) ? B.zs : B.zh);
      // apply the upper-body twist the 3D body does (rotation about the pelvis→neck axis)
      const P3 = (k) => {
        const v = [pts[k][0] - pts.pelvis[0], pts[k][1] - pts.pelvis[1], z3(k)];
        const tw = pts.tw || 0;
        if (!tw || !/Elbow|Hand/.test(k)) return v;
        const ax = [top[0] - pts.pelvis[0], top[1] - pts.pelvis[1]], l = Math.hypot(...ax);
        const kx = ax[0] / l, ky = ax[1] / l, a = (tw * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
        const d = (kx * v[0] + ky * v[1]) * (1 - c);
        return [v[0] * c + ky * v[2] * s + kx * d, v[1] * c - kx * v[2] * s + ky * d, v[2] * c + (kx * v[1] - ky * v[0]) * s];
      };
      for (const k of ['rHand', 'lHand', 'rElbow', 'lElbow']) {
        const v = P3(k);
        const d = Math.hypot(segDist([v[0], v[1]], [0, 0], [top[0] - pts.pelvis[0], top[1] - pts.pelvis[1]]), v[2]);
        if (d < B.torsoR * 0.8) flag('in3d' + k, `${k} inside the body (${d.toFixed(0)} < ${(B.torsoR * 0.8).toFixed(0)}) ${at}`);
      }
      for (const k of ['Knee', 'Ankle', 'Toe']) if (z3('r' + k) - z3('l' + k) < 6) flag('cross' + k, `legs cross at the ${k.toLowerCase()} ${at}`);
    }
    const neck = wrap(n - t);
    if (neck < LIM.neck[0] || neck > LIM.neck[1]) flag('neck', `neck ${neck.toFixed(0)}° ${at}`);
    // a front-held barbell must stay outside the body (it runs across both hands)
    if (ex.anim.hold === 'barbell') {
      const top = B.bean ? pts.head : pts.neck;
      const h = pts.rHand;
      const dT = segDist(h, pts.pelvis, top) - B.torsoR - 3;
      const dH = Math.hypot(h[0] - pts.head[0], h[1] - pts.head[1]) - B.headR - 3;
      if (dT < -4) flag('bbtorso', `barbell through the body (${dT.toFixed(0)}) ${at}`);
      if (dH < -4) flag('bbhead', `barbell through the head (${dH.toFixed(0)}) ${at}`);
    }
    // the floor
    const G = fit.G;
    if (ex.anim.anchor && ex.anim.anchor !== 'floor') {
      for (const k of Object.keys(R)) if (pts[k][1] + R[k] > G + 3) flag('floor' + k, `${k} below the floor ${at}`);
    }
    // props
    for (const pr of props) {
      if (pr.type === 'wall') {
        const right = pr.side === 'right';
        const gap = (k, r) => (right ? pr.x - (pts[k][0] + r) : pts[k][0] - r - pr.x);
        if (gap('head', B.headR) < -2) flag('wallhead', `head through the wall (${gap('head', B.headR).toFixed(0)}) ${at}`);
        for (const k of ['shoulder', 'pelvis', 'neck']) if (gap(k, B.torsoR) < -3) flag('wall' + k, `body (${k}) through the wall (${gap(k, B.torsoR).toFixed(0)}) ${at}`);
        for (const k of ['rKnee', 'lKnee', 'rToe', 'lToe']) if (gap(k, R[k]) < -3) flag('wall' + k, `${k} through the wall ${at}`);
      }
      if (pr.type === 'bar') {
        const bar = [0, pr.y ?? 0];
        const top = B.bean ? pts.head : pts.neck;
        const dT = segDist(bar, pts.pelvis, top) - B.torsoR - 2.6;
        const dH = Math.hypot(pts.head[0] - bar[0], pts.head[1] - bar[1]) - B.headR - 2.6;
        if (dT < -2) flag('bartorso', `body through the bar (${dT.toFixed(0)}) ${at}`);
        if (!B.bean && dH < -2) flag('barhead', `head through the bar (${dH.toFixed(0)}) ${at}`);
      }
      if (pr.type === 'bench' || pr.type === 'box') {
        for (const k of ['pelvis', 'shoulder', 'head', 'rKnee', 'lKnee', 'rAnkle', 'lAnkle', 'rToe', 'lToe']) {
          const [x, y] = pts[k];
          if (x > pr.x0 + 4 && x < pr.x1 - 4 && y + R[k] * 0.6 > pr.top + 4 && y < (pr.top + (pr.type === 'box' ? 999 : 40))) flag(pr.type + k, `${k} inside the ${pr.type} ${at}`);
        }
      }
    }
  }
  return [...issues.values()];
}

const ids = process.argv.slice(2);
const list = ids.length ? ids.map((id) => EX_BY_ID[id]) : Object.values(EX_BY_ID);
let bad = 0;
for (const ex of list) {
  const out = check(ex);
  if (out.length) { bad++; console.log(`✗ ${ex.id} (${characterFor(ex).id}): ${out.join(' · ')}`); }
}
console.log(`${list.length - bad}/${list.length} clean`);
process.exit(bad ? 1 : 0);
