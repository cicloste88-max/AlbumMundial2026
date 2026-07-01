// ============================================================
// inventory.ts — Capa de persistencia conmutable.
// F0 usa LocalStore. F1 cambia UNA línea (ver getStore) a SupabaseStore.
// El componente solo conoce la interfaz InventoryStore.
// ============================================================

export type Entry = { state: 'tengo' | 'repe'; repes: number };
export type InvMap = Record<string, Entry>; // { 'MEX-2': {state,repes}, ... }

export interface InventoryStore {
  loadCountry(code: string): Promise<InvMap>;
  put(sticker: string, entry: Entry | null): Promise<void>; // null = borrar (= 'falta')
}

// ---------- F0: LocalStorage (1 dispositivo, sin login) ----------
export class LocalStore implements InventoryStore {
  private key(code: string) { return 'album26_' + code; }
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
}

// ---------- F1: Supabase (multidispositivo, login Google) ----------
// Requiere lib/supabase.ts con el browser client (createBrowserClient).
// Descomentar en F1:
/*
import { supabase } from './supabase';
export class SupabaseStore implements InventoryStore {
  async loadCountry(code: string): Promise<InvMap> {
    const { data, error } = await supabase
      .from('inventory').select('sticker,state,repes')
      .like('sticker', code + '-%');
    if (error || !data) return {};
    const map: InvMap = {};
    for (const r of data) map[r.sticker] = { state: r.state, repes: r.repes };
    return map;
  }
  async put(sticker: string, entry: Entry | null): Promise<void> {
    const { data: u } = await supabase.auth.getUser();
    const user_id = u.user?.id;
    if (!user_id) return;
    if (entry) {
      await supabase.from('inventory')
        .upsert({ user_id, sticker, state: entry.state, repes: entry.repes });
    } else {
      await supabase.from('inventory').delete().eq('sticker', sticker);
    }
  }
}
*/

// Punto único de conmutación F0 -> F1
export function getStore(): InventoryStore {
  return new LocalStore();
  // F1: return session ? new SupabaseStore() : new LocalStore();
}
