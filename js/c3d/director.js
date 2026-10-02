// SuperSweatClub 3D — the rest-period director.
// Between moves the stage stops being a one-actor exercise loop and becomes a tiny film:
//  · handover: the next character walks into the current set, the two do their pair's bit
//    (toss, high five, bow, zap…), the outgoing one leaves and the camera cuts — with that
//    pair's own camera move and wipe — to the next character's set, where they get ready;
//  · breather: same character up next, so they catch their breath (a few acts each, cycled);
//  · prepare: after the handover (or before a long rest ends) they warm up for the move type.
// The shot always opens with the outgoing set's lens and camera so nothing jumps.
import { Group, Vector3, Color, Fog, CylinderGeometry, TorusGeometry, ConeGeometry, CircleGeometry } from '../vendor/three.js';
import { rigFor, sceneFit } from '../clay.js';
import { CAST_BY_ID, characterFor, nameOf } from '../cast.js';
import { actEx, pairFor, ARRIVE, BREATHERS, HELLO, prepFor } from './acts.js';
import { faceFor, ACT_MOOD } from './faces.js';
import { clay, capsule, sphere, roundedBox, mesh, at, mulberry, lumpify } from './kit.js';

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const easeIn = (x) => { x = clamp01(x); return x * x * x; };
const easeOut = (x) => { x = clamp01(x); return 1 - (1 - x) ** 3; };
const lerp = (a, b, u) => a + (b - a) * u;
const wrapPi = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/* ---------- little clay props the cast pass around ---------- */
function makeProp(kind) {
  const g = new Group();
  const M = (c, o) => clay(c, o);
  switch (kind) {
    case 'dumbbell': {
      g.add(at(mesh(capsule(2.6, 22, 90, 0.2), M('#3a3a3f', { metal: 0.4, rough: 0.4, tex: 'knurl', bump: 0.8 })), 0, 0, 0, Math.PI / 2, 0, 0));
      for (const z of [-13, 13]) g.add(at(mesh(sphere(7.5, 91 + z, 0.5), M('#e5484d', { gloss: 0.2, tex: 'rubber', bump: 1.5 })), 0, 0, z, 0, 0, 0, [1, 1, 0.75]));
      g.userData.axis = 'z';
      break;
    }
    case 'kettlebell': {
      g.add(at(mesh(sphere(13, 92, 0.6), M('#2b2b2e', { metal: 0.3, rough: 0.5, tex: 'rubber', bump: 1.8 })), 0, -14, 0));
      g.add(at(mesh(lumpify(new TorusGeometry(7.5, 2.4, 10, 24, Math.PI), 0.2, 0.2, 93), M('#2b2b2e', { metal: 0.3 })), 0, -4, 0, 0, Math.PI / 2, 0));
      g.userData.axis = 'hang';
      break;
    }
    case 'bottle': {
      g.add(at(mesh(lumpify(new CylinderGeometry(5.2, 5.6, 22, 18), 0.25, 0.12, 94), M('#4fb3ff', { gloss: 0.7 })), 0, 4, 0));
      g.add(at(mesh(new CylinderGeometry(3, 3, 5, 12), M('#ffffff')), 0, 17, 0));
      g.add(at(mesh(new CylinderGeometry(5.7, 5.7, 5, 18), M('#ff5fa8')), 0, 2, 0));
      g.userData.axis = 'arm';
      break;
    }
    case 'mug': {
      g.add(at(mesh(lumpify(new CylinderGeometry(7, 6.5, 13, 18), 0.3, 0.1, 95), M('#f3efe6', { gloss: 0.4 })), 0, 2, 0));
      g.add(at(mesh(new TorusGeometry(4, 1.4, 8, 16), M('#f3efe6')), 7, 2, 0));
      g.userData.axis = 'up';
      break;
    }
    case 'spoon': {
      g.add(at(mesh(capsule(1.4, 26, 96, 0.15), M('#c98d55', { tex: 'wood', bump: 1 })), 0, 8, 0));
      g.add(at(mesh(sphere(5, 97, 0.3), M('#c98d55')), 0, 24, 0, 0, 0, 0, [1, 1.3, 0.45]));
      g.userData.axis = 'arm';
      break;
    }
    case 'wand': {
      g.add(at(mesh(capsule(1.3, 34, 98, 0.12), M('#5a3a22', { tex: 'wood', bump: 1 })), 0, 10, 0));
      g.add(at(mesh(sphere(4, 99, 0.3), clay('#ffe066', { emissive: '#ffd23f', ei: 0.9 })), 0, 28, 0));
      g.userData.axis = 'arm';
      break;
    }
    case 'towel': {
      g.add(at(mesh(roundedBox(10, 36, 2.4, 1.2, 100, 0.6), M('#ffffff', { tex: 'weave', bump: 1.5, sheen: 0.9 })), 0, -14, 0));
      g.add(at(mesh(roundedBox(10.4, 4, 2.8, 1, 101, 0.3), M('#ff5fa2', { felt: true })), 0, -26, 0));
      g.userData.axis = 'hang';
      break;
    }
    case 'baguette': {
      g.add(at(mesh(capsule(4.2, 46, 102, 0.6), M('#d9a35b', { rough: 0.8 })), 0, 0, 0));
      for (let i = -1; i <= 1; i++) g.add(at(mesh(capsule(0.9, 6, 103 + i, 0.1), M('#f2d6a2')), 3.6, i * 12, 0, 0, 0, 0.7));
      g.userData.axis = 'arm';
      break;
    }
    case 'record': {
      g.add(at(mesh(new CylinderGeometry(16, 16, 1.2, 32), M('#151517', { gloss: 0.9, rough: 0.2 })), 0, 0, 0, Math.PI / 2, 0, 0));
      g.add(at(mesh(new CircleGeometry(5.5, 20), M('#ff5fa8')), 0, 0, 0.7));
      g.add(at(mesh(new CircleGeometry(5.5, 20), M('#ff5fa8')), 0, 0, -0.7, 0, Math.PI, 0));
      g.userData.axis = 'flat';
      break;
    }
    case 'leaf': {
      g.add(at(mesh(sphere(8, 104, 0.4), M('#5bc46a', { gloss: 0.3 })), 0, 10, 0, 0, 0, 0, [0.55, 1.4, 0.18]));
      g.add(at(mesh(capsule(0.7, 8, 105, 0.05), M('#3c7d3f')), 0, 0, 0));
      g.userData.axis = 'arm';
      break;
    }
    case 'carrot': {
      g.add(at(mesh(lumpify(new ConeGeometry(4.4, 26, 14), 0.4, 0.2, 106), M('#ff8a2a')), 0, 2, 0, Math.PI, 0, 0));
      for (let i = 0; i < 3; i++) g.add(at(mesh(capsule(1, 9, 107 + i, 0.1), M('#4cbf62')), 0, 17, 0, 0, i * 2.1, 0.35));
      g.userData.axis = 'arm';
      break;
    }
    case 'book': {
      g.add(at(mesh(roundedBox(22, 28, 5, 1.2, 113, 0.3), M('#6b2f8f', { tex: 'weave', bump: 1 })), 0, 0, 0));
      g.add(at(mesh(roundedBox(20, 26, 4, 0.8, 114, 0.1), M('#f3ead2')), 1.6, 0, 0));
      g.add(at(mesh(sphere(3, 115, 0), clay('#ffe066', { emissive: '#ffd23f', ei: 0.5 })), -1, 4, 3));
      g.userData.axis = 'z';
      break;
    }
    case 'apple': {
      g.add(at(mesh(sphere(7, 116, 0.4), M('#e5484d', { gloss: 0.5 })), 0, 0, 0, 0, 0, 0, [1, 0.92, 1]));
      g.add(at(mesh(capsule(0.8, 4, 117, 0.05), M('#5a3a22')), 0, 7, 0));
      g.add(at(mesh(sphere(3, 118, 0.2), M('#4cbf62')), 2.6, 8, 0, 0, 0, 0, [1, 0.4, 0.7]));
      g.userData.axis = 'up';
      break;
    }
    case 'phone': {
      g.add(at(mesh(roundedBox(9, 17, 2, 1.2, 119, 0.1), M('#ff5fa8', { gloss: 0.6 })), 0, 4, 0));
      g.add(at(mesh(roundedBox(7.6, 14, 0.6, 0.6, 120, 0), clay('#9ad8ff', { emissive: '#5fb8ff', ei: 0.6 })), 0, 4, 1.2));
      g.userData.axis = 'arm';
      break;
    }
    case 'pan': {
      g.add(at(mesh(lumpify(new CylinderGeometry(15, 13, 5, 24), 0.3, 0.1, 121), M('#2b2b2b', { gloss: 0.6 })), 0, 30, 0));
      g.add(at(mesh(sphere(9, 122, 0.4), M('#f2c46b')), 0, 33, 0, 0, 0, 0, [1, 0.25, 1]));
      g.add(at(mesh(capsule(2.4, 24, 123, 0.1), M('#2b2b2b')), 0, 12, 0));
      g.userData.axis = 'arm';
      break;
    }
    default: g.add(mesh(sphere(6, 108), M('#ffc93c')));
  }
  return g;
}

/* ---------- walking without skating ----------
   A walk (or run) cycle is turned into distance: while a foot is planted it slides back under the
   body by exactly as much as the body travels, so we drive the gait phase *from* the distance
   covered — the planted foot stays put on the floor, however the director eases the move. */
const GAITS = new Map();
function gait(name) {
  if (GAITS.has(name)) return GAITS.get(name);
  const rig = rigFor(actEx(name));
  const N = 360;
  const cum = new Float64Array(N + 1);
  let prev = null;
  for (let i = 0; i <= N; i++) {
    const { pts } = rig.pose(i / N);
    const side = pts.rAnkle[1] >= pts.lAnkle[1] ? 'r' : 'l'; // the lower foot carries the weight
    const x = pts[side + 'Ankle'][0] - pts.pelvis[0];
    let d = 0;
    if (prev && prev.side === side) d = Math.max(0, prev.x - x);
    cum[i] = (i ? cum[i - 1] : 0) + d;
    prev = { side, x };
  }
  const g = { cum, N, D: cum[N] || 1 };
  GAITS.set(name, g);
  return g;
}
// distance covered from phase 0 to phase ph
function gaitDist(g, ph) {
  const c = Math.floor(ph), f = (ph - c) * g.N, i = Math.min(g.N - 1, Math.floor(f));
  return c * g.D + g.cum[i] + (g.cum[i + 1] - g.cum[i]) * (f - i);
}
// the phase reached after walking d from phase ph0
function gaitPhase(g, ph0, d) {
  const target = gaitDist(g, ph0) + Math.max(0, d);
  const c = Math.floor(target / g.D), r = target - c * g.D;
  let lo = 0, hi = g.N;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (g.cum[m] <= r) lo = m; else hi = m; }
  const span = g.cum[hi] - g.cum[lo];
  return c + (lo + (span > 1e-9 ? (r - g.cum[lo]) / span : 0)) / g.N;
}
// passing position (feet under the body) — where walks start and stop cleanly
const PASS = 0.25;
// a stroll of at least `min` that starts and ends on a passing step
function strideFit(name, min) {
  const g = gait(name);
  const n = Math.max(1, Math.ceil(min / g.D));
  return n * g.D;
}

/* ---------- the director ---------- */
export class Interlude {
  // from / to: { ex, charId? } — total: rest length in seconds — overlay: element for bubbles & wipes
  constructor(stage, { from, to, total = 10, look, overlay = null, variant = null, wait = false }) {
    this.st = stage;
    this.look = look;
    this.ov = overlay;
    this.total = total;
    this.fromSpec = (from.charId && CAST_BY_ID[from.charId]) || characterFor(from.ex);
    this.toSpec = (to.charId && CAST_BY_ID[to.charId]) || characterFor(to.ex);
    this.toEx = to.ex;
    this.prep = prepFor(to.ex?.cat);
    this.wait = !!wait; // before the workout: say hello, then the same kind of waiting around
    this.ctxA = ctxFor(from.ex);
    this.mode = this.fromSpec.id === this.toSpec.id ? 'breather' : 'handover';
    this.k = Math.min(1, Math.max(0.42, total / 10));
    this.cam0 = stage.cam ? { ...stage.cam, target: stage.cam.target.clone() } : null;
    this.setA = stage.set;
    this.envA = stage.env;
    this.setB = this.mode === 'handover' ? stage.getSet(this.toSpec.set, ctxFor(to.ex)) : this.setA;
    stage.world.clear();
    stage.world.add(this.setA.group);
    this.actors = [];
    this.A = this.actor(this.fromSpec);
    this.B = this.mode === 'handover' ? this.actor(this.toSpec) : null;
    this.pair = this.B ? pairFor(this.fromSpec.id, this.toSpec.id, variant) : null;
    // the outgoing puppet eases out of its exercise pose (director time starts at 0)
    this.A.char.startBlend(0, 0.5);
    this.props = new Map();
    this.fired = new Set();
    this.bubbles = [];
    this.inB = false;
    if (this.B) { this.B.x = 9999; this.B.dir = -1; this.B.char.group.visible = false; }
    if (this.pair) this.setupPair();
    this.wipe(0, '');
  }

  dispose() {
    for (const b of this.bubbles) b.el.remove();
    this.bubbles = [];
    if (this.ov) this.ov.innerHTML = '';
    for (const a of this.actors) { const g = a.char.group; g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); g.scale.set(1, 1, 1); g.visible = true; }
  }

  actor(spec) {
    const char = this.st.getChar(spec, this.look);
    const g = char.group;
    g.visible = true;
    this.st.world.add(g);
    const fit = sceneFit(rigFor(actEx('idle')));
    const H = fit.G - fit.bbox.y0 + (char.b.headR - 18) * 1.6 + (['wizard', 'chef'].includes(spec.hat) || ['afro', 'curly'].includes(spec.hair) ? 22 : 0);
    const a = { spec, char, x: 0, y: 0, z: 0, dir: 1, spin: 0, scale: 1, turn: 0, H, out: null, n: this.actors.length };
    this.actors.push(a);
    return a;
  }

  prop(kind) {
    if (!this.props.has(kind)) { const p = makeProp(kind); this.props.set(kind, p); this.st.world.add(p); }
    const p = this.props.get(kind);
    p.visible = true;
    return p;
  }

  /* ----- posing ----- */
  pose(a, name, phase, step) {
    const ex = actEx(name);
    const rig = rigFor(ex);
    const fit = sceneFit(rig);
    const ph = ((phase % 1) + 1) % 1;
    const { pts } = rig.pose(ph);
    const J = a.char.joints(pts, fit, ex.anim);
    const bs = Math.floor(step / 3);
    // a new act: blend into it rather than snapping
    if (a.act && a.act !== name) a.char.startBlend(this.now ?? 0);
    a.act = name;
    // the face: a mood set for this moment (a.mood), else what the act calls for, in their own style
    const face = faceFor(a.mood || ACT_MOOD[name] || 'neutral', a.spec.id);
    const talk = (a.talkUntil ?? -1) > (this.now ?? 0) ? 1 : 0;
    a.out = a.char.pose(J, { blink: (step + a.n * 17) % 37 === 0, effort: a.effort || 0, squash: 1, seed: (bs % 7) + 1, boil: 1, now: this.now ?? 0, hands: ex.anim.fists ? { r: 'grip', l: 'grip' } : null, face, talk });
    a.char.jitter(mulberry(bs * 3 + a.n + 1), 1);
    const g = a.char.group;
    const base = a.dir > 0 ? 0 : Math.PI;
    const toCam = (this.camAz ?? 0.6) - Math.PI / 2;
    g.position.set(a.x, a.y, a.z);
    g.rotation.set(0, base + a.turn * wrapPi(toCam - base) + a.spin, 0);
    g.scale.setScalar(Math.max(0.001, a.scale));
    g.updateMatrixWorld(true);
  }
  // loop an act at its own tempo
  loop(a, name, t, step, off = 0) {
    this.pose(a, name, t / (actEx(name).anim.tempo || 1) + off, step);
  }
  // play an act once across [t0, t1]
  once(a, name, t, t0, t1, step) {
    this.pose(a, name, Math.min(0.999, clamp01((t - t0) / (t1 - t0))), step);
  }

  // a foot's spot (local to the actor, at an act's phase) and where it lands in the world at heading h0
  pivot(a, name, phase, side, h0) {
    const ex = actEx(name);
    const rig = rigFor(ex);
    const J = a.char.joints(rig.pose(phase).pts, sceneFit(rig), ex.anim);
    const f = J[side + 'Heel'].clone().lerp(J[side + 'Toe'], 0.42);
    return { fx: f.x, fz: f.z, x0: f.x * Math.cos(h0) + f.z * Math.sin(h0), z0: -f.x * Math.sin(h0) + f.z * Math.cos(h0) };
  }

  handPos(a, side = 'r') {
    return a.char.group.localToWorld(a.out[side + 'Hand'].clone());
  }
  holdProp(p, a, { both = false } = {}) {
    const g = a.char.group;
    const axis = p.userData.axis;
    // close the hand(s) round it: bars and handles across the fist, sticks standing up out of it
    const mode = axis === 'arm' || axis === 'up' ? 'stick' : 'grip';
    a.char.setHand('r', mode);
    if (both) a.char.setHand('l', mode);
    g.updateMatrixWorld(true);
    const hand = both ? this.handPos(a, 'r').lerp(this.handPos(a, 'l'), 0.5) : this.handPos(a, 'r');
    p.position.copy(hand);
    p.rotation.set(0, 0, 0);
    if (axis === 'arm' || axis === 'up') {
      // along the thumb side of the fist (character space → world)
      const d = a.char.handObj.r.stickDir().transformDirection(g.matrixWorld);
      if (axis === 'up') d.set(0, 1, 0);
      p.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), d);
      if (axis === 'arm') p.position.addScaledVector(d, -4);
    } else if (axis === 'z' || axis === 'flat') {
      p.rotation.y = g.rotation.y;
    }
  }

  /* ----- camera ----- */
  fitDist(W, H) {
    const c = this.st.camera;
    const t = Math.tan((c.fov * Math.PI) / 360);
    const usable = Math.max(0.3, 1 - this.st.safe.top - this.st.safe.bottom);
    return Math.max(H / usable / 2 / t, W / 0.88 / 2 / (t * c.aspect)) * 1.1 + 30;
  }
  shot(env, tx, W, H) {
    return { az: env.cam.az, el: env.cam.el, target: new Vector3(tx, H * 0.48, 0), dist: this.fitDist(W, H) };
  }
  mixCam(a, b, u) {
    return { az: lerp(a.az, b.az, u), el: lerp(a.el, b.el, u), target: a.target.clone().lerp(b.target, u), dist: lerp(a.dist, b.dist, u), roll: lerp(a.roll || 0, b.roll || 0, u) };
  }
  applyCam(c, env, tt, step) {
    // the set's own stop-motion camera style: slow orbit, slider dolly or handheld wobble
    let az = c.az + Math.sin(tt * 0.35) * 0.06, el = c.el + Math.sin(tt * 0.23) * 0.02, dist = c.dist;
    const mv = env.cam.move;
    if (mv === 'dolly') { az = c.az + Math.sin(tt * 0.2) * 0.04; dist *= 1 + Math.sin(tt * 0.3) * 0.04; }
    if (mv === 'handheld') { az += Math.sin(tt * 1.3) * 0.006 + Math.sin(tt * 0.71 + 1) * 0.004; el += Math.sin(tt * 1.1 + 2) * 0.004; }
    this.camAz = az;
    const fog = this.st.scene.fog;
    if (fog && env.fog) { fog.near = dist + 120; fog.far = dist + 120 + (env.fog[2] - env.fog[1]); }
    this.st.setCam(az, el, c.target, dist, c.roll || 0);
  }

  /* ----- speech bubbles, comic sound effects and wipes ----- */
  say(a, text, dur = 1.8, cls = '') {
    if (!this.ov || !text) return;
    // one speaker at a time: the previous line pops away
    for (const b of this.bubbles) if (b.a) b.until = Math.min(b.until, this.now + 0.15);
    const el = document.createElement('div');
    el.className = `il-say speech pop ${cls}`;
    el.innerHTML = `<span class="who">${a.spec.emoji} ${esc(nameOf(a.spec))}</span>${esc(text)}`;
    a.talkUntil = this.now + Math.min(dur * 0.8, 0.3 + text.length * 0.05); // the mouth moves as they speak
    this.ov.appendChild(el);
    this.bubbles.push({ el, a, until: this.now + dur * Math.max(0.7, this.k) });
  }
  sfx(text, world, dur = 0.9) {
    if (!this.ov) return;
    const el = document.createElement('div');
    el.className = 'il-sfx';
    el.textContent = text;
    this.ov.appendChild(el);
    this.bubbles.push({ el, at: world.clone(), until: this.now + dur });
  }
  placeBubbles() {
    if (!this.ov) return;
    const W = this.ov.clientWidth || 1, H = this.ov.clientHeight || 1;
    const cam = this.st.camera;
    // keep speech clear of the big timer the player shows under its top bar
    const clk = this.ov.closest('.player')?.querySelector('.p-clock');
    const clockBottom = clk?.textContent ? clk.getBoundingClientRect().bottom - this.ov.getBoundingClientRect().top : 0;
    this.bubbles = this.bubbles.filter((b) => {
      if (this.now > b.until || (b.a && !b.a.char.group.visible)) { b.el.remove(); return false; }
      // anchor speech to the actor's standing height above their feet, not their bobbing head,
      // pick a side once, and ease toward the target so bubbles glide instead of jittering
      let p;
      if (b.a) { const g = b.a.char.group; p = new Vector3(g.position.x, g.position.y + b.a.H * g.scale.y + 6, g.position.z); }
      else p = b.at.clone();
      p.project(cam);
      const minY = Math.max(56, clockBottom + (b.a ? b.el.offsetHeight + 24 : 30));
      let x = Math.max(36, Math.min(W - 36, ((p.x + 1) / 2) * W)), y = Math.min(H * 0.8, ((1 - p.y) / 2) * H);
      if (b.a) {
        if (b.right == null) { b.right = x > W * 0.58; b.el.classList.toggle('tail-r', b.right); }
        if (b.x != null) { x = b.x + (x - b.x) * 0.22; y = b.y + (y - b.y) * 0.22; }
        b.x = x; b.y = y;
      }
      y = Math.max(minY, y); // never over the clock, even mid-glide
      b.el.style.left = `${x.toFixed(1)}px`;
      b.el.style.top = `${y.toFixed(1)}px`;
      return true;
    });
  }
  wipe(w, kind) {
    if (!this.ov) return;
    let el = this.ov.querySelector('.il-wipe');
    if (!el) { el = document.createElement('div'); el.className = 'il-wipe'; el.innerHTML = '<i></i><i></i>'; this.ov.appendChild(el); }
    if (el.dataset.kind !== kind) el.dataset.kind = kind;
    el.style.setProperty('--w', w.toFixed(3));
    el.style.visibility = w > 0.001 ? 'visible' : 'hidden';
  }
  once1(key, fn) {
    if (this.fired.has(key)) return;
    this.fired.add(key);
    fn();
  }

  /* ----- environment ----- */
  useSet(set) {
    const st = this.st;
    st.world.remove(this.setA.group, this.setB.group);
    st.world.add(set.group);
    st.set = set;
    st.env = set.env;
    st.scene.background = new Color(set.env.bg);
    st.scene.fog = set.env.fog ? new Fog(new Color(set.env.fog[0]), set.env.fog[1], set.env.fog[2]) : null;
    st.mats.mat.color.set(set.env.mat || '#8f7cff');
    st.applyEnv(set.env, false);
  }

  setupPair() {
    const P = this.pair;
    const [A, B] = [this.A, this.B];
    const own = P.owner && (P.owner === A.spec.id ? A : P.owner === B.spec.id ? B : null);
    this.giver = own || A;
    this.taker = this.giver === A ? B : A;
    if (P.verb === 'zap') { this.wizard = own || A; this.victim = this.wizard === A ? B : A; }
    // the owner (or whoever's line comes first) opens the conversation
    const lead = P.owner || Object.keys(P.lines || {})[0];
    this.first = lead === B.spec.id ? B : A;
    this.second = this.first === A ? B : A;
  }

  /* ----- per frame ----- */
  // tt/step: stop-motion time (poses move on twos) · tc: smooth time for the camera, wipes and bubbles
  // · pose: false when only the camera needs a new frame
  update(tt, step, tc = tt, pose = true) {
    if (this.t0 == null) { this.t0 = tt; this.tc0 = tc; }
    const t = tt - this.t0, tr = tc - this.tc0;
    this.now = tr;
    if (this.mode === 'breather') this.breather(t, tt, step, tr, tc, pose);
    else this.handover(t, tt, step, tr, tc, pose);
    if (pose) this.st.set?.update(tt);
    this.placeBubbles();
  }

  // A run of rests for one character: taken in turn from their list (remembered between rests),
  // stretched to fill the time exactly, ending back home just as getting ready starts.
  planBreathers(avail) {
    const id = this.A.spec.id;
    const list = BREATHERS[id] || BREATHERS.pip;
    let seen = {};
    try { seen = JSON.parse(localStorage.getItem('pulse:breathers') || '{}'); } catch { /* ignore */ }
    let i = seen[id] ?? Math.floor(Math.random() * list.length);
    const items = [];
    let used = 0, misses = 0;
    while (avail - used >= 2.4 && misses < list.length) {
      const b = list[i % list.length];
      // walking to a spot needs room; very short rests stay put
      if (b.dur <= avail - used + 0.6 && (!b.spot || avail >= 6)) { items.push(b); used += b.dur; misses = 0; } else misses++;
      i++;
    }
    seen[id] = i % list.length;
    try { localStorage.setItem('pulse:breathers', JSON.stringify(seen)); } catch { /* ignore */ }
    if (!items.length) items.push({ act: 'idle', dur: avail });
    const k = avail / items.reduce((n, b) => n + b.dur, 0);
    let t0 = 0;
    return items.map((b) => { const it = { ...b, t0, t1: t0 + b.dur * k }; t0 = it.t1; return it; });
  }

  // where the actor is (and faces) during a spot item: turn, walk over, act, turn, walk back, turn
  spotTrack(it, lt) {
    const a = this.A;
    const ctx = this.ctxA;
    const [side, far] = it.spot;
    const X = side < 0 ? ctx.left - far : ctx.right + far;
    const D = it.t1 - it.t0, TURN = 0.3;
    const wt = Math.min(D * 0.28, Math.abs(X) / 75 + 0.25);
    const toCam = wrapPi((this.camAz ?? 0.6) - Math.PI / 2);
    const hCam = 0.35 * toCam, hOut = side > 0 ? 0 : -Math.PI, hBack = side > 0 ? -Math.PI : 0;
    const hAct = it.face === 'spot' ? hOut : hCam;
    const T1 = TURN, T2 = T1 + wt, T3 = T2 + TURN, T6 = D, T5 = T6 - TURN, T4 = T5 - wt, T35 = T4 - TURN;
    const ease = (x) => smooth(x);
    const ls = a.char.b.legScale || 1;
    if (lt < T1) return { x: 0, h: lerp(hCam, hOut, ease(lt / TURN)), act: 'idle' };
    if (lt < T2) { const d = ease((lt - T1) / wt) * Math.abs(X); return { x: side * d, h: hOut, act: 'walk', phase: gaitPhase(gait('walk'), PASS, d / ls) }; }
    if (lt < T3) return { x: X, h: lerp(hOut, hAct, ease((lt - T2) / TURN)), act: it.act, at: lt - T2 };
    if (lt < T35) return { x: X, h: hAct, act: it.act, at: lt - T2 };
    if (lt < T4) return { x: X, h: lerp(hAct, hBack, ease((lt - T35) / TURN)), act: 'idle' };
    if (lt < T5) { const d = ease((lt - T4) / wt) * Math.abs(X); return { x: X - side * d, h: hBack, act: 'walk', phase: gaitPhase(gait('walk'), PASS, d / ls) }; }
    return { x: 0, h: lerp(hBack, hCam, ease((lt - T5) / TURN)), act: 'idle' };
  }

  breather(t, tt, step, tr, tc, pose) {
    const a = this.A;
    const env = this.envA;
    // a short wait (the 3-2-1 before a workout) goes straight to getting ready
    const prepAt = this.wait && this.total < 6 ? 0 : this.total >= 6 ? this.total - 3 : this.total;
    this.plan ??= this.planBreathers(Math.max(1, prepAt));
    const it = this.plan.find((p) => t < p.t1) || this.plan[this.plan.length - 1];
    const lt = t - it.t0;
    const sp = t < prepAt && it.spot ? this.spotTrack(it, lt) : null;
    // camera: keep the actor in frame when they wander over to part of the set
    const ax = sp ? sp.x : 0;
    const shot = this.shot(env, ax * 0.55, 200 + Math.abs(ax) * 0.9, a.H);
    const cam = this.cam0 ? this.mixCam(this.cam0, shot, smooth(tr / 1.6)) : shot;
    this.applyCam(cam, env, tc, step);
    if (!pose) return;
    for (const p of this.props.values()) p.visible = false;
    if (this.wait) this.once1('hello', () => this.say(a, HELLO[a.spec.id], 2.2));
    a.mood = !this.wait && t < 1.8 ? 'tired' : null; // straight off a set: catch your breath
    if (t >= prepAt) {
      a.x = 0; a.dir = 1; a.spin = 0; a.turn = 0.35;
      const pr = this.prep;
      if (!(this.wait && prepAt === 0)) this.once1('prep', () => this.say(a, pr.line, 2.2));
      this.loop(a, pr.act, t - prepAt, step);
      return;
    }
    const n = this.plan.indexOf(it);
    if (sp) {
      a.x = sp.x; a.dir = 1; a.turn = 0; a.spin = sp.h;
      if (sp.act === 'walk') this.pose(a, 'walk', sp.phase, step);
      else if (sp.at != null) this.loop(a, sp.act, sp.at, step);
      else this.loop(a, sp.act, lt, step);
      if (sp.at != null) this.once1('b' + n, () => this.say(a, it.line, 2.4));
    } else {
      a.x = 0; a.dir = 1; a.spin = 0; a.turn = 0.35;
      this.loop(a, it.act, lt, step);
      if (!(this.wait && n === 0)) this.once1('b' + n, () => this.say(a, it.line, 2.2));
    }
    if (it.prop && (!sp || sp.at != null)) this.holdProp(this.prop(it.prop), a, { both: it.prop === 'book' });
  }

  handover(t, tt, step, tr, tc, pose) {
    const k = this.k;
    const T = (x) => x * k;
    const P = this.pair;
    const { A, B } = this;
    const gap = P.gap || 90;
    const envA = this.envA, envB = this.setB.env;
    const cutAt = T(6.5);
    let swapped = false;
    if (!this.inB && tr >= cutAt) { this.inB = swapped = true; this.useSet(this.setB); for (const p of this.props.values()) p.visible = false; A.char.group.visible = false; }
    // ---------------- camera moves into / out of the cut (smooth time, every frame) ----------------
    const cin = clamp01((tr - T(6)) / (cutAt - T(6))); // 0..1 approaching the cut
    const cout = clamp01((tr - cutAt) / (T(7.1) - cutAt)); // 0..1 leaving it
    const blurU = this.inB ? 1 - easeOut(cout) : easeIn(cin);
    if (this.ov) this.ov.style.backdropFilter = ['whip', 'spin'].includes(P.cam) && blurU > 0.02 ? `blur(${(blurU * 9).toFixed(1)}px)` : '';
    if (!this.inB) {
      const two = this.shot(envA, gap / 2, gap + 130, Math.max(A.H, B.H) * 1.05);
      let cam = this.cam0 ? this.mixCam(this.cam0, two, smooth((tr - T(0.3)) / T(2.4))) : two;
      cam = this.cutMove(cam, easeIn(cin), +1);
      this.applyCam(cam, envA, tc, step);
      this.wipe(easeIn(cin), P.wipe || '');
      if (pose) this.sceneA(t, step, T, gap);
    } else {
      const solo = this.shot(envB, 0, 200, B.H);
      const cam = this.cutMove(solo, 1 - easeOut(cout), -1);
      this.applyCam(cam, envB, tc, step);
      this.wipe(1 - easeOut(cout), P.wipe || '');
      if (pose || swapped) this.sceneB(Math.max(t, cutAt), step, T, cutAt);
    }
  }

  // each pair's camera move, mirrored either side of the cut (u: 0 = normal, 1 = at the cut)
  cutMove(c, u, side) {
    const m = { ...c, target: c.target.clone(), roll: 0 };
    switch (this.pair.cam) {
      case 'whip': m.az += side * u * 1.7; break;
      case 'spin': m.az += side * u * Math.PI; m.dist *= 1 + u * 0.3; break;
      case 'drop': m.el = lerp(c.el, side > 0 ? 1.35 : 1.25, u); m.dist *= 1 - u * 0.55; m.target.y = lerp(c.target.y, 0, u); break;
      case 'rise': m.el = lerp(c.el, 1.4, u); m.dist *= 1 + u * 1.6; break;
      case 'zoom': m.dist *= 1 - u * 0.82; m.target.y = lerp(c.target.y, c.target.y * 1.6, u); break;
      case 'roll': m.roll = side * u * Math.PI * 0.9; m.dist *= 1 + u * 0.15; break;
      default: break;
    }
    return m;
  }

  sceneA(t, step, T, gap) {
    const P = this.pair;
    const { A, B } = this;
    A.turn = 0.25;
    A.x = 0; A.dir = 1;
    // B strolls (or bounds) in from off-set, feet planted step by step, facing where they walk;
    // once there they turn a little toward the camera
    const fast = ['dee', 'jolene'].includes(B.spec.id);
    const gaitB = fast ? 'run' : 'walk';
    // stubby 3D legs take proportionally shorter steps
    const lsB = B.char.b.legScale || 1, lsA = A.char.b.legScale || 1;
    const inDist = strideFit(gaitB, 150 / lsB) * lsB; // just off-frame: a couple of unhurried strides
    const enter = clamp01((t - T(0.6)) / T(2));
    const walked = smooth(enter) * inDist;
    B.char.group.visible = t > T(0.6);
    B.x = gap + inDist - walked;
    B.dir = -1;
    B.turn = 0.25 * smooth((t - T(2.6)) / T(0.5));
    const vS = T(2.6), vE = T(5);
    const exS = vE, exE = T(6.2);
    // --- outgoing actor
    A.mood = t < T(1.4) ? 'tired' : null; B.mood = null;
    if (t < vS) {
      this.loop(A, t < T(1.6) ? 'handsHips' : 'idle', t, step);
    } else if (t < vE) this.verb(t, vS, vE, step, gap);
    else {
      // exit: walk off, or vanish in a puff if zapped
      const u = clamp01((t - exS) / (exE - exS));
      if (P.verb === 'zap' && this.victim === A) {
        A.spin += 0.6; A.scale = 1 - easeIn(u * 1.7);
        this.once1('poof', () => this.sfx('✨ POOF ✨', new Vector3(A.x, A.H * 0.6, 0)));
        this.loop(A, 'zapped', t, step);
      } else {
        // turn round by pivoting on the planted foot (the other leg steps through), then walk off
        // from there — the gait is driven by the distance, so no foot ever skates
        const turnU = smooth(u / 0.16);
        // (heading eases from "facing B, a little toward camera" round through the camera side to facing off-left)
        const toCam = wrapPi((this.camAz ?? 0.6) - Math.PI / 2);
        A.dir = 1; A.turn = 0.25 * (1 - turnU); A.spin = -turnU * Math.PI;
        const piv = this.pivot(A, 'walk', PASS, 'r', 0.25 * toCam);
        const d = easeIn((u - 0.16) / 0.84) * (gap / 2 + 170);
        const head = A.turn * toCam + A.spin;
        // where the body must stand for the pivot foot to stay where it was before the turn
        A.x = piv.x0 - (piv.fx * Math.cos(head) + piv.fz * Math.sin(head)) - d;
        A.z = piv.z0 - (-piv.fx * Math.sin(head) + piv.fz * Math.cos(head));
        if (u < 0.16) this.pose(A, 'walk', PASS, step);
        else this.pose(A, 'walk', gaitPhase(gait('walk'), PASS, d / lsA), step);
      }
      if (P.prop && P.verb !== 'zap' && this.taker === A) this.holdProp(this.prop(P.prop), A, { both: P.verb === 'toss' });
      if (P.verb === 'zap' && this.wizard === A) this.holdProp(this.prop('wand'), A);
    }
    // --- incoming actor
    if (t < vS) {
      if (enter < 1) this.pose(B, gaitB, gaitPhase(gait(gaitB), PASS, walked / lsB), step);
      else this.loop(B, 'idle', t, step);
      if (P.prop && this.giver === B) this.holdProp(this.prop(P.prop), B);
    } else if (t >= vE) {
      if (P.verb === 'zap' && this.victim === B) B.spin = 0;
      this.loop(B, 'wave', t, step);
      if (P.prop && this.taker === B && P.verb !== 'zap') this.holdProp(this.prop(P.prop), B, { both: false });
      if (P.verb === 'zap' && this.wizard === B) this.holdProp(this.prop('wand'), B);
    }
  }

  verb(t, vS, vE, step, gap) {
    const P = this.pair;
    const { A, B } = this;
    const p = clamp01((t - vS) / (vE - vS));
    const line = (a) => P.lines?.[a.spec.id];
    this.once1('l1', () => this.say(this.first, line(this.first), 1.7));
    if (p > 0.48) this.once1('l2', () => this.say(this.second, line(this.second), 1.7));
    const mid = () => new Vector3((A.x + B.x) / 2, Math.max(A.H, B.H) * 0.85, 0);
    switch (P.verb) {
      case 'toss': {
        const g = this.giver, r = this.taker;
        this.pose(g, 'throw', Math.min(0.999, p), step);
        this.pose(r, 'catch', Math.min(0.999, Math.max(0, p - 0.08)), step);
        const pr = this.prop(P.prop);
        if (p < 0.42) this.holdProp(pr, g);
        else if (p < 0.64) {
          const u = (p - 0.42) / 0.22;
          const a = this.handPos(g, 'r'), b = this.handPos(r, 'r').lerp(this.handPos(r, 'l'), 0.5);
          pr.position.lerpVectors(a, b, u);
          pr.position.y += Math.sin(u * Math.PI) * 80;
          pr.rotation.set(u * 9, u * 4, u * 7);
        } else this.holdProp(pr, r, { both: true });
        break;
      }
      case 'handoff': {
        const g = this.giver, r = this.taker;
        this.pose(g, 'give', Math.min(0.999, p), step);
        this.pose(r, 'take', Math.min(0.999, p), step);
        this.holdProp(this.prop(P.prop), p < 0.5 ? g : r);
        break;
      }
      case 'highfive':
      case 'fistbump': {
        this.pose(A, P.verb, Math.min(0.999, p), step);
        this.pose(B, P.verb, Math.min(0.999, p), step);
        if (p > (P.verb === 'highfive' ? 0.47 : 0.45)) this.once1('sfx', () => this.sfx(P.sfx || 'SLAP!', mid()));
        break;
      }
      case 'bow': {
        const kind = (a) => (a.spec.body === 'doll' ? 'curtsy' : 'bow');
        this.pose(A, kind(A), Math.min(0.999, p), step);
        this.pose(B, kind(B), Math.min(0.999, Math.max(0, p - 0.1)), step);
        break;
      }
      case 'hug': {
        B.x = gap - smooth((p - 0.1) / 0.3) * 14 + smooth((p - 0.8) / 0.2) * 14;
        this.pose(A, 'hug', Math.min(0.999, p), step);
        this.pose(B, 'hug', Math.min(0.999, p), step);
        if (p > 0.45) this.once1('sfx', () => this.sfx('💞 SQUISH 💞', mid()));
        break;
      }
      case 'dance': {
        this.loop(A, 'dance', t, step);
        this.loop(B, P.alt || 'dance', t, step, 0.5);
        break;
      }
      case 'flexoff': {
        this.loop(A, 'flex', t, step);
        this.loop(B, 'flex', t, step, 0.5);
        if (p > 0.55) this.once1('sfx', () => this.sfx('💪 GAINS 💪', mid()));
        break;
      }
      case 'zap': {
        const w = this.wizard, v = this.victim;
        this.loop(w, 'point', t, step);
        this.holdProp(this.prop('wand'), w);
        if (p < 0.4) { v.mood = 'worried'; this.loop(v, 'idle', t, step); }
        else {
          this.once1('sfx', () => this.sfx(P.sfx || '✨ ZAP ✨', new Vector3(v.x, v.H * 0.7, 0)));
          v.spin = (p - 0.4) * 22;
          this.loop(v, 'zapped', t, step);
        }
        break;
      }
      case 'cheer': {
        // a jump-for-joy together
        this.loop(A, 'cheer', t, step);
        this.loop(B, 'cheer', t, step, 0.35);
        if (p > 0.3) this.once1('sfx', () => this.sfx(P.sfx || 'WOO!', mid()));
        break;
      }
      case 'chat': {
        // whoever's speaking talks with their hands; the other nods along
        const talking = p < 0.48 ? this.first : this.second;
        for (const a of [A, B]) this.loop(a, a === talking ? 'talk' : 'headNod', t, step, a === B ? 0.3 : 0);
        break;
      }
      default:
        this.loop(A, 'wave', t, step);
        this.loop(B, 'wave', t, step);
    }
  }

  sceneB(t, step, T, cutAt) {
    const B = this.B;
    B.char.group.visible = true;
    B.x = 0; B.z = 0; B.dir = 1; B.spin = 0; B.scale = 1;
    B.turn = 0.4;
    const drop = this.pair.cam === 'drop';
    const arriveEnd = Math.max(cutAt + 1.2, T(8.8));
    if (drop) B.y = Math.max(0, 1 - easeIn((t - cutAt) / 0.55)) * 160;
    else B.y = 0;
    if (t < arriveEnd) {
      this.once1('arrive', () => this.say(B, ARRIVE[B.spec.id], 1.8));
      if (drop && t < cutAt + 1.1) this.once(B, 'land', t, cutAt + 0.35, cutAt + 1.1, step);
      else this.loop(B, 'wave', t, step);
    } else {
      const pr = this.prep;
      if (t > arriveEnd + 0.4 && this.total - t > 1.2) this.once1('prep', () => this.say(B, pr.line, 2));
      this.loop(B, pr.act, t - arriveEnd, step);
    }
  }
}

export function ctxFor(ex) {
  const fit = sceneFit(rigFor(ex));
  const cx = (fit.bbox.x0 + fit.bbox.x1) / 2;
  return { left: fit.bbox.x0 - cx, right: fit.bbox.x1 - cx, width: fit.bbox.x1 - fit.bbox.x0 };
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}
