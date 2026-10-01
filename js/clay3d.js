// Pulse — 3D claymation renderer (WebGL via a tiny three.js bundle).
// The 2D rig in clay.js drives every pose; here each joint becomes a lump of
// hand-sculpted plasticine in a little stop-motion set with soft studio light.
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, Vector3, Color, Fog,
  HemisphereLight, DirectionalLight, AmbientLight,
  CapsuleGeometry, SphereGeometry, TorusGeometry, CylinderGeometry, BufferGeometry, Float32BufferAttribute,
  ExtrudeGeometry, Shape, TubeGeometry, CatmullRomCurve3, PlaneGeometry,
  MeshPhysicalMaterial, MeshStandardMaterial, ShadowMaterial, CanvasTexture,
  RepeatWrapping, SRGBColorSpace, ACESFilmicToneMapping, VSMShadowMap, DoubleSide,
} from './vendor/three.js';
import { rigFor, sceneFit, DEFAULT_LOOK } from './clay.js';

const Y = new Vector3(0, 1, 0);
const tmpA = new Vector3();
const tmpB = new Vector3();

/* ---------- noise & textures ---------- */
function hash(x, y, z) {
  let h = x * 374761393 + y * 668265263 + z * 2147483647;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) & 0xffff) / 0xffff;
}
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const s = (t) => t * t * (3 - 2 * t);
  const u = s(xf), v = s(yf), w = s(zf);
  const L = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash(xi + dx, yi + dy, zi + dz);
  return L(
    L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v),
    L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  ) * 2 - 1;
}

// Push vertices along their normals with smooth noise: hand-pressed, imperfect clay.
function lumpify(geo, amp = 0.8, freq = 0.09, seed = 0) {
  const p = geo.attributes.position, n = geo.attributes.normal;
  // noise depends only on position, so duplicated seam vertices move together (no cracks)
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const d = amp * (vnoise(x * freq + seed, y * freq, z * freq) + 0.5 * vnoise(x * freq * 2.3, y * freq * 2.3 + seed, z * freq * 2.3));
    p.setXYZ(i, x + n.getX(i) * d, y + n.getY(i) * d, z + n.getZ(i) * d);
  }
  geo.computeVertexNormals();
  return geo;
}

let clayBump = null;
function bumpTexture() {
  if (clayBump) return clayBump;
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#808080';
  g.fillRect(0, 0, S, S);
  const rnd = mulberry(7);
  // soft dents and bumps from fingers and tools
  for (let i = 0; i < 260; i++) {
    const x = rnd() * S, y = rnd() * S, r = 6 + rnd() * 34;
    const light = rnd() > 0.5;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, light ? 'rgba(255,255,255,.16)' : 'rgba(0,0,0,.16)');
    gr.addColorStop(1, 'rgba(128,128,128,0)');
    g.fillStyle = gr;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { g.save(); g.translate(ox, oy); g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.restore(); }
  }
  // fingerprint whorls
  for (let k = 0; k < 9; k++) {
    const x = rnd() * S, y = rnd() * S, rot = rnd() * Math.PI;
    g.save(); g.translate(x, y); g.rotate(rot);
    g.strokeStyle = 'rgba(40,40,40,.10)';
    g.lineWidth = 1.3;
    for (let r = 3; r < 26; r += 2.6) { g.beginPath(); g.ellipse(0, 0, r * 1.35, r, 0, rnd() * 2, 5.4 + rnd()); g.stroke(); }
    g.restore();
  }
  // tool scratches & grain
  g.strokeStyle = 'rgba(30,30,30,.09)';
  for (let i = 0; i < 90; i++) {
    const x = rnd() * S, y = rnd() * S, a = rnd() * 7, l = 4 + rnd() * 16;
    g.lineWidth = 0.6 + rnd();
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  const img = g.getImageData(0, 0, S, S);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rnd() - 0.5) * 14;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  clayBump = new CanvasTexture(c);
  clayBump.wrapS = clayBump.wrapT = RepeatWrapping;
  clayBump.repeat.set(1.5, 1.5);
  return clayBump;
}

function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clay(color, { rough = 0.55, sheen = 0.6, bump = 3, gloss = 0.04 } = {}) {
  return new MeshPhysicalMaterial({
    color: new Color(color), roughness: rough, metalness: 0,
    sheen, sheenRoughness: 0.45, sheenColor: new Color('#ffffff'),
    clearcoat: gloss, clearcoatRoughness: 0.35,
    bumpMap: bumpTexture(), bumpScale: bump,
  });
}

/* ---------- geometry helpers ---------- */
const geoCache = new Map();
function capsule(r, len, seed = 1, amp = 0.55) {
  const k = `c${r}:${len}:${seed}:${amp}`;
  if (!geoCache.has(k)) geoCache.set(k, lumpify(new CapsuleGeometry(r, len, 8, 18), amp, 0.11, seed));
  return geoCache.get(k);
}
function sphere(r, seed = 1, amp = 0.45) {
  const k = `s${r}:${seed}:${amp}`;
  if (!geoCache.has(k)) geoCache.set(k, lumpify(new SphereGeometry(r, 28, 20), amp, 0.12, seed));
  return geoCache.get(k);
}
function roundedBox(w, h, d, r = 3, seed = 2) {
  const k = `b${w}:${h}:${d}:${r}`;
  if (geoCache.has(k)) return geoCache.get(k);
  const s = new Shape();
  const x = -w / 2 + r, y = -d / 2 + r, W = w - 2 * r, D = d - 2 * r;
  s.moveTo(x, y); s.lineTo(x + W, y); s.lineTo(x + W, y + D); s.lineTo(x, y + D); s.lineTo(x, y);
  const geo = new ExtrudeGeometry(s, { depth: Math.max(0.1, h - 2 * r), bevelEnabled: true, bevelSize: r, bevelThickness: r, bevelSegments: 4, curveSegments: 6 });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -h / 2 + r, 0);
  geo.computeBoundingBox();
  const g2 = lumpify(geo, 0.4, 0.05, seed);
  geoCache.set(k, g2);
  return g2;
}

function mesh(geo, mat, shadow = true) {
  const m = new Mesh(geo, mat);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

function placeSeg(m, a, b) {
  m.position.copy(a).add(b).multiplyScalar(0.5);
  tmpA.copy(b).sub(a).normalize();
  m.quaternion.setFromUnitVectors(Y, tmpA);
}

/* ---------- the character ---------- */
const ZS = 19; // shoulder half-width
const ZH = 9.5; // hip half-width

class Character {
  constructor(look) {
    this.group = new Group();
    this.mats = {
      skin: clay(look.skin), shirt: clay(look.shirt), shorts: clay(look.shorts), shoes: clay(look.shoes, { gloss: 0.15 }),
      hair: clay(look.hair, { rough: 0.7 }), band: clay(look.band), sole: clay('#fbf6ef'),
      eye: new MeshStandardMaterial({ color: '#fffdf8', roughness: 0.25 }), pupil: new MeshStandardMaterial({ color: '#1d1626', roughness: 0.15 }),
      mouth: clay('#7a2e2e', { bump: 0.4 }), cheek: clay('#ff8f8f', { rough: 0.8 }),
    };
    const M = this.mats;
    const add = (geo, mat, scale) => { const m = mesh(geo, mat); if (scale) m.scale.set(...scale); this.group.add(m); return m; };
    this.p = {
      shorts: add(capsule(16.5, 12, 3, 0.7), M.shorts, [1, 1, 1.28]),
      shirt: add(capsule(16, 33, 4, 0.7), M.shirt, [1, 1, 1.24]),
      neck: add(capsule(6.5, 8, 5), M.skin),
    };
    for (const s of ['r', 'l']) {
      this.p[s + 'Upper'] = add(capsule(7.2, 31, s === 'r' ? 6 : 7), M.skin);
      this.p[s + 'Fore'] = add(capsule(6.6, 29, s === 'r' ? 8 : 9), M.skin);
      this.p[s + 'Sleeve'] = add(capsule(9.4, 14, s === 'r' ? 10 : 11, 0.6), M.shirt);
      this.p[s + 'Hand'] = add(sphere(8, s === 'r' ? 12 : 13), M.skin, [1, 1, 0.9]);
      this.p[s + 'Thigh'] = add(capsule(9.6, 44, s === 'r' ? 14 : 15), M.skin);
      this.p[s + 'Shin'] = add(capsule(8.2, 43, s === 'r' ? 16 : 17), M.skin);
      this.p[s + 'Leg'] = add(capsule(11.6, 22, s === 'r' ? 18 : 19, 0.6), M.shorts);
      this.p[s + 'Shoe'] = add(capsule(7, 21, s === 'r' ? 20 : 21), M.shoes, [1, 1, 1.18]);
      this.p[s + 'Sole'] = add(capsule(4.4, 23, 22, 0.25), M.sole, [1, 1, 1.35]);
    }
    this.head = this.buildHead();
    this.group.add(this.head);
  }

  buildHead() {
    const M = this.mats;
    const h = new Group();
    const add = (geo, mat, pos, scale, rot) => {
      const m = mesh(geo, mat);
      if (pos) m.position.set(...pos);
      if (scale) m.scale.set(...scale);
      if (rot) m.rotation.set(...rot);
      h.add(m);
      return m;
    };
    add(sphere(18, 30, 0.5), M.skin, null, [1, 1.02, 0.97]);
    // hair cap over the top and back
    const capGeo = lumpify(new SphereGeometry(19, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.47), 0.7, 0.16, 31);
    const cap = add(capGeo, M.hair, [-1.2, 0.8, 0], [1, 1, 0.98], [0, 0, 0.62]);
    cap.castShadow = true;
    // headband (follows the tilt of the hair) + knot with tails at the back
    const band = new Group();
    band.position.set(-0.6, 5.6, 0);
    band.rotation.z = 0.28;
    h.add(band);
    const ring = mesh(lumpify(new TorusGeometry(17.6, 2.3, 14, 48), 0.25, 0.2, 32), M.band);
    ring.rotation.x = Math.PI / 2;
    ring.scale.set(1, 0.97, 1);
    band.add(ring);
    const knot = mesh(sphere(3.2, 33), M.band);
    knot.position.set(-18.6, 0, 0);
    band.add(knot);
    for (const [z, rz] of [[2.6, 2.3], [-2.6, 2.6]]) {
      const tail = mesh(capsule(1.7, 7, 34, 0.1), M.band);
      tail.position.set(-21.5, -3.6, z);
      tail.rotation.set(0, 0, rz);
      band.add(tail);
    }
    // face
    this.eyes = [];
    for (const z of [7.4, -7.4]) {
      const e = add(sphere(4.3, 35, 0.05), M.eye, [14.8, 3.8, z], [0.62, 1.15, 1]);
      const pu = add(sphere(2.6, 36, 0.02), M.pupil, [17.4, 3.6, z * 1.03], [0.6, 1.1, 1]);
      this.eyes.push(e, pu);
      add(capsule(1, 4.6, 37, 0.05), M.hair, [15.4, 10, z], null, [Math.PI / 2, 0, 0.12 * Math.sign(z)]);
      add(sphere(3.3, 38, 0.1), M.cheek, [13.6, -3.8, z * 1.45], [0.45, 0.85, 1]);
      add(sphere(4.4, 39, 0.3), M.skin, [-1, 0, z > 0 ? 17.4 : -17.4], [0.62, 1, 0.5]);
    }
    add(sphere(4.4, 40, 0.3), M.skin, [18.6, -1.2, 0], [1, 0.9, 1.05]);
    add(new TorusGeometry(3.4, 0.85, 8, 16, Math.PI), M.mouth, [16.6, -6.4, 0], null, [Math.PI, Math.PI / 2, 0]);
    return h;
  }

  setLook(look) {
    for (const k of ['skin', 'shirt', 'shorts', 'shoes', 'hair', 'band']) this.mats[k].color.set(look[k]);
  }

  // pts: 3D joint map from toWorld()
  pose(J, blink = false) {
    const p = this.p;
    const mixv = (a, b, t) => new Vector3().lerpVectors(a, b, t);
    placeSeg(p.shorts, J.pelvis, mixv(J.pelvis, J.neck, 0.22));
    placeSeg(p.shirt, mixv(J.pelvis, J.neck, 0.22), mixv(J.pelvis, J.neck, 0.82));
    placeSeg(p.neck, mixv(J.pelvis, J.neck, 0.84), J.neck.clone().add(tmpB.copy(J.head).sub(J.neck).multiplyScalar(0.25)));
    for (const s of ['r', 'l']) {
      const sh = J[s + 'Shoulder'], el = J[s + 'Elbow'], ha = J[s + 'Hand'];
      placeSeg(p[s + 'Upper'], sh, el);
      placeSeg(p[s + 'Fore'], el, ha);
      placeSeg(p[s + 'Sleeve'], sh, mixv(sh, el, 0.45));
      p[s + 'Hand'].position.copy(ha);
      const hip = J[s + 'Hip'], kn = J[s + 'Knee'], an = J[s + 'Ankle'];
      placeSeg(p[s + 'Thigh'], hip, kn);
      placeSeg(p[s + 'Shin'], kn, an);
      placeSeg(p[s + 'Leg'], hip, mixv(hip, kn, 0.5));
      const heel = J[s + 'Heel'], toe = J[s + 'Toe'];
      placeSeg(p[s + 'Shoe'], heel, toe);
      // sole sits on the underside of the shoe
      const d = tmpA.copy(toe).sub(heel).normalize();
      const down = new Vector3(d.y, -d.x, 0).multiplyScalar(3.4);
      placeSeg(p[s + 'Sole'], heel.clone().add(down), toe.clone().add(down));
    }
    // head frame: local +Y along neck→head, local +X = facing direction
    const u = tmpA.copy(J.head).sub(J.neck).normalize();
    this.head.position.copy(J.head);
    this.head.rotation.set(0, 0, Math.atan2(u.y, u.x) - Math.PI / 2);
    for (const e of this.eyes) e.scale.y = blink ? 0.12 : e.userData.sy || (e.userData.sy = e.scale.y);
  }

  jitter(rnd, amt) {
    this.group.children.forEach((m) => {
      if (!m.isMesh) return;
      m.rotation.z += (rnd() - 0.5) * 0.02 * amt;
      m.position.x += (rnd() - 0.5) * 0.35 * amt;
      m.position.y += (rnd() - 0.5) * 0.35 * amt;
    });
  }

  dispose() {
    Object.values(this.mats).forEach((m) => m.dispose());
  }
}

// 2D rig points → 3D world (Y up, floor at 0, Z toward the near side)
function toWorld(pts, fit) {
  const cx = (fit.bbox.x0 + fit.bbox.x1) / 2;
  const V = (p, z = 0) => new Vector3(p[0] - cx, fit.G - p[1], z);
  const ux = pts.neck[0] - pts.pelvis[0], uy = pts.neck[1] - pts.pelvis[1];
  const ul = Math.hypot(ux, uy) || 1;
  // shoulders sit a touch below the neck, hips a touch below the pelvis centre
  return {
    pelvis: V(pts.pelvis), neck: V(pts.neck), head: V(pts.head), shoulder: V(pts.shoulder),
    rShoulder: V([pts.shoulder[0] + (ux / ul) * 2, pts.shoulder[1] + (uy / ul) * 2], ZS), lShoulder: V([pts.shoulder[0] + (ux / ul) * 2, pts.shoulder[1] + (uy / ul) * 2], -ZS),
    rElbow: V(pts.rElbow, ZS + 1), lElbow: V(pts.lElbow, -ZS - 1), rHand: V(pts.rHand, ZS), lHand: V(pts.lHand, -ZS),
    rHip: V(pts.pelvis, ZH), lHip: V(pts.pelvis, -ZH), rKnee: V(pts.rKnee, ZH + 0.5), lKnee: V(pts.lKnee, -ZH - 0.5),
    rAnkle: V(pts.rAnkle, ZH + 0.5), lAnkle: V(pts.lAnkle, -ZH - 0.5),
    rHeel: V(pts.rHeel, ZH + 1), lHeel: V(pts.lHeel, -ZH - 1), rToe: V(pts.rToe, ZH + 1.5), lToe: V(pts.lToe, -ZH - 1.5),
  };
}

/* ---------- props ---------- */
const METAL = '#5b5f7a', WOOD = '#c98b55';

function propMats() {
  return {
    metal: clay(METAL, { rough: 0.4, sheen: 0.2, bump: 0.5, gloss: 0.4 }), wood: clay(WOOD, { rough: 0.75 }),
    plate: clay('#2b2340', { rough: 0.5 }), db: clay('#ff8a3d'), kb: clay('#3a3550', { rough: 0.45, gloss: 0.3 }),
    pad: clay('#ff6b57'), wall: clay('#f4a259', { rough: 0.85 }), mat: clay('#8f7cff', { rough: 0.8 }), rope: clay('#2b2340', { bump: 0.2 }),
  };
}

class Props {
  constructor(anim, fit, mats) {
    this.anim = anim;
    this.fit = fit;
    this.M = mats;
    this.group = new Group();
    this.dyn = new Group();
    this.group.add(this.dyn);
    const cx = (fit.bbox.x0 + fit.bbox.x1) / 2;
    const X = (x) => x - cx, H = (y) => fit.G - y;
    for (const pr of anim.props || []) {
      if (pr.type === 'mat') {
        const x0 = X(fit.bbox.x0 - 6), x1 = X(fit.bbox.x1 + 6);
        const m = mesh(roundedBox(x1 - x0, 3, 64, 1.4), mats.mat, false);
        m.position.set((x0 + x1) / 2, 1.5, 0);
        this.group.add(m);
      } else if (pr.type === 'bench') {
        const x0 = X(pr.x0), x1 = X(pr.x1), top = H(pr.top);
        const pad = mesh(roundedBox(x1 - x0, 10, 42, 4), mats.pad);
        pad.position.set((x0 + x1) / 2, top - 5, 0);
        this.group.add(pad);
        for (const lx of [x0 + 12, x1 - 12]) {
          const leg = mesh(new CylinderGeometry(3, 3.4, top - 10, 12), mats.metal);
          leg.position.set(lx, (top - 10) / 2, 0);
          this.group.add(leg);
          const foot = mesh(roundedBox(8, 4, 40, 1.8), mats.metal);
          foot.position.set(lx, 2, 0);
          this.group.add(foot);
        }
      } else if (pr.type === 'box') {
        const x0 = X(pr.x0), x1 = X(pr.x1), top = H(pr.top);
        const b = mesh(roundedBox(x1 - x0, top, 56, 5), mats.wood);
        b.position.set((x0 + x1) / 2, top / 2, -6);
        this.group.add(b);
      } else if (pr.type === 'wall') {
        const x = X(pr.x) + (pr.side === 'right' ? 10 : -10);
        const w = mesh(roundedBox(20, 240, 110, 6), mats.wall);
        w.position.set(x, 120, pr.side === 'right' ? -30 : -20);
        this.group.add(w);
      } else if (pr.type === 'bar') {
        const y = H(pr.y ?? 0);
        const hx = 0;
        const bar = mesh(new CylinderGeometry(2.6, 2.6, 130, 16), mats.metal);
        bar.rotation.x = Math.PI / 2;
        bar.position.set(hx, y, 0);
        this.group.add(bar);
        this.barX = bar;
        for (const z of [-62, 62]) {
          const post = mesh(new CylinderGeometry(4.5, 5.5, y + 4, 14), mats.wood);
          post.position.set(hx, (y + 4) / 2, z);
          this.group.add(post);
        }
      }
    }
    // hand-held props
    this.hold = anim.hold;
    if (anim.hold === 'dumbbells' || anim.hold === 'dumbbell') this.dbs = [this.dumbbell(), this.dumbbell()];
    if (anim.hold === 'dumbbell1') this.dbs = [this.dumbbell(true)];
    if (anim.hold === 'barbell' || anim.hold === 'barbellBack') this.bb = this.barbell();
    if (anim.hold === 'kettlebell' || anim.hold === 'goblet') this.kb = this.kettlebell();
    if (anim.rope) {
      this.rope = mesh(new BufferGeometry(), mats.rope);
      this.dyn.add(this.rope);
    }
  }
  dumbbell(vertical = false) {
    const g = new Group();
    const M = this.M;
    const handle = mesh(new CylinderGeometry(1.9, 1.9, 16, 10), M.metal);
    g.add(handle);
    for (const y of [-9, 9]) { const h = mesh(capsule(6, 3, 41, 0.3), M.db); h.position.y = y; g.add(h); }
    if (!vertical) g.rotation.x = Math.PI / 2;
    g.userData.vertical = vertical;
    this.dyn.add(g);
    return g;
  }
  barbell() {
    const g = new Group();
    const M = this.M;
    const bar = mesh(new CylinderGeometry(1.8, 1.8, 150, 12), M.metal);
    g.add(bar);
    for (const y of [-58, 58]) {
      const p = mesh(lumpify(new CylinderGeometry(21, 21, 6, 32), 0.4, 0.1, 42), M.plate);
      p.position.y = y; g.add(p);
      const c = mesh(new CylinderGeometry(3.6, 3.6, 4, 12), M.metal);
      c.position.y = y + (y > 0 ? -5 : 5); g.add(c);
    }
    g.rotation.x = Math.PI / 2;
    this.dyn.add(g);
    return g;
  }
  kettlebell() {
    const g = new Group();
    const body = mesh(sphere(12.5, 43, 0.3), this.M.kb);
    body.position.y = -16;
    g.add(body);
    const handle = mesh(new TorusGeometry(6.5, 1.9, 10, 24), this.M.kb);
    handle.position.y = -3;
    handle.rotation.y = Math.PI / 2;
    g.add(handle);
    this.dyn.add(g);
    return g;
  }
  update(J, phase) {
    if (this.dbs) {
      if (this.dbs.length === 2) {
        this.dbs[0].position.copy(J.rHand);
        this.dbs[1].position.copy(J.lHand);
      } else {
        this.dbs[0].position.lerpVectors(J.rHand, J.lHand, 0.5);
        const d = tmpA.copy(J.rHand).sub(J.rElbow).normalize();
        this.dbs[0].quaternion.setFromUnitVectors(Y, d);
        this.dbs[0].position.addScaledVector(d, 4);
      }
    }
    if (this.bb) {
      if (this.hold === 'barbellBack') {
        const u = tmpA.copy(J.neck).sub(J.pelvis).normalize();
        this.bb.position.lerpVectors(J.shoulder, J.neck, 0.55).add(new Vector3(-u.y * 11, u.x * 11, 0));
      } else this.bb.position.set(J.rHand.x, J.rHand.y, 0);
    }
    if (this.kb) {
      this.kb.position.lerpVectors(J.rHand, J.lHand, 0.5);
      if (this.hold === 'goblet') this.kb.position.add(new Vector3(5, 14, 0));
    }
    if (this.rope) {
      const a = phase * Math.PI * 2 * (this.anim.ropeSpeed || 1);
      const cy = (J.head.y + Math.min(J.rToe.y, J.lToe.y)) / 2;
      const ry = (J.head.y - Math.min(J.rToe.y, J.lToe.y)) / 2 + 22;
      const ax = J.pelvis.x + Math.sin(a) * 46, ay = cy + Math.cos(a) * ry;
      const curve = new CatmullRomCurve3([
        J.rHand.clone(), new Vector3((J.rHand.x + ax) / 2 + Math.sin(a) * 8, (J.rHand.y + ay) / 2, 24),
        new Vector3(ax, ay, 0), new Vector3((J.lHand.x + ax) / 2 + Math.sin(a) * 8, (J.lHand.y + ay) / 2, -24), J.lHand.clone(),
      ]);
      this.rope.geometry.dispose();
      this.rope.geometry = new TubeGeometry(curve, 40, 1.2, 6, false);
    }
  }
}

/* ---------- the set ---------- */
const SETS = {
  strength: ['#ffd9c7', '#f2b79e'], cardio: ['#ffe9b0', '#eccb7a'], core: ['#ddd5fb', '#bdb0ef'],
  mobility: ['#cdf1ea', '#9fd9cd'], default: ['#ffe2cc', '#efc2a3'],
};

function cyclorama(color, floorColor) {
  // floor that sweeps up into a curved back wall, like a tabletop animation set
  const prof = [];
  for (let i = 0; i <= 10; i++) prof.push([420 - i * 45, 0]);
  for (let i = 1; i <= 12; i++) { const a = (i / 12) * Math.PI / 2; prof.push([-30 - Math.sin(a) * 160, 160 - Math.cos(a) * 160]); }
  for (let i = 1; i <= 6; i++) prof.push([-190, 160 + i * 90]);
  const W = 1400, cols = 12;
  const pos = [], idx = [];
  prof.forEach(([z, y], r) => {
    for (let c = 0; c <= cols; c++) pos.push(-W / 2 + (W * c) / cols, y, z);
    if (r > 0) for (let c = 0; c < cols; c++) {
      const a = (r - 1) * (cols + 1) + c, b = a + 1, d = r * (cols + 1) + c, e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
  });
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const m = new Mesh(geo, new MeshStandardMaterial({ color: new Color(floorColor), roughness: 0.95, side: DoubleSide, bumpMap: bumpTexture(), bumpScale: 1.5 }));
  m.receiveShadow = true;
  return m;
}

// height of the swept floor at depth z (matches cyclorama())
const floorY = (z) => (z >= -30 ? 0 : z <= -190 ? 160 : 160 - Math.sqrt(160 * 160 - (-30 - z) ** 2));

function decor(group, cat, fit) {
  // a little clay plant and a few pebbles tucked into the back of the set
  const left = (fit.bbox.x0 - fit.bbox.x1) / 2 - 120;
  const pz = -105, py = floorY(pz);
  const pot = mesh(lumpify(new CylinderGeometry(15, 11, 26, 20), 0.5, 0.1, 50), clay('#d9744f'));
  pot.position.set(left, py + 13, pz);
  group.add(pot);
  const leaf = clay('#5bc46a');
  for (let i = 0; i < 6; i++) {
    const l = mesh(capsule(4.5, 22, 51 + i, 0.5), leaf);
    const a = -0.9 + i * 0.36;
    l.position.set(left + Math.sin(a) * 12, py + 38 + Math.cos(a) * 8, pz + (i % 2 ? 4 : -4));
    l.rotation.z = -a;
    group.add(l);
  }
  const cols = { strength: '#ffb59c', cardio: '#ffd166', core: '#a99af5', mobility: '#7fd8c9', default: '#ffb59c' };
  const right = (fit.bbox.x1 - fit.bbox.x0) / 2;
  [[right + 60, -70, 9], [right + 82, -55, 6], [left + 40, -40, 6]].forEach(([x, z, r], i) => {
    const p = mesh(sphere(r, 60 + i, 0.6), clay(cols[cat] || cols.default));
    p.position.set(x, floorY(z) + r * 0.8, z);
    group.add(p);
  });
}

/* ---------- renderer wrapper ---------- */
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
  constructor(canvas, { alpha = false, shadowSize = 1024 } = {}) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha, preserveDrawingBuffer: false, powerPreference: 'low-power' });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = VSMShadowMap;
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(30, 320 / 250, 5, 4000);
    this.scene.add(new HemisphereLight('#fff4e6', '#b88a6e', 1.15));
    this.scene.add(new AmbientLight('#ffffff', 0.15));
    const key = new DirectionalLight('#fff0dc', 2.6);
    key.position.set(-160, 330, 260);
    key.castShadow = true;
    key.shadow.mapSize.set(shadowSize, shadowSize);
    Object.assign(key.shadow.camera, { left: -260, right: 260, top: 260, bottom: -260, near: 50, far: 1200 });
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.4;
    key.shadow.radius = 7;
    key.shadow.blurSamples = 16;
    this.scene.add(key);
    this.scene.add(key.target);
    this.key = key;
    const rim = new DirectionalLight('#d8e6ff', 1.1);
    rim.position.set(180, 160, -260);
    this.scene.add(rim);
    const fill = new DirectionalLight('#ffe6f0', 0.5);
    fill.position.set(260, 60, 200);
    this.scene.add(fill);
    this.mats = propMats();
    this.world = new Group();
    this.scene.add(this.world);
    this.alpha = alpha;
    this.character = null;
  }

  build(ex, look, { bare = false } = {}) {
    this.world.clear();
    const rig = rigFor(ex);
    const fit = sceneFit(rig);
    this.rig = rig; this.fit = fit; this.ex = ex;
    // a wall on the right would hide the figure from the usual 3/4 angle
    this.baseAz = (ex.anim.props || []).some((p) => p.type === 'wall' && p.side === 'right') ? 0.12 : 0.62;
    if (!this.character) this.character = new Character(look);
    else this.character.setLook(look);
    this.world.add(this.character.group);
    this.props = new Props(ex.anim, fit, this.mats);
    this.world.add(this.props.group);
    const [bg, floor] = SETS[ex.cat] || SETS.default;
    if (bare) {
      const sc = new Mesh(new PlaneGeometry(900, 900), new ShadowMaterial({ opacity: 0.22 }));
      sc.rotation.x = -Math.PI / 2;
      sc.receiveShadow = true;
      this.world.add(sc);
      this.scene.background = null;
      this.scene.fog = null;
    } else {
      this.world.add(cyclorama(bg, floor));
      decor(this.world, ex.cat, fit);
      this.scene.background = new Color(bg);
      this.scene.fog = new Fog(new Color(bg), 900, 2200);
    }
    this.frame();
  }

  frame(az = this.baseAz, el = 0.17, zoom = 1) {
    const b = this.fit.bbox;
    const W = b.x1 - b.x0 + 30, H = this.fit.G - b.y0 + 10;
    const t = Math.tan((this.camera.fov * Math.PI) / 360);
    const dist = Math.max(H / 2 / t, W / 2 / (t * this.camera.aspect)) * 1.12 + 25;
    this.target = new Vector3(0, H * 0.45, 0);
    this.camDist = dist / zoom;
    this.setCam(az, el);
  }

  setCam(az, el, target = this.target, dist = this.camDist) {
    this.camera.position.set(target.x + Math.sin(az) * Math.cos(el) * dist, target.y + Math.sin(el) * dist, target.z + Math.cos(az) * Math.cos(el) * dist);
    this.camera.lookAt(target);
  }

  pose(phase, { blink = false, jitter = 0, seed = 0 } = {}) {
    const { pts } = this.rig.pose(phase);
    const J = toWorld(pts, this.fit);
    this.J = J;
    this.character.pose(J, blink);
    this.props.update(J, phase);
    if (jitter) {
      const rnd = mulberry(seed);
      this.character.jitter(rnd, jitter);
      bumpTexture().offset.set(rnd() * 0.04, rnd() * 0.04);
    }
  }

  resize(w, h, dpr) {
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render() { this.renderer.render(this.scene, this.camera); }

  dispose() {
    this.character?.dispose();
    Object.values(this.mats).forEach((m) => m.dispose());
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
    this.t = 0;
    this.playing = false;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'clay-canvas';
    this.canvas.setAttribute('role', 'img');
    this.stage = new Stage(this.canvas);
    this.ro = new ResizeObserver(() => this.fitSize());
    this.ro.observe(el);
    this.setExercise(ex);
  }
  fitSize() {
    const r = this.el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.stage.resize(r.width, r.height, Math.min(2, window.devicePixelRatio || 1));
    this.stage.frame();
    this.draw(true);
  }
  setExercise(ex) {
    this.ex = ex;
    this.stage.build(ex, this.look);
    this.canvas.setAttribute('aria-label', `${ex.name} claymation`);
    if (this.canvas.parentNode !== this.el) { this.el.innerHTML = ''; this.el.appendChild(this.canvas); }
    this.lastStep = -1;
    this.fitSize();
  }
  setLook(look) {
    this.look = { ...DEFAULT_LOOK, ...look };
    this.stage.character.setLook(this.look);
    this.draw(true);
  }
  draw(force) {
    const stop = !!this.fps;
    const step = Math.floor(this.t * (this.fps || 12));
    if (!force && stop && step === this.lastStep) return;
    this.lastStep = step;
    const tt = stop ? step / this.fps : this.t;
    const phase = tt / this.stage.rig.tempo;
    this.stage.pose(phase, { blink: step % 41 === 0, jitter: this.boil ? 1 : 0, seed: step % 7 + 1 });
    // slow camera drift shows off the depth; stop-motion adds a little exposure flicker
    const az = this.stage.baseAz + Math.sin(tt * 0.35) * 0.08;
    const el = 0.17 + Math.sin(tt * 0.23) * 0.025;
    this.stage.setCam(az, el);
    this.stage.renderer.toneMappingExposure = 1.05 + (this.boil ? (mulberry(step)() - 0.5) * 0.035 : 0);
    this.stage.render();
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
    this.pause();
    this.ro.disconnect();
    this.stage.dispose();
    this.canvas.remove();
  }
}

/* ---------- stills (thumbnails, avatars) ---------- */
let stillStage = null;
let queue = Promise.resolve();

export function renderStill(ex, look, { phase, bare = false, portrait = false, width = 640, height = 500 } = {}) {
  const job = queue.then(async () => {
    if (!stillStage) {
      const c = document.createElement('canvas');
      stillStage = new Stage(c, { alpha: true, shadowSize: 1024 });
    }
    const st = stillStage;
    st.resize(width, height, 1);
    st.build(ex, { ...DEFAULT_LOOK, ...(look || {}) }, { bare });
    const ph = phase ?? ex.anim.still ?? (st.rig.frames.length > 1 ? st.rig.cum[1] : 0);
    st.pose(ph);
    if (portrait) {
      const h = st.J.head;
      st.setCam(0.55, 0.12, new Vector3(h.x + 4, h.y - 6, 0), 150);
    }
    st.renderer.toneMappingExposure = 1.05;
    st.render();
    const blob = await new Promise((res) => st.renderer.domElement.toBlob(res, bare ? 'image/png' : 'image/webp', 0.9));
    return blob;
  });
  queue = job.catch(() => {});
  return job;
}
