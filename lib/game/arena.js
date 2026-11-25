/* זירת הטריוויה: מתחרים (דמויות מהאקדמיה של שומרי הזמן), בניית שאלות, ניקוד וטבלה שבועית.
   הכיוונון דואג שהשחקן תמיד במקומות 1–5, שהמיקום משקף את ההצלחה שלו, ושהוא משתפר עם הזמן. */

export const RIVALS = [
  { id: 'noa', name: 'נוֹעָה', city: 'חֵיפָה', skill: .86, look: { body: 'girl', hair: 'ponytail', skin: '#f1c39b', hairColor: '#9a6a3a', shirt: '#e0578f' }, eq: { hat: 'hat_cap' } },
  { id: 'itamar', name: 'אִיתָמָר', city: 'בְּאֵר שֶׁבַע', skill: .8, look: { body: 'boy', hair: 'spiky', skin: '#dba67b', hairColor: '#2a1d16', shirt: '#2f6fd1' }, eq: { hand: 'hand_sword' } },
  { id: 'maya', name: 'מָאיָה', city: 'תֵּל אָבִיב', skill: .74, look: { body: 'girl', hair: 'long', skin: '#f8d9bf', hairColor: '#e4b860', shirt: '#7b4bc4', glasses: true }, eq: { neck: 'neck_scarf' } },
  { id: 'uri', name: 'אוּרִי', city: 'יְרוּשָׁלַיִם', skill: .7, look: { body: 'boy', hair: 'curly', skin: '#b67a50', hairColor: '#2a1d16', shirt: '#3a9a4a' }, eq: { hat: 'hat_explorer' } },
  { id: 'tamar', name: 'תָּמָר', city: 'אֵילַת', skill: .66, look: { body: 'girl', hair: 'bun', skin: '#dba67b', hairColor: '#5a3a22', shirt: '#e08a2a' }, eq: { pet: 'pet_parrot' } },
  { id: 'yonatan', name: 'יוֹנָתָן', city: 'רָמַת גַּן', skill: .62, look: { body: 'boy', hair: 'short', skin: '#f8d9bf', hairColor: '#c0562e', shirt: '#c0392b', freckles: true }, eq: { hat: 'hat_pirate' } },
  { id: 'lior', name: 'לִיאוֹר', city: 'נְתַנְיָה', skill: .58, look: { body: 'boy', hair: 'spiky', skin: '#f1c39b', hairColor: '#e4b860', shirt: '#2a8f8a' }, eq: { hand: 'hand_telescope' } },
  { id: 'shira', name: 'שִׁירָה', city: 'מוֹדִיעִין', skill: .55, look: { body: 'girl', hair: 'curly', skin: '#8a5a3a', hairColor: '#2a1d16', shirt: '#2f6fd1' }, eq: { hat: 'hat_laurel' } },
  { id: 'ido', name: 'עִידוֹ', city: 'קִרְיַת שְׁמוֹנָה', skill: .5, look: { body: 'boy', hair: 'curly', skin: '#f1c39b', hairColor: '#9a6a3a', shirt: '#7b4bc4', glasses: true }, eq: { pet: 'pet_dog' } },
  { id: 'roni', name: 'רוֹנִי', city: 'כַּרְמִיאֵל', skill: .46, look: { body: 'girl', hair: 'short', skin: '#dba67b', hairColor: '#3b5fc0', shirt: '#3a9a4a' }, eq: { hat: 'hat_wizard' } },
  { id: 'daniel', name: 'דָּנִיֵּאל', city: 'אַשְׁדּוֹד', skill: .42, look: { body: 'boy', hair: 'short', skin: '#b67a50', hairColor: '#2a1d16', shirt: '#e08a2a' }, eq: { outfit: 'cape_blue' } },
  { id: 'hila', name: 'הִילָה', city: 'עַכּוֹ', skill: .36, look: { body: 'girl', hair: 'ponytail', skin: '#f8d9bf', hairColor: '#c0562e', shirt: '#c0392b' }, eq: { pet: 'pet_cat' } },
];

const plainHe = s => String(s || '').replace(/[֑-ׇ]/g, '');
const shuffle = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

/** חמישה מתחרים: אחד חזק, אחד חלש, והשאר באמצע – כדי שתמיד יהיה מתח */
export function pickRivals(myName = '') {
  const pool = RIVALS.filter(r => plainHe(r.name) !== plainHe(myName));
  const strong = shuffle(pool.slice(0, 4)).slice(0, 2), weak = shuffle(pool.slice(-4)).slice(0, 1);
  const mid = shuffle(pool.filter(r => !strong.includes(r) && !weak.includes(r))).slice(0, 2);
  return shuffle([...strong, ...mid, ...weak]);
}

/** שאלות לזירה: מהרשימה של הדף (quiz), או מהשאלות שכבר היו בדף + שאלת האלוף */
export function buildQuiz(lvl, aluf) {
  let qs = [];
  if (lvl.quiz && lvl.quiz.length) qs = lvl.quiz.map(q => ({ ...q }));
  else {
    lvl.steps.forEach(s => {
      if (s.t === 'choice') qs.push({ q: s.q, options: s.options, answer: s.answer });
      else if (s.t === 'tf') qs.push({ q: s.q, options: ['נָכוֹן', 'לֹא נָכוֹן'], answer: s.answer ? 0 : 1, tf: true });
    });
    if (aluf) qs.push({ q: aluf.q, options: aluf.options, answer: aluf.answer });
  }
  return shuffle(qs).slice(0, 5);
}

export const speedPts = (t, T) => Math.max(0, Math.round(50 * (1 - t / T)));

/** כמה מתחרים מותר שיהיו מעל השחקן – לפי כמה הוא צודק עד עכשיו ולפי ניסיון */
export function allowedAbove(right, answered, played, luck) {
  const r = answered ? right / answered : 1;
  let a = r >= .99 ? 0 : r >= .75 ? (luck < .55 ? 0 : 1) : r >= .55 ? 1 : r >= .35 ? 2 : 3;
  if (played >= 3 && a > 0 && luck < .6) a -= 1;      // משתפר עם הזמן
  return Math.min(a, 4);
}

/** סגירת סבב: מוסיפים נקודות, ודואגים שלא יותר מ־allowed מתחרים יהיו מעל השחקן */
export function settleRound(me, bots, allowed) {
  bots.forEach(b => { b.total += b.got; });
  const above = () => bots.filter(b => b.total > me.total).sort((a, b) => a.total - b.total);
  let ab = above();
  while (ab.length > allowed) {
    const b = ab.find(x => x.got > 0);
    if (!b) break;
    b.total -= b.got; b.got = 0; b.right = false;
    ab = above();
  }
}

/* ---------------- הטבלה השבועית ---------------- */
export function weekKey(d = new Date()) {
  const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - x.getDay());   // השבוע מתחיל ביום ראשון
  return x.toDateString();
}
export function ensureWeek(S) {
  const k = weekKey();
  if (!S.arena) S.arena = { played: 0, wins: 0, best: 0 };
  if (!S.arena.week || S.arena.week.key !== k) S.arena.week = { key: k, me: 0, rivals: {}, games: 0, lastRank: 0 };
  return S.arena.week;
}
/** מעדכן את הטבלה אחרי זירה. מחזיר [{id, pts, me?}] ממוין */
export function updateWeek(S, players) {
  const w = ensureWeek(S), meP = players.find(p => p.me);
  w.me += meP.total; w.games++;
  const allowed = Math.max(0, Math.min(4, 4 - Math.floor(w.games / 2)));
  const inGame = Object.fromEntries(players.filter(p => !p.me).map(p => [p.id, p.total]));
  const cur = RIVALS.map(r => ({ id: r.id, old: w.rivals[r.id] || 0, add: inGame[r.id] ?? (Math.random() < .55 ? Math.round(150 + Math.random() * 450 * r.skill) : 0) }));
  cur.sort((a, b) => (b.old + b.add) - (a.old + a.add));
  let above = 0;
  cur.forEach(c => {
    let v = c.old + c.add;
    if (v > w.me) { if (above < allowed) above++; else v = Math.max(c.old, w.me - Math.round(10 + Math.random() * 90)); }
    w.rivals[c.id] = Math.max(c.old, v);
  });
  return leaderboard(S);
}
export function leaderboard(S) {
  const w = ensureWeek(S);
  return [{ id: 'me', me: true, pts: w.me }, ...RIVALS.map(r => ({ id: r.id, pts: w.rivals[r.id] || 0 }))]
    .sort((a, b) => b.pts - a.pts || (a.me ? -1 : b.me ? 1 : 0));
}
