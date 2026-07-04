-- Fv4.0 — Progreso del álbum por usuario (registro abierto, RLS owner-only).
-- ¡YA APLICADA por el orquestador en el proyecto compartido! Este fichero es la
-- versión de referencia en el repo: NO re-aplicar sobre el proyecto.
-- Slot canónico: "{TEAM}-{n}" (MEX-11, HAI-1). Los slots 1 (foil) y 13
-- (TEAM PHOTO) cuentan como slots normales.

create table if not exists public.album_progress (
  user_id    uuid not null references auth.users (id) on delete cascade,
  slot       text not null,
  pegado     boolean not null default false,
  repes      integer not null default 0 check (repes between 0 and 5),
  updated_at timestamptz not null default now(),
  primary key (user_id, slot)
);

alter table public.album_progress enable row level security;

create policy "album_progress_select_own" on public.album_progress
  for select using (auth.uid() = user_id);
create policy "album_progress_insert_own" on public.album_progress
  for insert with check (auth.uid() = user_id);
create policy "album_progress_update_own" on public.album_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "album_progress_delete_own" on public.album_progress
  for delete using (auth.uid() = user_id);
