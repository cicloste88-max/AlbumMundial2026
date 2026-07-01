-- ============================================================
-- F1 · Esquema Supabase — inventario por usuario.
-- 'falta' = ausencia de fila (igual que el diseño borra la key en localStorage).
-- ============================================================

create table if not exists public.inventory (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  sticker    text        not null,                 -- 'MEX-2', 'RSA-13', 'FWC-9'
  state      text        not null check (state in ('tengo','repe')),
  repes      int         not null default 0 check (repes >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, sticker)
);

alter table public.inventory enable row level security;

create policy "own_rows_select" on public.inventory
  for select using (auth.uid() = user_id);
create policy "own_rows_insert" on public.inventory
  for insert with check (auth.uid() = user_id);
create policy "own_rows_update" on public.inventory
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_rows_delete" on public.inventory
  for delete using (auth.uid() = user_id);

-- mantener updated_at fresco (para conflict resolution last-write-wins)
create or replace function public.touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_touch_inventory on public.inventory;
create trigger trg_touch_inventory before update on public.inventory
  for each row execute function public.touch_updated_at();
