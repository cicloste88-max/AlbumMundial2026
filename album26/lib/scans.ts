// ============================================================
// scans.ts — Fv4.5: historial ESCANEADOS con huella en BBDD.
// Hasta Fv4.4.3 el historial vivía SOLO en localStorage (album26_scans): una
// salida accidental no lo perdía, pero un cambio de dispositivo o una limpieza
// del navegador sí. Ahora public.album_scans (RLS owner-only, una fila por
// user_id+alias) es la fuente de verdad y localStorage queda de ESPEJO:
// - toda escritura pasa por el espejo primero (síncrona, nunca falla la UI);
//   la nube va detrás en background y un fallo puntual no rompe nada.
// - al hidratar se MERGEA nube+espejo por alias (gana el ts más nuevo) y las
//   entradas que la nube no tenía (escaneos hechos sin conexión) se suben.
//   Trade-off asumido: un borrado hecho en OTRO dispositivo puede resucitar
//   si este aún guardaba la entrada en su espejo (sin tombstones a propósito).
// Mismo contrato que Fv4.4.3: payload CRUDO del QR, cap 20, upsert por alias.
// ============================================================

import { getSupabase, supabaseConfigured } from './supabase/client';

export type ScanFmt = 'a26' | 'umc';
export type ScanSaved = { ts: number; fmt: ScanFmt; alias: string; data: string; nDoy: number; nDa: number };
export const SCANS_CAP = 20;

const SCANS_KEY = 'album26_scans';

export const loadLocalScans = (): ScanSaved[] => {
  try { return JSON.parse(localStorage.getItem(SCANS_KEY) || '[]'); } catch { return []; }
};
const saveLocalScans = (list: ScanSaved[]): void => {
  try { localStorage.setItem(SCANS_KEY, JSON.stringify(list)); } catch { /* modo privado/lleno: solo memoria */ }
};

// El componente ya aplicó upsert/cap/borrado y pasa la lista final; `delta`
// describe el cambio para la nube (put = entrada nueva/refrescada, del =
// aliases que salen: el ✕ del historial o los expulsados por el cap).
export type ScansDelta = { put?: ScanSaved; del?: string[] };

export interface ScansStore {
  loadAll(): Promise<ScanSaved[]>;
  save(list: ScanSaved[], delta: ScansDelta): Promise<void>;
}

// ---------- fallback sin configuración Supabase (comportamiento Fv4.4.3) ----------
export class LocalScans implements ScansStore {
  async loadAll(): Promise<ScanSaved[]> { return loadLocalScans(); }
  async save(list: ScanSaved[]): Promise<void> { saveLocalScans(list); }
}

// ---------- Fv4.5: nube (multidispositivo, por usuario con RLS) ----------
type ScanRow = { alias: string; fmt: string; data: string; n_doy: number; n_da: number; ts: string };
const toSaved = (r: ScanRow): ScanSaved => ({
  ts: Date.parse(r.ts) || 0, fmt: r.fmt === 'umc' ? 'umc' : 'a26',
  alias: r.alias, data: r.data, nDoy: r.n_doy, nDa: r.n_da,
});
const toRow = (user_id: string, e: ScanSaved) => ({
  user_id, alias: e.alias, fmt: e.fmt, data: e.data,
  n_doy: e.nDoy, n_da: e.nDa, ts: new Date(e.ts).toISOString(),
});

export class CloudScans implements ScansStore {
  private userId: string | null = null;

  private async ensureUser(): Promise<string> {
    if (this.userId) return this.userId;
    const { data, error } = await getSupabase().auth.getUser();
    if (error || !data.user) throw new Error('sin sesión');
    this.userId = data.user.id;
    return this.userId;
  }

  async loadAll(): Promise<ScanSaved[]> {
    const local = loadLocalScans();
    const user_id = await this.ensureUser();
    const { data, error } = await getSupabase()
      .from('album_scans').select('alias,fmt,data,n_doy,n_da,ts')
      .order('ts', { ascending: false });
    if (error) throw error; // el caller se queda con el espejo local
    const byAlias = new Map<string, ScanSaved>((data ?? []).map((r) => {
      const e = toSaved(r as ScanRow);
      return [e.alias, e];
    }));
    // sanar: lo que la nube no tiene (o tiene más viejo) se sube ahora
    const pending = local.filter((l) => (byAlias.get(l.alias)?.ts ?? 0) < l.ts);
    for (const p of pending) byAlias.set(p.alias, p);
    if (pending.length) {
      try {
        await getSupabase().from('album_scans')
          .upsert(pending.map((p) => toRow(user_id, p)), { onConflict: 'user_id,alias' });
      } catch { /* se reintenta en la próxima hidratación */ }
    }
    const merged = [...byAlias.values()].sort((a, b) => b.ts - a.ts).slice(0, SCANS_CAP);
    saveLocalScans(merged);
    return merged;
  }

  async save(list: ScanSaved[], delta: ScansDelta): Promise<void> {
    saveLocalScans(list); // el espejo SIEMPRE queda al día aunque la nube falle
    const user_id = await this.ensureUser();
    const supa = getSupabase();
    if (delta.del?.length) {
      const { error } = await supa.from('album_scans').delete()
        .eq('user_id', user_id).in('alias', delta.del);
      if (error) throw error;
    }
    if (delta.put) {
      const { error } = await supa.from('album_scans')
        .upsert(toRow(user_id, delta.put), { onConflict: 'user_id,alias' });
      if (error) throw error;
    }
  }
}

// Punto único de conmutación (mismo patrón que inventory.getStore)
export function getScansStore(): ScansStore {
  return supabaseConfigured ? new CloudScans() : new LocalScans();
}
