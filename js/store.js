// Pulse — local-first storage. Everything lives on the device in IndexedDB
// (with a localStorage fallback). Nothing is ever sent to a server.

const DB_NAME = 'pulse';
const STORE = 'kv';
const LS_PREFIX = 'pulse:';

export const DEFAULT_SETTINGS = {
  units: 'kg',
  theme: 'auto',
  sound: true,
  voice: true,
  haptics: true,
  stopMotion: true,
  countdown: 10,
  defaultRest: 60,
  look: null,
  weekStart: 1,
  weeklyGoal: 3,
};

const DEFAULTS = {
  profile: null,
  settings: DEFAULT_SETTINGS,
  sessions: [],
  custom: [],
  weights: [],
  plan: {},
  active: null,
  badges: {},
  favorites: [],
};

let db = null;
const cache = {};
const listeners = new Set();

function openDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in self)) return reject(new Error('no idb'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGetAll() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const st = tx.objectStore(STORE);
    const out = {};
    const req = st.openCursor();
    req.onsuccess = () => {
      const cur = req.result;
      if (cur) { out[cur.key] = cur.value; cur.continue(); } else resolve(out);
    };
    req.onerror = () => reject(req.error);
  });
}

function idbPut(key, val) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(val, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function init() {
  try {
    db = await openDB();
    Object.assign(cache, await idbGetAll());
  } catch {
    db = null;
    for (const k of Object.keys(DEFAULTS)) {
      try {
        const v = localStorage.getItem(LS_PREFIX + k);
        if (v != null) cache[k] = JSON.parse(v);
      } catch { /* ignore */ }
    }
  }
  for (const [k, v] of Object.entries(DEFAULTS)) if (cache[k] === undefined) cache[k] = structuredClone(v);
  cache.settings = { ...DEFAULT_SETTINGS, ...cache.settings };
  // ask the browser not to evict our data
  try { if (navigator.storage?.persist && !(await navigator.storage.persisted())) navigator.storage.persist(); } catch { /* ignore */ }
}

export function get(key) { return cache[key]; }

export async function set(key, val) {
  cache[key] = val;
  listeners.forEach((fn) => fn(key, val));
  try {
    if (db) await idbPut(key, val);
    else localStorage.setItem(LS_PREFIX + key, JSON.stringify(val));
  } catch (e) {
    console.warn('save failed', e);
  }
}

export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export const settings = () => cache.settings || DEFAULT_SETTINGS;
export const setSetting = (k, v) => set('settings', { ...cache.settings, [k]: v });

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ---------- sessions ---------- */
export function addSession(s) {
  const list = [...cache.sessions, s].sort((a, b) => a.start - b.start);
  return set('sessions', list);
}
export function updateSession(id, patch) {
  return set('sessions', cache.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)));
}
export function deleteSession(id) {
  return set('sessions', cache.sessions.filter((s) => s.id !== id));
}

/* ---------- custom workouts ---------- */
export function saveCustom(w) {
  const list = cache.custom.filter((x) => x.id !== w.id);
  list.push(w);
  return set('custom', list);
}
export function deleteCustom(id) { return set('custom', cache.custom.filter((x) => x.id !== id)); }

/* ---------- body weight ---------- */
export function addWeight(entry) {
  const day = new Date(entry.date).toDateString();
  const list = cache.weights.filter((w) => new Date(w.date).toDateString() !== day);
  list.push(entry);
  list.sort((a, b) => a.date - b.date);
  return set('weights', list);
}
export function deleteWeight(date) { return set('weights', cache.weights.filter((w) => w.date !== date)); }

/* ---------- favorites ---------- */
export function toggleFavorite(id) {
  const f = new Set(cache.favorites);
  f.has(id) ? f.delete(id) : f.add(id);
  return set('favorites', [...f]);
}

/* ---------- backup ---------- */
export function exportData() {
  const data = { app: 'pulse', version: 1, exportedAt: new Date().toISOString() };
  for (const k of Object.keys(DEFAULTS)) if (k !== 'active') data[k] = cache[k];
  return data;
}
export async function importData(data) {
  if (!data || data.app !== 'pulse') throw new Error('Not a Pulse backup file');
  for (const k of Object.keys(DEFAULTS)) if (k in data && k !== 'active') await set(k, data[k]);
  cache.settings = { ...DEFAULT_SETTINGS, ...cache.settings };
}
export async function resetAll() {
  for (const [k, v] of Object.entries(DEFAULTS)) await set(k, structuredClone(v));
}
