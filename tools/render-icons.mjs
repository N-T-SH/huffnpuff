// Renders the Huff n Puff logo and PNG icons (tools/icon.html + tools/hnp-logo.js) with headless Chromium.
// Needs the dev server running: npx http-server -p 8080 . && node tools/render-icons.mjs
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const BASE = process.env.BASE || 'http://localhost:8080';
const out = (f) => new URL('../icons/' + f, import.meta.url).pathname;
const save = (f, dataUrl) => writeFileSync(out(f), Buffer.from(dataUrl.split(',')[1], 'base64'));
const b = await chromium.launch();
const pg = await b.newPage();
await pg.goto(`${BASE}/tools/icon.html`);
await pg.waitForFunction(() => window.done, null, { timeout: 120000 });
save('logo.webp', await pg.evaluate(() => window.logo()));
for (const [size, mask, file] of [[512, false, 'icon-512.png'], [192, false, 'icon-192.png'], [64, false, 'favicon-64.png'],
  [512, true, 'maskable-512.png'], [192, true, 'maskable-192.png'], [180, true, 'apple-touch-icon.png']]) {
  save(file, await pg.evaluate(([s, m]) => window.icon(s, m).toDataURL('image/png'), [size, mask]));
}
const p = await b.newPage();
async function shot(html, size, file) {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(`<html><body style="margin:0;background:transparent">${html}</body></html>`);
  await p.screenshot({ path: out(file), omitBackground: true });
}
const glyph = (d) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96"><circle cx="48" cy="48" r="48" fill="#7b3fe4"/><g transform="translate(24 24)" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${d}</g></svg>`;
await shot(glyph('<path d="M7 4.5v15l13-7.5z" fill="#fff" transform="scale(2)" stroke-width="1.5"/>'), 96, 'shortcut-play.png');
await shot(glyph('<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" transform="scale(2)" stroke-width="1.6"/>'), 96, 'shortcut-bolt.png');
await shot(glyph('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" transform="scale(2)" stroke-width="1.6"/>'), 96, 'shortcut-chart.png');
await b.close();
console.log('logo and icons rendered');
