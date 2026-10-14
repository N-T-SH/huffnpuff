// Renders the link-preview image (tools/og.html) to icons/og.jpg.
// Needs the dev server running: npx http-server -p 8080 . && node tools/render-og.mjs
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const BASE = process.env.BASE || 'http://localhost:8080';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage();
await p.goto(`${BASE}/tools/og.html`);
await p.waitForFunction(() => window.done, null, { timeout: 180000 });
const url = await p.evaluate(() => window.og());
writeFileSync(new URL('../icons/og.jpg', import.meta.url).pathname, Buffer.from(url.split(',')[1], 'base64'));
await b.close();
console.log('og image rendered');
