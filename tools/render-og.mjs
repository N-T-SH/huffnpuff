// Renders the link-preview images (tools/og.html) to icons/og.jpg (1200×630) and icons/og-square.jpg (800×800).
// Needs the dev server running: npx http-server -p 8080 . && node tools/render-og.mjs
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const BASE = process.env.BASE || 'http://localhost:8080';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [query, file] of [['', 'og.jpg'], ['?square', 'og-square.jpg']]) {
  const p = await b.newPage();
  await p.goto(`${BASE}/tools/og.html${query}`);
  await p.waitForFunction(() => window.done, null, { timeout: 180000 });
  const url = await p.evaluate(() => window.og());
  writeFileSync(new URL(`../icons/${file}`, import.meta.url).pathname, Buffer.from(url.split(',')[1], 'base64'));
  await p.close();
}
await b.close();
console.log('og images rendered');
