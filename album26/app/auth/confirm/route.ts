// Fv4.0 — Confirmación de email (enlace token_hash del correo de Supabase).
// Solo se usa si el enlace del correo apunta a este dominio (requiere que el
// orquestador añada la URL a la allowlist global — NO lo hacemos nosotros);
// si no, Supabase confirma igualmente en su verify y el usuario vuelve a /login.
import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const redirect = request.nextUrl.clone();
  redirect.search = '';
  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    redirect.pathname = error ? '/login' : '/';
    if (error) redirect.searchParams.set('error', 'confirmacion');
    return NextResponse.redirect(redirect);
  }
  redirect.pathname = '/login';
  return NextResponse.redirect(redirect);
}
