'use client';
// Fv4.0 — /login: Entrar / Registrarse (email+password, registro ABIERTO).
// La confirmación de email está ACTIVA en el proyecto (setting global compartido
// con la Porra, no se toca): tras registrarse se muestra "Revisa tu correo".
// Estética del álbum: fondo #1E1B33 y acentos de la portada (referencia v3).
import { useState } from 'react';
import { getSupabase, supabaseConfigured } from '@/lib/supabase/client';

const CSS = `
.lg-wrap{min-height:100vh; background:#1E1B33; display:flex; flex-direction:column;
  align-items:center; justify-content:center; padding:24px 16px;
  padding:calc(24px + env(safe-area-inset-top, 0px)) calc(16px + env(safe-area-inset-right, 0px))
          calc(24px + env(safe-area-inset-bottom, 0px)) calc(16px + env(safe-area-inset-left, 0px));
  font-family:var(--font-barlow),system-ui,sans-serif}
.lg-card{width:min(92vw,400px); background:#F6F3EC; border-radius:12px; overflow:hidden;
  box-shadow:0 14px 26px rgba(0,0,0,.5)}
.lg-head{background:#2B1E7E; padding:22px 20px 18px; text-align:center; position:relative; overflow:hidden}
.lg-head .blk{position:absolute}
.lg-head .b1{left:0; bottom:0; width:26%; height:34%; background:#C8481F; border-radius:0 70% 0 0/0 55% 0 0}
.lg-head .b2{right:0; top:0; width:20%; height:38%; background:#6FB43F; border-radius:0 0 0 70%/0 0 0 60%}
.lg-head .b3{right:0; bottom:0; width:22%; height:26%; background:#E8A81E; border-radius:55% 0 0 0/70% 0 0 0}
.lg-head h1{position:relative; margin:0; color:#fff; font-family:var(--font-baloo),cursive;
  font-weight:800; font-size:24px; line-height:1.1}
.lg-head small{position:relative; display:block; color:#fff; opacity:.85; font-weight:700;
  font-size:11px; letter-spacing:.2em; margin-top:6px}
.lg-tabs{display:flex; border-bottom:2px solid #E7E0CF}
.lg-tabs button{flex:1; border:0; background:none; padding:13px 8px; cursor:pointer;
  font-family:inherit; font-weight:800; font-size:14px; letter-spacing:.04em; color:#6C5FA0}
.lg-tabs button.on{color:#20153F; box-shadow:inset 0 -3px 0 #E8A81E}
.lg-body{padding:20px}
.lg-body label{display:block; font-weight:700; font-size:12.5px; color:#20153F;
  letter-spacing:.04em; margin:0 0 4px}
.lg-body input{width:100%; box-sizing:border-box; border:2px solid #D8D2C2; border-radius:8px;
  padding:10px 12px; margin-bottom:14px; font-family:inherit; font-size:15px; color:#20153F;
  background:#fff; outline:none}
.lg-body input:focus{border-color:#2B1E7E}
.lg-submit{width:100%; border:0; border-radius:8px; padding:12px; cursor:pointer;
  background:#2B1E7E; color:#fff; font-family:var(--font-baloo),cursive; font-weight:800;
  font-size:16px; letter-spacing:.03em}
.lg-submit:disabled{opacity:.55; cursor:default}
.lg-err{background:#C8481F; color:#fff; border-radius:8px; padding:10px 12px;
  font-weight:600; font-size:13.5px; margin-bottom:14px}
.lg-ok{text-align:center; padding:8px 4px 2px}
.lg-ok .mail{font-size:38px; line-height:1}
.lg-ok h2{margin:10px 0 6px; color:#20153F; font-family:var(--font-baloo),cursive; font-weight:800; font-size:19px}
.lg-ok p{margin:0 0 10px; color:#4a3f6e; font-weight:600; font-size:13.5px; line-height:1.45}
.lg-foot{margin-top:14px; color:#B7ABDD; font-size:12px; text-align:center; line-height:1.4}
`;

// Errores de Supabase → castellano legible
function traducir(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Email o contraseña incorrectos.';
  if (m.includes('already registered')) return 'Ese email ya está registrado. Prueba a entrar.';
  if (m.includes('password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (m.includes('valid email') || m.includes('invalid format')) return 'Ese email no parece válido.';
  if (m.includes('email not confirmed')) return 'Tu email aún no está confirmado: revisa tu correo (y el spam).';
  if (m.includes('rate limit') || m.includes('too many')) return 'Demasiados intentos. Espera un momento y vuelve a probar.';
  if (m.includes('fetch') || m.includes('network')) return 'Sin conexión con el servidor. Comprueba tu red.';
  return 'No se pudo completar: ' + msg;
}

export default function LoginPage() {
  const [tab, setTab] = useState<'entrar' | 'registro'>('entrar');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [registrado, setRegistrado] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!supabaseConfigured) {
      setErr('Falta configuración del servidor (variables de Supabase). Avisa al administrador.');
      return;
    }
    if (pass.length < 6) {
      setErr('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setBusy(true);
    const supabase = getSupabase();
    try {
      if (tab === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) setErr(traducir(error.message));
        else window.location.assign('/');
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password: pass });
        if (error) setErr(traducir(error.message));
        // email ya registrado y confirmado: Supabase responde user "ofuscado" sin identities
        else if (data.user && (data.user.identities?.length ?? 0) === 0) setErr('Ese email ya está registrado. Prueba a entrar.');
        else setRegistrado(true);
      }
    } catch {
      setErr('Sin conexión con el servidor. Comprueba tu red.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="lg-wrap">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="lg-card">
        <div className="lg-head">
          <div className="blk b1" /><div className="blk b2" /><div className="blk b3" />
          <h1>Álbum Mundial 2026</h1>
          <small>OFFICIAL STICKER COLLECTION</small>
        </div>
        {registrado ? (
          <div className="lg-body">
            <div className="lg-ok">
              <div className="mail">📬</div>
              <h2>Revisa tu correo</h2>
              <p>
                Te hemos enviado un enlace para confirmar tu cuenta a<br /><b>{email}</b>.
                <br />Confírmala y vuelve aquí para entrar.
              </p>
              <button className="lg-submit" onClick={() => { setRegistrado(false); setTab('entrar'); }}>
                Ya la he confirmado — Entrar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="lg-tabs" role="tablist">
              <button role="tab" aria-selected={tab === 'entrar'} className={tab === 'entrar' ? 'on' : ''}
                onClick={() => { setTab('entrar'); setErr(''); }}>ENTRAR</button>
              <button role="tab" aria-selected={tab === 'registro'} className={tab === 'registro' ? 'on' : ''}
                onClick={() => { setTab('registro'); setErr(''); }}>REGISTRARSE</button>
            </div>
            <form className="lg-body" onSubmit={submit}>
              {err && <div className="lg-err" role="alert">{err}</div>}
              <label htmlFor="lg-email">EMAIL</label>
              <input id="lg-email" type="email" required autoComplete="email" inputMode="email"
                value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
              <label htmlFor="lg-pass">CONTRASEÑA</label>
              <input id="lg-pass" type="password" required minLength={6}
                autoComplete={tab === 'entrar' ? 'current-password' : 'new-password'}
                value={pass} onChange={(e) => setPass(e.target.value)}
                placeholder={tab === 'registro' ? 'Mínimo 6 caracteres' : '••••••••'} />
              <button className="lg-submit" type="submit" disabled={busy}>
                {busy ? 'Un momento…' : tab === 'entrar' ? 'ENTRAR' : 'CREAR CUENTA'}
              </button>
            </form>
          </>
        )}
      </div>
      <div className="lg-foot">
        Tu progreso (pegados y repes) se guarda en tu cuenta<br />y te sigue en cualquier dispositivo.
      </div>
    </div>
  );
}
