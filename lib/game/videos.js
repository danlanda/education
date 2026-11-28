/* 🎬 סרטונים בתוך הסיפור: פעם-פעמיים בכל גיבור, סרטון קצר על הנושא – בתוך חלון במשחק.
   בטיחות:
   1. רשימה סגורה בלבד – אין חיפוש ואין "סרטונים מומלצים". כל סרטון נבחר מערוץ חינוכי מוכר.
   2. ההורה מאשר כל סרטון (תצוגה מקדימה באזור ההורים). ילד רואה רק סרטון שאושר.
   3. הנגן נעול: youtube-nocookie, בלי כפתורי יוטיוב, שכבה שקופה מעליו (אי אפשר ללחוץ ולצאת ליוטיוב),
      והחלון נסגר ברגע שהסרטון נגמר – בלי מסך "סרטונים נוספים".
   בהמשך: סרטוני אנימציה שלנו (src = קובץ שלנו, own: true) – לא צריכים אישור. */

/** topic → { title: שם הנושא לילד, seasons: קבצי העונות שבהם הוא מופיע } */
export const TOPICS = {
  genghis: { title: 'גִּ׳ינְגִּיס חַאן וְהַמּוֹנְגּוֹלִים', seasons: ['genghis'] },
  archimedes: { title: 'אַרְכִימֶדֶס', seasons: ['archimedes'] },
  marco: { title: 'מַרְקוֹ פּוֹלוֹ', seasons: ['marco'] },
  leonardo: { title: 'לֵאוֹנַרְדוֹ דָּה וִינְצִ׳י', seasons: ['leonardo'] },
  magellan: { title: 'הַמַּסָּע שֶׁל מָגֶלָן', seasons: ['magellan'] },
  hannibal: { title: 'חַנִּיבַּעַל וְהַפִּילִים', seasons: ['hannibal'] },
  harriet: { title: 'הֶרִיֶּט טַבְּמָן', seasons: ['harriet'] },
  alexander: { title: 'אֲלֶכְּסַנְדֶּר מוּקְדוֹן', seasons: ['alexander'] },
  tutankhamun: { title: 'תּוּתְעַנְחָאמוֹן', seasons: ['tutankhamun'] },
  shackleton: { title: 'שֶׁקֶלְטוֹן', seasons: ['shackleton'] },
  apollo: { title: 'הַנְּחִיתָה עַל הַיָּרֵחַ', seasons: ['apollo'] },
  chocolate: { title: 'הַשּׁוֹקוֹלָד', seasons: ['chocolate'] },
  solar: { title: 'מַעֲרֶכֶת הַשֶּׁמֶשׁ', seasons: ['solar'] },
  ocean: { title: 'בַּעֲלֵי הַחַיִּים בָּאוֹקְיָנוֹס', seasons: ['ocean'] },
  letters: { title: 'הָאוֹתִיּוֹת', seasons: [], kids: true },
  numbers: { title: 'הַמִּסְפָּרִים', seasons: [], kids: true },
};

/** הרשימה הסגורה. { id (יוטיוב) | src (קובץ שלנו), topic, title, channel, lang, minutes, note, own } */
export const VIDEOS = [];

export const topicOfSeason = file => Object.keys(TOPICS).find(t => TOPICS[t].seasons.includes(file)) || null;
export const videoKey = v => v.src || v.id;
/** האם מותר להראות לילד: סרטון שלנו – תמיד; מיוטיוב – רק אם ההורה אישר */
export const allowed = (v, settings = {}) => settings.videos !== false && (v.own || (settings.videosOk || []).includes(videoKey(v)));
/** סרטונים מאושרים לנושא */
export const videosFor = (topic, settings) => VIDEOS.filter(v => v.topic === topic && allowed(v, settings));
export const ytEmbed = (id, origin = '') => `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&fs=0&disablekb=1&controls=0&enablejsapi=1&cc_load_policy=0${origin ? '&origin=' + encodeURIComponent(origin) : ''}`;
export const ytThumb = id => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
