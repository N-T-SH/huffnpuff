// SuperSweatClub service worker — offline-first app shell.
const VERSION = 'pulse-v1.0.0';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './fonts/fredoka.woff2',
  './fonts/nunito.woff2',
  './js/app.js',
  './js/audio.js',
  './js/charts.js',
  './js/clay.js',
  './js/clay3d.js',
  './js/cast.js',
  './js/c3d/kit.js',
  './js/c3d/character.js',
  './js/c3d/sets.js',
  './js/c3d/props.js',
  './js/c3d/acts.js',
  './js/c3d/director.js',
  './js/vendor/three.js',
  './js/exercises.js',
  './js/feedback.js',
  './js/stats.js',
  './js/store.js',
  './js/ui.js',
  './js/workouts.js',
  './js/views/builder.js',
  './js/views/cast.js',
  './js/views/home.js',
  './js/views/library.js',
  './js/views/onboarding.js',
  './js/views/player.js',
  './js/views/profile.js',
  './js/views/progress.js',
  './js/views/session.js',
  './js/views/summary.js',
  './js/views/workouts.js',
  './icons/favicon-64.png',
  './css/brand.css',
  './fonts/spray.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-192.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  // bypass the HTTP cache so a new version never installs stale files
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== 'pulse-thumbs').map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // navigations: serve the cached shell (hash routing means one page)
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html', { ignoreSearch: true })),
    );
    return;
  }
  // assets: cache-first, then network (and cache it)
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    })),
  );
});
