// Suite Fv3.7 — LA PARRILLA MANDA (invariante duro de página de equipo):
//   (1) todos los cromos de jugador de una página miden lo mismo:
//       max(anchos)/min(anchos) <= 1.02  ·  en L y R, desktop y móvil
//   (2) bloque GROUP encajado en su columna: ancho <= ancho_columna * 1.15
//   (3) zona de bandera de los tiles del grupo: ratio 1.30-1.36 (4:3 + cover)
// Páginas: MEX, HAI, CZE · viewports 1280x800 (spread) y 360x740 (móvil).
// Screenshots del gate en qa/screenshots/fv37/ (R de MEX desktop y móvil).
// NOTA sandbox: flags/ interceptadas con PNG fixture w640 (sin red a supabase.co).
// Uso:  QA_URL=http://localhost:3000 node qa/verify-fv37-grid.mjs
import { chromium } from 'playwright-core';
import { mockAuth } from './_mock-auth.mjs';   // Fv4.0: sesión+progreso mockeados
import { mkdirSync } from 'fs';
const EXE = process.env.QA_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = process.env.QA_URL || 'http://localhost:3000/';
const SHOTS = process.env.QA_SHOTS || 'qa/screenshots/fv37';
mkdirSync(SHOTS, { recursive: true });
const CODES = ['MEX', 'HAI', 'CZE'];
const results = [];
const ok = (n, c, x='') => { results.push([c?'PASS':'FAIL', n, x]); console.log((c?'PASS':'FAIL')+'  '+n+(x?'  ['+x+']':'')); if(!c) process.exitCode=1; };

const b = await chromium.launch({ executablePath: EXE });

// anchos de cromos de jugador de una cara (slot 13 .crest excluido: es apaisado por diseño)
const tileWidths = (root) => [...root.querySelectorAll('.tile[data-tile]')]
  .filter(t => !t.classList.contains('crest'))
  .map(t => t.getBoundingClientRect().width);

for (const vw of [[1280, 800, 'desktop'], [360, 740, 'móvil']]) {
  const [w, h, modo] = vw;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: w < 900, serviceWorkers: 'block' });
  await mockAuth(ctx, URL);   // Fv4.0: requiere server con QA_AUTH_MOCK=1
  const fx = await ctx.newPage();
  const du = await fx.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 640; c.height = 427;
    const g = c.getContext('2d'); g.fillStyle = '#1b3f8f'; g.fillRect(0, 0, 640, 427);
    g.fillStyle = '#fff'; g.fillRect(0, 160, 640, 107);
    return c.toDataURL('image/png');
  });
  await fx.close();
  const png = Buffer.from(du.split(',')[1], 'base64');
  await ctx.route('**/storage/v1/object/public/flags/**', r => r.fulfill({ contentType: 'image/png', body: png }));
  const p = await ctx.newPage();
  p.on('dialog', d => d.accept());
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.waitForTimeout(400);

  for (const code of CODES) {
    await p.evaluate((c) => { [...document.querySelectorAll('#chips button')].find(x => x.textContent === c)?.click(); }, code);
    await p.waitForTimeout(400);

    if (w >= 900) {
      // spread: L y R visibles a la vez
      const d = await p.evaluate((tw) => {
        const f = new Function('root', 'return (' + tw + ')(root)');
        const L = f(document.querySelector('[data-current] .spage.l'));
        const R = f(document.querySelector('[data-current] .spage.r'));
        const root = document.querySelector('[data-current] .spage.r');
        const gb = root.querySelector('.gbadge').getBoundingClientRect().width;
        const col = root.querySelector('.tile[data-tile$="-18"]').getBoundingClientRect().width;
        const imgs = [...root.querySelectorAll('.gtile img, .gtile .noflag')].map(i => { const r = i.getBoundingClientRect(); return r.width / r.height; });
        return { L, R, gb, col, imgs };
      }, tileWidths.toString());
      ok(`${modo} ${code} L (1): cromos iguales (max/min <= 1.02)`, Math.max(...d.L) / Math.min(...d.L) <= 1.02, (Math.max(...d.L) / Math.min(...d.L)).toFixed(4));
      ok(`${modo} ${code} R (1): cromos iguales incl. 18-20 (max/min <= 1.02)`, Math.max(...d.R) / Math.min(...d.R) <= 1.02, (Math.max(...d.R) / Math.min(...d.R)).toFixed(4));
      ok(`${modo} ${code} R (2): bloque GROUP <= columna * 1.15`, d.gb <= d.col * 1.15, `gb=${d.gb.toFixed(1)} col=${d.col.toFixed(1)}`);
      ok(`${modo} ${code} R (3): zona bandera ratio 1.30-1.36`, d.imgs.length === 4 && d.imgs.every(r => r >= 1.30 && r <= 1.36), d.imgs.map(r => r.toFixed(3)).join(','));
    } else {
      // móvil: L, luego R
      const L = await p.evaluate((tw) => new Function('root', 'return (' + tw + ')(root)')(document.querySelector('[data-current] .face.front')), tileWidths.toString());
      ok(`${modo} ${code} L (1): cromos iguales (max/min <= 1.02)`, Math.max(...L) / Math.min(...L) <= 1.02, (Math.max(...L) / Math.min(...L)).toFixed(4));
      await p.evaluate(() => document.querySelector('[data-nav="next"]').click());
      await p.waitForTimeout(800);
      const d = await p.evaluate((tw) => {
        const root = document.querySelector('[data-current] .face.front');
        const R = new Function('root', 'return (' + tw + ')(root)')(root);
        const gb = root.querySelector('.gbadge').getBoundingClientRect().width;
        const col = root.querySelector('.tile[data-tile$="-18"]').getBoundingClientRect().width;
        const imgs = [...root.querySelectorAll('.gtile img, .gtile .noflag')].map(i => { const r = i.getBoundingClientRect(); return r.width / r.height; });
        return { R, gb, col, imgs };
      }, tileWidths.toString());
      ok(`${modo} ${code} R (1): cromos iguales incl. 18-20 (max/min <= 1.02)`, Math.max(...d.R) / Math.min(...d.R) <= 1.02, (Math.max(...d.R) / Math.min(...d.R)).toFixed(4));
      ok(`${modo} ${code} R (2): bloque GROUP <= columna * 1.15`, d.gb <= d.col * 1.15, `gb=${d.gb.toFixed(1)} col=${d.col.toFixed(1)}`);
      ok(`${modo} ${code} R (3): zona bandera ratio 1.30-1.36`, d.imgs.length === 4 && d.imgs.every(r => r >= 1.30 && r <= 1.36), d.imgs.map(r => r.toFixed(3)).join(','));
    }
  }

  // screenshots del gate: R de MEX (18/19/20 deben verse iguales a 14-17)
  await p.evaluate((c) => { [...document.querySelectorAll('#chips button')].find(x => x.textContent === c)?.click(); }, 'MEX');
  await p.waitForTimeout(400);
  if (w >= 900) {
    await (await p.$('[data-current] .spage.r')).screenshot({ path: `${SHOTS}/mex_R.png` });
  } else {
    await p.evaluate(() => document.querySelector('[data-nav="next"]').click());
    await p.waitForTimeout(800);
    await (await p.$('[data-current] .face.front')).screenshot({ path: `${SHOTS}/mex_R_movil.png` });
  }
  await ctx.close();
}
console.log('screenshots ->', SHOTS);

await b.close();
const f = results.filter(r => r[0] === 'FAIL').length;
console.log(`\n${results.length - f}/${results.length} PASS, ${f} FAIL`);
