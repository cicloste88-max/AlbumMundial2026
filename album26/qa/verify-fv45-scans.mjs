// Suite Fv4.5 — Historial ESCANEADOS con huella en BBDD (public.album_scans,
// RLS owner-only) + cruce en bloques con titular claro. REQUIERE server con
// QA_AUTH_MOCK=1. Nace de la petición de San tras el gate físico de Fv4.4:
// "que el escaneo se inventaríe para poder consultarlo tras una salida
// accidental de la app, un bloqueo de pantalla o cualquier imprevisto".
//   (1) al escanear (subir imagen) → UPSERT en album_scans con el payload
//       CRUDO del QR + resumen n_doy/n_da, y el espejo local queda idéntico
//   (2) huella: contexto NUEVO (localStorage vacío, como tras reinstalar o en
//       otro dispositivo) con la nube sembrada → al abrir COMPARTIR el
//       historial se hidrata desde BBDD y el tap recalcula el cruce contra la
//       colección ACTUAL (bloques Fv4.5: TE PUEDE DAR primero, con subtítulos)
//   (3) el ✕ borra también en nube (DELETE por alias) y no vuelve tras recargar
//   (4) nube caída (500; con 503 supabase-js reintenta ~7s): la hoja NO rompe —
//       el historial sale del espejo local y la hidratación deja traza en
//       window.__scanDiag
//   (5) sanado: una entrada solo-local (escaneo hecho sin conexión) se SUBE a
//       la nube en la siguiente hidratación
// Uso:  QA_URL=http://localhost:3000 node qa/verify-fv45-scans.mjs
import { chromium } from 'playwright-core';
import QRCode from 'qrcode'; // dependencia de la app: renderiza el QR del "amigo"
import { mockAuth, QA_USER } from './_mock-auth.mjs';
const EXE = process.env.QA_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = process.env.QA_URL || 'http://localhost:3000/';
const results = [];
const ok = (n, c, x='') => { results.push([c?'PASS':'FAIL', n, x]); console.log((c?'PASS':'FAIL')+'  '+n+(x?'  ['+x+']':'')); if(!c) process.exitCode=1; };

const b = await chromium.launch({ executablePath: EXE });

const openShare = async (p) => {
  await p.evaluate(() => { [...document.querySelectorAll('.demo-bar button')].find(x => x.textContent.includes('MI COLECCIÓN'))?.click(); });
  await p.waitForTimeout(300);
  await p.evaluate(() => { [...document.querySelectorAll('[data-panel-tab]')].find(x => x.dataset.panelTab === 'compartir')?.click(); });
  await p.waitForTimeout(900); // lazy share/qrcode + hidratación del historial
};
const histEval = () => ({
  head: document.querySelector('#sh-hist .rg-head')?.textContent || '(sin historial)',
  who: [...document.querySelectorAll('.sh-scanrow .sh-who')].map(x => x.textContent),
  nums: [...document.querySelectorAll('.sh-scanrow .sh-nums')].map(x => x.textContent),
  mirror: JSON.parse(localStorage.getItem('album26_scans') || '[]'),
});

// ========= contexto A: escanear deja huella (upsert en album_scans) =========
let amigoPayload = null; // QR nativo del "amigo" (para B/C/D)
let amigoRow = null;     // fila tal cual quedó en la nube mock
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' });
  // mi estado: MEX-5 repe x1, todo lo demás me falta
  const mock = await mockAuth(ctx, BASE, { rows: [{ slot: 'MEX-5', pegado: true, repes: 1 }] });
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  await openShare(p);
  // el amigo: MEX-2 repe x2 y le falta todo lo demás (incl. mi MEX-5)
  amigoPayload = await p.evaluate(async () =>
    await window.__share.encodeNative('AmigoQA', { MEX: { 'MEX-2': { state: 'repe', repes: 2 } } }));
  const png = await QRCode.toBuffer(amigoPayload, { errorCorrectionLevel: 'M', margin: 4, width: 780 });
  await p.setInputFiles('#share-file', { name: 'amigo.png', mimeType: 'image/png', buffer: png });
  await p.waitForTimeout(1400); // leer + cruce + upsert en nube (background)
  const up = mock.calls.scanUpserts.find((r) => r.alias === 'AmigoQA');
  ok('(1) el escaneo hace UPSERT en album_scans (payload crudo + resumen + user_id)',
    !!up && up.data === amigoPayload && up.n_doy === 1 && up.n_da === 1
    && up.fmt === 'a26' && up.user_id === QA_USER.id && !!Date.parse(up.ts), JSON.stringify(mock.calls.scanUpserts.map(r => r.alias)));
  const h1 = await p.evaluate(histEval);
  ok('(1) historial en pantalla y espejo local idéntico a la nube',
    h1.head === 'ESCANEADOS (1)' && h1.who[0]?.includes('AmigoQA')
    && h1.mirror.length === 1 && h1.mirror[0].alias === 'AmigoQA' && h1.mirror[0].data === amigoPayload, JSON.stringify(h1.who));
  amigoRow = mock.scans.get('AmigoQA');
  await ctx.close();
}

// ==== contexto B: salida accidental / otro dispositivo — la huella vuelve ====
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' });
  // localStorage VACÍO (contexto nuevo); la nube trae la fila del contexto A
  const mock = await mockAuth(ctx, BASE, { rows: [{ slot: 'MEX-5', pegado: true, repes: 1 }], scanRows: [amigoRow] });
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  await openShare(p);
  const h2 = await p.evaluate(histEval);
  ok('(2) huella: historial hidratado desde BBDD con localStorage vacío',
    h2.head === 'ESCANEADOS (1)' && h2.who[0]?.includes('AmigoQA') && h2.nums[0] === 'das 1 · te da 1'
    && h2.mirror.length === 1, JSON.stringify(h2));
  // el tap recalcula el cruce contra la colección ACTUAL, en bloques Fv4.5
  await p.evaluate(() => { document.querySelector('[data-scan-open]')?.click(); });
  await p.waitForTimeout(900);
  const cru = await p.evaluate(() => {
    const box = document.getElementById('sh-cruce');
    if (!box) return null;
    const blk = (sel) => ({
      n: box.querySelector(sel + ' .sh-bn')?.textContent || '',
      sub: box.querySelector(sel + ' .sh-bsub')?.textContent || '',
      rows: [...box.querySelectorAll(sel + ' .rg-row')].map(x => x.textContent),
    });
    return { orden: [...box.querySelectorAll('.sh-bt')].map(x => x.textContent), da: blk('.sh-block.da'), doy: blk('.sh-block.doy') };
  });
  ok('(2) tap → cruce recalculado: TE PUEDE DAR primero, subtítulos y listas exactas',
    !!cru && cru.orden.join('|') === 'TE PUEDE DAR|LE PUEDES DAR'
    && cru.da.n === '1' && cru.da.rows.join() === 'MEX: 2 (x2)' && cru.da.sub === 'Sus repes que a ti te faltan'
    && cru.doy.n === '1' && cru.doy.rows.join() === 'MEX: 5' && cru.doy.sub === 'Tus repes que le faltan', JSON.stringify(cru));
  // (3) el ✕ borra también en nube y el borrado sobrevive a la recarga
  await p.evaluate(() => { document.querySelector('[data-scan-del]')?.click(); });
  await p.waitForTimeout(600);
  ok('(3) ✕ → DELETE en album_scans (por alias) y nube vacía',
    mock.calls.scanDeletes.flat().includes('AmigoQA') && mock.scans.size === 0, JSON.stringify(mock.calls.scanDeletes));
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  await openShare(p);
  const h3 = await p.evaluate(histEval);
  ok('(3) tras recargar no reaparece (nube y espejo vacíos)',
    h3.head === '(sin historial)' && h3.mirror.length === 0, JSON.stringify(h3));
  await ctx.close();
}

// ============ contexto C: nube caída — el espejo local sostiene la hoja ============
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' });
  await mockAuth(ctx, BASE, { rows: [], failScans: true });
  const seed = [{ ts: Date.now() - 60000, fmt: 'a26', alias: 'OfflineQA', data: amigoPayload, nDoy: 1, nDa: 1 }];
  await ctx.addInitScript((s) => { localStorage.setItem('album26_scans', JSON.stringify(s)); }, seed);
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  await openShare(p);
  const h4 = await p.evaluate(histEval);
  const dg = await p.evaluate(() => (window.__scanDiag || []).join(' | '));
  ok('(4) nube caída (500): el historial sale del espejo local sin romper la hoja',
    h4.head === 'ESCANEADOS (1)' && h4.who[0]?.includes('OfflineQA'), JSON.stringify(h4.who));
  ok('(4) la hidratación fallida deja traza en __scanDiag',
    dg.includes('scans: hidratación KO'), JSON.stringify(dg.slice(-120)));
  await ctx.close();
}

// ===== contexto D: sanado — lo escaneado sin conexión SUBE al hidratar =====
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' });
  const mock = await mockAuth(ctx, BASE, { rows: [] }); // nube viva pero VACÍA
  const seed = [{ ts: Date.now() - 60000, fmt: 'a26', alias: 'OfflineQA', data: amigoPayload, nDoy: 1, nDa: 1 }];
  await ctx.addInitScript((s) => { localStorage.setItem('album26_scans', JSON.stringify(s)); }, seed);
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  await openShare(p);
  const h5 = await p.evaluate(histEval);
  ok('(5) sanado: la entrada solo-local se SUBE a album_scans al hidratar',
    mock.scans.has('OfflineQA') && mock.calls.scanUpserts.some((r) => r.alias === 'OfflineQA' && r.data === amigoPayload)
    && h5.head === 'ESCANEADOS (1)', JSON.stringify([...mock.scans.keys()]));
  await ctx.close();
}

await b.close();
const fails = results.filter(r => r[0] === 'FAIL').length;
console.log(`\n${results.length - fails}/${results.length} PASS` + (fails ? ` · ${fails} FAIL` : ''));
