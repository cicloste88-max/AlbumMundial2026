-- Fv4.5 — Historial ESCANEADOS por usuario (huella en BBDD, RLS owner-only).
-- ¡YA APLICADA vía MCP (migración `album_scans`)! Este fichero es la versión
-- de referencia en el repo: NO re-aplicar sobre el proyecto.
-- Una fila por (user_id, alias): re-escanear a la misma persona la refresca.
-- `data` guarda el payload CRUDO del QR — el cruce se recalcula al consultar
-- contra la colección ACTUAL (mismo contrato que el historial local Fv4.4.3).

create table if not exists public.album_scans (
  user_id uuid not null references auth.users (id) on delete cascade,
  alias   text not null,
  fmt     text not null default 'a26' check (fmt in ('a26','umc')),
  data    text not null,
  n_doy   integer not null default 0,
  n_da    integer not null default 0,
  ts      timestamptz not null default now(),
  primary key (user_id, alias)
);

alter table public.album_scans enable row level security;

create policy "album_scans_select_own" on public.album_scans
  for select using (auth.uid() = user_id);
create policy "album_scans_insert_own" on public.album_scans
  for insert with check (auth.uid() = user_id);
create policy "album_scans_update_own" on public.album_scans
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "album_scans_delete_own" on public.album_scans
  for delete using (auth.uid() = user_id);
