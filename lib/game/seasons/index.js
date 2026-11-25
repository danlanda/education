/* העונות של "דְּמֻיּוֹת בַּהִיסְטוֹרְיָה", לפי הסדר של הסיפור הגדול (המוחק → זכריה הסופר).
   כל עונה נטענת רק כשצריך (import דינמי = קובץ נפרד בדפדפן).
   כדי להוסיף עונה: כותבים קובץ לפי docs/SEASON_BRIEF.md, מוסיפים שורה כאן, מוסיפים מיקום במפה (worldmap.js),
   ומריצים: node scripts/build-season-manifest.mjs */
export const SEASON_FILES = [
  { file: 'archimedes', exp: 'ARCHIMEDES', load: () => import('./archimedes.js') },
  { file: 'marco', exp: 'MARCO', load: () => import('./marco.js') },
  { file: 'leonardo', exp: 'LEONARDO', load: () => import('./leonardo.js') },
  { file: 'magellan', exp: 'MAGELLAN', load: () => import('./magellan.js') },
  { file: 'hannibal', exp: 'HANNIBAL', load: () => import('./hannibal.js') },
  { file: 'harriet', exp: 'HARRIET', load: () => import('./harriet.js') },
  { file: 'alexander', exp: 'ALEXANDER', load: () => import('./alexander.js') },
  { file: 'tutankhamun', exp: 'TUTANKHAMUN', load: () => import('./tutankhamun.js') },
  { file: 'shackleton', exp: 'SHACKLETON', load: () => import('./shackleton.js') },
  { file: 'apollo', exp: 'APOLLO', load: () => import('./apollo.js') },
];
