// SuperSweatClub — 3D claymation renderer (WebGL via a tiny three.js bundle).
// The 2D rig in clay.js drives every pose. Each exercise is performed by a member of
// the clay cast (js/cast.js) on their own miniature set, shot with that set's lens,
// lighting and colour grade, and animated "on twos" like real stop-motion.
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, Vector3, Color, Fog, Vector2,
  HemisphereLight, DirectionalLight, SpotLight, AmbientLight, PlaneGeometry, ShadowMaterial,
  SRGBColorSpace, ACESFilmicToneMapping, VSMShadowMap, WebGLRenderTarget, HalfFloatType,
  EffectComposer, RenderPass, ShaderPass, OutputPass, BokehPass,
} from './vendor/three.js';
import { rigFor, sceneFit, DEFAULT_LOOK } from './clay.js';
import { characterFor, CAST_BY_ID, colorsFor } from './cast.js';
import { Character } from './c3d/character.js';
import { buildSet } from './c3d/sets.js';
import { Props, propMats } from './c3d/props.js';
import { clayBump, mulberry } from './c3d/kit.js';
import { Interlude } from './c3d/director.js';

/* ---------- colour grade (VHS, grain, vignette, tint) ---------- */
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uRes: { value: new Vector2(1, 1) },
    uVignette: { value: 0.3 }, uGrain: { value: 0.04 }, uSat: { value: 1 }, uContrast: { value: 1 },
    uTint: { value: new Vector3(1, 1, 1) }, uVhs: { value: 0 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uVignette, uGrain, uSat, uContrast, uVhs; uniform vec2 uRes; uniform vec3 uTint;
    varying vec2 vUv;
    float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      vec3 col;
      if (uVhs > 0.0) {
        float wob = sin(uv.y * 220.0 + uTime * 2.0) * 0.0004 * uVhs;
        float sh = 0.0028 * uVhs;
        col.r = texture2D(tDiffuse, uv + vec2(sh + wob, 0.0)).r;
        col.g = texture2D(tDiffuse, uv + vec2(wob, 0.0)).g;
        col.b = texture2D(tDiffuse, uv - vec2(sh - wob, 0.0)).b;
        col = mix(col, (texture2D(tDiffuse, uv + vec2(0.002, 0.0)).rgb + texture2D(tDiffuse, uv - vec2(0.002, 0.0)).rgb) * 0.5, 0.35 * uVhs);
      } else col = texture2D(tDiffuse, uv).rgb;
      col = (col - 0.5) * uContrast + 0.5;
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(l), col, uSat) * uTint;
      if (uVhs > 0.0) {
        col *= 1.0 - uVhs * 0.07 * (0.5 + 0.5 * sin(uv.y * uRes.y * 1.6));
        col += vec3(0.02, 0.0, 0.03) * uVhs * smoothstep(0.92, 1.0, rnd(vec2(uv.y * 40.0, floor(uTime * 12.0))));
      }
      vec2 d = uv - 0.5; d.x *= uRes.x / uRes.y;
      col *= 1.0 - uVignette * smoothstep(0.3, 0.95, length(d) * 1.25);
      col += (rnd(uv * uRes + floor(uTime * 12.0) * 13.1) - 0.5) * uGrain;
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }`,
};

let webglOK = null;
export function supported() {
  if (webglOK !== null) return webglOK;
  try {
    const c = document.createElement('canvas');
    webglOK = !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { webglOK = false; }
  return webglOK;
}

class Stage {
  constructor(canvas, { alpha = false, post = true, shadowSize = 1024 } = {}) {
    const r = (this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha, powerPreference: 'high-performance', preserveDrawingBuffer: !!window.__pulseCapture }));
    r.outputColorSpace = SRGBColorSpace;
    r.toneMapping = ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = VSMShadowMap;
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(30, 320 / 250, 5, 6000);
    const s = this.scene;
    this.hemi = new HemisphereLight('#fff4e6', '#b88a6e', 1.15);
    this.ambient = new AmbientLight('#ffffff', 0.15);
    const shadowed = (L) => {
      L.castShadow = true;
      L.shadow.mapSize.set(shadowSize, shadowSize);
      L.shadow.bias = -0.0006;
      L.shadow.normalBias = 0.4;
      L.shadow.radius = 7;
      L.shadow.blurSamples = 16;
      return L;
    };
    this.key = shadowed(new DirectionalLight('#fff0dc', 2.6));
    Object.assign(this.key.shadow.camera, { left: -320, right: 320, top: 320, bottom: -320, near: 50, far: 1600 });
    this.spot = shadowed(new SpotLight('#ffffff', 0, 0, 0.5, 0.5, 0));
    this.spot.shadow.camera.far = 1600;
    this.rim = new DirectionalLight('#d8e6ff', 1.1);
    this.rim.position.set(180, 160, -260);
    this.fill = new DirectionalLight('#ffe6f0', 0.5);
    this.fill.position.set(260, 60, 200);
    s.add(this.hemi, this.ambient, this.key, this.key.target, this.spot, this.spot.target, this.rim, this.fill);
    this.world = new Group();
    s.add(this.world);
    this.mats = propMats();
    this.sets = new Map();
    this.chars = new Map();
    this.safe = { top: 0, bottom: 0 };
    this.alpha = alpha;
    this.post = post;
    this.size = new Vector2(640, 500);
    if (post) {
      const rt = new WebGLRenderTarget(640, 500, { samples: 4, type: HalfFloatType });
      this.composer = new EffectComposer(r, rt);
      this.composer.addPass(new RenderPass(s, this.camera));
      this.bokeh = new BokehPass(s, this.camera, { focus: 600, aperture: 0.00005, maxblur: 0.008 });
      this.composer.addPass(this.bokeh);
      this.composer.addPass(new OutputPass());
      this.grade = new ShaderPass(GradeShader);
      this.composer.addPass(this.grade);
    }
  }

  getSet(id, ctx) {
    const key = `${id}:${Math.round(ctx.left / 30)}:${Math.round(ctx.right / 30)}`;
    if (!this.sets.has(key)) this.sets.set(key, buildSet(id, ctx));
    return this.sets.get(key);
  }

  getChar(spec, look) {
    let c = this.chars.get(spec.id);
    const colors = colorsFor(spec, look);
    if (!c) { c = new Character(spec, colors); this.chars.set(spec.id, c); } else if (c.c !== colors) c.setColors(colors);
    return c;
  }

  build(ex, look, { bare = false, charId = null, floor = true } = {}) {
    this.world.clear();
    const rig = rigFor(ex);
    const fit = sceneFit(rig);
    this.rig = rig; this.fit = fit; this.ex = ex;
    const cx = (fit.bbox.x0 + fit.bbox.x1) / 2;
    const ctx = { left: fit.bbox.x0 - cx, right: fit.bbox.x1 - cx, width: fit.bbox.x1 - fit.bbox.x0 };
    const spec = (charId && CAST_BY_ID[charId]) || characterFor(ex);
    this.spec = spec;
    this.char = this.getChar(spec, look);
    const cg = this.char.group;
    cg.position.set(0, 0, 0); cg.rotation.set(0, 0, 0); cg.scale.set(1, 1, 1); cg.visible = true;
    this.world.add(cg);
    this.props = new Props(ex.anim, fit, this.mats);
    this.world.add(this.props.group);
    this.set = this.getSet(spec.set, ctx);
    const env = this.set.env;
    this.env = env;
    if (bare) {
      this.scene.background = null;
      this.scene.fog = null;
    }
    if (bare && floor) {
      const sc = new Mesh(new PlaneGeometry(1200, 1200), new ShadowMaterial({ opacity: 0.22 }));
      sc.rotation.x = -Math.PI / 2;
      sc.receiveShadow = true;
      this.world.add(sc);
    } else if (!bare) {
      this.world.add(this.set.group);
      this.scene.background = new Color(env.bg);
      this.scene.fog = env.fog ? new Fog(new Color(env.fog[0]), env.fog[1], env.fog[2]) : null;
    }
    this.mats.mat.color.set(env.mat || '#8f7cff');
    // some floors are the workout surface themselves (DJ Dee trains right on the dance floor)
    if (this.props.matMesh) this.props.matMesh.visible = !env.noMat || bare;
    this.applyEnv(env, bare);
    this.frame();
  }

  applyEnv(env, bare) {
    this.hemi.color.set(env.hemi[0]); this.hemi.groundColor.set(env.hemi[1]); this.hemi.intensity = bare ? Math.max(0.9, env.hemi[2]) : env.hemi[2];
    this.ambient.intensity = bare ? 0.2 : env.ambient;
    const k = env.key;
    const useSpot = !!k.spot && !bare;
    this.key.intensity = useSpot ? 0.25 : k.i;
    this.key.color.set(k.color);
    this.key.position.set(...k.pos);
    this.key.castShadow = !useSpot;
    this.spot.intensity = useSpot ? k.i : 0;
    this.spot.castShadow = useSpot;
    if (useSpot) {
      this.spot.color.set(k.color);
      this.spot.position.set(...k.pos);
      this.spot.angle = k.spot.angle;
      this.spot.penumbra = k.spot.penumbra;
      this.spot.decay = k.spot.decay ?? 0;
      this.spot.target.position.set(0, 40, 0);
    }
    this.rim.color.set(env.rim.color); this.rim.intensity = env.rim.i;
    this.fill.color.set(env.fill.color); this.fill.intensity = env.fill.i;
    this.camera.fov = env.cam.fov;
    if (this.grade) {
      const g = env.grade, u = this.grade.uniforms;
      u.uVignette.value = g.vignette; u.uGrain.value = g.grain; u.uSat.value = g.sat; u.uContrast.value = g.contrast;
      u.uTint.value.set(...g.tint); u.uVhs.value = g.vhs || 0;
    }
  }

  // Fit the actor (plus props) into the safe area left free by floating UI.
  frame(zoom = 1) {
    const b = this.fit.bbox;
    const anim = this.ex.anim;
    // allow for things the 2D rig doesn't know about: held weights, big heads, hats, hair
    const extra = (anim.hold ? 22 : 0) + (this.char.b.headR - 18) * 1.6 + (['wizard', 'chef', 'antenna'].includes(this.spec.hat) || this.spec.hair === 'afro' || this.spec.hair === 'curly' ? 22 : 0);
    const W = b.x1 - b.x0 + 40, H = this.fit.G - b.y0 + 12 + extra;
    const lying = this.fit.G - b.y0 < 110;
    this.az = this.env.cam.az;
    // barbells and pull-up bars run toward the lens from a side view: swing round to the front
    if (anim.hold === 'barbell' || anim.hold === 'barbellBack') this.az = Math.max(this.az, 1.12);
    if ((anim.props || []).some((p) => p.type === 'bar')) this.az = Math.max(this.az, 0.7);
    this.el = this.env.cam.el + (lying ? 0.12 : 0);
    const t = Math.tan((this.camera.fov * Math.PI) / 360);
    const usable = Math.max(0.3, 1 - this.safe.top - this.safe.bottom);
    const dist = Math.max(H / usable / 2 / t, W / 0.88 / 2 / (t * this.camera.aspect)) * 1.1 + 30;
    this.target = new Vector3(0, (this.fit.G - b.y0 + extra) * 0.48, 0);
    this.camDist = dist / zoom;
    // keep fog behind the actor whatever the framing distance
    if (this.scene.fog && this.env.fog) {
      this.scene.fog.near = this.camDist + 120;
      this.scene.fog.far = this.camDist + 120 + (this.env.fog[2] - this.env.fog[1]);
    }
    this.setCam(this.az, this.el);
  }

  setCam(az, el, target = this.target, dist = this.camDist, roll = 0) {
    const c = this.camera;
    this.cam = { az, el, target, dist };
    c.position.set(target.x + Math.sin(az) * Math.cos(el) * dist, target.y + Math.sin(el) * dist, target.z + Math.cos(az) * Math.cos(el) * dist);
    c.lookAt(target);
    if (roll) c.rotateZ(roll);
    const { x: w, y: h } = this.size;
    const yc = this.safe.top + (1 - this.safe.top - this.safe.bottom) / 2;
    if (Math.abs(yc - 0.5) > 0.001) c.setViewOffset(w, h, 0, (0.5 - yc) * h, w, h);
    else c.clearViewOffset();
    c.updateProjectionMatrix();
    if (this.bokeh) {
      const u = this.bokeh.uniforms;
      u.focus.value = c.position.distanceTo(target);
      u.aperture.value = (this.env?.dof.aperture ?? 1) * 0.000045;
      u.maxblur.value = this.env?.dof.maxblur ?? 0.008;
    }
  }

  pose(phase, { blink = false, jitter = 0, seed = 0, still = false } = {}) {
    const rig = this.rig;
    const { pts } = rig.pose(phase);
    const anim = this.ex.anim;
    const J = this.char.joints(pts, this.fit, anim);
    this.J = J;
    const n = rig.frames.length;
    // effort drives the face: strain at the hard part of each rep, steady strain on holds
    const effort = n > 1 ? Math.max(0, Math.min(1, (Math.cos(2 * Math.PI * (phase - rig.cum[1])) - 0.15) / 0.6)) : this.ex.cat === 'mobility' ? 0 : 0.6;
    // squash & stretch + head lag from the motion itself (velocity / acceleration of the rig)
    let squash = 1, lag = null;
    const pinHands = anim.anchor === 'hands' || (anim.props || []).some((p) => p.type === 'bar');
    if (!still && n > 1) {
      const dp = 0.02, T = rig.tempo * dp;
      const a = rig.pose(phase - dp).pts, b = rig.pose(phase + dp).pts;
      const y = (q) => -q.pelvis[1];
      const v = (y(b) - y(a)) / (2 * T);
      const acc = (y(b) - 2 * y(pts) + y(a)) / (T * T);
      squash = pinHands ? 1 : 1 + Math.max(-0.07, Math.min(0.1, v * 0.0008)) - Math.max(-0.06, Math.min(0.12, acc * 0.00003));
      const ax = (b.head[0] - 2 * pts.head[0] + a.head[0]) / (T * T), ay = -(b.head[1] - 2 * pts.head[1] + a.head[1]) / (T * T);
      const k = 0.0016;
      lag = new Vector3(Math.max(-4, Math.min(4, -ax * k)), Math.max(-4, Math.min(4, -ay * k)), 0);
    }
    // pose-driven squash & stretch: reach tall when arms go overhead, squash wide in a deep squat
    if (!pinHands) {
      const over = (Math.max(0, Math.min(1, (J.rHand.y - J.shoulder.y) / 55)) + Math.max(0, Math.min(1, (J.lHand.y - J.shoulder.y) / 55))) / 2;
      const upright = Math.abs(J.neck.x - J.pelvis.x) < Math.abs(J.neck.y - J.pelvis.y);
      const pelvisH = J.pelvis.y - Math.min(J.rHeel.y, J.lHeel.y);
      const squat = upright ? Math.max(0, Math.min(1, (70 - pelvisH) / 35)) : 0;
      squash *= 1 + 0.09 * over - 0.1 * squat;
    }
    const boil = jitter ? 1 : 0;
    const out = this.char.pose(J, { blink, effort, squash, lag, seed, boil, pinHands });
    this.props.update(out, phase);
    if (jitter) {
      const rnd = mulberry(seed);
      this.char.jitter(rnd, jitter);
      clayBump().offset.set(rnd() * 0.04, rnd() * 0.04);
    }
  }

  animate(t) { this.set?.update(t); }

  resize(w, h, dpr) {
    this.size.set(w, h);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.composer) {
      this.composer.setPixelRatio(dpr);
      this.composer.setSize(w, h);
      this.grade.uniforms.uRes.value.set(w * dpr, h * dpr);
    }
  }

  render(t = 0, { raw = false } = {}) {
    if (this.composer && !raw) {
      this.grade.uniforms.uTime.value = t;
      this.composer.render();
    } else this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.renderer.dispose();
    this.renderer.forceContextLoss?.();
  }
}

/* ---------- live player ---------- */
export class ClayPlayer3D {
  constructor(el, ex, opts = {}) {
    this.el = el;
    this.look = { ...DEFAULT_LOOK, ...(opts.look || {}) };
    this.fps = opts.fps ?? 12;
    this.boil = opts.boil ?? true;
    this.speed = opts.speed ?? 1;
    this.charId = opts.charId || null;
    this.t = 0;
    this.playing = false;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'clay-canvas';
    this.canvas.setAttribute('role', 'img');
    this.stage = new Stage(this.canvas, { post: opts.post ?? true });
    this.stage.safe = { top: opts.safe?.top || 0, bottom: opts.safe?.bottom || 0 };
    this.maxDpr = opts.maxDpr || 1.75;
    this.ro = new ResizeObserver(() => this.fitSize());
    this.ro.observe(el);
    this.setExercise(ex);
  }
  fitSize() {
    const r = this.el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.stage.resize(r.width, r.height, Math.min(this.maxDpr, window.devicePixelRatio || 1));
    this.stage.frame();
    this.draw(true);
  }
  setSafe(safe) {
    this.stage.safe = { ...this.stage.safe, ...safe };
    this.stage.frame();
    this.draw(true);
  }
  setExercise(ex, charId = this.charId) {
    if (this.inter && this.stage.cam) { const c = this.stage.cam; this.camFrom = { az: c.az, el: c.el, dist: c.dist, target: c.target.clone() }; this.blend0 = this.t; }
    this.endInterlude();
    this.ex = ex;
    this.charId = charId;
    this.stage.build(ex, this.look, { charId });
    this.canvas.setAttribute('aria-label', `${ex.name} — ${this.stage.spec.name}, claymation`);
    if (this.canvas.parentNode !== this.el) { this.el.innerHTML = ''; this.el.appendChild(this.canvas); }
    this.lastStep = -1;
    this.fitSize();
  }
  get character() { return this.stage.spec; }
  // rest-period film: handover to the next character, a breather, then getting ready
  interlude({ from, to, total }) {
    this.endInterlude();
    if (!this.ov) {
      this.ov = document.createElement('div');
      this.ov.className = 'il-ov';
      this.el.appendChild(this.ov);
    }
    this.inter = new Interlude(this.stage, { from, to, total, look: this.look, overlay: this.ov });
    this.canvas.setAttribute('aria-label', `Rest — ${this.inter.mode === 'handover' ? `${this.inter.fromSpec.name} hands over to ${this.inter.toSpec.name}` : `${this.inter.fromSpec.name} takes a breather`}`);
    this.lastStep = -1;
    this.draw(true);
  }
  endInterlude() {
    if (!this.inter) return;
    this.inter.dispose();
    this.inter = null;
  }
  setLook(look) {
    this.look = { ...DEFAULT_LOOK, ...look };
    this.stage.getChar(this.stage.spec, this.look);
    this.draw(true);
  }
  // Puppets move on twos (12 fps stop-motion); the camera glides at up to 30 fps so moves,
  // cuts and handovers stay smooth instead of stepping.
  draw(force) {
    const stop = !!this.fps;
    const step = Math.floor(this.t * (this.fps || 12));
    const camStep = Math.floor(this.t * 30);
    const newPose = force || !stop || step !== this.lastStep;
    if (!newPose && camStep === this.lastCam) return;
    this.lastCam = camStep;
    if (newPose) this.lastStep = step;
    const st = this.stage;
    const tt = stop ? step / this.fps : this.t;
    const tc = this.t;
    if (this.inter) {
      this.inter.update(tt, step, tc, newPose);
      st.renderer.toneMappingExposure = 1.05 + (this.boil ? (mulberry(step)() - 0.5) * 0.035 : 0);
      st.render(tt);
      return;
    }
    if (newPose) {
      const phase = tt / st.rig.tempo;
      st.pose(phase, { blink: step % 41 === 0, jitter: this.boil ? 1 : 0, seed: (step % 7) + 1 });
      st.animate(tt);
    }
    // the camera moves like a real stop-motion rig: slow orbit, slider dolly or a gentle handheld sway
    const mv = st.env.cam.move;
    let az = st.az + Math.sin(tc * 0.35) * 0.08, el = st.el + Math.sin(tc * 0.23) * 0.02, dist = st.camDist;
    if (mv === 'dolly') { az = st.az + Math.sin(tc * 0.2) * 0.04; dist *= 1 + Math.sin(tc * 0.3) * 0.05; }
    if (mv === 'handheld') { az += Math.sin(tc * 1.3) * 0.006 + Math.sin(tc * 0.71 + 1) * 0.004; el += Math.sin(tc * 1.1 + 2) * 0.004; }
    let target = st.target;
    // ease out of a rest-period film into this move's framing instead of cutting
    if (this.camFrom) {
      const u = Math.min(1, (this.t - this.blend0) / 0.9);
      const e = u * u * (3 - 2 * u);
      const f = this.camFrom;
      az = f.az + (az - f.az) * e; el = f.el + (el - f.el) * e; dist = f.dist + (dist - f.dist) * e;
      target = f.target.clone().lerp(st.target, e);
      if (u >= 1) this.camFrom = null;
    }
    st.setCam(az, el, target, dist);
    st.renderer.toneMappingExposure = 1.05 + (this.boil ? (mulberry(step)() - 0.5) * 0.035 : 0);
    st.render(tt);
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
  destroy() {
    this.endInterlude();
    this.pause();
    this.ro.disconnect();
    this.stage.dispose();
    this.canvas.remove();
  }
}

/* ---------- stills (thumbnails, avatars, cast cards) ---------- */
let stillStage = null;
let queue = Promise.resolve();

export function renderStill(ex, look, { phase, bare = false, floor = true, portrait = false, width = 640, height = 500, charId = null, t = 2 } = {}) {
  const job = queue.then(async () => {
    if (!stillStage) stillStage = new Stage(document.createElement('canvas'), { alpha: true, post: true, shadowSize: 1024 });
    const st = stillStage;
    st.safe = { top: 0, bottom: 0 };
    st.resize(width, height, 1);
    st.build(ex, { ...DEFAULT_LOOK, ...(look || {}) }, { bare, charId, floor });
    const ph = phase ?? ex.anim.still ?? (st.rig.frames.length > 1 ? st.rig.cum[1] : 0);
    st.pose(ph, { still: true });
    st.animate(t);
    if (portrait) {
      const h = st.J.head;
      st.setCam(0.55, 0.1, new Vector3(h.x + 4, h.y - 4, 0), 170);
    }
    st.renderer.toneMappingExposure = 1.05;
    st.render(t, { raw: bare });
    return new Promise((res) => st.renderer.domElement.toBlob(res, bare ? 'image/png' : 'image/webp', 0.9));
  });
  queue = job.catch(() => {});
  return job;
}
