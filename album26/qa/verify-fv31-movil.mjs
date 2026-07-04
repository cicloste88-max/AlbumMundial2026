// Suite Fv3.1 — funcional+visual del libro en móvil (57 checks). Viewport 420x900 (<900px).
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
const ctx = await b.newContext({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2, hasTouch: true, serviceWorkers: 'block' });
const mock = await mockAuth(ctx, URL);   // requiere server con QA_AUTH_MOCK=1
const p = await ctx.newPage();
p.on('dialog', d => d.accept());
await p.goto(URL, { waitUntil: 'networkidle' });
mock.state.clear();
await p.reload({ waitUntil: 'networkidle' });

const visText = () => p.evaluate(() => document.querySelector('[data-current] .face.front')?.innerText || '');
const barText = () => p.evaluate(() => document.querySelector('.demo-bar')?.innerText || '');
const curPage = () => p.evaluate(() => +(document.querySelector('[data-current]')?.dataset.page ?? -1));
const clickChip = async (code) => {
  const found = await p.evaluate((c) => {
    const chip = [...document.querySelectorAll('#chips button')].find(x => x.textContent === c);
    if (!chip) return false; chip.click(); return true;
  }, code);
  if (!found) throw new Error('chip no encontrado: ' + code);
  await p.waitForTimeout(60);
};
const next = async () => { await p.click('[data-nav="next"]'); await p.waitForTimeout(60); };

// ===== A. Funcionales (los 41 de Fv3, selectores/textos adaptados al markup de referencia) =====
ok('hoja 0 = portada (FIFA WORLD CUP 2026 + PANINI)', (await visText()).includes('FIFA WORLD CUP 2026') && (await visText()).includes('PANINI'));
await p.click('[data-goto="1"]'); await p.waitForTimeout(80);
ok('GRUPOS -> hoja 1 (48 selecciones · 12 grupos)', (await visText()).includes('48 selecciones · 12 grupos') && await curPage() === 1);
const nGroups = await p.evaluate(() => document.querySelector('[data-current] .face.front').querySelectorAll('.gcard').length);
ok('índice con 12 grupos (.gcard)', nGroups === 12, `gcards=${nGroups}`);
// Fv3.8 (iOS): el libro monta SOLO las hojas actual ±2 (98 hojas 3D = ~300
// capas de composición → crash de WebContent en Safari/iOS)
const totalSheets = await p.evaluate(() => document.querySelectorAll('.sheet').length);
ok('hojas montadas = actual ±2 (3-5 .sheet, no 98)', totalSheets >= 3 && totalSheets <= 5, `sheets=${totalSheets}`);
const mounted = await p.evaluate(() => [...document.querySelectorAll('.sheet .face.front')].filter(f => f.innerHTML.trim() !== '').length);
ok('lazy mount: solo ±2 montadas (<=5)', mounted <= 5, `mounted=${mounted}`);
const CODES = await p.evaluate(() => [...document.querySelectorAll('#chips button')].map(c => c.textContent));
ok('48 chips de equipo (#chips)', CODES.length === 48, `chips=${CODES.length}`);
let navOK = true, navBad = '';
for (const code of CODES) {
  await clickChip(code);
  const txt = await visText();
  if (!txt.includes('WE ARE') || !txt.includes('QUALIFIERS')) { navOK = false; navBad = code; break; }
}
ok('48 pliegos navegables por chips (hoja L: WE ARE + QUALIFIERS)', navOK, navBad);

const spot = async (code, slot, expectFrag, side) => {
  await clickChip(code);
  if (side === 'R') await next();
  const tile = await p.evaluate((k) => { const t = document.querySelector(`[data-tile="${k}"]`); return t ? t.innerText.replace(/\n/g,' ') : null; }, `${code}-${slot}`);
  return { tile, found: tile !== null && expectFrag.every(f => tile.includes(f)) };
};
let r = await spot('RSA', 15, ['YAYA','SITHOLE'], 'R');   ok('RSA-15 = YAYA SITHOLE', r.found, r.tile);
r = await spot('NED', 3, ['VIRGIL','VAN DIJK'], 'L');      ok('NED-3 = VIRGIL VAN DIJK', r.found, r.tile);
r = await spot('ARG', 17, ['LIONEL','MESSI'], 'R');        ok('ARG-17 = LIONEL MESSI', r.found, r.tile);
r = await spot('POR', 15, ['CRISTIANO','RONALDO'], 'R');   ok('POR-15 = CRISTIANO RONALDO', r.found, r.tile);
r = await spot('ESP', 13, ['TEAM PHOTO'], 'R');            ok('ESP slot 13 = TEAM PHOTO (.crest)', r.found, r.tile);
const espCrestwrap = await p.evaluate(() => document.querySelector('[data-current] .crestwrap')?.innerText || '');
ok('ESP R: mlang real junto a la TEAM PHOTO (España |, Fv3.3)', espCrestwrap.includes('España |'), espCrestwrap.replace(/\n/g,' '));
r = await spot('ESP', 10, ['RODRI'], 'L');
const rodriFn = await p.evaluate(() => document.querySelector('[data-tile="ESP-10"] .pname .fn')?.textContent.trim() ?? null);
ok('ESP-10 mononímico: fn vacío (&nbsp;) + sn RODRI', r.found && rodriFn === '', JSON.stringify(rodriFn));
r = await spot('USA', 10, ['WESTON','MCKENNY'], 'L');      ok('USA-10 typo MCKENNY intacto', r.found, r.tile);

await clickChip('RSA');
let txt = await visText();
ok('RSA L: QUALIFIERS con datos verificados (Zimbabwe)', txt.includes('QUALIFIERS') && txt.includes('Zimbabwe'));
ok('RSA L: fed verificada (South African Football Association)', txt.includes('South African Football Association'));
await next(); txt = await visText();
ok('RSA R: partidos con fecha (Mexico City Stadium)', txt.includes('Mexico City Stadium'));
ok('RSA R: mlang multilenguaje (Südafrika)', txt.includes('Südafrika'));
await clickChip('NED'); txt = await visText();
ok('NED L: fed verificada (KNVB)', txt.includes('Koninklijke Nederlandse Voetbalbond'));
await next(); txt = await visText();
ok('NED R: mlang multilenguaje (Nederland | Niederlande)', txt.includes('Nederland | Niederlande'));
await clickChip('GER');
txt = await visText();
ok('GER L: QUALIFIERS placeholder (sin datos inventados)', txt.includes('QUALIFIERS') && !txt.includes('Zimbabwe'));
await next(); txt = await visText();
ok('GER R: partidos reales con fecha y estadio (Fv3.3)', txt.includes('Houston Stadium') && txt.includes('Toronto Stadium'));
ok('GER R: bloque GROUP E (.gbadge)', await p.evaluate(() => document.querySelector('[data-current] .gbadge .gt')?.textContent) === 'GROUP E');
const gflags = await p.evaluate(() => [...document.querySelectorAll('[data-current] .gbadge .gtile .gband')].map(t => t.textContent));
ok('GROUP E con 4 tiles tappeables (banda con código)', gflags.length === 4, gflags.join(','));
const jumped = await p.evaluate(() => {
  const other = [...document.querySelectorAll('[data-current] .gbadge .gtile')].find(g => g.querySelector('.gband').textContent !== 'GER');
  if (!other) return null; const code = other.querySelector('.gband').textContent; other.click(); return code;
});
await p.waitForTimeout(80);
ok('tile del grupo salta al pliego de ' + jumped, (await visText()).includes('WE ARE'), 'page=' + await curPage());
await clickChip('MEX'); await next();
txt = await visText();
ok('MEX R pageno: 11 · MEX', txt.includes('11 · MEX'));

const before = await curPage();
await p.click('[data-nav="prev"]'); await p.waitForTimeout(60);
ok('flecha ‹ retrocede', (await curPage()) === before - 1, `${before} -> ${await curPage()}`);
const doSwipe = async (fromX, toX) => {
  await p.evaluate(([x1, x2]) => {
    const el = document.getElementById('app');
    const mk = (type, x) => new TouchEvent(type, { bubbles: true, touches: type==='touchend'?[]:[new Touch({ identifier: 1, target: el, clientX: x, clientY: 500 })], changedTouches: [new Touch({ identifier: 1, target: el, clientX: x, clientY: 500 })] });
    el.dispatchEvent(mk('touchstart', x1));
    el.dispatchEvent(mk('touchend', x2));
  }, [fromX, toX]);
};
const pgBefore = await curPage();
await doSwipe(300, 80); await p.waitForTimeout(80);
ok('swipe izquierda -> hoja siguiente', (await curPage()) === pgBefore + 1, `${pgBefore} -> ${await curPage()}`);
await doSwipe(80, 300); await p.waitForTimeout(400);
ok('swipe derecha -> hoja anterior', (await curPage()) === pgBefore, `en ${await curPage()}`);
await p.waitForTimeout(400); // que expire el flag anti-click del swipe

// estados + persistencia (estado limpio en la nube mock)
mock.state.clear();
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(150);
await clickChip('MEX');
const tState = (k) => p.evaluate((k) => {
  const t = document.querySelector(`[data-tile="${k}"]`);
  return { ds: t.dataset.state, badge: t.querySelector('.badge-rep')?.textContent || '' };
}, k);
const tap = async (k) => { await p.click(`[data-tile="${k}"]`); await p.waitForTimeout(50); };
await tap('MEX-2');
let s = await tState('MEX-2');
ok('tap 1: MEX-2 data-state=tengo', s.ds === 'tengo', JSON.stringify(s));
await tap('MEX-2'); s = await tState('MEX-2');
ok('tap 2: MEX-2 repe1 + badge ×1', s.ds === 'repe1' && s.badge === '×1', JSON.stringify(s));
for (let i=0;i<4;i++) await tap('MEX-2');
s = await tState('MEX-2');
ok('taps hasta repe5 (tope)', s.ds === 'repe5' && s.badge === '×5', JSON.stringify(s));
await p.click('[data-act="plus"][data-k="MEX-2"]'); await p.waitForTimeout(50);
s = await tState('MEX-2');
ok('stepper + en repe5 no pasa (MAX_REPES)', s.ds === 'repe5', JSON.stringify(s));
await p.click('[data-act="minus"][data-k="MEX-2"]'); await p.waitForTimeout(50);
s = await tState('MEX-2');
ok('stepper − baja a repe4', s.ds === 'repe4' && s.badge === '×4', JSON.stringify(s));
await tap('MEX-2'); s = await tState('MEX-2');
ok('tap en repe4 -> repe5', s.ds === 'repe5', JSON.stringify(s));
await tap('MEX-2'); s = await tState('MEX-2');
ok('tap en repe5 -> falta', s.ds === 'falta' && s.badge === '', JSON.stringify(s));
await tap('MEX-1'); s = await tState('MEX-1');
ok('slot 1 (TEAM LOGO) coleccionable -> tengo', s.ds === 'tengo', JSON.stringify(s));
await next();
await tap('MEX-13'); s = await tState('MEX-13');
ok('slot 13 (TEAM PHOTO .crest) coleccionable -> tengo', s.ds === 'tengo', JSON.stringify(s));
await p.click('[data-nav="prev"]'); await p.waitForTimeout(60);
let bar = await barText();
ok('barra: Pegados 2/20 (logo + team photo)', bar.includes('Pegados 2/20'), bar);
ok('barra: 10%', bar.includes('10%'));
ok('barra: REPES 0', bar.includes('REPES 0'), bar);
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(150);
await clickChip('MEX'); await p.waitForTimeout(120);
bar = await barText();
ok('persiste tras recarga (Pegados 2/20)', bar.includes('Pegados 2/20'), bar);
s = await tState('MEX-1');
ok('persiste MEX-1 data-state=tengo tras recarga', s.ds === 'tengo', JSON.stringify(s));
// Fv4.0: el progreso vive en la nube (album_progress) con slot canónico
ok('upsert en nube con slot canónico (MEX-1 pegado)', mock.calls.upserts.some(u => u.slot === 'MEX-1' && u.pegado === true), JSON.stringify(mock.calls.upserts.slice(-3)));
await p.click('[data-reset][data-code="MEX"]'); await p.waitForTimeout(100);
bar = await barText();
const nubeMex = [...mock.state.keys()].filter(k => k.startsWith('MEX-'));
ok('reset ↺: Pegados 0/20 y nube sin filas MEX (DELETE like)', bar.includes('Pegados 0/20') && nubeMex.length === 0, `nube=${nubeMex.length}`);
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(150);
await clickChip('MEX'); await p.waitForTimeout(120);
ok('reset persiste tras recarga', (await barText()).includes('Pegados 0/20'));

// ===== B. Checks visuales Fv3.1 (QA del paquete) =====
txt = await visText();
ok('MEX L: WE ARE + MEXICO (.weare)', txt.includes('WE ARE') && txt.includes('MEXICO'));
ok('MEX L: QUALIFIERS', txt.includes('QUALIFIERS'));
ok('MEX L: pageno 10 · MEX', txt.includes('10 · MEX'));
const mex1 = await p.evaluate(() => {
  const t = document.querySelector('[data-tile="MEX-1"]');
  return { s1: t.classList.contains('s1'), foil: !!t.querySelector('.foil'), lbl: t.querySelector('.pname .lbl')?.textContent };
});
ok('MEX-1: clase s1 + .foil + TEAM LOGO', mex1.s1 && mex1.foil && mex1.lbl === 'TEAMLOGO', JSON.stringify(mex1));
const uses = await p.evaluate(() => {
  const t = document.querySelector('[data-tile="MEX-2"]');
  return [...t.querySelectorAll('svg.g use')].map(u => u.getAttribute('href'));
});
ok('tile: 2 <use> #g2/#g6 (glifo 26)', uses.length === 2 && uses[0] === '#g2' && uses[1] === '#g6', uses.join(','));
const tileBg = await p.evaluate(() => getComputedStyle(document.querySelector('[data-tile="MEX-2"]')).backgroundColor);
ok('tile bg = var(--frame) MEX #779640', tileBg === 'rgb(119, 150, 64)', tileBg);
await next();
const crestRow = await p.evaluate(() => {
  const grid = document.querySelector('[data-current] .crestwrap')?.parentElement;
  if (!grid) return null;
  return { t11: !!grid.querySelector('[data-tile="MEX-11"]'), t12: !!grid.querySelector('[data-tile="MEX-12"]'),
           crest: !!grid.querySelector('.crestwrap .crest .plabel') };
});
ok('MEX R: TEAM PHOTO intercalada en la fila 11-12 (.crestwrap)', !!crestRow && crestRow.t11 && crestRow.t12 && crestRow.crest, JSON.stringify(crestRow));
const fonts = await p.evaluate(() => {
  const l1 = document.querySelector('[data-current] .gbadge .gt') || document.querySelector('.weare .l1');
  return { baloo: l1 ? getComputedStyle(l1).fontFamily : '', barlow: getComputedStyle(document.getElementById('app')).fontFamily };
});
ok('fuente Baloo 2 activa (next/font)', fonts.baloo.includes('Baloo'), fonts.baloo.slice(0,60));
ok('fuente Barlow Semi Condensed activa', fonts.barlow.includes('Barlow'), fonts.barlow.slice(0,60));
const wrapBg = await p.evaluate(() => getComputedStyle(document.getElementById('app')).backgroundColor);
ok('fondo oscuro #191228 en el wrapper', wrapBg === 'rgb(25, 18, 40)', wrapBg);

// ===== capturas para el gate visual =====
await clickChip('MEX'); await p.waitForTimeout(150);
await p.screenshot({ path: `${OUT}/fv31_mex_L.png`, fullPage: true });
await clickChip('ESP'); await next(); await p.waitForTimeout(150);
await p.screenshot({ path: `${OUT}/fv31_esp_R.png`, fullPage: true });
await p.click('[data-goto="0"]'); await p.waitForTimeout(150);
await p.screenshot({ path: `${OUT}/fv31_cover.png`, fullPage: true });

await b.close();
const f = results.filter(r=>r[0]==='FAIL').length;
console.log(`\n${results.length-f}/${results.length} PASS, ${f} FAIL`);
