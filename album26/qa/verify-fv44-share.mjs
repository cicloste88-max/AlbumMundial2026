// Suite Fv4.4 — Compartir colección: QR nativo + interop con la app "Figuritas"
// (formato "UsaMexCan26-QR" de su spec, alias interno UMC) + share texto.
// REQUIERE server con QA_AUTH_MOCK=1. Spec: build_handoff k='qr-interop-spec'
// (md5 f433860dd0a80a1333313c8a1b6f7b55) — anclas y payload de ejemplo de ahí.
//   (1) round-trip nativo encode->decode = identidad
//   (2) anclas Figuritas/UMC: SOLO faltan 00, MEX-1, MEX-14, MEX-20, RSA-4
//       -> bits exactos en 0, 20, 33, 39, 43 (y solo esos entre 0..991)
//   (3) decode del payload real de ejemplo -> el bitmap trae 902 bits (2 en
//       padding 992..999): decode útil = 900 faltantes en 0..991 + 22 repes
//       cuyas posiciones exactas fijan el bit-order LSB-first como snapshot.
//       NOTA: la "verificacion_ejemplo" de la spec ("sin 00/MEX/RSA") no casa
//       con su propio payload (bytes 0..11 = 0xff => posiciones 0..95 faltan);
//       reportado en fv44-status. El formato en si es coherente y esta anclado.
//   (4) cruce con dos estados mock -> listas exactas en ambas direcciones
//       (e2e real: QR propio capturado como PNG y subido en otro contexto)
//   (5) textos share: snapshot byte-exacto; navigator.share mockeado
//   (6) /s pública sin sesión; lazy-load; presupuesto iOS con la hoja abierta
//   (7) Fv4.4.2, caso real del gate: screenshot VERTICAL 1080×2340 de la app
//       Figuritas (QR con logo central, recodificado JPEG) subido por
//       "Subir imagen QR" → cruce con repes ajenas a x1. El downscale único a
//       1200 dejaba este caso ilegible; el lector ahora es multi-escala y usa
//       BarcodeDetector nativo cuando existe (aquí no: valida el fallback jsQR)
//   (8) robustez del lector: QR denso (~v30) + logo + JPEG en screenshot
//       vertical → readQRMultiScale lo lee (con una sola escala fallaba)
//   (9) Fv4.4.3, historial ESCANEADOS: cada escaneo se guarda en el dispositivo
//       (localStorage album26_scans, cap 20, upsert por alias); persiste tras
//       recargar, el tap recalcula el cruce contra la colección ACTUAL y el ✕
//       borra. Nace del gate físico: "¿dónde consulto lo escaneado?"
// Uso:  QA_URL=http://localhost:3000 node qa/verify-fv44-share.mjs
import { chromium } from 'playwright-core';
import QRCode from 'qrcode'; // dependencia de la app: genera el fixture denso (7b)
import { mockAuth } from './_mock-auth.mjs';
const EXE = process.env.QA_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = process.env.QA_URL || 'http://localhost:3000/';
const results = [];
const ok = (n, c, x='') => { results.push([c?'PASS':'FAIL', n, x]); console.log((c?'PASS':'FAIL')+'  '+n+(x?'  ['+x+']':'')); if(!c) process.exitCode=1; };

// payload real de ejemplo de la spec (sin el prefijo binario)
const EJEMPLO = 'H4sIAAAAAAAAE/v/HwHi1ZuFVX+CWOtznZDE/8tLSP7HCuTjz2CXAIP9FzxcJ006uAuXPDMANLXjEX0AAAA=;H4sIAAAAAAAAE2NgQIAGAR4oy4HBgAFZIqGBAStwwC4MA2wGRiwMAiw45QHOLeyLfQAAAA==';

const b = await chromium.launch({ executablePath: EXE });

const openShare = async (p) => {
  await p.evaluate(() => { [...document.querySelectorAll('.demo-bar button')].find(x => x.textContent.includes('MI COLECCIÓN'))?.click(); });
  await p.waitForTimeout(300);
  await p.evaluate(() => { [...document.querySelectorAll('[data-panel-tab]')].find(x => x.dataset.panelTab === 'compartir')?.click(); });
  await p.waitForTimeout(900); // carga lazy de share/qrcode + primer render del QR
};

// ============ contexto A: funciones puras + QR propio + textos ============
let qrPngA = null; // PNG del QR nativo del estado A (para el e2e de subida en B)
let qrUmcA = null; // PNG del QR Figuritas/UMC del estado A (para el mockup (7))
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, serviceWorkers: 'block' });
  // estado A: tiene MEX-2 (repe x2); todo lo demás le falta
  await mockAuth(ctx, URL, { rows: [{ slot: 'MEX-2', pegado: true, repes: 2 }] });
  await ctx.addInitScript(() => {
    navigator.share = (d) => { (window.__shared = window.__shared || []).push(d); return Promise.resolve(); };
  });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  let layers = [];
  cdp.on('LayerTree.layerTreeDidChange', (e) => { if (e.layers) layers = e.layers; });
  await cdp.send('LayerTree.enable');
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);

  // (6) lazy: el módulo de compartir NO carga hasta abrir la hoja
  ok('(6) lazy: __share indefinido antes de abrir Compartir', await p.evaluate(() => typeof window.__share === 'undefined'));
  await openShare(p);
  ok('(6) al abrir: módulo cargado y pestaña activa', await p.evaluate(() =>
    typeof window.__share === 'object' && document.querySelector('.cp-tabs button.on')?.dataset.panelTab === 'compartir'));

  // sanity del orden canónico (anclas de la spec)
  const canon = await p.evaluate(() => {
    const s = window.__share;
    return { len: s.CANON.length, a0: s.CANON[0], a20: s.CANON[20], a33: s.CANON[33], a39: s.CANON[39], a43: s.CANON[43], a980: s.CANON[980], a991: s.CANON[991] };
  });
  ok('CANON: 992 posiciones y anclas exactas de la spec', canon.len === 992 && canon.a0 === '00' && canon.a20 === 'MEX-1'
    && canon.a33 === 'MEX-14' && canon.a39 === 'MEX-20' && canon.a43 === 'RSA-4' && canon.a980 === 'CC-1' && canon.a991 === 'CC-12', JSON.stringify(canon));

  // (1) round-trip nativo
  const rt = await p.evaluate(async () => {
    const s = window.__share;
    const invs = { MEX: { 'MEX-2': { state: 'repe', repes: 3 }, 'MEX-5': { state: 'tengo', repes: 0 } }, CC: { 'CC-1': { state: 'repe', repes: 1 } } };
    const st = s.stateToShare(invs);
    const enc = await s.encodeNative('QA Álbum', invs);
    const dec = await s.decodeNative('https://x.test/s#' + enc);
    return { u: dec.u, sameF: JSON.stringify(dec.f) === JSON.stringify(st.faltan), sameR: JSON.stringify(dec.r) === JSON.stringify(st.repes), t: dec.t > 1700000000 };
  });
  ok('(1) round-trip nativo: encode→decode = identidad (f, r, alias, t)', rt.u === 'QA Álbum' && rt.sameF && rt.sameR && rt.t, JSON.stringify(rt));

  // (2) anclas: encode UMC con SOLO esos 5 faltantes → bits exactos
  const anc = await p.evaluate(async () => {
    const s = window.__share;
    const payload = await s.encodeUMC(new Set([0, 20, 33, 39, 43]), new Set());
    const dec = await s.decodeUMC(payload);
    return { faltan: [...dec.faltan].sort((a, b) => a - b), nRepes: dec.repes.size, semi: payload.includes(';'), gz: payload.includes('H4sI') };
  });
  ok('(2) anclas UMC: bits exactos en 0,20,33,39,43 y solo esos', anc.faltan.join() === '0,20,33,39,43' && anc.nRepes === 0, JSON.stringify(anc.faltan));
  ok('(2) payload UMC con separador ; y bloques gzip (H4sI)', anc.semi && anc.gz);

  // (3) payload real de ejemplo de la spec — verificado contra sus BYTES:
  // bloque1 gunzip = ff×12 … byte124=0x03 → 902 bits en 0..999, de los que 2
  // caen en el padding (992,993). Universo real 0..991 → 900 faltantes, que
  // INCLUYEN las anclas 0/20/33/39/43 (coleccionista casi-nuevo). Las 22
  // posiciones de repes son el snapshot que fija LSB-first (con MSB cambian).
  const ej = await p.evaluate(async (ejemplo) => {
    const s = window.__share;
    // popcount del bitmap COMPLETO (1000 bits) sin pasar por decodeUMC
    const raw = Uint8Array.from(atob(ejemplo.split(';')[0]), (c) => c.charCodeAt(0));
    const ds = new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'));
    const bm = new Uint8Array(await new Response(ds).arrayBuffer());
    let total = 0; for (const b of bm) { let x = b; while (x) { total += x & 1; x >>= 1; } }
    const dec = await s.decodeUMC(ejemplo);
    const f = dec.faltan;
    const anclas = [0, 20, 33, 39, 43].every((i) => f.has(i));
    return { total, len: bm.length, nF: f.size, nR: dec.repes.size, anclas, repes: [...dec.repes.keys()].sort((a, b) => a - b) };
  }, EJEMPLO);
  const REPES_LSB = [103, 108, 114, 115, 182, 196, 197, 303, 309, 310, 319, 502, 745, 746, 756, 757, 761, 764, 765, 770, 788, 794];
  ok('(3) ejemplo real: bitmap 125B con 902 bits → 900 faltantes útiles (0..991) y 22 repes',
    ej.len === 125 && ej.total === 902 && ej.nF === 900 && ej.nR === 22, JSON.stringify({ total: ej.total, nF: ej.nF, nR: ej.nR }));
  ok('(3) ejemplo real: faltantes incluyen las 5 anclas (bytes 0..11=0xff) y repes fijan LSB-first',
    ej.anclas && ej.repes.join() === REPES_LSB.join(), JSON.stringify(ej.repes));

  // (4) cruce puro con dos estados sintéticos
  const cz = await p.evaluate(() => {
    const s = window.__share;
    const mine = { faltan: new Set([5]), repes: new Map([[7, 2]]) };
    const theirs = { faltan: new Set([7]), repes: new Map([[5, 1]]) };
    const c = s.cruce(mine, theirs);
    return { leDoy: c.leDoy, meDa: c.meDa };
  });
  ok('(4) cruce puro: leDoy=[FWC-7 x2] · meDa=[FWC-5 x1]',
    cz.leDoy.length === 1 && cz.leDoy[0].slot === 'FWC-7' && cz.leDoy[0].count === 2
    && cz.meDa.length === 1 && cz.meDa[0].slot === 'FWC-5' && cz.meDa[0].count === 1, JSON.stringify(cz));

  // (5) textos: snapshot byte-exacto sobre estado sintético controlado
  const txt = await p.evaluate(() => {
    const s = window.__share;
    const invs = {};
    for (const key of s.CANON) {
      const code = key.split('-')[0];
      (invs[code] = invs[code] || {})[key] = { state: 'tengo', repes: 0 };
    }
    // faltan: 00, FWC-3, MEX-2, MEX-5, RSA-4 · repes: FWC-1 x3, MEX-7 x2, CC-1 x1
    delete invs['00']['00']; delete invs.FWC['FWC-3']; delete invs.MEX['MEX-2']; delete invs.MEX['MEX-5']; delete invs.RSA['RSA-4'];
    invs.FWC['FWC-1'] = { state: 'repe', repes: 3 };
    invs.MEX['MEX-7'] = { state: 'repe', repes: 2 };
    invs.CC['CC-1'] = { state: 'repe', repes: 1 };
    return { f: s.textFaltan(invs), r: s.textRepes(invs) };
  });
  const SNAP_F = 'Me faltan 5 · Álbum 987/992 (99%)\nESPECIALES: 00, FWC-3\nMEX: 2, 5\nRSA: 4';
  const SNAP_R = 'Mis repes 6 · Álbum 987/992 (99%)\nESPECIALES: FWC-1 (x3), CC-1\nMEX: 7 (x2)';
  ok('(5) snapshot exacto de "Compartir FALTAN"', txt.f === SNAP_F, JSON.stringify(txt.f));
  ok('(5) snapshot exacto de "Compartir REPES"', txt.r === SNAP_R, JSON.stringify(txt.r));

  // QR propio nativo: URL /s#v1. y canvas pintado
  const own = await p.evaluate(() => ({
    payload: window.__lastQR || '',
    painted: (() => { const c = document.getElementById('share-qr'); if (!c) return false;
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let dark = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 100) dark++;
      return dark > 500; })(),
  }));
  ok('QR propio nativo: payload {origin}/s#v1.… y canvas pintado', own.payload.startsWith(new globalThis.URL(URL).origin + '/s#v1.') && own.painted, own.payload.slice(0, 48));

  // toggle a Figuritas: prefijo + estructura y decodificable (faltan 991, repes {MEX-2})
  await p.evaluate(() => { [...document.querySelectorAll('[data-share-fmt]')].find(x => x.dataset.shareFmt === 'umc')?.click(); });
  await p.waitForTimeout(900);
  const umc = await p.evaluate(async () => {
    const s = window.__share;
    const payload = window.__lastQR || '';
    const dec = await s.decodeUMC(payload);
    return { pref: payload.startsWith('站救'), nF: dec.faltan.size, repes: [...dec.repes] };
  });
  ok('toggle UMC: prefijo e7ab99e69591 + faltan 991 + repe en MEX-2 (idx 21)', umc.pref && umc.nF === 991 && umc.repes.join() === '21', JSON.stringify(umc));
  // el nombre visible de la app interop es "Figuritas" (pedido por San; el
  // identificador del formato en su spec sigue siendo UsaMexCan26-QR)
  const vis = await p.evaluate(() => ({
    btns: [...document.querySelectorAll('[data-share-fmt]')].map(x => x.textContent).join('|'),
    cap: document.querySelector('.sh-cap')?.textContent || '',
  }));
  ok('nombre visible: toggle ÁLBUM26|FIGURITAS y caption "app Figuritas"',
    vis.btns === 'ÁLBUM26|FIGURITAS' && vis.cap.includes('"Figuritas"'), JSON.stringify(vis));
  qrUmcA = Buffer.from((await p.evaluate(() => document.getElementById('share-qr').toDataURL('image/png'))).split(',')[1], 'base64');

  // volver a nativo y capturar el PNG del QR para el e2e de subida (contexto B)
  await p.evaluate(() => { [...document.querySelectorAll('[data-share-fmt]')].find(x => x.dataset.shareFmt === 'a26')?.click(); });
  await p.waitForTimeout(900);
  qrPngA = Buffer.from((await p.evaluate(() => document.getElementById('share-qr').toDataURL('image/png'))).split(',')[1], 'base64');

  // (5) navigator.share mockeado: COMPARTIR FALTAN pasa el texto
  await p.evaluate(() => { [...document.querySelectorAll('[data-share-text]')].find(x => x.dataset.shareText === 'faltan')?.click(); });
  await p.waitForTimeout(500);
  const shared = await p.evaluate(() => (window.__shared || []).map(d => d.text || ''));
  ok('(5) Web Share API: COMPARTIR FALTAN entrega el texto', shared.length === 1 && shared[0].startsWith('Me faltan 991 · Álbum 1/992 (0%)'), shared[0]?.slice(0, 44));

  // (6) presupuesto iOS con la hoja abierta
  await p.waitForTimeout(600);
  const withBacking = layers.filter(l => l.width > 0 && l.height > 0);
  const mb = withBacking.reduce((a, l) => a + l.width * l.height * 4, 0) / 1048576;
  ok('(6) capas <= 60 con la hoja Compartir abierta', withBacking.length > 0 && withBacking.length <= 60, `capas=${withBacking.length}`);
  ok('(6) memoria backing <= 60 MB con la hoja abierta', mb <= 60, `${mb.toFixed(0)} MB @3x`);
  await ctx.close();
}

// ============ contexto B: subir imagen del QR de A → cruce e2e ============
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' });
  // estado B: tiene MEX-5 (repe x1); le falta todo lo demás (incl. MEX-2)
  await mockAuth(ctx, URL, { rows: [{ slot: 'MEX-5', pegado: true, repes: 1 }] });
  await ctx.addInitScript(() => {
    navigator.share = (d) => { (window.__shared = window.__shared || []).push(d); return Promise.resolve(); };
  });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  await openShare(p);
  await p.setInputFiles('#share-file', { name: 'qrA.png', mimeType: 'image/png', buffer: qrPngA });
  await p.waitForTimeout(1200); // decodificar imagen + cruce + re-render
  const cru = await p.evaluate(() => {
    const box = document.getElementById('sh-cruce');
    if (!box) return { toast: document.getElementById('ab-toast')?.textContent || '(sin toast)' };
    return {
      head: box.querySelector('.sh-crh')?.textContent || '',
      heads: [...box.querySelectorAll('.rg-head')].map(x => x.textContent),
      rows: [...box.querySelectorAll('.rg-row')].map(x => x.textContent),
    };
  });
  ok('(4) e2e subir imagen: cruce visible', !!cru.heads, JSON.stringify(cru));
  ok('(4) e2e: LE PUEDES DAR (1) → MEX: 5 (su falta ∩ mi repe)',
    !!cru.heads && cru.heads[0] === 'LE PUEDES DAR (1)' && cru.rows[0] === 'MEX: 5', JSON.stringify(cru.rows || cru));
  ok('(4) e2e: TE PUEDE DAR (1) → MEX: 2 (x2) (mi falta ∩ su repe con cantidad)',
    !!cru.heads && cru.heads[1] === 'TE PUEDE DAR (1)' && cru.rows[1] === 'MEX: 2 (x2)', JSON.stringify(cru.rows || cru));
  // el re-render que pinta el cruce recrea el <canvas>: el QR debe repintarse
  const qrB = await p.evaluate(() => { const c = document.getElementById('share-qr'); if (!c) return 0;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let dark = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 100) dark++; return dark; });
  ok('(4) el QR propio sigue pintado tras mostrarse el cruce (re-render)', qrB > 500, 'px oscuros=' + qrB);
  // copiar resultado vía Web Share mockeado (?. para no matar la suite si no hay cruce)
  await p.evaluate(() => document.querySelector('[data-share-copy-cruce]')?.click());
  await p.waitForTimeout(400);
  const crTxt = await p.evaluate(() => (window.__shared || [])[0]?.text || '');
  ok('(4) COPIAR RESULTADO: texto de cruce con ambas secciones',
    crTxt.includes('LE PUEDES DAR (1):') && crTxt.includes('MEX: 5') && crTxt.includes('TE PUEDE DAR (1):') && crTxt.includes('MEX: 2 (x2)'), JSON.stringify(crTxt));

  // (7) caso real del gate: screenshot vertical de Figuritas — el QR UMC de A
  // a 570px dentro de un lienzo 1080×2340 con logo central, recodificado JPEG
  const shotUrl = await p.evaluate(async (qrUrl) => {
    const img = new Image(); img.src = qrUrl; await img.decode();
    const shot = document.createElement('canvas'); shot.width = 1080; shot.height = 2340;
    const c = shot.getContext('2d');
    c.fillStyle = '#fff'; c.fillRect(0, 0, 1080, 2340);
    c.fillStyle = '#111'; c.font = 'bold 52px sans-serif'; c.fillText('Usa Méx Can 26', 60, 160);
    c.drawImage(img, 255, 300, 570, 570);
    const L = 60; c.fillStyle = '#1a1a1a'; c.fillRect(540 - L / 2, 585 - L / 2, L, L);
    c.fillStyle = '#e8632c'; c.fillRect(540 - L / 2 + 10, 585 - L / 2 + 10, L - 20, L - 20);
    c.fillStyle = '#2b62d9'; c.font = '40px sans-serif'; c.fillText('Escanea el código QR de tus amigos', 60, 1100);
    return shot.toDataURL('image/jpeg', 0.85);
  }, 'data:image/png;base64,' + qrUmcA.toString('base64'));
  await p.setInputFiles('#share-file', { name: 'captura.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(shotUrl.split(',')[1], 'base64') });
  await p.waitForTimeout(1600);
  const cru2 = await p.evaluate(() => {
    const box = document.getElementById('sh-cruce');
    if (!box) return { toast: document.getElementById('ab-toast')?.textContent || '(sin toast)' };
    return { head: box.querySelector('.sh-crh')?.textContent || '', rows: [...box.querySelectorAll('.rg-row')].map(x => x.textContent) };
  });
  ok('(7) screenshot Figuritas (vertical 1080×2340, QR con logo, JPEG): leído y cruzado',
    !!cru2.rows && cru2.head.includes('Figuritas') && cru2.head.includes('sin cantidad'), JSON.stringify(cru2));
  ok('(7) repes de Figuritas sin cantidad → x1: TE PUEDE DAR muestra MEX: 2 (sin x2)',
    !!cru2.rows && cru2.rows[0] === 'MEX: 5' && cru2.rows[1] === 'MEX: 2', JSON.stringify(cru2.rows || cru2));

  // (8) robustez del lector: QR denso ~v30 (fallaba con el downscale único)
  let denso = 'FIG-DENSO-'; while (denso.length < 640) denso += 'Qx9zK4mP2wL8vR5tB1nJ7cD3hF6gS0aE';
  const qrDensoURL = await QRCode.toDataURL(denso, { errorCorrectionLevel: 'H', margin: 4, width: 1140 });
  const lect = await p.evaluate(async ({ qr, esperado }) => {
    const img = new Image(); img.src = qr; await img.decode();
    const shot = document.createElement('canvas'); shot.width = 1080; shot.height = 2340;
    const c = shot.getContext('2d');
    c.fillStyle = '#fff'; c.fillRect(0, 0, 1080, 2340);
    c.drawImage(img, 255, 300, 570, 570);
    const L = 60; c.fillStyle = '#1a1a1a'; c.fillRect(540 - L / 2, 585 - L / 2, L, L);
    const jpg = new Image(); jpg.src = shot.toDataURL('image/jpeg', 0.85); await jpg.decode();
    const bmp = await createImageBitmap(jpg);
    const hit = await window.__share.readQRMultiScale(bmp);
    return hit === esperado;
  }, { qr: qrDensoURL, esperado: denso });
  ok('(8) lector multi-escala: QR denso (~v30) + logo + JPEG en screenshot vertical', lect === true);

  // (9) historial ESCANEADOS: tras los dos escaneos de este contexto hay dos
  // entradas (Figuritas la más reciente, Coleccionista después)
  const hist = await p.evaluate(() => ({
    head: document.querySelector('#sh-hist .rg-head')?.textContent || '',
    rows: [...document.querySelectorAll('.sh-scanrow .sh-who')].map(x => x.textContent),
    nums: [...document.querySelectorAll('.sh-scanrow .sh-nums')].map(x => x.textContent),
  }));
  ok('(9) ESCANEADOS (2): Figuritas (reciente) y Coleccionista con resumen das/te da',
    hist.head === 'ESCANEADOS (2)' && hist.rows.length === 2
    && hist.rows[0].includes('Figuritas') && hist.rows[1].includes('Coleccionista')
    && hist.nums[0] === 'das 1 · te da 1' && hist.nums[1] === 'das 1 · te da 1', JSON.stringify(hist));

  // persiste tras recargar; el tap recalcula el cruce FRESCO (nativo → con x2)
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  await openShare(p);
  const hist2 = await p.evaluate(() => ({
    n: document.querySelectorAll('.sh-scanrow').length,
    cruceAntes: !!document.getElementById('sh-cruce'),
  }));
  await p.evaluate(() => { [...document.querySelectorAll('[data-scan-open]')][1]?.click(); });
  await p.waitForTimeout(900);
  const rec = await p.evaluate(() => {
    const box = document.getElementById('sh-cruce');
    if (!box) return null;
    return { head: box.querySelector('.sh-crh')?.textContent || '', rows: [...box.querySelectorAll('.rg-row')].map(x => x.textContent) };
  });
  ok('(9) persiste tras recargar y el tap recalcula el cruce (nativo, con cantidades)',
    hist2.n === 2 && !hist2.cruceAntes && !!rec && rec.head.includes('Coleccionista')
    && rec.rows[0] === 'MEX: 5' && rec.rows[1] === 'MEX: 2 (x2)', JSON.stringify({ hist2, rec }));

  // el ✕ borra la entrada y el borrado persiste en localStorage
  await p.evaluate(() => { [...document.querySelectorAll('[data-scan-del]')][0]?.click(); });
  await p.waitForTimeout(500);
  const afterDel = await p.evaluate(() => ({
    n: document.querySelectorAll('.sh-scanrow').length,
    stored: JSON.parse(localStorage.getItem('album26_scans') || '[]').length,
  }));
  ok('(9) el ✕ borra la entrada y persiste el borrado', afterDel.n === 1 && afterDel.stored === 1, JSON.stringify(afterDel));
  await ctx.close();
}

// ============ contexto C: /s pública sin sesión ============
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  // payload nativo mínimo generado con las mismas primitivas del navegador
  const frag = await p.evaluate(async () => {
    const json = JSON.stringify({ u: 'San', t: 1770000000, f: [0, 21], r: [[24, 2]] });
    const stream = new Blob([new TextEncoder().encode(json)]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    let s = ''; for (const x of bytes) s += String.fromCharCode(x);
    return 'v1.' + btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  });
  await p.goto(URL.replace(/\/+$/, '') + '/s#' + frag, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  const sv = await p.evaluate(() => ({
    path: location.pathname,
    h1: document.querySelector('.sv-head h1')?.textContent || '',
    stats: document.querySelector('.sv-stats')?.textContent || '',
    lines: [...document.querySelectorAll('.sv-lines div')].map(x => x.textContent),
  }));
  ok('(6) /s pública: NO redirige a /login sin sesión', sv.path === '/s', sv.path);
  ok('(6) /s: alias y stats del payload (990/992 · faltan 2 · 2 repes)',
    sv.h1 === 'Colección de San' && sv.stats.includes('990/992') && sv.stats.includes('2'), JSON.stringify(sv.h1 + ' | ' + sv.stats));
  ok('(6) /s: listas legibles (faltan ESPECIALES: 00 + MEX: 2 · repes MEX: 5 (x2))',
    sv.lines.some(l => l === 'ESPECIALES: 00') && sv.lines.some(l => l === 'MEX: 2') && sv.lines.some(l => l === 'MEX: 5 (x2)'), JSON.stringify(sv.lines));
  await ctx.close();
}

await b.close();
const f = results.filter(r => r[0] === 'FAIL').length;
console.log(`\n${results.length - f}/${results.length} PASS, ${f} FAIL`);
console.log('NOTA: el gate E2E físico (escanear nuestro QR Figuritas con la app real)');
console.log('      lo hace San post-deploy; la spec y sus anclas están verificadas aquí.');
