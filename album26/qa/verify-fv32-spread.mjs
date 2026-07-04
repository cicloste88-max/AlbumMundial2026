// Suite Fv3.2 — spread desktop 1280x800 + persistencia cross-modo (24 checks).
// Uso:  QA_URL=http://localhost:3000 node qa/<fichero>.mjs
// Env:  QA_URL (default http://localhost:3000) · QA_CHROME (binario Chromium)
//       QA_OUT (carpeta de screenshots, default ./qa-shots)
import { chromium } from 'playwright-core';
import { mockAuth } from './_mock-auth.mjs';   // Fv4.0: sesión+progreso mockeados
const EXE = process.env.QA_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = process.env.QA_URL || 'http://localhost:3000/';
const OUT = process.env.QA_OUT || './qa-shots';
import { mkdirSync } from 'fs';
mkdirSync(OUT, { recursive: true });
const results = [];
const ok = (n, c, x='') => { results.push([c?'PASS':'FAIL', n, x]); console.log((c?'PASS':'FAIL')+'  '+n+(x?'  ['+x+']':'')); if(!c) process.exitCode=1; };

const b = await chromium.launch({ executablePath: EXE });
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, hasTouch: true, serviceWorkers: 'block' });
const mock = await mockAuth(ctx, URL);   // requiere server con QA_AUTH_MOCK=1
const p = await ctx.newPage();
p.on('dialog', d => d.accept());
await p.goto(URL, { waitUntil: 'networkidle' });
mock.state.clear();
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(250);

const curText = () => p.evaluate(() => document.querySelector('[data-current]')?.innerText || '');
const curView = () => p.evaluate(() => +(document.querySelector('.view[data-current]')?.dataset.view ?? -1));
const clickChip = async (code) => {
  const found = await p.evaluate((c) => {
    const chip = [...document.querySelectorAll('#chips button')].find(x => x.textContent === c);
    if (!chip) return false; chip.click(); return true;
  }, code);
  if (!found) throw new Error('chip: ' + code);
  await p.waitForTimeout(80);
};

// ===== DESKTOP 1280x800: SPREAD =====
ok('desktop: sin .sheet en DOM (no libro de hojas)', await p.evaluate(() => document.querySelectorAll('.sheet').length) === 0);
ok('desktop: portada como vista única (.spage.solo)', await p.evaluate(() => !!document.querySelector('.view[data-current] .spage.solo .cover')));
await clickChip('CUW');
let txt = await curText();
ok('CUW spread: WE ARE CURAÇAO (L) visible', txt.includes('WE ARE') && txt.includes('CURAÇAO'));
ok('CUW spread: QUALIFIERS (L) visible', txt.includes('QUALIFIERS'));
ok('CUW spread: GROUP E + partidos reales (R) visibles SIMULTÁNEOS', txt.includes('GROUP E') && txt.includes('Houston Stadium'));
const slots = await p.evaluate(() => ({
  l: !!document.querySelector('.view[data-current] .spage.l [data-tile="CUW-2"]'),
  r: !!document.querySelector('.view[data-current] .spage.r [data-tile="CUW-15"]'),
  crest: !!document.querySelector('.view[data-current] .spage.r .crest'),
}));
ok('CUW spread: slots 1-10 en L y 11-20+TEAM PHOTO en R', slots.l && slots.r && slots.crest, JSON.stringify(slots));
ok('CUW spread: footers 44 · CUW y 45 · CUW', txt.includes('44 · CUW') && txt.includes('45 · CUW'));
ok('spread: lomo central presente (.spine)', await p.evaluate(() => !!document.querySelector('.view[data-current] .spine')));
const geo = await p.evaluate(() => {
  const r = document.querySelector('.view[data-current]').getBoundingClientRect();
  const nav = document.querySelector('.nav').getBoundingClientRect();
  const bar = document.querySelector('.demo-bar').getBoundingClientRect();
  return { vw: innerWidth, vh: innerHeight, left: r.left, right: innerWidth - r.right,
           ar: r.width / r.height, top: nav.top, bottom: innerHeight - bar.bottom, h: r.height };
});
ok('spread centrado horizontal (márgenes ±20px)', Math.abs(geo.left - geo.right) <= 20, `L=${geo.left.toFixed(1)} R=${geo.right.toFixed(1)}`);
ok('spread aspect 2016/1204 (~1.674)', Math.abs(geo.ar - 2016/1204) < 0.02, geo.ar.toFixed(3));
ok('spread cabe en alto (<=86vh)', geo.h <= geo.vh * 0.87, `h=${geo.h.toFixed(0)} vh=${geo.vh}`);
ok('conjunto centrado vertical (nav arriba vs bar abajo, |diff|<=60px)', Math.abs(geo.top - geo.bottom) <= 60, `top=${geo.top.toFixed(1)} bottom=${geo.bottom.toFixed(1)}`);
const beige = await p.evaluate(() => !!document.querySelector('.view[data-current] .face.back'));
ok('sin dorso beige en spread', !beige);
const mounted = await p.evaluate(() => document.querySelectorAll('.view').length);
ok('lazy mount por vista ±1 (<=3 vistas)', mounted <= 3, `views=${mounted}`);
// navegación por vistas
const vCUW = await curView();
await p.click('[data-nav="next"]'); await p.waitForTimeout(80);
ok('flecha › avanza UNA vista (pliego completo)', (await curView()) === vCUW + 1 && (await curText()).includes('IVORY COAST'), `v=${await curView()}`);
await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(80);
ok('teclado ← retrocede una vista', (await curView()) === vCUW && (await curText()).includes('CURAÇAO'));
// drag con ratón sobre el stage
await p.mouse.move(800, 400); await p.mouse.down(); await p.mouse.move(650, 405, { steps: 4 }); await p.mouse.up();
await p.waitForTimeout(120);
ok('drag de ratón avanza vista', (await curView()) === vCUW + 1, `v=${await curView()}`);
await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(500);
// grupos como vista única
await p.click('[data-goto="1"]'); await p.waitForTimeout(80);
ok('GRUPOS: vista única centrada (.spage.solo .gpage)', await p.evaluate(() => !!document.querySelector('.view[data-current] .spage.solo .gpage')));
// estados en spread + persistencia
await clickChip('CUW');
await p.click('[data-tile="CUW-2"]'); await p.waitForTimeout(80);
let ds = await p.evaluate(() => document.querySelector('[data-tile="CUW-2"]').dataset.state);
ok('spread: tap CUW-2 -> tengo', ds === 'tengo', ds);
let bar = await p.evaluate(() => document.querySelector('.demo-bar').innerText);
ok('spread: barra Pegados 1/20 del pliego visible', bar.includes('CURAÇAO') && bar.includes('Pegados 1/20'), bar);
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(250);
await clickChip('CUW'); await p.waitForTimeout(120);
ds = await p.evaluate(() => document.querySelector('[data-tile="CUW-2"]').dataset.state);
ok('spread: persiste tras recargar (CUW-2 tengo)', ds === 'tengo', ds);
await p.screenshot({ path: `${OUT}/fv32_cuw_spread.png` });

// ===== cambio a MÓVIL en la misma sesión: misma clave de storage =====
await p.setViewportSize({ width: 390, height: 844 });
await p.waitForTimeout(300);
// Fv3.8: el libro monta solo las hojas actual ±2 (presupuesto de capas iOS)
ok('móvil tras resize: libro de hojas (.sheet) presente (ventana ±2)', await p.evaluate(() => { const n = document.querySelectorAll('.sheet').length; return n >= 3 && n <= 5; }));
await clickChip('CUW'); await p.waitForTimeout(120);
ds = await p.evaluate(() => document.querySelector('[data-tile="CUW-2"]').dataset.state);
ok('móvil: CUW-2 sigue tengo (misma clave storage)', ds === 'tengo', ds);
// Fv4.0: la persistencia cross-modo vive en la nube (album_progress vía mock stateful)
ok('nube compartida cross-modo (upsert CUW-2 en album_progress)',
  mock.calls.upserts.some(u => u.slot === 'CUW-2' && u.pegado === true) && mock.state.has('CUW-2'),
  JSON.stringify([...mock.state.keys()]));
await p.screenshot({ path: `${OUT}/fv32_cuw_L_movil.png`, fullPage: false });
mock.state.clear();
await b.close();

const f = results.filter(r=>r[0]==='FAIL').length;
console.log(`\n${results.length-f}/${results.length} PASS, ${f} FAIL`);
// La regresión móvil completa se ejecuta aparte: QA_URL=... node qa/verify-fv31-movil.mjs
