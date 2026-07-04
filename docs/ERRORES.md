# Catálogo de errores conocidos

Errores reales encontrados durante el desarrollo (F0 → Fv3.8 / v1.0), con su causa
raíz, el fix aplicado y el guardarraíl que evita la regresión. El contexto completo
de cada fase está en `DECISIONES.md`.

Formato: **Síntoma → Causa raíz → Fix → Guardarraíl**.

---

## Código / TypeScript

### TS2367: comparar el estado derivado con 'falta'
- **Síntoma**: `npm run build` falla con TS2367 ("no overlap") al comparar el estado
  de un cromo con `'falta'`.
- **Causa**: `Entry.state` es solo `'tengo'|'repe'` ('falta' = ausencia de entrada);
  el control-flow re-estrecha el inicializador aunque se anote el tipo unión.
- **Fix**: cast en la misma línea: `const st = (e?.state ?? 'falta') as 'falta' | 'tengo' | 'repe';`
  (una anotación `const st: 'falta'|... = ...` NO basta).
- **Guardarraíl**: patrón documentado en `CLAUDE.md`; build estricto sin
  `ignoreBuildErrors`.

### Race del reset de equipo (last-write-wins)
- **Síntoma**: tras "Reiniciar equipo" y recargar, reaparecían cromos sueltos.
- **Causa**: el reset hacía N × `store.put(k, null)` sin `await`; cada put es un
  read-modify-write de la MISMA clave `album26_<CODE>` y se pisaban entre sí.
- **Fix**: `clear(code)` atómico en la interfaz `InventoryStore` (borra la clave
  entera), también en el `SupabaseStore` comentado (F1).
- **Guardarraíl**: regla en `CLAUDE.md` y en `album26/README.md`; check de reset en
  `qa:movil`.

### Fuentes next/font que caen al fallback
- **Síntoma**: Baloo 2 / Barlow Semi Condensed renderizaban como Inter.
- **Causa**: al añadir una fuente con `next/font` hay que añadir su `.variable` al
  `className` del `<html>` en `layout.tsx`; si no, la var CSS no resuelve.
- **Fix**: `${baloo.variable} ${barlow.variable}` en el html.
- **Guardarraíl**: checks de font-family activa en `qa:movil` (2 checks que fallaron
  en su día y detectaron el olvido).

## Layout / CSS

### La federación de CZE truncada ("České…")
- **Síntoma**: la fed más larga del álbum se cortaba con ellipsis en el pliego.
- **Causa**: `-webkit-line-clamp:3` en `.fed .fname` truncaba a 3 líneas exactas.
- **Fix**: quitar el clamp; la fed fluye hasta `max-height` = alto de la bandera con
  `overflow:hidden` (las que caben en 3 líneas se ven igual).
- **Guardarraíl**: check de fed CZE completa en `qa:verif` y `qa:visual`.

### Páginas L que desbordaban en vertical (HAI +44px incluso en desktop)
- **Síntoma**: en países de nombre corto la tabla QUALIFIERS salía recortada y el
  pill de página pisaba contenido (el gate solo miró CZE/MEX, que caben).
- **Causa**: países cortos no se encogen por ancho (wordmark a tamaño pleno) y con
  fed de 3 líneas la salvaguarda de `fitHeaders` se rendía a las 6 iteraciones
  (suelo 0.69×).
- **Fix**: tope 6→14 iteraciones + compactación móvil (bandera .22, quali en
  columna, márgenes) + reserva inferior para el pill.
- **Guardarraíl**: `qa:geo` (solapes par a par con tolerancia 2px en HAI/CZE/PAN).

### scrollHeight "satura" en el padding-box (la reserva del pill se consumía)
- **Síntoma**: con `padding-bottom` de reserva en `.inner`, el contenido seguía
  pisando el pill aunque `scrollHeight <= clientHeight + 2`.
- **Causa**: el scroll area incluye el padding: el bucle que compara
  `scrollHeight` contra `clientHeight` deja que el contenido se coma TODO el
  padding antes de acusar overflow.
- **Fix**: en móvil la salvaguarda mide el último bloque de flujo contra
  `borde_inferior − padding-bottom` (borde de contenido real).
- **Guardarraíl**: comentario en `fitHeaders` + checks de solape del pill en `qa:geo`.

### La banda vertical estiraba los tiles del bloque GROUP
- **Síntoma**: la zona de bandera 4:3 medía ratio 1.25 en vez de 1.33.
- **Causa**: la banda de código (`writing-mode:vertical-rl`) como flex item aporta
  una altura intrínseca mayor que la imagen y el `align-items:stretch` estiraba la
  imagen por encima de su 4:3.
- **Fix**: banda en `position:absolute` (left 0, width 20%); la imagen manda en la
  altura del tile.
- **Guardarraíl**: checks de ratio 1.30–1.36 en `qa:pwa` y `qa:grid`.

### `grid-auto-rows:1fr` estiraba las filas del 2×2
- **Síntoma**: 2–3px de hueco bajo la bandera en tiles del grupo.
- **Causa**: `1fr` heredado igualaba filas al alto del tile con marco (.me).
- **Fix**: `grid-auto-rows:auto` en `.gtiles`.

### El carril del 40/35% rompió la parrilla (Fv3.6 → Fv3.7)
- **Síntoma**: los cromos 18/19/20 quedaron visiblemente menores que el resto.
- **Causa**: dar al bloque GROUP un carril propio de grid robaba ancho a las 3
  columnas restantes; la spec del 40% resultó errónea al medir el álbum físico.
- **Fix**: **ley del álbum** — la parrilla manda: grid base de 4 columnas, el bloque
  ocupa 1 columna y se re-escala a su hueco.
- **Guardarraíl**: invariante duro en `qa:grid` (max/min anchos ≤ 1.02) — es
  regresión permanente precisamente porque este error ya ocurrió.

## iOS / Safari

### Safari iOS dejaba de cargar la app ("Ha ocurrido un problema repetidamente")
- **Síntoma**: crash + recarga en bucle hasta que Safari se rinde y muestra error.
- **Causa raíz** (medida con CDP LayerTree a @3x): el libro móvil montaba SIEMPRE las
  98 hojas 3D — cada cara con `backface-visibility` es una capa de composición
  propia (~307 capas / ~189MB) — y `filter:drop-shadow` en `.book` rasterizaba el
  subárbol 3D completo; además cada tap reconstruía las 98 hojas. El proceso
  WebContent de iOS revienta por memoria.
- **Fix**: `bookHTML` monta solo las hojas actual ±2 (las demás nunca son visibles:
  z-order/volteadas y sin animación de paso) y la sombra pasa a `.book::before`
  (mismo drop-shadow sobre un rect plano). Resultado: 19–27 capas / 11–15MB.
- **Guardarraíl**: invariante duro + suite `qa:ios` (presupuesto ≤60 capas/≤60MB).

### box-shadow NO es drop-shadow (descartado por el diff de píxeles)
- **Síntoma**: al sustituir el `filter:drop-shadow` por `box-shadow`, el diff de
  píxeles before/after marcó ~0.4% con deltas altos en el halo de sombra (visible
  bajo el chip activo y sobre la barra de estado).
- **Causa**: el difuminado y el alcance del halo difieren entre ambas sombras.
- **Fix**: mantener el `drop-shadow` original pero sobre un `::before` plano con la
  misma silueta → render bit a bit idéntico sin coste 3D.
- **Guardarraíl**: `qa:ios` asevera `.book` sin filter y `::before` con drop-shadow.
  Método a reutilizar: capturas deterministas + diff de píxeles para todo cambio
  "sin diferencia visual".

### Guardas Safari del service worker
- **Síntoma potencial** (preventivo): Safari rechaza servir a una navegación una
  respuesta redirigida sacada de caché, y un `respondWith(undefined)` offline se
  muestra como error de carga.
- **Fix**: solo se cachean navegaciones `200` sin redirect; fallback a `Response`
  503 con texto; solo se cachea `res.ok`; caché versionada (`album26-v3`).
- **Guardarraíl**: checks (e) de `qa:ios`; el SW solo se registra en producción.

## Datos / assets

### Banderas "circulares" y luego "achatadas"
- **Síntoma**: en el gate se veían círculos en vez de banderas; tras subir PNG
  rectangulares, en los tiles del grupo solo se veía la franja central.
- **Causa 1**: los PNG originales del bucket eran iconos circulares sobre lienzo
  transparente (el QA de border-radius pasaba y aun así se veían círculos).
- **Causa 2**: el CDN sirve el PNG viejo hasta 1h → cache-bust `?v=2` en TODAS las
  URLs (constante única `FLAGS_VERSION`).
- **Causa 3**: tiles verticales + `object-fit:cover` recortaban los laterales →
  zona de bandera con aspect 4:3 fijo (recorte ≤11% en banderas 3:2, 0% en 4:3).
- **Guardarraíl**: `qa:geo` (URLs con `?v=2`, naturalWidth ≥ 600) y `qa:grid`
  (ratio 1.30–1.36). SUI es 1:1 de origen: recortada en 3:2 es CORRECTO, no tocar.

### `<img>` sin src auditan como rotas (9 en portada)
- **Síntoma**: auditorías (Lighthouse/PWA) contaban 9 imágenes con naturalWidth 0.
- **Causa**: los `img.imgslot` placeholder del requisito #2 (imágenes de cromos,
  pausado) se emitían sin src en las hojas montadas ±2.
- **Fix**: render condicional — la `<img>` solo se emitirá cuando haya URL real.
- **Guardarraíl**: check "cero img con src vacío" en `qa:pwa`.

## Auth / Fv4.0

### Next 16: `middleware.ts` deprecado
- **Síntoma**: el build avisa "The middleware file convention is deprecated.
  Please use proxy instead".
- **Fix**: `proxy.ts` en la raíz de la app con `export async function proxy(...)`
  (misma forma que middleware; el patrón @supabase/ssr no cambia).

### El getUser del proxy no se puede mockear con page.route
- **Síntoma**: con sesión mockeada en el navegador, `/` seguía redirigiendo a
  /login en QA.
- **Causa**: `supabase.auth.getUser()` del proxy corre en el proceso Node del
  server — `page.route` solo intercepta la red del NAVEGADOR.
- **Fix**: escape hatch `QA_AUTH_MOCK=1` (server de QA): la cookie `qa-session`
  cuenta como sesión. Nunca definirla en Vercel.
- **Guardarraíl**: comentado en `proxy.ts` y documentado en qa/README.

### Mocks cross-origin: CORS y preflight en route.fulfill
- **Síntoma potencial**: los fetch del cliente supabase-js (Authorization/apikey)
  disparan preflight OPTIONS incluso en GET; sin cabeceras CORS en el fulfill el
  navegador descarta la respuesta mockeada.
- **Fix**: `qa/_mock-auth.mjs` responde OPTIONS y añade access-control-* a todo.

### La ventana optimista es muy corta para testearla con mocks instantáneos
- **Síntoma**: el check "el tile marca al instante" leía ya el estado revertido.
- **Causa**: el mock respondía el 503 en el mismo tick; React re-renderiza el
  innerHTML en un efecto y el revert llegaba antes del sample.
- **Fix**: el mock de fallo responde con 600ms de latencia (opts.failWrites).

### `const URL = …` sombrea al constructor global (×2)
- **Síntoma**: `TypeError: URL is not a constructor` en suites ESM.
- **Fix**: `new globalThis.URL(...)` (o no llamar URL a la variable).

## QA / entorno

- **El sandbox no llega a supabase.co** (política de red): los payloads van por MCP
  (chunks base64 + md5 verificado server-side y local) y las suites interceptan
  `flags/` con un PNG fixture w640 (`page.route`) — el mecanismo se valida en local
  y el CDN real en producción.
- **Swipe por CDP desde el borde izquierdo** dispara el gesto "back" del navegador
  (rompe el documento con SecurityError): usar `TouchEvent` sintético (ver suites).
- **Con SW registrado, `page.route` puede no interceptar**: los contextos de suite
  que usan rutas llevan `serviceWorkers:'block'`.
- **Checks acoplados al render**: al cambiar datos o layout, algunos checks antiguos
  quedan obsoletos y hay que actualizar la SUITE, no el código (ej.: fv31/fv32
  asumían 98 hojas; fv36 medía la banda contra border-box y el marco de 3px del
  tile propio distorsionaba con tiles pequeños → medir content-box).
- **Medir antes de teorizar**: los bugs de layout de esta app se resolvieron con
  scripts de medición en Playwright (boundingRects, scrollWidth/Height, CDP
  LayerTree, diff de píxeles). Los scripts de las suites sirven de plantilla.
