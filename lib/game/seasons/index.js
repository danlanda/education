/* כל העונות של "דְּמֻיּוֹת בַּהִיסְטוֹרְיָה", לפי הסדר של הסיפור הגדול (המוחק → זכריה הסופר).
   כדי להוסיף עונה: כותבים קובץ לפי docs/SEASON_BRIEF.md, מוסיפים אותו כאן, ומוסיפים מיקום במפה (worldmap.js). */
import { ARCHIMEDES, ARCHIMEDES_CARDS } from './archimedes.js';
import { MARCO, MARCO_CARDS } from './marco.js';
import { LEONARDO, LEONARDO_CARDS } from './leonardo.js';
import { MAGELLAN, MAGELLAN_CARDS } from './magellan.js';
import { HANNIBAL, HANNIBAL_CARDS } from './hannibal.js';
import { HARRIET, HARRIET_CARDS } from './harriet.js';
import { ALEXANDER, ALEXANDER_CARDS } from './alexander.js';
import { TUTANKHAMUN, TUTANKHAMUN_CARDS } from './tutankhamun.js';
import { SHACKLETON, SHACKLETON_CARDS } from './shackleton.js';
import { APOLLO, APOLLO_CARDS } from './apollo.js';

export const SEASONS = [ARCHIMEDES, MARCO, LEONARDO, MAGELLAN, HANNIBAL, HARRIET, ALEXANDER, TUTANKHAMUN, SHACKLETON, APOLLO];

/* כל הקלפים החדשים של העונות */
export const SEASON_CARDS = {
  ...ARCHIMEDES_CARDS, ...MARCO_CARDS, ...LEONARDO_CARDS, ...MAGELLAN_CARDS, ...HANNIBAL_CARDS,
  ...HARRIET_CARDS, ...ALEXANDER_CARDS, ...TUTANKHAMUN_CARDS, ...SHACKLETON_CARDS, ...APOLLO_CARDS,
};
