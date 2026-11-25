/* 🧠 פרופיל למידה: המשחק מתחיל ממה שההורה סיפר (רמת קריאה וקשיים), מודד את הילד בזמן אמת – ומתאים את עצמו.
   - קריאה: מהירות (מילים לדקה) בכל דף → שורה-אחרי-שורה או עמוד שלם, גודל אותיות, זמן לשאלה בזירה, מחיר הקראה.
   - הבנת הנקרא: הצלחה בניסיון ראשון (20 השאלות האחרונות) → מתי מופיע רמז.
   - חשבון: הצלחה בניסיון ראשון → "אתגר חשבון" בכל פרק, ברמה שעולה ויורדת (או רמזים מוקדמים למי שקשה לו).
   - כתיבה: כמה מילים הוא כותב → מינימום המילים במשימות הכתיבה.
   - ריכוז: סשנים קצרים יותר וזירה קצרה יותר. */
export const READ_LEVELS = ['עוד לומד את האותיות', 'קורא עם ניקוד, לאט', 'קורא עם ניקוד, בשטף', 'קורא בלי ניקוד'];
export const CHALLENGES = ['קריאה', 'הבנת הנקרא', 'כתיבה', 'חשבון', 'ריכוז', 'מוטיבציה'];
export const CAT = { choice: 'comp', tf: 'comp', find: 'comp', order: 'comp', timeline: 'comp', number: 'math', balance: 'math' };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const today = () => new Date().toDateString();

/** מאתחל (או מכייל מחדש כשההורה שינה את הפרופיל) – שומר את המדידות שכבר נאספו */
export function syncSkill(old, profile = {}) {
  const src = JSON.stringify({ r: profile.reading || '', c: [...(profile.challenges || [])].sort() });
  if (old && old.src === src) return old;
  const lv = Math.max(0, READ_LEVELS.indexOf(profile.reading)), rl = profile.reading ? lv : 2, ch = profile.challenges || [];
  const K = {
    src, log: (old && old.log) || [],
    read: { lv: rl, mode: rl <= 1 || ch.includes('קריאה') ? 'lines' : 'page', big: rl <= 1, wpm: null, first: null, n: 0, ...(old ? { wpm: old.read.wpm, first: old.read.first, n: old.read.n } : {}) },
    comp: { lv: ch.includes('הבנת הנקרא') || rl === 0 ? 1 : 2, win: (old && old.comp.win) || [] },
    math: { lv: ch.includes('חשבון') ? 1 : 2, win: (old && old.math.win) || [] },
    write: { f: ch.includes('כתיבה') ? .7 : rl === 0 ? .6 : 1, n: (old && old.write.n) || 0, avg: (old && old.write.avg) || 0, short: 0 },
    focus: ch.includes('ריכוז'), motiv: ch.includes('מוטיבציה'), readHard: rl <= 1 || ch.includes('קריאה'),
  };
  if (old) K.log = [...K.log, { at: today(), what: 'profile' }].slice(-30);
  return K;
}

const note = (K, what, extra = {}) => { K.log = [...(K.log || []), { at: today(), what, ...extra }].slice(-30); return { what, ...extra }; };

/** סוף דף קריאה: words מילים ב־secs שניות. מחזיר שינוי (אם היה) */
export function noteRead(K, words, secs) {
  if (words < 8 || secs < 2 || secs > 600) return null;
  const wpm = words / (secs / 60);
  if (wpm > 260) return null;                                     // דילג בלי לקרוא – לא נחשב
  const r = K.read; r.n++;
  r.wpm = Math.round((r.wpm == null ? wpm : r.wpm * .8 + wpm * .2) * 10) / 10;
  if (r.n === 5) r.first = r.wpm;
  if (r.mode === 'lines' && r.n >= 8 && r.wpm >= 70) { r.mode = 'page'; return note(K, 'read-page', { wpm: Math.round(r.wpm) }); }
  if (r.mode === 'page' && r.n >= 8 && r.wpm < 32 && K.readHard) { r.mode = 'lines'; return note(K, 'read-lines', { wpm: Math.round(r.wpm) }); }
  if (r.big && r.n >= 12 && r.wpm >= 90) { r.big = false; return note(K, 'font-normal'); }
  return null;
}

/** תשובה לשאלה (first = נכון בניסיון הראשון) */
export function noteAnswer(K, cat, first) {
  const s = K[cat]; if (!s) return null;
  s.win = [...s.win, first ? 1 : 0].slice(-20);
  if (s.win.length < 10) return null;
  const rate = s.win.reduce((a, b) => a + b, 0) / s.win.length, prev = s.lv;
  s.lv = rate >= .85 ? 3 : rate < .6 ? 1 : 2;
  return s.lv !== prev ? note(K, cat + '-' + s.lv, { rate: Math.round(rate * 100) }) : null;
}

/** משימת כתיבה: כמה מילים מתוך המינימום */
export function noteWrite(K, words, min) {
  const w = K.write; w.n++; w.avg = Math.round(((w.avg * (w.n - 1)) + words) / w.n * 10) / 10;
  if (words >= min * 1.6 && w.f < 1.4) { w.f = Math.round((w.f + .1) * 10) / 10; w.short = 0; return note(K, 'write-up', { f: w.f }); }
  if (words <= min + 1) { w.short++; if (w.short >= 3 && w.f > .5) { w.f = Math.round((w.f - .1) * 10) / 10; w.short = 0; return note(K, 'write-down', { f: w.f }); } }
  else w.short = 0;
  return null;
}

/* ---- מה המשחק עושה עם הפרופיל ---- */
export const readMode = K => K.read.mode;
export const bigFont = K => K.read.big;
export const hintAfter = (K, cat) => (K[cat] && K[cat].lv === 1 ? 1 : 2);
export const writeMin = (K, min) => Math.max(4, Math.round(min * K.write.f));
export const arenaSec = K => K.read.wpm ? clamp(Math.round(14 + 1800 / Math.max(K.read.wpm, 25)), 22, 50) : [50, 45, 30, 25][K.read.lv];
export const arenaQs = K => (K.focus ? 3 : 5);
export const sessionMin = (K, base) => (K.focus ? Math.min(base, 8) : base);
export const readAloudCost = (K, base) => (K.readHard ? Math.round(base / 2) : base);
export const readAloudEvery = (K, base) => (K.readHard ? Math.max(1, base - 1) : base);
/** אתגר חשבון בפרק: רמה (1–5) או null אם כבוי */
export const mathChallenge = (K, practiceLevel) => (K.math.lv >= 2 ? clamp(practiceLevel + (K.math.lv === 3 ? 1 : 0), 2, 5) : null);
