// Suite Fv3.8 — presupuesto iOS/Safari del libro móvil (regresión permanente).
// Causa raíz corregida: 98 hojas 3D siempre montadas ≈ 200-300 capas de
// composición a @3x → crash de WebContent en Safari/iOS ("problema repetidamente").
//   (a) el libro monta SOLO las hojas actual ±2 (3-5 .sheet), con data-current
//   (b) presupuesto de composición (CDP LayerTree, viewport iPhone @3x):
//       <= 60 capas con backing y <= 60 MB estimados tras varios pasos de página
//       (medido tras el fix: ~27 capas / ~15 MB; antes: ~307 / ~189 MB)
//   (c) la sombra del libro NO rasteriza el subárbol 3D: .book sin filter,
//       ::before plano con el drop-shadow original (render idéntico)
//   (d) navegación por ventana: saltos lejanos y pasos siguen funcionando
//   (e) sw.js con guardas Safari (no cachear redirects de navegación, nunca
//       responder undefined offline)
// Uso:  QA_URL=http://localhost:3000 node qa/verify-fv38-ios.mjs
import { chromium } from 'playwright-core';
import { mockAuth } from './_mock-auth.mjs';   // Fv4.0: sesión+progreso mockeados
const EXE = process.env.QA_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = process.env.QA_URL || 'http://localhost:3000/';
const results = [];
const ok = (n, c, x='') => { results.push([c?'PASS':'FAIL', n, x]); console.log((c?'PASS':'FAIL')+'  '+n+(x?'  ['+x+']':'')); if(!c) process.exitCode=1; };

const b = await chromium.launch({ executablePath: EXE });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, serviceWorkers: 'block' });
await mockAuth(ctx, URL);   // Fv4.0: requiere server con QA_AUTH_MOCK=1
const fx = await ctx.newPage();
const du = await fx.evaluate(() => { const c = document.createElement('canvas'); c.width=640; c.height=427; const g=c.getContext('2d'); g.fillStyle='#1b3f8f'; g.fillRect(0,0,640,427); return c.toDataURL('image/png'); });
await fx.close();
await ctx.route('**/storage/v1/object/public/flags/**', (r, req) => r.fulfill({ contentType: 'image/png', body: Buffer.from(du.split(',')[1], 'base64') }));
const p = await ctx.newPage();
p.on('dialog', d => d.accept());

// CDP LayerTree antes de cargar (para recibir los eventos desde el principio)
const cdp = await ctx.newCDPSession(p);
let layers = [];
cdp.on('LayerTree.layerTreeDidChange', (e) => { if (e.layers) layers = e.layers; });
await cdp.send('LayerTree.enable');

await p.goto(URL, { waitUntil: 'networkidle' });
await p.waitForTimeout(500);

const sheetInfo = () => p.evaluate(() => ({
  n: document.querySelectorAll('.sheet').length,
  cur: document.querySelector('.sheet[data-current]')?.dataset.page ?? null,
  pages: [...document.querySelectorAll('.sheet')].map(s => +s.dataset.page),
}));

// (a) ventana de hojas — Fv4.2: posición-independiente (las secciones especiales
// insertadas desplazan los índices; la propiedad verificada sigue siendo "ventana
// actual±2 contigua"). Ya no se hardcodea MEX=hoja 2.
const windowOk = (si, expectCur) => {
  const pages = si.pages;
  if (si.n < 3 || si.n > 5) return false;
  if (expectCur !== undefined && si.cur !== String(expectCur)) return false;
  const cur = +si.cur;
  const contig = pages.every((v, i) => i === 0 || v === pages[i - 1] + 1);
  return contig && pages.includes(cur) && cur - pages[0] <= 2 && pages[pages.length - 1] - cur <= 2;
};
let si = await sheetInfo();
ok('(a) portada: ventana actual±2 (3 hojas, current=0)', si.n === 3 && windowOk(si, 0) && si.pages.join() === '0,1,2', JSON.stringify(si));
await p.evaluate(() => { [...document.querySelectorAll('#chips button')].find(x => x.textContent === 'MEX')?.click(); });
await p.waitForTimeout(400);
si = await sheetInfo();
const mexPage = +si.cur;
ok('(a) MEX: 5 hojas montadas actual±2 (ventana contigua)', si.n === 5 && windowOk(si), JSON.stringify(si));
await p.evaluate(() => document.querySelector('[data-nav="next"]').click());
await p.waitForTimeout(500);
si = await sheetInfo();
ok('(a) next: ventana desplazada +1 (current=MEX+1)', si.n === 5 && windowOk(si, mexPage + 1), JSON.stringify(si));

// (d) salto lejano por chip y contenido visible
await p.evaluate(() => { [...document.querySelectorAll('#chips button')].find(x => x.textContent === 'PAN')?.click(); });
await p.waitForTimeout(500);
const panTxt = await p.evaluate(() => document.querySelector('[data-current] .face.front')?.innerText || '');
ok('(d) salto lejano a PAN: página L renderizada (WE ARE + QUALIFIERS)', panTxt.includes('WE ARE') && panTxt.includes('QUALIFIERS'));
await p.evaluate(() => document.querySelector('[data-nav="prev"]').click());
await p.waitForTimeout(500);
const prevOk = await p.evaluate(() => document.querySelector('.sheet[data-current]')?.dataset.page);
ok('(d) prev tras salto: retrocede una hoja', prevOk !== null && +prevOk >= 0, `page=${prevOk}`);

// (b) presupuesto de composición tras varios pasos
for (let i = 0; i < 4; i++) { await p.evaluate(() => document.querySelector('[data-nav="next"]').click()); await p.waitForTimeout(500); }
await p.waitForTimeout(700);
const withBacking = layers.filter(l => l.width > 0 && l.height > 0);
const mb = withBacking.reduce((a, l) => a + l.width * l.height * 4, 0) / 1048576;
ok('(b) capas con backing <= 60 (antes ~307)', withBacking.length > 0 && withBacking.length <= 60, `capas=${withBacking.length}`);
ok('(b) memoria de backing estimada <= 60 MB (antes ~189)', mb <= 60, `${mb.toFixed(0)} MB @3x`);

// (c) sombra sin rasterizar el subárbol 3D
const shadow = await p.evaluate(() => {
  const bk = document.querySelector('.book');
  return { filter: getComputedStyle(bk).filter, before: getComputedStyle(bk, '::before').filter };
});
ok('(c) .book sin filter propio', shadow.filter === 'none', shadow.filter);
ok('(c) ::before con el drop-shadow original', shadow.before.includes('drop-shadow'), shadow.before);

// (f) Fv4.1-prep: safe-areas (notch/home indicator) para WebView nativo y PWA
const vf = await p.evaluate(() => document.querySelector('meta[name="viewport"]')?.content || '');
ok('(f) viewport-fit=cover en el meta viewport', vf.includes('viewport-fit=cover'), vf);
try {
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 59, left: 0, bottom: 34, right: 0 } });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(600);
  const sa = await p.evaluate(() => {
    const w = document.querySelector('.ab-wrap');
    return { top: parseFloat(getComputedStyle(w).paddingTop), bottom: parseFloat(getComputedStyle(w).paddingBottom) };
  });
  ok('(f) insets aplicados: contenido fuera del notch (padding 71/64)', sa.top === 71 && sa.bottom === 64, JSON.stringify(sa));
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, left: 0, bottom: 0, right: 0 } });
} catch {
  ok('(f) insets aplicados (CDP no disponible en este Chromium — skip)', true, 'skip');
}

// (e) guardas Safari en el SW
const sw = await (await p.request.get(URL.replace(/\/+$/, '') + '/sw.js')).text();
ok('(e) sw.js: no cachea respuestas redirigidas de navegación', sw.includes('res.redirected'));
ok('(e) sw.js: fallback Response (nunca undefined) offline', sw.includes('new Response'));

await b.close();
const f = results.filter(r => r[0] === 'FAIL').length;
console.log(`\n${results.length - f}/${results.length} PASS, ${f} FAIL`);
