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

## v1.0.0 — declarada EN PRODUCCIÓN (2026-07-04)

- Gate humano de San tras Fv3.8: la app funciona en desktop y en Safari/iOS
  ("Ya funciona"). Versión del paquete `album26` elevada a **1.0.0**. El tag
  `v1.0.0` existe en local pero el proxy git del sandbox no permite push de tags
  (403): si se quiere el tag/release en GitHub, crearlo desde la web sobre el
  commit de esta pasada de docs.
- Pasada completa de documentación: README raíz y de la app reescritos (estado
  productivo, estructura, scripts, invariantes), nuevo `docs/ERRORES.md` (catálogo
  de errores con causa raíz, fix y guardarraíl), PENDIENTES y CLAUDE.md al día.
- Queda pendiente (sin fecha): F1 Supabase auth+sync, requisito #2 (imágenes de
  cromos), datos en revisión (fed 6, mlang IRN, quali 47), typos de checklist a
  validar contra el álbum físico, y retirada del legacy F0 tras gate.

## Fv4.0 — Auth con registro abierto + progreso por usuario en nube

- **Contexto crítico**: proyecto Supabase COMPARTIDO con la Porra Mundial 2026 (43
  usuarios reales). No se tocó NINGÚN setting global de Auth ni tablas/RLS/functions
  ajenas; solo código del álbum. La tabla `public.album_progress` (user_id+slot PK,
  pegado bool, repes 0..5, RLS owner-only ×4) la creó el orquestador; su DDL queda
  versionado en `supabase/migrations/0001_album_progress.sql` SIN re-aplicar.
- **Sesión**: `@supabase/ssr` con cookies. `lib/supabase/client.ts` (browser
  singleton) + `lib/supabase/server.ts` (route handlers) + **`proxy.ts`** — Next 16
  deprecó el convenio `middleware.ts` (build avisa y pide renombrar; misma forma,
  función `proxy`). Protege todo excepto /login, /auth/*, manifest, sw.js y
  estáticos; sin sesión → /login; con sesión, /login → /.
- **/login**: tabs Entrar/Registrarse (email+password), estética de la portada
  (#1E1B33 + bloques), errores en castellano (credenciales, ya registrado —
  incluida la respuesta ofuscada `identities:[]` de Supabase —, password corta,
  email sin confirmar, rate limit). Registro → pantalla "Revisa tu correo"
  (la confirmación de email está ACTIVA a nivel de proyecto). `/auth/confirm`
  (token_hash) y `/auth/callback` (code) cubren ambos formatos de enlace SIN tocar
  la allowlist global: si el enlace cae en el Site URL de la Porra, la cuenta se
  confirma igual y el usuario vuelve a /login.
- **Progreso**: `CloudStore` contra album_progress (mapeo 'falta'=pegado:false,
  'tengo'=true/0, 'repe'=true/1..5). Hidratación completa (una SELECT) al montar
  con splash "Cargando tu álbum…"; upsert inmediato por tap con optimistic UI +
  revert + toast si falla; reset por equipo con DELETE like 'CODE-%' y revert.
  `LocalStore` queda como fallback sin configuración. Sin migración
  localStorage→nube (el brief no la pedía; decisión documentada en PENDIENTES).
- **PWA**: /login y /auth/* excluidos de TODA caché del SW (red directa); caché
  `album26-v4`. manifest/sw.js/fuentes accesibles sin sesión (verificado).
- **QA sin red a supabase.co**: server con `QA_AUTH_MOCK=1` (cookie `qa-session`
  cuenta como sesión en el proxy — el getUser del server no puede mockearse con
  page.route porque corre en Node) + `qa/_mock-auth.mjs` en el navegador: cookie
  sb-* del cliente y mocks STATEFUL de auth/album_progress (CORS+OPTIONS en los
  fulfill; los upserts mutan un Map → la persistencia tras recarga se testea de
  verdad). Suite `qa/verify-fv40-auth.mjs` (19 checks: redirect, login+validación,
  hidratación, contador, upsert spy con user_id, persistencia, logout, optimistic
  revert con latencia forzada, assets públicos). Las 8 suites previas adaptadas
  (sesión mock; los checks de localStorage pasan a asserts de nube). Regresión:
  19 + 57 + 24 + 18 + 15 + 24 + 14 + 24 + 11 = 206/206.
- **Gate de prod (orquestador/San)**: añadir en Vercel las env vars
  `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` ANTES del deploy
  (sin ellas, todo redirige a /login y el login avisa de configuración pendiente);
  JAMÁS definir `QA_AUTH_MOCK` en Vercel. El e2e real (signup, confirmación, RLS,
  multidispositivo) se valida en prod.

## Fv4.1-prep — Groundwork para el empaquetado nativo (petición directa de San)

- San pidió "optimiza y revisa qué es necesario" para app nativa iOS+Android con
  paridad total. El análisis completo (recomendación: Capacitor en modo remoto;
  checklist repo vs. San) quedó en PENDIENTES.md — el scaffolding Capacitor es el
  paquete Fv4.1 (necesita appId, icono 1024, cuentas de developer y build local:
  el sandbox no tiene Xcode ni Android SDK).
- Groundwork aplicado (restricción: cero diferencia visual, verificada con diff
  de píxeles 0/0/0/0 en portada/pliego/login/desktop):
  - `viewport-fit=cover` + `env(safe-area-inset-*)` progresivo (doble declaración
    de padding: si env no existe vale la base) en `.ab-wrap`, `.lg-wrap` y el
    toast — sin esto, en WebView nativo/PWA standalone el contenido queda bajo el
    notch y el home indicator. Verificado con `Emulation.setSafeAreaInsetsOverride`
    (CDP): insets 59/34 → padding 71/64 y el nav arranca bajo el notch.
  - body a `#191228` (el beige F0 solo asomaba en overscroll y en WebView
    destellaría) + `overscroll-behavior-y:none` (sin pull-to-refresh en el shell).
- QA: +2 checks en `qa:ios` (viewport-fit=cover en el meta + insets aplicados con
  CDP, con skip documentado si el Chromium no soporta la emulación). Regresión
  completa: 57+24+18+15+24+14+24+13+19 = 208/208.

## Fv4.1 — Panel "Mi colección": progreso global + lista de repes

- (Renumeración del orquestador: el empaquetado nativo pasa a ser Fv5.0.)
- Panel overlay modal con el patrón del motor (builder HTML-string + delegación):
  se monta SOLO al abrir y se desmonta al cerrar — presupuesto iOS intacto
  (medido con el panel abierto: 20 capas / 13MB, muy dentro del ≤60/≤60MB de
  qa:ios). Lee EXCLUSIVAMENTE el estado hidratado del CloudStore (cero queries
  propias); el "contador vivo" sale gratis del rebuild por estado.
- Accesos en la barra de estado (todas las vistas): "▦ MI COLECCIÓN" y
  "REPES (N)" (abre directo en la pestaña de repes; atenuado si N=0).
- Pestaña PROGRESO: cabecera K/960 · % · repes; grid de 48 equipos con X/20 y
  microbarra (dorada al completar 20/20); tap → cierra y navega al pliego
  (reusa nav de chips). Pestaña REPES: agrupada por equipo,
  "MEX-11 · ORBELIN PINEDA · x2" (nombres de album-data; slots 1/13 = TEAM
  LOGO/TEAM PHOTO), COPIAR LISTA → portapapeles en texto plano con formato
  ESTABLE (snapshot en QA: "Mis repes (N):" + línea por cromo) y toast de
  confirmación (el toast ganó variante informativa azul además de la de error);
  estado vacío "Sin repes todavía".
- Guardas de interacción: con el panel abierto no hay swipe/flechas de página y
  Escape lo cierra (desktop).
- QA: `qa/verify-fv41-collection.mjs` (22 checks, `npm run qa:collection`) con el
  mock stateful de fv40 + clipboard con permisos del contexto. Regresión completa:
  22 + 57+24+18+15+24+14+24+13+19 = 230/230.

## Fv4.2 — Secciones especiales del álbum (00 / FWC-1..19 / CC-1..12, +32 slots)

- **Bloqueo y resolución de datos**: v1 del payload `album-especiales` (md5 7d71481e)
  se contradecía (cabecera 25/985 vs 34 slots enumerados). Se PARÓ y reportó
  (`fv42-status` blocked). San corrigió a **v2** (md5 fc2d26d5, verificado server+local):
  CC son 12 (no 14), totales correctos **32 slots nuevos / 992 total** (960+32).
  El calendario del álbum físico se OMITE (decisión de San). La distribución de
  históricos FWC-9..19 (2+2+2+2+3) queda pendiente del gate; se renderiza lo que
  trae v2 (si San la cambia → v3 solo de datos, sin tocar layout).
- **Datos**: `lib/album-especiales.ts` GENERADO por script desde v2 (11 páginas,
  32 claves canónicas, ESP_TOTAL=32, ALBUM_TOTAL=992). No editar a mano.
- **Adición pura** (restricción dura): el render de portada/grupos/equipos NO cambia.
  Se introdujo un **modelo de páginas explícito** (`PAGES`/`VIEWS`): antes el índice
  de página era una fórmula (2+i*2); ahora es un array que intercala APERTURA (4
  vistas entre GRUPOS y MEX), HISTORY (5 tras PAN) y COCA-COLA (2 tras History).
  Los builders `pageEquipoL/R`, `pagePortada`, `pageGrupos` quedan intactos; solo
  cambia la indexación (sheetOf, viewOfPage, statusHTML, nav derivan del array).
  **Prueba dura: R de MEX byte-idéntico antes/después** (md5 igual; assert
  permanente en fv42 con pixel-diff 0 contra baseline commiteado).
- **Vistas especiales**: reusan `.teampage` (tema por vars inline: navy apertura/
  history, rojo #E4002B cocacola) + `.tile` (mismo cromo: glifo 26, sticker, tap
  pegar/repes). Layout `.esp-*` propio (títulos, ciudades con estadio, finales
  históricas, records, lema Coca-Cola, nombres+país de los 12 CC; CC-10 sin país
  como trae v2). Slots con clave canónica literal en `data-tile` ("00","FWC-1",
  "CC-1"): el motor de tap/apply/CloudStore los trata igual (split('-')[0]).
- **Navegación**: chips FWC (antes de MEX), HIST y CC (tras PAN), estilo idéntico.
  Van en una tira scroll `.chips-wrap` que envuelve FWC+#chips+HIST+CC —
  **#chips conserva EXACTAMENTE los 48 chips de equipo** (las suites dependen de
  ello). El scroll horizontal pasó de #chips a .chips-wrap (fv35 detectó que los 3
  chips extra desbordaban la nav en móvil; el check de desborde documento hizo su
  trabajo).
- **Progreso/panel**: totales globales K/992 y fila **ESPECIALES X/32** (clase
  `.cp-esp` distinta de los 48 `.cp-team` — el grid de equipos sigue siendo 48);
  repes de especiales en la lista con código + nombre (mayúsculas para casar con
  los equipos). El contador POR EQUIPO sigue X/20 intacto.
- **iOS**: las 11 vistas entran en la ventana ±2 (son más ligeras que un pliego);
  qa:ios verde. **Fixtures forzados por la adición** (documentados, no ocultan
  regresión — la garantía real es el MEX-R byte-idéntico): fv38 (a) hecho
  posición-independiente (MEX ya no es la hoja 2 al insertarse apertura; se verifica
  "ventana ±2 contigua" sin hardcodear el índice) y fv41 cabecera 960→992.
- **QA**: `qa/verify-fv42-especiales.mjs` (21 checks). Regresión completa:
  21 + 57+24+18+15+24+14+24+13+19+22 = 251/251.

## Mantenimiento — memoria de proyecto y QA versionada

- `CLAUDE.md` (raíz), `docs/` (BUILD-PLAN verbatim, este log, PENDIENTES) y
  `album26/qa/` (suites Playwright portables + README). Las suites vivían en el
  scratchpad efímero de la sesión; ahora están versionadas.
