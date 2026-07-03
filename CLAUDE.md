# Álbum Mundial 2026 — memoria de proyecto

Tracker de cromos del Mundial 2026 (álbum oficial Panini, 48 selecciones × 20 slots).
App Next.js (App Router + TypeScript, sin Tailwind) en `album26/`, desplegada en Vercel
(proyecto `album-mundial2026`, Root Directory = `album26`, auto-deploy al pushear `main`).
Idioma de trabajo: **castellano**.

## Cómo se trabaja aquí (formato acordado con San/orquestador)

1. Cada fase llega como **paquete** (chat u orquestador). Se sigue al detalle; si falta un
   fichero o un dato no cuadra, **PARAR y reportar antes de improvisar**.
2. Los datos/referencias grandes llegan por la tabla `public.build_handoff` de Supabase
   (`k` = clave del paquete, `v` = jsonb con `{md5, body}` o el payload). **Verificar md5
   antes de usar** (server-side y local tras la extracción).
3. Flujo por fase: validar handoff → implementar → `npm run build` verde **estricto**
   (sin `ignoreBuildErrors`) → suite Playwright → **commit único** → push a `main` →
   publicar estado en `build_handoff` (p. ej. `k='fv32-status'`, jsonb
   `{fase, build, playwright, pregunta, sha}`, upsert ON CONFLICT).
4. **No tocar Vercel** (lo gestiona San). No crear PRs; push directo a `main` y la rama
   `claude/album26-f0-phase-qtj1n6` se mantiene sincronizada con `main`.
5. NO inventar datos (fechas, federaciones, qualifiers, nombres). Extras verificados solo
   donde `VERIF` los trae. Typos conocidos de la checklist se cargan TAL CUAL
   (ver `docs/PENDIENTES.md`).

## Estructura

```
album26/                  la app (Root Directory en Vercel)
├── app/                  layout (fuentes next/font: Inter, Saira, Baloo 2, Barlow SC),
│                         globals.css (F0), page.tsx → <AlbumBook/>
├── components/
│   ├── AlbumBook.tsx     ACTIVO: libro 48 selecciones, visual de referencia v3,
│   │                     spread 2 páginas en desktop (≥900px), móvil una hoja
│   └── AlbumPage.tsx     LEGACY (F0, Grupo A) — no borrar hasta gate humano
├── lib/
│   ├── album-data.ts     GENERADO desde build_handoff k=album-data-v3 — NO editar a mano
│   ├── inventory.ts      persistencia conmutable (LocalStore F0 / SupabaseStore F1)
│   └── teams.ts          LEGACY (datos F0 Grupo A)
├── public/fonts/fwc26.otf · manifest.webmanifest · sw.js (Fv3.6: PWA instalable,
│                         SW registrado solo en prod, iconos 192/512 en bucket flags/icons/)
├── qa/                   suites Playwright versionadas (ver qa/README.md)
└── supabase/schema.sql   F1 (tabla inventory + RLS) — AÚN SIN USAR
docs/                     BUILD-PLAN original, log de decisiones, pendientes
```

## Convenciones técnicas y trampas conocidas

- **TS estricto**: `Entry.state` es solo `'tengo'|'repe'` ('falta' = ausencia de entrada).
  Comparar un estado derivado con `'falta'` dispara TS2367 porque el acceso por índice
  (`inv[key]`) devuelve `Entry` no-opcional y el control-flow re-estrecha. Patrón aprobado:
  `const st = (e?.state ?? 'falta') as 'falta' | 'tengo' | 'repe';`
- **Persistencia**: interfaz `InventoryStore` (`loadCountry/put/clear`). Clave
  `album26_<CODE>`, mapa `{ 'MEX-2': {state, repes} }`. El reset de un equipo usa
  `store.clear(code)` — NUNCA un bucle de `put(k, null)` (race: read-modify-write
  concurrente sobre la misma clave se pisan; bug F0 ya corregido).
- **Estados**: tap cicla `falta → tengo → repe1..repe5 → falta` (MAX_REPES=5); stepper
  plus/minus. CSS espera `data-state` en el tile y `.badge-rep` con `×N`.
- **Motor UI**: builders que devuelven HTML string + delegación de eventos + rebuild de
  innerHTML por estado (patrón heredado del diseño de San). No migrar a JSX granular sin
  paquete que lo pida.
- **Banderas**: PNG por código FIFA en Supabase Storage (bucket público `flags/`),
  fallback `flagErr` → span `.noflag`. El sandbox de Claude Code NO llega a supabase.co
  (política de red): usar el MCP de Supabase para datos y no esperar ver banderas en
  screenshots locales.
- **next/font**: al añadir una fuente hay que añadir su `.variable` al `className` del
  `<html>` en `layout.tsx` (olvido típico: la var CSS no resuelve y cae al fallback).
- **Playwright en sandbox**: Chromium en `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
  (no ejecutar `playwright install`). El swipe por CDP desde el borde izquierdo dispara el
  gesto "back" del navegador: usar TouchEvent sintético (ver suites en `album26/qa/`).
- `create-next-app@latest` instaló **Next 16.x** (el plan asumía 15): themeColor va en
  `export const viewport`, y el build no ejecuta ESLint.

## Estado de fases (detalle en docs/DECISIONES.md)

| Fase | Estado | SHA |
|---|---|---|
| F0 scaffold + port Grupo A + fixes | ✅ | `fe82285`→`321f9e7` |
| F0+ repes×5 + banderas img | ✅ | `cb8df24` |
| Fv3 libro 48 selecciones (datos v3) | ✅ | `145ae2a` |
| Fv3.1 paridad visual referencia v3 | ✅ | `4a82274` |
| Fv3.2 spread desktop + centrado | ✅ | `933b66b` |
| Fv3.3 datos verificados 48 (fed/mlang/partidos/quali) | ✅ | ver `git log` |
| Fv3.4 bloque GROUP tiles + header wordmark/fed + fix CZE | ✅ | ver `git log` |
| Fv3.5 banderas w640 `?v=2` + layout móvil quali/GROUP + QA geo | ✅ | ver `git log` |
| Fv3.6 tiles GROUP 4:3 a escala + PWA instalable + fix img vacías | ✅ | ver `git log` |
| F1 Supabase auth+sync · req #2 imágenes | ⏸ pendientes | — |
