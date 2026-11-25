// בונה את "תוכן העניינים" של העונות (lib/game/seasons/manifest.js):
// רק מה שהמשחק צריך מראש – שמות, כותרות, איורים, קלפים. הסיפורים עצמם נטענים רק כשבוחרים גיבור.
// להריץ אחרי כל שינוי בקובץ עונה:  node scripts/build-season-manifest.mjs
import { writeFileSync } from 'fs';
import { pathToFileURL } from 'url';
import path from 'path';
import { SEASON_FILES } from '../lib/game/seasons/index.js';

const meta = [], cards = {};
for (const { file, exp, world } of SEASON_FILES) {
  const m = await import(pathToFileURL(path.resolve(`lib/game/seasons/${file}.js`)).href);
  const eps = m[exp]; if (!Array.isArray(eps)) throw new Error(`${file}: export ${exp} missing`);
  meta.push({ file, world: world || 'history', episodes: eps.map(e => ({ id: e.id, ...(e.chapter ? { chapter: e.chapter } : {}), title: e.title, scene: e.scene, card: e.card })) });
  Object.assign(cards, m[exp + '_CARDS'] || {});
}
const out = `/* נוצר אוטומטית ע"י scripts/build-season-manifest.mjs – לא לערוך ידנית */\n`
  + `export const SEASON_META = ${JSON.stringify(meta, null, 1)};\n\nexport const SEASON_CARDS = ${JSON.stringify(cards, null, 1)};\n`;
writeFileSync('lib/game/seasons/manifest.js', out);
console.log(`manifest: ${meta.length} seasons, ${meta.reduce((a, s) => a + s.episodes.length, 0)} episodes, ${Object.keys(cards).length} cards, ${(out.length / 1024).toFixed(1)} KB`);
