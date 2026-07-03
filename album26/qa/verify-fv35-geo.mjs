// Suite Fv3.5 — QA GEOMÉTRICO móvil (viewport 360x740) + cache-bust de banderas.
// Sobre HAI, CZE y PAN (páginas L y R):
//   (a) ningún par de bloques principales se solapa (header/grids/mlang/partidos/
//       quali/pill: intersección de boundingRects vacía, tolerancia 2px)
//   (b) título "GROUP {X}" en UNA línea (height < 1.6×lineHeight y sin overflow)
//   (c) sin desborde horizontal (scrollWidth == clientWidth del contenedor)
//   (d) todas las <img> de bandera cargan con naturalWidth >= 600 y URL ?v=2
// NOTA sandbox: la red no llega a supabase.co, así que las requests de flags/
// se interceptan con un PNG fixture de 640px generado al vuelo. Eso valida el
// mecanismo completo (URL con versión + carga + naturalWidth); la validación
// contra el CDN real (PNGs w640 ya subidos al bucket) se hace en prod.
// Uso:  QA_URL=http://localhost:3000 node qa/verify-fv35-geo.mjs
import { chromium } from 'playwright-core';
const EXE = process.env.QA_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = process.env.QA_URL || 'http://localhost:3000/';
const CODES = ['HAI', 'CZE', 'PAN'];
const TOL = 2; // px
const results = [];
const ok = (n, c, x='') => { results.push([c?'PASS':'FAIL', n, x]); console.log((c?'PASS':'FAIL')+'  '+n+(x?'  ['+x+']':'')); if(!c) process.exitCode=1; };

const b = await chromium.launch({ executablePath: EXE });
const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, hasTouch: true });

// fixture PNG 640x427 (rectangular, como los w640 del bucket) generado con canvas
const fixPage = await ctx.newPage();
const dataUrl = await fixPage.evaluate(() => {
  const c = document.createElement('canvas'); c.width = 640; c.height = 427;
  const g = c.getContext('2d');
  g.fillStyle = '#1b3f8f'; g.fillRect(0, 0, 640, 427);
  g.fillStyle = '#fff'; g.fillRect(0, 160, 640, 107);
  return c.toDataURL('image/png');
});
await fixPage.close();
const png = Buffer.from(dataUrl.split(',')[1], 'base64');

// interceptar TODAS las requests de banderas: sirve el fixture y registra la URL
const flagUrls = [];
await ctx.route('**/storage/v1/object/public/flags/**', (route) => {
  flagUrls.push(route.request().url());
  route.fulfill({ contentType: 'image/png', body: png });
});

const p = await ctx.newPage();
p.on('dialog', (d) => d.accept());
await p.goto(URL, { waitUntil: 'networkidle' });
await p.waitForTimeout(400);

const clickChip = async (code) => {
  const found = await p.evaluate((c) => {
    const chip = [...document.querySelectorAll('#chips button')].find(x => x.textContent === c);
    if (!chip) return false; chip.click(); return true;
  }, code);
  if (!found) throw new Error('chip: ' + code);
  await p.waitForTimeout(400);
};
const nextPage = async () => {
  await p.evaluate(() => document.querySelector('[data-nav="next"]').click());
  await p.waitForTimeout(800); // animación de volteo
};

// bloques principales de la hoja actual: hijos de flujo del .inner (sin row-gap)
// + comprobaciones de solape par a par con tolerancia TOL
const pageChecks = (extraSel) => p.evaluate(({ tol, extraSel }) => {
  const inner = document.querySelector('[data-current] .face.front .inner');
  if (!inner) return { error: 'sin .inner' };
  const blocks = [...inner.children]
    .filter(el => !el.classList.contains('row-gap'))
    .map(el => ({ name: el.className.split(' ').join('.') || el.tagName, r: el.getBoundingClientRect() }));
  for (const sel of extraSel) {
    const el = inner.querySelector(sel.sel);
    if (el) blocks.push({ name: sel.name, r: el.getBoundingClientRect(), within: sel.within });
  }
  const overlaps = [];
  for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) {
    const a = blocks[i], b = blocks[j];
    if (a.within === b.name || b.within === a.name) continue; // contención por diseño
    const ox = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
    const oy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    if (ox > tol && oy > tol) overlaps.push(`${a.name} ∩ ${b.name} (${ox.toFixed(1)}x${oy.toFixed(1)})`);
  }
  // .face tiene capas .bg que sangran a propósito (recortadas por overflow:hidden):
  // el desborde se mide sobre el contenedor de contenido (.inner) y el documento
  const doc = document.documentElement;
  const flags = [...inner.querySelectorAll('img[src*="flags/"]')]
    .map(img => ({ src: img.src, nw: img.naturalWidth }));
  const noflag = inner.querySelectorAll('.noflag').length;
  return {
    overlaps,
    innerHoriz: { sw: inner.scrollWidth, cw: inner.clientWidth },
    docHoriz: { sw: doc.scrollWidth, cw: doc.clientWidth },
    flags, noflag,
  };
}, { tol: TOL, extraSel });

for (const code of CODES) {
  // -------- página L --------
  await clickChip(code);
  const L = await pageChecks([]);
  ok(`${code} L (a): ningún par de bloques se solapa (grids/quali/pill)`, !L.error && L.overlaps.length === 0, L.error || L.overlaps.join(' · '));
  ok(`${code} L (c): sin desborde horizontal (scrollWidth == clientWidth)`,
    L.innerHoriz.sw === L.innerHoriz.cw && L.docHoriz.sw === L.docHoriz.cw,
    `inner=${JSON.stringify(L.innerHoriz)} doc=${JSON.stringify(L.docHoriz)}`);
  ok(`${code} L (d): banderas cargadas con naturalWidth >= 600 (fixture w640)`,
    L.flags.length > 0 && L.noflag === 0 && L.flags.every(f => f.nw >= 600),
    `imgs=${L.flags.length} noflag=${L.noflag} nw=${L.flags.map(f => f.nw).join(',')}`);

  // -------- página R --------
  await nextPage();
  const R = await pageChecks([
    { sel: '.mlang', name: 'mlang', within: 'grid' },
    { sel: '.gbadge', name: 'gbadge', within: 'grid' },
  ]);
  // mlang y gbadge viven dentro de un grid (contención por diseño): se comparan
  // contra matches/pageno/los otros grids, no contra su propio contenedor
  const rOverlaps = (R.overlaps || []).filter(o => !(o.includes('mlang ∩ grid') || o.includes('grid ∩ mlang') || o.includes('gbadge ∩ grid') || o.includes('grid ∩ gbadge')));
  ok(`${code} R (a): ningún par de bloques se solapa (grids/mlang/partidos/pill)`, !R.error && rOverlaps.length === 0, R.error || rOverlaps.join(' · '));
  ok(`${code} R (c): sin desborde horizontal (scrollWidth == clientWidth)`,
    R.innerHoriz.sw === R.innerHoriz.cw && R.docHoriz.sw === R.docHoriz.cw,
    `inner=${JSON.stringify(R.innerHoriz)} doc=${JSON.stringify(R.docHoriz)}`);
  ok(`${code} R (d): banderas del bloque GROUP con naturalWidth >= 600`,
    R.flags.length >= 4 && R.noflag === 0 && R.flags.every(f => f.nw >= 600),
    `imgs=${R.flags.length} noflag=${R.noflag}`);
  const gt = await p.evaluate(() => {
    const el = document.querySelector('[data-current] .face.front .gbadge .gt');
    if (!el) return null;
    const cs = getComputedStyle(el);
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
    const range = document.createRange(); range.selectNodeContents(el);
    return { text: el.textContent, h: el.getBoundingClientRect().height, lh,
             lines: range.getClientRects().length, sw: el.scrollWidth, cw: el.clientWidth };
  });
  ok(`${code} R (b): "${gt?.text}" en UNA línea (height < 1.6×lineHeight)`,
    !!gt && gt.h < 1.6 * gt.lh && gt.lines === 1 && gt.sw <= gt.cw + 2,
    gt ? `h=${gt.h.toFixed(1)} lh=${gt.lh.toFixed(1)} lines=${gt.lines} sw/cw=${gt.sw}/${gt.cw}` : 'sin .gt');
}

// -------- cache-bust: CZE header + todas las URLs interceptadas --------
await clickChip('CZE');
const czeHdr = await p.evaluate(() => {
  const img = document.querySelector('[data-current] .face.front .fed img');
  return img ? { src: img.src, nw: img.naturalWidth } : null;
});
ok('CZE header: <img> de bandera con naturalWidth >= 600', !!czeHdr && czeHdr.nw >= 600, JSON.stringify(czeHdr));
ok('CZE header: URL con cache-bust ?v=2', !!czeHdr && /\/flags\/CZE\.png\?v=2$/.test(czeHdr.src), czeHdr?.src || '');
ok('TODAS las requests de bandera llevan ?v=2', flagUrls.length > 0 && flagUrls.every(u => /\.png\?v=2$/.test(u)),
  `${flagUrls.length} requests` + (flagUrls.find(u => !/\?v=2$/.test(u)) ? ' · sin v=2: ' + flagUrls.find(u => !/\?v=2$/.test(u)) : ''));

await b.close();
const f = results.filter(r => r[0] === 'FAIL').length;
console.log(`\n${results.length - f}/${results.length} PASS, ${f} FAIL`);
console.log('NOTA: banderas servidas por fixture local w640 (el sandbox no llega a supabase.co);');
console.log('      la validación contra el CDN real se hace en prod tras el deploy.');
