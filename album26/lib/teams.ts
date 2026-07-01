// ============================================================
// teams.ts — Datos estáticos del álbum (van en el bundle, NO en BD).
// Grupo A poblado con los datos exactos del diseño de San.
// Los grupos B–L los rellena F2 (Haiku) desde scanini.app/teams/{code}
// respetando EXACTAMENTE esta forma de tipo.
// ============================================================

export type RosterEntry = [num: number, first: string, surname: string];
// num 1  = ESCUDO  -> [1, '', '']
// num 13 = ESPECIAL -> [13, '', '']  (resto: jugadores [n, 'Nombre', 'APELLIDO'])

export interface Team {
  name: string;        // visible, mayúsculas: 'MÉXICO'
  code: string;        // 3 letras: 'MEX'
  group: string;       // 'A' .. 'L'
  fed: string;         // federación
  // paleta principal
  titleA: string; titleB: string;
  team: string; ink: string; win: string; motif: string;
  // paleta de slots "accent" (escudo / especial)
  accent: string; accentInk: string; accentMotif: string;
  flag: string;        // CSS background (gradiente) — F3 puede migrar a SVG
  roster: RosterEntry[]; // 20 entradas
}

export const PREFIX = 'WE ARE'; // 'SOMOS' para español
export const FALTA = { bg: '#E9E6DC', ink: '#B7B1A2', win: '#F6F4EC', motif: '#DCD8CB' };

export const TEAMS: Record<string, Team> = {
  MEX: {
    name: 'MÉXICO', code: 'MEX', group: 'A', fed: 'Federación Mexicana de Fútbol',
    titleA: '#1B5E2A', titleB: '#D62828',
    team: '#3E9B4F', ink: '#15532A', win: '#FFFFFF', motif: '#2E8440',
    accent: '#F3C9A0', accentInk: '#A85B17', accentMotif: '#E6B98C',
    flag: 'linear-gradient(90deg,#006847 0 33.33%,#fff 33.33% 66.66%,#CE1126 66.66%)',
    roster: [
      [1,'',''],[2,'Luis','MALAGÓN'],[3,'Johan','VÁSQUEZ'],[4,'Jorge','SÁNCHEZ'],
      [5,'César','MONTES'],[6,'Jesús','GALLARDO'],[7,'Israel','REYES'],[8,'Diego','LAINEZ'],
      [9,'Carlos','RODRÍGUEZ'],[10,'Edson','ÁLVAREZ'],[11,'Orbelín','PINEDA'],[12,'Marcel','RUIZ'],
      [13,'',''],[14,'Érick','SÁNCHEZ'],[15,'Hirving','LOZANO'],[16,'Santiago','GIMÉNEZ'],
      [17,'Raúl','JIMÉNEZ'],[18,'Alexis','VEGA'],[19,'Roberto','ALVARADO'],[20,'César','HUERTA'],
    ],
  },
  RSA: {
    name: 'SUDÁFRICA', code: 'RSA', group: 'A', fed: 'South African Football Association',
    titleA: '#C0392B', titleB: '#1A3A8F',
    team: '#F39200', ink: '#9C5C00', win: '#FFFFFF', motif: '#E08600',
    accent: '#155E37', accentInk: '#F3C24A', accentMotif: '#0F4E2C',
    flag: 'linear-gradient(60deg,#000 0 20%,transparent 20%),linear-gradient(#E03C31 0 40%,#fff 40% 43%,#007749 43% 57%,#fff 57% 60%,#001489 60% 100%)',
    roster: [
      [1,'',''],[2,'Ronwen','WILLIAMS'],[3,'Sipho','CHAINE'],[4,'Aubrey','MODIBA'],
      [5,'Samukele','KABINI'],[6,'Mbekezeli','MBOKAZI'],[7,'Khulumani','NDAMANE'],[8,'Siyabonga','NGEZANA'],
      [9,'Khuliso','MUDAU'],[10,'Nkosinathi','SIBISI'],[11,'Teboho','MOKOENA'],[12,'Thalente','MBATHA'],
      [13,'',''],[14,'Bathusi','AUBAAS'],[15,'Vaya','SITHOLE'],[16,'Sipho','MBULE'],
      [17,'Lyle','FOSTER'],[18,'Iqraam','RAYNERS'],[19,'Mohau','NKOTA'],[20,'Oswin','APPOLLIS'],
    ],
  },
  KOR: {
    name: 'COREA REP.', code: 'KOR', group: 'A', fed: 'Korea Football Association',
    titleA: '#20235F', titleB: '#D81E34',
    team: '#A9B2D8', ink: '#2C3576', win: '#FFFFFF', motif: '#98A2CC',
    accent: '#F0A12E', accentInk: '#2C3576', accentMotif: '#DC9224',
    flag: 'radial-gradient(circle at 50% 40%,#CD2E3A 0 13%,transparent 13%),radial-gradient(circle at 50% 50%,#0047A0 0 18%,transparent 18%),#fff',
    roster: [
      [1,'',''],[2,'Hyeonwoo','JO'],[3,'Seunggyu','KIM'],[4,'Minjae','KIM'],
      [5,'Yumin','CHO'],[6,'Youngwoo','SEOL'],[7,'Hanbeom','LEE'],[8,'Taeseok','LEE'],
      [9,'Myungjae','LEE'],[10,'Jaesung','LEE'],[11,'Inbeom','HWANG'],[12,'Kangin','LEE'],
      [13,'',''],[14,'Seungho','PAIK'],[15,'Jens','CASTROP'],[16,'Donggyeong','LEE'],
      [17,'Guesung','CHO'],[18,'Heungmin','SON'],[19,'Heechan','HWANG'],[20,'Hyeongyu','OH'],
    ],
  },
  CZE: {
    name: 'CHEQUIA', code: 'CZE', group: 'A', fed: 'Fotbalová asociace České republiky',
    titleA: '#1B2A6B', titleB: '#D7263D',
    team: '#8B92B6', ink: '#2A2F66', win: '#FFFFFF', motif: '#7E86AC',
    accent: '#C0257E', accentInk: '#FFFFFF', accentMotif: '#A81E6C',
    flag: 'linear-gradient(60deg,#11457E 0 36%,transparent 36%),linear-gradient(#fff 0 50%,#D7141A 50% 100%)',
    roster: [
      [1,'',''],[2,'Matěj','KOVÁŘ'],[3,'Jindřich','STANĚK'],[4,'Ladislav','KREJČÍ'],
      [5,'Vladimír','COUFAL'],[6,'Jaroslav','ZELENÝ'],[7,'Tomáš','HOLEŠ'],[8,'David','ZIMA'],
      [9,'Michal','SADÍLEK'],[10,'Lukáš','PROVOD'],[11,'Lukáš','ČERV'],[12,'Tomáš','SOUČEK'],
      [13,'',''],[14,'Pavel','ŠULC'],[15,'Matěj','VYDRA'],[16,'Vasil','KUŠEJ'],
      [17,'Tomáš','CHORÝ'],[18,'Václav','ČERNÝ'],[19,'Adam','HLOŽEK'],[20,'Patrik','SCHICK'],
    ],
  },

  // === F2 (Haiku) añade aquí los 44 equipos restantes (grupos B–L) ===
  // Mismos campos. Rosters + grupo desde scanini; paleta baseline desde
  // colores nacionales (F3). NO inventar: si un dato no está, marcar TODO.
};

// Orden de selección y agrupación. F2 amplía a las 48 con el draw real.
export const ORDER: string[] = ['MEX', 'RSA', 'KOR', 'CZE'];
