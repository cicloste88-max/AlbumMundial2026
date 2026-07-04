// Fv4.0 — Proxy de sesión (convenio Next 16; @supabase/ssr, patrón oficial con cookies).
// Protege TODO excepto /login, /auth/*, manifest, sw.js y estáticos: sin sesión
// se redirige a /login. También refresca el token en las cookies de la response.
//
// QA_AUTH_MOCK: el sandbox de QA no llega a supabase.co, así que con
// QA_AUTH_MOCK=1 (variable de servidor, JAMÁS puesta en Vercel) la cookie
// `qa-session` cuenta como sesión válida. Es el patrón "cookie de sesión falsa"
// del brief Fv4.0 para poder testear el middleware sin red.
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = /^\/(login|auth\/|manifest\.webmanifest|sw\.js|favicon\.ico|fonts\/|icons\/)/;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.test(pathname);

  // QA sin red (ver cabecera). En producción QA_AUTH_MOCK no existe.
  if (process.env.QA_AUTH_MOCK === '1') {
    const mockSession = Boolean(request.cookies.get('qa-session'));
    if (!mockSession && !isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    if (mockSession && pathname === '/login') {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  let user = null;
  if (supabaseUrl && supabaseKey) {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    });
    try {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch {
      user = null; // sin red / token inválido → tratar como sin sesión
    }
  }

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }
  return supabaseResponse;
}

export const config = {
  // excluye estáticos de Next y assets con extensión; el resto pasa por sesión
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|otf|ttf|woff2?)$).*)'],
};
