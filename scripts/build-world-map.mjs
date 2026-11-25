/* בונה את lib/game/worlddata.js – קווי החוף של העולם מנתוני Natural Earth (נחלת הכלל).
   הרצה (פעם אחת, כשמשנים את המפה):
     npm i --no-save world-atlas@2.0.2 d3-geo@3.1.1 topojson-client@3.1.0
     node scripts/build-world-map.mjs
   אחר כך מעדכנים ב-worldmap.js את מיקומי העיגולים (pin) אם צריך. */
import fs from 'fs';
import { geoNaturalEarth1, geoPath, geoGraticule } from 'd3-geo';
import { feature } from 'topojson-client';
const load = r => { const t = JSON.parse(fs.readFileSync(new URL(`../node_modules/world-atlas/land-${r}.json`, import.meta.url))); return feature(t, t.objects.land); };
const W = 1000, H = 600;
const region = { type: 'Polygon', coordinates: [[[-96, -71], [130, -71], [130, 71], [-96, 71], [-96, -71]]] };
const proj = geoNaturalEarth1().rotate([-17, 0]).fitExtent([[6, 4], [W - 6, H - 4]], region);
const simp = (d, step) => { let out = '', lx = null, ly = null;
  for (const seg of d.split(/(?=[MLZ])/)) { const c = seg[0]; if (c === 'Z') { out += 'Z'; lx = null; continue; }
    const [x, y] = seg.slice(1).split(',').map(Number); const rx = Math.round(x * 2) / 2, ry = Math.round(y * 2) / 2;
    if (c === 'L' && lx !== null && Math.hypot(rx - lx, ry - ly) < step) continue; out += (c === 'M' ? 'M' : ' ') + rx + ' ' + ry; lx = rx; ly = ry; }
  return out; };
const land = simp(geoPath(proj).digits(1)(load('110m')), 1.8);
const grat = simp(geoPath(proj).digits(1)(geoGraticule().step([30, 30])()), 12);
const P = (lon, lat) => proj([lon, lat]).map(v => +v.toFixed(1));
// זכוכית מגדלת על הים התיכון: אזור בעולם → מלבן מוגדל במפה
const INSET = { x: 400, y: 378, w: 360, h: 212 };
const box = { cx: 493.5, cy: 186.5, w: 142 }; box.h = box.w * INSET.h / INSET.w; box.x0 = box.cx - box.w / 2; box.y0 = box.cy - box.h / 2;
const Z = INSET.w / box.w;
// פרטים יותר עדינים בתוך הזכוכית: 50m, רק מה שבתוך המלבן, בקואורדינטות של הזכוכית
const projI = geoNaturalEarth1().rotate([-17, 0]).scale(proj.scale() * Z).translate([proj.translate()[0] * Z - box.x0 * Z + INSET.x, proj.translate()[1] * Z - box.y0 * Z + INSET.y])
  .clipExtent([[INSET.x - 2, INSET.y - 2], [INSET.x + INSET.w + 2, INSET.y + INSET.h + 2]]);
const medLand = simp(geoPath(projI).digits(1)(load('50m')), 1.6);
const medGrat = simp(geoPath(projI).digits(1)(geoGraticule().step([5, 5])()), 5);
const I = (lon, lat) => projI([lon, lat]).map(v => +v.toFixed(1));
const world = { // מקומות אמיתיים במפת העולם
  mongolia: P(106.9, 47.9), gobi: P(96, 41), beijing: P(116.4, 39.9), magstrait: P(-70.9, -53.5), cebu: P(123.9, 10.3), maryland: P(-76.6, 39.0),
  hydaspes: P(73.6, 32.7), weddell: P(-45, -69.5), sgeorgia: P(-36.5, -54.3), canaveral: P(-80.6, 28.4), seville: P(-5.98, 37.39), venice: P(12.33, 45.44), israel: P(34.8, 32.1), pella: P(22.5, 40.76),
  europe: P(18, 55), asia: P(92, 55), africa: P(22, 6), namerica: P(-88, 50), samerica: P(-60, -12), australia: P(134, -26), antarctica: P(-20, -77), atlantic: P(-38, 22), indian: P(78, -18),
  sahara: P(12, 22), arabia: P(46, 22), gobiD: P(104, 43), ausdes: P(130, -25), kalahari: P(22, -22),
  alps: P(10, 46.3), himalaya: P(84, 29.5), andes1: P(-70, -22), andes2: P(-72, -38), andes3: P(-76, -8), rockies: P(-106, 42), urals: P(60, 58), atlas: P(-4, 31.5), caucasus: P(44, 43), tibet: P(90, 34), ethiopia: P(39, 9),
  amazon: P(-62, -5), congo: P(22, 0), taiga: P(95, 62), canadaF: P(-80, 54), seAsia: P(102, 14),
};
const med = { seville: I(-5.98, 37.39), carthage: I(10.32, 36.85), syracuse: I(15.29, 37.07), florence: I(11.25, 43.77), venice: I(12.33, 45.44), pella: I(22.5, 40.76),
  israel: I(34.8, 32.1), valley: I(32.6, 25.74), alps: I(8, 46.2),
  lblItaly: I(13.5, 42.3), lblSpain: I(-4, 40), lblGreece: I(22, 39.2), lblEgypt: I(29, 27), lblIsrael: I(35, 30.6), lblTunisia: I(9, 33.5), lblFrance: I(2.5, 46.2), lblTurkey: I(33, 39), lblSea: I(18, 34.5), lblLibya: I(17, 28) };
const out = `/* נוצר אוטומטית ע"י scripts/build-world-map.mjs מנתוני Natural Earth (נחלת הכלל). לא לערוך ביד. */
export const LAND = '${land}';
export const GRAT = '${grat}';
export const MED_LAND = '${medLand}';
export const MED_GRAT = '${medGrat}';
export const INSET = ${JSON.stringify(INSET)};
export const MED_BOX = ${JSON.stringify({ x: +box.x0.toFixed(1), y: +box.y0.toFixed(1), w: box.w, h: +box.h.toFixed(1) })};
export const WORLD = ${JSON.stringify(world)};
export const MED = ${JSON.stringify(med)};
`;
fs.writeFileSync(new URL('../lib/game/worlddata.js', import.meta.url), out);
console.log('bytes', out.length, 'land', land.length, 'med', medLand.length, 'grat', grat.length, medGrat.length);
console.log(JSON.stringify(med));
