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

## Fv3.3 — Datos verificados 48 selecciones (fed/mlang/partidos/quali)

- Payload `build_handoff k=album-verif-48` (md5 d4f68527, 21027 chars) verificado
  server-side y local. Validación previa: 48 equipos = ORDER, 48×3 partidos con
  "fecha – estadio" y hl coherente con la forma FIFA del equipo, fed 42/48,
  mlang 47/48 (falta IRN), quali solo RSA.
- `lib/album-data.ts`: regenerada SOLO la sección VERIF por script (ORDER/PALETAS/
  ALBUM_TEAMS byte-idénticos; slots/jugadores/typos intactos).
- `AlbumBook.tsx`: SIN cambios — los builders Fv3.1 ya consumen VERIF con los
  tratamientos placeholder del diseño v3 (fed ausente → solo bandera; mlang
  ausente → 'mlang solo' con el país del dataset; quali ausente → filas vacías).
- QA: nueva suite qa/verify-fv33-verif.mjs (17 checks GT+placeholders). Dos checks
  de las suites previas asumían el degradado antiguo (GER/CUW "GROUP X — MATCH",
  ESP placeholder SPAIN) y se actualizaron al comportamiento con datos reales.
  17/17 + 57/57 + 24/24.

## Fv3.4 — Calidad visual: bloque GROUP + header L + fix CZE fed

- Dato primero: payload `album-verif-48` v2 (md5 049c9934) — CZE.fed corregida por GT
  fotográfico ("Fotbalová asociace České republiky"). Verificado server-side y local
  (reconstrucción + md5 idéntico); VERIF regenerado (resto byte-idéntico).
- Bloque GROUP (pág. R): de mini-banderas .gflag a tiles 2×2 `.gtile` rectangulares
  (misma forma que los cromos, sin clip — interpretación de "mismo clip-path": nuestros
  cromos no tienen clip-path): banda vertical izquierda ~22% en var(--deep) con el
  código rotado -90°, bandera object-fit:cover, overflow hidden, cero border-radius,
  tile del equipo propio con marco blanco max(3px, .007w). El índice de grupos
  (pageGrupos) conserva .gflag.
- Header L: WE ARE en --hd1 y país en --hd2 con jerarquía país>WE ARE (ratio cap
  8.5/13.5 → fuente 0.63×), fit-to-width JS (1 línea si cabe ≥62% del objetivo, si no
  2 líneas) + salvaguarda anti-overflow vertical de página. Bandera 3:2 al 29% de W con
  borde blanco .6%W, radio 4px y sombra; federación a la derecha en --hd1, fluye hasta
  el alto de la bandera SIN ellipsis (el line-clamp 3 truncaba justo la fed de CZE;
  "hasta 3 líneas" se cumple cuando cabe, feds largas fluyen — decisión documentada).
- QA: suite qa/verify-fv34-visual.mjs (15 checks: GT CZE, jerarquía/ratio/colores,
  bandera 29%/radio/borde, BIH ≤2 líneas, sin overflow, 0 border-radius 50%, banda 22%
  vertical, marco del propio, PAN contenida) + screenshots del gate en
  qa/screenshots/fv34/. fv31 (selectores .gtile/.gband) y fv33 (+check CZE → 18)
  actualizadas. 15/15 + 18/18 + 57/57 + 24/24.

## Fv3.5 — Banderas w640 con cache-bust + layout móvil quali/GROUP + QA geométrico

- **Cache-bust**: los PNG del bucket eran iconos circulares (causa raíz de los
  "círculos" del gate); San los sustituyó por rectangulares w640 (flagcdn) en el mismo
  path. `FLAGS_VERSION='2'` y `FLAG()` emite `flags/CODE.png?v=2` (todos los usos pasan
  por esa única función: header, tiles de grupo, índice de grupos). SUI es 1:1 de
  origen: con object-fit cover en 3:2 se recorta — correcto, no se "arregla".
- **GROUP en una línea**: `.gt` con nowrap + font `.038*--w` + line-height 1.1
  (antes `.05` partía "GROUP"/"X"). Como las proporciones son idénticas en todos los
  modos (todo escala con `--w`), el título también se partía en desktop (visible en el
  gate Fv3.4 aprobado); el fix aplica global y desktop queda en una línea.
- **Layout móvil (<900px)**: descubierto que la página L desbordaba en vertical
  (HAI: +44px TAMBIÉN en desktop — la salvaguarda de fitHeaders se rendía a las 6
  iteraciones, suelo 0.69×, insuficiente con país corto a wordmark pleno + fed de 3
  líneas): quali recortada y pill pisando la tabla. Fixes:
  - `.roadto` en columna (rótulo arriba): el rótulo se compone con `<span>` por palabra
    — desktop los apila (display:block, las 4 líneas de la referencia byte-intactas) y
    móvil los fluye en UNA línea legible (`.028*--w`, nowrap).
  - Reserva inferior del pill: `.inner{padding-bottom:.062*--w}` y la salvaguarda de
    fitHeaders en móvil mide contra el borde de CONTENIDO (scrollHeight satura en el
    padding-box y dejaba al contenido comerse la reserva).
  - Compactación móvil para caber (≈30px): bandera del header `.29→.22*--w`, márgenes
    weare/fed, rtable/rrow más prietos. Tope de la salvaguarda 6→14 iteraciones
    (las páginas que caben no entran al bucle y quedan idénticas).
- **QA geométrico** (`qa/verify-fv35-geo.mjs`, 360×740, HAI/CZE/PAN, 24 checks): sin
  solapes par a par (tolerancia 2px; `.bg` decorativos excluidos: sangran a propósito
  bajo overflow:hidden), GROUP 1 línea, sin desborde horizontal (.inner y documento),
  banderas `naturalWidth>=600` + TODAS las URLs con `?v=2`. Las requests de `flags/` se
  interceptan con un fixture PNG w640 canvas (sandbox sin red a supabase.co): valida el
  mecanismo; el CDN real se valida en prod. Regresión: 24/24 + 57/57 + 24/24 + 18/18 +
  15/15 (screenshots del gate fv34 regenerados: GROUP a una línea).

## Mantenimiento — memoria de proyecto y QA versionada

- `CLAUDE.md` (raíz), `docs/` (BUILD-PLAN verbatim, este log, PENDIENTES) y
  `album26/qa/` (suites Playwright portables + README). Las suites vivían en el
  scratchpad efímero de la sesión; ahora están versionadas.
