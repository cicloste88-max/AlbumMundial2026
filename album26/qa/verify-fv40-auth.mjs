// Suite Fv4.0 — Auth (registro abierto) + progreso por usuario en nube.
// REQUIERE el server con QA_AUTH_MOCK=1 (sandbox sin red a supabase.co):
//   QA_AUTH_MOCK=1 npx next start -p 3000
//   (a) sin sesión, / redirige a /login
//   (b) /login renderiza (tabs Entrar/Registrarse) y valida campos en castellano
//   (c) con sesión mock, / carga el libro con el progreso HIDRATADO de la nube
//   (d) manifest / sw.js / estáticos accesibles SIN sesión (crítico para PWA)
//   (e) upsert inmediato al tocar un cromo (route spy) + persistencia tras
//       recarga contra el mock stateful + revert optimista si el server falla
// El e2e REAL (signup, confirmación de email, RLS, multidispositivo) lo valida
// el orquestador en prod tras el deploy con las env vars puestas en Vercel.
// Uso:  QA_URL=http://localhost:3000 node qa/verify-fv40-auth.mjs
import { chromium } from 'playwright-core';
import { mockAuth } from './_mock-auth.mjs';
const EXE = process.env.QA_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = process.env.QA_URL || 'http://localhost:3000/';
const results = [];
const ok = (n, c, x='') => { results.push([c?'PASS':'FAIL', n, x]); console.log((c?'PASS':'FAIL')+'  '+n+(x?'  ['+x+']':'')); if(!c) process.exitCode=1; };

const b = await chromium.launch({ executablePath: EXE });

// ============ (a) + (b) + (d): SIN sesión ============
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  ok('(a) sin sesión: / redirige a /login', new globalThis.URL(p.url()).pathname === '/login', p.url());

  ok('(b) /login: tabs Entrar y Registrarse', await p.evaluate(() => {
    const t = [...document.querySelectorAll('.lg-tabs button')].map(x => x.textContent);
    return t.length === 2 && t[0] === 'ENTRAR' && t[1] === 'REGISTRARSE';
  }));
  ok('(b) /login: campos email y contraseña', await p.evaluate(() =>
    !!document.querySelector('#lg-email[type="email"][required]') && !!document.querySelector('#lg-pass[type="password"]')));
  // validación castellana: password corta (rellena email válido para pasar el required nativo)
  await p.fill('#lg-email', 'qa@album26.test');
  await p.fill('#lg-pass', '123');
  await p.evaluate(() => { document.querySelector('#lg-pass').removeAttribute('minlength'); });
  await p.click('.lg-submit');
  await p.waitForTimeout(200);
  const err = await p.evaluate(() => document.querySelector('.lg-err')?.textContent || '');
  ok('(b) /login: error en castellano con password corta', err.includes('al menos 6 caracteres'), err);
  ok('(b) /login: estética álbum (fondo #1E1B33)', await p.evaluate(() =>
    getComputedStyle(document.querySelector('.lg-wrap')).backgroundColor === 'rgb(30, 27, 51)'));

  // (d) assets públicos sin sesión (request API: sin cookies)
  for (const [name, path] of [['manifest', '/manifest.webmanifest'], ['sw.js', '/sw.js'], ['fuente', '/fonts/fwc26.otf']]) {
    const r = await p.request.get(URL.replace(/\/+$/, '') + path, { maxRedirects: 0 });
    ok(`(d) ${name} accesible sin sesión (200, sin redirect)`, r.status() === 200, String(r.status()));
  }
  await ctx.close();
}

// ============ (c) + (e): CON sesión mock ============
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' });
  const { calls } = await mockAuth(ctx, URL, { rows: [{ slot: 'MEX-2', pegado: true, repes: 3 }] });
  const p = await ctx.newPage();
  p.on('dialog', d => d.accept());
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.waitForTimeout(600);
  ok('(c) con sesión: / NO redirige y carga el libro', new globalThis.URL(p.url()).pathname === '/' &&
    await p.evaluate(() => !!document.querySelector('#nav') && !!document.querySelector('.book')));

  // hidratación: MEX-2 debe llegar como repe3 desde la nube
  await p.evaluate(() => { [...document.querySelectorAll('#chips button')].find(x => x.textContent === 'MEX')?.click(); });
  await p.waitForTimeout(400);
  const hyd = await p.evaluate(() => ({
    ds: document.querySelector('[data-tile="MEX-2"]')?.dataset.state,
    bar: document.querySelector('.demo-bar')?.textContent || '',
  }));
  ok('(c) progreso hidratado: MEX-2 = repe3', hyd.ds === 'repe3', hyd.ds);
  ok('(c) contador desde estado real: Pegados 1/20 · REPES 3', hyd.bar.includes('Pegados 1/20') && hyd.bar.includes('REPES 3'), hyd.bar);

  // (e) upsert inmediato al marcar un cromo (spy)
  await p.evaluate(() => document.querySelector('[data-tile="MEX-3"]').click());
  await p.waitForTimeout(400);
  const up = calls.upserts.find(u => u.slot === 'MEX-3');
  ok('(e) tap MEX-3 → upsert {pegado:true, repes:0}', !!up && up.pegado === true && up.repes === 0, JSON.stringify(up));
  ok('(e) el upsert lleva user_id (RLS with check)', !!up && typeof up.user_id === 'string' && up.user_id.length > 30, up?.user_id);

  // persistencia real contra el mock stateful: recarga y sigue
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(600);
  await p.evaluate(() => { [...document.querySelectorAll('#chips button')].find(x => x.textContent === 'MEX')?.click(); });
  await p.waitForTimeout(400);
  const ds3 = await p.evaluate(() => document.querySelector('[data-tile="MEX-3"]')?.dataset.state);
  ok('(e) tras recargar, MEX-3 sigue tengo (hidratado de la nube)', ds3 === 'tengo', ds3);

  // botón Salir presente y dispara signOut
  ok('logout: botón discreto "Salir" en la barra', await p.evaluate(() => !!document.querySelector('[data-logout]')));
  await p.evaluate(() => document.querySelector('[data-logout]').click());
  await p.waitForTimeout(600);
  ok('logout: llama a auth/v1/logout', calls.logout >= 1, `logout=${calls.logout}`);
  await ctx.close();
}

// ============ (e bis) revert optimista si el servidor falla ============
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' });
  await mockAuth(ctx, URL, { failWrites: true });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.waitForTimeout(600);
  await p.evaluate(() => { [...document.querySelectorAll('#chips button')].find(x => x.textContent === 'MEX')?.click(); });
  await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('[data-tile="MEX-5"]').click());
  await p.waitForTimeout(150);
  const optimista = await p.evaluate(() => document.querySelector('[data-tile="MEX-5"]')?.dataset.state);
  await p.waitForTimeout(800);
  const final = await p.evaluate(() => ({
    ds: document.querySelector('[data-tile="MEX-5"]')?.dataset.state,
    toast: document.querySelector('#ab-toast')?.textContent || '',
  }));
  ok('(e) optimistic UI: el tile marca al instante', optimista === 'tengo', optimista);
  ok('(e) revert al fallar el upsert: vuelve a falta', final.ds === 'falta', final.ds);
  ok('(e) aviso de error visible (toast)', final.toast.includes('no se ha guardado'), final.toast);
  await ctx.close();
}

await b.close();
const f = results.filter(r => r[0] === 'FAIL').length;
console.log(`\n${results.length - f}/${results.length} PASS, ${f} FAIL`);
console.log('NOTA: server con QA_AUTH_MOCK=1 y Supabase mockeado (sandbox sin red);');
console.log('      signup real, confirmación de email y RLS se validan en prod.');
