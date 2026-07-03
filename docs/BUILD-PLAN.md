# BUILD — Álbum 2026 (Next.js + Supabase + Vercel, PWA)

Handoff de orquestación. Cada fase es un **paquete listo para Code**, en orden, con
criterios de aceptación y gate humano. La UI definitiva es tu diseño autónomo, portado
fielmente (markup/estilos 1:1, solo conmuto persistencia y estado).

## Cómo lo ejecutamos (supervisión real)

No puedo pilotar tu Claude Code desde el chat: Code corre en tu entorno. El loop es:

1. Pegas el paquete **Fn** en Code → Code ejecuta.
2. Me traes la salida de Code + la URL de preview/deploy.
3. Lo verifico contra los **criterios de aceptación** de esa fase.
4. Te doy **GO + siguiente paquete**, o un **patch** si algo falla.
5. Una fase cada vez. No avanzamos sin gate verde.

## Ficheros ya preparados (en esta carpeta `album26-build/`)

```
lib/teams.ts                 Datos: tipos + Grupo A (tus datos exactos) + hueco F2
lib/inventory.ts             Persistencia conmutable (LocalStore F0 / SupabaseStore F1)
components/AlbumPage.tsx      Port fiel de tu render (innerHTML, diseño 1:1)
supabase/schema.sql          Tabla inventory + RLS (F1)
public/fonts/fwc26.otf       Tu fuente FWC 26 extraída (asset real, 17.5 KB)
public/manifest.webmanifest  PWA (F4)
public/sw.js                 Service worker offline (F4)
```

## Pasos que requieren TU intervención (gates humanos)

- **F1** — Crear proyecto Supabase; pegar URL + anon key en `.env.local`; correr `schema.sql`; crear OAuth client de Google (Google Cloud Console) + redirect URLs; activar el provider Google en Supabase Auth.
- **F0/deploy** — Cuenta Vercel (Code despliega con token, o conectas el repo desde la UI).
- **F4** — Iconos 192/512 (te genero un par desde el "26" si quieres).

---

## F0 · Scaffold + port + deploy (Code)

**Objetivo:** app Next.js desplegada en Vercel con el Grupo A idéntico a tu diseño, persistencia localStorage.

**Pasos (Code):**
1. `npx create-next-app@latest album26 --ts --app --eslint --no-tailwind --no-src-dir` (sin Turbopack si da guerra).
2. Copia desde `album26-build/`: `lib/`, `components/`, `public/fonts/fwc26.otf`, `public/manifest.webmanifest`, `public/sw.js`.
3. `app/globals.css` — sustituye su contenido por:

```css
@font-face{
  font-family:"FWC 26";
  src:url("/fonts/fwc26.otf") format("opentype");
  font-weight:400;font-style:normal;font-display:swap;
}
:root{
  --font-fifa:"FWC 26","Arial Black",sans-serif;
  --font-display:"Saira","SF Pro Display",-apple-system,system-ui,sans-serif;
  --font-text:"Inter",-apple-system,system-ui,sans-serif;
  --font-numeric:"Saira","SF Mono",ui-monospace,monospace;
  --ink-900:#0A0E1A;--ink-700:#1F2433;--ink-600:#2A3142;
  --ink-500:#4A5163;--ink-400:#7A8194;--ink-300:#B8BEC9;
}
*{box-sizing:border-box;-webkit-font-smoothing:antialiased;}
html,body{margin:0;}
body{background:#e7e3d6;font-family:var(--font-text);color:var(--ink-900);display:flex;justify-content:center;min-height:100vh;}
button{font-family:inherit;}
.page{width:390px;max-width:100%;background:#F4F1E6;min-height:880px;position:relative;overflow:hidden;padding-bottom:20px;}
```

4. `app/layout.tsx` — añade Saira+Inter (next/font/google) para fidelidad, metadata y manifest:

```tsx
import './globals.css';
import { Inter, Saira } from 'next/font/google';
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const saira = Saira({ subsets: ['latin'], weight: ['600','700','800'], variable: '--font-saira' });
export const metadata = { title: 'Álbum 2026 — Cromos', manifest: '/manifest.webmanifest',
  themeColor: '#F4F1E6', appleWebApp: { capable: true, statusBarStyle: 'default' } };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="es" className={`${inter.variable} ${saira.variable}`}><body>{children}</body></html>);
}
```
   (Para que `--font-display`/`--font-text` usen estas fuentes, mapea en globals.css:
   `--font-display:var(--font-saira),...;` `--font-text:var(--font-inter),...;`)

5. `app/page.tsx`:

```tsx
import AlbumPage from '@/components/AlbumPage';
export default function Page() { return <AlbumPage />; }
```

6. `npm run dev` → comparar Grupo A contra `Album-Stickers-2026.html` (debe ser idéntico).
7. Deploy: `vercel --prod` (o conectar repo en vercel.com).

**Criterios de aceptación:**
- Grupo A pixel-fiel a tu HTML (cabecera WE ARE, motivo "26", tiles, grupo, footer).
- Tap cicla falta→tengo→repe; check, badge ×N y stepper +/− funcionan.
- "Pegados X/20", %, barra y contador REPES correctos; ↺ reinicia.
- Persiste tras recargar (localStorage). URL de Vercel abre en móvil.

**Gate F0→F1:** me pasas la URL; confirmo fidelidad y lógica. ✅ → F1.

---

## F1 · Supabase + login Google + sync (Code + TÚ)

**Objetivo:** inventario en Supabase por usuario, sincronizado entre dispositivos.

**TÚ (antes):** crea proyecto Supabase; corre `supabase/schema.sql`; `.env.local` con
`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`; configura Google OAuth
(client en Google Cloud + redirect `https://<tu-proyecto>.supabase.co/auth/v1/callback`
y la URL de Vercel); activa Google en Supabase → Auth → Providers.

**Code:**
1. `npm i @supabase/supabase-js @supabase/ssr`
2. `lib/supabase.ts`:

```ts
import { createBrowserClient } from '@supabase/ssr';
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
```

3. En `lib/inventory.ts`: descomenta `SupabaseStore` y cambia `getStore()` a
   `return session ? new SupabaseStore() : new LocalStore();` (pasa la sesión o léela dentro).
4. Login mínimo: botón "Entrar con Google" → `supabase.auth.signInWithOAuth({ provider:'google' })`.
   Mostrar avatar/logout. `AlbumPage` recarga inventario al cambiar sesión.
5. **Migración**: en el primer login, si hay claves `album26_*` en localStorage, subirlas a la
   tabla (upsert) y luego limpiarlas. Idempotente.

**Criterios de aceptación:**
- Login/logout Google OK. Inventario igual en móvil y desktop tras login.
- Cambios en un dispositivo aparecen en el otro al recargar.
- Sin sesión: sigue funcionando con localStorage. `falta` = fila borrada.

**Gate F1→F2:** pruebas sync en 2 navegadores; confirmo. ✅ → F2.

---

## F2 · Datos de las 48 selecciones (Haiku, orquestado)

**Objetivo:** `lib/teams.ts` con las 48 (grupos B–L) + 20 especiales, misma forma de tipo.

**Prompt para Code (spawnea subagentes Haiku, uno por equipo o en lotes):**

> Para cada código de equipo de la lista, abre `https://scanini.app/teams/{nombre-pais}`
> (usa el slug en inglés; la página lista los 20 cromos en orden con número y nombre).
> Emite UN objeto `Team` con EXACTAMENTE estos campos y forma (ver `lib/teams.ts`):
> `name` (ES, mayúsculas), `code`, `group` (del álbum/draw real, NO inventar), `fed`,
> `roster` (20 entradas `[num, 'Nombre', 'APELLIDO']`; num 1 → `[1,'','']`, num 13 → `[13,'','']`).
> Colores/`flag`: deja **baseline** placeholder marcado `/* F3 */` — los fija F3, no los inventes.
> Si un dato no está en la fuente, marca `// TODO:<qué falta>` y NO rellenes a ojo.
> Salida: TS válido, listo para pegar dentro de `TEAMS`. Valida 20 entradas y números 1–20 sin huecos.

**Códigos (48):** ALG ARG AUS AUT BEL BIH BRA CAN CIV COD COL CPV CRO CUW CZE ECU EGY ENG ESP FRA GER GHA HAI IRN IRQ JOR JPN KOR KSA MAR MEX NED NOR NZL PAN PAR POR QAT RSA SCO SEN SUI SWE TUN TUR URU USA UZB.
(MEX/RSA/KOR/CZE ya están en Grupo A — no rehacer.)

**Yo superviso:** reviso el TS resultante, valido contra scanini una muestra (p.ej. ESP, BRA, FRA),
y verifico 20/equipo sin TODO antes de dar GO.

**Criterios de aceptación:** 48 equipos, 20 entradas c/u, números 1–20, nombres correctos, compila.

**Gate F2→F3:** spot-check OK. ✅ → F3.

---

## F3 · Banderas reales + paletas baseline + switcher por grupos (Code)

**Objetivo:** navegar las 48 por grupo, banderas y paletas legibles, sin trabajo manual ×48.

**Code:**
1. `npm i country-flag-icons` (SVG por ISO). Helper `flagSrc(code3)` → ISO2 → SVG.
   Sustituye los gradientes CSS de `team.flag` por el SVG real (mantén el gradiente como fallback).
2. **Paletas baseline** derivadas de colores nacionales (no a mano ×48): por equipo, toma 2–3
   colores dominantes de la bandera → asigna `team`=primario, `ink`=oscuro legible, `win`=#FFF,
   `motif`=primario −12% luz, `accent`=secundario, `accentInk`=contraste, `titleA/B`=primario/secundario.
   Garantiza contraste AA del texto sobre `team`/`accent` (si falla, oscurece `ink`).
   Deja override manual por equipo para los que San quiera afinar.
3. **Switcher por grupos:** hoy las tabs muestran solo el grupo actual (4). Añade un selector de
   grupo (A–L) arriba; las 4 tabs muestran los equipos del grupo elegido. `ORDER` deja de ser global.

**Criterios:** las 48 navegables por grupo; banderas correctas; texto legible en toda paleta.

**Gate F3→F4:** revisión visual (te paso capturas de varios grupos). ✅ → F4.

---

## F4 · PWA instalable (Code + TÚ)

**Objetivo:** instalable en el móvil, abre offline.

**Code:**
1. Registra el SW en `layout` (cliente): `if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js')`.
2. Iconos `public/icons/icon-192.png` y `-512.png` (TÚ los das, o te los genero del "26").
3. Prompt de instalación (`beforeinstallprompt`) con botón "Instalar".

**Criterios:** "Añadir a pantalla de inicio" funciona; abre sin red; icono correcto.

**Gate F4 (final):** lo instalas en tu teléfono y validas. ✅ → **resultado final: app desplegada, multidispositivo, instalable.**

---

## Resumen de secuencia

| Fase | Quién | Bloquea a | Gate |
|---|---|---|---|
| F0 scaffold+port+deploy | Code | F1 | URL Vercel, fidelidad Grupo A |
| F1 Supabase+auth+sync | Code + tú | F2 | sync 2 dispositivos |
| F2 datos 48 | Haiku (orquesto yo) | F3 | spot-check rosters |
| F3 banderas+paletas+grupos | Code | F4 | revisión visual |
| F4 PWA | Code + tú | — | instalación en móvil |

Dime cuándo arrancas F0 (o si quieres que te genere ya los iconos para no frenar en F4).
