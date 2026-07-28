'use client';
// Fv4.4 — /s: vista pública de una colección compartida (QR/enlace nativo).
// El payload viaja en el FRAGMENT (#v1.…): jamás llega al servidor. Sin cuenta
// se pinta la lista legible; con sesión e hidratación, además el cruce local.
import { useEffect, useState } from 'react';
import { getStore } from '@/lib/inventory';
import { supabaseConfigured } from '@/lib/supabase/client';
import type { NativePayload, Cruce } from '@/lib/share';

const CSS = `
.sv-wrap{min-height:100vh; background:#1E1B33; display:flex; flex-direction:column; align-items:center;
  padding:calc(18px + env(safe-area-inset-top, 0px)) 14px calc(24px + env(safe-area-inset-bottom, 0px));
  font-family:var(--font-barlow),system-ui,sans-serif}
.sv-card{width:min(94vw,560px); background:#F6F3EC; border-radius:12px; overflow:hidden;
  box-shadow:0 14px 26px rgba(0,0,0,.5)}
.sv-head{background:#2B1E7E; padding:16px 18px; color:#fff}
.sv-head h1{margin:0; font-family:var(--font-baloo),cursive; font-weight:800; font-size:19px; line-height:1.15}
.sv-head small{display:block; opacity:.8; font-weight:700; font-size:11.5px; letter-spacing:.14em; margin-top:4px}
.sv-body{padding:16px 18px; color:#20153F}
.sv-stats{font-weight:700; font-size:14px; text-align:center; margin-bottom:12px}
.sv-stats b{font-family:var(--font-baloo),cursive; font-size:17px}
.sv-sec{font-weight:800; font-size:12px; letter-spacing:.08em; color:#6C5FA0; margin:12px 0 5px}
.sv-lines div{background:#fff; border-radius:6px; padding:6px 10px; margin-bottom:4px;
  font-weight:600; font-size:13px; box-shadow:0 1px 2px rgba(32,21,63,.10)}
.sv-err{background:#C8481F; color:#fff; border-radius:8px; padding:12px; font-weight:700; text-align:center}
.sv-note{color:#6C5FA0; font-weight:600; font-size:12px; text-align:center; margin-top:10px}
.sv-open{display:block; text-align:center; background:#E8A81E; color:#20153F; text-decoration:none;
  font-family:var(--font-baloo),cursive; font-weight:800; font-size:15px; border-radius:8px; padding:11px; margin-top:14px}
`;

type View = {
  alias: string; fecha: string; pegados: number; faltan: number; repes: number;
  lFaltan: string[]; lRepes: string[];
  cruce?: { leDoy: string[]; meDa: string[]; nDoy: number; nDa: number };
};

export default function SharedView() {
  const [view, setView] = useState<View | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const share = await import('@/lib/share');
        const d: NativePayload = await share.decodeNative(window.location.hash);
        const repesTotal = d.r.reduce((a, [, c]) => a + c, 0);
        const v: View = {
          alias: d.u || 'Coleccionista',
          fecha: d.t ? new Date(d.t * 1000).toLocaleDateString('es-ES') : '',
          pegados: 992 - d.f.length, faltan: d.f.length, repes: repesTotal,
          lFaltan: share.lineasCruce(d.f.map((i) => ({ slot: share.CANON[i], count: 0 }))),
          lRepes: share.lineasCruce(d.r.map(([i, c]) => ({ slot: share.CANON[i], count: c }))),
        };
        // con sesión e hidratación: cruce local (falla en silencio sin cuenta)
        if (supabaseConfigured) {
          try {
            const invs = await getStore().loadAll();
            const cr: Cruce = share.cruce(share.shareSetsOf(invs), { faltan: new Set(d.f), repes: new Map(d.r) });
            v.cruce = {
              leDoy: share.lineasCruce(cr.leDoy), meDa: share.lineasCruce(cr.meDa),
              nDoy: cr.leDoy.length, nDa: cr.meDa.length,
            };
          } catch { /* sin sesión: solo lectura */ }
        }
        setView(v);
      } catch {
        setErr('Enlace no válido o incompleto. Pide al coleccionista que vuelva a compartir su QR.');
      }
    })();
  }, []);

  return (
    <div className="sv-wrap">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="sv-card">
        <div className="sv-head">
          <h1>{view ? 'Colección de ' + view.alias : 'Colección compartida'}</h1>
          <small>ÁLBUM MUNDIAL 2026{view?.fecha ? ' · ' + view.fecha : ''}</small>
        </div>
        <div className="sv-body">
          {err && <div className="sv-err">{err}</div>}
          {!err && !view && <div className="sv-stats">Leyendo colección…</div>}
          {view && (
            <>
              <div className="sv-stats"><b>{view.pegados}/992</b> pegados · faltan <b>{view.faltan}</b> · <b>{view.repes}</b> repes</div>
              {view.cruce && (
                // Fv4.5: mismo orden y subtítulos que la hoja COMPARTIR —
                // primero lo que te ENTRA, después lo que DAS
                <>
                  <div className="sv-sec">TE PUEDE DAR ({view.cruce.nDa}) · sus repes que a ti te faltan</div>
                  <div className="sv-lines">{view.cruce.meDa.length ? view.cruce.meDa.map((l, i) => <div key={'m' + i}>{l}</div>) : <div>Nada por ahora</div>}</div>
                  <div className="sv-sec">LE PUEDES DAR ({view.cruce.nDoy}) · tus repes que le faltan</div>
                  <div className="sv-lines">{view.cruce.leDoy.length ? view.cruce.leDoy.map((l, i) => <div key={'d' + i}>{l}</div>) : <div>Nada por ahora</div>}</div>
                </>
              )}
              <div className="sv-sec">LE FALTAN ({view.faltan})</div>
              <div className="sv-lines">{view.lFaltan.length ? view.lFaltan.map((l, i) => <div key={'f' + i}>{l}</div>) : <div>¡Álbum completo!</div>}</div>
              <div className="sv-sec">SUS REPES</div>
              <div className="sv-lines">{view.lRepes.length ? view.lRepes.map((l, i) => <div key={'r' + i}>{l}</div>) : <div>Sin repes</div>}</div>
            </>
          )}
          <a className="sv-open" href="/">ABRIR MI ÁLBUM</a>
          <div className="sv-note">Los datos van dentro del enlace (#…): no se envían al servidor.</div>
        </div>
      </div>
    </div>
  );
}
