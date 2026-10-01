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
import { actEx, pairFor, ARRIVE, BREATHERS, PREP } from './acts.js';
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
      g.add(at(mesh(capsule(2.6, 22, 90, 0.2), M('#3a3a3f', { metal: 0.4, rough: 0.4 })), 0, 0, 0, Math.PI / 2, 0, 0));
      for (const z of [-13, 13]) g.add(at(mesh(sphere(7.5, 91 + z, 0.5), M('#e5484d', { gloss: 0.3 })), 0, 0, z, 0, 0, 0, [1, 1, 0.75]));
      g.userData.axis = 'z';
      break;
    }
    case 'kettlebell': {
      g.add(at(mesh(sphere(13, 92, 0.6), M('#2b2b2e', { metal: 0.3, rough: 0.5 })), 0, -14, 0));
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
      g.add(at(mesh(capsule(1.4, 26, 96, 0.15), M('#c98d55')), 0, 8, 0));
      g.add(at(mesh(sphere(5, 97, 0.3), M('#c98d55')), 0, 24, 0, 0, 0, 0, [1, 1.3, 0.45]));
      g.userData.axis = 'arm';
      break;
    }
    case 'wand': {
      g.add(at(mesh(capsule(1.3, 34, 98, 0.12), M('#5a3a22')), 0, 10, 0));
      g.add(at(mesh(sphere(4, 99, 0.3), clay('#ffe066', { emissive: '#ffd23f', ei: 0.9 })), 0, 28, 0));
      g.userData.axis = 'arm';
      break;
    }
    case 'towel': {
      g.add(at(mesh(roundedBox(10, 36, 2.4, 1.2, 100, 0.6), M('#ffffff', { felt: true })), 0, -14, 0));
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
    default: g.add(mesh(sphere(6, 108), M('#ffc93c')));
  }
  return g;
}

/* ---------- the director ---------- */
export class Interlude {
  // from / to: { ex, charId? } — total: rest length in seconds — overlay: element for bubbles & wipes
  constructor(stage, { from, to, total = 10, look, overlay = null }) {
    this.st = stage;
    this.look = look;
    this.ov = overlay;
    this.total = total;
    this.fromSpec = (from.charId && CAST_BY_ID[from.charId]) || characterFor(from.ex);
    this.toSpec = (to.charId && CAST_BY_ID[to.charId]) || characterFor(to.ex);
    this.toEx = to.ex;
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
    this.pair = this.B ? pairFor(this.fromSpec.id, this.toSpec.id) : null;
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
    a.out = a.char.pose(J, { blink: (step + a.n * 17) % 37 === 0, effort: a.effort || 0, squash: 1, seed: (step % 7) + 1, boil: 1 });
    a.char.jitter(mulberry(step * 3 + a.n + 1), 1);
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

  handPos(a, side = 'r') {
    return a.char.group.localToWorld(a.out[side + 'Hand'].clone());
  }
  holdProp(p, a, { both = false } = {}) {
    const g = a.char.group;
    const hand = both ? this.handPos(a, 'r').lerp(this.handPos(a, 'l'), 0.5) : this.handPos(a, 'r');
    p.position.copy(hand);
    const elbow = g.localToWorld(a.out.rElbow.clone());
    const axis = p.userData.axis;
    p.rotation.set(0, 0, 0);
    if (axis === 'arm') {
      const d = hand.clone().sub(elbow).normalize();
      p.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), d);
    } else if (axis === 'z' || axis === 'flat') {
      p.rotation.y = g.rotation.y;
    } else if (axis === 'up') {
      p.rotation.y = g.rotation.y;
      p.position.y -= 4;
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
    if (mv === 'handheld') { const r = mulberry(step + 3); az += (r() - 0.5) * 0.012; el += (r() - 0.5) * 0.01; }
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
    this.bubbles = this.bubbles.filter((b) => {
      if (this.now > b.until || (b.a && !b.a.char.group.visible)) { b.el.remove(); return false; }
      let p;
      if (b.a) { p = new Vector3(); b.a.char.head.getWorldPosition(p); p.y += b.a.char.b.headR * 1.6; }
      else p = b.at.clone();
      p.project(cam);
      const x = ((p.x + 1) / 2) * W, y = ((1 - p.y) / 2) * H;
      const right = x > W * 0.58;
      b.el.classList.toggle('tail-r', right && !!b.a);
      b.el.style.left = `${Math.max(36, Math.min(W - 36, x))}px`;
      b.el.style.top = `${Math.max(56, Math.min(H * 0.8, y))}px`;
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
    this.first = P.owner ? this.giver : A;
    this.second = this.first === A ? B : A;
  }

  /* ----- per frame ----- */
  update(tt, step) {
    if (this.t0 == null) this.t0 = tt;
    const t = tt - this.t0;
    this.now = t;
    if (this.mode === 'breather') this.breather(t, tt, step);
    else this.handover(t, tt, step);
    this.st.set?.update(tt);
    this.placeBubbles();
  }

  breather(t, tt, step) {
    const a = this.A;
    const list = BREATHERS[a.spec.id] || BREATHERS.pip;
    const env = this.envA;
    const prepAt = this.total >= 6 ? this.total - 3 : Infinity;
    a.turn = 0.35;
    const shot = this.shot(env, 0, 200, a.H);
    const cam = this.cam0 ? this.mixCam(this.cam0, shot, smooth(t / 1.4)) : shot;
    this.applyCam(cam, env, tt, step);
    for (const p of this.props.values()) p.visible = false;
    if (t >= prepAt) {
      const pr = PREP[this.toEx?.cat] || PREP.default;
      this.once1('prep', () => this.say(a, pr.line, 2.2));
      this.loop(a, pr.act, t - prepAt, step);
      return;
    }
    const seg = 3.8;
    const i = Math.floor(t / seg);
    const b = list[i % list.length];
    this.once1('b' + i, () => { if (i % 2 === 0 || i < list.length) this.say(a, b.line, 2.2); });
    this.loop(a, b.act, t - i * seg, step);
    if (b.prop) this.holdProp(this.prop(b.prop), a);
  }

  handover(t, tt, step) {
    const k = this.k;
    const T = (x) => x * k;
    const P = this.pair;
    const { A, B } = this;
    const gap = P.gap || 90;
    const envA = this.envA, envB = this.setB.env;
    const cutAt = T(6.5);
    if (!this.inB && t >= cutAt) { this.inB = true; this.useSet(this.setB); for (const p of this.props.values()) p.visible = false; A.char.group.visible = false; }
    // ---------------- camera moves into / out of the cut ----------------
    const cin = clamp01((t - T(6)) / (cutAt - T(6))); // 0..1 approaching the cut
    const cout = clamp01((t - cutAt) / (T(7.1) - cutAt)); // 0..1 leaving it
    const blurU = this.inB ? 1 - easeOut(cout) : easeIn(cin);
    if (this.ov) this.ov.style.backdropFilter = ['whip', 'spin'].includes(P.cam) && blurU > 0.02 ? `blur(${(blurU * 9).toFixed(1)}px)` : '';
    if (!this.inB) {
      const two = this.shot(envA, gap / 2, gap + 130, Math.max(A.H, B.H) * 1.05);
      let cam = this.cam0 ? this.mixCam(this.cam0, two, smooth((t - T(0.4)) / T(2.2))) : two;
      cam = this.cutMove(cam, easeIn(cin), +1);
      this.applyCam(cam, envA, tt, step);
      this.wipe(easeIn(cin), P.wipe || '');
      this.sceneA(t, step, T, gap);
    } else {
      const solo = this.shot(envB, 0, 200, B.H);
      const cam = this.cutMove(solo, 1 - easeOut(cout), -1);
      this.applyCam(cam, envB, tt, step);
      this.wipe(1 - easeOut(cout), P.wipe || '');
      this.sceneB(t, step, T, cutAt);
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
    A.turn = 0.25; B.turn = 0.25;
    A.x = 0; A.dir = 1;
    // B strolls (or bounds) in from off-set
    const enter = clamp01((t - T(0.6)) / T(2));
    B.char.group.visible = t > T(0.6);
    B.x = gap + (1 - easeOut(enter)) * 300;
    B.dir = -1;
    const vS = T(2.6), vE = T(5);
    const exS = vE, exE = T(6.2);
    const fast = ['dee', 'jolene'].includes(B.spec.id);
    // --- outgoing actor
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
        A.dir = -1; A.x = -easeIn(u) * 320;
        this.loop(A, 'walk', t, step);
      }
      if (P.prop && P.verb !== 'zap' && this.taker === A) this.holdProp(this.prop(P.prop), A, { both: P.verb === 'toss' });
      if (P.verb === 'zap' && this.wizard === A) this.holdProp(this.prop('wand'), A);
    }
    // --- incoming actor
    if (t < vS) {
      this.loop(B, enter < 1 ? (fast ? 'run' : 'walk') : 'idle', t, step);
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
        if (p < 0.4) this.loop(v, 'idle', t, step);
        else {
          this.once1('sfx', () => this.sfx(P.sfx || '✨ ZAP ✨', new Vector3(v.x, v.H * 0.7, 0)));
          v.spin = (p - 0.4) * 22;
          this.loop(v, 'zapped', t, step);
        }
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
      const pr = PREP[this.toEx?.cat] || PREP.default;
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
