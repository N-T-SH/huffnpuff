// Generates manifest screenshots (1080x1920) with sample data + checks offline boot.
// node tools/screens.mjs [baseUrl]
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://localhost:8080/';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('pageerror', e.message));
await p.goto(base);
await p.waitForTimeout(3000);
// seed a profile + 6 weeks of plausible history
await p.evaluate(async () => {
  const { store } = window.pulse;
  await store.set('profile', { name: 'Alex', goal: 'strength', level: 'intermediate', equipment: ['dumbbell'], days: [1, 3, 5], weightKg: 74, created: Date.now() - 50 * 864e5 });
  await store.set('plan', { 1: 'db-upper', 3: 'db-lower', 5: 'hiit-burn', [new Date().getDay()]: 'db-full' });
  const sessions = [];
  let w = 12;
  for (let d = 45; d >= 1; d--) {
    if (![1, 3, 5, 6].includes(new Date(Date.now() - d * 864e5).getDay())) continue;
    const start = Date.now() - d * 864e5 + 7 * 3600e3;
    w += 0.5;
    sessions.push({ id: 's' + d, workoutId: d % 2 ? 'db-full' : 'hiit-burn', name: d % 2 ? 'Dumbbell Total Body' : 'HIIT Burner', emoji: d % 2 ? '⚡' : '🔥', color: d % 2 ? '#8f7cff' : '#ff8a3d', mode: 'sets', start, end: start + 2400e3, duration: 1500 + (d % 5) * 180, calories: 220 + (d % 7) * 25,
      entries: [{ ex: 'goblet-squat', sets: [1, 2, 3].map(() => ({ reps: 10, weight: Math.round(w), done: true })) }, { ex: 'db-press', sets: [1, 2, 3].map(() => ({ reps: 10, weight: Math.round(w * 0.6), done: true })) }, { ex: 'plank', sets: [{ time: 45, done: true }] }], prs: d % 9 === 0 ? [{ ex: 'goblet-squat', type: 'weight', value: Math.round(w) }] : [], rating: 4 });
  }
  await store.set('sessions', sessions);
  await store.set('weights', Array.from({ length: 12 }, (_, i) => ({ date: Date.now() - (44 - i * 4) * 864e5, kg: 76 - i * 0.25 + (i % 3) * 0.2 })));
  await store.set('badges', { first: Date.now(), five: Date.now(), ten: Date.now(), streak3: Date.now(), hour: Date.now(), ton: Date.now(), pr: Date.now(), early: Date.now() });
});
const go = async (h, wait = 900) => { await p.evaluate((x) => (location.hash = x), h); await p.waitForTimeout(wait); };
await go('#/exercises', 15000); await go('#/', 9000);
await p.screenshot({ path: 'icons/screen-home.png' });
await go('#/play/db-full', 800);
await p.locator('#pSkip').click(); await p.waitForTimeout(5000);
await p.screenshot({ path: 'icons/screen-player.png' });
await p.locator('#quit').click(); await p.waitForTimeout(400);
await p.locator('[data-a="discard"]').click(); await p.waitForTimeout(600);
await go('#/progress?tab=overview', 1200);
await p.screenshot({ path: 'icons/screen-progress.png' });
// offline boot check
await p.evaluate(() => navigator.serviceWorker.ready);
await p.reload(); await p.waitForTimeout(800);
await ctx.setOffline(true);
await p.reload(); await p.waitForTimeout(1200);
const ok = await p.locator('nav.tabs').isVisible();
console.log('offline boot:', ok ? 'OK' : 'FAILED');
await ctx.setOffline(false);
await b.close();
