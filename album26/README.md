# album26 — la app

App Next.js 16 (App Router + TypeScript estricto, sin Tailwind) del tracker de cromos
del Mundial 2026. Es el **Root Directory** del proyecto de Vercel `album-mundial2026`
(auto-deploy al pushear `main`). Visión general del proyecto: `../README.md`;
memoria de convenciones e invariantes: `../CLAUDE.md`.

## Scripts

```bash
npm run dev        # desarrollo en :3000 (el SW NO se registra en dev)
npm run build      # build de producción — estricto, sin ignoreBuildErrors
npm start          # servir el build (necesario para probar SW/PWA y para las suites)
npm run lint       # eslint

npm run qa:movil   # fv31 · funcional+visual móvil (57 checks)
npm run qa:spread  # fv32 · spread desktop + persistencia cross-modo (24)
npm run qa:verif   # fv33 · datos verificados / placeholders anti-invención (18)
npm run qa:visual  # fv34 · header + bloque GROUP + screenshots de gate (15)
npm run qa:geo     # fv35 · geometría móvil 360×740 (24)
npm run qa:pwa     # fv36 · manifest/SW/iconos + img sin src (14)
npm run qa:grid    # fv37 · invariante "la parrilla manda" (24)
npm run qa:ios     # fv38 · presupuesto iOS + safe-areas nativas (13)
npm run qa:auth    # fv40 · auth + progreso en nube con mocks (19)
npm run qa:collection # fv41 · panel Mi colección (22)
```

Las suites necesitan la app corriendo con `QA_AUTH_MOCK=1` (`QA_URL`, default
`http://localhost:3000/`) y un Chromium local (`QA_CHROME`); detalles en
`qa/README.md`. Para build/dev hace falta `.env.local` con
`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Estructura

```
app/
├── layout.tsx        fuentes next/font (Inter, Saira, Baloo 2, Barlow SC), metadata
│                     PWA (manifest, apple-touch-icon) y registro del SW (solo prod)
├── globals.css       reset F0 + @font-face FWC26
├── page.tsx          → <AlbumBook/>
├── login/page.tsx    Fv4.0: Entrar/Registrarse (email+password, registro abierto)
└── auth/             confirm (token_hash) y callback (code) del email de Supabase
proxy.ts              Fv4.0: sesión @supabase/ssr (convenio Next 16); sin sesión → /login
components/
├── AlbumBook.tsx     TODO el motor: datos→HTML (builders string), CSS del libro
│                     (template literal), navegación, estados, swipe, fitHeaders
└── AlbumPage.tsx     LEGACY F0 (Grupo A) — no borrar hasta gate humano
lib/
├── album-data.ts     GENERADO desde build_handoff (ORDER/PALETAS/ALBUM_TEAMS/VERIF)
│                     — NO editar a mano; se regenera por script en cada fase de datos
├── inventory.ts      InventoryStore (loadAll/loadCountry/put/clear) · CloudStore
│                     (album_progress, Fv4.0) · LocalStore de fallback
├── supabase/         client.ts (browser singleton) · server.ts (route handlers)
└── teams.ts          LEGACY F0
public/
├── fonts/fwc26.otf   wordmark FWC26
├── manifest.webmanifest  PWA (iconos absolutos del bucket flags/icons/)
└── sw.js             SW mínimo: cache-first /_next/static, network-first documento,
                      guardas Safari (sin redirects cacheados, fallback offline)
qa/                   suites Playwright + screenshots de gate (qa/README.md)
supabase/schema.sql   F1 (tabla inventory + RLS) — AÚN SIN APLICAR
```

## Reglas que no se pueden romper (resumen; detalle en ../CLAUDE.md)

- **La parrilla manda** (Fv3.7): todos los cromos de jugador de una página miden lo
  mismo (max/min ≤ 1.02); el bloque GROUP vive en el hueco de una columna. `qa:grid`.
- **Presupuesto iOS** (Fv3.8): `bookHTML` monta solo las hojas actual ±2 y la sombra
  del libro va en `.book::before` — devolver el `filter` al `.book` o montar las 98
  hojas crashea Safari/iOS por memoria. `qa:ios`.
- **Anti-invención**: `album-data.ts` no se edita a mano; los datos en revisión se
  muestran como placeholder; los typos de la checklist oficial se cargan TAL CUAL.
- **Persistencia**: el reset de un equipo usa `store.clear(code)` — nunca un bucle de
  `put(k, null)` (race conocido, documentado en ../docs/ERRORES.md).
- **Motor UI**: builders HTML-string + delegación de eventos + rebuild de innerHTML.
  No migrar a JSX granular sin paquete que lo pida.
