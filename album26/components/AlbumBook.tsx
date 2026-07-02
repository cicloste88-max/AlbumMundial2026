'use client';
// ============================================================
// AlbumBook.tsx — Motor v3: libro de 98 hojas (48 selecciones).
// Mismo patrón que AlbumPage.tsx: builders que devuelven HTML
// string + delegación de eventos sobre [data-*]. Persistencia
// vía lib/inventory.ts (InventoryStore) sin tocar su formato.
// Hojas: [0] portada · [1] índice de grupos · [2..97] 48 pliegos
// de equipo × 2 hojas (L: slots 1-10 · R: slots 11-20).
// Tema por equipo: --frame/--deep/--head inline en el pliego;
// derivados SOLO con color-mix (cero estilos por equipo).
// ============================================================
import { useCallback, useEffect, useRef, useState } from 'react';
import { ORDER, PALETAS, ALBUM_TEAMS, VERIF } from '@/lib/album-data';
import { getStore, type InvMap, type Entry } from '@/lib/inventory';

const store = getStore();
const MAX_REPES = 5;
const FLAG_BASE = 'https://cmyfyswystjgzdwbqyyb.supabase.co/storage/v1/object/public/flags/';
const TOTAL_PAGES = 2 + ORDER.length * 2; // 98

const esc = (s: unknown) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// grupos A..L -> códigos en orden de aparición
const GROUPS: Record<string, string[]> = {};
for (const c of ORDER) (GROUPS[ALBUM_TEAMS[c].grupo] ||= []).push(c);
const GROUP_LETTERS = Object.keys(GROUPS).sort();

const teamIndexForPage = (p: number) => (p >= 2 ? Math.floor((p - 2) / 2) : -1);
const pageForTeam = (code: string) => 2 + 2 * ORDER.indexOf(code);
const codesForRange = (p: number): string[] => {
  const out = new Set<string>();
  for (let q = p - 2; q <= p + 2; q++) {
    const i = teamIndexForPage(q);
    if (i >= 0 && i < ORDER.length) out.add(ORDER[i]);
  }
  return [...out];
};

const flagImg = (code: string) =>
  `<img src="${FLAG_BASE}${code}.png" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.style.visibility='hidden'">`;

// ---------- CSS del componente (derivados por color-mix) ----------
const CSS = `
.ab-nav{position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:6px;padding:10px 10px 8px;background:#F4F1E6;}
.ab-arrow{border:none;width:34px;height:34px;border-radius:10px;background:rgba(0,0,0,.07);color:#4A5163;font-size:16px;cursor:pointer;flex-shrink:0;line-height:1;}
.ab-chips{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;flex:1;}
.ab-chips::-webkit-scrollbar{display:none;}
.ab-chip{border:none;cursor:pointer;border-radius:9px;padding:7px 9px;background:#E7E3D6;color:#8A8474;font-family:var(--font-fifa);font-size:11px;letter-spacing:.03em;flex-shrink:0;-webkit-tap-highlight-color:transparent;}
.ab-chip.on{color:#fff;}
.ab-sheet{padding:10px 14px 18px;min-height:760px;background:color-mix(in srgb,var(--frame) 9%,white);}
.ab-head-row{display:flex;align-items:center;gap:11px;}
.ab-flag{width:46px;height:32px;border-radius:5px;overflow:hidden;flex-shrink:0;border:1px solid color-mix(in srgb,var(--frame) 40%,black);box-shadow:0 1px 4px rgba(0,0,0,.2);}
.ab-country{font-family:var(--font-fifa);font-size:29px;line-height:.9;color:var(--head);}
.ab-groupline{font-family:var(--font-display);font-weight:800;font-size:10px;letter-spacing:.16em;margin-top:3px;color:color-mix(in srgb,var(--deep) 75%,black);}
.ab-fed{font-family:var(--font-display);font-weight:700;font-size:11px;line-height:1.2;margin-top:6px;color:color-mix(in srgb,var(--deep) 85%,black);}
.ab-mlang{font-size:8.5px;line-height:1.35;margin-top:4px;color:color-mix(in srgb,var(--frame) 55%,black);}
.ab-prog{display:flex;align-items:center;gap:10px;margin-top:12px;}
.ab-prog-label{font-family:var(--font-display);font-weight:700;font-size:12px;color:color-mix(in srgb,var(--deep) 85%,black);}
.ab-prog-pct{font-family:var(--font-numeric);font-weight:800;font-size:13px;color:color-mix(in srgb,var(--deep) 90%,black);}
.ab-track{height:8px;border-radius:99px;overflow:hidden;background:color-mix(in srgb,var(--frame) 22%,white);}
.ab-fill{height:100%;border-radius:99px;background:var(--frame);transition:width .35s ease;}
.ab-repebox{text-align:center;padding:4px 10px;border-radius:10px;background:rgba(227,6,19,.09);min-width:42px;flex-shrink:0;}
.ab-reset{border:none;background:rgba(0,0,0,.06);color:#4A5163;width:32px;height:32px;border-radius:10px;font-size:14px;cursor:pointer;flex-shrink:0;}
.ab-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px;}
.ab-tile{position:relative;aspect-ratio:49/65;border-radius:9px;overflow:hidden;cursor:pointer;-webkit-tap-highlight-color:transparent;}
.ab-tile.falta{background:color-mix(in srgb,var(--frame) 12%,white);border:2px dashed color-mix(in srgb,var(--frame) 38%,white);color:color-mix(in srgb,var(--frame) 45%,black);}
.ab-tile.puesto{background:var(--frame);color:#fff;box-shadow:0 1px 3px rgba(0,0,0,.18);}
.ab-tile.puesto .ab-num{color:color-mix(in srgb,var(--frame) 18%,white);}
.ab-num{font-family:var(--font-display);font-weight:800;font-size:21px;line-height:1;text-align:center;margin-top:16%;}
.ab-code-sm{font-family:var(--font-display);font-weight:800;font-size:10px;letter-spacing:.08em;text-align:center;opacity:.8;}
.ab-names{position:absolute;bottom:12%;left:2px;right:2px;text-align:center;pointer-events:none;}
.ab-nm1{font-family:var(--font-display);font-weight:600;font-size:8.5px;line-height:1.1;opacity:.92;}
.ab-nm2{font-family:var(--font-display);font-weight:800;font-size:10.5px;line-height:1.1;letter-spacing:.01em;}
.ab-tile.foil.puesto{background:linear-gradient(135deg,color-mix(in srgb,var(--frame) 25%,white) 0%,color-mix(in srgb,var(--frame) 62%,white) 38%,var(--frame) 72%,color-mix(in srgb,var(--frame) 45%,black) 100%);border:2px solid color-mix(in srgb,var(--frame) 30%,white);}
.ab-foil-code{font-family:var(--font-fifa);font-size:23px;line-height:1;text-align:center;margin-top:34%;filter:drop-shadow(0 1px 1px rgba(0,0,0,.25));}
.ab-tile.falta .ab-foil-code{filter:none;}
.ab-foil-cap{position:absolute;bottom:12%;left:0;right:0;text-align:center;font-family:var(--font-display);font-weight:800;font-size:9px;letter-spacing:.14em;}
.ab-photo{grid-column:1/-1;aspect-ratio:65/49;}
.ab-photo .ab-num{margin-top:6%;}
.ab-photo-cap{position:absolute;bottom:10%;left:0;right:0;text-align:center;pointer-events:none;}
.ab-photo-cap .t{font-family:var(--font-fifa);font-size:15px;letter-spacing:.05em;line-height:1;}
.ab-photo-cap .p{font-family:var(--font-display);font-weight:800;font-size:10px;letter-spacing:.12em;margin-top:4px;opacity:.85;}
.ab-check{position:absolute;top:6px;left:6px;z-index:3;width:18px;height:18px;border-radius:50%;background:color-mix(in srgb,var(--frame) 55%,black);color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;box-shadow:0 1px 2px rgba(0,0,0,.25);}
.ab-xn{position:absolute;top:6px;right:6px;z-index:3;background:#E30613;color:#fff;font-family:var(--font-numeric);font-weight:800;font-size:10px;padding:2px 6px;border-radius:7px;box-shadow:0 1px 3px rgba(0,0,0,.28);}
.ab-step{position:absolute;bottom:6px;left:0;right:0;display:flex;justify-content:center;z-index:4;}
.ab-step>div{display:flex;align-items:center;gap:5px;background:rgba(0,0,0,.28);border-radius:9px;padding:2px;}
.ab-step button{border:none;background:#fff;width:21px;height:21px;border-radius:7px;font-size:14px;font-weight:800;color:#1F2433;cursor:pointer;line-height:1;}
.ab-step span{font-family:var(--font-numeric);font-weight:800;font-size:13px;color:#fff;min-width:14px;text-align:center;}
.ab-box{margin-top:14px;border-radius:14px;padding:12px 14px;position:relative;overflow:hidden;}
.ab-box.grp{background:var(--frame);color:#fff;}
.ab-box.grp .big26{position:absolute;right:-14px;bottom:-34px;font-family:var(--font-fifa);font-size:100px;line-height:.7;color:rgba(255,255,255,.10);pointer-events:none;}
.ab-box-title{font-family:var(--font-fifa);font-size:17px;letter-spacing:.02em;position:relative;z-index:1;}
.ab-gchips{display:flex;gap:7px;margin-top:9px;position:relative;z-index:1;}
.ab-gchip{border:none;cursor:pointer;display:flex;align-items:center;gap:5px;background:rgba(255,255,255,.16);border-radius:8px;padding:5px 8px;color:#fff;-webkit-tap-highlight-color:transparent;}
.ab-gchip.me{background:rgba(255,255,255,.34);}
.ab-gchip .f{width:18px;height:12px;border-radius:2px;overflow:hidden;border:1px solid rgba(255,255,255,.45);}
.ab-gchip .c{font-family:var(--font-display);font-weight:800;font-size:11px;letter-spacing:.03em;}
.ab-box.mat{background:color-mix(in srgb,var(--frame) 15%,white);color:color-mix(in srgb,var(--deep) 88%,black);}
.ab-match{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid color-mix(in srgb,var(--frame) 25%,white);}
.ab-match:last-child{border-bottom:none;}
.ab-match .f{width:20px;height:14px;border-radius:2px;overflow:hidden;border:1px solid rgba(0,0,0,.14);flex-shrink:0;}
.ab-match .n{font-family:var(--font-display);font-weight:700;font-size:11px;}
.ab-match .n b{font-weight:800;}
.ab-match .d{font-size:9px;margin-top:1px;color:color-mix(in srgb,var(--frame) 50%,black);}
.ab-quali{margin-top:8px;}
.ab-quali .q{font-family:var(--font-display);font-weight:700;font-size:10.5px;padding:3px 0;}
.ab-foot{display:flex;align-items:center;justify-content:space-between;margin-top:16px;}
.ab-foot .pg{font-family:var(--font-display);font-weight:800;font-size:10px;letter-spacing:.16em;color:color-mix(in srgb,var(--frame) 50%,black);}
.ab-foot .cd{font-family:var(--font-fifa);font-size:22px;line-height:1;color:var(--head);}
.ab-cover{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;min-height:780px;padding:24px;background:#20351F;color:#F4F1E6;}
.ab-cover .b26{font-family:var(--font-fifa);font-size:150px;line-height:.8;color:#E9C46A;filter:drop-shadow(0 2px 2px rgba(0,0,0,.35));}
.ab-cover .t1{font-family:var(--font-fifa);font-size:33px;margin-top:18px;letter-spacing:.02em;}
.ab-cover .t2{font-family:var(--font-display);font-weight:800;font-size:11px;letter-spacing:.22em;margin-top:10px;opacity:.8;}
.ab-cover button{border:none;cursor:pointer;margin-top:26px;border-radius:12px;padding:12px 22px;background:#E9C46A;color:#20351F;font-family:var(--font-fifa);font-size:14px;letter-spacing:.04em;}
.ab-index{padding:12px 14px 20px;min-height:780px;background:#F4F1E6;}
.ab-index-title{font-family:var(--font-fifa);font-size:27px;color:#1F2433;padding:6px 0 2px;}
.ab-igroup{margin-top:12px;background:#fff;border-radius:12px;padding:10px 12px;box-shadow:0 1px 2px rgba(0,0,0,.08);}
.ab-igroup .g{font-family:var(--font-fifa);font-size:14px;color:#4A5163;}
.ab-igroup .row{display:flex;gap:7px;margin-top:8px;}
.ab-ichip{flex:1;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;border-radius:9px;padding:7px 2px;background:#F4F1E6;-webkit-tap-highlight-color:transparent;}
.ab-ichip .f{width:24px;height:16px;border-radius:2px;overflow:hidden;border:1px solid rgba(0,0,0,.14);}
.ab-ichip .c{font-family:var(--font-fifa);font-size:11px;color:#4A5163;letter-spacing:.03em;}
`;

// ---------- estado de un cromo ----------
function tileState(inv: InvMap, key: string): { st: 'falta' | 'tengo' | 'repe'; repes: number } {
  const e: Entry | undefined = inv[key];
  const st = (e?.state ?? 'falta') as 'falta' | 'tengo' | 'repe';
  return { st, repes: e?.repes ?? 0 };
}

function overlaysHTML(key: string, st: 'falta' | 'tengo' | 'repe', repes: number): string {
  const check = st === 'tengo' ? `<div class="ab-check">✓</div>` : '';
  const badge = st === 'repe' ? `<div class="ab-xn">×${repes}</div>` : '';
  const step = st === 'repe'
    ? `<div class="ab-step"><div><button data-act="dec" data-key="${key}">−</button><span>${repes}</span><button data-act="inc" data-key="${key}">+</button></div></div>`
    : '';
  return check + badge + step;
}

// ---------- tiles ----------
function tileHTML(code: string, slot: number, inv: InvMap): string {
  const key = `${code}-${slot}`;
  const { st, repes } = tileState(inv, key);
  const stateCls = st === 'falta' ? 'falta' : 'puesto';

  if (slot === 1) {
    // badge foil del equipo (sin nombre)
    return `<div data-tile data-key="${key}" class="ab-tile foil ${stateCls}">` +
      `<div class="ab-foil-code">${code}</div>` +
      `<div class="ab-foil-cap">ESCUDO</div>` +
      overlaysHTML(key, st, repes) + `</div>`;
  }
  if (slot === 13) {
    // TEAM PHOTO apaisada (aspecto invertido, ocupa el ancho)
    const pais = ALBUM_TEAMS[code].pais;
    return `<div data-tile data-key="${key}" class="ab-tile ab-photo ${stateCls}">` +
      `<div class="ab-num">13</div>` +
      `<div class="ab-photo-cap"><div class="t">TEAM PHOTO</div><div class="p">${esc(pais)}</div></div>` +
      overlaysHTML(key, st, repes) + `</div>`;
  }
  const r = ALBUM_TEAMS[code].roster[String(slot)];
  const nombre = r ? r[0] : '';
  const apellido = r ? r[1] : '';
  const names = st === 'repe' ? '' :
    `<div class="ab-names">${nombre ? `<div class="ab-nm1">${esc(nombre)}</div>` : ''}<div class="ab-nm2">${esc(apellido)}</div></div>`;
  return `<div data-tile data-key="${key}" class="ab-tile ${stateCls}">` +
    `<div class="ab-num">${slot}</div><div class="ab-code-sm">${code}</div>` +
    names + overlaysHTML(key, st, repes) + `</div>`;
}

// ---------- hojas de equipo ----------
function themeStyle(code: string): string {
  const p = PALETAS[code];
  return `--frame:${p.frame};--deep:${p.deep};--head:${p.head};`;
}

function headerHTML(code: string): string {
  const t = ALBUM_TEAMS[code];
  const v = VERIF[code];
  const fed = v?.fed ? `<div class="ab-fed">${esc(v.fed)}</div>` : '';
  const mlang = v?.mlang ? `<div class="ab-mlang">${esc(v.mlang)}</div>` : '';
  return `<div class="ab-head-row">` +
    `<div class="ab-flag">${flagImg(code)}</div>` +
    `<div><div class="ab-country">${esc(t.pais)}</div><div class="ab-groupline">GRUPO ${t.grupo} · MUNDIAL 2026</div></div>` +
    `</div>` + fed + mlang;
}

function teamLHTML(code: string, inv: InvMap): string {
  const t = ALBUM_TEAMS[code];
  let got = 0, repeTotal = 0;
  for (let s = 1; s <= 20; s++) {
    const e = inv[`${code}-${s}`];
    if (e) { got++; repeTotal += e.repes || 0; }
  }
  const pct = Math.round((got / 20) * 100);
  const grid = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => tileHTML(code, s, inv)).join('');
  return `<div class="ab-sheet" style="${themeStyle(code)}">` +
    headerHTML(code) +
    `<div class="ab-prog">` +
      `<div style="flex:1;"><div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px;">` +
        `<span class="ab-prog-label">Pegados ${got}/20</span><span class="ab-prog-pct">${pct}%</span></div>` +
        `<div class="ab-track"><div class="ab-fill" style="width:${pct}%;"></div></div></div>` +
      `<div class="ab-repebox"><div style="font-family:var(--font-numeric);font-weight:800;font-size:15px;color:#E30613;line-height:1;">${repeTotal}</div>` +
        `<div style="font-family:var(--font-display);font-weight:800;font-size:8px;letter-spacing:.10em;color:#E30613;margin-top:2px;">REPES</div></div>` +
      `<button data-reset data-code="${code}" class="ab-reset" title="Reiniciar este equipo">↺</button>` +
    `</div>` +
    `<div class="ab-grid">${grid}</div>` +
    `</div>`;
}

function matchesHTML(code: string): string {
  const t = ALBUM_TEAMS[code];
  const v = VERIF[code];
  let rows: string;
  if (v?.partidos) {
    // partidos verificados (RSA): con fecha, resaltando al equipo
    rows = v.partidos.map((m) => {
      const an = m.hl === 'a' ? `<b>${esc(m.a)}</b>` : esc(m.a);
      const bn = m.hl === 'b' ? `<b>${esc(m.b)}</b>` : esc(m.b);
      return `<div class="ab-match"><div style="flex:1;"><div class="n">${an} – ${bn}</div><div class="d">${esc(m.fecha)}</div></div></div>`;
    }).join('');
  } else {
    // degradado elegante: solo rivales, sin fechas
    const rivals = GROUPS[t.grupo].filter((c) => c !== code);
    rows = rivals.map((c) =>
      `<div class="ab-match"><span class="f">${flagImg(c)}</span><div class="n">vs <b>${esc(ALBUM_TEAMS[c].pais)}</b></div></div>`
    ).join('');
  }
  const quali = v?.quali
    ? `<div class="ab-quali"><div class="ab-box-title" style="font-size:13px;">QUALIFIERS</div>${v.quali.map((q) => `<div class="q">${esc(q)}</div>`).join('')}</div>`
    : '';
  return `<div class="ab-box mat"><div class="ab-box-title">PARTIDOS · GRUPO ${t.grupo}</div>${rows}${quali}</div>`;
}

function teamRHTML(code: string, inv: InvMap): string {
  const t = ALBUM_TEAMS[code];
  const grid = tileHTML(code, 13, inv) +
    [11, 12, 14, 15, 16, 17, 18, 19, 20].map((s) => tileHTML(code, s, inv)).join('');
  const gchips = GROUPS[t.grupo].map((c) =>
    `<button data-goto="${pageForTeam(c)}" class="ab-gchip${c === code ? ' me' : ''}"><span class="f">${flagImg(c)}</span><span class="c">${c}</span></button>`
  ).join('');
  return `<div class="ab-sheet" style="${themeStyle(code)}">` +
    `<div class="ab-grid">${grid}</div>` +
    `<div class="ab-box grp"><div class="big26">26</div><div class="ab-box-title">GROUP ${t.grupo}</div><div class="ab-gchips">${gchips}</div></div>` +
    matchesHTML(code) +
    `<div class="ab-foot"><div class="pg">ÁLBUM · PÁG. ${t.pagina}–${t.pagina + 1}</div><div class="cd">${code}</div></div>` +
    `</div>`;
}

// ---------- portada e índice ----------
function coverHTML(): string {
  return `<div class="ab-cover">` +
    `<div class="b26">26</div>` +
    `<div class="t1">ÁLBUM MUNDIAL 2026</div>` +
    `<div class="t2">48 SELECCIONES · 960 CROMOS</div>` +
    `<button data-goto="1">ABRIR ÁLBUM</button>` +
    `</div>`;
}

function indexHTML(): string {
  const groups = GROUP_LETTERS.map((g) => {
    const chips = GROUPS[g].map((c) =>
      `<button data-goto="${pageForTeam(c)}" class="ab-ichip"><span class="f">${flagImg(c)}</span><span class="c">${c}</span></button>`
    ).join('');
    return `<div class="ab-igroup"><div class="g">GRUPO ${g}</div><div class="row">${chips}</div></div>`;
  }).join('');
  return `<div class="ab-index"><div class="ab-index-title">GRUPOS</div>${groups}</div>`;
}

// ---------- navegación ----------
function navHTML(page: number): string {
  const i = teamIndexForPage(page);
  const activeCode = i >= 0 && i < ORDER.length ? ORDER[i] : null;
  const chip = (goto: number, label: string, on: boolean, style = '') =>
    `<button data-goto="${goto}" class="ab-chip${on ? ' on' : ''}"${style ? ` style="${style}"` : ''}>${label}</button>`;
  const chips =
    chip(0, 'PORTADA', page === 0, page === 0 ? 'background:#20351F;' : '') +
    chip(1, 'GRUPOS', page === 1, page === 1 ? 'background:#1F2433;' : '') +
    ORDER.map((c) => chip(pageForTeam(c), c, c === activeCode, c === activeCode ? `background:${PALETAS[c].frame};` : '')).join('');
  return `<div class="ab-nav">` +
    `<button data-prev class="ab-arrow">‹</button>` +
    `<div class="ab-chips" data-chips>${chips}</div>` +
    `<button data-next class="ab-arrow">›</button>` +
    `</div>`;
}

function pageHTML(p: number, invs: Record<string, InvMap>): string {
  if (p === 0) return coverHTML();
  if (p === 1) return indexHTML();
  const i = teamIndexForPage(p);
  if (i < 0 || i >= ORDER.length) return '';
  const code = ORDER[i];
  const inv = invs[code] || {};
  return (p - 2) % 2 === 0 ? teamLHTML(code, inv) : teamRHTML(code, inv);
}

function bookHTML(page: number, invs: Record<string, InvMap>): string {
  let sheets = '';
  for (let p = 0; p < TOTAL_PAGES; p++) {
    // lazy mount: solo la hoja actual ±2 va montada; el resto placeholders vacíos
    const mounted = Math.abs(p - page) <= 2;
    const body = mounted ? pageHTML(p, invs) : '';
    sheets += `<div data-page="${p}"${p === page ? '' : ' style="display:none;"'}>${body}</div>`;
  }
  return `<style>${CSS}</style>` + navHTML(page) + `<div data-stage>${sheets}</div>`;
}

// ---------- componente ----------
export default function AlbumBook() {
  const ref = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [invs, setInvs] = useState<Record<string, InvMap>>({});

  // cargar inventario de los equipos montados (hoja actual ±2)
  useEffect(() => {
    for (const c of codesForRange(page)) {
      if (loadingRef.current.has(c)) continue;
      loadingRef.current.add(c);
      store.loadCountry(c).then((m) => setInvs((prev) => ({ ...prev, [c]: m })));
    }
  }, [page]);

  const apply = useCallback((key: string, entry: Entry | null) => {
    const code = key.split('-')[0];
    setInvs((prev) => {
      const m = { ...(prev[code] || {}) };
      if (entry) m[key] = entry; else delete m[key];
      return { ...prev, [code]: m };
    });
    store.put(key, entry);
  }, []);

  // render por innerHTML (mismo patrón que AlbumPage)
  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.innerHTML = bookHTML(page, invs);
    // centrar el chip activo en la barra
    const chips = el.querySelector('[data-chips]') as HTMLElement | null;
    const on = chips?.querySelector('.ab-chip.on') as HTMLElement | null;
    if (chips && on) chips.scrollLeft = on.offsetLeft - chips.clientWidth / 2 + on.clientWidth / 2;
  }, [page, invs]);

  // delegación de eventos + swipe
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const nav = (p: number) => setPage(Math.max(0, Math.min(TOTAL_PAGES - 1, p)));
    const onClick = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement;
      const act = target.closest('[data-act]') as HTMLElement | null;
      if (act) {
        ev.stopPropagation();
        const key = act.dataset.key!;
        const code = key.split('-')[0];
        const e = (invs[code] || {})[key];
        if (act.dataset.act === 'inc') apply(key, { state: 'repe', repes: Math.min(MAX_REPES, (e?.repes ?? 0) + 1) });
        else { const r = Math.max(0, (e?.repes ?? 0) - 1); apply(key, r > 0 ? { state: 'repe', repes: r } : { state: 'tengo', repes: 0 }); }
        return;
      }
      const goto = target.closest('[data-goto]') as HTMLElement | null;
      if (goto) { nav(parseInt(goto.dataset.goto!, 10)); return; }
      if (target.closest('[data-prev]')) { nav(page - 1); return; }
      if (target.closest('[data-next]')) { nav(page + 1); return; }
      const reset = target.closest('[data-reset]') as HTMLElement | null;
      if (reset) {
        const code = reset.dataset.code!;
        if (confirm('¿Reiniciar el inventario de ' + ALBUM_TEAMS[code].pais + '?')) {
          store.clear(code);
          setInvs((prev) => ({ ...prev, [code]: {} }));
        }
        return;
      }
      const tile = target.closest('[data-tile]') as HTMLElement | null;
      if (tile) {
        const key = tile.dataset.key!;
        const code = key.split('-')[0];
        const e = (invs[code] || {})[key];
        const st = (e?.state ?? 'falta') as 'falta' | 'tengo' | 'repe';
        const repes = e?.repes ?? 0;
        // falta -> tengo -> repe1 -> ... -> repe(MAX_REPES) -> falta
        if (st === 'falta') apply(key, { state: 'tengo', repes: 0 });
        else if (st === 'tengo') apply(key, { state: 'repe', repes: 1 });
        else if (repes < MAX_REPES) apply(key, { state: 'repe', repes: repes + 1 });
        else apply(key, null);
      }
    };
    let touchX = 0, touchY = 0;
    const onTouchStart = (ev: TouchEvent) => {
      touchX = ev.touches[0].clientX; touchY = ev.touches[0].clientY;
    };
    const onTouchEnd = (ev: TouchEvent) => {
      const dx = ev.changedTouches[0].clientX - touchX;
      const dy = ev.changedTouches[0].clientY - touchY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) nav(dx < 0 ? page + 1 : page - 1);
    };
    el.addEventListener('click', onClick);
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('click', onClick);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [page, invs, apply]);

  return <div ref={ref} className="page" id="app" />;
}
