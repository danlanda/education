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
export const VIDEOS = [
  { topic: 'genghis', id: 'QXrGSrYw_CU', title: 'Story of Genghis Khan | Dr. Binocs Show', channel: 'Peekaboo Kidz', lang: 'en', minutes: 6, note: 'מצויר לילדים. מספר גם על הכיבושים – כדאי להציץ.' },
  { topic: 'genghis', id: 'KFz8BCPhhcY', title: 'Genghis Khan: Warrior King of Legend', channel: 'Bedtime History', lang: 'en', minutes: 5, note: 'ערוץ היסטוריה לילדים, רגוע ועדין.' },
  { topic: 'archimedes', id: '8S5g_Gv3T20', title: 'מדידת נפח אגרופים – ארכימדס וניוטון משלבים ידיים', channel: 'מכון דוידסון', lang: 'he', minutes: 4, note: 'בעברית! ניסוי מדידת נפח במים – השיטה של ארכימדס.' },
  { topic: 'archimedes', id: 'ijj58xD5fDI', title: "How taking a bath led to Archimedes' principle", channel: 'TED-Ed', lang: 'en', minutes: 3, note: "סיפור האמבטיה ו'אאוריקה', מונפש וקצר." },
  { topic: 'marco', id: 'ROtn32vhI50', title: 'Marco Polo for Kids', channel: 'Learn Bright', lang: 'en', minutes: 6.5, note: 'לגיל בית ספר יסודי: דרך המשי וקובלאי חאן.' },
  { topic: 'marco', id: 'C88P-SCEKsw', title: 'Marco Polo For Kids', channel: 'Bedtime History', lang: 'en', minutes: 9, note: 'סיפור רגוע עם איורים: המסע לסין והפגישה עם קובלאי חאן. בלי אלימות.' },
  { topic: 'leonardo', id: 'dh5ttkug2nk', title: 'למה המונה ליזה כל כך מפורסמת?', channel: 'TED-Ed בעברית', lang: 'he', minutes: 5.5, note: 'בעברית. מתאים לגור יותר מלקטנים.' },
  { topic: 'leonardo', id: 'Rm0qszPJnc8', title: 'Leonardo da Vinci for Children', channel: 'Free School', lang: 'en', minutes: 5, note: 'ביוגרפיה פשוטה: אמנות והמצאות.' },
  { topic: 'magellan', id: 'y_2cm1nax6M', title: 'Ferdinand Magellan: Portuguese Explorer', channel: 'PBS LearningMedia', lang: 'en', minutes: 5.4, note: 'קטע חינוכי. מוזכר מותו של מגלן.' },
  { topic: 'magellan', id: 'ZBf8wi7LdYk', title: 'Ferdinand Magellan | Age of Exploration Made Easy', channel: 'Bedtime History', lang: 'en', minutes: 4.6, note: 'המסע מסביב לעולם בשפה עדינה. כנראה מוזכר בקצרה שמגלן נהרג בפיליפינים.' },
  { topic: 'hannibal', id: '81vhV7ZgTPY', title: 'Hannibal Barca | History Made Easy', channel: 'Bedtime History', lang: 'en', minutes: 5.8, note: 'הגרסה העדינה ביותר שנמצאה: האלפים והפילים.' },
  { topic: 'hannibal', id: 'TXChi5kZlo8', title: 'Who Was Hannibal? The General Who Crossed the Alps', channel: 'PastPorts Kids', lang: 'en', minutes: 2.6, note: 'אנימציה קצרה לילדים על הפילים באלפים. ערוץ קטן – כדאי להציץ לפני שמאשרים.' },
  { topic: 'harriet', id: 'b3OehwRHIlo', title: 'Harriet Tubman for Kids', channel: 'Homeschool Pop', lang: 'en', minutes: 8, note: 'לילדים. העבדות מוסברת בצורה מותאמת לגיל.' },
  { topic: 'harriet', id: '5zmOwgqkcec', title: 'Harriet Tubman for Kids', channel: 'Learn Bright', lang: 'en', minutes: 6.6, note: 'ביוגרפיה ברמת יסודי.' },
  { topic: 'alexander', id: 'j_K7588OVPE', title: 'Alexander the Great for Kids', channel: 'Bedtime History', lang: 'en', minutes: 8, note: 'סיפור עדין לילדים.' },
  { topic: 'alexander', id: 'hsyIzelwxUQ', title: 'Alexander The Great | The Dr. Binocs Show', channel: 'Peekaboo Kidz', lang: 'en', minutes: 6.3, note: 'ד״ר בינוקס, מצויר ומצחיק. מוזכרים כיבושים, בלי אלימות גרפית, וגם מותו ממחלה.' },
  { topic: 'tutankhamun', id: 'dmkDPaHSBzg', title: 'King Tut and His Treasures for Kids', channel: 'Free School', lang: 'en', minutes: 5.4, note: 'המלך הילד, האוצרות וגילוי הקבר. לא מפחיד.' },
  { topic: 'tutankhamun', id: 'ULofBtBAJn4', title: 'Live a Day in the Life of King Tut', channel: 'National Geographic', lang: 'en', minutes: 2.7, note: 'קצר: החיים היומיומיים.' },
  { topic: 'shackleton', id: '53vjHpoGHsU', title: "Shackleton's Endurance Expedition", channel: 'Behind the News (ABC)', lang: 'en', minutes: 4.6, note: 'תוכנית חדשות לילדים מאוסטרליה, כולל גילוי הספינה ב־2022.' },
  { topic: 'shackleton', id: 'sqGwKeB8sW8', title: 'Sir Ernest Shackleton for Kids', channel: 'Bedtime History', lang: 'en', minutes: 8.6, note: 'קריינות עדינה של סיפור ההישרדות.' },
  { topic: 'apollo', id: 'Fhg_VfSyi5I', title: 'דניאל שואל – מה זה ירח?', channel: 'מכון דוידסון', lang: 'he', minutes: 4.2, note: 'בעברית, סדרת ילדים של מכון ויצמן.' },
  { topic: 'apollo', id: 'CbTaDOuSePk', title: 'Apollo 11 – The First Moon Walk', channel: 'Nat Geo Kids', lang: 'en', minutes: 2.8, note: 'קצר ומיועד לילדים.' },
  { topic: 'chocolate', id: 'zJdeQABAc_w', title: 'Where Does Chocolate Come From?', channel: 'SciShow Kids', lang: 'en', minutes: 3.7, note: 'מהפרי עד השוקולד, ידידותי לילדים.' },
  { topic: 'chocolate', id: '7bIB39r2QBU', title: 'Invention of Chocolate – Dr. Binocs', channel: 'Peekaboo Kidz', lang: 'en', minutes: 5.2, note: 'היסטוריה מצוירת של השוקולד.' },
  { topic: 'solar', id: 'w36yxLgwUOc', title: 'Solar System – The Dr. Binocs Show', channel: 'Peekaboo Kidz', lang: 'en', minutes: 4.4, note: 'מצויר, מתאים לשני הילדים.' },
  { topic: 'solar', id: 'libKVRa01L8', title: 'Solar System 101', channel: 'National Geographic', lang: 'en', minutes: 4.2, note: 'צילומים יפים, אנגלית קצת יותר קשה.' },
  { topic: 'ocean', id: 'MdvSfwx3w6g', title: 'דניאל שואל – מה זה מדוזה?', channel: 'מכון דוידסון', lang: 'he', minutes: 3, note: 'בעברית, לילדים צעירים.' },
  { topic: 'ocean', id: 'XyDNTfmFmJw', title: 'The Outrageous Octopus!', channel: 'SciShow Kids', lang: 'en', minutes: 4.7, note: 'עובדות על התמנון לילדים.' },
  { topic: 'ocean', id: 'ZFk0xhqT5fQ', title: 'Super Sharks!', channel: 'SciShow Kids', lang: 'en', minutes: 4.4, note: 'כרישים – ידידותי ולא מפחיד.' },
  { topic: 'letters', id: 'WX0qsJ7LVY4', title: 'שיר האותיות – קסם וחברים', channel: 'מטח', lang: 'he', minutes: 2.4, note: 'בעברית. מטח – תוכנית הקריאה של בתי הספר.' },
  { topic: 'letters', id: 'gCAznfygWTY', title: 'שיר האלף בית – ערוץ הופ!', channel: 'ערוץ הופ!', lang: 'he', minutes: 2, note: 'ערוץ הגיל הרך.' },
  { topic: 'letters', id: 'XtDIFvN05oc', title: 'שיר האלף בית', channel: 'ילדות ישראלית', lang: 'he', minutes: 2.3, note: 'השיר הקלאסי.' },
  { topic: 'numbers', id: 'HGs0kMZSPDU', title: 'שיר המספרים', channel: 'ערוץ בייבי', lang: 'he', minutes: 1.7, note: 'שיר ספירה פשוט.' },
  { topic: 'numbers', id: '1gPIkiarOjY', title: 'שיר המספרים iTaLAM', channel: 'iTaLAM', lang: 'he', minutes: 1.5, note: 'תוכנית לימוד עברית לבתי ספר.' },
];

export const topicOfSeason = file => Object.keys(TOPICS).find(t => TOPICS[t].seasons.includes(file)) || null;
export const videoKey = v => v.src || v.id;
/** האם מותר להראות לילד: סרטון שלנו – תמיד; מיוטיוב – רק אם ההורה אישר */
export const allowed = (v, settings = {}) => settings.videos !== false && (v.own || (settings.videosOk || []).includes(videoKey(v)));
/** סרטונים מאושרים לנושא */
export const videosFor = (topic, settings) => VIDEOS.filter(v => v.topic === topic && allowed(v, settings));
export const ytEmbed = (id, origin = '') => `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&fs=0&disablekb=1&controls=0&enablejsapi=1&cc_load_policy=0${origin ? '&origin=' + encodeURIComponent(origin) : ''}`;
export const ytThumb = id => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
