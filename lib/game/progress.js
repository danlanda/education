/* מה שגורם לחזור כל יום: ינשוף הזמן שגדל מקריאה, ליגות, מתנה יומית, תגים ודפי זהב.
   הכול נפתח בהדרגה (FEATURES): ביום הראשון רק סיפור, מפה, כרטיסים וחנות – וכל יום-יומיים מתגלה הפתעה אחת חדשה. */

/* ---------------- הפתעות שנפתחות בהדרגה ----------------
   need – מתי נפתח: eps = פרקים חדשים שהצלת (בלי הפתיחה), days = ימים ששיחקת, streak = רצף, arena = זירות, heroes = גיבורים שלמים.
   עם 2 דפים ביום: יום 1 → ינשוף + חדר אימונים, יום 2 → מתנה יומית + זירה, יום 3 → תגים + גלגל המזל + מגן רצף, אחר כך דפי זהב, ליגות ובונוסים.
   silent – נפתח בלי חלון: ההפתעה עצמה היא ההסבר (דף הזהב הראשון). */
export const FEATURES = [
  { id: 'owl', e: '🦉', need: { eps: 1 } },
  { id: 'practice', e: '🏋️', need: { eps: 2 } },
  { id: 'gift', e: '🎁', need: { days: 2 } },
  { id: 'arena', e: '🏆', need: { eps: 3 } },
  { id: 'badges', e: '🏅', need: { eps: 4 } },
  { id: 'wheel', e: '🎡', need: { eps: 5 } },
  { id: 'shield', e: '🛡️', need: { streak: 3 } },
  { id: 'joint', e: '🤝', need: { days: 3 } },
  { id: 'golden', e: '✨', need: { eps: 6 }, silent: true },
  { id: 'league', e: '🥉', need: { arena: 3 } },
  { id: 'bonus', e: '⭐', need: { heroes: 1 } },
];
export const featureReady = (f, x) => Object.entries(f.need).every(([k, v]) => (x[k] || 0) >= v);

/* ---------------- ינשוף הזמן ---------------- */
export const OWL_STAGES = [
  { min: 0, name: 'אֶפְרוֹחַ', next: 2000 },                      // פרק ממוצע ≈ 300 מילים → שלב בערך כל גיבור
  { min: 2000, name: 'יַנְשׁוּף צָעִיר', next: 6000 },
  { min: 6000, name: 'יַנְשׁוּף חָכָם', next: 15000 },
  { min: 15000, name: 'יַנְשׁוּף שׁוֹמֵר הַזְּמַן', next: null },
];
export const owlStage = words => { let k = 0; OWL_STAGES.forEach((s, i) => { if (words >= s.min) k = i; }); return k; };

const O = '#2b1838';
/** ציור הינשוף לפי שלב (-1 = ביצה) */
export function owlSVG(stage, opts = {}) {
  const vb = opts.viewBox || '0 0 100 110';
  if (stage < 0) return `<svg viewBox="${vb}" aria-hidden="true"><ellipse cx="50" cy="100" rx="28" ry="6" fill="#000" opacity=".2"/>
    <path d="M50 14C30 14 18 44 18 66c0 20 14 34 32 34s32-14 32-34C82 44 70 14 50 14z" fill="#fff6dc" stroke="${O}" stroke-width="4"/>
    <circle cx="38" cy="50" r="6" fill="#a06bff" opacity=".55"/><circle cx="60" cy="72" r="8" fill="#ffc928" opacity=".55"/><circle cx="62" cy="40" r="4" fill="#4a9bff" opacity=".55"/>
    ${opts.crack ? `<path d="M26 58l10-6 6 8 8-9 7 7 9-8 8 6" fill="none" stroke="${O}" stroke-width="3.5" stroke-linejoin="round"/>` : ''}</svg>`;
  const body = ['#c9a36b', '#9a6a3a', '#7a4b2a', '#5b3fd1'][stage], belly = ['#fff0d0', '#f3dcb2', '#ecd09a', '#d9ccff'][stage];
  const s = [0.78, 0.9, 1, 1][stage];
  let g = `<g transform="translate(50 64) scale(${s}) translate(-50 -64)">`;
  if (stage >= 3) g += `<path d="M22 54Q8 90 26 102L50 96L74 102Q92 90 78 54Z" fill="#ffc928" stroke="${O}" stroke-width="3.5"/>`;   // גלימה
  g += `<path d="M24 34L30 18L40 30Z" fill="${body}" stroke="${O}" stroke-width="3.5" stroke-linejoin="round"/><path d="M76 34L70 18L60 30Z" fill="${body}" stroke="${O}" stroke-width="3.5" stroke-linejoin="round"/>`;
  g += `<ellipse cx="50" cy="62" rx="30" ry="36" fill="${body}" stroke="${O}" stroke-width="4"/>`;
  g += `<ellipse cx="50" cy="72" rx="18" ry="22" fill="${belly}"/>`;
  g += [0, 1, 2].map(i => `<path d="M${40 + i * 10} ${68 + (i % 2) * 6}q4 4 8 0" stroke="${body}" stroke-width="2.5" fill="none"/>`).join('');
  g += `<circle cx="38" cy="48" r="12" fill="#fff" stroke="${O}" stroke-width="3"/><circle cx="62" cy="48" r="12" fill="#fff" stroke="${O}" stroke-width="3"/>
    <circle cx="39" cy="49" r="5.5" fill="${O}"/><circle cx="61" cy="49" r="5.5" fill="${O}"/><circle cx="41" cy="47" r="1.8" fill="#fff"/><circle cx="63" cy="47" r="1.8" fill="#fff"/>
    <path d="M45 58L50 66L55 58Z" fill="#ff9a2e" stroke="${O}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M22 66Q14 78 24 88M78 66Q86 78 76 88" stroke="${O}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M40 96v6M46 96v6M54 96v6M60 96v6" stroke="#ff9a2e" stroke-width="3.5" stroke-linecap="round"/>`;
  if (stage === 0) g += `<path d="M44 16q6 -8 12 0" stroke="${O}" stroke-width="3" fill="none"/>`;                                   // נוצה קטנה על הראש
  if (stage >= 2) g += `<circle cx="38" cy="48" r="14" fill="none" stroke="${O}" stroke-width="2.5"/><circle cx="62" cy="48" r="14" fill="none" stroke="${O}" stroke-width="2.5"/><path d="M52 48h-4" stroke="${O}" stroke-width="2.5"/>`;   // משקפיים
  if (stage === 2) g += `<rect x="62" y="74" width="20" height="16" rx="2" fill="#4a9bff" stroke="${O}" stroke-width="2.5" transform="rotate(-12 72 82)"/>`;   // ספר
  if (stage >= 3) g += `<path d="M34 24L40 12L50 20L60 12L66 24Z" fill="#ffc928" stroke="${O}" stroke-width="3" stroke-linejoin="round"/><circle cx="50" cy="19" r="2.5" fill="#ff4d6d"/>
    <path d="M68 80h10l-2 6h-6z M70 74h6v6h-6z" fill="#fff6dc" stroke="${O}" stroke-width="2"/>`;   // כתר ושעון חול
  g += '</g>';
  return `<svg viewBox="${vb}" aria-hidden="true"><ellipse cx="50" cy="104" rx="24" ry="5" fill="#000" opacity=".2"/>${g}</svg>`;
}
export const countWords = s => String(s || '').replace(/[֑-ׇ]/g, '').split(/\s+/).filter(w => /[א-תa-zA-Z0-9]/.test(w)).length;

/* ---------------- ליגות ---------------- */
export const LEAGUES = [
  { name: 'אָרָד', e: '🥉', c: '#c97a3a' },
  { name: 'כֶּסֶף', e: '🥈', c: '#8a9aa8' },
  { name: 'זָהָב', e: '🥇', c: '#e0a21a' },
  { name: 'יַהֲלוֹם', e: '💎', c: '#4a9bff' },
];

/* ---------------- מתנה יומית ---------------- */
export const DAILY_GIFTS = [10, 15, 20, 25, 30, 40, 100];
export const SHIELD_PRICE = 60, SHIELD_MAX = 2;
export const SPIN_MAX = 3;   // כמה סיבובים בגלגל המזל אפשר לשמור

/* ---------------- דף זהב ---------------- */
export const GOLDEN_CHANCE = 1 / 6, GOLDEN_BONUS = 50;

/* ---------------- תגים ---------------- */
/* test מקבל את הסטטיסטיקה של הילד: { pages, heroes, heroesAll, perfect, wins, streak, letters, mathLevel, golden, joint, owl, league } */
export const BADGES = [
  { id: 'first', e: '📖', name: 'הַדַּף הָרִאשׁוֹן', desc: 'הִצַּלְתָּ פֶּרֶק רִאשׁוֹן', test: x => x.pages >= 1 },
  { id: 'p10', e: '📚', name: 'קוֹרֵא מַתְחִיל', desc: '10 פְּרָקִים', test: x => x.pages >= 10 },
  { id: 'p25', e: '🏅', name: 'קוֹרֵא אַמִּיץ', desc: '25 פְּרָקִים', test: x => x.pages >= 25 },
  { id: 'p50', e: '🎖️', name: 'קוֹרֵא עַל', desc: '50 פְּרָקִים', test: x => x.pages >= 50 },
  { id: 'hero1', e: '🦸', name: 'מַצִּיל גִּבּוֹרִים', desc: 'הִצַּלְתָּ גִּבּוֹר שָׁלֵם', test: x => x.heroes >= 1 },
  { id: 'hero3', e: '🌍', name: 'נוֹסֵעַ בַּזְּמַן', desc: '3 גִּבּוֹרִים שְׁלֵמִים', test: x => x.heroes >= 3 },
  { id: 'hero10', e: '👑', name: 'אֲדוֹן הַזְּמַן', desc: 'הִצַּלְתָּ אֶת כָּל הַגִּבּוֹרִים', test: x => x.heroesAll > 0 && x.heroes >= x.heroesAll },
  { id: 'perfect', e: '⭐', name: 'בְּלִי טָעוּת', desc: 'פֶּרֶק עִם 3 כּוֹכָבִים', test: x => x.perfect >= 1 },
  { id: 'perfect10', e: '🌟', name: 'מְדֻיָּק', desc: '10 פְּרָקִים עִם 3 כּוֹכָבִים', test: x => x.perfect >= 10 },
  { id: 'win', e: '🏆', name: 'אַלּוּף הַזִּירָה', desc: 'נִצַּחְתָּ בַּזִּירָה', test: x => x.wins >= 1 },
  { id: 'win10', e: '🥇', name: 'אַגָּדַת הַזִּירָה', desc: '10 נִצְחוֹנוֹת בַּזִּירָה', test: x => x.wins >= 10 },
  { id: 'streak3', e: '🔥', name: 'עַל הָאֵשׁ', desc: '3 יָמִים בָּרֶצֶף', test: x => x.streak >= 3 },
  { id: 'streak7', e: '📅', name: 'שָׁבוּעַ שָׁלֵם', desc: '7 יָמִים בָּרֶצֶף', test: x => x.streak >= 7 },
  { id: 'streak30', e: '☄️', name: 'חֹדֶשׁ שָׁלֵם', desc: '30 יָמִים בָּרֶצֶף', test: x => x.streak >= 30 },
  { id: 'writer', e: '✍️', name: 'סוֹפֵר', desc: '10 מִכְתָּבִים', test: x => x.letters >= 10 },
  { id: 'math', e: '🧮', name: 'גְּאוֹן חֶשְׁבּוֹן', desc: 'רָמָה 5 בְּחֶשְׁבּוֹן', test: x => x.mathLevel >= 5 },
  { id: 'family', e: '🤝', name: 'צֶוֶת מִשְׁפַּחְתִּי', desc: 'מְשִׂימָה מְשֻׁתֶּפֶת רִאשׁוֹנָה', test: x => x.joint >= 1 },
  { id: 'family5', e: '🏡', name: 'אַלּוּפֵי הַבַּיִת', desc: '5 מְשִׂימוֹת מְשֻׁתָּפוֹת', test: x => x.joint >= 5 },
  { id: 'golden', e: '✨', name: 'צַיַּד זָהָב', desc: 'מָצָאתָ דַּף זָהָב', test: x => x.golden >= 1 },
  { id: 'owl', e: '🦉', name: 'מְגַדֵּל יַנְשׁוּפִים', desc: 'הַיַּנְשׁוּף גָּדַל עַד הַסּוֹף', test: x => x.owl >= 3 },
  { id: 'diamond', e: '💎', name: 'לִיגַת יַהֲלוֹם', desc: 'הִגַּעְתָּ לְלִיגַת יַהֲלוֹם', test: x => x.league >= 3 },
];
