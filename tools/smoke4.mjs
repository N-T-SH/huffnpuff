// Swapping moves (workout page, rest, pause, overview) and the favourites carousel. node tools/smoke4.mjs [base] [out]
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://localhost:8080/';
const out = process.argv[3] || '.';
const errors = [];
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: 412, height: 860 }, isMobile: true, hasTouch: true })).newPage();
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const click = async (sel) => { await p.locator(sel).first().click(); await p.waitForTimeout(300); };
const shot = async (n) => { await p.waitForTimeout(500); await p.screenshot({ path: `${out}/${n}.png` }); };
const names = () => p.locator('.list .li .li-title').allTextContents();
await p.goto(base); await p.waitForTimeout(500);
for (let i = 0; i < 3; i++) await click('[data-next]');
await click('[data-goal="fit"]'); await click('[data-level="beginner"]'); await click('[data-next]'); await click('[data-next]'); await click('[data-next]'); await click('[data-next]'); await click('[data-finish]');
// 1. workout page: swap the second move
await p.evaluate(() => (location.hash = '#/workout/lunch-break'));
await p.waitForTimeout(500);
const before = await names();
await click('[data-swap="1"]');
await p.waitForTimeout(2500); await shot('s1-picker');
const choice = (await p.locator('.sheet [data-ex] .li-title').first().textContent()).trim();
await click('.sheet [data-ex]');
await p.waitForTimeout(500);
const after = await names();
console.log('page swap:', before[1], '→', after[1], after[1] === choice ? 'OK' : 'MISMATCH');
console.log('your swaps card:', await p.locator('#unswap').count() ? 'shown' : 'MISSING');
await shot('s2-swapped');
await click('#fav');
// 2. player: swap the upcoming move during the first rest
await click('#start');
await p.waitForFunction(() => document.querySelector('.player')?.classList.contains('resting'), null, { timeout: 70000 }).catch(() => {});
if (!(await p.locator('.player.resting').count())) { await click('#pSkip'); await p.waitForTimeout(400); }
const restNext = (await p.locator('.p-name').textContent()).trim();
await click('#swapNext');
const pick2 = (await p.locator('.sheet [data-ex] .li-title').first().textContent()).trim();
await click('.sheet [data-ex]');
await p.waitForTimeout(600);
const restNow = (await p.locator('.p-name').textContent()).trim();
console.log('rest swap:', restNext, '→', restNow, restNow === pick2 ? 'OK' : 'MISMATCH', '· still running:', !(await p.locator('.player.paused').count()));
await shot('s3-rest-swapped');
// 3. pause during a move: swap chip for what's next
await click('#pSkip'); await p.waitForTimeout(400);
while (await p.locator('.player.resting').count()) { await click('#pSkip'); await p.waitForTimeout(300); }
await click('#pMain'); // pause, mid-move
// paused on a move: Swap replaces that move, from its own line
const curName = (await p.locator('.p-name').textContent()).trim();
console.log('paused swap is for the current move:', (await p.locator('.p-sub #swapNext[data-here="1"]').count()) ? 'yes' : 'NO', '· up next still bottom right:', (await p.locator('#pNext').textContent()).includes('NEXT'));
await shot('s4-paused');
await click('#swapNext');
const pick4 = (await p.locator('.sheet [data-ex] .li-title').first().textContent()).trim();
await click('.sheet [data-ex]');
await p.waitForTimeout(600);
const nowName = (await p.locator('.p-name').textContent()).trim();
console.log('paused swap:', curName, '→', nowName, nowName === pick4 ? 'OK' : 'MISMATCH', '· still paused:', !!(await p.locator('.player.paused').count()));
await shot('s4b-paused-swapped');
await click('#pMain'); // resume
// 4. overview: swap a later move
await click('#ovw');
const rowsBefore = await p.locator('.sheet .li .li-title').allTextContents();
const n = await p.locator('.sheet [data-swapentry]').count();
await p.locator('.sheet [data-swapentry]').last().click(); await p.waitForTimeout(400);
const pick3 = (await p.locator('.sheet [data-ex] .li-title').first().textContent()).trim();
await click('.sheet [data-ex]');
await click('#ovw');
const rowsAfter = await p.locator('.sheet .li .li-title').allTextContents();
console.log('overview swap buttons:', n, '·', rowsBefore.at(-1), '→', rowsAfter.at(-1), rowsAfter.at(-1).includes(pick3) ? 'OK' : 'MISMATCH');
await shot('s5-overview');
await p.keyboard.press('Escape'); await p.goBack(); await p.waitForTimeout(400);
// 5. favourites carousel on Today
await p.evaluate(() => (location.hash = '#/'));
await p.waitForTimeout(800);
const heads = await p.locator('.section-h h2').allTextContents();
console.log('home sections:', heads.join(' | '));
await p.locator('text=Your favourites').scrollIntoViewIfNeeded().catch(() => {});
await shot('s6-home');
console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
await b.close();
