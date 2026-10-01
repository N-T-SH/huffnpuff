// Filmstrip of a rest-period interlude: node tools/film.mjs from to out.png [total] [times]
import { chromium } from 'playwright';
const [from = 'bb-squat', to = 'jumping-jack', out = 'film.png', total = '10', times = '0.2,1.5,2.8,3.6,4.4,5.5,6.3,6.6,7.3,8.5,9.6,12'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 270, height: 540 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(`http://localhost:8080/tools/interlude.html?from=${from}&to=${to}&total=${total}&t=0`);
await p.waitForFunction(() => window.ready, null, { timeout: 60000 });
const shots = [];
for (const t of times.split(',').map(Number)) {
  // step through time so one-shot events fire in order
  await p.evaluate((t) => window.seek(t), t);
  await p.waitForTimeout(250);
  shots.push((await p.screenshot()).toString('base64'));
}
const cols = Math.min(6, shots.length);
const page2 = await b.newPage({ viewport: { width: 270 * cols, height: 540 * Math.ceil(shots.length / cols) } });
await page2.setContent(`<body style="margin:0;display:grid;grid-template-columns:repeat(${cols},270px)">${shots.map((s) => `<img src="data:image/png;base64,${s}">`).join('')}</body>`);
await page2.screenshot({ path: out });
console.log(errs.length ? errs.join('\n') : 'ok');
await b.close();
