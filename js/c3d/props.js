// SuperSweatClub 3D — exercise props (bench, bar, barbell, dumbbells, kettlebell, rope...).
import {
  Group, Vector3, BufferGeometry, CylinderGeometry, TorusGeometry, TubeGeometry, CatmullRomCurve3,
} from '../vendor/three.js';
import { clay, capsule, sphere, roundedBox, mesh, lumpify, Y } from './kit.js';

const tmpA = new Vector3();
const METAL = '#5b5f7a', WOOD = '#c98b55';

export function propMats() {
  return {
    metal: clay(METAL, { rough: 0.4, sheen: 0.2, bump: 0.5, gloss: 0.4 }), wood: clay(WOOD, { rough: 0.75 }),
    plate: clay('#2b2340', { rough: 0.5 }), db: clay('#ff8a3d'), kb: clay('#3a3550', { rough: 0.45, gloss: 0.3 }),
    pad: clay('#ff6b57'), wall: clay('#f4a259', { rough: 0.85 }), mat: clay('#8f7cff', { rough: 0.8 }), rope: clay('#2b2340', { bump: 0.2 }),
  };
}

export class Props {
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
        // a right-hand wall must not stick out toward the lens
        const w = mesh(roundedBox(20, 240, pr.side === 'right' ? 96 : 110, 6), mats.wall);
        w.position.set(x, 120, pr.side === 'right' ? -44 : -20);
        this.group.add(w);
      } else if (pr.type === 'bar') {
        const y = H(pr.y ?? 0);
        const hx = 0;
        const bar = mesh(new CylinderGeometry(2.6, 2.6, 200, 16), mats.metal);
        bar.rotation.x = Math.PI / 2;
        bar.position.set(hx, y, 0);
        this.group.add(bar);
        this.barX = bar;
        for (const z of [-96, 96]) {
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

