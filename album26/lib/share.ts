// ============================================================
// share.ts — Fv4.4: compartir colección.
// - Formato NATIVO Álbum26: {origin}/s#v1.<base64url(deflate-raw(JSON))>
//   JSON = { u: alias, t: epoch, r: [[índice, cantidad]] } + f: [faltantes]
//   O BIEN g: [tengo] (complemento) — se emite la lista MÁS CORTA para que el
//   QR nunca sea denso en los extremos del progreso; decode materializa f.
// - INTEROP con la app "Figuritas" (nombre del formato en su spec:
//   "UsaMexCan26-QR", de ahí el alias interno UMC): build_handoff k='qr-interop-spec'
//   (md5 f433860dd0a80a1333313c8a1b6f7b55, 5 anclas verificadas):
//   payload = PREFIJO_BYTES(e7ab99e69591) + b64(gzip(bitmap_faltantes)) + ';'
//             + b64(gzip(bitmap_repes))
//   bitmaps de 125 bytes / 1000 bits, LSB-first por byte;
//   bloque1: 1 = ME FALTA (semántica invertida) · bloque2: 1 = tengo repe
//   (sin cantidad). Posiciones: 0='00', 1..19=FWC, 20..979=equipos en orden de
//   álbum (bloques de 20, cromo n => base+n-1), 980..991=CC, 992..999 padding.
// Este módulo se carga LAZY (solo al abrir la hoja Compartir o /s).
// ============================================================
import { ORDER } from './album-data';
import type { InvMap, Entry } from './inventory';

// ---------- orden canónico de slots (0..991), idéntico a la spec ----------
export const CANON: string[] = (() => {
  const a: string[] = ['00'];
  for (let i = 1; i <= 19; i++) a.push('FWC-' + i);
  for (const code of ORDER) for (let n = 1; n <= 20; n++) a.push(code + '-' + n);
  for (let i = 1; i <= 12; i++) a.push('CC-' + i);
  return a;
})();
export const CANON_INDEX: Record<string, number> = {};
CANON.forEach((k, i) => { CANON_INDEX[k] = i; });

type Invs = Record<string, InvMap>;
const entryOf = (invs: Invs, key: string): Entry | undefined => (invs[key.split('-')[0]] || {})[key];

export type ShareState = { faltan: number[]; repes: [number, number][] };
export function stateToShare(invs: Invs): ShareState {
  const faltan: number[] = [];
  const repes: [number, number][] = [];
  CANON.forEach((key, i) => {
    const e = entryOf(invs, key);
    if (!e) faltan.push(i);
    else if (e.state === 'repe' && e.repes > 0) repes.push([i, e.repes]);
  });
  return { faltan, repes };
}

// ---------- utilidades bytes/base64/compresión (browser) ----------
const te = new TextEncoder();
const td = new TextDecoder();

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
function bytesToB64(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}
function b64ToBytes(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const b64url = (b: Uint8Array) => bytesToB64(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function pack(bytes: Uint8Array, format: 'gzip' | 'deflate-raw'): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream(format));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function unpack(bytes: Uint8Array, format: 'gzip' | 'deflate-raw'): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream(format));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// ---------- formato NATIVO ----------
export type NativePayload = { u: string; t: number; f: number[]; r: [number, number][] };

export async function encodeNative(alias: string, invs: Invs): Promise<string> {
  const st = stateToShare(invs);
  const base = { u: alias || '', t: Math.floor(Date.now() / 1000), r: st.repes };
  // la lista más corta: f (faltantes) o g (complemento = tengo). Un QR con 991
  // índices en f sale a versión ~40 y ningún lector lo decodifica bien.
  let wire: Record<string, unknown>;
  if (st.faltan.length > 496) {
    const fs = new Set(st.faltan);
    const g: number[] = [];
    for (let i = 0; i < 992; i++) if (!fs.has(i)) g.push(i);
    wire = { ...base, g };
  } else {
    wire = { ...base, f: st.faltan };
  }
  return 'v1.' + b64url(await pack(te.encode(JSON.stringify(wire)), 'deflate-raw'));
}

// acepta 'v1.xxx', '#v1.xxx' o una URL completa …/s#v1.xxx; devuelve f SIEMPRE
// materializada (si el emisor mandó g, se reconstruye el complemento aquí)
export async function decodeNative(input: string): Promise<NativePayload> {
  const m = input.match(/v1\.([A-Za-z0-9_-]+)/);
  if (!m) throw new Error('formato');
  const json = JSON.parse(td.decode(await unpack(b64ToBytes(m[1]), 'deflate-raw')));
  if (!Array.isArray(json.r) || (!Array.isArray(json.f) && !Array.isArray(json.g))) throw new Error('payload');
  let f: number[];
  if (Array.isArray(json.f)) {
    f = json.f;
  } else {
    const g = new Set<number>(json.g);
    f = [];
    for (let i = 0; i < 992; i++) if (!g.has(i)) f.push(i);
  }
  return { u: String(json.u || ''), t: +json.t || 0, f, r: json.r };
}

// ---------- formato INTEROP Figuritas (alias interno UMC) ----------
export const UMC_PREFIX_HEX = 'e7ab99e69591';
const UMC_PREFIX_STR = td.decode(hexToBytes(UMC_PREFIX_HEX)); // los 6 bytes como texto UTF-8

function bitmapFrom(set: Iterable<number>): Uint8Array {
  const b = new Uint8Array(125); // 1000 bits; 992..999 quedan a 0 (padding)
  for (const i of set) if (i >= 0 && i < 1000) b[i >> 3] |= 1 << (i & 7); // LSB-first
  return b;
}
function bitsToSet(bytes: Uint8Array): Set<number> {
  const out = new Set<number>();
  for (let i = 0; i < 992; i++) if ((bytes[i >> 3] >> (i & 7)) & 1) out.add(i);
  return out;
}

export async function encodeUMC(faltanIdx: Iterable<number>, repeIdx: Iterable<number>): Promise<string> {
  const p1 = bytesToB64(await pack(bitmapFrom(faltanIdx), 'gzip'));
  const p2 = bytesToB64(await pack(bitmapFrom(repeIdx), 'gzip'));
  return UMC_PREFIX_STR + p1 + ';' + p2;
}

export async function decodeUMC(data: string): Promise<{ faltan: Set<number>; repes: Set<number> }> {
  let s = data.trim();
  if (s.startsWith(UMC_PREFIX_STR)) s = s.slice(UMC_PREFIX_STR.length);
  const parts = s.split(';');
  if (parts.length !== 2 || !parts[0].startsWith('H4sI') || !parts[1].startsWith('H4sI')) throw new Error('formato');
  const [f, r] = await Promise.all(parts.map(async (p) => bitsToSet(await unpack(b64ToBytes(p), 'gzip'))));
  return { faltan: f, repes: r };
}

// ---------- lectura de QR (Fv4.4.2) ----------
// Dos motores: BarcodeDetector es el detector NATIVO del navegador (ML Kit en
// Android, Vision en iOS 17+) y lee sin problema los QR densos con logo central
// de la app Figuritas; jsQR queda de fallback donde la API no existe (desktop
// Linux/Windows, sandbox de QA).
type BarcodeDetectorLike = { detect(src: CanvasImageSource): Promise<{ rawValue?: string }[]> };
export function nativeDetector(): BarcodeDetectorLike | null {
  try {
    const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => BarcodeDetectorLike }).BarcodeDetector;
    return BD ? new BD({ formats: ['qr_code'] }) : null;
  } catch { return null; }
}
export async function readQR(cv: HTMLCanvasElement): Promise<string | null> {
  try {
    const hits = await nativeDetector()?.detect(cv);
    if (hits?.[0]?.rawValue) return hits[0].rawValue;
  } catch { /* API presente pero sin backend real: sigue jsQR */ }
  const jsQR = (await import('jsqr')).default;
  const cx = cv.getContext('2d', { willReadFrequently: true })!;
  const img = cx.getImageData(0, 0, cv.width, cv.height);
  return jsQR(img.data, img.width, img.height)?.data || null;
}
// La escala buena depende del QR y del ruido (JPEG) y NO es monótona — medido:
// un v30 en screenshot 1080×2340 solo se lee a escala nativa y un v40+JPEG solo
// reducido a 1200 (el suavizado filtra el ruido). Por eso se intenta en serie
// (el downscale único a 1200 dejaba ilegible la captura real de Figuritas).
const QR_SCALES = [2600, 1600, 1200, 800];
export async function readQRMultiScale(bmp: ImageBitmap): Promise<string | null> {
  for (const maxSide of QR_SCALES) {
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    cv.getContext('2d', { willReadFrequently: true })!.drawImage(bmp, 0, 0, w, h);
    const hit = await readQR(cv);
    if (hit) return hit;
  }
  return null;
}

// autodetección de un QR ajeno
export function detectFormat(data: string): 'native' | 'umc' | null {
  if (/v1\.[A-Za-z0-9_-]+/.test(data) && (data.includes('/s#') || data.startsWith('v1.') || data.startsWith('#v1.'))) return 'native';
  if (data.startsWith(UMC_PREFIX_STR) || (data.includes(';H4sI') && data.includes('H4sI'))) return 'umc';
  return null;
}

// ---------- cruce local ----------
export type CruceItem = { slot: string; count: number };
export type Cruce = { leDoy: CruceItem[]; meDa: CruceItem[] };

export function cruce(
  mine: { faltan: Set<number>; repes: Map<number, number> },
  theirs: { faltan: Set<number>; repes: Map<number, number> }
): Cruce {
  const leDoy: CruceItem[] = [];
  const meDa: CruceItem[] = [];
  for (const i of [...theirs.faltan].sort((a, b) => a - b)) {
    const c = mine.repes.get(i);
    if (c) leDoy.push({ slot: CANON[i], count: c });
  }
  for (const i of [...mine.faltan].sort((a, b) => a - b)) {
    const c = theirs.repes.get(i);
    if (c) meDa.push({ slot: CANON[i], count: c });
  }
  return { leDoy, meDa };
}

export function shareSetsOf(invs: Invs): { faltan: Set<number>; repes: Map<number, number> } {
  const st = stateToShare(invs);
  return { faltan: new Set(st.faltan), repes: new Map(st.repes) };
}

// ---------- textos para compartir (FORMATO ESTABLE: snapshot en QA) ----------
// línea por equipo "MEX: 2, 5 (x2)"; especiales en una línea con códigos completos.
function lineas(items: [number, number][]): string[] {
  const porEquipo = new Map<string, string[]>();
  const esp: string[] = [];
  for (const [i, c] of items) {
    const slot = CANON[i];
    const xc = c > 1 ? ' (x' + c + ')' : '';
    if (i >= 20 && i <= 979) {
      const [code, n] = slot.split('-');
      if (!porEquipo.has(code)) porEquipo.set(code, []);
      porEquipo.get(code)!.push(n + xc);
    } else {
      esp.push(slot + xc);
    }
  }
  const out: string[] = [];
  if (esp.length) out.push('ESPECIALES: ' + esp.join(', '));
  for (const code of ORDER) if (porEquipo.has(code)) out.push(code + ': ' + porEquipo.get(code)!.join(', '));
  return out;
}

export function textFaltan(invs: Invs): string {
  const st = stateToShare(invs);
  const K = 992 - st.faltan.length;
  const P = Math.round((K / 992) * 100);
  const body = lineas(st.faltan.map((i) => [i, 0] as [number, number]));
  return 'Me faltan ' + st.faltan.length + ' · Álbum ' + K + '/992 (' + P + '%)'
    + (body.length ? '\n' + body.join('\n') : '\n¡Álbum completo!');
}

export function textRepes(invs: Invs): string {
  const st = stateToShare(invs);
  const K = 992 - st.faltan.length;
  const P = Math.round((K / 992) * 100);
  const total = st.repes.reduce((a, [, c]) => a + c, 0);
  const body = lineas(st.repes);
  return 'Mis repes ' + total + ' · Álbum ' + K + '/992 (' + P + '%)'
    + (body.length ? '\n' + body.join('\n') : '\nSin repes todavía');
}

export function textCruce(alias: string, cr: Cruce, sinCantidad: boolean): string {
  const fmt = (l: CruceItem[]) => lineas(l.map((x) => [CANON_INDEX[x.slot], x.count] as [number, number]));
  const a = alias || 'Coleccionista';
  const out = ['Cruce con ' + a + (sinCantidad ? ' (sus repes sin cantidad, asumo x1)' : '')];
  out.push('LE PUEDES DAR (' + cr.leDoy.length + '):');
  out.push(...(cr.leDoy.length ? fmt(cr.leDoy) : ['—']));
  out.push('TE PUEDE DAR (' + cr.meDa.length + '):');
  out.push(...(cr.meDa.length ? fmt(cr.meDa) : ['—']));
  return out.join('\n');
}

// líneas para pintar el cruce en la UI (reusa el mismo formateador del texto)
export function lineasCruce(items: CruceItem[]): string[] {
  return lineas(items.map((x) => [CANON_INDEX[x.slot], x.count] as [number, number]));
}

// ---------- hook de QA (funciones puras, sin datos sensibles) ----------
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__share = {
    CANON, CANON_INDEX, stateToShare, shareSetsOf, encodeNative, decodeNative,
    encodeUMC, decodeUMC, detectFormat, cruce, textFaltan, textRepes, textCruce,
    readQRMultiScale,
  };
}
