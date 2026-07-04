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

## Fv3.6 — Tiles GROUP re-proporcionados + PWA instalable + fix img vacías

- **Tiles GROUP** (gate fv35: banderas "achatadas" — los tiles verticales + cover solo
  enseñaban el centro): zona de bandera con aspect 4:3 FIJO + cover (recorte lateral
  ≤11% en 3:2, 0% en 4:3), banda de código al 20% (en `position:absolute`: como flex
  item, su texto vertical estiraba el tile por encima del alto 4:3 y deformaba la zona),
  tile ~1.66 apaisado. Escala: la fila del grupo pasa a `.grid.ggrp` con carril propio
  `--gbw` = 40% del ancho de página en móvil / 35% en desktop (QA: ≤42%); los tiles
  18-20 absorben el resto de la fila (algo menores que sus hermanos — trade-off del
  carril). `grid-auto-rows:auto` (el `1fr` de Fv3.4 estiraba). Conmutador
  `GROUP_FIT='cover43'|'fillsq'` — `fillsq` = alternativa fiel-imprenta (cuasi-cuadrado
  + object-fit fill, deformación leve): NO activa, San decide en el gate.
- **img vacías**: las 9 `<img>` sin src eran los `img.imgslot` placeholder del req #2
  (pausado) en las hojas montadas ±2 (tiles 2..10 de MEX L al abrir en portada). Ya no
  se emiten: render condicional cuando lleguen URLs reales (CSS intacto).
- **PWA instalable**: manifest completo (name "Álbum Mundial 2026", short_name
  "Álbum 26", standalone, colores `#1E1B33`, iconos 192/512 con URLs ABSOLUTAS del
  bucket `flags/icons/`, purpose "any maskable"; se retiró `orientation:portrait` del
  manifest F0 — bloquearía el spread apaisado en tablets instaladas). SW mínimo nuevo en
  `public/sw.js` (sustituye al F0 según brief): cache-first `/_next/static`,
  network-first documento con fallback a caché, cross-origin intacto (banderas NO se
  precachean). Registro inline en `layout.tsx` solo con `NODE_ENV=production`. Meta iOS:
  `icons.apple` (192 del bucket) + `appleWebApp`. `viewport.themeColor` alineado a
  `#1E1B33` (era el beige F0, inconsistente con el manifest nuevo).
- **QA**: `qa/verify-fv36-pwa.mjs` (14 checks: manifest 200 + campos + iconos cargan,
  SW registrado en prod-build, bloque ≤42% + zona bandera 1.30-1.36 + banda 20% en
  móvil y desktop, cero img sin src en portada/índice) con `serviceWorkers:'block'`
  en los contextos con `page.route` (también añadido a fv35-geo: el SW podría
  saltarse la interceptación). Screenshots del gate en `qa/screenshots/fv36/`.
  Regresión completa: 14/14 + 24/24 + 57/57 + 24/24 + 18/18 + 15/15.

## Fv3.7 — La parrilla manda: cromos 18-20 a tamaño completo, GROUP en 1 columna

- Gate fv36: los cromos 18/19/20 quedaron menores que el resto (trade-off del carril
  `.ggrp` al 40/35%, avisado en el status). San midió el álbum físico y corrigió la
  spec: **la parrilla de cromos manda** — todos los cromos de jugador de una página
  miden lo mismo y el bloque GROUP se adapta al hueco de UNA columna.
- Fix (cambio mínimo): `.grid.ggrp` deja de definir template propio y vuelve al grid
  base de 4 columnas; el bloque ocupa la columna 1 (izquierda) y 18-20 recuperan el
  ancho estándar. `--gbw` pasa a ≈ ancho de columna (`.2218*--w`) — todas las medidas
  internas del bloque (título, gap, banda) ya colgaban de esa variable. Bloque centrado
  en vertical (`align-self:center`; sobra altura: 115 vs 169 desktop). Se mantienen
  intactos: zona bandera 4:3 + cover, banda 20% absolute, `GROUP_FIT` conmutable.
- **Invariante duro nuevo** (regresión permanente): max/min de anchos de cromos de
  jugador de una cara ≤ 1.02 (slot 13 `.crest` excluido: apaisado por diseño), y
  bloque GROUP ≤ columna×1.15. `qa/verify-fv37-grid.mjs` (24 checks: L y R de
  MEX/HAI/CZE en 1280×800 y 360×740 + ratio bandera 1.30-1.36 + screenshots fv37/).
- Ajuste de suite (no de app): fv36 medía la banda contra el border-box del tile; con
  tiles pequeños el marco de 3px del `.me` pesa más (0.166) — ahora mide contra el
  content-box (0.20 exacto), que es la intención del check.
- Regresión completa: 24/24 (fv37) + 57/57 + 24/24 + 18/18 + 15/15 + 24/24 + 14/14.

## Fv3.8 — Compatibilidad iOS/Safari: presupuesto de composición del libro móvil

- Reporte de San: Safari iOS (moderno) dejaba de cargar la app con "problema
  repetidamente" — firma de crash de WebContent por memoria. Diagnóstico medido
  (CDP LayerTree, viewport iPhone @3x): el libro móvil montaba SIEMPRE las 98 hojas
  como capas 3D (196 caras con backface-visibility + preserve-3d + rotateY ⇒ capa de
  composición cada una) y `.book` llevaba `filter:drop-shadow` que rasteriza a
  textura el subárbol 3D completo. En Chromium: **307 capas / ~189MB** de backing
  tras 4 interacciones; WebKit agrupa peor ⇒ peor. Además cada tap reconstruía el
  innerHTML de las 98 hojas (churn de capas en cada interacción).
- Fix (restricción de San: cero diferencia visual):
  - `bookHTML` monta SOLO las hojas actual ±2 (3-5): las demás nunca son visibles
    (cubiertas por z-order o volteadas, sin animación de paso). La fórmula de
    z-index ya usaba valores absolutos por índice ⇒ apilamiento intacto. El rebuild
    por tap pasa de 98 hojas a ≤5 (mitiga el churn sin tocar el patrón del motor).
  - Sombra: el `drop-shadow` pasa a un `::before` plano con la misma silueta
    (radius 5px) — mismo filtro, render idéntico, sin rasterizar el 3D. El primer
    intento con `box-shadow` se descartó: el halo difumina distinto y el diff de
    píxeles lo delató (~0.4% con delta alto en el anillo). El drop-shadow del
    spread desktop se conserva (1-3 vistas montadas, y en las vistas de página
    suelta el box-shadow sí cambiaría la silueta).
  - `sw.js` endurecido para Safari: no se cachean respuestas de navegación
    redirigidas (Safari se niega a servirlas luego), nunca `respondWith(undefined)`
    offline (Response 503 texto), solo se cachea `res.ok`; caché `album26-v3`.
- Verificación: diff de píxeles before/after con capturas deterministas — desktop
  **0 píxeles** de diferencia; móvil 29-81 px de 1.3M (0.002-0.006%, franjas de
  antialiasing de 1px en los bordes del libro). Después: **19-27 capas / 11-15MB**
  (≈12× menos memoria). iOS <16 queda fuera de soporte consciente (color-mix/cqw);
  el dispositivo de San es moderno.
- QA permanente: `qa/verify-fv38-ios.mjs` (`npm run qa:ios`, 11 checks: ventana ±2,
  presupuesto ≤60 capas/≤60MB vía CDP, sombra sin filter en .book, navegación por
  ventana, guardas del SW). fv31/fv32 actualizadas (asumían 98 hojas). Regresión:
  11/11 + 57/57 + 24/24 + 18/18 + 15/15 + 24/24 + 14/14 + 24/24.

## Mantenimiento — memoria de proyecto y QA versionada

- `CLAUDE.md` (raíz), `docs/` (BUILD-PLAN verbatim, este log, PENDIENTES) y
  `album26/qa/` (suites Playwright portables + README). Las suites vivían en el
  scratchpad efímero de la sesión; ahora están versionadas.
