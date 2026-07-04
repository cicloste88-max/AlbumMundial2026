// Fv4.0 — Callback OAuth/PKCE (intercambio de code por sesión). Hoy solo hay
// email+password, pero el enlace de confirmación puede llegar con ?code= según
// la configuración del proyecto; cubrimos ambos formatos sin tocar settings.
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const redirect = request.nextUrl.clone();
  redirect.search = '';
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    redirect.pathname = error ? '/login' : '/';
    if (error) redirect.searchParams.set('error', 'callback');
    return NextResponse.redirect(redirect);
  }
  redirect.pathname = '/login';
  return NextResponse.redirect(redirect);
}
