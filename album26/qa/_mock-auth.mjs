// Fv4.0 — Mock de auth+progreso para QA sin red a supabase.co.
// Requiere el server con QA_AUTH_MOCK=1 (la cookie `qa-session` cuenta como
// sesión para el proxy). En el navegador se montan: cookie de sesión sb-* del
// cliente @supabase/ssr + route intercepts STATEFUL de auth y album_progress
// (los upserts/deletes mutan un Map en el proceso de la suite, así que la
// persistencia tras recarga se testea de verdad contra el mock).
const SUPA = 'https://cmyfyswystjgzdwbqyyb.supabase.co';
const REF = 'cmyfyswystjgzdwbqyyb';

export const QA_USER = {
  id: '00000000-0000-4000-8000-000000000001',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'qa@album26.test',
  email_confirmed_at: '2026-01-01T00:00:00Z',
  app_metadata: { provider: 'email' },
  user_metadata: {},
  created_at: '2026-01-01T00:00:00Z',
};

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'access-control-expose-headers': '*',
};

export async function mockAuth(ctx, baseUrl, opts = {}) {
  const state = new Map(); // slot -> { pegado, repes }
  for (const r of opts.rows || []) state.set(r.slot, { pegado: r.pegado, repes: r.repes });
  const calls = { upserts: [], deletes: [], logout: 0 };

  const session = {
    access_token: 'qa-token', token_type: 'bearer', expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'qa-refresh', user: QA_USER,
  };
  const cookieVal = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url');
  await ctx.addCookies([
    { name: 'qa-session', value: '1', url: baseUrl },
    { name: `sb-${REF}-auth-token`, value: cookieVal, url: baseUrl },
  ]);

  await ctx.route(SUPA + '/auth/v1/**', (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: CORS });
    const u = req.url();
    if (u.includes('/auth/v1/user')) {
      return route.fulfill({ headers: CORS, contentType: 'application/json', body: JSON.stringify(QA_USER) });
    }
    if (u.includes('/auth/v1/logout')) {
      calls.logout++;
      return route.fulfill({ status: 204, headers: CORS, body: '' });
    }
    if (u.includes('/auth/v1/token')) {
      return route.fulfill({ headers: CORS, contentType: 'application/json', body: JSON.stringify(session) });
    }
    return route.fulfill({ status: 404, headers: CORS, contentType: 'application/json', body: '{}' });
  });

  await ctx.route(SUPA + '/rest/v1/album_progress**', (route) => {
    const req = route.request();
    const method = req.method();
    if (method === 'OPTIONS') return route.fulfill({ status: 200, headers: CORS });
    const u = new URL(req.url());
    const likeParam = u.searchParams.get('slot'); // p.ej. "like.MEX-%"
    const prefix = likeParam && likeParam.startsWith('like.') ? likeParam.slice(5).replace('%', '') : null;
    if (method === 'GET') {
      const rows = [...state.entries()]
        .filter(([slot]) => !prefix || slot.startsWith(prefix))
        .map(([slot, v]) => ({ slot, pegado: v.pegado, repes: v.repes }));
      return route.fulfill({ headers: CORS, contentType: 'application/json', body: JSON.stringify(rows) });
    }
    if (method === 'POST') {
      let body = [];
      try { body = JSON.parse(req.postData() || '[]'); } catch {}
      const rows = Array.isArray(body) ? body : [body];
      if (opts.failWrites) {
        // fallo con latencia: deja ver la ventana de UI optimista antes del revert
        return new Promise((res) => setTimeout(res, 600)).then(() =>
          route.fulfill({ status: 503, headers: CORS, contentType: 'application/json', body: '{"message":"qa: escritura forzada a fallo"}' }));
      }
      for (const r of rows) {
        state.set(r.slot, { pegado: !!r.pegado, repes: r.repes | 0 });
        calls.upserts.push({ slot: r.slot, pegado: !!r.pegado, repes: r.repes | 0, user_id: r.user_id });
      }
      return route.fulfill({ status: 201, headers: CORS, contentType: 'application/json', body: '[]' });
    }
    if (method === 'DELETE') {
      for (const slot of [...state.keys()]) if (!prefix || slot.startsWith(prefix)) state.delete(slot);
      calls.deletes.push(prefix || '*');
      return route.fulfill({ status: 204, headers: CORS, body: '' });
    }
    return route.fulfill({ status: 405, headers: CORS, body: '' });
  });

  return { calls, state };
}
