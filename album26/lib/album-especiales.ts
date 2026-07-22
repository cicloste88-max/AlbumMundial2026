// GENERADO desde build_handoff k=album-especiales v2 (md5 fc2d26d57808e9537fdf30989f22899c).
// Verificado server-side y local. NO editar a mano (se regenera por script si San republica).
// Secciones: APERTURA (entre GRUPOS y MEX) · HISTORY (tras PAN) · COCA-COLA (tras HISTORY).

export type EspSlot = { k: string; jugador?: string; pais?: string; label?: string };
export type EspCity = { n: string; estadio?: string };
export type EspFinal = { ed: string; res: string; detalle?: string };
export type EspPageData = {
  id: string;
  section: 'apertura' | 'history' | 'cocacola';
  titulo?: string; tituloSeccion?: string; lema?: string; nota?: string; extra?: string;
  slots: EspSlot[]; ciudades?: EspCity[]; finales?: EspFinal[]; textos?: string[];
};

export const ESP_PAGES: EspPageData[] = [
  { id: "ap1", section: "apertura", titulo: "ROLL OF HONOUR / THE SYMBOLS", nota: "palmares historico de campeones + simbolos; sticker unico 00", slots: [{ k: "00", label: "FIFA World Cup 26" }] },
  { id: "ap2", section: "apertura", titulo: "WELCOME", nota: "carta del presidente FIFA (texto bienvenida) + 2 stickers", slots: [{ k: "FWC-1" }, { k: "FWC-2" }] },
  { id: "ap3", section: "apertura", titulo: "HOST COUNTRIES AND CITIES — CANADA", slots: [{ k: "FWC-3" }, { k: "FWC-4" }, { k: "FWC-5" }, { k: "FWC-6" }], ciudades: [{"n":"TORONTO","estadio":"Toronto Stadium - 45.736"},{"n":"VANCOUVER","estadio":"BC Place Vancouver - 54.500"}] },
  { id: "ap4", section: "apertura", titulo: "HOST COUNTRIES AND CITIES — MEXICO / USA", slots: [{ k: "FWC-7" }, { k: "FWC-8" }], ciudades: [{"n":"MEXICO CITY","estadio":"Mexico City Stadium - 72.766"},{"n":"GUADALAJARA","estadio":"Guadalajara Stadium - 44.330"},{"n":"MONTERREY","estadio":"Monterrey Stadium - 53.500"},{"n":"ATLANTA"},{"n":"BOSTON"},{"n":"DALLAS"},{"n":"HOUSTON"},{"n":"KANSAS CITY"},{"n":"LOS ANGELES"},{"n":"MIAMI"},{"n":"NEW YORK NEW JERSEY"},{"n":"PHILADELPHIA"},{"n":"SAN FRANCISCO BAY AREA"},{"n":"SEATTLE"}] },
  { id: "hist1", section: "history", tituloSeccion: "FIFA WORLD CUP HISTORY", slots: [{ k: "FWC-9" }, { k: "FWC-10" }], finales: [{"ed":"URUGUAY 1930","res":"URUGUAY 4-2 ARGENTINA"},{"ed":"FRANCE 1938","res":"ITALY 4-2 HUNGARY"}] },
  { id: "hist2", section: "history", extra: "TOP SCORERS era", slots: [{ k: "FWC-11" }, { k: "FWC-12" }], finales: [{"ed":"SWITZERLAND 1954","res":"GERMANY FR 3-2 HUNGARY"}] },
  { id: "hist3", section: "history", slots: [{ k: "FWC-13" }, { k: "FWC-14" }], finales: [{"ed":"ARGENTINA 1978","res":"ARGENTINA 3-1 NETHERLANDS","detalle":"25 June 1978 · Monumental, Buenos Aires"},{"ed":"MEXICO 1986","res":"ARGENTINA 3-2 GERMANY FR"}] },
  { id: "hist4", section: "history", slots: [{ k: "FWC-15" }, { k: "FWC-16" }], finales: [{"ed":"KOREA/JAPAN 2002","res":"GERMANY 0-2 BRAZIL","detalle":"30 June 2002"},{"ed":"SOUTH AFRICA 2010","res":"NETHERLANDS 0-1 SPAIN"}] },
  { id: "hist5", section: "history", titulo: "RECORDS", slots: [{ k: "FWC-17" }, { k: "FWC-18" }, { k: "FWC-19" }], textos: ["Most goals scored","Most matches played (player)","Most tournaments scored in"] },
  { id: "cc1", section: "cocacola", tituloSeccion: "COCA-COLA — LA OLA DE EMOCIONES", lema: "Revive los momentos especiales y coleccionalos todos con Coca-Cola", slots: [{ k: "CC-1", jugador: "Lamine Yamal", pais: "ESP" }, { k: "CC-2", jugador: "Kimmich", pais: "GER" }, { k: "CC-3", jugador: "Camavinga", pais: "FRA" }, { k: "CC-4", jugador: "Gvardiol", pais: "CRO" }, { k: "CC-5", jugador: "Valverde", pais: "URU" }, { k: "CC-6", jugador: "Van Dijk", pais: "NED" }] },
  { id: "cc2", section: "cocacola", lema: "Revive los momentos especiales y coleccionalos todos con Coca-Cola", extra: "OFFICIAL PARTNER", slots: [{ k: "CC-7", jugador: "Davies", pais: "CAN" }, { k: "CC-8", jugador: "Jimenez", pais: "MEX" }, { k: "CC-9", jugador: "Saliba", pais: "FRA" }, { k: "CC-10", jugador: "Martinez" }, { k: "CC-11", jugador: "Kane", pais: "ENG" }, { k: "CC-12", jugador: "Robinson", pais: "USA" }] },
];

// claves canónicas en orden (32): 00 · FWC-1..19 · CC-1..12
export const ESP_SLOTS: string[] = ["00", "FWC-1", "FWC-2", "FWC-3", "FWC-4", "FWC-5", "FWC-6", "FWC-7", "FWC-8", "FWC-9", "FWC-10", "FWC-11", "FWC-12", "FWC-13", "FWC-14", "FWC-15", "FWC-16", "FWC-17", "FWC-18", "FWC-19", "CC-1", "CC-2", "CC-3", "CC-4", "CC-5", "CC-6", "CC-7", "CC-8", "CC-9", "CC-10", "CC-11", "CC-12"];
export const ESP_TOTAL = 32;
export const ALBUM_TOTAL = 992;
export const ESP_SECTION_FIRST: Record<string, string> = { apertura: "ap1", history: "hist1", cocacola: "cc1" };

