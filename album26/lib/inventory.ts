// ============================================================
// inventory.ts — Capa de persistencia conmutable.
// F0: LocalStore (localStorage, 1 dispositivo).
// Fv4.0: CloudStore contra public.album_progress (RLS owner-only), sesión
// Supabase por cookies. getStore() conmuta según haya configuración.
// El componente solo conoce la interfaz InventoryStore.
// ============================================================

import { getSupabase, supabaseConfigured } from './supabase/client';

export type Entry = { state: 'tengo' | 'repe'; repes: number };
export type InvMap = Record<string, Entry>; // { 'MEX-2': {state,repes}, ... }

export interface InventoryStore {
  /** todo el progreso del usuario de una vez (hidratación al montar) */
  loadAll(): Promise<Record<string, InvMap>>;
  loadCountry(code: string): Promise<InvMap>;
  put(sticker: string, entry: Entry | null): Promise<void>; // null = 'falta'
  clear(code: string): Promise<void>; // borra TODO el país de una vez (reset)
}

// ---------- F0: LocalStorage (fallback sin configuración Supabase) ----------
export class LocalStore implements InventoryStore {
  private key(code: string) { return 'album26_' + code; }
  async loadAll(): Promise<Record<string, InvMap>> {
    const all: Record<string, InvMap> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('album26_')) {
          all[k.slice('album26_'.length)] = JSON.parse(localStorage.getItem(k) || '{}');
        }
      }
    } catch {}
    return all;
  }
  async loadCountry(code: string): Promise<InvMap> {
    try { return JSON.parse(localStorage.getItem(this.key(code)) || '{}'); }
    catch { return {}; }
  }
  async put(sticker: string, entry: Entry | null): Promise<void> {
    const code = sticker.split('-')[0];
    const map = await this.loadCountry(code);
    if (entry) map[sticker] = entry; else delete map[sticker];
    try { localStorage.setItem(this.key(code), JSON.stringify(map)); } catch {}
  }
  async clear(code: string): Promise<void> {
    try { localStorage.removeItem(this.key(code)); } catch {}
  }
}

// ---------- Fv4.0: nube (multidispositivo, por usuario con RLS) ----------
// Tabla public.album_progress (user_id, slot 'MEX-11', pegado bool, repes 0..5).
// Mapeo: 'falta' = pegado:false/repes:0 · 'tengo' = pegado:true/repes:0 ·
//        'repe'  = pegado:true/repes:1..5.
// put/clear LANZAN si el servidor falla: el motor hace optimistic UI y revierte.
export class CloudStore implements InventoryStore {
  private userId: string | null = null;

  private async ensureUser(): Promise<string> {
    if (this.userId) return this.userId;
    const { data, error } = await getSupabase().auth.getUser();
    if (error || !data.user) throw new Error('sin sesión');
    this.userId = data.user.id;
    return this.userId;
  }

  private static toEntry(r: { pegado: boolean; repes: number }): Entry | null {
    if (!r.pegado) return null;
    return r.repes > 0 ? { state: 'repe', repes: r.repes } : { state: 'tengo', repes: 0 };
  }

  async loadAll(): Promise<Record<string, InvMap>> {
    await this.ensureUser();
    const { data, error } = await getSupabase()
      .from('album_progress').select('slot,pegado,repes');
    if (error) throw error;
    const all: Record<string, InvMap> = {};
    for (const r of data ?? []) {
      const e = CloudStore.toEntry(r);
      if (!e) continue;
      const code = r.slot.split('-')[0];
      (all[code] ||= {})[r.slot] = e;
    }
    return all;
  }

  async loadCountry(code: string): Promise<InvMap> {
    await this.ensureUser();
    const { data, error } = await getSupabase()
      .from('album_progress').select('slot,pegado,repes')
      .like('slot', code + '-%');
    if (error) throw error;
    const map: InvMap = {};
    for (const r of data ?? []) {
      const e = CloudStore.toEntry(r);
      if (e) map[r.slot] = e;
    }
    return map;
  }

  async put(sticker: string, entry: Entry | null): Promise<void> {
    const user_id = await this.ensureUser();
    const row = {
      user_id,
      slot: sticker,
      pegado: entry !== null,
      repes: entry?.state === 'repe' ? entry.repes : 0,
      updated_at: new Date().toISOString(),
    };
    const { error } = await getSupabase()
      .from('album_progress').upsert(row, { onConflict: 'user_id,slot' });
    if (error) throw error;
  }

  async clear(code: string): Promise<void> {
    const user_id = await this.ensureUser();
    const { error } = await getSupabase()
      .from('album_progress').delete()
      .eq('user_id', user_id).like('slot', code + '-%');
    if (error) throw error;
  }
}

// Punto único de conmutación: con Supabase configurado, progreso en nube.
export function getStore(): InventoryStore {
  return supabaseConfigured ? new CloudStore() : new LocalStore();
}
