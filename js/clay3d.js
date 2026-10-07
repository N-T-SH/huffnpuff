// Huff n Puff — 3D claymation renderer (WebGL via a tiny three.js bundle).
// The 2D rig in clay.js drives every pose. Each exercise is performed by a member of
// the clay cast (js/cast.js) on their own miniature set, shot with that set's lens,
// lighting and colour grade, and animated "on twos" like real stop-motion.
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, Vector3, Color, Fog, Vector2,
  HemisphereLight, DirectionalLight, SpotLight, AmbientLight, PlaneGeometry, ShadowMaterial,
  SRGBColorSpace, ACESFilmicToneMapping, VSMShadowMap, WebGLRenderTarget, HalfFloatType,
  EffectComposer, RenderPass, ShaderPass, OutputPass, BokehPass,
} from './vendor/three.js';
import { rigFor, sceneFit, DEFAULT_LOOK, cadenceFor, holdFor } from './clay.js';
import * as store from './store.js';
import { characterFor, CAST_BY_ID, colorsFor } from './cast.js';
import { Character } from './c3d/character.js';
import { buildSet } from './c3d/sets.js';
import { Props, propMats } from './c3d/props.js';
import { clayBump, mulberry } from './c3d/kit.js';
import { Interlude } from './c3d/director.js';
import { faceFor, mixFace } from './c3d/faces.js';
import { powerOpts } from './power.js';

/* ---------- colour grade (VHS, grain, vignette, tint) ---------- */
// Depth of field that keeps the actor crisp: everything within `band` of the focus distance is
// left untouched, and blurred background (or foreground) pixels only gather samples from their
// own depth layer — so the in-focus character never smears into a halo over the backdrop.
const DOF_FRAG = `
  #include <common>
  varying vec2 vUv;
  uniform sampler2D tColor; uniform sampler2D tDepth;
  uniform float maxblur, aperture, nearClip, farClip, focus, aspect, band;
  #include <packing>
  float sceneZ(const in vec2 uv) {
    #if DEPTH_PACKING == 1
    float d = unpackRGBAToDepth(texture2D(tDepth, uv));
    #else
    float d = texture2D(tDepth, uv).x;
    #endif
    return -perspectiveDepthToViewZ(d, nearClip, farClip);
  }
  void main() {
    float dz = sceneZ(vUv) - focus;
    float r = clamp((abs(dz) - band) * aperture, 0.0, maxblur);
    vec4 base = texture2D(tColor, vUv);
    if (r < 0.0004) { gl_FragColor = base; return; }
    float side = sign(dz);
    vec4 acc = base; float wsum = 1.0;
    for (int i = 0; i < 24; i++) {
      float fi = float(i) + 0.5;
      float rr = sqrt(fi / 24.0) * r;
      float th = fi * 2.39996;
      vec2 uv = vUv + vec2(cos(th), sin(th) * aspect) * rr;
      float sd = (sceneZ(uv) - focus) * side;
      float w = step(band * 0.6, sd); // same layer only (never the sharp actor)
      acc += texture2D(tColor, uv) * w; wsum += w;
    }
    gl_FragColor = acc / wsum;
  }`;

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
    const r = (this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha, powerPreference: 'default', preserveDrawingBuffer: !!window.__pulseCapture }));
    r.outputColorSpace = SRGBColorSpace;
    r.toneMapping = ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = VSMShadowMap;
    // shadows only change when something moves: a live player redraws them on each new pose
    // (stop-motion steps), not on every camera frame; anything else redraws them every render
    r.shadowMap.autoUpdate = false;
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
      this.bokeh.uniforms.band = { value: 100 }; // a whole character (even Bruno's far arm) stays sharp
      this.bokeh.materialBokeh.fragmentShader = DOF_FRAG;
      this.bokeh.materialBokeh.needsUpdate = true;
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
    this.exStart = null;
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
      u.aperture.value = (this.env?.dof.aperture ?? 1) * 0.00006;
      u.maxblur.value = this.env?.dof.maxblur ?? 0.008;
    }
  }

  pose(phase, { blink = false, jitter = 0, seed = 0, still = false, now = null, hold = undefined } = {}) {
    const rig = this.rig;
    const { pts } = rig.pose(phase, hold);
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
      const a = rig.pose(phase - dp, hold).pts, b = rig.pose(phase + dp, hold).pts;
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
    // hands grip whatever this move holds (dumbbells, bar, kettlebell, rope); otherwise relaxed / flat
    const h = anim.hold;
    const grip = pinHands || anim.rope || anim.fists || ['dumbbells', 'dumbbell', 'barbell', 'kettlebell', 'goblet'].includes(h);
    const hands = grip ? { r: 'grip', l: 'grip' } : h === 'dumbbell1' ? { r: 'grip', l: 'grip' } : null;
    // faces: each character's own working ↔ straining face with the rep's effort, wearing toward
    // tired as a long set goes on; calm for mobility; pure joy for the celebration
    const id = this.spec.id;
    let face = null;
    if (this.ex.id === 'celebrate') face = faceFor('laugh', id);
    else if (this.ex.cat === 'mobility') face = mixFace(faceFor('calm', id), faceFor('focused', id), effort * 0.6);
    else if (now != null) {
      this.exStart ??= now;
      const tired = Math.min(0.55, Math.max(0, (now - this.exStart - 12) / 45));
      face = mixFace(mixFace(faceFor('work', id), faceFor('strain', id), Math.min(1, effort)), faceFor('tired', id), tired);
    }
    const out = this.char.pose(J, { blink, effort, squash, lag, seed, boil, pinHands, now, hands, face });
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
    if (!this.manualShadows) this.renderer.shadowMap.needsUpdate = true;
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

// the clay surface re-boils every third frame (~4 a second): lively, not a buzz
export const boilStep = (step) => Math.floor(step / 3);

/* ---------- live player ---------- */
export class ClayPlayer3D {
  constructor(el, ex, opts = {}) {
    opts = powerOpts(opts); // battery saver: a cheaper scene
    this.el = el;
    this.look = { ...DEFAULT_LOOK, ...(opts.look || {}) };
    this.fps = opts.fps ?? 12;
    this.boil = opts.boil ?? true;
    this.speed = opts.speed ?? 1;
    this.directed = !!opts.directed; // the workout player: allowed the occasional close-up
    // how often the camera may redraw between puppet frames: the workout player glides (cuts and
    // close-ups), the decorative scenes elsewhere only drift, so they draw less (battery)
    this.camFps = opts.camFps ?? (this.directed ? 30 : 15);
    this.lastCu = -Infinity;
    this.charId = opts.charId || null;
    this.t = 0;
    this.playing = false;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'clay-canvas';
    this.canvas.setAttribute('role', 'img');
    this.opts = opts;
    this.stage = new Stage(this.canvas, { post: opts.post ?? true, shadowSize: opts.shadowSize });
    this.stage.manualShadows = true;
    this.stage.safe = { top: opts.safe?.top || 0, bottom: opts.safe?.bottom || 0 };
    this.maxDpr = opts.maxDpr || 1.75;
    this.watchContext();
    this.ro = new ResizeObserver(() => this.fitSize());
    this.ro.observe(el);
    // scrolled out of view: stop drawing altogether
    this.io = 'IntersectionObserver' in window ? new IntersectionObserver(([e]) => { this.offscreen = !e.isIntersecting; }) : null;
    this.io?.observe(el);
    this.setExercise(ex);
  }
  // the most device pixels we'll render (sharp on a phone, without exhausting GPU memory: the
  // multisampled half-float buffers behind the post effects cost ~30 bytes a pixel)
  dprCap(r) { return Math.max(1, Math.sqrt(1.15e6 / Math.max(1, r.width * r.height))); }
  fitSize() {
    const r = this.el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.dpr ??= Math.min(this.maxDpr, window.devicePixelRatio || 1);
    this.dpr = Math.min(this.dpr, this.dprCap(r));
    this.stage.resize(r.width, r.height, this.dpr);
    this.stage.frame();
    this.draw(true);
  }
  // Render at the screen's own sharpness, stepping the resolution down (and back up) if the
  // device can't keep up — a soft upscaled canvas is what made the cast look blurry.
  renderTimed(st, tt) {
    const now = performance.now();
    st.render(tt);
    // frame pacing is what the GPU actually delivers (frames are asked for ~30 times a second)
    const gap = now - (this.lastRender || 0);
    this.lastRender = now;
    if (gap > 250) return; // paused / hidden: not a measurement
    this.gap = this.gap == null ? gap : this.gap * 0.92 + gap * 0.08;
    if (now - (this.dprAt || 0) < 2500) return;
    const top = Math.min(this.maxDpr, window.devicePixelRatio || 1, this.dprCap(this.el.getBoundingClientRect()));
    let next = this.dpr;
    if (this.gap > 52 && this.dpr > 1.25) next = Math.max(1.25, this.dpr - 0.25);
    else if (this.gap < 38 && this.dpr < top && now - (this.dprUpAt || 0) > 10000) { next = Math.min(top, this.dpr + 0.25); this.dprUpAt = now; }
    if (next !== this.dpr) { this.dpr = next; this.dprAt = now; this.gap = null; this.fitSize(); }
  }
  // the performer's head on screen (px within the player element) and their half-width, for speech
  headScreen() {
    const st = this.stage;
    if (!st?.char || this.inter) return null;
    const W = this.el.clientWidth, H = this.el.clientHeight;
    const cam = st.camera;
    const head = st.char.head.getWorldPosition(new Vector3());
    const p = head.clone().project(cam);
    const right = new Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const q = head.clone().addScaledVector(right, st.char.b.bean ? 42 : 30).project(cam);
    const tp = head.clone().add(new Vector3(0, st.char.b.headR + 16, 0)).project(cam);
    const ft = st.char.group.position.clone().project(cam);
    return { x: ((p.x + 1) / 2) * W, y: ((1 - p.y) / 2) * H, hw: Math.abs(q.x - p.x) * W / 2, top: ((1 - tp.y) / 2) * H, feet: ((1 - ft.y) / 2) * H };
  }

  // Close-ups are planned per move, sparingly: at most one per move, never within 35 s of the last,
  // not before the move has settled in (9 s), and only some moves get one at all. The shot is
  // motivated: a face at the hard part, or the part of the body doing the move (hands closing on
  // the floor in a toe touch, the dumbbell in a curl, the hips in a squat), held 4–7 s.
  closeUp(st) {
    if (!this.directed || this.inter || !st.J || !st.char) return null;
    const t = this.t;
    if (this.cuPlan === undefined) {
      const rnd = mulberry(Math.floor(t * 1000) + (this.ex?.id || '').length * 97);
      const ok = rnd() < 0.42 || !!globalThis.__alwaysCloseUp; // (preview tools can force one)
      const hold = this.ex.anim.frames.length === 1;
      // a dolly in (face / working muscle), or a hard cut like an edit: to the angle that shows the
      // form best (side-on, or front-on for side-to-side moves) or straight to their face
      const r = rnd();
      // faces only when they're upright enough to see one (not face-down in a push-up)
      const up = st.J.neck.y - st.J.pelvis.y > Math.abs(st.J.neck.x - st.J.pelvis.x);
      let kind = hold ? (r < 0.5 ? 'face' : 'cut-face') : r < 0.3 ? 'face' : r < 0.55 ? 'action' : r < 0.85 ? 'cut-form' : 'cut-face';
      if (!up && kind === 'face') kind = hold ? 'cut-form' : 'action';
      if (!up && kind === 'cut-face') kind = 'cut-form';
      const forced = globalThis.__closeUpKind === 'muscle' ? 'action' : globalThis.__closeUpKind;
      this.cuPlan = ok ? { at: this.moveT0 + 9 + rnd() * 6, dur: 4 + rnd() * 3, kind: (forced && (up || !forced.includes('face')) ? forced : kind) } : null;
    }
    const pl = this.cuPlan;
    if (!pl) return null;
    if (!pl.started) {
      if (t < pl.at) return null;
      if (t - this.lastCu < 35) { this.cuPlan = null; return null; }
      pl.started = t;
      this.lastCu = t;
    }
    const u = (t - pl.started) / pl.dur;
    if (u >= 1) { this.cuPlan = null; return null; }
    if (pl.kind.startsWith('cut')) {
      // a cut: the new angle holds still (the set's usual drift aside), then cuts back
      pl.aim ??= this.cuAim(st, pl.kind === 'cut-face' ? 'face' : 'body');
      if (pl.kind === 'cut-face') return { cut: true, target: pl.aim, dist: st.char.b.bean ? 300 : 270, az: 1.25, el: 0.1 };
      const sideways = this.ex.anim.frames.some((f) => f.rab || f.lab || f.rlab || f.llab || f.tw);
      return { cut: true, target: pl.aim, dist: st.camDist * 0.82, az: sideways ? 1.15 : 0.06, el: sideways ? 0.12 : 0.06 };
    }
    const ramp = Math.min(1, u * pl.dur / 1.1, (1 - u) * pl.dur / 1.1);
    const e = ramp * ramp * (3 - 2 * ramp);
    if (pl.kind === 'face') {
      // the face held still: the head's average position over a rep (not bobbing with every rep)
      pl.aim ??= this.cuAim(st, 'face');
      return { e, target: pl.aim, dist: st.char.b.bean ? 300 : 270, az: 1.2, el: 0.12 };
    }
    // the action: what the move is about, found from how the body moves over a rep
    pl.focus ??= this.cuFocus(st);
    const f = pl.focus;
    let target = f.aim;
    if (f.track) {
      // a camera operator following the moving part: halfway between the rep's centre and where
      // it is now, smoothed, so the shot leans with the motion without whipping about
      const g = st.char.group;
      const live = g.localToWorld(f.pick(st.J));
      const want = f.aim.clone().lerp(live, 0.55);
      const dt = Math.max(0, Math.min(0.1, t - (pl.tPrev ?? t)));
      pl.tPrev = t;
      pl.follow ??= want;
      pl.follow.lerp(want, 1 - Math.exp(-dt / 0.3));
      target = pl.follow;
    }
    return { e, target, dist: f.dist, az: f.azAbs ?? st.az + f.az, azMix: f.azAbs != null ? 1 : 0.6, el: f.el };
  }

  // What a close-up of the move should look at. Each candidate part of the body is scored by how
  // far it travels over a rep, nudged toward the parts the move is meant to work. A part that ends
  // its travel at the floor (hands reaching the toes, a burpee's hands landing) is shot there,
  // locked off, so each rep arrives into the frame; a part that swings about in the air is followed;
  // a move with little travel (holds, small pulses) frames the working area.
  cuFocus(st) {
    const g = st.char.group;
    g.updateMatrixWorld(true);
    const mid = (a, b) => a.clone().lerp(b, 0.5);
    const muscles = [...(this.ex.primary || []), ...(this.ex.secondary || []).slice(0, 1)];
    const has = (...m) => m.some((x) => muscles.includes(x)) ? 1 : 0;
    // a weight in the hands is what the eye follows (the bar's path in a deadlift)
    const held = ['dumbbell', 'barbell', 'kettlebell'].some((q) => this.ex.equip?.includes(q));
    const hw = held ? 0.45 : 0;
    const P = {
      hands: { pick: (J) => mid(J.rHand, J.lHand), w: 1 + hw + 0.3 * has('biceps', 'triceps', 'forearms', 'shoulders', 'chest') },
      rHand: { pick: (J) => J.rHand.clone(), w: 0.9 + 0.3 * has('biceps', 'triceps', 'forearms', 'shoulders') },
      lHand: { pick: (J) => J.lHand.clone(), w: 0.9 + 0.3 * has('biceps', 'triceps', 'forearms', 'shoulders') },
      feet: { pick: (J) => mid(J.rAnkle, J.lAnkle).add(new Vector3(0, 6, 0)), w: 0.95 + 0.5 * has('calves', 'adductors', 'abductors') },
      rFoot: { pick: (J) => J.rAnkle.clone(), w: 0.85 + 0.3 * has('calves', 'hipflexors', 'glutes') },
      lFoot: { pick: (J) => J.lAnkle.clone(), w: 0.85 + 0.3 * has('calves', 'hipflexors', 'glutes') },
      knees: { pick: (J) => mid(J.rKnee, J.lKnee), w: 0.8 + 0.3 * has('quads', 'hamstrings', 'adductors') },
      rKnee: { pick: (J) => J.rKnee.clone(), w: 0.8 + 0.3 * has('quads', 'glutes', 'hipflexors') },
      lKnee: { pick: (J) => J.lKnee.clone(), w: 0.8 + 0.3 * has('quads', 'glutes', 'hipflexors') },
      hips: { pick: (J) => J.pelvis.clone(), w: 0.85 + 0.6 * has('glutes', 'quads') + 0.3 * has('hamstrings', 'abs', 'lowerback') },
      head: { pick: (J) => J.head.clone(), w: 0.55 + 0.6 * (this.ex.primary?.includes('lats') ? 1 : 0) },
      chest: { pick: (J) => mid(J.pelvis, J.neck).lerp(J.neck, 0.4), w: 0.75 + 0.35 * has('chest', 'abs', 'obliques', 'lowerback') },
    };
    const N = st.rig.frames.length > 1 ? 12 : 1;
    const poses = [];
    for (let i = 0; i < N; i++) poses.push(st.char.joints(st.rig.pose(i / N).pts, st.fit, this.ex.anim));
    let best = null;
    for (const [name, c] of Object.entries(P)) {
      const ps = poses.map(c.pick);
      const lo = ps[0].clone(), hi = ps[0].clone(), avg = new Vector3();
      for (const p of ps) { lo.min(p); hi.max(p); avg.add(p); }
      avg.multiplyScalar(1 / ps.length);
      const range = hi.distanceTo(lo);
      // a foot that only shuffles along the floor isn't the action
      const score = range * c.w * (/feet|Foot/.test(name) && hi.y < 30 && !has('calves') ? 0.5 : 1);
      if (!best || score > best.score) best = { name, score, range, ps, avg, pick: c.pick };
    }
    const toWorld = (v) => g.localToWorld(v.clone());
    // a pair working together (both hands curling, both feet): halfway between them is inside
    // the body, so look at the one nearer the camera instead
    const pair = { hands: ['rHand', 'lHand'], feet: ['rFoot', 'lFoot'], knees: ['rKnee', 'lKnee'] }[best.name];
    if (pair) {
      const cam = st.camera.position;
      const near = pair.map((k) => {
        const ps = poses.map(P[k].pick), avg = ps.reduce((a, p) => a.add(p), new Vector3()).multiplyScalar(1 / ps.length);
        return { name: k, ps, avg, pick: P[k].pick, range: best.range, d: toWorld(avg).distanceTo(cam) };
      }).sort((a, b) => a.d - b.d)[0];
      best = { ...best, ...near };
    }
    const side = { az: 0.25, el: 0.18 };
    if (best.range < 22) {
      // barely moving: frame the working area (old muscle-based aim), close and still
      return { aim: this.cuAim(st, 'action'), dist: 340, ...side };
    }
    const low = best.ps.reduce((a, p) => (p.y < a.y ? p : a));
    const drop = best.ps.reduce((a, p) => Math.max(a, p.y), -Infinity) - low.y;
    if (low.y < 22 && drop > Math.max(35, best.range * 0.6) && /hand|feet|Foot|Knee/i.test(best.name) && !(held && /hand/i.test(best.name))) {
      // the part lands on the floor: lock off on the landing from the side, looking a little down
      // onto it, high enough that the body bending into the frame is part of the shot
      const fx = new Vector3(1, 0, 0).transformDirection(g.matrixWorld);
      // side-on: the camera looks across the body (whichever side is nearer the usual angle)
      const fa = Math.atan2(fx.x, fx.z);
      const sides = [fa + Math.PI / 2, fa - Math.PI / 2].map((a) => st.az + Math.atan2(Math.sin(a - st.az), Math.cos(a - st.az)));
      const az = Math.abs(sides[0] - st.az) < Math.abs(sides[1] - st.az) ? sides[0] : sides[1];
      // three-quarters off profile: the reach and the feet line up in one column of a portrait frame
      // centred between where it lands and the feet holding the body up, so the bend into it reads
      const li = best.ps.indexOf(low), lp = poses[li];
      const base = lp.rAnkle.clone().lerp(lp.lAnkle, 0.5);
      const aim = /Foot|feet/.test(best.name) ? low.clone() : low.clone().lerp(base, 0.25);
      return { aim: toWorld(aim).add(new Vector3(0, 46, 0)), dist: 520, azAbs: az + Math.sign(st.az - az || 1) * 0.75, el: 0.26 };
    }
    // following a part in the air: back off enough that its travel fits the shot
    return { aim: toWorld(best.avg), dist: Math.max(320, Math.min(460, 250 + best.range * 1.1)), track: true, pick: best.pick, ...side };
  }

  cuAim(st, kind) {
    const g = st.char.group;
    g.updateMatrixWorld(true);
    const m = this.ex.primary?.[0];
    const pick = (J) => {
      const mid = (a, b, k = 0.5) => a.clone().lerp(b, k);
      if (kind === 'face') return J.head.clone().add(new Vector3(0, -6, 0));
      if (kind === 'body') return J.pelvis.clone().lerp(J.neck, 0.3);
      if (['quads', 'hamstrings', 'adductors'].includes(m)) return mid(J.pelvis, J.rKnee.clone().lerp(J.lKnee, 0.5), 0.6);
      if (m === 'calves') return mid(J.rKnee, J.rAnkle, 0.7);
      if (['glutes', 'hipflexors'].includes(m)) return J.pelvis.clone();
      if (['biceps', 'triceps', 'forearms'].includes(m)) return mid(J.rElbow, J.rHand, 0.3);
      if (['shoulders', 'traps', 'lats', 'chest'].includes(m)) return mid(J.shoulder, J.rElbow, 0.3);
      return mid(J.pelvis, J.neck, 0.45); // abs, obliques, lower back
    };
    const acc = new Vector3();
    const N = st.rig.frames.length > 1 ? 8 : 1;
    for (let i = 0; i < N; i++) acc.add(pick(st.char.joints(st.rig.pose(i / N).pts, st.fit, this.ex.anim)));
    return g.localToWorld(acc.multiplyScalar(1 / N));
  }

  setSafe(safe) {
    this.stage.safe = { ...this.stage.safe, ...safe };
    this.stage.frame();
    this.draw(true);
  }
  setExercise(ex, charId = this.charId) {
    const fromFilm = !!this.inter;
    this.moveT0 = this.t;
    this.cuPlan = undefined;
    if (this.inter && this.stage.cam) { const c = this.stage.cam; this.camFrom = { az: c.az, el: c.el, dist: c.dist, target: c.target.clone() }; this.blend0 = this.t; }
    this.endInterlude();
    this.ex = ex;
    this.charId = charId;
    this.stage.build(ex, this.look, { charId });
    // out of a rest film the same puppet eases from its getting-ready pose into the move
    if (fromFilm) this.stage.char.startBlend(this.t, 0.5);
    this.canvas.setAttribute('aria-label', `${ex.name} — ${this.stage.spec.name}, claymation`);
    if (this.canvas.parentNode !== this.el) { this.el.innerHTML = ''; this.el.appendChild(this.canvas); }
    this.lastStep = -1;
    this.fitSize();
  }
  get character() { return this.stage.spec; }
  // rest-period film: handover to the next character, a breather, then getting ready
  interlude({ from, to, total, variant, wait }) {
    this.endInterlude();
    if (!this.ov) {
      this.ov = document.createElement('div');
      this.ov.className = 'il-ov';
      this.el.appendChild(this.ov);
    }
    this.inter = new Interlude(this.stage, { from, to, total, variant, wait, look: this.look, overlay: this.ov });
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
    if (this.lost) return;
    const stop = !!this.fps;
    const step = Math.floor(this.t * (this.fps || 12));
    const camStep = Math.floor(this.t * this.camFps);
    // never faster than 30 a second, even without stop-motion (phones refresh at 60–120 Hz)
    const newPose = force || (stop ? step !== this.lastStep : Math.floor(this.t * 30) !== this.lastFrame);
    if (!stop) this.lastFrame = Math.floor(this.t * 30);
    if (!newPose && camStep === this.lastCam) return;
    this.lastCam = camStep;
    if (newPose) this.lastStep = step;
    const st = this.stage;
    if (newPose) st.renderer.shadowMap.needsUpdate = true;
    const tt = stop ? step / this.fps : this.t;
    const tc = this.t;
    if (this.inter) {
      this.inter.update(tt, step, tc, newPose);
      st.renderer.toneMappingExposure = 1.05 + (this.boil ? (mulberry(boilStep(step))() - 0.5) * 0.012 : 0);
      this.renderTimed(st, tt);
      return;
    }
    if (newPose) {
      // the user's move speed sets the rep cadence (pauses at the ends), not the film speed
      const cad = this.ex?.id === 'celebrate' ? 1 : cadenceFor(store.settings().moveSpeed || 3);
      if (cad !== this.cad) { this.phase0 = (this.phase0 || 0) + tt * ((this.cad || 1) - cad) / st.rig.tempo; this.cad = cad; }
      const phase = (this.phase0 || 0) + (tt * cad) / st.rig.tempo;
      st.pose(phase, { blink: step % 41 === 0, jitter: this.boil ? 1 : 0, seed: (boilStep(step) % 7) + 1, now: this.t, hold: holdFor(cad) });
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
    // a directed close-up now and then: dolly in on the face or the action, hold, ease out
    const cu = this.closeUp(st);
    if (cu?.cut) {
      // hard cut: take the new angle outright (keep the set's gentle drift so it isn't frozen)
      az = cu.az + (az - st.az) * 0.4; el = cu.el; dist = cu.dist; target = cu.target;
    } else if (cu) {
      const e = cu.e;
      target = target.clone().lerp(cu.target, e);
      dist += (cu.dist - dist) * e;
      az += (cu.az - az) * e * (cu.azMix ?? 0.6);
      el += (cu.el - el) * e * 0.5;
    }
    st.setCam(az, el, target, dist);
    st.renderer.toneMappingExposure = 1.05 + (this.boil ? (mulberry(boilStep(step))() - 0.5) * 0.012 : 0);
    this.renderTimed(st, tt);
  }
  loop = (now) => {
    if (!this.playing) return;
    if (this.prev != null) this.t += ((now - this.prev) / 1000) * this.speed;
    this.prev = now;
    if (!this.offscreen) this.draw();
    this.raf = requestAnimationFrame(this.loop);
  };
  play() {
    if (this.playing) return;
    this.playing = true;
    this.prev = null;
    this.raf = requestAnimationFrame(this.loop);
  }
  pause() { this.playing = false; cancelAnimationFrame(this.raf); }
  // If the browser takes the GPU context away (memory pressure, the app backgrounded), don't
  // leave a blank canvas: wait briefly for it to come back, else rebuild on a fresh canvas.
  watchContext() {
    const cv = this.canvas;
    cv.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.lost = true;
      clearTimeout(this.rebuildT);
      this.rebuildT = setTimeout(() => this.rebuild(), 1200);
    });
    cv.addEventListener('webglcontextrestored', () => { clearTimeout(this.rebuildT); this.rebuild(); });
  }
  rebuild() {
    if (this.dead) return;
    const was = this.playing;
    this.pause();
    try { this.endInterlude(); } catch { /* the old scene is gone anyway */ }
    try { this.stage.dispose(); } catch { /* ignore */ }
    this.canvas.remove();
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'clay-canvas';
    this.canvas.setAttribute('role', 'img');
    const safe = this.stage.safe;
    // come back a little lighter so it doesn't happen again straight away
    this.maxDpr = Math.max(1, Math.min(this.maxDpr, (this.dpr || 1.5) - 0.25));
    this.dpr = null;
    this.stage = new Stage(this.canvas, { post: this.opts.post ?? true, shadowSize: this.opts.shadowSize });
    this.stage.manualShadows = true;
    this.stage.safe = safe;
    this.watchContext();
    this.lost = false;
    this.setExercise(this.ex, this.charId);
    if (was) this.play();
  }

  destroy() {
    this.dead = true;
    clearTimeout(this.rebuildT);
    this.endInterlude();
    this.pause();
    this.ro.disconnect();
    this.io?.disconnect();
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
