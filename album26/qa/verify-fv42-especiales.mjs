// Suite Fv4.2 — secciones especiales (00 / FWC-1..19 / CC-1..12) · adición pura.
// REQUIERE server con QA_AUTH_MOCK=1 (mock stateful de fv40).
//   (0) ADICIÓN PURA: snapshot de R de MEX idéntico al baseline (pixel-diff == 0)
//   (1) las 11 vistas nuevas: títulos + counts exactos del dataset
//       1+2+4+2 / 2+2+2+2+3 / 6+6 = 32; #chips sigue con 48 equipos
//   (2) tap en slot especial → upsert con la clave canónica (spy)
//   (3) panel: K/992, ESPECIALES X/32, repes de especiales listadas con su código
//   (4) chips nuevos FWC/HIST/CC navegan a su sección
// NOTA: el baseline de MEX-R está pineado al Chromium del sandbox (flags por
// fixture → render determinista); la validación real la hace el gate de San.
// Uso:  QA_URL=http://localhost:3000 node qa/verify-fv42-especiales.mjs
import { chromium } from 'playwright-core';
import { readFileSync } from 'fs';
import { mockAuth } from './_mock-auth.mjs';
const EXE = process.env.QA_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = process.env.QA_URL || 'http://localhost:3000/';
const BASE = 'qa/screenshots/fv42/mexR_baseline.png';
const results = [];
const ok = (n, c, x='') => { results.push([c?'PASS':'FAIL', n, x]); console.log((c?'PASS':'FAIL')+'  '+n+(x?'  ['+x+']':'')); if(!c) process.exitCode=1; };

const b = await chromium.launch({ executablePath: EXE });

const flagFixture = async (ctx) => {
  const fx = await ctx.newPage();
  const du = await fx.evaluate(() => { const c=document.createElement('canvas'); c.width=640;c.height=427; const g=c.getContext('2d'); g.fillStyle='#1b3f8f'; g.fillRect(0,0,640,427); g.fillStyle='#fff'; g.fillRect(0,160,640,107); return c.toDataURL('image/png'); });
  await fx.close();
  await ctx.route('**/storage/v1/object/public/flags/**', r => r.fulfill({ contentType: 'image/png', body: Buffer.from(du.split(',')[1],'base64') }));
};
const goSec = async (p, label) => { await p.evaluate((l) => { [...document.querySelectorAll('#nav button')].find(x => x.textContent === l)?.click(); }, label); await p.waitForTimeout(450); };
const next = async (p) => { await p.evaluate(() => document.querySelector('[data-nav="next"]').click()); await p.waitForTimeout(700); };
const curView = (p) => p.evaluate(() => {
  const root = document.querySelector('[data-current] .face.front') || document.querySelector('[data-current] .spage.solo');
  const t = (s) => root.querySelector(s)?.textContent || '';
  return {
    sectitle: t('.esp-sectitle'), title: t('.esp-title'),
    tiles: root.querySelectorAll('.esp-tile').length,
    codes: [...root.querySelectorAll('.esp-tile')].map(e => e.dataset.tile),
  };
});

// ============ (0) ADICIÓN PURA: MEX-R idéntico al baseline ============
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  await mockAuth(ctx, URL);
  await flagFixture(ctx);
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  await p.evaluate(() => { [...document.querySelectorAll('#chips button')].find(x => x.textContent === 'MEX')?.click(); });
  await p.waitForTimeout(500);
  const shot = await (await p.$('[data-current] .spage.r')).screenshot();
  const baseB64 = readFileSync(BASE).toString('base64');
  const diff = await p.evaluate(async ([a, c]) => {
    const load = (b64) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + b64; });
    const [ia, ic] = await Promise.all([load(a), load(c)]);
    if (ia.width !== ic.width || ia.height !== ic.height) return -1;
    const cv = (img) => { const x = document.createElement('canvas'); x.width = img.width; x.height = img.height; const g = x.getContext('2d'); g.drawImage(img, 0, 0); return g.getImageData(0, 0, img.width, img.height).data; };
    const da = cv(ia), dc = cv(ic); let d = 0;
    for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i]-dc[i]) > 1 || Math.abs(da[i+1]-dc[i+1]) > 1 || Math.abs(da[i+2]-dc[i+2]) > 1) d++;
    return d;
  }, [baseB64, shot.toString('base64')]);
  ok('(0) ADICIÓN PURA: R de MEX idéntico al baseline (0 px de diff)', diff === 0, `diffpx=${diff}`);
  await ctx.close();
}

// ============ (1) + (2) + (4): vistas nuevas, counts, tap, chips ============
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' });
  const { calls } = await mockAuth(ctx, URL);
  await flagFixture(ctx);
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);

  // #chips sigue con 48 equipos (los chips de sección van fuera)
  ok('(1) #chips conserva 48 chips de equipo', await p.evaluate(() => document.querySelectorAll('#chips button').length) === 48);
  ok('(4) chips de sección FWC/HIST/CC presentes', await p.evaluate(() =>
    ['FWC','HIST','CC'].every(l => [...document.querySelectorAll('#nav .chip-sec')].some(x => x.textContent === l))));

  // APERTURA (FWC → 4 vistas)
  await goSec(p, 'FWC');
  let v = await curView(p);
  ok('(1) apertura 1 — ROLL OF HONOUR, 1 slot (00)', v.title.includes('ROLL OF HONOUR') && v.tiles === 1 && v.codes.join() === '00', JSON.stringify(v));
  await next(p); v = await curView(p);
  ok('(1) apertura 2 — WELCOME, 2 slots', v.title.includes('WELCOME') && v.tiles === 2 && v.codes.join() === 'FWC-1,FWC-2', JSON.stringify(v));
  await next(p); v = await curView(p);
  ok('(1) apertura 3 — CANADA, 4 slots', v.title.includes('CANADA') && v.tiles === 4 && v.codes.join() === 'FWC-3,FWC-4,FWC-5,FWC-6', JSON.stringify(v));
  const cities = await p.evaluate(() => [...document.querySelectorAll('[data-current] .esp-city')].map(c => c.textContent));
  ok('(1) apertura 3 — ciudades del dataset (Toronto/Vancouver + estadio)', cities.length === 2 && cities[0].includes('TORONTO') && cities[0].includes('45.736'), JSON.stringify(cities));
  await next(p); v = await curView(p);
  ok('(1) apertura 4 — MEXICO / USA, 2 slots', v.title.includes('MEXICO / USA') && v.tiles === 2 && v.codes.join() === 'FWC-7,FWC-8', JSON.stringify(v));

  // (2) tap en el slot "00" (roll of honour): vuelvo a FWC
  await goSec(p, 'FWC');
  await p.evaluate(() => document.querySelector('[data-tile="00"]').click());
  await p.waitForTimeout(400);
  const up00 = calls.upserts.find(u => u.slot === '00');
  ok('(2) tap slot 00 → upsert clave canónica "00" con user_id', !!up00 && up00.pegado === true && typeof up00.user_id === 'string', JSON.stringify(up00));

  // HISTORY (HIST → 5 vistas)
  await goSec(p, 'HIST');
  v = await curView(p);
  ok('(1) history 1 — "FIFA WORLD CUP HISTORY", 2 slots (FWC-9,10)', v.sectitle === 'FIFA WORLD CUP HISTORY' && v.tiles === 2 && v.codes.join() === 'FWC-9,FWC-10', JSON.stringify(v));
  const fin1 = await p.evaluate(() => [...document.querySelectorAll('[data-current] .esp-final .fed')].map(f => f.textContent));
  ok('(1) history 1 — finales del dataset (URUGUAY 1930, FRANCE 1938)', fin1.join() === 'URUGUAY 1930,FRANCE 1938', JSON.stringify(fin1));
  const histCounts = [2];
  for (let i = 0; i < 4; i++) { await next(p); v = await curView(p); histCounts.push(v.tiles); }
  ok('(1) history 2..5 counts 2,2,2,3 (total FWC-9..19 = 11)', histCounts.join() === '2,2,2,2,3', histCounts.join());
  ok('(1) history 5 — RECORDS con 3 textos', await p.evaluate(() => document.querySelectorAll('[data-current] .esp-records div').length) === 3);

  // COCA-COLA (CC → 2 vistas)
  await goSec(p, 'CC');
  v = await curView(p);
  ok('(1) cocacola 1 — título sección + 6 slots (CC-1..6)', v.sectitle.includes('COCA-COLA') && v.tiles === 6 && v.codes.join() === 'CC-1,CC-2,CC-3,CC-4,CC-5,CC-6', JSON.stringify(v));
  const yamal = await p.evaluate(() => document.querySelector('[data-current] [data-tile="CC-1"] .pname')?.textContent || '');
  ok('(1) cocacola — nombre y país del dataset (LAMINE YAMAL · ESP)', yamal.includes('LAMINE YAMAL') && yamal.includes('ESP'), yamal);
  await next(p); v = await curView(p);
  ok('(1) cocacola 2 — 6 slots (CC-7..12)', v.tiles === 6 && v.codes.join() === 'CC-7,CC-8,CC-9,CC-10,CC-11,CC-12', JSON.stringify(v));

  // (2) tap en CC-1
  await goSec(p, 'CC');
  await p.evaluate(() => document.querySelector('[data-tile="CC-1"]').click());
  await p.waitForTimeout(400);
  const upCC = calls.upserts.find(u => u.slot === 'CC-1');
  ok('(2) tap slot CC-1 → upsert clave canónica "CC-1"', !!upCC && upCC.pegado === true, JSON.stringify(upCC));
  await ctx.close();
}

// ============ (3) panel: K/992, ESPECIALES X/32, repes de especiales ============
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' });
  await mockAuth(ctx, URL, { rows: [
    { slot: '00', pegado: true, repes: 0 }, { slot: 'FWC-3', pegado: true, repes: 2 },
    { slot: 'CC-1', pegado: true, repes: 3 }, { slot: 'MEX-2', pegado: true, repes: 0 },
  ] }); // 4 pegados (3 especiales + 1 equipo), 5 repes en 2 especiales
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  await p.evaluate(() => { [...document.querySelectorAll('.demo-bar button')].find(x => x.textContent.includes('MI COLECCIÓN'))?.click(); });
  await p.waitForTimeout(400);
  const stats = await p.evaluate(() => document.querySelector('.cp-stats')?.textContent || '');
  ok('(3) panel cabecera K/992 (4/992)', stats.includes('4/992'), stats);
  const esp = await p.evaluate(() => {
    const el = document.querySelector('.cp-esp');
    return el ? { count: el.querySelector('.ce-count')?.textContent, teamCards: document.querySelectorAll('.cp-team').length } : null;
  });
  ok('(3) fila ESPECIALES X/32 (3/32) y 48 equipos intactos', !!esp && esp.count === '3/32' && esp.teamCards === 48, JSON.stringify(esp));
  // repes: pestaña repes
  await p.evaluate(() => { [...document.querySelectorAll('[data-panel-tab]')].find(x => x.dataset.panelTab === 'repes')?.click(); });
  await p.waitForTimeout(400);
  const rep = await p.evaluate(() => ({
    heads: [...document.querySelectorAll('.rg-head')].map(r => r.textContent),
    rows: [...document.querySelectorAll('.rg-row')].map(r => r.textContent),
  }));
  ok('(3) repes de especiales agrupadas bajo "ESPECIALES"', rep.heads.includes('ESPECIALES'), JSON.stringify(rep.heads));
  ok('(3) repe con código+nombre (CC-1 · LAMINE YAMAL · x3) y sin nombre (FWC-3 · x2)',
    rep.rows.some(r => r.includes('CC-1') && r.includes('LAMINE YAMAL') && r.includes('x3')) &&
    rep.rows.some(r => r === 'FWC-3 · x2'), JSON.stringify(rep.rows));
  await ctx.close();
}

await b.close();
const f = results.filter(r => r[0] === 'FAIL').length;
console.log(`\n${results.length - f}/${results.length} PASS, ${f} FAIL`);
