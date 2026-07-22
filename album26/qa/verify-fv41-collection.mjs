// Suite Fv4.1 — Panel "Mi colección": progreso global + lista de repes con copia.
// REQUIERE server con QA_AUTH_MOCK=1 (mock stateful de fv40, sin red a supabase.co).
//   (1) totales desde el estado hidratado: K/960, % y repes; X/20 por equipo
//   (2) pestaña REPES: exactamente los slots con repes>0, nombre de album-data, xN
//   (3) COPIAR LISTA -> portapapeles con formato estable (snapshot)
//   (4) tap en equipo -> cierra el panel y navega a su página
//   (5) ciclo de vida: montado SOLO al abrir, desmontado al cerrar; presupuesto
//       de capas móvil (qa:ios: <=60/<=60MB) también con el panel ABIERTO
//   (6) acceso "REPES (N)" directo a la pestaña, atenuado si N=0 + estado vacío
// Uso:  QA_URL=http://localhost:3000 node qa/verify-fv41-collection.mjs
import { chromium } from 'playwright-core';
import { mockAuth } from './_mock-auth.mjs';
const EXE = process.env.QA_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = process.env.QA_URL || 'http://localhost:3000/';
const results = [];
const ok = (n, c, x='') => { results.push([c?'PASS':'FAIL', n, x]); console.log((c?'PASS':'FAIL')+'  '+n+(x?'  ['+x+']':'')); if(!c) process.exitCode=1; };

const ROWS = [
  { slot: 'MEX-2', pegado: true, repes: 3 },   // LUIS MALAGÓN
  { slot: 'MEX-3', pegado: true, repes: 0 },
  { slot: 'MEX-11', pegado: true, repes: 2 },  // ORBELIN PINEDA
  { slot: 'RSA-15', pegado: true, repes: 1 },  // YAYA SITHOLE
  { slot: 'HAI-1', pegado: true, repes: 1 },   // TEAM LOGO (slot especial)
  { slot: 'CZE-5', pegado: true, repes: 0 },
]; // 6 pegados · 7 repes en 4 cromos
const SNAPSHOT = 'Mis repes (7):\n'
  + 'MEX-2 · LUIS MALAGÓN · x3\n'
  + 'MEX-11 · ORBELIN PINEDA · x2\n'
  + 'RSA-15 · YAYA SITHOLE · x1\n'
  + 'HAI-1 · TEAM LOGO · x1';

const b = await chromium.launch({ executablePath: EXE });

// ============ contexto principal (móvil, con datos) ============
{
  const ctx = await b.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true,
    serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'],
  });
  await mockAuth(ctx, URL, { rows: ROWS });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  let layers = [];
  cdp.on('LayerTree.layerTreeDidChange', (e) => { if (e.layers) layers = e.layers; });
  await cdp.send('LayerTree.enable');
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);

  // (5) lazy: sin abrir, el panel NO está montado
  ok('(5) panel NO montado antes de abrir', await p.evaluate(() => !document.querySelector('#cpanel')));

  // acceso 1: MI COLECCIÓN
  await p.evaluate(() => { [...document.querySelectorAll('.demo-bar button')].find(x => x.textContent.includes('MI COLECCIÓN'))?.click(); });
  await p.waitForTimeout(400);
  ok('acceso: MI COLECCIÓN abre el panel (pestaña progreso)', await p.evaluate(() =>
    !!document.querySelector('#cpanel') && document.querySelector('.cp-tabs button.on')?.dataset.panelTab === 'progreso'));

  // (1) totales globales y por equipo
  const stats = await p.evaluate(() => document.querySelector('.cp-stats')?.textContent || '');
  // Fv4.2: el total del álbum pasó de 960 a 992 (25→32 slots especiales añadidos)
  ok('(1) cabecera: 6/992 pegados y 7 repes', stats.includes('6/992') && stats.includes('7') && stats.includes('repes'), stats);
  const teams = await p.evaluate(() => {
    const get = (c) => {
      const el = [...document.querySelectorAll('.cp-team')].find(t => t.querySelector('.ct-code').textContent === c);
      return el ? { count: el.querySelector('.ct-count').textContent, bar: el.querySelector('.ct-bar i').style.width } : null;
    };
    return { mex: get('MEX'), rsa: get('RSA'), kor: get('KOR'), n: document.querySelectorAll('.cp-team').length };
  });
  ok('(1) grid de 48 equipos', teams.n === 48, String(teams.n));
  ok('(1) MEX 3/20 con microbarra 15%', teams.mex?.count === '3/20' && teams.mex?.bar === '15%', JSON.stringify(teams.mex));
  ok('(1) RSA 1/20 · KOR 0/20', teams.rsa?.count === '1/20' && teams.kor?.count === '0/20', JSON.stringify([teams.rsa, teams.kor]));

  // (2) pestaña REPES por tab interna
  await p.evaluate(() => { [...document.querySelectorAll('[data-panel-tab]')].find(x => x.dataset.panelTab === 'repes')?.click(); });
  await p.waitForTimeout(400);
  const rep = await p.evaluate(() => ({
    stats: document.querySelector('.cp-stats')?.textContent || '',
    rows: [...document.querySelectorAll('.rg-row')].map(r => r.textContent),
    heads: [...document.querySelectorAll('.rg-head')].map(r => r.textContent),
  }));
  ok('(2) contador: 7 repes en 4 cromos', rep.stats.includes('7') && rep.stats.includes('4'), rep.stats);
  ok('(2) exactamente los 4 slots con repes>0', rep.rows.length === 4, JSON.stringify(rep.rows));
  ok('(2) nombres desde album-data y xN', rep.rows[0] === 'MEX-2 · LUIS MALAGÓN · x3' && rep.rows[1] === 'MEX-11 · ORBELIN PINEDA · x2'
    && rep.rows[2] === 'RSA-15 · YAYA SITHOLE · x1' && rep.rows[3] === 'HAI-1 · TEAM LOGO · x1', JSON.stringify(rep.rows));
  ok('(2) agrupado por equipo (MEXICO/SOUTH AFRICA/HAITI)', rep.heads.join(',') === 'MEXICO,SOUTH AFRICA,HAITI', rep.heads.join(','));

  // (3) copiar lista -> portapapeles (snapshot estable)
  await p.evaluate(() => document.querySelector('[data-copy-repes]').click());
  await p.waitForTimeout(400);
  const clip = await p.evaluate(() => navigator.clipboard.readText());
  ok('(3) COPIAR LISTA: snapshot exacto en el portapapeles', clip === SNAPSHOT, JSON.stringify(clip));
  const toastTxt = await p.evaluate(() => document.querySelector('#ab-toast')?.textContent || '');
  ok('(3) confirmación visible (toast)', toastTxt.includes('copiada'), toastTxt);

  // (5) presupuesto de capas móvil CON el panel abierto (dentro de qa:ios)
  await p.waitForTimeout(600);
  const withBacking = layers.filter(l => l.width > 0 && l.height > 0);
  const mb = withBacking.reduce((a, l) => a + l.width * l.height * 4, 0) / 1048576;
  ok('(5) capas con backing <= 60 con panel abierto', withBacking.length > 0 && withBacking.length <= 60, `capas=${withBacking.length}`);
  ok('(5) memoria backing <= 60 MB con panel abierto', mb <= 60, `${mb.toFixed(0)} MB @3x`);

  // (4) navegación: volver a progreso y tap en CZE
  await p.evaluate(() => { [...document.querySelectorAll('[data-panel-tab]')].find(x => x.dataset.panelTab === 'progreso')?.click(); });
  await p.waitForTimeout(300);
  await p.evaluate(() => { [...document.querySelectorAll('.cp-team')].find(t => t.querySelector('.ct-code').textContent === 'CZE')?.click(); });
  await p.waitForTimeout(500);
  const nav = await p.evaluate(() => ({
    panel: !!document.querySelector('#cpanel'),
    txt: document.querySelector('[data-current] .face.front')?.innerText || '',
  }));
  ok('(4) tap en equipo: cierra el panel', !nav.panel);
  ok('(4) tap en equipo: navega a la página de CZE', nav.txt.includes('WE ARE') && nav.txt.includes('CZECHIA'), nav.txt.slice(0, 40));

  // (5) ciclo de vida: abrir y cerrar con ✕ y con el fondo
  await p.evaluate(() => { [...document.querySelectorAll('.demo-bar button')].find(x => x.textContent.includes('MI COLECCIÓN'))?.click(); });
  await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('.cp-x').click());
  await p.waitForTimeout(300);
  ok('(5) cerrar con ✕: panel desmontado (querySelector null)', await p.evaluate(() => !document.querySelector('#cpanel')));
  await p.evaluate(() => { [...document.querySelectorAll('.demo-bar button')].find(x => x.textContent.includes('MI COLECCIÓN'))?.click(); });
  await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('.cp-back').click());
  await p.waitForTimeout(300);
  ok('(5) cerrar con el fondo: panel desmontado', await p.evaluate(() => !document.querySelector('#cpanel')));

  // (6) acceso directo REPES (N) con contador vivo
  const repBtn = await p.evaluate(() => {
    const btn = [...document.querySelectorAll('.demo-bar button')].find(x => x.textContent.startsWith('REPES'));
    return { txt: btn?.textContent, dim: btn?.classList.contains('dim') };
  });
  ok('(6) botón REPES (7) con contador y sin atenuar', repBtn.txt === 'REPES (7)' && repBtn.dim === false, JSON.stringify(repBtn));
  await p.evaluate(() => { [...document.querySelectorAll('.demo-bar button')].find(x => x.textContent.startsWith('REPES'))?.click(); });
  await p.waitForTimeout(400);
  ok('(6) REPES (N) abre directamente la pestaña de repes', await p.evaluate(() =>
    document.querySelector('.cp-tabs button.on')?.dataset.panelTab === 'repes'));
  await ctx.close();
}

// ============ contexto sin repes: botón atenuado + estado vacío ============
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' });
  await mockAuth(ctx, URL, { rows: [{ slot: 'MEX-2', pegado: true, repes: 0 }] });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.waitForTimeout(600);
  const dim = await p.evaluate(() => {
    const btn = [...document.querySelectorAll('.demo-bar button')].find(x => x.textContent.startsWith('REPES'));
    return { txt: btn?.textContent, dim: btn?.classList.contains('dim') };
  });
  ok('(6) sin repes: botón REPES (0) atenuado', dim.txt === 'REPES (0)' && dim.dim === true, JSON.stringify(dim));
  await p.evaluate(() => { [...document.querySelectorAll('.demo-bar button')].find(x => x.textContent.startsWith('REPES'))?.click(); });
  await p.waitForTimeout(400);
  const empty = await p.evaluate(() => document.querySelector('.cp-empty')?.textContent || '');
  ok('(6) estado vacío digno: "Sin repes todavía"', empty === 'Sin repes todavía', empty);
  await ctx.close();
}

await b.close();
const f = results.filter(r => r[0] === 'FAIL').length;
console.log(`\n${results.length - f}/${results.length} PASS, ${f} FAIL`);
