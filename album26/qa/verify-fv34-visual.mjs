// Suite Fv3.4 — calidad visual: bloque GROUP con tiles + header wordmark/bandera/fed.
// Viewport 1280x800 (spread). Genera screenshots del gate en qa/screenshots/fv34/.
// Uso:  QA_URL=http://localhost:3000 node qa/verify-fv34-visual.mjs
import { chromium } from 'playwright-core';
import { mockAuth } from './_mock-auth.mjs';   // Fv4.0: sesión+progreso mockeados
import { mkdirSync } from 'fs';
const EXE = process.env.QA_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = process.env.QA_URL || 'http://localhost:3000/';
const SHOTS = process.env.QA_SHOTS || 'qa/screenshots/fv34';
mkdirSync(SHOTS, { recursive: true });
const results = [];
const ok = (n, c, x='') => { results.push([c?'PASS':'FAIL', n, x]); console.log((c?'PASS':'FAIL')+'  '+n+(x?'  ['+x+']':'')); if(!c) process.exitCode=1; };

const b = await chromium.launch({ executablePath: EXE });
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
await mockAuth(ctx, URL);   // requiere server con QA_AUTH_MOCK=1
const p = await ctx.newPage();
p.on('dialog', d => d.accept());
await p.goto(URL, { waitUntil: 'networkidle' });
await p.waitForTimeout(250);

const clickChip = async (code) => {
  const found = await p.evaluate((c) => {
    const chip = [...document.querySelectorAll('#chips button')].find(x => x.textContent === c);
    if (!chip) return false; chip.click(); return true;
  }, code);
  if (!found) throw new Error('chip: ' + code);
  await p.waitForTimeout(120);
};

// (a) CZE header: fed nueva del GT fotográfico
await clickChip('CZE');
const czeTxt = await p.evaluate(() => document.querySelector('[data-current] .spage.l')?.innerText || '');
ok('(a) CZE L: fed "Fotbalová asociace České republiky"', czeTxt.includes('Fotbalová asociace České republiky'));

// header: jerarquía y geometría (CZE, país corto)
const hdr = await p.evaluate(() => {
  const w = document.querySelector('[data-current] .spage.l .weare');
  const l1 = w.querySelector('.l1'), l2 = w.querySelector('.l2');
  const img = document.querySelector('[data-current] .spage.l .fed img');
  const pageW = document.querySelector('[data-current] .spage.l').getBoundingClientRect().width;
  const fs1 = parseFloat(getComputedStyle(l1).fontSize), fs2 = parseFloat(getComputedStyle(l2).fontSize);
  const ir = img ? img.getBoundingClientRect() : null;
  const st = img ? getComputedStyle(img) : null;
  return { fs1, fs2, pageW, flagW: ir ? ir.width / pageW : null,
           flagRadius: st ? st.borderRadius : null, flagBorder: st ? parseFloat(st.borderTopWidth) : null,
           l1Color: getComputedStyle(l1).color, l2Color: getComputedStyle(l2).color };
});
ok('header: país > WE ARE (jerarquía)', hdr.fs2 > hdr.fs1, `l1=${hdr.fs1.toFixed(1)} l2=${hdr.fs2.toFixed(1)}`);
ok('header: ratio país/WE ARE ~1.6', Math.abs(hdr.fs2 / hdr.fs1 - 1.587) < 0.1, (hdr.fs2/hdr.fs1).toFixed(2));
ok('header: colores del tema distintos en l1/l2', hdr.l1Color !== hdr.l2Color, `${hdr.l1Color} vs ${hdr.l2Color}`);
ok('header: bandera ~29% de W', hdr.flagW !== null && Math.abs(hdr.flagW - 0.29) < 0.03, String(hdr.flagW?.toFixed(3)));
ok('header: bandera radio <=4px (no píldora)', hdr.flagRadius === '4px', hdr.flagRadius);
ok('header: bandera con borde blanco fino', hdr.flagBorder !== null && hdr.flagBorder >= 2, String(hdr.flagBorder));

// país largo: BIH a 2 líneas máximo y sigue > WE ARE
await clickChip('BIH');
const bih = await p.evaluate(() => {
  const w = document.querySelector('[data-current] .spage.l .weare');
  const l1 = w.querySelector('.l1'), l2 = w.querySelector('.l2');
  const fs1 = parseFloat(getComputedStyle(l1).fontSize), fs2 = parseFloat(getComputedStyle(l2).fontSize);
  const lines = Math.round(l2.getBoundingClientRect().height / (fs2 * 0.98));
  return { fs1, fs2, lines, overflowX: l2.scrollWidth > l2.clientWidth + 2 };
});
ok('BIH: nombre largo en <=2 líneas sin overflow', bih.lines <= 2 && !bih.overflowX, JSON.stringify(bih));
ok('BIH: jerarquía país > WE ARE se mantiene', bih.fs2 > bih.fs1, `l1=${bih.fs1.toFixed(1)} l2=${bih.fs2.toFixed(1)}`);

// página L sin overflow vertical (salvaguarda del wordmark)
const noOverflow = await p.evaluate(() => {
  const inner = document.querySelector('[data-current] .spage.l .inner');
  return inner.scrollHeight <= inner.clientHeight + 2;
});
ok('página L sin overflow vertical', noOverflow);

// (b) bloque GROUP sin border-radius circulares + (d) tile propio con borde
await clickChip('MEX');
const grp = await p.evaluate(() => {
  const box = document.querySelector('[data-current] .spage.r .gbadge');
  const all = [...box.querySelectorAll('*'), box];
  const circles = all.filter(el => getComputedStyle(el).borderRadius.includes('50%')).length;
  const tiles = [...box.querySelectorAll('.gtile')];
  const me = box.querySelector('.gtile.me');
  const meBorder = me ? parseFloat(getComputedStyle(me).borderTopWidth) : 0;
  const meCode = me ? me.querySelector('.gband').textContent : null;
  const bands = tiles.map(t => {
    const band = t.querySelector('.gband');
    const bs = getComputedStyle(band);
    const tr = t.getBoundingClientRect(), br = band.getBoundingClientRect();
    return { ratio: br.width / tr.width, wm: bs.writingMode, code: band.textContent };
  });
  return { circles, nTiles: tiles.length, meBorder, meCode, bands };
});
ok('(b) GROUP: NINGÚN elemento con border-radius 50%', grp.circles === 0, `circles=${grp.circles}`);
ok('GROUP: 4 tiles en grid 2x2', grp.nTiles === 4);
ok('GROUP: banda vertical ~22% con writing-mode vertical', grp.bands.every(b => Math.abs(b.ratio - 0.22) < 0.05 && b.wm === 'vertical-rl'), JSON.stringify(grp.bands.map(b=>b.ratio.toFixed(2))));
ok('(d) MEX: tile propio con borde blanco destacado (>=3px)', grp.meCode === 'MEX' && grp.meBorder >= 3, `me=${grp.meCode} border=${grp.meBorder}px`);

// (c) PAN en GROUP L (página de ENG): bandera contenida sin overflow del tile
await clickChip('ENG');
const pan = await p.evaluate(() => {
  const tile = [...document.querySelectorAll('[data-current] .spage.r .gtile')].find(t => t.querySelector('.gband').textContent === 'PAN');
  if (!tile) return null;
  const media = tile.querySelector('img') || tile.querySelector('.noflag');
  const tr = tile.getBoundingClientRect(), mr = media.getBoundingClientRect();
  const contained = mr.left >= tr.left - 1 && mr.right <= tr.right + 1 && mr.top >= tr.top - 1 && mr.bottom <= tr.bottom + 1;
  return { contained, overflowHidden: getComputedStyle(tile).overflow === 'hidden' };
});
ok('(c) PAN en GROUP L: bandera contenida (sin overflow del tile)', !!pan && pan.contained && pan.overflowHidden, JSON.stringify(pan));

// screenshots del gate: CZE L completa y MEX R completa
await clickChip('CZE'); await p.waitForTimeout(200);
await (await p.$('[data-current] .spage.l')).screenshot({ path: `${SHOTS}/cze_L.png` });
await clickChip('MEX'); await p.waitForTimeout(200);
await (await p.$('[data-current] .spage.r')).screenshot({ path: `${SHOTS}/mex_R.png` });
console.log('screenshots ->', SHOTS);

await b.close();
const f = results.filter(r=>r[0]==='FAIL').length;
console.log(`\n${results.length-f}/${results.length} PASS, ${f} FAIL`);
