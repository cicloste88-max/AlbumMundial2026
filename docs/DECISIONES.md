# Log de decisiones por fase

Registro factual de qué se hizo, decisiones tomadas y verificación de cada fase.
El plan original F0–F4 está en `BUILD-PLAN.md` (verbatim). Las fases Fv3/Fv3.x llegaron
como paquetes posteriores del orquestador y sustituyen el camino F2/F3 del plan original
(los datos de las 48 selecciones llegaron validados por handoff, no por scraping).

---

## F0 — Scaffold + port fiel del Grupo A (`bd4d4a9`, `fe82285`)

- `create-next-app` (TS, App Router, sin Tailwind, sin src). Instaló **Next 16.2.9**
  (el plan asumía 15); único ajuste: `themeColor` → `export const viewport`.
- Ficheros del paquete copiados byte a byte (md5 verificado): `lib/teams.ts`,
  `lib/inventory.ts`, `components/AlbumPage.tsx`, `public/fonts/fwc26.otf`,
  `manifest.webmanifest`, `sw.js`, `supabase/schema.sql` (F1, sin usar).
- `globals.css`/`layout.tsx`/`page.tsx` según sección F0 del BUILD-PLAN
  (@font-face FWC 26, `:root`, Saira+Inter vía next/font).
- Verificación: pixel-fiel vs `Album-Stickers-2026.html` + lógica 30/31 (Playwright).

## F0 fixes — type-check estricto (`f24d29e`) y reset (`321f9e7`)

- **TS2367**: `Entry.state` no incluye `'falta'`; el fix aprobado por San fue el cast
  `(e?.state ?? 'falta') as 'falta'|'tengo'|'repe'` (la anotación simple no basta:
  el control-flow re-estrecha). Se eliminó el toggle `ignoreBuildErrors`.
- **Bug reset (race)**: N × `store.put(k, null)` sin await sobre la misma clave
  `album26_<code>` se pisaban (last-write-wins) → al recargar reaparecían cromos.
  Fix: `clear(code)` en la interfaz `InventoryStore` (borrado atómico del país),
  implementado también en el `SupabaseStore` comentado (F1). Suite 31/31.

## F0+ — repes hasta 5 + banderas reales (`cb8df24`)

- `MAX_REPES=5`; tap cicla `falta→tengo→repe1..5→falta`; stepper con tope.
- Banderas: de gradientes CSS a `<img>` desde Supabase Storage (`flags/<CODE>.png`)
  con `onerror` de degradación. `teams.ts.flag` quedó sin uso (no se borró).
- 15/15 + 31/31 de regresión.

## Fv3 — Libro 48 selecciones (`145ae2a`)

- Datos: `build_handoff k=album-data-v3` recuperado por **MCP de Supabase** (el sandbox
  no llega a supabase.co) en trozos base64; **md5 verificado contra el servidor**.
  Validación previa: 48/48/48, 864 jugadores, rosters 2-12/14-20, 12 grupos×4,
  spot-checks (RSA-15 SITHOLE, ARG-17 MESSI...), 8 typos intactos.
- `lib/album-data.ts` generado por script (no editado a mano).
- `AlbumBook.tsx`: 98 hojas ([0] portada, [1] grupos, 48×L/R), mismo patrón
  HTML-string + delegación; lazy mount ±2; persistencia `InventoryStore` intacta.
- Anti-invención: partidos solo rivales sin fechas salvo RSA (verif); fed/mlang solo
  RSA y NED. Suite 41/41.

## Fv3.1 — Paridad visual con la referencia v3 (`4a82274`)

- Gate visual de San sobre Fv3: FALLIDO (estética no aprobada). Se aplicó la referencia
  (`album-v3-css/js/svg`, md5 verificados x2) **byte-exacta**: CSS y SVG inyectados por
  script; builders portados 1:1 (mapeo `DATA→ALBUM_TEAMS`, `PAL→PALETAS`).
- Ajustes permitidos: `body` → wrapper `.ab-wrap` (fondo #191228) y fuentes
  'Baloo 2'/'Barlow Semi Condensed' → `var(--font-baloo)`/`var(--font-barlow)`
  (next/font, weights 600/700/800).
- Decisiones dentro del margen: shell `#nav/#chips/#book` reconstruido desde CSS/JS de
  referencia (no venía en el handoff); barra `.demo-bar` como chrome de app para
  conservar Pegados/REPES/reset (la referencia no los trae); sin animación de volteo
  (motor de rebuild conservado). TEAM PHOTO intercalada en la fila 11-12 (resolvió la
  duda de maquetación de Fv3). Suite 57/57.

## Fv3.2 — Spread desktop + centrado (`933b66b`)

- Feedback de San: descentrado en desktop y "dorso beige" visible (hoja volteada).
- Desktop ≥900px (matchMedia): vistas [portada][grupos][48×L|R]; cada vista renderiza
  solo sus 1-2 páginas; contenedor aspect 2016/1204, ancho min(92vw, 86vh·2016/1204),
  `.spine` central; **`--w` redefinido al ancho real de una página** para que las
  tipografías `calc(var(--w)*x)` de la referencia escalen. Navegación por vistas:
  chips, flechas, teclado, drag. Móvil <900px intacto.
- Sin animación de paso (el brief priorizaba layout; slide+fade queda como opción).
- QA: spread 24/24 (márgenes 64/64px, footers 44/45 · CUW, sin `.face.back`) +
  regresión móvil 57/57 + persistencia cross-modo (misma clave storage).

## Mantenimiento — memoria de proyecto y QA versionada

- `CLAUDE.md` (raíz), `docs/` (BUILD-PLAN verbatim, este log, PENDIENTES) y
  `album26/qa/` (suites Playwright portables + README). Las suites vivían en el
  scratchpad efímero de la sesión; ahora están versionadas.
