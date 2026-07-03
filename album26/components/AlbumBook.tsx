'use client';
// ============================================================
// AlbumBook.tsx — Motor v3 + capa visual de la REFERENCIA v3
// (handoff build_handoff: album-v3-css / album-v3-js / album-v3-svg,
// md5 verificados). Builders y CSS 1:1 con la referencia; SOLO se
// adapta el mapeo de datos (DATA→ALBUM_TEAMS, PAL→PALETAS) y las
// reglas de body → wrapper .ab-wrap (ajustes permitidos Fv3.1).
// El motor (estados, persistencia InventoryStore, lazy mount ±2,
// navegación, delegación) es el ya validado en Fv3.
// La barra de estado (.demo-bar con Pegados/REPES/reset) es chrome
// de la app: la referencia no la trae y la funcionalidad F0 se
// conserva ahí sin tocar el markup de las páginas.
// ============================================================
import { useCallback, useEffect, useRef, useState } from 'react';
import { ORDER, PALETAS, ALBUM_TEAMS, VERIF } from '@/lib/album-data';
import { getStore, type InvMap, type Entry } from '@/lib/inventory';

const store = getStore();
const MAX_REPES = 5;
const FLAG_BASE = 'https://cmyfyswystjgzdwbqyyb.supabase.co/storage/v1/object/public/flags/';
const FLAG = (c: string) => FLAG_BASE + c + '.png';
const TOTAL_PAGES = 2 + ORDER.length * 2; // 98

// GRUPOS derivado de ALBUM_TEAMS — idéntico a la constante GRUPOS de la referencia
const GRUPOS: Record<string, string[]> = {};
for (const c of ORDER) (GRUPOS[ALBUM_TEAMS[c].grupo] ||= []).push(c);

const K = (t: string, n: number) => t + '-' + n;
const sheetOf = (code: string) => 2 + ORDER.indexOf(code) * 2;
// Vistas (desktop spread): [0]=portada [1]=grupos [2..49]=48 pliegos L|R
const TOTAL_VIEWS = 2 + ORDER.length; // 50
const viewOfPage = (p: number) => (p < 2 ? p : 2 + Math.floor((p - 2) / 2));
const pageOfView = (v: number) => (v < 2 ? v : 2 + (v - 2) * 2);
const themeStyle = (c: string) => {
  const p = PALETAS[c];
  return '--frame:' + p.frame + ';--deep:' + p.deep + ';--head:' + p.head;
};

// symbols #g2/#g6 del glifo 26 (album-v3-svg, verbatim)
const SYMBOLS = `<svg width="0" height="0" style="position:absolute">
  <defs>
    <symbol id="g2" viewBox="0 0 1000 752"><path d="M687.7 0.2 L670.3 0.3 L653.0 0.5 L635.7 0.8 L618.4 1.0 L601.3 1.4 L584.2 1.9 L567.2 2.5 L550.2 3.2 L533.3 4.0 L516.4 4.8 L499.5 5.6 L482.5 6.3 L465.5 6.9 L448.3 7.2 L431.0 7.4 L413.7 7.5 L396.2 7.4 L378.8 7.3 L361.3 7.3 L343.8 7.2 L326.3 7.3 L308.9 7.4 L291.6 7.8 L274.3 8.3 L257.2 9.2 L240.2 10.3 L223.3 11.8 L206.7 13.7 L190.3 16.3 L174.1 19.6 L158.4 23.9 L143.0 29.4 L128.1 36.0 L113.6 44.1 L99.7 53.7 L86.5 64.4 L73.9 76.2 L62.1 88.9 L51.2 102.2 L41.2 116.0 L32.2 130.1 L24.3 144.2 L17.5 158.4 L11.7 173.1 L6.9 188.7 L2.8 205.8 L0.2 223.6 L0.8 239.7 L6.7 251.6 L18.9 257.3 L35.8 258.4 L54.7 257.3 L72.9 256.2 L90.1 256.0 L107.6 256.0 L126.8 255.6 L145.2 255.8 L156.7 259.0 L159.3 264.6 L153.6 271.0 L142.1 278.2 L127.1 286.1 L111.4 294.9 L96.6 304.6 L82.8 315.2 L70.1 326.7 L58.5 338.9 L48.0 351.7 L38.7 365.2 L30.5 379.3 L23.5 393.8 L17.6 408.8 L12.9 424.2 L9.1 440.0 L6.2 456.0 L4.0 472.5 L2.4 489.1 L1.4 506.1 L0.9 523.2 L0.6 540.6 L0.6 558.1 L0.7 575.8 L0.8 593.5 L0.8 611.3 L0.6 629.2 L0.2 647.0 L0.0 664.6 L0.1 681.9 L0.6 698.8 L1.8 715.2 L4.0 730.8 L8.1 744.7 L18.5 752.1 L35.8 752.3 L54.6 750.9 L72.7 750.3 L90.4 750.1 L107.9 749.9 L125.5 749.8 L143.0 749.7 L160.6 749.6 L178.1 749.5 L195.7 749.3 L213.2 749.2 L230.8 749.1 L248.3 749.0 L265.9 748.9 L283.4 748.7 L301.0 748.6 L318.6 748.6 L336.1 748.5 L353.7 748.4 L371.3 748.4 L389.0 748.3 L406.6 748.3 L424.2 748.3 L441.8 748.3 L459.4 748.2 L477.0 748.2 L494.7 748.2 L512.3 748.2 L529.9 748.2 L547.5 748.2 L565.1 748.2 L582.6 748.2 L600.2 748.1 L617.8 748.1 L635.3 748.1 L652.8 748.0 L670.3 748.0 L687.8 747.9 L705.3 747.9 L722.7 747.8 L740.2 747.7 L757.6 747.6 L774.9 747.4 L792.3 747.3 L809.6 747.1 L826.9 747.0 L844.3 746.8 L861.6 746.7 L879.1 746.6 L896.5 746.6 L914.1 746.6 L932.1 746.9 L950.5 747.6 L968.7 748.0 L984.1 745.3 L994.7 737.5 L999.5 724.1 L1000.0 706.8 L998.3 687.9 L996.5 669.8 L995.6 653.1 L995.3 636.9 L995.7 620.2 L996.4 602.4 L997.1 584.1 L997.5 565.7 L997.4 547.8 L996.3 530.9 L993.9 515.6 L989.7 502.5 L980.7 494.4 L964.6 493.2 L945.7 494.6 L927.4 495.3 L909.7 495.5 L892.5 495.7 L875.3 496.1 L856.1 496.7 L836.7 496.3 L822.5 493.0 L820.2 488.0 L831.0 482.3 L846.3 475.7 L861.2 468.0 L875.4 459.3 L889.0 449.6 L901.9 439.0 L914.1 427.6 L925.5 415.4 L936.1 402.5 L945.8 389.0 L954.6 374.8 L962.5 360.2 L969.5 345.2 L975.4 329.7 L980.3 313.9 L984.1 297.9 L986.7 281.7 L988.3 265.4 L988.7 249.0 L987.9 232.6 L986.2 216.2 L983.3 200.1 L979.5 184.1 L974.7 168.4 L968.9 153.0 L962.2 138.0 L954.6 123.5 L946.2 109.6 L937.0 96.2 L926.9 83.5 L916.2 71.6 L904.6 60.4 L892.4 50.1 L879.6 40.7 L866.1 32.2 L852.0 24.7 L837.3 18.2 L822.2 12.7 L806.5 8.3 L790.3 4.9 L773.8 2.6 L756.9 1.1 L739.8 0.3 L722.5 0.0 L705.1 0.0 Z"/></symbol>
    <symbol id="g6" viewBox="0 0 1000 759"><path d="M393.1 3.9 L377.5 3.3 L361.9 2.7 L346.2 1.9 L330.6 1.3 L315.0 0.7 L299.4 0.4 L283.9 0.3 L268.4 0.5 L253.1 1.2 L237.9 2.4 L222.8 4.1 L208.0 6.5 L193.2 9.6 L178.8 13.5 L164.5 18.1 L150.6 23.4 L137.0 29.5 L123.9 36.3 L111.2 43.7 L99.0 51.9 L87.3 60.6 L76.2 70.0 L65.8 80.0 L56.1 90.7 L47.1 101.8 L38.8 113.6 L31.4 125.9 L24.9 138.7 L19.3 152.1 L14.6 165.9 L10.7 180.1 L7.5 194.7 L5.0 209.6 L3.0 224.7 L1.6 240.1 L0.7 255.6 L0.2 271.3 L0.0 287.0 L0.1 302.7 L0.3 318.4 L0.7 334.0 L1.2 349.5 L1.7 364.8 L2.1 380.1 L2.5 395.4 L2.7 410.8 L2.8 426.3 L2.7 442.0 L2.5 457.8 L2.3 473.8 L2.2 489.7 L2.6 505.4 L3.4 520.9 L5.0 536.1 L7.4 550.7 L10.8 564.9 L14.9 578.8 L19.9 592.2 L25.7 605.3 L32.3 618.2 L39.7 630.8 L47.9 643.2 L56.8 655.4 L66.3 667.1 L76.5 678.4 L87.3 689.1 L98.7 699.1 L110.5 708.2 L122.9 716.5 L135.6 723.7 L148.8 729.9 L162.3 735.1 L176.1 739.5 L190.2 743.1 L204.6 746.0 L219.3 748.3 L234.1 750.0 L249.2 751.3 L264.4 752.2 L279.7 752.8 L295.1 753.2 L310.6 753.4 L326.1 753.6 L341.7 753.8 L357.2 754.0 L372.8 754.3 L388.4 754.5 L404.0 754.8 L419.5 755.1 L435.1 755.3 L450.8 755.6 L466.4 755.9 L482.0 756.2 L497.6 756.5 L513.2 756.8 L528.9 757.0 L544.5 757.3 L560.1 757.6 L575.8 757.8 L591.4 758.0 L607.0 758.2 L622.7 758.4 L638.3 758.6 L653.9 758.7 L669.5 758.8 L685.1 758.9 L700.7 758.9 L716.3 758.9 L731.9 758.9 L747.4 758.7 L762.8 758.2 L778.1 757.2 L793.2 755.6 L808.1 753.2 L822.6 750.0 L836.9 745.8 L850.7 740.6 L864.2 734.5 L877.2 727.6 L889.7 719.8 L901.6 711.3 L913.0 702.1 L923.8 692.1 L934.0 681.5 L943.5 670.3 L952.3 658.5 L960.4 646.2 L967.9 633.5 L974.6 620.3 L980.5 606.7 L985.7 592.9 L990.2 578.7 L993.8 564.3 L996.6 549.7 L998.6 535.0 L999.7 520.2 L1000.0 505.3 L999.4 490.4 L997.9 475.6 L995.6 460.9 L992.5 446.3 L988.5 432.0 L983.8 417.9 L978.3 404.2 L972.1 390.8 L965.1 377.9 L957.5 365.5 L949.2 353.6 L940.2 342.3 L930.6 331.7 L920.4 321.8 L909.5 312.7 L898.0 304.3 L885.7 296.3 L872.5 288.7 L858.3 281.2 L844.6 273.9 L834.1 267.3 L829.9 261.7 L833.9 257.4 L844.6 254.4 L859.3 252.6 L875.3 251.9 L891.6 252.0 L908.0 252.9 L924.5 254.4 L940.8 255.9 L956.1 256.3 L970.1 254.5 L982.0 249.9 L990.9 242.2 L995.8 231.6 L996.1 218.2 L992.9 203.1 L987.7 187.5 L982.0 172.8 L976.4 159.2 L970.5 146.5 L964.1 134.1 L956.9 121.8 L949.0 109.6 L940.3 97.6 L930.9 85.9 L920.9 74.7 L910.2 64.2 L899.0 54.5 L887.3 45.7 L875.1 38.0 L862.4 31.3 L849.4 25.5 L835.9 20.6 L822.2 16.4 L808.1 12.9 L793.7 9.9 L779.1 7.5 L764.3 5.4 L749.3 3.7 L734.1 2.4 L718.8 1.4 L703.3 0.7 L687.8 0.2 L672.1 0.0 L656.4 0.0 L640.7 0.1 L625.0 0.4 L609.3 0.8 L593.7 1.2 L578.1 1.7 L562.6 2.2 L547.1 2.7 L531.7 3.1 L516.3 3.6 L500.9 4.0 L485.6 4.3 L470.2 4.5 L454.9 4.7 L439.5 4.7 L424.0 4.6 L408.6 4.3 Z"/></symbol>
  </defs>
</svg>`;

// CSS de la referencia (album-v3-css) con los 2 ajustes permitidos:
// body→.ab-wrap y fuentes → var(--font-baloo)/var(--font-barlow).
const CSS = `:root{
  --paper:#F6F3EC; --ink-dark:#20153F; --sticker-border:#FFF;
  --w: min(100vw - 20px, 440px);
}
*{box-sizing:border-box; -webkit-tap-highlight-color:transparent}
.ab-wrap{width:100%; margin:0; background:#191228; font-family:var(--font-barlow),system-ui,sans-serif; color:var(--ink-dark);
     display:flex; flex-direction:column; align-items:center; gap:12px; padding:12px 0 30px; min-height:100vh}
.demo-bar{width:var(--w); color:#B7ABDD; font-size:12.5px; text-align:center; line-height:1.35}
.demo-bar b{color:#fff}

/* ===== tema genérico (3 vars inline por equipo: --frame --deep --head) ===== */
.teampage{
  --tink:var(--deep);
  --slot1:var(--head);
  --p-navy:var(--head);
  --p-red:var(--frame);
  --p-green:color-mix(in srgb, var(--frame) 55%, var(--deep));
  --p-green2:color-mix(in srgb, var(--deep) 82%, black);
  --p-yellow:color-mix(in srgb, var(--frame) 62%, white);
  --crest:var(--deep);
  --crestM:color-mix(in srgb, var(--frame) 48%, white);
  --hd1:var(--deep); --hd2:var(--frame); --fedc:var(--deep)}
.tile.s1 .foil{position:absolute; inset:0; pointer-events:none; opacity:.55;
  background:linear-gradient(118deg, transparent 30%, rgba(255,255,255,.65) 45%, transparent 60%)}
.tile.s1 .pname .lbl{display:block; font-weight:800; font-size:9.5cqw; letter-spacing:.14em; line-height:1.2; opacity:.85}
.crest .plabel{position:absolute; left:9%; bottom:10%; color:#fff; font-weight:800;
  font-size:6.5cqw; letter-spacing:.12em; opacity:.85}
.mlang.solo{font-size:calc(var(--w)*.03); font-weight:800; letter-spacing:.08em; align-self:center; margin:auto 0}

/* ===== libro ===== */
.book{position:relative; width:var(--w); aspect-ratio:1008/1204; perspective:2600px;
      touch-action:pan-y; filter:drop-shadow(0 14px 26px rgba(0,0,0,.5))}
.sheet{position:absolute; inset:0; transform-style:preserve-3d; transform-origin:left center;
       transition:transform .62s cubic-bezier(.42,.05,.18,1)}
.sheet.noanim{transition:none}
.sheet.flipped{transform:rotateY(-180deg)}
.face{position:absolute; inset:0; backface-visibility:hidden; -webkit-backface-visibility:hidden;
      overflow:hidden; border-radius:5px; background:var(--paper)}
.face.front::after{content:''; position:absolute; inset:0; pointer-events:none; opacity:0;
      background:linear-gradient(100deg, rgba(0,0,0,.30), transparent 42%); transition:opacity .3s}
.sheet.turning .face.front::after{opacity:1}
.face.back{transform:rotateY(180deg);
      background:linear-gradient(80deg, #EDE9DF, var(--paper) 30%, #EDE9DF 96%)}
.face.back .bmark{position:absolute; inset:0; display:flex; align-items:center; justify-content:center; opacity:.10}
.face.back .bmark svg{width:55%; fill:#5a4f7a}
.lomo{position:absolute; left:0; top:0; bottom:0; width:7px; pointer-events:none; z-index:60;
      background:linear-gradient(90deg, rgba(0,0,0,.28), transparent)}

/* ===== navegación ===== */
.nav{width:var(--w); display:flex; gap:6px; align-items:center}
.nav button{border:0; border-radius:8px; padding:9px 4px; background:#2E2350; color:#CFC5EE;
      font-family:inherit; font-weight:700; font-size:12.5px; letter-spacing:.03em; cursor:pointer}
.nav button.fix{flex:0 0 auto; padding:9px 10px}
.chips{flex:1; display:flex; gap:4px; overflow-x:auto; scrollbar-width:none; -webkit-overflow-scrolling:touch}
.chips::-webkit-scrollbar{display:none}
.chips button{flex:0 0 auto; padding:9px 8px; font-size:11.5px}
.nav button.on{background:#E8A81E; color:#20153F}
.nav button.arrow{flex:0 0 44px; font-size:17px}
.nav button:disabled{opacity:.35; cursor:default}

/* ===== contenido de página (v1) ===== */
.inner{position:absolute; inset:0; padding:2.6% 2.8%; display:flex; flex-direction:column}
.bg{position:absolute; inset:0; pointer-events:none}
.bg > div{position:absolute}
.pR .b-navy{left:0;right:0;top:0;height:17.5%;background:var(--p-navy)}
.pR .b-red{left:0;right:0;top:17.5%;height:39%;background:var(--p-red)}
.pR .b-green{left:-6%;right:24%;top:52%;bottom:-2%;background:var(--p-green);border-radius:14% 26% 0 0/18% 34% 0 0}
.pR .b-yellow{right:-2%;width:30%;top:50%;bottom:-2%;background:var(--p-yellow);border-radius:40% 0 0 0/26% 0 0 0}
.pR .b-gedge{right:0;width:7%;top:0;height:22%;background:var(--p-green2);border-radius:0 0 0 60%/0 0 0 45%}
.pL .b-soft1{right:-8%;top:26%;width:44%;height:22%;background:var(--p-yellow);opacity:.16;border-radius:50% 0 50% 50%}
.pL .b-soft2{left:-10%;bottom:-4%;width:52%;height:20%;background:var(--p-green);opacity:.16;border-radius:0 60% 0 0}

.grid{display:grid; grid-template-columns:repeat(4,1fr); gap:2%; align-content:start}
.g-head{align-items:start}
.headblock{grid-column:1/3; padding-right:4%}
.row-gap{height:2.2%}
.weare{margin:2% 0 5% 2%; line-height:.92}
.weare .l1{font-family:var(--font-baloo),cursive; font-weight:800; font-size:calc(var(--w)*.078); color:var(--hd1)}
.weare .l2{font-family:var(--font-baloo),cursive; font-weight:800; font-size:calc(var(--w)*.062); color:var(--hd2)}
.fed{display:flex; align-items:center; gap:5%; margin:2% 0 2% 2%}
.fed img{width:24%; aspect-ratio:3/2; object-fit:cover; box-shadow:0 1px 4px rgba(0,0,0,.25)}
.fed .noflag{flex:0 0 24%; aspect-ratio:3/2; font-size:calc(var(--w)*.03)}
.fed .fname{font-weight:700; font-size:calc(var(--w)*.03); line-height:1.15; color:var(--fedc); flex:1}

.tile{position:relative; aspect-ratio:49/65; min-width:0; min-height:0; background:var(--frame); cursor:pointer; user-select:none; container-type:inline-size}
.tile svg.g{position:absolute; left:11.5%; width:77%; height:44%; fill:#fff}
.tile svg.g2{top:5%} .tile svg.g6{top:50.5%}
.tile .code{position:absolute; top:11%; left:0; right:0; text-align:center; font-weight:700; color:var(--tink);
      font-size:15cqw; line-height:1.12; letter-spacing:.04em}
.tile .pname{position:absolute; bottom:9%; left:4%; right:4%; text-align:center; color:var(--tink); line-height:1.15}
.tile .pname .fn{display:block; font-weight:600; font-size:9.5cqw; letter-spacing:.05em}
.tile .pname .sn{display:block; font-weight:800; font-size:11.5cqw; letter-spacing:.05em}
.tile .pname .pend{font-weight:600; font-size:8.5cqw; opacity:.45; letter-spacing:.12em}
.tile.s1{--frame:var(--slot1); --tink:var(--slot1)}

.tile .sticker{position:absolute; inset:0; display:none; background:var(--sticker-border); padding:4.5%}
.tile .sticker .art{position:relative; width:100%; height:100%; overflow:hidden;
      background:linear-gradient(160deg,var(--p-navy) 0%,var(--p-green2) 55%,var(--p-yellow) 130%)}
.tile .sticker .art::after{content:''; position:absolute; inset:-40% -60%;
      background:linear-gradient(115deg,transparent 42%,rgba(255,255,255,.28) 50%,transparent 58%)}
.tile .sticker .art .sc{position:absolute; top:6%; left:0; right:0; text-align:center; color:#fff; font-weight:800;
      font-size:11cqw; letter-spacing:.06em; text-shadow:0 1px 3px rgba(0,0,0,.4)}
.tile .sticker .art .sn2{position:absolute; bottom:7%; left:0; right:0; text-align:center; color:#fff; font-weight:800;
      font-size:10cqw; letter-spacing:.04em; text-shadow:0 1px 3px rgba(0,0,0,.4)}
.tile .sticker .art img.imgslot{position:absolute; inset:0; object-fit:cover; width:100%; height:100%; display:none}
.tile[data-state="tengo"] .sticker,.tile[data-state^="repe"] .sticker{display:block}
.tile[data-state="tengo"],.tile[data-state^="repe"]{box-shadow:0 2px 7px rgba(0,0,0,.35)}
.badge-rep{position:absolute; top:3%; right:3%; z-index:3; display:none; min-width:24%; padding:1.5% 5%;
      border-radius:99px; background:#fff; color:var(--p-red); font-weight:800; font-size:10cqw; text-align:center;
      box-shadow:0 2px 6px rgba(0,0,0,.35)}
.tile[data-state^="repe"] .badge-rep{display:block}
.step{position:absolute; bottom:4%; left:50%; transform:translateX(-50%); z-index:3; display:none; gap:6%}
.tile[data-state="tengo"] .step,.tile[data-state^="repe"] .step{display:flex}
.step button{width:11cqw; height:11cqw; min-width:22px; min-height:22px; border:0; border-radius:50%;
      background:var(--ink-dark); color:#fff; font-weight:800; font-size:8cqw; line-height:1; cursor:pointer}

.crestwrap{grid-column:3/5; min-width:0; display:flex; flex-direction:column; gap:3%}
.crest{position:relative; height:75%; aspect-ratio:65/49; width:auto; flex:0 0 auto; align-self:flex-start;
       min-height:0; background:var(--crest); cursor:pointer; overflow:hidden; container-type:inline-size}
.crest svg.motif{position:absolute; right:-16%; top:-6%; height:112%; fill:var(--crestM); opacity:.9}
.crest .code{position:absolute; top:30%; left:9%; text-align:left; color:#fff; font-weight:700; font-size:8.5cqw; line-height:1.15; letter-spacing:.05em}
.crest .badge-rep{font-size:6cqw}
.crest .step button{width:7cqw;height:7cqw;font-size:5cqw}
.crest .sticker .art .sc{font-size:7cqw}.crest .sticker .art .sn2{font-size:6cqw}
.mlang{color:#fff; font-weight:600; font-size:calc(var(--w)*.0165); line-height:1.25; text-align:center; overflow:hidden; min-height:0}

.gbadge{position:relative; padding:6% 8%}
.gbadge .gt{font-family:var(--font-baloo),cursive; font-weight:800; color:#fff; font-size:calc(var(--w)*.05); margin-bottom:6%}
.gflags{display:grid; grid-template-columns:1fr 1fr; gap:8%}
.gflag{display:flex; height:calc(var(--w)*.05); box-shadow:0 1px 3px rgba(0,0,0,.3)}
.gflag .tab{background:var(--ink-dark); color:#fff; font-weight:800; font-size:calc(var(--w)*.018);
      writing-mode:vertical-rl; transform:rotate(180deg); display:flex; align-items:center; justify-content:center; padding:2px 1px}
.gflag img{flex:1; object-fit:cover; min-width:0}
.noflag{flex:1; display:flex; align-items:center; justify-content:center; background:#E7E0CF; color:#20153F; font-weight:800; font-size:inherit; letter-spacing:.05em}

.matches{margin-top:auto; display:grid; grid-template-columns:1fr 1fr 1fr; gap:2.5%; padding:2.5% 0 1%}
.match{display:flex; gap:3%; align-items:flex-start}
.pitch{width:14%; aspect-ratio:3/4; border:2px solid #fff; border-radius:16%; position:relative; flex:none; opacity:.95}
.pitch::before{content:''; position:absolute; left:8%; right:8%; top:47%; height:2px; background:#fff}
.pitch::after{content:''; position:absolute; left:50%; top:50%; width:26%; aspect-ratio:1; border:2px solid #fff; border-radius:50%; transform:translate(-50%,-50%)}
.match .mi{flex:1; min-width:0}
.mdate{color:#fff; font-weight:600; font-size:calc(var(--w)*.016); line-height:1.2; margin-bottom:4%; text-shadow:0 1px 2px rgba(0,0,0,.25)}
.mteam{display:flex; gap:2%; margin-bottom:3.5%}
.mteam .tn{flex:1; background:#fff; padding:2.5% 5%; font-weight:800; font-size:calc(var(--w)*.0185); color:var(--ink-dark);
      white-space:nowrap; overflow:hidden; text-overflow:ellipsis; border-radius:2px}
.mteam .tn.hl{color:var(--p-red)}
.mteam .bx{width:12%; background:#fff; border-radius:2px}

.roadto{margin-top:auto; display:flex; gap:3%; align-items:center; padding:3% 1% 1%}
.roadto .rt{font-family:var(--font-baloo),cursive; font-weight:800; color:var(--p-navy); font-size:calc(var(--w)*.028); line-height:1.05}
.roadto .rtable{flex:1; background:var(--p-green2); border-radius:4px; padding:2.5% 3%; color:#fff}
.roadto .rh{font-weight:800; font-size:calc(var(--w)*.019); letter-spacing:.06em; margin-bottom:2%; opacity:.9}
.roadto .rrow{display:flex; justify-content:space-between; font-weight:600; font-size:calc(var(--w)*.018); padding:1.2% 0; border-top:1px solid rgba(255,255,255,.18)}
.pageno{position:absolute; right:2.5%; bottom:1.2%; background:#fff; color:var(--ink-dark); font-weight:800;
      font-size:calc(var(--w)*.019); padding:.6% 1.6%; border-radius:99px; box-shadow:0 1px 3px rgba(0,0,0,.3); z-index:2}

/* ===== portada ===== */
.cover{position:absolute; inset:0; background:#2B1E7E}
.cover .band{position:absolute; top:0; left:0; right:0; padding:3.5% 0; background:var(--paper); text-align:center;
      font-weight:800; letter-spacing:.28em; font-size:calc(var(--w)*.026); color:#20153F}
.cover .blk{position:absolute}
.cover .b1{left:0; bottom:0; width:34%; height:26%; background:#C8481F; border-radius:0 70% 0 0/0 55% 0 0}
.cover .b2{right:0; top:9%; width:26%; height:22%; background:#6FB43F; border-radius:0 0 0 70%/0 0 0 60%}
.cover .b3{right:0; bottom:0; width:30%; height:18%; background:#E8A81E; border-radius:55% 0 0 0/70% 0 0 0}
.cover .g26{position:absolute; top:24%; left:8%; right:8%; height:44%; display:flex; gap:4%; align-items:center; justify-content:center}
.cover .g26 svg{height:100%; fill:#fff; filter:drop-shadow(0 6px 14px rgba(0,0,0,.35))}
.cover .ttl{position:absolute; top:70%; left:0; right:0; text-align:center; color:#fff;
      font-family:var(--font-baloo),cursive; font-weight:800; font-size:calc(var(--w)*.056); line-height:1.05}
.cover .ttl small{display:block; font-family:var(--font-barlow); font-weight:700; font-size:calc(var(--w)*.024); letter-spacing:.2em; opacity:.85; margin-top:2%}
.cover .panini{position:absolute; left:5%; bottom:4.5%; background:#C8102E; color:#fff; font-weight:800;
      font-style:italic; padding:1.8% 5%; border-radius:6px; font-size:calc(var(--w)*.034); letter-spacing:.04em; box-shadow:0 2px 8px rgba(0,0,0,.4)}

/* ===== página de grupos ===== */
.gpage{padding:4% 3.5%; display:flex; flex-direction:column; height:100%}
.gpage h2{margin:0 0 .5%; font-family:var(--font-baloo),cursive; font-weight:800; color:#20153F; font-size:calc(var(--w)*.044)}
.gpage .sub{color:#6C5FA0; font-weight:600; font-size:calc(var(--w)*.021); margin-bottom:2.5%}
.ggrid{display:grid; grid-template-columns:1fr 1fr 1fr; gap:2%}
.gcard{background:#fff; border-radius:6px; padding:2.5% 3.5%; box-shadow:0 1px 4px rgba(32,21,63,.12); cursor:pointer; min-width:0}
.gcard.soon{opacity:.5; cursor:default}
.gcard h3{margin:0 0 3%; font-weight:800; font-size:calc(var(--w)*.022); color:#20153F; letter-spacing:.05em}
.gcard .gflag{height:calc(var(--w)*.026); margin-bottom:2.5%}
.gcard .gflag .tab{font-size:calc(var(--w)*.011)}
.gnote{margin-top:auto; padding-top:2%; color:#6C5FA0; font-weight:600; font-size:calc(var(--w)*.019); text-align:center}

@media (prefers-reduced-motion: reduce){ .sheet{transition:none} }
/* --- app: boton reset de la barra de estado (chrome, no es de la referencia) --- */
.demo-bar .rst{border:0; border-radius:8px; padding:4px 10px; margin-left:8px; background:#2E2350; color:#CFC5EE;
     font-family:inherit; font-weight:700; font-size:11.5px; cursor:pointer}

/* --- app Fv3.2: modo SPREAD en desktop (>=900px). Solo layout/orquestación;
       builders y CSS de página de la referencia intactos. En spread cada vista
       renderiza sus 1-2 páginas (sin dorso fantasma) y --w pasa a ser el ancho
       real de UNA página para que las tipografías calc(var(--w)*x) escalen. --- */
@media (min-width:900px){
  .ab-wrap{justify-content:center; --sw:min(92vw, calc(86vh * 2016 / 1204))}
  .nav{width:var(--sw)}
  .demo-bar{width:var(--sw)}
}
.stage{display:flex; flex-direction:column; align-items:center; width:100%}
.view.spread{position:relative; width:var(--sw); aspect-ratio:2016/1204; display:flex;
     --w:calc(var(--sw) / 2); filter:drop-shadow(0 14px 26px rgba(0,0,0,.5)); touch-action:pan-y}
.view.spread.single{justify-content:center}
.spage{position:relative; flex:1; min-width:0; background:var(--paper); overflow:hidden}
.spage.l{border-radius:5px 0 0 5px}
.spage.r{border-radius:0 5px 5px 0}
.spage.solo{flex:0 0 50%; border-radius:5px}
.view.spread .spine{position:absolute; left:50%; top:0; bottom:0; width:22px; transform:translateX(-50%);
     pointer-events:none; z-index:60;
     background:linear-gradient(90deg, transparent, rgba(0,0,0,.20) 42%, rgba(0,0,0,.30) 50%, rgba(0,0,0,.20) 58%, transparent)}
`;

// ---------- estado visual de un cromo ----------
function tileState(inv: InvMap, k: string): { ds: string; badge: string } {
  const e: Entry | undefined = inv[k];
  if (!e) return { ds: 'falta', badge: '' };
  return e.state === 'repe' ? { ds: 'repe' + e.repes, badge: '×' + e.repes } : { ds: 'tengo', badge: '' };
}

/* ---------- builders (markup 1:1 con la referencia) ---------- */
function tileHTML(code: string, n: number, inv: InvMap): string {
  const k = K(code, n);
  const { ds, badge } = tileState(inv, k);
  if (n === 1) {
    return '<div class="tile s1" data-tile="' + k + '" data-state="' + ds + '">'
      + '<svg class="g g2"><use href="#g2"/></svg><svg class="g g6"><use href="#g6"/></svg>'
      + '<div class="code">' + code + '<br>1</div><div class="pname"><span class="lbl">TEAM<br>LOGO</span></div>'
      + '<div class="foil"></div>'
      + '<div class="sticker"><div class="art"><div class="sc">' + code + ' 1</div><div class="sn2">TEAM LOGO</div></div></div>'
      + '<div class="badge-rep">' + badge + '</div>'
      + '<div class="step"><button data-act="minus" data-k="' + k + '">−</button>'
      + '<button data-act="plus" data-k="' + k + '">+</button></div></div>';
  }
  const r = ALBUM_TEAMS[code].roster[String(n)];
  const name = '<span class="fn">' + (r[0] || '&nbsp;') + '</span><span class="sn">' + r[1] + '</span>';
  return '<div class="tile" data-tile="' + k + '" data-state="' + ds + '">'
    + '<svg class="g g2"><use href="#g2"/></svg><svg class="g g6"><use href="#g6"/></svg>'
    + '<div class="code">' + code + '<br>' + n + '</div><div class="pname">' + name + '</div>'
    + '<div class="sticker"><div class="art"><img class="imgslot" alt="">'
    + '<div class="sc">' + code + ' ' + n + '</div><div class="sn2">' + r[1] + '</div></div></div>'
    + '<div class="badge-rep">' + badge + '</div>'
    + '<div class="step"><button data-act="minus" data-k="' + k + '">−</button>'
    + '<button data-act="plus" data-k="' + k + '">+</button></div></div>';
}

function photoHTML(code: string, inv: InvMap): string {
  const k = K(code, 13);
  const { ds, badge } = tileState(inv, k);
  return '<div class="tile crest" data-tile="' + k + '" data-state="' + ds + '">'
    + '<svg class="motif"><use href="#g6"/></svg><div class="code">' + code + '<br>13</div>'
    + '<div class="plabel">TEAM PHOTO</div>'
    + '<div class="sticker"><div class="art"><div class="sc">' + code + ' 13</div><div class="sn2">TEAM PHOTO</div></div></div>'
    + '<div class="badge-rep">' + badge + '</div>'
    + '<div class="step"><button data-act="minus" data-k="' + k + '">−</button>'
    + '<button data-act="plus" data-k="' + k + '">+</button></div></div>';
}

function pageEquipoL(code: string, inv: InvMap): string {
  const T = ALBUM_TEAMS[code], V = VERIF[code] || {};
  const fed = '<div class="fed"><img src="' + FLAG(code) + '" alt="' + code + '" onerror="flagErr(this)">'
    + (V.fed ? '<div class="fname">' + V.fed + '</div>' : '') + '</div>';
  const quali = V.quali ? V.quali.map((q) => '<div class="rrow"><span>' + q + '</span><span>·</span></div>').join('')
    : '<div class="rrow"><span>&nbsp;</span><span>·</span></div><div class="rrow"><span>&nbsp;</span><span>·</span></div><div class="rrow"><span>&nbsp;</span><span>·</span></div>';
  return '<div class="teampage" style="position:absolute;inset:0;' + themeStyle(code) + '">'
    + '<div class="bg pL"><div class="b-soft1"></div><div class="b-soft2"></div></div>'
    + '<div class="inner">'
    + '<div class="grid g-head"><div class="headblock">'
    + '<div class="weare"><div class="l1">WE ARE</div><div class="l2">' + T.pais + '</div></div>'
    + fed + '</div>' + tileHTML(code, 1, inv) + tileHTML(code, 2, inv) + '</div>'
    + '<div class="row-gap"></div><div class="grid">' + [3, 4, 5, 6].map((n) => tileHTML(code, n, inv)).join('') + '</div>'
    + '<div class="row-gap"></div><div class="grid">' + [7, 8, 9, 10].map((n) => tileHTML(code, n, inv)).join('') + '</div>'
    + '<div class="roadto"><div class="rt">ROAD TO<br>FIFA<br>WORLD<br>CUP 2026</div>'
    + '<div class="rtable"><div class="rh">QUALIFIERS</div>' + quali + '</div></div>'
    + '<div class="pageno">' + T.pagina + ' · ' + code + '</div></div></div>';
}

function pageEquipoR(code: string, inv: InvMap): string {
  const T = ALBUM_TEAMS[code], V = VERIF[code] || {};
  const rivales = GRUPOS[T.grupo].filter((c) => c !== code);
  const partidos = V.partidos || rivales.map((rc) => ({ fecha: 'GROUP ' + T.grupo + ' — MATCH', a: T.pais, b: ALBUM_TEAMS[rc].pais, hl: 'a' }));
  const mlang = V.mlang || T.pais;
  return '<div class="teampage" style="position:absolute;inset:0;' + themeStyle(code) + '">'
    + '<div class="bg pR"><div class="b-navy"></div><div class="b-red"></div><div class="b-green"></div><div class="b-yellow"></div><div class="b-gedge"></div></div>'
    + '<div class="inner">'
    + '<div class="grid" style="margin-top:1.5%">' + tileHTML(code, 11, inv) + tileHTML(code, 12, inv)
    + '<div class="crestwrap">' + photoHTML(code, inv) + '<div class="mlang' + (V.mlang ? '' : ' solo') + '">' + mlang + '</div></div></div>'
    + '<div class="row-gap"></div><div class="grid">' + [14, 15, 16, 17].map((n) => tileHTML(code, n, inv)).join('') + '</div>'
    + '<div class="row-gap"></div><div class="grid">'
    + '<div class="gbadge"><div class="gt">GROUP ' + T.grupo + '</div><div class="gflags">'
    + GRUPOS[T.grupo].map((c) => '<div class="gflag" data-goto="' + sheetOf(c) + '"><span class="tab">' + c + '</span><img src="' + FLAG(c) + '" alt="' + c + '" onerror="flagErr(this)"></div>').join('')
    + '</div></div>' + [18, 19, 20].map((n) => tileHTML(code, n, inv)).join('') + '</div>'
    + '<div class="matches">' + partidos.map((m) => '<div class="match"><div class="pitch"></div><div class="mi">'
      + '<div class="mdate">' + m.fecha + '</div>'
      + '<div class="mteam"><span class="tn ' + (m.hl === 'a' ? 'hl' : '') + '">' + m.a + '</span><span class="bx"></span><span class="bx"></span></div>'
      + '<div class="mteam"><span class="tn ' + (m.hl === 'b' ? 'hl' : '') + '">' + m.b + '</span><span class="bx"></span><span class="bx"></span></div>'
      + '</div></div>').join('') + '</div>'
    + '<div class="pageno">' + (T.pagina + 1) + ' · ' + code + '</div></div></div>';
}

function pagePortada(): string {
  return '<div class="cover">'
    + '<div class="blk b1"></div><div class="blk b2"></div><div class="blk b3"></div>'
    + '<div class="band">OFFICIAL STICKER COLLECTION</div>'
    + '<div class="g26"><svg viewBox="0 0 1000 752"><use href="#g2"/></svg>'
    + '<svg viewBox="0 0 1000 759"><use href="#g6"/></svg></div>'
    + '<div class="ttl">FIFA WORLD CUP 2026™<small>MEXICO · CANADA · UNITED STATES</small></div>'
    + '<div class="panini">PANINI</div></div>';
}

function pageGrupos(): string {
  return '<div class="gpage"><h2>FIFA WORLD CUP 2026</h2>'
    + '<div class="sub">48 selecciones · 12 grupos · toca un equipo para abrir su pliego</div>'
    + '<div class="ggrid">' + Object.entries(GRUPOS).map(([g, cs]) =>
      '<div class="gcard" data-goto="' + sheetOf(cs[0]) + '">'
      + '<h3>GROUP ' + g + '</h3>'
      + cs.map((c) => '<div class="gflag" data-goto="' + sheetOf(c) + '"><span class="tab">' + c + '</span><img src="' + FLAG(c) + '" alt="' + c + '" loading="lazy" onerror="flagErr(this)"></div>').join('')
      + '</div>').join('')
    + '</div><div class="gnote">48 pliegos · 864 jugadores · nombres del álbum oficial Panini contrastados por OCR</div></div>';
}

/* ---------- shell (nav + libro + barra de estado) ---------- */
function pageHTML(p: number, invs: Record<string, InvMap>): string {
  if (p === 0) return pagePortada();
  if (p === 1) return pageGrupos();
  const i = Math.floor((p - 2) / 2);
  if (i < 0 || i >= ORDER.length) return '';
  const code = ORDER[i];
  const inv = invs[code] || {};
  return (p - 2) % 2 === 0 ? pageEquipoL(code, inv) : pageEquipoR(code, inv);
}

function navHTML(page: number, isDesktop: boolean): string {
  const on = (t: number) => page === t || (page === t + 1 && t >= 2);
  const atEnd = isDesktop ? viewOfPage(page) === TOTAL_VIEWS - 1 : page === TOTAL_PAGES - 1;
  const chips = ORDER.map((c) => {
    const t = sheetOf(c);
    return '<button' + (on(t) ? ' class="on"' : '') + ' data-goto="' + t + '">' + c + '</button>';
  }).join('');
  return '<div class="nav" id="nav">'
    + '<button class="fix arrow" data-nav="prev"' + (page === 0 ? ' disabled' : '') + '>‹</button>'
    + '<button class="fix' + (on(0) ? ' on' : '') + '" data-goto="0">PORTADA</button>'
    + '<button class="fix' + (on(1) ? ' on' : '') + '" data-goto="1">GRUPOS</button>'
    + '<div class="chips" id="chips">' + chips + '</div>'
    + '<button class="fix arrow" data-nav="next"' + (atEnd ? ' disabled' : '') + '>›</button>'
    + '</div>';
}

// Desktop: vista = pliego completo (L|R) o página única (portada/grupos)
function spreadViewHTML(v: number, invs: Record<string, InvMap>, current: boolean): string {
  if (v < 0 || v >= TOTAL_VIEWS) return '';
  let inner: string;
  if (v === 0) inner = '<div class="spage solo">' + pagePortada() + '</div>';
  else if (v === 1) inner = '<div class="spage solo">' + pageGrupos() + '</div>';
  else {
    const code = ORDER[v - 2];
    const inv = invs[code] || {};
    inner = '<div class="spage l">' + pageEquipoL(code, inv) + '</div>'
      + '<div class="spage r">' + pageEquipoR(code, inv) + '</div>'
      + '<div class="spine"></div>';
  }
  return '<div class="view spread' + (v < 2 ? ' single' : '') + '" data-view="' + v + '"'
    + (current ? ' data-current="1"' : ' style="display:none"') + '>' + inner + '</div>';
}

function stageHTML(page: number, invs: Record<string, InvMap>): string {
  // lazy mount por vista: actual ±1
  const v = viewOfPage(page);
  let out = '';
  for (let q = v - 1; q <= v + 1; q++) out += spreadViewHTML(q, invs, q === v);
  return '<div class="stage">' + out + '</div>';
}

function statusHTML(page: number, invs: Record<string, InvMap>): string {
  if (page >= 2) {
    const code = ORDER[Math.floor((page - 2) / 2)];
    const T = ALBUM_TEAMS[code];
    const inv = invs[code] || {};
    let got = 0, repeTotal = 0;
    for (let s = 1; s <= 20; s++) {
      const e = inv[K(code, s)];
      if (e) { got++; repeTotal += e.repes || 0; }
    }
    const pct = Math.round((got / 20) * 100);
    return '<div class="demo-bar"><b>' + T.pais + '</b> · GRUPO ' + T.grupo
      + ' · Pegados ' + got + '/20 · ' + pct + '% · <b>REPES ' + repeTotal + '</b>'
      + '<button class="rst" data-reset data-code="' + code + '" title="Reiniciar este equipo">↺ Reiniciar</button></div>';
  }
  return '<div class="demo-bar">Álbum Mundial 2026 · <b>48 selecciones</b> · toca un cromo: falta → tengo → repe ×' + MAX_REPES + '</div>';
}

function bookHTML(page: number, invs: Record<string, InvMap>): string {
  let sheets = '';
  for (let i = 0; i < TOTAL_PAGES; i++) {
    const flipped = i < page;
    const z = flipped ? 10 + i : 10 + (TOTAL_PAGES - i);
    // lazy mount: solo la hoja actual ±2 lleva contenido; el resto placeholders
    const body = Math.abs(i - page) <= 2 ? pageHTML(i, invs) : '';
    sheets += '<div class="sheet noanim' + (flipped ? ' flipped' : '') + '" data-page="' + i + '"'
      + (i === page ? ' data-current="1"' : '') + ' style="z-index:' + z + '">'
      + '<div class="face front">' + body + '</div>'
      + '<div class="face back"><div class="bmark"><svg viewBox="0 0 1000 759"><use href="#g6"/></svg></div></div>'
      + '</div>';
  }
  return '<div class="book" id="book">' + sheets + '<div class="lomo"></div></div>';
}

/* ---------- componente (motor Fv3, sin cambios funcionales) ---------- */
export default function AlbumBook() {
  const ref = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<Set<string>>(new Set());
  const swipedRef = useRef(false);
  const [page, setPage] = useState(0);
  const [invs, setInvs] = useState<Record<string, InvMap>>({});
  const [isDesktop, setIsDesktop] = useState(false);

  // breakpoint spread: re-render limpio al cruzar 900px
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)');
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // fallback de bandera de la referencia (global usado por onerror inline)
  useEffect(() => {
    (window as unknown as { flagErr?: (img: HTMLImageElement) => void }).flagErr = (img) => {
      const s = document.createElement('span');
      s.className = 'noflag';
      const tab = img.parentElement ? img.parentElement.querySelector('.tab') : null;
      s.style.fontSize = getComputedStyle(tab || img).fontSize;
      s.textContent = img.alt || '';
      img.replaceWith(s);
    };
  }, []);

  // cargar inventario de los equipos montados (hoja actual ±2)
  useEffect(() => {
    const codes = new Set<string>();
    for (let q = page - 2; q <= page + 2; q++) {
      const i = Math.floor((q - 2) / 2);
      if (q >= 2 && i >= 0 && i < ORDER.length) codes.add(ORDER[i]);
    }
    for (const c of codes) {
      if (loadingRef.current.has(c)) continue;
      loadingRef.current.add(c);
      store.loadCountry(c).then((m) => setInvs((prev) => ({ ...prev, [c]: m })));
    }
  }, [page]);

  const apply = useCallback((key: string, entry: Entry | null) => {
    const code = key.split('-')[0];
    setInvs((prev) => {
      const m = { ...(prev[code] || {}) };
      if (entry) m[key] = entry; else delete m[key];
      return { ...prev, [code]: m };
    });
    store.put(key, entry);
  }, []);

  // render por innerHTML (patrón Fv3); desktop = spread por vistas, móvil = libro
  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.innerHTML = SYMBOLS + '<style>' + CSS + '</style>'
      + navHTML(page, isDesktop)
      + (isDesktop ? stageHTML(page, invs) : bookHTML(page, invs))
      + statusHTML(page, invs);
    // centrar el chip activo
    const chips = el.querySelector('#chips') as HTMLElement | null;
    const onChip = chips?.querySelector('.on') as HTMLElement | null;
    if (chips && onChip) chips.scrollLeft = onChip.offsetLeft - chips.clientWidth / 2 + onChip.clientWidth / 2;
  }, [page, invs, isDesktop]);

  // delegación de eventos + swipe (móvil: hojas · desktop: vistas + teclado + drag)
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const nav = (p: number) => setPage(Math.max(0, Math.min(TOTAL_PAGES - 1, p)));
    const goView = (v: number) => setPage(pageOfView(Math.max(0, Math.min(TOTAL_VIEWS - 1, v))));
    const step = (dir: number) => { if (isDesktop) goView(viewOfPage(page) + dir); else nav(page + dir); };
    const onClick = (ev: MouseEvent) => {
      if (swipedRef.current) return;
      const target = ev.target as HTMLElement;
      const act = target.closest('[data-act]') as HTMLElement | null;
      if (act) {
        ev.stopPropagation();
        const key = act.dataset.k!;
        const code = key.split('-')[0];
        const e = (invs[code] || {})[key] as Entry | undefined;
        if (!e) return;
        if (act.dataset.act === 'plus') apply(key, { state: 'repe', repes: Math.min(MAX_REPES, (e.state === 'repe' ? e.repes : 0) + 1) });
        else {
          const r = Math.max(0, (e.state === 'repe' ? e.repes : 0) - 1);
          apply(key, r > 0 ? { state: 'repe', repes: r } : { state: 'tengo', repes: 0 });
        }
        return;
      }
      const navBtn = target.closest('[data-nav]') as HTMLElement | null;
      if (navBtn) { step(navBtn.dataset.nav === 'next' ? 1 : -1); return; }
      const goto = target.closest('[data-goto]') as HTMLElement | null;
      if (goto) { nav(parseInt(goto.dataset.goto!, 10)); return; }
      const reset = target.closest('[data-reset]') as HTMLElement | null;
      if (reset) {
        const code = reset.dataset.code!;
        if (confirm('¿Reiniciar el inventario de ' + ALBUM_TEAMS[code].pais + '?')) {
          store.clear(code);
          setInvs((prev) => ({ ...prev, [code]: {} }));
        }
        return;
      }
      const tile = target.closest('[data-tile]') as HTMLElement | null;
      if (tile) {
        const key = tile.dataset.tile!;
        const code = key.split('-')[0];
        const e = (invs[code] || {})[key] as Entry | undefined;
        const st = (e?.state ?? 'falta') as 'falta' | 'tengo' | 'repe';
        const repes = e?.repes ?? 0;
        // falta -> tengo -> repe1 -> ... -> repe(MAX_REPES) -> falta
        if (st === 'falta') apply(key, { state: 'tengo', repes: 0 });
        else if (st === 'tengo') apply(key, { state: 'repe', repes: 1 });
        else if (repes < MAX_REPES) apply(key, { state: 'repe', repes: repes + 1 });
        else apply(key, null);
      }
    };
    // móvil: swipe táctil por hojas (comportamiento Fv3.1 intacto)
    let touchX = 0, touchY = 0;
    const onTouchStart = (ev: TouchEvent) => {
      touchX = ev.touches[0].clientX; touchY = ev.touches[0].clientY;
    };
    const onTouchEnd = (ev: TouchEvent) => {
      const dx = ev.changedTouches[0].clientX - touchX;
      const dy = ev.changedTouches[0].clientY - touchY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        swipedRef.current = true;
        setTimeout(() => { swipedRef.current = false; }, 350);
        nav(dx < 0 ? page + 1 : page - 1);
      }
    };
    // desktop: teclado + drag (pointer) por vistas, solo sobre el stage
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'ArrowRight') step(1);
      else if (ev.key === 'ArrowLeft') step(-1);
    };
    let pX = 0, pY = 0, pOn = false;
    const onPointerDown = (ev: PointerEvent) => {
      if (!(ev.target as HTMLElement).closest('.stage')) { pOn = false; return; }
      pOn = true; pX = ev.clientX; pY = ev.clientY;
    };
    const onPointerUp = (ev: PointerEvent) => {
      if (!pOn) return; pOn = false;
      const dx = ev.clientX - pX, dy = ev.clientY - pY;
      if (Math.abs(dx) > 55 && Math.abs(dy) < 70) {
        swipedRef.current = true;
        setTimeout(() => { swipedRef.current = false; }, 350);
        step(dx < 0 ? 1 : -1);
      }
    };
    el.addEventListener('click', onClick);
    if (isDesktop) {
      window.addEventListener('keydown', onKey);
      el.addEventListener('pointerdown', onPointerDown);
      el.addEventListener('pointerup', onPointerUp);
    } else {
      el.addEventListener('touchstart', onTouchStart, { passive: true });
      el.addEventListener('touchend', onTouchEnd, { passive: true });
    }
    return () => {
      el.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKey);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [page, invs, apply, isDesktop]);

  return <div ref={ref} className="ab-wrap" id="app" />;
}
