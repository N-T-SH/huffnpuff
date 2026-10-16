// Huff n Puff — battery saver. 'auto' turns it on when the phone is on battery below 30%
// (where the browser reports it); 'on' / 'off' force it. It makes the 3D scenes cheaper:
// fewer pixels, no soft-focus pass, smaller shadows, and the camera on twos.
import { settings } from './store.js';

let batt = null;
if (navigator.getBattery) {
  navigator.getBattery().then((b) => {
    const read = () => { batt = { level: b.level, charging: b.charging }; };
    read();
    b.addEventListener('levelchange', read);
    b.addEventListener('chargingchange', read);
  }).catch(() => {});
}

export function saverOn() {
  const mode = settings().batterySaver || 'auto';
  if (mode === 'on') return true;
  if (mode === 'off') return false;
  return !!batt && !batt.charging && batt.level <= 0.3;
}

// options for a 3D scene, trimmed when the saver is on
export function powerOpts(opts = {}) {
  if (!saverOn()) return opts;
  return { ...opts, maxDpr: Math.min(opts.maxDpr || 1.75, 1.25), post: false, shadowSize: 512, camFps: 15, fps: opts.fps === 0 ? 12 : opts.fps };
}
