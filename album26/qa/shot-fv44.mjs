// Capturas del gate Fv4.4 → qa/screenshots/fv44/
// 01 hoja COMPARTIR con QR nativo · 02 toggle UsaMexCan · 03 cruce tras subir
// un QR ajeno · 04 vista pública /s sin sesión.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { mockAuth } from './_mock-auth.mjs';
const EXE = process.env.QA_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = process.env.QA_URL || 'http://localhost:3000/';
const DIR = new globalThis.URL('./screenshots/fv44/', import.meta.url).pathname;
mkdirSync(DIR, { recursive: true });

const b = await chromium.launch({ executablePath: EXE });

const openShare = async (p) => {
  await p.evaluate(() => { [...document.querySelectorAll('.demo-bar button')].find(x => x.textContent.includes('MI COLECCIÓN'))?.click(); });
  await p.waitForTimeout(300);
  await p.evaluate(() => { [...document.querySelectorAll('[data-panel-tab]')].find(x => x.dataset.panelTab === 'compartir')?.click(); });
  await p.waitForTimeout(1100);
};

// A: colección avanzada (MEX completo con repes) → QR nativo + UMC
let qrPngA = null;
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, serviceWorkers: 'block' });
  const rows = [];
  for (let n = 1; n <= 20; n++) rows.push({ slot: 'MEX-' + n, pegado: true, repes: n <= 3 ? 2 : 0 });
  rows.push({ slot: '00', pegado: true, repes: 0 }, { slot: 'FWC-1', pegado: true, repes: 1 });
  await mockAuth(ctx, URL, { rows });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  await openShare(p);
  await p.evaluate(() => { const i = document.getElementById('share-alias'); if (i) i.value = 'San'; });
  await p.screenshot({ path: DIR + '01-compartir-qr-nativo.png' });
  await p.evaluate(() => { [...document.querySelectorAll('[data-share-fmt]')].find(x => x.dataset.shareFmt === 'umc')?.click(); });
  await p.waitForTimeout(1100);
  await p.screenshot({ path: DIR + '02-compartir-qr-usamexcan.png' });
  // volver a nativo y capturar el PNG del QR para el cruce de B
  await p.evaluate(() => { [...document.querySelectorAll('[data-share-fmt]')].find(x => x.dataset.shareFmt === 'a26')?.click(); });
  await p.waitForTimeout(1100);
  qrPngA = Buffer.from((await p.evaluate(() => document.getElementById('share-qr').toDataURL('image/png'))).split(',')[1], 'base64');
  await ctx.close();
}

// B: otra colección → sube el QR de A y ve el cruce
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, serviceWorkers: 'block' });
  const rows = [{ slot: 'MEX-1', pegado: true, repes: 1 }, { slot: 'RSA-4', pegado: true, repes: 2 }];
  await mockAuth(ctx, URL, { rows });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  await openShare(p);
  await p.setInputFiles('#share-file', { name: 'qrA.png', mimeType: 'image/png', buffer: qrPngA });
  await p.waitForTimeout(1400);
  await p.evaluate(() => document.getElementById('sh-cruce')?.scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(300);
  await p.screenshot({ path: DIR + '03-cruce-tras-escanear.png' });
  await ctx.close();
}

// C: /s pública sin sesión
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const frag = await p.evaluate(async () => {
    const json = JSON.stringify({ u: 'San', t: 1785200000, f: [0, 21, 24, 43], r: [[20, 2], [980, 1]] });
    const stream = new Blob([new TextEncoder().encode(json)]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    let s = ''; for (const x of bytes) s += String.fromCharCode(x);
    return 'v1.' + btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  });
  await p.goto(URL.replace(/\/+$/, '') + '/s#' + frag, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  await p.screenshot({ path: DIR + '04-vista-publica-s.png', fullPage: true });
  await ctx.close();
}

await b.close();
console.log('capturas fv44 →', DIR);
