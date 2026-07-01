'use client';
// ============================================================
// AlbumPage.tsx — Port fiel del diseño autónomo de San a Next.js.
// Estrategia de bajo riesgo: se conserva su render por innerHTML
// (markup/estilos idénticos) y solo se conmuta la persistencia
// (LocalStore en F0 -> SupabaseStore en F1) y el estado a React.
// Requiere en globals.css: @font-face "FWC 26" -> /fonts/fwc26.otf
// y las variables :root (ver BUILD-PLAN F0).
// ============================================================
import { useCallback, useEffect, useRef, useState } from 'react';
import { TEAMS, ORDER, FALTA, PREFIX, type Team } from '@/lib/teams';
import { getStore, type InvMap, type Entry } from '@/lib/inventory';

const store = getStore();
const esc = (s: unknown) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function tileHTML(t: Team, r: readonly [number, string, string], inv: InvMap): string {
  const num = r[0];
  const accent = num === 1 || num === 13;
  const key = t.code + '-' + num;
  const e: Entry | undefined = inv[key];
  const state = (e?.state ?? 'falta') as 'falta' | 'tengo' | 'repe';
  const isFalta = state === 'falta';
  const isRepe = state === 'repe';
  const pal = isFalta ? FALTA
    : accent ? { bg: t.accent, ink: t.accentInk, win: '#FFFFFF', motif: t.accentMotif }
             : { bg: t.team, ink: t.ink, win: t.win, motif: t.motif };
  const caption = accent ? (num === 1 ? 'ESCUDO' : 'ESPECIAL') : '';
  const showName = !accent && !!r[2] && !isRepe;
  const showCheck = state === 'tengo';

  let bottom = '';
  if (caption) bottom = `<div style="font-family:var(--font-fifa);font-size:11px;letter-spacing:.06em;line-height:1;">${caption}</div>`;
  else if (showName) bottom =
    `<div style="font-family:var(--font-display);font-weight:600;font-size:8.5px;line-height:1;opacity:.92;">${esc(r[1])}</div>` +
    `<div style="font-family:var(--font-display);font-weight:800;font-size:11px;line-height:1.08;letter-spacing:.01em;">${esc(r[2])}</div>`;

  const check = showCheck ? `<div style="position:absolute;top:6px;left:6px;z-index:3;width:18px;height:18px;border-radius:50%;background:${t.team};color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;box-shadow:0 1px 2px rgba(0,0,0,.25);">✓</div>` : '';
  const badge = isRepe ? `<div style="position:absolute;top:6px;right:6px;z-index:3;background:#E30613;color:#fff;font-family:var(--font-numeric);font-weight:800;font-size:10px;padding:2px 6px;border-radius:7px;box-shadow:0 1px 3px rgba(0,0,0,.28);">×${e?.repes ?? 0}</div>` : '';
  const stepper = isRepe ? `<div style="position:absolute;bottom:6px;left:0;right:0;display:flex;justify-content:center;z-index:4;"><div style="display:flex;align-items:center;gap:5px;background:rgba(0,0,0,.28);border-radius:9px;padding:2px;"><button data-act="dec" data-key="${key}" style="border:none;background:#fff;width:21px;height:21px;border-radius:7px;font-size:14px;font-weight:800;color:var(--ink-700);cursor:pointer;line-height:1;">−</button><span style="font-family:var(--font-numeric);font-weight:800;font-size:13px;color:#fff;min-width:14px;text-align:center;">${e?.repes ?? 0}</span><button data-act="inc" data-key="${key}" style="border:none;background:#fff;width:21px;height:21px;border-radius:7px;font-size:14px;font-weight:800;color:var(--ink-700);cursor:pointer;line-height:1;">+</button></div></div>` : '';

  return `<div data-tile data-key="${key}" style="position:relative;border-radius:9px;overflow:hidden;aspect-ratio:.73;cursor:pointer;-webkit-tap-highlight-color:transparent;background:${pal.bg};box-shadow:0 1px 2px rgba(0,0,0,.10);">` +
    `<div style="position:absolute;top:-8%;right:-24%;font-family:var(--font-fifa);font-size:104px;line-height:.74;color:${pal.motif};opacity:.45;display:flex;flex-direction:column;pointer-events:none;user-select:none;z-index:0;"><span>2</span><span>6</span></div>` +
    `<div style="position:absolute;inset:0;font-family:var(--font-fifa);font-size:100px;line-height:.7;color:${pal.win};display:flex;flex-direction:column;align-items:center;justify-content:center;transform:scaleX(1.16) translateY(-12%);pointer-events:none;user-select:none;z-index:1;filter:drop-shadow(0 1px 1px rgba(0,0,0,.12));"><span>2</span><span>6</span></div>` +
    `<div style="position:absolute;top:18%;left:0;right:0;text-align:center;z-index:2;pointer-events:none;color:${pal.ink};"><div style="font-family:var(--font-display);font-weight:800;font-size:14px;letter-spacing:.05em;line-height:1;">${t.code}</div><div style="font-family:var(--font-display);font-weight:800;font-size:17px;line-height:1.05;">${num}</div></div>` +
    `<div style="position:absolute;bottom:17%;left:2px;right:2px;text-align:center;z-index:2;pointer-events:none;color:${pal.ink};">${bottom}</div>` +
    check + badge + stepper +
  `</div>`;
}

function pageHTML(t: Team, inv: InvMap): string {
  const total = t.roster.length;
  let got = 0, repeTotal = 0;
  for (const r of t.roster) {
    const e = inv[t.code + '-' + r[0]];
    if (e) got++;
    if (e) repeTotal += e.repes || 0;
  }
  const pct = total ? Math.round((got / total) * 100) : 0;

  const tabs = ORDER.map((c) => {
    const tt = TEAMS[c]; const active = c === t.code;
    const bg = active ? tt.team : '#E7E3D6';
    const tcol = active ? (c === 'KOR' ? '#2C3576' : '#FFFFFF') : '#8A8474';
    return `<button data-country="${c}" style="flex:1;border:none;cursor:pointer;border-radius:11px;padding:8px 4px;display:flex;flex-direction:column;align-items:center;gap:3px;background:${bg};-webkit-tap-highlight-color:transparent;"><span style="width:22px;height:15px;border-radius:2px;background:${tt.flag};border:1px solid rgba(0,0,0,.14);"></span><span style="font-family:var(--font-fifa);font-size:12px;letter-spacing:.03em;color:${tcol};">${c}</span></button>`;
  }).join('');

  const groupChips = ORDER.map((c) => {
    const tt = TEAMS[c];
    return `<div style="display:flex;align-items:center;gap:5px;background:rgba(255,255,255,.16);border-radius:8px;padding:5px 8px;"><span style="width:18px;height:12px;border-radius:2px;background:${tt.flag};border:1px solid rgba(255,255,255,.45);"></span><span style="font-family:var(--font-display);font-weight:800;font-size:11px;letter-spacing:.03em;">${c}</span></div>`;
  }).join('');

  const grid = t.roster.map((r) => tileHTML(t, r, inv)).join('');

  return '' +
    `<div style="display:flex;gap:6px;padding:12px 14px 8px;position:sticky;top:0;z-index:20;background:#F4F1E6;">${tabs}</div>` +
    `<div style="position:relative;padding:8px 18px 6px;overflow:hidden;"><div style="font-family:var(--font-fifa);font-size:30px;line-height:.84;color:${t.titleA};letter-spacing:.01em;">${PREFIX}</div><div style="font-family:var(--font-fifa);font-size:46px;line-height:.86;color:${t.titleB};letter-spacing:.005em;margin-top:1px;">${t.name}</div><div style="display:flex;align-items:center;gap:11px;margin-top:13px;"><div style="width:44px;height:31px;border-radius:5px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.22);flex-shrink:0;background:${t.flag};border:1px solid rgba(0,0,0,.10);"></div><div style="font-family:var(--font-display);font-weight:700;font-size:12.5px;line-height:1.22;color:${t.ink};">${t.fed}</div></div></div>` +
    `<div style="padding:12px 18px 4px;display:flex;align-items:center;gap:12px;"><div style="flex:1;"><div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;"><span style="font-family:var(--font-display);font-weight:700;font-size:12px;letter-spacing:.02em;color:var(--ink-600);">Pegados ${got}/${total}</span><span style="font-family:var(--font-numeric);font-weight:800;font-size:13px;color:${t.ink};">${pct}%</span></div><div style="height:8px;border-radius:99px;background:rgba(0,0,0,.10);overflow:hidden;"><div style="height:100%;border-radius:99px;background:${t.team};transition:width .35s ease;width:${pct}%;"></div></div></div><div style="text-align:center;padding:5px 11px;border-radius:10px;background:rgba(227,6,19,.09);min-width:46px;"><div style="font-family:var(--font-numeric);font-weight:800;font-size:16px;color:#E30613;line-height:1;">${repeTotal}</div><div style="font-family:var(--font-display);font-weight:800;font-size:8px;letter-spacing:.10em;color:#E30613;margin-top:2px;">REPES</div></div><button data-reset style="border:none;background:rgba(0,0,0,.06);color:var(--ink-500);width:34px;height:34px;border-radius:10px;font-size:15px;cursor:pointer;flex-shrink:0;" title="Reiniciar esta página">↺</button></div>` +
    `<div style="display:flex;gap:15px;padding:8px 18px 12px;"><div style="display:flex;align-items:center;gap:5px;"><span style="width:11px;height:11px;border-radius:3px;border:2px dashed #C5BFB0;"></span><span style="font-size:10px;color:var(--ink-400);font-weight:700;">Falta</span></div><div style="display:flex;align-items:center;gap:5px;"><span style="width:11px;height:11px;border-radius:3px;background:${t.team};"></span><span style="font-size:10px;color:var(--ink-400);font-weight:700;">Tengo</span></div><div style="display:flex;align-items:center;gap:5px;"><span style="width:11px;height:11px;border-radius:3px;background:#E30613;"></span><span style="font-size:10px;color:var(--ink-400);font-weight:700;">Repe</span></div><span style="margin-left:auto;font-size:10px;color:var(--ink-300);font-weight:600;">toca para cambiar</span></div>` +
    `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:0 14px;">${grid}</div>` +
    `<div style="margin:16px 14px 0;border-radius:14px;background:${t.team};padding:14px 16px;color:#fff;position:relative;overflow:hidden;"><div style="position:absolute;right:-18px;bottom:-40px;font-family:var(--font-fifa);font-size:120px;line-height:.7;color:rgba(255,255,255,.10);pointer-events:none;">26</div><div style="font-family:var(--font-fifa);font-size:20px;letter-spacing:.02em;position:relative;z-index:1;">GRUPO ${t.group}</div><div style="display:flex;gap:8px;margin-top:10px;position:relative;z-index:1;">${groupChips}</div></div>` +
    `<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 18px 6px;"><div style="font-family:var(--font-display);font-weight:800;font-size:10px;letter-spacing:.16em;color:var(--ink-400);">CAMINO A 2026</div><div style="font-family:var(--font-fifa);font-size:24px;line-height:1;color:${t.ink};">${t.code}</div></div>`;
}

export default function AlbumPage() {
  const ref = useRef<HTMLDivElement>(null);
  const [cur, setCur] = useState<string>('MEX');
  const [inv, setInv] = useState<InvMap>({});

  useEffect(() => {
    try { const s = localStorage.getItem('album26_cur'); if (s && TEAMS[s]) setCur(s); } catch {}
  }, []);

  useEffect(() => {
    let alive = true;
    store.loadCountry(cur).then((m) => { if (alive) setInv(m); });
    try { localStorage.setItem('album26_cur', cur); } catch {}
    return () => { alive = false; };
  }, [cur]);

  useEffect(() => { if (ref.current) ref.current.innerHTML = pageHTML(TEAMS[cur], inv); }, [cur, inv]);

  const apply = useCallback((sticker: string, entry: Entry | null) => {
    setInv((prev) => { const n = { ...prev }; if (entry) n[sticker] = entry; else delete n[sticker]; return n; });
    store.put(sticker, entry);
  }, []);

  useEffect(() => {
    const el = ref.current; if (!el) return;
    const onClick = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement;
      const act = target.closest('[data-act]') as HTMLElement | null;
      if (act) {
        ev.stopPropagation();
        const key = act.dataset.key!; const e = inv[key];
        if (act.dataset.act === 'inc') apply(key, { state: 'repe', repes: (e?.repes ?? 0) + 1 });
        else { const r = Math.max(0, (e?.repes ?? 0) - 1); apply(key, r > 0 ? { state: 'repe', repes: r } : { state: 'tengo', repes: 0 }); }
        return;
      }
      const country = target.closest('[data-country]') as HTMLElement | null;
      if (country) { setCur(country.dataset.country!); return; }
      if (target.closest('[data-reset]')) {
        if (confirm('¿Reiniciar el inventario de ' + TEAMS[cur].name + '?')) {
          for (const k of Object.keys(inv)) store.put(k, null);
          setInv({});
        }
        return;
      }
      const tile = target.closest('[data-tile]') as HTMLElement | null;
      if (tile) {
        const key = tile.dataset.key!; const e = inv[key];
        const order: Record<string, 'tengo' | 'repe' | 'falta'> = { falta: 'tengo', tengo: 'repe', repe: 'falta' };
        const next = order[e?.state ?? 'falta'];
        if (next === 'falta') { apply(key, null); return; }
        const repes = next === 'repe' ? Math.max(e?.repes ?? 0, 1) : (e?.repes ?? 0);
        apply(key, { state: next, repes });
      }
    };
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  }, [cur, inv, apply]);

  return <div ref={ref} className="page" id="app" />;
}
