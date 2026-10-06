// Warm-up, overview jump, add set, session edit. node tools/smoke3.mjs [base] [out]
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://localhost:8080/';
const out = process.argv[3] || '.';
const errors = [];
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: 412, height: 860 }, isMobile: true, hasTouch: true })).newPage();
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const skipReady = () => p.waitForFunction(() => document.querySelector('#pChips') && !document.querySelector('#pChips').textContent.includes('GET READY'), null, { timeout: 15000 }); // the 3-2-1 is short: just let it run
const click = async (sel) => { await p.locator(sel).first().click(); await p.waitForTimeout(250); };
const shot = async (n) => { await p.waitForTimeout(500); await p.screenshot({ path: `${out}/${n}.png` }); };
await p.goto(base); await p.waitForTimeout(500);
for (let i = 0; i < 3; i++) await click('[data-next]');
await click('[data-goal="fit"]'); await click('[data-level="beginner"]'); await click('[data-next]'); await click('[data-next]'); await click('[data-next]'); await click('[data-next]'); await click('[data-finish]');
await p.evaluate(() => (location.hash = '#/workout/bw-strength'));
await p.waitForTimeout(400);
await p.locator('#warm').check({ force: true });
await click('#start');
await skipReady();
await shot('w1-warmup');
const pill = await p.locator('#pChips').textContent();
console.log('phase:', pill);
await click('#ovw');
await shot('w2-overview');
await click('[data-entry="6"]'); // squat (warmup 5 + push-up 0 -> entry 5, squat 6)
await shot('w3-jumped');
console.log('now:', await p.locator('.p-name').textContent());
// a reps move: reps next to sets, no set-by-set steps
console.log('reps/sets steppers:', await p.locator('[data-name="reps"]').count(), await p.locator('[data-name="sets"]').count(), '· ring:', (await p.locator('#pRing').textContent()).trim());
await click('[data-name="sets"] [data-d="-1"]');
console.log('after −1 set:', (await p.locator('#pRing').textContent()).trim());
await click('#pMain');
// a timed set (plank) starts on its own
await click('#ovw');
await p.locator('.sheet [data-entry]').last().click(); await p.waitForTimeout(400);
const t0 = (await p.locator('#pClock').textContent()).trim(); await p.waitForTimeout(2200);
console.log('plank:', (await p.locator('.p-name').textContent()).trim(), '· clock', t0, '→', (await p.locator('#pClock').textContent()).trim(), '· dots:', await p.locator('.set-dots i').count());
await shot('w3b-plank');
await click('#addSet');
console.log('dots after +Set:', await p.locator('.set-dots i').count());
await click('#quit'); await click('[data-a="save"]');
await p.waitForTimeout(1200);
await click('#done');
await p.evaluate(() => (location.hash = '#/progress?tab=history'));
await p.waitForTimeout(400);
await click('#pbody a.li');
await p.locator('[data-edit]').last().click(); await p.waitForTimeout(250);
await shot('w4-edit');
await click('[data-name="reps"] [data-d="1"]');
await click('[data-a="save"]');
await shot('w5-edited');
console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
await b.close();
