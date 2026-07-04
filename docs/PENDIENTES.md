# Pendientes y temas abiertos

> Estado del proyecto: **v1.0.0 EN PRODUCCIÓN** (Fv3.8, gate humano de San OK en
> desktop y Safari/iOS). Lo de abajo es el trabajo futuro y los datos en revisión.

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
No añadir nada de recorte hasta que se reactive. Desde Fv3.6 la `img.imgslot` NO se
emite (una `<img>` sin src audita como rota — 9 en portada por las hojas vecinas
montadas): cuando el requisito traiga URLs reales, `tileHTML` debe emitir la `<img>`
solo con src válido (el CSS `.imgslot` sigue en su sitio).

## F1/Fv4.0 — Auth + progreso en nube: ✅ HECHO (Fv4.0), pendiente gate de prod
- Registro abierto email+password + progreso por usuario en `album_progress`
  (RLS owner-only). El plan F1 original (login Google) quedó sustituido por la
  decisión de San en Fv4.0; `supabase/schema.sql` (tabla `inventory`) es HISTÓRICO
  y no se aplicará — la migración real versionada está en
  `supabase/migrations/0001_album_progress.sql` (ya aplicada por el orquestador).
- **GATE DE PROD pendiente**: añadir en Vercel `NEXT_PUBLIC_SUPABASE_URL` y
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` ANTES de que prod funcione (sin ellas todo
  redirige a /login). JAMÁS definir `QA_AUTH_MOCK` en Vercel. E2E real (signup +
  confirmación de email + RLS + multidispositivo) a validar por el orquestador.
- Migración localStorage→nube NO incluida (el brief Fv4.0 no la pedía): los
  usuarios empiezan de cero en la nube. Si San la quiere, es una fase pequeña
  (subir claves `album26_*` en el primer login, idempotente).
- Enlace del email de confirmación: sin tocar la allowlist global (compartida con
  la Porra) el usuario puede aterrizar en el Site URL de la Porra tras confirmar —
  la cuenta queda confirmada igualmente y entra por /login. Si San quiere que
  aterrice en el álbum: añadir la URL del álbum a Auth → URL Configuration
  (decisión suya, es setting global).

## Fv4.1 — Empaquetado nativo: NO EMPEZAR sin paquete
- Decisión de San: primero web (Fv4.0), después el empaquetado tipo app nativa.

## F4 — PWA: ✅ instalable desde Fv3.6
- Manifest completo (name/short_name/display standalone/colores `#1E1B33`), iconos
  192/512 servidos desde el bucket (`flags/icons/…`, URLs absolutas, subidos por San),
  SW mínimo (cache-first `/_next/static`, network-first documento, banderas fuera)
  registrado solo en producción, meta iOS (apple-touch-icon + capable).
- Safari/iOS validado por San en v1.0 (tras el fix Fv3.8 de presupuesto de capas).
  Pendiente menor: confirmar la instalación como app (añadir a pantalla de inicio)
  y decidir si se quiere pantalla offline dedicada (hoy: fallback a caché).

## UI / visual
- **Animación de paso de vistas** (desktop spread): hoy es instantánea. Opción acordada
  si el gate la pide: slide corto + fade (iteración pequeña).
- `AlbumPage.tsx` + `lib/teams.ts`: legacy F0, no borrar hasta gate humano.
- Banderas: si falta un PNG en el bucket `flags/`, `flagErr` degrada a `.noflag` con el
  código — revisar bucket si algún país sale sin bandera en prod.

## Infraestructura / entorno
- El sandbox de Claude Code **no llega a supabase.co** (política de red): handoffs y
  status por MCP de Supabase; las suites interceptan `flags/` con un PNG fixture
  (`page.route` + `serviceWorkers:'block'`) y el CDN real se valida en prod.
- El sandbox no tiene WebKit (solo Chromium): lo específico de Safari/iOS se
  verifica por presupuesto medible (capas CDP, `qa:ios`) + gate humano en iPhone.
- Canal de estado con el orquestador: `public.build_handoff`, fila `k='fvXX-status'`
  (la clave que indique el paquete de cada fase).
