# Álbum Mundial 2026

Tracker de la colección de cromos del **álbum oficial Panini del Mundial FIFA 2026**:
48 selecciones × 20 cromos (960 + portada e índice), con estados
`falta → tengo → repe ×1..5`, persistencia local y **PWA instalable** en el móvil.

> **Estado: v1.0.0 EN PRODUCCIÓN** — desplegada en Vercel (proyecto
> `album-mundial2026`, Root Directory `album26`, auto-deploy al pushear `main`).
> Gate humano de San superado en desktop y en iPhone (Safari/iOS).

## Qué hace

- **Libro navegable**: portada, índice de 12 grupos y 48 pliegos (página izquierda +
  derecha por selección), fiel al diseño del álbum físico (referencia visual v3).
- **Móvil** (<900px): libro de hojas con swipe táctil. **Desktop** (≥900px): pliego
  de 2 páginas con lomo, navegación por chips, flechas, teclado y drag.
- **Inventario por cromo**: tap para ciclar `falta → tengo → repe1..repe5 → falta`,
  stepper ± para repes, contador de pegados/repes y reset por selección.
- **Cuentas y nube (Fv4.0)**: registro abierto (email+password con confirmación por
  correo) en `/login`; el progreso se guarda por usuario en Supabase
  (`album_progress`, RLS owner-only) con UI optimista, y te sigue en cualquier
  dispositivo. Sin sesión, todo redirige a `/login` (proxy de @supabase/ssr).
- **PWA**: manifest instalable (standalone, iconos 192/512 servidos desde bucket) y
  service worker mínimo (cache-first para estáticos, network-first para el documento).
- **Datos verificados**: nombres del álbum oficial contrastados por OCR, federaciones,
  partidos de la fase de grupos y qualifiers según *ground truth* validado — la app
  **no inventa datos**: lo que está en revisión se muestra como placeholder.

## Estructura del repositorio

```
album26/          la app (Next.js 16 App Router + TypeScript, sin Tailwind)
├── app/          layout (fuentes, PWA meta, registro SW) · globals.css · page.tsx
├── components/   AlbumBook.tsx (motor + visual del libro) · AlbumPage.tsx (legacy F0)
├── lib/          album-data.ts (GENERADO, no editar a mano) · inventory.ts (persistencia)
├── public/       fuente FWC26 · manifest.webmanifest · sw.js
├── qa/           suites Playwright de regresión permanente (ver qa/README.md)
└── supabase/     schema.sql para F1 (sin aplicar)
docs/
├── BUILD-PLAN.md el plan original F0-F4 (verbatim, histórico)
├── DECISIONES.md log factual de cada fase: qué se hizo, decisiones y verificación
├── ERRORES.md    catálogo de errores conocidos: síntoma, causa raíz, fix y guardarraíl
└── PENDIENTES.md temas abiertos y trabajo futuro
CLAUDE.md         memoria de proyecto (convenciones, trampas, invariantes, fases)
```

## Ejecutar en local

```bash
cd album26
npm install
npm run dev            # desarrollo (el SW no se registra en dev)
npm run build          # build de producción (estricto: TS sin ignoreBuildErrors)
npm start              # servir el build
```

## QA

Suites Playwright end-to-end versionadas en `album26/qa/` (requieren un Chromium
local y la app corriendo; ver `qa/README.md` para detalles y variables):

```bash
npm run qa:movil   # funcional+visual móvil (57 checks)
npm run qa:spread  # spread desktop + persistencia cross-modo (24)
npm run qa:verif   # datos verificados y placeholders anti-invención (18)
npm run qa:visual  # header/bloque GROUP + screenshots de gate (15)
npm run qa:geo     # geometría móvil: solapes/desbordes/banderas ?v=2 (24)
npm run qa:pwa     # manifest/SW/iconos + img sin src (14)
npm run qa:grid    # invariante "la parrilla manda" (24)
npm run qa:ios     # presupuesto composición iOS + safe-areas nativas (13)
npm run qa:auth    # auth + progreso en nube con mocks (19)
```

Desde Fv4.0 el server de QA corre con `QA_AUTH_MOCK=1` (el sandbox no llega a
supabase.co); ver `album26/qa/README.md`.

Los dos **invariantes duros** del proyecto (violarlos rompe el gate):

1. **La parrilla manda** (Fv3.7): todos los cromos de jugador de una página miden lo
   mismo; los bloques decorativos se encajan en el hueco de una columna.
2. **Presupuesto iOS** (Fv3.8): el libro móvil monta solo las hojas actual ±2 y la
   sombra no rasteriza el subárbol 3D — montar las 98 hojas crashea Safari/iOS.

## Datos e infraestructura

- **Banderas e iconos**: PNG por código FIFA en Supabase Storage (bucket público
  `flags/`, w640 rectangulares, cache-bust `?v=2`; iconos PWA en `flags/icons/`).
  Si falta un PNG la UI degrada a un recuadro con el código (`.noflag`).
- **Handoffs de datos**: los paquetes de datos llegan por la tabla
  `public.build_handoff` (jsonb con md5 verificado antes de usar). El estado de cada
  fase se publica en la misma tabla (`k='fvXX-status'`).
- **Auth y progreso (Fv4.0)**: Supabase Auth (proyecto compartido; los settings
  globales no se tocan desde este repo) + tabla `album_progress` con RLS
  owner-only (DDL de referencia en `album26/supabase/migrations/`). La app
  necesita `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  (en local: `album26/.env.local`; en Vercel las gestiona San).
- **Deploy**: gestionado por San en Vercel; este repositorio no contiene
  configuración de deploy. Push directo a `main` (sin PRs); la rama
  `claude/album26-f0-phase-qtj1n6` se mantiene sincronizada con `main`.

## Historial

El detalle fase a fase (F0 → Fv3.8) está en `docs/DECISIONES.md`; la tabla resumen
con SHAs, en `CLAUDE.md`. Los errores encontrados por el camino y sus guardarraíles,
en `docs/ERRORES.md`.
