// בודק עונה: מבנה, ניקוד, חשבון, שאלות. שימוש:
//   node scripts/validate-season.mjs lib/game/seasons/marco.js MARCO m
import { pathToFileURL } from 'url';
import path from 'path';

const [file, exportName, prefix] = process.argv.slice(2);
if (!file || !exportName || !prefix) { console.error('usage: validate-season.mjs <file> <EXPORT> <id-prefix>'); process.exit(2); }
const mod = await import(pathToFileURL(path.resolve(file)).href);
const eps = mod[exportName], cards = mod[exportName + '_CARDS'] || {};
const SCENES = ['library', 'syracuse', 'bath', 'venice', 'desert', 'palace', 'prison', 'workshop', 'tuscany', 'forest', 'river', 'alexandria', 'harbor', 'siege', 'ocean', 'snow', 'egypt', 'space', 'steppe', 'alps'];
const EXISTING_CARDS = ['book', 'feather', 'crown', 'archimedes', 'lever', 'screw', 'claw', 'sphere', 'venice', 'desert', 'kublai', 'marco', 'notebook', 'flyer', 'leonardo', 'northstar', 'harriet', 'key'];
const NIK = /[ְ-ׇּׁׂ]/g, HEB = /[א-ת]/g;
const plain = s => String(s).replace(/[֑-ׇ]/g, '');
const norm = s => plain(s).replace(/[^א-ת0-9a-zA-Z]/g, '');
const errors = [], warns = [];
const E = (where, msg) => errors.push(`${where}: ${msg}`), W = (where, msg) => warns.push(`${where}: ${msg}`);
const nikudOk = (where, s) => {
  if (typeof s !== 'string' || !s.trim()) { E(where, 'empty text'); return; }
  const h = (s.match(HEB) || []).length, n = (s.match(NIK) || []).length;
  if (h >= 4 && n / h < 0.3) E(where, `missing nikud (${n}/${h}): "${s.slice(0, 60)}"`);
};
const arr = (v, min, max) => Array.isArray(v) && v.length >= min && v.length <= max;

if (!Array.isArray(eps)) { console.error(`export ${exportName} not found / not an array`); process.exit(1); }
if (eps.length !== 7) E('season', `expected 7 episodes, got ${eps.length}`);
let maths = 0, writes = 0, predicts = 0, myths = 0, balances = 0, timelines = 0, words = 0;
const ids = new Set(), usedCards = new Set();
eps.forEach((ep, k) => {
  const w = `ep${k + 1}(${ep.id})`;
  if (ep.id !== prefix + (k + 1)) E(w, `id should be ${prefix}${k + 1}`);
  if (ids.has(ep.id)) E(w, 'duplicate id'); ids.add(ep.id);
  if (k === 0) { if (!ep.chapter) E(w, 'first episode needs chapter'); else nikudOk(w + '.chapter', ep.chapter); }
  else if (ep.chapter) E(w, 'only the first episode has chapter');
  nikudOk(w + '.title', ep.title); nikudOk(w + '.end', ep.end);
  if (!SCENES.includes(ep.scene)) E(w, `unknown scene ${ep.scene}`);
  if (!ep.card) E(w, 'missing card'); else { if (usedCards.has(ep.card)) E(w, `card ${ep.card} used twice`); usedCards.add(ep.card); if (!EXISTING_CARDS.includes(ep.card) && !cards[ep.card]) E(w, `card ${ep.card} not defined in ${exportName}_CARDS`); }
  if (!arr(ep.steps, 9, 17)) E(w, `steps count ${ep.steps?.length} (want 9-17)`);
  let hasMath = false;
  (ep.steps || []).forEach((s, i) => {
    const ws = `${w}.step${i + 1}(${s.t})`;
    if (s.scene && !SCENES.includes(s.scene)) E(ws, `unknown scene ${s.scene}`);
    switch (s.t) {
      case 'read': if (!arr(s.lines, 1, 4)) E(ws, 'lines 1-4'); (s.lines || []).forEach((l, j) => { nikudOk(`${ws}.l${j + 1}`, l); words += plain(l).split(/\s+/).length; }); break;
      case 'choice': nikudOk(ws + '.q', s.q); if (!arr(s.options, 2, 4)) E(ws, 'options 2-4'); (s.options || []).forEach(o => nikudOk(ws + '.opt', o)); if (!(s.answer >= 0 && s.answer < (s.options || []).length)) E(ws, 'bad answer'); if (s.hint) nikudOk(ws + '.hint', s.hint); else W(ws, 'no hint'); break;
      case 'tf': nikudOk(ws + '.q', s.q); if (typeof s.answer !== 'boolean') E(ws, 'answer must be boolean'); if (s.hint) nikudOk(ws + '.hint', s.hint); break;
      case 'find': nikudOk(ws + '.q', s.q); nikudOk(ws + '.text', s.text); if (!String(s.text).split(/\s+/).some(t => norm(t) === norm(s.answer))) E(ws, `answer "${s.answer}" is not a word in text`); if (s.hint) nikudOk(ws + '.hint', s.hint); break;
      case 'order': nikudOk(ws + '.q', s.q); if (!arr(s.words, 3, 7)) E(ws, 'words 3-7'); (s.words || []).forEach(o => nikudOk(ws + '.word', o)); if (new Set((s.words || []).map(norm)).size !== (s.words || []).length) E(ws, 'duplicate words make order ambiguous'); break;
      case 'number': nikudOk(ws + '.q', s.q); if (!Number.isInteger(s.answer) || s.answer < 0 || s.answer > 9999) E(ws, 'answer must be an integer 0-9999'); if (s.hint) nikudOk(ws + '.hint', s.hint); else W(ws, 'no hint'); hasMath = true; maths++; break;
      case 'write': nikudOk(ws + '.q', s.q); if (!arr(s.starters, 2, 4)) E(ws, 'starters 2-4'); (s.starters || []).forEach(o => nikudOk(ws + '.starter', o)); if (!(s.minWords >= 7 && s.minWords <= 14)) E(ws, 'minWords 7-14'); if (!arr(s.keywords, 3, 10) || s.keywords.some(k => /[֑-ׇ]/.test(k))) E(ws, 'keywords: 3-10 words WITHOUT nikud'); writes++; break;
      case 'predict': nikudOk(ws + '.q', s.q); if (!arr(s.options, 3, 3)) E(ws, 'options must be 3'); (s.options || []).forEach(o => nikudOk(ws + '.opt', o)); if (!(s.answer >= 0 && s.answer < 3)) E(ws, 'bad answer'); if (!arr(s.reveal, 1, 3)) E(ws, 'reveal 1-3 lines'); (s.reveal || []).forEach(l => nikudOk(ws + '.reveal', l)); predicts++; break;
      case 'myth': nikudOk(ws + '.q', s.q); if (typeof s.answer !== 'boolean') E(ws, 'answer must be boolean (true = truth)'); if (!arr(s.explain, 1, 3)) E(ws, 'explain 1-3 lines'); (s.explain || []).forEach(l => nikudOk(ws + '.explain', l)); myths++; break;
      case 'balance': { nikudOk(ws + '.q', s.q); const a = s.a || {}, b = s.b || {}, t = a.w * a.d / b.w; if (!(Number.isInteger(t) && t >= 1 && t <= 6 && a.d >= 1 && a.d <= 6)) E(ws, `a.w*a.d/b.w must be an integer 1-6 (got ${t})`); if (s.hint) nikudOk(ws + '.hint', s.hint); hasMath = true; maths++; balances++; break; }
      case 'timeline': nikudOk(ws + '.q', s.q); if (!arr(s.items, 3, 5)) E(ws, 'items 3-5'); (s.items || []).forEach(o => nikudOk(ws + '.item', o)); if (s.hint) nikudOk(ws + '.hint', s.hint); timelines++; break;
      default: E(ws, `unknown step type "${s.t}"`);
    }
  });
  if (!hasMath) W(w, 'no math task (number/balance)');
  const last = (ep.steps || [])[ep.steps.length - 1];
  if (!last || last.t !== 'read') E(w, 'last step must be a read (cliffhanger)');
  if (!arr(ep.quiz, 5, 5)) E(w, 'quiz must have exactly 5 questions');
  (ep.quiz || []).forEach((q, j) => {
    const wq = `${w}.quiz${j + 1}`; nikudOk(wq + '.q', q.q);
    if (q.tf) { if (JSON.stringify(q.options) !== JSON.stringify(['נָכוֹן', 'לֹא נָכוֹן'])) E(wq, "tf options must be ['נָכוֹן','לֹא נָכוֹן']"); }
    else { if (!arr(q.options, 3, 4)) E(wq, 'options 3-4'); (q.options || []).forEach(o => nikudOk(wq + '.opt', o)); }
    if (!(q.answer >= 0 && q.answer < (q.options || []).length)) E(wq, 'bad answer');
  });
});
Object.entries(cards).forEach(([id, c]) => { if (EXISTING_CARDS.includes(id)) E('cards', `${id} already exists – reuse it, do not redefine`); nikudOk(`card ${id}.name`, c.name); nikudOk(`card ${id}.fact`, c.fact); if (!c.e) E(`card ${id}`, 'missing emoji e'); });
if (maths < 7) W('season', `only ${maths} math tasks (want ≥ 7)`);
if (writes < 3) E('season', `only ${writes} writing tasks (need ≥ 3)`);
if (predicts < 5) E('season', `only ${predicts} predict tasks (need ≥ 5)`);
if (myths < 4) E('season', `only ${myths} myth tasks (need ≥ 4)`);
if (balances + timelines < 2) W('season', 'use balance/timeline at least twice');
console.log(`episodes ${eps.length} · reading words ${words} · math ${maths} · write ${writes} · predict ${predicts} · myth ${myths} · balance ${balances} · timeline ${timelines}`);
warns.forEach(x => console.log('WARN ' + x));
errors.forEach(x => console.log('ERROR ' + x));
console.log(errors.length ? `${errors.length} errors` : 'OK – no errors');
process.exit(errors.length ? 1 : 0);
