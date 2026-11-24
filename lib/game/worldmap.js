/* מפת העולם של ספר הזמן – מפה עתיקה מצוירת בקוד.
   כל פרק יושב במקום האמיתי שלו בעולם. dot = המקום עצמו, pin = איפה הסיכה מוצגת (כדי שלא יעלו זו על זו). */
import { star4 } from './art.js';

export const MAP_W = 1000, MAP_H = 600;

export const MAPPOS = {
  p1: { dot: [641, 262], pin: [690, 214], place: 'הַסִּפְרִיָּה שֶׁל יוּבַל' },
  a1: { dot: [536, 284], pin: [520, 352], place: 'סִירָקוּזָה' },
  m1: { dot: [522, 205], pin: [572, 142], place: 'וֶנֶצְיָה', route: [[790, 172, '🏜️'], [905, 205, '🏯']] },
  l1: { dot: [513, 222], pin: [452, 160], place: 'פִירֶנְצֶה' },
  h1: { dot: [292, 196], pin: [226, 150], place: 'אֲמֶרִיקָה' },
  s2: { dot: [370, 470], pin: [370, 470], place: '???' },
};

const LAND = '#ecd7a3', EDGE = '#8a6a3a', SEA = '#efe2bf';

export function worldMapSVG(segments = []) {
  // segments: [{from:[x,y], to:[x,y], done:bool}]
  let s = `<svg viewBox="0 0 ${MAP_W} ${MAP_H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
  <defs>
    <radialGradient id="wmv" cx="50%" cy="50%" r="75%"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#5a3a14" stop-opacity=".45"/></radialGradient>
    <linearGradient id="wml" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2dfae"/><stop offset="1" stop-color="#e2c98e"/></linearGradient>
    <filter id="wmrough"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .32  0 0 0 0 .15  0 0 0 .08 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
  </defs>
  <rect width="${MAP_W}" height="${MAP_H}" fill="${SEA}"/>`;
  // גלים בים
  const waves = [[90,330],[140,460],[380,250],[400,360],[350,540],[700,470],[760,520],[60,560],[980,420],[420,110],[180,40],[860,420]];
  waves.forEach(([x, y]) => s += `<path d="M${x} ${y}q8 -6 16 0t16 0" stroke="#a88b55" stroke-width="2" fill="none" opacity=".55"/><path d="M${x + 10} ${y + 10}q8 -6 16 0" stroke="#a88b55" stroke-width="2" fill="none" opacity=".4"/>`);
  const land = d => `<path d="${d}" fill="url(#wml)" stroke="${EDGE}" stroke-width="2.6" stroke-linejoin="round"/>`;
  // יבשות (מסוגננות, לא בקנה מידה)
  s += land('M60 120C90 80 170 60 250 70C300 75 330 100 322 140C314 170 292 176 302 200C312 228 282 258 252 270C232 280 226 300 240 320L230 332C205 316 190 302 170 292C140 276 120 252 110 222C96 192 70 170 60 120Z');
  s += land('M300 40C330 30 370 35 375 55C370 80 340 90 320 80C305 70 295 55 300 40Z');
  s += land('M245 345C280 340 320 360 330 395C335 430 310 470 292 510C282 540 270 572 260 592C250 562 242 522 240 482C238 442 226 412 230 382C232 362 238 350 245 345Z');
  s += land('M440 122C456 90 520 72 600 78C642 82 662 110 652 140C642 165 616 176 596 186C576 196 562 200 546 206L522 200C506 206 490 211 470 216C455 219 445 206 448 191C450 176 440 166 432 156C425 141 430 129 440 122Z');
  s += land('M500 40C520 25 560 30 570 55C575 75 560 90 540 95C525 85 510 70 500 40Z');
  s += land('M428 200C445 194 470 199 479 215C481 235 461 246 441 243C425 239 419 220 428 200Z');
  s += land('M505 203C516 198 526 204 529 214C533 229 546 244 556 254C561 261 557 270 549 268L543 262C539 272 531 272 531 265C529 250 516 238 509 228C503 220 501 211 505 203Z'); // איטליה
  s += `<ellipse cx="536" cy="285" rx="13" ry="7" fill="url(#wml)" stroke="${EDGE}" stroke-width="2.4"/>`; // סיציליה
  s += land('M445 292C480 272 560 277 610 287C640 292 660 322 670 352C680 382 660 402 650 422C640 462 620 502 600 542C590 562 570 572 560 562C545 532 540 492 530 462C520 432 490 422 470 402C450 382 440 352 440 322C440 307 440 299 445 292Z');
  s += land('M642 272C662 266 692 276 707 300C717 320 702 346 682 350C667 341 657 321 647 301C641 291 639 281 642 272Z');
  s += land('M642 122C682 70 782 50 882 60C942 65 986 90 990 130C992 160 970 180 962 200C956 220 966 240 952 260C936 280 916 286 906 302C896 320 872 330 852 320C836 330 831 360 816 370C801 360 796 336 781 321C766 311 751 301 736 301C721 291 706 276 691 263C676 251 661 236 656 216C651 196 656 176 651 161C646 146 636 136 642 122Z');
  s += land('M760 310C780 305 800 315 795 335C790 355 778 375 770 386C762 371 755 351 752 336C750 323 752 314 760 310Z');
  s += `<ellipse cx="972" cy="208" rx="9" ry="22" fill="url(#wml)" stroke="${EDGE}" stroke-width="2.2" transform="rotate(25 972 208)"/>`;
  [[900, 362, 18, 8], [940, 382, 14, 7], [868, 392, 10, 6]].forEach(([x, y, rx, ry]) => s += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#wml)" stroke="${EDGE}" stroke-width="2"/>`);
  s += land('M880 470C920 450 980 460 995 500C1000 540 960 560 920 556C890 546 870 512 880 470Z');
  // הרים, מדבר, יערות
  const mountain = (x, y, k = 1) => `<path d="M${x - 12 * k} ${y}L${x} ${y - 16 * k}L${x + 12 * k} ${y}" fill="#d8bd84" stroke="${EDGE}" stroke-width="2"/><path d="M${x - 4 * k} ${y - 10 * k}L${x} ${y - 16 * k}L${x + 4 * k} ${y - 10 * k}" fill="#fff8e6"/>`;
  [[720, 140], [745, 150, 1.2], [835, 245, 1.3], [860, 250], [480, 175], [150, 150, 1.1], [175, 160], [262, 430, 1.1]].forEach(([x, y, k]) => s += mountain(x, y, k));
  for (let i = 0; i < 26; i++) s += `<circle cx="${740 + (i * 37) % 120}" cy="${150 + (i * 23) % 50}" r="1.6" fill="#b08a4a"/>`;
  for (let i = 0; i < 18; i++) s += `<circle cx="${470 + (i * 41) % 150}" cy="${320 + (i * 19) % 50}" r="1.6" fill="#b08a4a"/>`;
  const tree = (x, y) => `<path d="M${x} ${y - 12}L${x - 6} ${y}H${x + 6}Z" fill="#7a8a4a" stroke="#4a5a2a" stroke-width="1"/>`;
  [[230, 120], [244, 128], [258, 118], [600, 110], [612, 118], [282, 370], [296, 380]].forEach(([x, y]) => s += tree(x, y));
  // ספינה
  s += `<g transform="translate(390 300)"><path d="M-22 6Q0 16 22 6L18 14Q0 20 -18 14Z" fill="#7a4b2a" stroke="#4a2c18" stroke-width="1.5"/><path d="M0 6V-24" stroke="#4a2c18" stroke-width="2"/><path d="M2 -22L18 2H2Z" fill="#fff8e6" stroke="#8a6a3a"/><path d="M-2 -18L-14 2H-2Z" fill="#f3e2bb" stroke="#8a6a3a"/></g>`;
  // מפלצת ים
  s += `<g transform="translate(70 420)" fill="#6a8a7a" stroke="#3a5a4a" stroke-width="1.5"><path d="M-30 6Q-20 -14 -10 6Z"/><path d="M-6 6Q4 -18 14 6Z"/><path d="M18 6Q30 -26 40 -10Q44 -4 38 -2Q32 -8 28 6Z"/><circle cx="36" cy="-12" r="1.6" fill="#000"/></g>`;
  // ורד רוחות
  s += `<g transform="translate(110 520)"><circle r="34" fill="#f6e8c4" stroke="${EDGE}" stroke-width="2"/><circle r="26" fill="none" stroke="${EDGE}" stroke-width="1"/>
    <path d="M0 -44L7 -7L44 0L7 7L0 44L-7 7L-44 0L-7 -7Z" fill="#c98d1e" stroke="${EDGE}" stroke-width="1.5"/><path d="M0 -44L7 -7L0 0Z M44 0L7 7L0 0Z M0 44L-7 7L0 0Z M-44 0L-7 -7L0 0Z" fill="#8a5d12"/>
    <text y="-48" text-anchor="middle" font-size="15" font-weight="800" fill="#5a3a14">צ</text></g>`;
  // כותרת
  s += `<g transform="translate(420 572)"><path d="M-150 -18H150L136 0L150 18H-150L-136 0Z" fill="#f6e8c4" stroke="${EDGE}" stroke-width="2"/>
    <text y="7" text-anchor="middle" font-size="22" font-weight="900" fill="#5a3a14" font-family="Frank Ruhl Libre, serif">מַפַּת סֵפֶר הַזְּמַן</text></g>`;
  // מסלולים
  segments.forEach(g => {
    const [x1, y1] = g.from, [x2, y2] = g.to, mx = (x1 + x2) / 2, my = Math.min(y1, y2) - Math.abs(x2 - x1) * 0.18 - 14;
    const d = `M${x1} ${y1}Q${mx} ${my} ${x2} ${y2}`;
    s += g.done ? `<path d="${d}" stroke="#b8860b" stroke-width="4.5" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#ffd96a" stroke-width="2" fill="none" stroke-linecap="round"/>`
      : `<path d="${d}" stroke="#7a5a2a" stroke-width="3" fill="none" stroke-dasharray="2 9" stroke-linecap="round" opacity=".75"/>`;
  });
  s += `<rect width="${MAP_W}" height="${MAP_H}" filter="url(#wmrough)" opacity=".9"/><rect width="${MAP_W}" height="${MAP_H}" fill="url(#wmv)"/>`;
  s += star4(950, 40, 10, '#c98d1e', .7) + star4(40, 40, 8, '#c98d1e', .6);
  return s + '</svg>';
}
