# QA — suites Playwright del álbum

Suites de verificación end-to-end usadas en los gates de cada fase, versionadas para
que sean reproducibles (antes vivían en el scratchpad efímero de la sesión de Code).

## Requisitos

- `playwright-core` (no descarga navegadores): `npm i -D playwright-core` o `npx -y`.
- Un Chromium local. En el sandbox de Claude Code ya existe en
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (default de las suites);
  en otra máquina, apúntalo con `QA_CHROME`.
- La app corriendo (`npm run build && npm run start`, o `npm run dev`).

## Ejecutar

```bash
# desde album26/
# Fv4.0: el server de QA corre con QA_AUTH_MOCK=1 (la cookie qa-session cuenta
# como sesión en el proxy; el sandbox no llega a supabase.co). En el navegador,
# qa/_mock-auth.mjs monta la sesión del cliente y mocks STATEFUL de
# auth/album_progress. JAMÁS definir QA_AUTH_MOCK en Vercel.
npm run build && QA_AUTH_MOCK=1 PORT=3000 npm run start &   # o el puerto que uses

# atajos npm (equivalen a QA_URL=http://localhost:3000 node qa/verify-…)
npm run qa:movil    # fv31 (57)     npm run qa:geo   # fv35 (24)
npm run qa:spread   # fv32 (24)     npm run qa:pwa   # fv36 (14)
npm run qa:verif    # fv33 (18)     npm run qa:grid  # fv37 (24)
npm run qa:visual   # fv34 (15)     npm run qa:ios   # fv38 (13)
npm run qa:auth     # fv40 (19)
```

Las 9 suites en verde son la regresión completa exigida antes de cada push a `main`
(estado Fv4.0: 57+24+18+15+24+14+24+13+19 = 208 checks).

Variables: `QA_URL` (default `http://localhost:3000/`), `QA_CHROME` (binario Chromium),
`QA_OUT` (carpeta de screenshots, default `./qa-shots`).

Salida: cada check imprime `PASS`/`FAIL` con detalle; el proceso termina con exit code 1
si algo falla. Los screenshots del gate se guardan en `QA_OUT`.

## Qué cubre cada suite

- **verify-fv31-movil.mjs** (viewport 420×900, modo móvil): portada/grupos, 98 hojas,
  lazy mount ±2, 48 pliegos navegables por chips, spot-checks de datos (RSA-15 SITHOLE,
  NED-3 VAN DIJK, ARG-17 MESSI, POR-15 RONALDO, ESP-13 TEAM PHOTO, mononímicos, typos
  intactos), verif RSA/NED vs degradado genérico, flechas/swipe, ciclo de estados
  falta→tengo→repe1..5→falta con tope, persistencia tras recarga, reset con
  `store.clear`, y checks visuales de la referencia v3 (glifo 26, foil, --frame,
  TEAM PHOTO intercalada, fuentes Baloo/Barlow, fondo #191228).
- **verify-fv32-spread.mjs** (viewport 1280×800, modo spread): L+R simultáneas con lomo,
  centrado (márgenes simétricos), aspect 2016/1204, footers de paginación real, sin
  dorso, lazy por vistas ±1, navegación por vistas (chips/flechas/teclado/drag), estados
  y persistencia en spread, y cambio a 390px con la misma clave de storage.
- **verify-fv33-verif.mjs** (viewport 1280×800): datos verificados de las 48 selecciones
  (fed/mlang/partidos/quali del GT del brief) y placeholders sin inventar (SCO/IRN/GER).
- **verify-fv34-visual.mjs** (viewport 1280×800): bloque GROUP con tiles 2×2 sin
  círculos, header L (jerarquía país>WE ARE, bandera 29%, fed sin recortes) y
  screenshots del gate en `qa/screenshots/fv34/`.
- **verify-fv35-geo.mjs** (viewport 360×740, modo móvil): QA geométrico — sin solapes
  entre bloques (tolerancia 2px, incl. pill de página), "GROUP {X}" en una línea, sin
  desborde horizontal y banderas con `?v=2` y `naturalWidth >= 600` en HAI/CZE/PAN.
  Las requests de `flags/` se interceptan con un PNG fixture w640 (el sandbox no llega
  a supabase.co); la validación contra el CDN real se hace en prod.
- **verify-fv36-pwa.mjs** (360×740 + 1280×800): PWA instalable (manifest 200 con
  iconos absolutos del bucket que cargan, SW registrado en prod-build), bloque GROUP
  ≤42% del ancho de página con zona de bandera 4:3 (ratio 1.30-1.36) y banda 20%,
  cero `<img>` con src vacío en portada/índice. Screenshots en `qa/screenshots/fv36/`.
  Los contextos con `page.route` usan `serviceWorkers:'block'`.
- **verify-fv37-grid.mjs** (1280×800 + 360×740, MEX/HAI/CZE): invariante duro de la
  parrilla — todos los cromos de jugador de una cara miden lo mismo (max/min ≤ 1.02),
  bloque GROUP ≤ columna×1.15 y zona de bandera 1.30-1.36. Regresión permanente.
  Screenshots en `qa/screenshots/fv37/`.
- **verify-fv38-ios.mjs** (390×844 @3x, iPhone-like): presupuesto iOS/Safari del
  libro móvil — solo hojas actual ±2 montadas, ≤60 capas de composición y ≤60MB de
  backing (CDP LayerTree) tras varios pasos, sombra en `::before` sin `filter` en
  `.book`, navegación por ventana y guardas Safari del service worker. Regresión
  permanente (la violación crashea WebContent en iOS: "problema repetidamente").
- **verify-fv40-auth.mjs** (390×844): auth Fv4.0 — sin sesión / redirige a /login,
  /login renderiza y valida en castellano, con sesión mock el libro se hidrata de
  la nube (contador real), upsert inmediato con user_id (spy), persistencia tras
  recarga contra el mock stateful, logout, revert optimista con fallo forzado y
  manifest/sw/estáticos accesibles sin sesión. El e2e real (signup, confirmación,
  RLS, multidispositivo) se valida en prod.
- **_mock-auth.mjs**: helper compartido — cookies de sesión (qa-session + sb-*) y
  mocks stateful de `auth/v1` y `rest/v1/album_progress` con CORS/OPTIONS.

## Notas

- Las banderas salen como fallback `.noflag` si la máquina no llega a Supabase Storage
  (caso del sandbox); no es un fallo de la suite.
- El swipe táctil se simula con `TouchEvent` sintético (un swipe real por CDP desde el
  borde izquierdo dispara el gesto "back" del navegador y rompe el test).
