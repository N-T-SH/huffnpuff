// Renders PNG icons from SVG with headless Chromium: node tools/render-icons.mjs
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const svg = readFileSync(new URL('../icons/icon.svg', import.meta.url), 'utf8');
const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const b = await chromium.launch();
const p = await b.newPage();
async function shot(html, size, out) {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(`<html><body style="margin:0;background:transparent">${html}</body></html>`);
  await p.screenshot({ path: new URL('../icons/' + out, import.meta.url).pathname, omitBackground: true });
}
const plain = (s) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${s}" height="${s}">${inner}</svg>`;
// maskable: full-bleed background, artwork scaled into the 80% safe zone
const mask = (s) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${s}" height="${s}">${inner.replace('rx="116"', 'rx="0"').replace(/<g filter[\s\S]*$/, '')}<g transform="translate(51.2 51.2) scale(.8)">${inner.replace(/<rect width="512" height="512" rx="116" fill="url\(#bg\)"\/>/, '').replace(/<path d="M42 470[^>]*>/, '')}</g></svg>`;
await shot(plain(192), 192, 'icon-192.png');
await shot(plain(512), 512, 'icon-512.png');
await shot(mask(512), 512, 'maskable-512.png');
await shot(mask(192), 192, 'maskable-192.png');
await shot(mask(180), 180, 'apple-touch-icon.png');
const glyph = (d) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96"><circle cx="48" cy="48" r="48" fill="#ff6b57"/><g transform="translate(24 24)" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${d}</g></svg>`;
await shot(glyph('<path d="M7 4.5v15l13-7.5z" fill="#fff" transform="scale(2)" stroke-width="1.5"/>'), 96, 'shortcut-play.png');
await shot(glyph('<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" transform="scale(2)" stroke-width="1.6"/>'), 96, 'shortcut-bolt.png');
await shot(glyph('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" transform="scale(2)" stroke-width="1.6"/>'), 96, 'shortcut-chart.png');
await b.close();
console.log('icons rendered');
