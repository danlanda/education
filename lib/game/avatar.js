/* הדמות של הילד – שומר הזמן: מראה (תסרוקת, צבעים) + ציוד מהחנות + חיית מחמד */
import { star4 } from './art.js';

export const LOOK_OPTIONS = {
  body: [{ id: 'boy', name: 'בֵּן' }, { id: 'girl', name: 'בַּת' }],
  hair: [{ id: 'short' }, { id: 'spiky' }, { id: 'curly' }, { id: 'long' }, { id: 'ponytail' }, { id: 'bun' }],
  skin: ['#f8d9bf', '#f1c39b', '#dba67b', '#b67a50', '#8a5a3a'],
  hairColor: ['#2a1d16', '#5a3a22', '#9a6a3a', '#e4b860', '#c0562e', '#3b5fc0'],
  shirt: ['#2a8f8a', '#c0392b', '#2f6fd1', '#7b4bc4', '#3a9a4a', '#e08a2a', '#e0578f'],
};
export const DEFAULT_LOOK = { body: 'boy', hair: 'short', skin: '#f1c39b', hairColor: '#5a3a22', shirt: '#2a8f8a', glasses: false, freckles: false };

/* ---------------- החנות ---------------- */
export const RARITY = {
  c: { name: 'רָגִיל', color: '#8a9aa8' },
  r: { name: 'נָדִיר', color: '#2f80d1' },
  e: { name: 'מְיֻחָד', color: '#8e44ad' },
  L: { name: 'אַגָּדִי', color: '#e0a21a' },
};
export const SLOTS = [
  { id: 'hat', name: 'כּוֹבָעִים', e: '🎩' },
  { id: 'outfit', name: 'בְּגָדִים', e: '🧥' },
  { id: 'hand', name: 'בַּיָּד', e: '🔦' },
  { id: 'neck', name: 'אֲבִיזָרִים', e: '📿' },
  { id: 'pet', name: 'חַיּוֹת', e: '🐾' },
];
/* lock: תנאי פתיחה – { aluf: N } גביעי אלוף, { pages: N } דפים, { streak: N } ימים ברצף */
export const ITEMS = [
  { id: 'hat_cap', slot: 'hat', name: 'כּוֹבַע מִצְחִיָּה', price: 60, r: 'c' },
  { id: 'hat_explorer', slot: 'hat', name: 'כּוֹבַע חוֹקְרִים', price: 150, r: 'c' },
  { id: 'hat_pirate', slot: 'hat', name: 'כּוֹבַע פִּירָאטִים', price: 220, r: 'r' },
  { id: 'hat_laurel', slot: 'hat', name: 'זֵר דַּפְנָה יְוָנִי', price: 250, r: 'r' },
  { id: 'hat_wizard', slot: 'hat', name: 'כּוֹבַע קוֹסֵם הַזְּמַן', price: 320, r: 'e' },
  { id: 'hat_knight', slot: 'hat', name: 'קַסְדַּת אַבִּיר', price: 380, r: 'e' },
  { id: 'hat_crown', slot: 'hat', name: 'כֶּתֶר זָהָב', price: 500, r: 'L', lock: { aluf: 5 } },
  { id: 'cape_red', slot: 'outfit', name: 'גְּלִימָה אֲדֻמָּה', price: 120, r: 'c' },
  { id: 'cape_blue', slot: 'outfit', name: 'גְּלִימָה כְּחֻלָּה', price: 120, r: 'c' },
  { id: 'toga', slot: 'outfit', name: 'טוֹגָה יְוָנִית', price: 220, r: 'r' },
  { id: 'cape_stars', slot: 'outfit', name: 'גְּלִימַת הַכּוֹכָבִים', price: 300, r: 'e' },
  { id: 'armor', slot: 'outfit', name: 'שִׁרְיוֹן אַבִּיר', price: 420, r: 'e' },
  { id: 'cape_gold', slot: 'outfit', name: 'גְּלִימַת הַזָּהָב', price: 600, r: 'L', lock: { streak: 7 } },
  { id: 'hand_scroll', slot: 'hand', name: 'מְגִלָּה', price: 60, r: 'c' },
  { id: 'hand_magnifier', slot: 'hand', name: 'זְכוּכִית מַגְדֶּלֶת', price: 80, r: 'c' },
  { id: 'hand_quill', slot: 'hand', name: 'נוֹצַת כְּתִיבָה', price: 90, r: 'c' },
  { id: 'hand_lantern', slot: 'hand', name: 'פָּנָס', price: 100, r: 'c' },
  { id: 'hand_compass', slot: 'hand', name: 'מַצְפֵּן', price: 200, r: 'r' },
  { id: 'hand_telescope', slot: 'hand', name: 'טֶלֶסְקוֹפּ', price: 260, r: 'r' },
  { id: 'hand_sword', slot: 'hand', name: 'חֶרֶב אַבִּירִים', price: 300, r: 'e' },
  { id: 'neck_bowtie', slot: 'neck', name: 'פַּרְפַּר', price: 50, r: 'c' },
  { id: 'neck_scarf', slot: 'neck', name: 'צָעִיף', price: 90, r: 'c' },
  { id: 'neck_medal', slot: 'neck', name: 'מֶדַלְיַת אַלּוּף', price: 180, r: 'r', lock: { aluf: 3 } },
  { id: 'neck_hourglass', slot: 'neck', name: 'שְׁעוֹן חוֹל קָסוּם', price: 250, r: 'e' },
  { id: 'pet_cat', slot: 'pet', name: 'חָתוּל', price: 250, r: 'r' },
  { id: 'pet_dog', slot: 'pet', name: 'כֶּלֶב', price: 250, r: 'r' },
  { id: 'pet_owl', slot: 'pet', name: 'יַנְשׁוּף חָכָם', price: 320, r: 'r' },
  { id: 'pet_parrot', slot: 'pet', name: 'תֻּכִּי פִּירָאטִים', price: 320, r: 'e' },
  { id: 'pet_camel', slot: 'pet', name: 'הַגָּמָל שֶׁל מַרְקוֹ', price: 380, r: 'e' },
  { id: 'pet_dragon', slot: 'pet', name: 'דְּרָקוֹן קָטָן', price: 700, r: 'L', lock: { pages: 10 } },
];
const THUMB = { hat: '26 -8 68 56', outfit: '6 50 108 120', hand: '66 82 54 60', neck: '40 60 40 42', pet: '-4 112 44 58' };

/* ---------------- ציור ---------------- */
function hairBack(L) {
  const c = L.hairColor;
  if (L.hair === 'long') return `<path d="M37 40Q32 68 40 84H80Q88 68 83 40Q80 23 60 22Q40 23 37 40Z" fill="${c}"/>`;
  if (L.hair === 'ponytail') return `<ellipse cx="84" cy="48" rx="7" ry="17" fill="${c}" transform="rotate(-18 84 48)"/><rect x="78" y="30" width="9" height="5" rx="2" fill="#e74c3c" transform="rotate(-18 82 32)"/>`;
  return '';
}
function hairFront(L) {
  const c = L.hairColor;
  switch (L.hair) {
    case 'spiky': return `<path d="M38 42L40 26L46 30L48 18L55 27L60 14L65 27L72 18L74 30L80 26L82 42Q76 32 60 31Q44 32 38 42Z" fill="${c}"/>`;
    case 'curly': return `<path d="M39 42Q38 26 60 24Q82 26 81 42Q74 32 60 32Q46 32 39 42Z" fill="${c}"/>` + [[41, 34, 8], [48, 25, 8.5], [58, 21, 9], [68, 23, 8.5], [76, 29, 8], [81, 38, 6], [39, 43, 5.5]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`).join('');
    case 'long': return `<path d="M38 41Q39 23 60 22Q81 23 82 41Q74 30 64 32Q58 28 52 32Q44 31 38 41Z" fill="${c}"/>`;
    case 'ponytail': return `<path d="M39 42Q38 22 60 21Q82 22 81 42Q72 30 60 30Q48 30 39 42Z" fill="${c}"/>`;
    case 'bun': return `<circle cx="60" cy="17" r="9" fill="${c}"/><rect x="53" y="22" width="14" height="4" rx="2" fill="#e74c3c"/><path d="M39 42Q38 23 60 22Q82 23 81 42Q72 31 60 31Q48 31 39 42Z" fill="${c}"/>`;
    default: return `<path d="M39 42Q38 22 60 21Q82 22 81 42Q76 31 66 31Q62 26 56 31Q46 30 39 42Z" fill="${c}"/>`;
  }
}
function capeSVG(id) {
  if (id === 'cape_red') return `<path d="M38 66Q30 120 22 160H98Q90 120 82 66Z" fill="#c0392b"/><path d="M38 66Q33 118 29 160" stroke="#922b21" stroke-width="3" fill="none"/>`;
  if (id === 'cape_blue') return `<path d="M38 66Q30 120 22 160H98Q90 120 82 66Z" fill="#2f5fb0"/><path d="M38 66Q33 118 29 160" stroke="#203f80" stroke-width="3" fill="none"/>`;
  if (id === 'cape_stars') return `<path d="M38 66Q28 120 16 162H104Q92 120 82 66Z" fill="#3b2a7a"/>` + [[30, 140], [44, 120], [88, 128], [96, 150], [24, 156], [76, 150]].map(([x, y]) => star4(x, y, 4, '#f0c35a')).join('');
  if (id === 'cape_gold') return `<defs><linearGradient id="cg1" x1="0" x2="1"><stop offset="0" stop-color="#b8860b"/><stop offset=".5" stop-color="#ffe08a"/><stop offset="1" stop-color="#b8860b"/></linearGradient></defs><path d="M38 66Q26 120 12 164H108Q94 120 82 66Z" fill="url(#cg1)"/>` + star4(26, 150, 5, '#fff') + star4(94, 140, 4, '#fff');
  return '';
}
function outfitOver(id) {
  if (id === 'toga') return `<path d="M42 70Q52 96 82 128L86 120Q66 96 74 70Z" fill="#f6f1e6"/><path d="M42 70Q52 96 82 128" stroke="#d8c9a8" stroke-width="2" fill="none"/><rect x="36" y="106" width="48" height="4" fill="#e0b040"/>`;
  if (id === 'armor') return `<path d="M42 72Q60 64 78 72L82 112Q60 120 38 112Z" fill="#b8c0cc" stroke="#6a7280" stroke-width="2"/><path d="M60 70V116M44 90H76" stroke="#8a929e" stroke-width="2"/><circle cx="60" cy="90" r="6" fill="#c0392b" stroke="#6a7280" stroke-width="1.5"/>`;
  return '';
}
function hatSVG(id) {
  switch (id) {
    case 'hat_cap': return `<path d="M40 34Q42 15 60 15Q78 15 80 34Z" fill="#d64545"/><path d="M52 32Q60 30 92 34Q86 39 58 37Z" fill="#a83232"/><circle cx="60" cy="16" r="2.5" fill="#fff"/>`;
    case 'hat_explorer': return `<ellipse cx="60" cy="30" rx="30" ry="6" fill="#8a6a3a"/><path d="M42 30Q44 12 60 12Q76 12 78 30Z" fill="#a8844a"/><rect x="43" y="24" width="34" height="4" fill="#5b3a24"/>`;
    case 'hat_pirate': return `<path d="M26 32Q60 2 94 32Q60 22 26 32Z" fill="#1b1b22"/><path d="M30 30Q60 18 90 30" stroke="#e0b040" stroke-width="2" fill="none"/><circle cx="60" cy="20" r="4.5" fill="#fff"/><path d="M56 26L64 30M64 26L56 30" stroke="#fff" stroke-width="1.5"/>`;
    case 'hat_laurel': return [...Array(9)].map((_, i) => { const a = Math.PI * (1.05 + i * 0.11), x = 60 + Math.cos(a) * 22, y = 40 + Math.sin(a) * 20; return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="5" ry="2.6" fill="#5a9a3a" transform="rotate(${(a * 180 / Math.PI + 90).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`; }).join('');
    case 'hat_wizard': return `<path d="M42 30L60 -4L78 30Z" fill="#4a2f9a"/><ellipse cx="60" cy="30" rx="24" ry="5" fill="#3a2280"/>` + star4(56, 16, 4, '#f0c35a') + star4(66, 8, 3, '#f0c35a') + `<circle cx="60" cy="-4" r="3" fill="#f0c35a"/>`;
    case 'hat_knight': return `<path d="M38 44Q38 14 60 14Q82 14 82 44L76 44Q75 26 60 26Q45 26 44 44Z" fill="#b8c0cc" stroke="#6a7280" stroke-width="1.5"/><path d="M58 14Q56 0 68 -2Q64 6 66 14Z" fill="#c0392b"/>`;
    case 'hat_crown': return `<path d="M42 30L44 14L52 22L60 10L68 22L76 14L78 30Z" fill="#f0c35a" stroke="#b07d17" stroke-width="1.5"/><circle cx="60" cy="22" r="2.5" fill="#e74c3c"/><circle cx="49" cy="25" r="1.8" fill="#3b8fd1"/><circle cx="71" cy="25" r="1.8" fill="#3b8fd1"/>`;
    default: return '';
  }
}
function handSVG(id) {
  switch (id) {
    case 'hand_lantern': return `<circle cx="94" cy="122" r="18" fill="#ffd36b" opacity=".35"/><path d="M90 108v4" stroke="#3a2614" stroke-width="2"/><rect x="86" y="112" width="16" height="20" rx="3" fill="#3a2614"/><rect x="89" y="115" width="10" height="14" rx="2" fill="#ffd36b"/>`;
    case 'hand_magnifier': return `<path d="M92 116L100 132" stroke="#7a4b2a" stroke-width="4" stroke-linecap="round"/><circle cx="88" cy="106" r="10" fill="#bfe6ff" fill-opacity=".6" stroke="#b07d17" stroke-width="3"/>`;
    case 'hand_compass': return `<circle cx="92" cy="118" r="11" fill="#f0c35a" stroke="#b07d17" stroke-width="2"/><circle cx="92" cy="118" r="7" fill="#fffaf0"/><path d="M92 112L94 118L92 124L90 118Z" fill="#c0392b"/>`;
    case 'hand_scroll': return `<rect x="84" y="100" width="12" height="26" rx="3" fill="#f6ecd0" stroke="#b8a070" stroke-width="1.5"/><rect x="82" y="98" width="16" height="5" rx="2.5" fill="#c9a46b"/><rect x="82" y="123" width="16" height="5" rx="2.5" fill="#c9a46b"/>`;
    case 'hand_quill': return `<path d="M90 114Q98 90 112 80Q106 98 94 116Z" fill="#fff" stroke="#c9c9c9" stroke-width="1"/><path d="M90 114L98 92" stroke="#aaa" stroke-width="1"/><path d="M89 116L87 122" stroke="#3a2614" stroke-width="2"/>`;
    case 'hand_telescope': return `<path d="M84 122L112 92" stroke="#7a4b2a" stroke-width="7" stroke-linecap="round"/><path d="M104 100L114 90" stroke="#f0c35a" stroke-width="9" stroke-linecap="round"/><circle cx="114" cy="89" r="3" fill="#bfe6ff"/>`;
    case 'hand_sword': return `<path d="M91 110L108 74" stroke="#d0d6de" stroke-width="5" stroke-linecap="round"/><path d="M84 108L98 114" stroke="#b07d17" stroke-width="4" stroke-linecap="round"/><circle cx="89" cy="117" r="3" fill="#b07d17"/>`;
    default: return '';
  }
}
function neckSVG(id) {
  switch (id) {
    case 'neck_hourglass': return `<path d="M51 70Q60 88 69 70" stroke="#f0c35a" stroke-width="1.6" fill="none"/><path d="M55 86h10l-5 6 5 6H55l5-6z" fill="#f0c35a" stroke="#b07d17" stroke-width="1"/>`;
    case 'neck_bowtie': return `<path d="M52 66L60 70L52 74Z M68 66L60 70L68 74Z" fill="#c0392b"/><circle cx="60" cy="70" r="2" fill="#922b21"/>`;
    case 'neck_scarf': return `<path d="M44 66Q60 76 76 66L76 72Q60 82 44 72Z" fill="#e67e22"/><path d="M68 72L74 96L66 96L64 74Z" fill="#d35400"/>`;
    case 'neck_medal': return `<path d="M52 66L58 82M68 66L62 82" stroke="#2f6fd1" stroke-width="3"/><circle cx="60" cy="87" r="7" fill="#f0c35a" stroke="#b07d17" stroke-width="1.5"/>` + star4(60, 87, 4, '#fff8dc');
    default: return '';
  }
}
function petSVG(id) {
  switch (id) {
    case 'pet_owl': return `<ellipse cx="17" cy="150" rx="13" ry="16" fill="#8a5a3a"/><ellipse cx="17" cy="155" rx="8" ry="10" fill="#d9b48a"/><path d="M6 136L9 128L13 135Z M28 136L25 128L21 135Z" fill="#8a5a3a"/>
      <circle cx="12" cy="142" r="5" fill="#fff"/><circle cx="22" cy="142" r="5" fill="#fff"/><circle cx="12" cy="142" r="2.4" fill="#2a1d16"/><circle cx="22" cy="142" r="2.4" fill="#2a1d16"/><path d="M15 147L17 151L19 147Z" fill="#f0a020"/><path d="M12 166v3M22 166v3" stroke="#f0a020" stroke-width="2"/>`;
    case 'pet_cat': return `<path d="M28 160Q38 150 32 140" stroke="#e8933a" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse cx="17" cy="155" rx="11" ry="12" fill="#e8933a"/><circle cx="17" cy="138" r="9" fill="#e8933a"/>
      <path d="M9 133L10 124L15 131Z M25 133L24 124L19 131Z" fill="#e8933a"/><circle cx="13.5" cy="137" r="1.6" fill="#2a1d16"/><circle cx="20.5" cy="137" r="1.6" fill="#2a1d16"/><path d="M15.5 141L17 142.5L18.5 141" stroke="#7a3b2a" stroke-width="1" fill="none"/><path d="M8 140H3M8 142H4M26 140H31M26 142H30" stroke="#7a3b2a" stroke-width=".8"/><path d="M12 150Q17 154 22 150" stroke="#c97a2a" stroke-width="2" fill="none"/>`;
    case 'pet_dog': return `<ellipse cx="18" cy="156" rx="12" ry="11" fill="#b07a4a"/><circle cx="18" cy="139" r="9.5" fill="#c08a5a"/><ellipse cx="9" cy="141" rx="3.5" ry="7" fill="#7a4b2a"/><ellipse cx="27" cy="141" rx="3.5" ry="7" fill="#7a4b2a"/>
      <circle cx="14.5" cy="137" r="1.7" fill="#2a1d16"/><circle cx="21.5" cy="137" r="1.7" fill="#2a1d16"/><ellipse cx="18" cy="142" rx="2.4" ry="1.8" fill="#2a1d16"/><path d="M16.5 145Q18 151 19.5 145Z" fill="#f08a9a"/><circle cx="24" cy="155" r="3" fill="#7a4b2a"/>`;
    case 'pet_parrot': return `<ellipse cx="17" cy="152" rx="9" ry="14" fill="#2ea043"/><circle cx="17" cy="136" r="8" fill="#d64545"/><path d="M23 135Q30 137 25 143Q24 139 22 139Z" fill="#f0c35a"/><circle cx="19" cy="133" r="1.8" fill="#2a1d16"/>
      <path d="M10 146Q4 156 10 166L14 154Z" fill="#2f6fd1"/><path d="M15 165L13 172M19 165L21 172" stroke="#f0a020" stroke-width="2"/>`;
    case 'pet_camel': return `<g fill="#c9a46b"><ellipse cx="18" cy="148" rx="13" ry="7"/><ellipse cx="20" cy="141" rx="6" ry="6"/><path d="M8 146Q3 140 3 132L7 131Q7 139 12 143Z"/><ellipse cx="3" cy="130" rx="4" ry="2.6"/>
      <rect x="9" y="152" width="2.2" height="14" rx="1"/><rect x="14" y="152" width="2.2" height="14" rx="1"/><rect x="22" y="152" width="2.2" height="14" rx="1"/><rect x="26" y="152" width="2.2" height="14" rx="1"/></g><rect x="16" y="133" width="8" height="5" rx="2" fill="#b03a2e"/>`;
    case 'pet_dragon': return `<path d="M28 160Q40 162 38 150" stroke="#3a9a4a" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M8 148L-2 134L10 140Z M26 148L36 132L24 140Z" fill="#8e44ad"/>
      <ellipse cx="17" cy="155" rx="11" ry="12" fill="#3a9a4a"/><ellipse cx="17" cy="158" rx="6" ry="8" fill="#f0d070"/><circle cx="17" cy="138" r="9" fill="#3a9a4a"/><path d="M11 131L9 124L14 129Z M23 131L25 124L20 129Z" fill="#f0d070"/>
      <circle cx="13.5" cy="137" r="2" fill="#fff"/><circle cx="20.5" cy="137" r="2" fill="#fff"/><circle cx="13.8" cy="137.3" r="1" fill="#2a1d16"/><circle cx="20.8" cy="137.3" r="1" fill="#2a1d16"/><circle cx="15" cy="142" r=".8" fill="#1d5a2a"/><circle cx="19" cy="142" r=".8" fill="#1d5a2a"/>`;
    default: return '';
  }
}

export function keeperSVG(eq = {}, opts = {}) {
  const L = { ...DEFAULT_LOOK, ...(opts.look || {}) };
  const vb = opts.viewBox || (opts.head ? '30 8 60 60' : '-6 -8 128 180');
  const outfit = eq.outfit || eq.cape;
  let s = `<svg viewBox="${vb}" aria-hidden="true">`;
  s += capeSVG(outfit) + hairBack(L);
  // רגליים ונעליים
  s += `<rect x="46" y="128" width="11" height="30" rx="4" fill="#2d3a5c"/><rect x="63" y="128" width="11" height="30" rx="4" fill="#2d3a5c"/>
    <ellipse cx="51" cy="160" rx="9" ry="5" fill="#5b3a24"/><ellipse cx="69" cy="160" rx="9" ry="5" fill="#5b3a24"/>`;
  // גוף: חולצה (או שמלה)
  s += L.body === 'girl'
    ? `<path d="M41 70Q60 62 79 70L90 138Q60 148 30 138Z" fill="${L.shirt}"/><rect x="38" y="104" width="44" height="6" fill="#00000022"/>`
    : `<path d="M40 70Q60 62 80 70L86 132Q60 140 34 132Z" fill="${L.shirt}"/><rect x="36" y="106" width="48" height="7" fill="#7a4b2a"/><rect x="56" y="105" width="8" height="9" rx="1" fill="#f0c35a"/>`;
  s += outfitOver(outfit);
  s += `<path d="M40 74Q28 92 30 110" stroke="${L.shirt}" stroke-width="11" fill="none" stroke-linecap="round"/><path d="M80 74Q92 92 90 110" stroke="${L.shirt}" stroke-width="11" fill="none" stroke-linecap="round"/>
    <circle cx="30" cy="112" r="6" fill="${L.skin}"/><circle cx="90" cy="112" r="6" fill="${L.skin}"/>`;
  s += neckSVG(eq.neck);
  // ראש
  s += `<rect x="54" y="58" width="12" height="10" fill="${L.skin}"/><rect x="54" y="58" width="12" height="10" fill="#00000014"/>
    <circle cx="39" cy="46" r="4" fill="${L.skin}"/><circle cx="81" cy="46" r="4" fill="${L.skin}"/><circle cx="60" cy="44" r="21" fill="${L.skin}"/>
    <circle cx="52" cy="46" r="2.6" fill="#2a1d16"/><circle cx="68" cy="46" r="2.6" fill="#2a1d16"/><circle cx="52.8" cy="45.2" r=".8" fill="#fff"/><circle cx="68.8" cy="45.2" r=".8" fill="#fff"/>
    <path d="M53 54Q60 60 67 54" stroke="#7a3b2a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <circle cx="47" cy="52" r="3" fill="#f5a3a3" opacity=".5"/><circle cx="73" cy="52" r="3" fill="#f5a3a3" opacity=".5"/>`;
  if (L.body === 'girl') s += `<path d="M48.5 42.5L46.5 41M71.5 42.5L73.5 41" stroke="#2a1d16" stroke-width="1.2" stroke-linecap="round"/>`;
  if (L.freckles) s += [[46, 49], [49, 51], [44, 52], [74, 49], [71, 51], [76, 52]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".9" fill="#a0603a"/>`).join('');
  s += hairFront(L);
  if (L.glasses) s += `<circle cx="52" cy="46" r="6.5" fill="#fff" fill-opacity=".15" stroke="#2a1d16" stroke-width="2"/><circle cx="68" cy="46" r="6.5" fill="#fff" fill-opacity=".15" stroke="#2a1d16" stroke-width="2"/><path d="M58.5 46H61.5" stroke="#2a1d16" stroke-width="2"/>`;
  s += hatSVG(eq.hat) + handSVG(eq.hand) + petSVG(eq.pet);
  return s + '</svg>';
}

/** תמונה מוקטנת של פריט, על הדמות של הילד (חתוכה לאזור של הפריט) */
export function itemThumb(item, look) {
  // חיה – בלי הדמות מאחוריה, ממורכזת
  if (item.slot === 'pet') return `<svg viewBox="-8 118 52 52" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${petSVG(item.id)}</svg>`;
  return keeperSVG({ [item.slot]: item.id }, { look, viewBox: THUMB[item.slot] });
}
