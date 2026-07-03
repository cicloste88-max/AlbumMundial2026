# Pendientes y temas abiertos

## Typos de la checklist oficial — PENDIENTES de validación física por San
Cargados TAL CUAL en `lib/album-data.ts` (NO corregir de memoria; solo cambiarlos si
San los valida contra el álbum físico y llega paquete con datos nuevos):

- CAN-6 RICHE LARVEA
- USA-2 MATH FREESE
- USA-10 WESTON MCKENNY
- MAR-8 EL YAMIO
- KOR-16 DONGG-YEONG
- JPN-3 HENRY HEROKI
- NZL-2 MAX CROCOMBE PAYNE
- HAI-15 DERRICK ETIENNE JR

## Datos de verificación en revisión (Fv3.3, payload album-verif-48)
Placeholders en la app hasta que llegue payload nuevo (NO inventar):
- **fed** pendiente en 6: AUS, NZL, SCO, SWE, PAR, URU.
- **mlang** pendiente en 1: IRN (placeholder = país del dataset "IRAN").
- **quali** solo RSA (GT); los otros 47 en revisión (filas vacías).
- Nomenclatura del payload: equipos en forma FIFA (Korea Republic, IR Iran,
  Côte d'Ivoire, Cabo Verde, Congo DR, Czechia, Türkiye); estadios en forma
  álbum; BC Place → "BC Place Vancouver".

## Requisito #2 — imágenes de cromos recortadas: **PAUSADO**
No añadir nada de recorte hasta que se reactive. El markup ya deja el hueco
(`img.imgslot` dentro de `.sticker .art`, display:none).

## F1 — Supabase (multidispositivo, login Google): pendiente
- `supabase/schema.sql` listo (tabla `inventory` + RLS + trigger updated_at). SIN aplicar.
- `SupabaseStore` (con `clear()`) comentado en `lib/inventory.ts`; conmutación en
  `getStore()`. Requiere gates humanos: proyecto Supabase, `.env.local`, OAuth Google.
- Migración prevista: primer login sube claves `album26_*` de localStorage (idempotente).

## F4 — PWA: parcial
- `manifest.webmanifest` y `sw.js` están en `public/` pero el **service worker no se
  registra** todavía; faltan iconos `public/icons/icon-192.png` y `icon-512.png` (los
  aporta San o se generan del "26").

## UI / visual
- **Animación de paso de vistas** (desktop spread): hoy es instantánea. Opción acordada
  si el gate la pide: slide corto + fade (iteración pequeña).
- `AlbumPage.tsx` + `lib/teams.ts`: legacy F0, no borrar hasta gate humano.
- Banderas: si falta un PNG en el bucket `flags/`, `flagErr` degrada a `.noflag` con el
  código — revisar bucket si algún país sale sin bandera en prod.

## Infraestructura / entorno
- El sandbox de Claude Code **no llega a supabase.co** (política de red): handoffs y
  status por MCP de Supabase; los screenshots locales muestran `.noflag`.
- Canal de estado con el orquestador: `public.build_handoff`, fila `k='fv32-status'`
  (o la clave que indique el paquete de cada fase).
