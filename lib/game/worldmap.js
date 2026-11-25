/* מפת העולם של "ספר הזמן" – יבשות אמיתיות (Natural Earth), צבעים כמו באטלס מאויר,
   וזכוכית מגדלת על הים התיכון, שם גרים רוב הגיבורים.
   הנתונים הגיאוגרפיים – worlddata.js (נוצר ע"י scripts/build-world-map.mjs).
   dot = המקום האמיתי של הגיבור (בזכוכית המגדלת – אם הוא באזור הים התיכון). pin = איפה מצויר העיגול שלו.
   from = מאיפה מתחיל המסלול שלו במפת העולם (למי שבזכוכית). route = תחנות בדרך [x, y, אימוג'י]. */
import { star4, scene } from './art.js';
import { LAND, GRAT, MED_LAND, MED_GRAT, INSET, MED_BOX, WORLD as W, MED as M } from './worlddata.js';

export const MAP_W = 1000, MAP_H = 600;

export const MAPPOS = {
  p1: { art: 'library', dot: M.israel, pin: [938, 476], place: 'הַסִּפְרִיָּה שֶׁל יוּבַל – יִשְׂרָאֵל' },
  c1: { art: 'steppe', e: '🐎', dot: W.mongolia, pin: [800, 100], place: 'מוֹנְגוֹלְיָה – הָעֲרָבָה הַגְּדוֹלָה' },
  a0: { art: 'bath', e: '🛁', dot: M.syracuse, pin: [742, 336], place: 'סִירָקוּזָה' },
  m1: { art: 'venice', e: '🧭', dot: M.venice, pin: [628, 290], place: 'וֶנֶצְיָה', from: W.venice, route: [[...W.gobi, '🏜️'], [...W.beijing, '🏯']] },
  l1: { art: 'tuscany', e: '🎨', dot: M.florence, pin: [522, 336], place: 'פִירֶנְצֶה' },
  g1: { art: 'ocean', e: '⛵', dot: M.seville, pin: [328, 400], place: 'סֵבִילְיָה – וּמִסָּבִיב לָעוֹלָם', from: W.seville, route: [[...W.magstrait, '🌀'], [...W.cebu, '🏝️']] },
  n1: { art: 'alps', e: '🐘', eside: 'r', dot: M.carthage, pin: [418, 290], place: 'קַרְתָּגוֹ', route: [[...M.alps, '🏔️']] },
  h1: { art: 'forest', e: '⭐', dot: W.maryland, pin: [140, 86], place: 'אֲמֶרִיקָה' },
  x1: { art: 'alexandria', e: '⚔️', dot: M.pella, pin: [884, 360], place: 'מוֹקְדוֹן', from: W.pella, route: [[...W.hydaspes, '🐘']] },
  t1: { art: 'egypt', e: '👑', dot: M.valley, pin: [812, 540], place: 'עֵמֶק הַמְּלָכִים – מִצְרַיִם' },
  k1: { art: 'snow', e: '🧊', dot: W.weddell, pin: [236, 538], place: 'אַנְטַארְקְטִיקָה', route: [[...W.sgeorgia, '🛶']] },
  o1: { art: 'space', e: '🚀', dot: W.canaveral, pin: [100, 300], place: 'הַיָּרֵחַ (הַמִּרְאָה – מִפְלוֹרִידָה)', route: [[44, 168, '🌕']] },
  s2: { dot: [962, 168], pin: [962, 168], place: '???' },
  /* העולמות החדשים */
  q1: { art: 'jungle', e: '🍫', dot: W.yucatan, pin: [118, 330], place: 'מֶרְכַּז אֲמֶרִיקָה – וְכָל הָעוֹלָם', route: [[...W.spain, '⛵'], [...W.switzerland, '🥛'], [...W.ghana, '🌱']] },
  qs: { dot: [640, 420], pin: [640, 420], place: '???' },
  v1: { art: 'planets', e: '🪐', dot: [360, 330], pin: [360, 330], place: 'מַעֲרֶכֶת הַשֶּׁמֶשׁ' },
  vs: { dot: [760, 250], pin: [760, 250], place: '???' },
  w1: { art: 'castle', e: '🪄', dot: [300, 330], pin: [300, 330], place: 'אָקָדֶמְיַת הַמִּלִּים' },
  ws: { dot: [760, 470], pin: [760, 470], place: '???' },
  z1: { art: 'underwater', e: '🐢', dot: [330, 300], pin: [330, 300], place: 'הָאוֹקְיָנוֹס' },
  zs: { dot: [760, 330], pin: [760, 330], place: '???' },
};

/* צבעים של אטלס מאויר */
const SEA1 = '#2f7fbf', SEA2 = '#1d5c98', COAST = '#4f6a36', GREEN = '#9cc46e', FOREST = '#6c9a4c', SAND = '#e8d394', ICE = '#f4f8fb', ROCK = '#b69c74';
const lbl = (x, y, t, o = {}) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Rubik, Heebo, sans-serif" font-weight="${o.w || 700}" font-size="${o.s || 15}" fill="${o.c || '#2b3a1c'}"
  ${o.it ? 'font-style="italic"' : ''} opacity="${o.op ?? .8}" stroke="${o.halo || 'rgba(255,255,255,.55)'}" stroke-width="${o.hw ?? 3}" paint-order="stroke" letter-spacing="${o.ls || 0}">${t}</text>`;
const mountain = (x, y, k = 1) => `<path d="M${x - 9 * k} ${y + 5 * k}L${x} ${y - 9 * k}L${x + 9 * k} ${y + 5 * k}Z" fill="${ROCK}" stroke="#6b5434" stroke-width="1.2" stroke-linejoin="round"/>
  <path d="M${x - 3.4 * k} ${y - 3.7 * k}L${x} ${y - 9 * k}L${x + 3.4 * k} ${y - 3.7 * k}L${x + 1.2 * k} ${y - 2.6 * k}L${x} ${y - 4 * k}L${x - 1.4 * k} ${y - 2.4 * k}Z" fill="#fff"/>`;
const range = (pts, k) => pts.map(([x, y], i) => mountain(x + i * 0, y, k)).join('');
const blob = (x, y, rx, ry, fill, op = 1, rot = 0) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" opacity="${op}" transform="rotate(${rot} ${x} ${y})"/>`;

/** צבעי הטבע על היבשה: מדבריות, יערות, קרח – רק בתוך קווי החוף */
function biomes(clipId, big = 1) {
  let s = `<g clip-path="url(#${clipId})">`;
  if (big) {
    s += `<rect x="0" y="0" width="${MAP_W}" height="${MAP_H}" fill="${GREEN}"/>`;
    s += `<rect x="0" y="0" width="${MAP_W}" height="92" fill="#b9c98e" opacity=".8"/>`;          // טונדרה בצפון
    s += blob(...W.taiga, 150, 26, FOREST, .85) + blob(...W.canadaF, 70, 24, FOREST, .8) + blob(...W.amazon, 42, 30, FOREST, .95) + blob(...W.congo, 30, 22, FOREST, .9) + blob(...W.seAsia, 34, 26, FOREST, .8);
    s += blob(...W.sahara, 92, 30, SAND) + blob(...W.arabia, 34, 26, SAND) + blob(...W.gobiD, 46, 16, SAND, .95) + blob(W.gobiD[0] - 60, W.gobiD[1] + 22, 40, 14, SAND, .85) + blob(...W.ausdes, 50, 30, SAND, .95)
      + blob(...W.kalahari, 22, 14, SAND, .8) + blob(W.arabia[0] + 50, W.arabia[1] - 26, 34, 14, SAND, .8) + blob(W.rockies[0] + 10, W.rockies[1] + 24, 30, 16, SAND, .7);
    s += `<rect x="0" y="494" width="${MAP_W}" height="${MAP_H}" fill="${ICE}"/>` + blob(380, 62, 46, 34, ICE);   // אנטארקטיקה וגרינלנד
  } else {
    s += `<rect x="${INSET.x}" y="${INSET.y}" width="${INSET.w}" height="${INSET.h}" fill="${GREEN}"/>`;
    s += blob(M.lblLibya[0], M.lblLibya[1] + 6, 120, 40, SAND) + blob(M.lblEgypt[0] - 10, M.lblEgypt[1] - 4, 50, 34, SAND) + blob(M.lblTunisia[0] - 50, M.lblTunisia[1] + 30, 70, 22, SAND, .9)
      + blob(M.israel[0] + 6, M.israel[1] + 34, 14, 26, SAND, .9) + blob(M.lblTurkey[0] + 10, M.lblTurkey[1] + 6, 50, 14, '#b9c98e', .7);
  }
  return s + '</g>';
}

/* מפות העולמות: "סיפורים" על מפת העולם האמיתית; חלל, קסם וטבע – על ציור גדול של העולם שלהם */
export const WORLD_MAP = {
  stories: { kind: 'world', title: 'מַפַּת הַסִּפּוּרִים' },
  science: { kind: 'scene', scene: 'planets', title: 'מַפַּת הֶחָלָל' },
  magic: { kind: 'scene', scene: 'castle', o: { night: true }, title: 'מַפַּת הַקְּסָמִים' },
  nature: { kind: 'scene', scene: 'underwater', title: 'מַפַּת הַטֶּבַע' },
};
const banner = (x, y, t) => `<g transform="translate(${x} ${y})"><path d="M-112 -16H112L100 0L112 16H-112L-100 0Z" fill="#f6e8c4" stroke="#6b5434" stroke-width="2"/>
    <text y="6" text-anchor="middle" font-size="19" font-weight="900" fill="#5a3a14" font-family="Frank Ruhl Libre, serif">${t}</text></g>`;
const routeLines = segments => segments.map(g => {
  const [x1, y1] = g.from, [x2, y2] = g.to, mx = (x1 + x2) / 2, my = Math.min(y1, y2) - Math.abs(x2 - x1) * 0.18 - 14, d = `M${x1} ${y1}Q${mx} ${my} ${x2} ${y2}`;
  return g.done ? `<path d="${d}" stroke="#7a5a10" stroke-width="5" fill="none" stroke-linecap="round" opacity=".6"/><path d="${d}" stroke="#ffd96a" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
    : `<path d="${d}" stroke="#fff6dc" stroke-width="2.6" fill="none" stroke-dasharray="2 8" stroke-linecap="round" opacity=".9"/>`;
}).join('');
/** מפה של עולם בציור (חלל / אקדמיה / ים): הציור ממלא את כל המפה, עם כותרת ושביל נקודות בין העונות */
export function themeMapSVG(world, segments = []) {
  const m = WORLD_MAP[world];
  const bg = scene(m.scene, m.o || {}).replace('<svg ', `<svg x="0" y="0" width="${MAP_W}" height="${MAP_H}" `);
  return `<svg viewBox="0 0 ${MAP_W} ${MAP_H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <defs><radialGradient id="tvig" cx="50%" cy="50%" r="75%"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#0b0a2a" stop-opacity=".55"/></radialGradient></defs>
    ${bg}<rect width="${MAP_W}" height="${MAP_H}" fill="url(#tvig)"/>${routeLines(segments)}${banner(500, 28, m.title)}</svg>`;
}

export function worldMapSVG(segments = [], opt = {}) {
  const withInset = opt.inset !== false;
  // segments: [{from:[x,y], to:[x,y], done:bool}]
  let s = `<svg viewBox="0 0 ${MAP_W} ${MAP_H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
  <defs>
    <linearGradient id="wsea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${SEA1}"/><stop offset="1" stop-color="${SEA2}"/></linearGradient>
    <radialGradient id="wglow" cx="50%" cy="42%" r="60%"><stop offset="0" stop-color="#7fc4ef" stop-opacity=".45"/><stop offset="1" stop-color="#7fc4ef" stop-opacity="0"/></radialGradient>
    <radialGradient id="wvig" cx="50%" cy="50%" r="75%"><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#0b1f3a" stop-opacity=".5"/></radialGradient>
    <clipPath id="wland"><path d="${LAND}"/></clipPath>
    <clipPath id="wmed"><path d="${MED_LAND}"/></clipPath>
    <clipPath id="wbox"><rect x="${INSET.x}" y="${INSET.y}" width="${INSET.w}" height="${INSET.h}" rx="14"/></clipPath>
    <filter id="wsh" x="-5%" y="-5%" width="110%" height="110%"><feDropShadow dx="0" dy="2.5" stdDeviation="2" flood-color="#0b2a4a" flood-opacity=".45"/></filter>
  </defs>
  <rect width="${MAP_W}" height="${MAP_H}" fill="url(#wsea)"/><rect width="${MAP_W}" height="${MAP_H}" fill="url(#wglow)"/>
  <path d="${GRAT}" fill="none" stroke="#fff" stroke-width=".8" opacity=".18"/>`;
  // נצנוצי גלים
  [[90, 420], [150, 470], [372, 260], [395, 330], [360, 140], [660, 330], [720, 300], [930, 300], [60, 210], [600, 470], [980, 420], [420, 40]].forEach(([x, y]) =>
    s += `<path d="M${x} ${y}q6 -5 12 0t12 0" stroke="#cfe9ff" stroke-width="1.6" fill="none" opacity=".45"/>`);
  // היבשות
  s += `<g filter="url(#wsh)"><path d="${LAND}" fill="${GREEN}"/></g>` + biomes('wland', 1)
    + `<path d="${LAND}" fill="none" stroke="${COAST}" stroke-width="1.1" stroke-linejoin="round" opacity=".85"/>`;
  // הרים
  s += range([W.alps, [W.alps[0] + 8, W.alps[1] + 3]], .9) + range([W.himalaya, [W.himalaya[0] + 14, W.himalaya[1] + 4], [W.himalaya[0] - 14, W.himalaya[1] - 3], W.tibet], 1.15)
    + range([W.andes3, W.andes1, W.andes2, [W.andes2[0] + 2, W.andes2[1] + 24]], 1) + range([W.rockies, [W.rockies[0] + 12, W.rockies[1] - 14]], 1)
    + mountain(...W.urals, .9) + mountain(...W.atlas, .8) + mountain(...W.caucasus, .8) + mountain(...W.ethiopia, .8);
  // שמות היבשות והאוקיינוסים
  s += lbl(...W.europe, 'אֵירוֹפָּה', { s: 15, ls: 1 }) + lbl(...W.asia, 'אַסְיָה', { s: 20, ls: 3 }) + lbl(W.africa[0], W.africa[1] + 8, 'אַפְרִיקָה', { s: 18, ls: 2 })
    + lbl(222, 196, 'צְפוֹן אֲמֶרִיקָה', { s: 14 }) + lbl(W.samerica[0] + 6, W.samerica[1] - 10, 'דְּרוֹם אֲמֶרִיקָה', { s: 14 })
    + lbl(W.australia[0], W.australia[1] + 22, 'אוֹסְטְרַלְיָה', { s: 14 }) + lbl(560, 562, 'אַנְטַארְקְטִיקָה', { s: 16, ls: 4, c: '#5a7894', op: .75 })
    + lbl(...W.atlantic, 'הָאוֹקְיָנוֹס הָאַטְלַנְטִי', { s: 13, c: '#e6f4ff', halo: 'rgba(10,40,80,.35)', it: 1, w: 600 })
    + lbl(W.indian[0] - 20, W.indian[1] + 6, 'הָאוֹקְיָנוֹס הַהֹדִּי', { s: 13, c: '#e6f4ff', halo: 'rgba(10,40,80,.35)', it: 1, w: 600 });
  // ספינה במפרש ומפלצת ים קטנה
  s += `<g transform="translate(396 108)"><path d="M-20 5Q0 14 20 5L16 12Q0 18 -16 12Z" fill="#7a4b2a" stroke="#3a2414" stroke-width="1.4"/><path d="M0 5V-22" stroke="#3a2414" stroke-width="2"/><path d="M2 -20L16 2H2Z" fill="#fffaf0" stroke="#8a6a3a"/><path d="M-2 -16L-14 2H-2Z" fill="#fffaf0" stroke="#8a6a3a"/></g>`;
  s += `<g transform="translate(58 450)" fill="#4f9a86" stroke="#2c5f52" stroke-width="1.4"><path d="M-26 5Q-17 -12 -8 5Z"/><path d="M-5 5Q4 -16 13 5Z"/><path d="M16 5Q27 -22 36 -8Q40 -3 34 -1Q29 -7 25 5Z"/><circle cx="32" cy="-10" r="1.5" fill="#000"/></g>`;
  // ורד רוחות
  s += `<g transform="translate(110 545)" opacity=".95"><circle r="30" fill="#f4ead2" stroke="#6b5434" stroke-width="2"/><circle r="22" fill="none" stroke="#6b5434" stroke-width="1"/>
    <path d="M0 -40L6 -6L40 0L6 6L0 40L-6 6L-40 0L-6 -6Z" fill="#c98d1e" stroke="#6b5434" stroke-width="1.3"/><path d="M0 -40L6 -6L0 0Z M40 0L6 6L0 0Z M0 40L-6 6L0 0Z M-40 0L-6 -6L0 0Z" fill="#8a5d12"/>
    <text y="-44" text-anchor="middle" font-size="14" font-weight="800" fill="#fff" stroke="#0b2a4a" stroke-width="3" paint-order="stroke">צ</text></g>`;
  // כותרת
  s += banner(560, 26, opt.title || 'מַפַּת סֵפֶר הַזְּמַן');

  // 🔍 זכוכית מגדלת על הים התיכון: מסגרת באזור האמיתי + קווים אל החלון המוגדל
  const bx = MED_BOX, I = INSET;
  if (withInset) {
  s += `<rect x="${bx.x}" y="${bx.y}" width="${bx.w}" height="${bx.h}" rx="6" fill="rgba(255,233,140,.12)" stroke="#ffd96a" stroke-width="2.4" stroke-dasharray="6 4"/>
    <path d="M${bx.x} ${bx.y + bx.h}L${I.x} ${I.y}M${bx.x + bx.w} ${bx.y + bx.h}L${I.x + I.w} ${I.y}" stroke="#ffd96a" stroke-width="1.6" stroke-dasharray="4 4" opacity=".8"/>`;
  s += `<g filter="url(#wsh)"><rect x="${I.x - 5}" y="${I.y - 5}" width="${I.w + 10}" height="${I.h + 10}" rx="18" fill="#ffd96a" stroke="#6b4a14" stroke-width="2.5"/></g>
    <g clip-path="url(#wbox)"><rect x="${I.x}" y="${I.y}" width="${I.w}" height="${I.h}" fill="url(#wsea)"/><path d="${MED_GRAT}" fill="none" stroke="#fff" stroke-width=".8" opacity=".16"/>
      <path d="${MED_LAND}" fill="${GREEN}"/>${biomes('wmed', 0)}<path d="${MED_LAND}" fill="none" stroke="${COAST}" stroke-width="1.2" stroke-linejoin="round"/>
      ${mountain(M.alps[0] + 18, M.alps[1] + 4, 1.4)}${mountain(M.alps[0] + 36, M.alps[1] - 2, 1.2)}
      ${lbl(...M.lblSpain, 'סְפָרַד', { s: 12 })}${lbl(...M.lblFrance, 'צָרְפַת', { s: 12 })}${lbl(M.lblItaly[0] + 4, M.lblItaly[1] - 4, 'אִיטַלְיָה', { s: 12 })}${lbl(M.lblGreece[0] + 12, M.lblGreece[1] - 2, 'יָוָן', { s: 12 })}
      ${lbl(...M.lblTurkey, 'טוּרְקִיָּה', { s: 12 })}${lbl(...M.lblTunisia, 'תּוּנִיס', { s: 12 })}${lbl(...M.lblEgypt, 'מִצְרַיִם', { s: 13 })}${lbl(M.lblIsrael[0] + 22, M.lblIsrael[1] + 4, 'יִשְׂרָאֵל', { s: 12, c: '#1a3c8a' })}
      ${lbl(...M.lblSea, 'הַיָּם הַתִּיכוֹן', { s: 13, c: '#e6f4ff', halo: 'rgba(10,40,80,.35)', it: 1, w: 600 })}</g>
    <g transform="translate(${I.x + 8} ${I.y + I.h - 18})"><rect x="0" y="-12" width="128" height="24" rx="12" fill="#fff6dc" stroke="#6b4a14" stroke-width="2"/>
      <text x="64" y="5" text-anchor="middle" font-size="13" font-weight="800" fill="#5a3a14" font-family="Rubik, Heebo, sans-serif">🔍 הַיָּם הַתִּיכוֹן</text></g>`;
  }

  // מסלולים
  s += routeLines(segments);
  s += `<rect width="${MAP_W}" height="${MAP_H}" fill="url(#wvig)" pointer-events="none"/>`;
  s += star4(980, 22, 8, '#ffe9a8', .8) + star4(24, 22, 7, '#ffe9a8', .7);
  return s + '</svg>';
}
