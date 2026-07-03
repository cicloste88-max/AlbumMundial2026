// Suite Fv3.3 — datos verificados de las 48 selecciones (fed/mlang/partidos/quali).
// Viewport 1280x800 (spread: ve L+R juntas). GT del brief + placeholders sin inventar.
// Uso:  QA_URL=http://localhost:3000 node qa/verify-fv33-verif.mjs
import { chromium } from 'playwright-core';
const EXE = process.env.QA_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = process.env.QA_URL || 'http://localhost:3000/';
const results = [];
const ok = (n, c, x='') => { results.push([c?'PASS':'FAIL', n, x]); console.log((c?'PASS':'FAIL')+'  '+n+(x?'  ['+x+']':'')); if(!c) process.exitCode=1; };

const b = await chromium.launch({ executablePath: EXE });
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
const p = await ctx.newPage();
p.on('dialog', d => d.accept());
await p.goto(URL, { waitUntil: 'networkidle' });
await p.waitForTimeout(250);

const curText = () => p.evaluate(() => document.querySelector('[data-current]')?.innerText || '');
const clickChip = async (code) => {
  const found = await p.evaluate((c) => {
    const chip = [...document.querySelectorAll('#chips button')].find(x => x.textContent === c);
    if (!chip) return false; chip.click(); return true;
  }, code);
  if (!found) throw new Error('chip: ' + code);
  await p.waitForTimeout(100);
};

// (a) CUW: 3 partidos reales con fecha y estadio
await clickChip('CUW');
let txt = await curText();
ok('CUW: partido en Houston Stadium', txt.includes('Houston Stadium'));
ok('CUW: partido en Kansas City Stadium', txt.includes('Kansas City Stadium'));
ok('CUW: 3 fechas reales (Sunday/Saturday/Thursday)', txt.includes('Sunday, 14 June') && txt.includes('Saturday, 20 June') && txt.includes('Thursday, 25 June'));
ok('CUW: rival en forma FIFA (Côte d\'Ivoire)', txt.includes("Côte d'Ivoire"));
const cuwHl = await p.evaluate(() => [...document.querySelectorAll('[data-current] .mteam .tn.hl')].map(t => t.textContent));
ok('CUW: resaltado hl = Curaçao en los 3 partidos', cuwHl.length === 3 && cuwHl.every(t => t === 'Curaçao'), cuwHl.join(','));

// (b) RSA idéntico al GT
await clickChip('RSA');
txt = await curText();
ok('RSA: fed "South African Football Association"', txt.includes('South African Football Association'));
ok('RSA: partido "Wednesday, 24 June – Monterrey Stadium"', txt.includes('Wednesday, 24 June – Monterrey Stadium'));
ok('RSA: quali "Rwanda – South Africa"', txt.includes('Rwanda – South Africa'));
ok('RSA: quali completa (Zimbabwe y Lesotho)', txt.includes('South Africa – Zimbabwe') && txt.includes('South Africa – Lesotho'));

// (c) ESP fed + mlang
await clickChip('ESP');
txt = await curText();
ok('ESP: fed "Real Federación Española Fútbol"', txt.includes('Real Federación Española Fútbol'));
const espMlang = await p.evaluate(() => document.querySelector('[data-current] .mlang')?.textContent || '');
ok('ESP: mlang empieza por "España"', espMlang.startsWith('España'), espMlang.slice(0, 30));
ok('ESP: mlang sin clase solo (dato real)', await p.evaluate(() => !document.querySelector('[data-current] .mlang')?.classList.contains('solo')));

// placeholders: PROHIBIDO inventar
await clickChip('SCO');
const scoFname = await p.evaluate(() => document.querySelector('[data-current] .fed .fname'));
ok('SCO: fed en revisión -> sin .fname (placeholder v3)', scoFname === null);
await clickChip('IRN');
const irnMlang = await p.evaluate(() => {
  const m = document.querySelector('[data-current] .mlang');
  return m ? { solo: m.classList.contains('solo'), text: m.textContent } : null;
});
ok('IRN: mlang en revisión -> placeholder "mlang solo" con país del dataset', !!irnMlang && irnMlang.solo && irnMlang.text === 'IRAN', JSON.stringify(irnMlang));
await clickChip('GER');
txt = await curText();
ok('GER: quali en revisión -> QUALIFIERS placeholder (sin filas inventadas)', txt.includes('QUALIFIERS') && !txt.includes('Zimbabwe'));
const gerRrows = await p.evaluate(() => [...document.querySelectorAll('[data-current] .rrow span:first-child')].map(s => s.textContent.trim()));
ok('GER: 3 filas de quali vacías (&nbsp;)', gerRrows.length === 3 && gerRrows.every(t => t === ''), JSON.stringify(gerRrows));
ok('GER: fed real (Deutscher Fußball-Bund)', txt.includes('Deutscher Fußball-Bund'));

await b.close();
const f = results.filter(r=>r[0]==='FAIL').length;
console.log(`\n${results.length-f}/${results.length} PASS, ${f} FAIL`);
