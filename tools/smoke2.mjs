// Deeper flows: PRs, exercise history, resume after reload. node tools/smoke2.mjs [base] [outDir]
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://localhost:8080/';
const out = process.argv[3] || '.';
const errors = [];
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 412, height: 860 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
p.on('pageerror', (e) => errors.push('pageerror: ' + e.stack));
const shot = async (n) => { await p.waitForTimeout(600); await p.screenshot({ path: `${out}/${n}.png` }); };
const skipReady = () => p.waitForFunction(() => document.querySelector('#pChips') && !document.querySelector('#pChips').textContent.includes('GET READY'), null, { timeout: 15000 }); // the 3-2-1 is short: just let it run
const click = async (sel) => { await p.locator(sel).first().click(); await p.waitForTimeout(200); };
await p.goto(base);
await p.waitForTimeout(600);
// quick onboarding
for (let i = 0; i < 3; i++) await click('[data-next]');
await click('[data-goal="fit"]'); await click('[data-level="beginner"]');
await click('[data-equipment="dumbbell"]'); await click('[data-next]'); await click('[data-next]'); await click('[data-next]'); await click('[data-next]');
await click('[data-finish]');
async function doSolo(weight, reps) {
  await p.evaluate(() => (location.hash = '#/play/ex:goblet-squat'));
  await p.waitForTimeout(500);
  await skipReady();
  // a reps move is one screen: reps, sets and weight, logged together
  await p.locator('[data-name="weight"] input').fill(String(weight));
  await p.locator('[data-name="weight"] input').dispatchEvent('change');
  await p.locator('[data-name="reps"] input').fill(String(reps));
  await p.locator('[data-name="reps"] input').dispatchEvent('change');
  console.log('sets stepper:', await p.locator('[data-name="sets"] input').inputValue());
  await click('#pMain');
  await p.waitForTimeout(1200);
}
await doSolo(16, 10);
await click('#done');
await doSolo(20, 12);
await shot('a-summary-pr');
const prText = await p.locator('.sum-sheet .section').first().textContent().catch(() => '');
console.log('PR section:', prText.replace(/\s+/g, ' ').trim().slice(0, 120));
await click('#done');
await p.evaluate(() => (location.hash = '#/exercise/goblet-squat'));
await p.waitForTimeout(400);
await click('[data-t="history"]');
await shot('b-ex-history');
await p.evaluate(() => (location.hash = '#/progress'));
await shot('c-progress');
// resume flow
await p.evaluate(() => (location.hash = '#/play/core-crusher'));
await p.waitForTimeout(500);
await click('#pSkip'); await click('#pSkip'); await click('#pSkip');
await p.reload();
await p.waitForTimeout(1200);
await shot('d-after-reload');
const hasResume = await p.locator('.toast-btn').count();
console.log('resume toast:', hasResume);
if (hasResume) { await click('.toast-btn'); await shot('e-resumed'); }
console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
await b.close();
