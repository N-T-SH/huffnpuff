// Renders the SillySweatClub PNG icons from tools/icon.html with headless Chromium.
// Needs the dev server running: npx http-server -p 8080 . && node tools/render-icons.mjs
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:8080';
const out = (f) => new URL('../icons/' + f, import.meta.url).pathname;
const b = await chromium.launch();
async function icon(size, mask, file) {
  const p = await b.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: size / 512 });
  await p.goto(`${BASE}/tools/icon.html${mask ? '?mask=1' : ''}`);
  await p.waitForFunction(() => window.done);
  await p.locator('#icon').screenshot({ path: out(file), omitBackground: true });
  await p.close();
}
await icon(512, false, 'icon-512.png');
await icon(192, false, 'icon-192.png');
await icon(64, false, 'favicon-64.png');
await icon(512, true, 'maskable-512.png');
await icon(192, true, 'maskable-192.png');
await icon(180, true, 'apple-touch-icon.png');
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
console.log('icons rendered');
