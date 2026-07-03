// Suite Fv3.6 — tiles GROUP re-proporcionados + PWA instalable + cero <img> vacías.
//   (a) manifest 200 con campos/iconos correctos y los 2 iconos del bucket cargan
//   (b) service worker registrado tras la carga (build de producción)
//   (c) bloque GROUP: ancho <= 42% del ancho de página (móvil ~40%, desktop ~35%)
//       y zona de bandera con ratio 1.30-1.36 (4:3 + object-fit cover)
//   (d) cero <img> con src vacío en portada e índice de grupos
// Genera screenshots del gate en qa/screenshots/fv36/ (R de MEX y portada).
// NOTA sandbox: flags/ e icons/ del bucket se interceptan con un PNG fixture
// (sin red a supabase.co); los 200 reales del bucket se validan en prod.
// Uso:  QA_URL=http://localhost:3000 node qa/verify-fv36-pwa.mjs
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const EXE = process.env.QA_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = process.env.QA_URL || 'http://localhost:3000/';
const SHOTS = process.env.QA_SHOTS || 'qa/screenshots/fv36';
mkdirSync(SHOTS, { recursive: true });
const results = [];
const ok = (n, c, x='') => { results.push([c?'PASS':'FAIL', n, x]); console.log((c?'PASS':'FAIL')+'  '+n+(x?'  ['+x+']':'')); if(!c) process.exitCode=1; };

const b = await chromium.launch({ executablePath: EXE });

const makeCtx = async (vw, vh) => {
  // serviceWorkers:'block' para que el SW (prod) no interfiera con page.route
  const ctx = await b.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2, hasTouch: vw < 900, serviceWorkers: 'block' });
  const fx = await ctx.newPage();
  const dataUrl = await fx.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 640; c.height = 427;
    const g = c.getContext('2d'); g.fillStyle = '#1b3f8f'; g.fillRect(0, 0, 640, 427);
    g.fillStyle = '#fff'; g.fillRect(0, 160, 640, 107);
    return c.toDataURL('image/png');
  });
  await fx.close();
  const png = Buffer.from(dataUrl.split(',')[1], 'base64');
  const intercepted = [];
  await ctx.route('**/storage/v1/object/public/flags/**', (route) => {
    intercepted.push(route.request().url());
    route.fulfill({ contentType: 'image/png', body: png });
  });
  return { ctx, intercepted };
};

const clickChip = async (p, label) => {
  const found = await p.evaluate((c) => {
    const chip = [...document.querySelectorAll('#nav button')].find(x => x.textContent === c);
    if (!chip) return false; chip.click(); return true;
  }, label);
  if (!found) throw new Error('chip: ' + label);
  await p.waitForTimeout(400);
};

const emptyImgs = (p) => p.evaluate(() =>
  [...document.querySelectorAll('img')].filter(i => !i.getAttribute('src')).map(i => i.className || i.outerHTML.slice(0, 60)));

const groupGeom = (p) => p.evaluate(() => {
  const root = document.querySelector('[data-current] .spage.r') || document.querySelector('[data-current] .face.front');
  const page = root.getBoundingClientRect();
  const gb = root.querySelector('.gbadge').getBoundingClientRect();
  const tiles = [...root.querySelectorAll('.gtile')].map(t => {
    const img = t.querySelector('img') || t.querySelector('.noflag');
    const band = t.querySelector('.gband');
    const ir = img.getBoundingClientRect(), tr = t.getBoundingClientRect(), br = band.getBoundingClientRect();
    return { imgRatio: ir.width / ir.height, bandFrac: br.width / tr.width, tag: img.tagName };
  });
  return { widthFrac: gb.width / page.width, tiles };
});

// ============ contexto móvil 360x740: (d) + (a) + (c) móvil ============
{
  const { ctx, intercepted } = await makeCtx(360, 740);
  const p = await ctx.newPage();
  p.on('dialog', d => d.accept());
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.waitForTimeout(400);

  // (d) cero <img> con src vacío en portada (con hojas vecinas montadas) e índice
  const e0 = await emptyImgs(p);
  ok('(d) portada: cero <img> con src vacío', e0.length === 0, e0.join(','));
  await clickChip(p, 'GRUPOS');
  const e1 = await emptyImgs(p);
  ok('(d) índice de grupos: cero <img> con src vacío', e1.length === 0, e1.join(','));

  // (a) manifest 200 + campos + iconos absolutos del bucket
  const mResp = await p.request.get(URL.replace(/\/+$/, '') + '/manifest.webmanifest');
  ok('(a) manifest.webmanifest responde 200', mResp.status() === 200, String(mResp.status()));
  const man = await mResp.json();
  ok('(a) manifest: name/short_name/display/start_url', man.name === 'Álbum Mundial 2026' && man.short_name === 'Álbum 26' && man.display === 'standalone' && man.start_url === '/', JSON.stringify([man.name, man.short_name, man.display]));
  ok('(a) manifest: colores #1E1B33', man.background_color === '#1E1B33' && man.theme_color === '#1E1B33');
  const icons = man.icons || [];
  const iconsOk = icons.length === 2
    && icons.every(i => /^https:\/\/cmyfyswystjgzdwbqyyb\.supabase\.co\/storage\/v1\/object\/public\/flags\/icons\/icon-(192|512)\.png$/.test(i.src) && i.purpose === 'any maskable')
    && icons.map(i => i.sizes).sort().join() === '192x192,512x512';
  ok('(a) manifest: 2 iconos absolutos del bucket, 192+512, any maskable', iconsOk, JSON.stringify(icons.map(i => i.src)));
  // los 2 iconos cargan (interceptados -> fixture w640; el 200 real se ve en prod)
  const loaded = await p.evaluate((srcs) => Promise.all(srcs.map(s => new Promise((res) => {
    const im = new Image(); im.onload = () => res(im.naturalWidth); im.onerror = () => res(0); im.src = s;
  }))), icons.map(i => i.src));
  ok('(a) iconos 192 y 512 cargan (fixture; 200 real en prod)', loaded.every(w => w > 0), JSON.stringify(loaded));
  ok('(a) requests de iconos pasaron por el bucket flags/icons/', intercepted.filter(u => u.includes('/flags/icons/')).length >= 2, `${intercepted.filter(u => u.includes('/flags/icons/')).length} requests`);

  // (c) bloque GROUP en móvil: <=42% del ancho de página y zona bandera 4:3
  await clickChip(p, 'MEX');
  await p.evaluate(() => document.querySelector('[data-nav="next"]').click());
  await p.waitForTimeout(800);
  const gm = await groupGeom(p);
  ok('(c) móvil: bloque GROUP <= 42% del ancho de página', gm.widthFrac <= 0.42, gm.widthFrac.toFixed(3));
  ok('(c) móvil: zona de bandera ratio 1.30-1.36 en los 4 tiles', gm.tiles.length === 4 && gm.tiles.every(t => t.imgRatio >= 1.30 && t.imgRatio <= 1.36), gm.tiles.map(t => t.imgRatio.toFixed(3)).join(','));
  ok('(c) móvil: banda de código ~20% del tile', gm.tiles.every(t => Math.abs(t.bandFrac - 0.20) < 0.03), gm.tiles.map(t => t.bandFrac.toFixed(3)).join(','));
  await ctx.close();
}

// ============ contexto desktop 1280x800: (c) desktop + screenshots ============
{
  const { ctx } = await makeCtx(1280, 800);
  const p = await ctx.newPage();
  p.on('dialog', d => d.accept());
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.waitForTimeout(400);
  await clickChip(p, 'MEX');
  const gd = await groupGeom(p);
  ok('(c) desktop: bloque GROUP <= 42% del ancho de página (~35%)', gd.widthFrac <= 0.42, gd.widthFrac.toFixed(3));
  ok('(c) desktop: zona de bandera ratio 1.30-1.36 en los 4 tiles', gd.tiles.length === 4 && gd.tiles.every(t => t.imgRatio >= 1.30 && t.imgRatio <= 1.36), gd.tiles.map(t => t.imgRatio.toFixed(3)).join(','));
  await (await p.$('[data-current] .spage.r')).screenshot({ path: `${SHOTS}/mex_R.png` });
  await clickChip(p, 'PORTADA');
  await p.waitForTimeout(300);
  await (await p.$('[data-current] .spage.solo')).screenshot({ path: `${SHOTS}/portada.png` });
  console.log('screenshots ->', SHOTS);
  await ctx.close();
}

// ============ contexto con SW permitido: (b) registro en prod ============
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  let regs = 0;
  for (let i = 0; i < 20 && regs < 1; i++) {
    await p.waitForTimeout(250);
    regs = await p.evaluate(() => navigator.serviceWorker.getRegistrations().then(r => r.length));
  }
  ok('(b) service worker registrado tras la carga (prod build)', regs >= 1, `registrations=${regs}`);
  await ctx.close();
}

await b.close();
const f = results.filter(r => r[0] === 'FAIL').length;
console.log(`\n${results.length - f}/${results.length} PASS, ${f} FAIL`);
console.log('NOTA: flags/ e icons/ interceptados con fixture (sandbox sin red a supabase.co);');
console.log('      los 200 reales del bucket y la instalación PWA se validan en prod.');
