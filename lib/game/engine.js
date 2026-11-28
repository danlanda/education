/* מנוע המשחק "שומרי הזמן".
   מקבל store – שכבת שמירה (Supabase או מצב הדגמה) – ומצייר את המשחק בתוך root. */
import { GUIDE, CARDS, WORLDS, LEVELS, RANKS, PRAISE, RETRY, DEFAULT_SETTINGS, ALUF, TIPS } from './content.js';
import { keeperSVG, itemThumb, ITEMS, SLOTS, RARITY, LOOK_OPTIONS, DEFAULT_LOOK } from './avatar.js';
import { scene, guideSVG, guideAvatar, GUIDE_CREDIT, LOGO, worldArt, CHEST_CLOSED, CHEST_OPEN, eraserFig } from './art.js';
import { startRun } from './runner.js';
import { createKGames, friendSVG } from './kgames.js';
import { TOPICS, topicOfSeason, videosFor, videoKey, ytThumb } from './videos.js';
import { LETTER_ORDER, letterOf, NUMBER_STORY, S as KST, NUM as KNUM, PRAISE as KPRAISE, RETRY as KRETRY, K_SCREEN } from './kinder-data.js';
import { worldMapSVG, themeMapSVG, WORLD_MAP, MAPPOS, MAP_W, MAP_H } from './worldmap.js';
import { icon } from './icons.js';
import { SEASON_FILES } from './seasons/index.js';
import { createAudio } from './audio.js';
import { RIVALS, pickRivals, buildQuiz, speedPts, allowedAbove, settleRound, ensureWeek, updateWeek, leaderboard, weekKey as weekKeyNow } from './arena.js';
import { makeProblem, START_LEVEL, PROMPTS, RIDDLES } from './practice.js';
import { JOINT, JOINT_CATS, JOINT_REWARD, JOINT_EVERY } from './joint.js';
import { syncSkill, noteRead, noteAnswer, noteWrite, CAT, readMode, bigFont, hintAfter, writeMin, arenaSec, arenaQs, sessionMin, readAloudCost, readAloudEvery, mathChallenge, runLevel, noteRun, runOptions } from './learner.js';
import { FEATURES, featureReady, OWL_STAGES, owlStage, owlSVG, countWords, LEAGUES, DAILY_GIFTS, SHIELD_PRICE, SHIELD_MAX, SPIN_MAX, GOLDEN_CHANCE, GOLDEN_BONUS, BADGES } from './progress.js';

const NIKUD = /[֑-ׇֽֿׁׂׅׄ]/g;
export const plain = s => String(s ?? '').replace(NIKUD, '');
const norm = s => plain(s).replace(/[^א-ת0-9a-zA-Z]/g, '');
const pick = a => a[Math.floor(Math.random() * a.length)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
const todayStr = () => new Date().toDateString();

const BASE_STATE = {
  name:'', coins:0, stars:{}, cards:[], done:[], streak:{ last:null, count:0 }, minutes:0, firstTry:0, tasks:0,
  owned:[], equipped:{}, today:{ date:null, pages:0, tickets:0, goalDone:false, lifelines:0 },
  tips:{}, tutorialDone:false, aluf:{},
};

export function createGame(root, store, opts = {}) {
  let S, SET, child, L = null, screen = 'worlds', mapWorld = 'history';
  const T = { balance:0, pending:null, riddle:null };
  const audio = createAudio();
  const timers = [];
  const sessionStart = Date.now();
  let destroyed = false;

  /* ---------------- כלים ---------------- */
  const $ = s => root.querySelector(s);
  const tx = s => { s = String(s ?? '').replace(/\{name\}/g, S.name || 'שׁוֹמֵר'); return SET.nikud ? s : plain(s); };
  const helper = () => tx(SET.helperName || 'אַבָּא');
  const minutesText = n => n === 1 ? tx('דַּקָּה אַחַת') : `${n} ${tx('דַּקּוֹת')}`;
  const ticketsText = n => n === 1 ? tx('כַּרְטִיס אֶחָד') : `${n} ${tx('כַּרְטִיסִים')}`;
  const save = () => store.saveState(S);

  function ensureToday() {
    if (S.today.date !== todayStr()) S.today = { date: todayStr(), pages:0, tickets:0, goalDone:false, lifelines:0 };
  }
  function rankInfo() {
    let i = 0; RANKS.forEach((x, k) => { if (S.done.length >= x.min) i = k; });
    const cur = RANKS[i], nx = RANKS[i + 1];
    return { name: cur.name, pct: nx ? Math.round((S.done.length - cur.min) / (nx.min - cur.min) * 100) : 100 };
  }
  function rank() { return rankInfo().name; }
  function refreshBar() {
    $('#coins').textContent = S.coins;
    $('#tickets').textContent = T.balance;
    $('#streak').textContent = S.streak.count;
    const ri = rankInfo();
    $('#rank').textContent = tx(ri.name);
    $('#meName').textContent = S.name || tx('שׁוֹמֵר');
    $('#xpBar').style.width = Math.max(6, ri.pct) + '%';
    $('#meAv').innerHTML = keeperSVG(S.equipped, { head: true, look: S.look });
    refreshBadges(); refreshTabs();
  }
  /* ---- טאבים, תגיות ומצב מיקוד ---- */
  let focusClose = null;
  function setTab(id) {
    kgTok++; if (KIDS()) { kTok++; try { tts && tts.cancel(); } catch (e) {} }
    kgEl.classList.remove('focus', 'bare', 'golden'); focusClose = null; audio.music('lobby'); stopSpeak();
    root.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.tab === id));
    if (S && S.newTab && S.newTab[id]) { delete S.newTab[id]; save(); }
    setActions(''); hideSheet(); keyHandler = null; window.scrollTo(0, 0);
  }
  function setFocus(onClose, theme = 'story') { kgEl.classList.remove('bare'); kgEl.classList.add('focus'); focusClose = onClose; setActions(''); audio.music(theme); }
  function setActions(html) { const a = $('#actionbar'); if (a) a.innerHTML = html ? `<div class="ab">${html}</div>` : ''; }
  function setBadge(tab, n) {
    const b = $(`#tab-${tab} .badge`); if (!b) return;
    if (n) { b.textContent = n; b.classList.remove('hidden'); } else b.classList.add('hidden');
  }
  function refreshBadges() {
    if (!S || !SET) return;
    const anyNew = anyPagesLeft();
    setBadge('map', anyNew && pagesLeftToday() > 0 ? '!' : 0);
    const P = pr(); setBadge('practice', !has('practice') || P.day.bonus ? 0 : 3 - practiceDone(P).filter(Boolean).length);
    const afford = ITEMS.filter(it => !S.owned.includes(it.id) && it.price <= S.coins && !lockInfo(it)).length;
    setBadge('shop', afford ? Math.min(afford, 9) : 0);
    setBadge('home', T.riddle ? '!' : 0);
  }
  /* ---- גיליון המשוב בתחתית (כמו בדואולינגו) ---- */
  let sheetT = null;
  function showSheet(kind, title, sub = '', ms = 1300, btn = '') {
    const sh = $('#sheet'); if (!sh) return; clearTimeout(sheetT);
    sh.className = 'show ' + kind;
    if (KIDS()) setTimeout(() => { if (Date.now() - kLastAt > 1200) kNarrate(title); }, 60);
    sh.querySelector('.sh').innerHTML = `${icon(kind === 'good' ? 'check' : 'cross')}<div class="grow"><b>${title}</b>${sub ? `<span>${sub}</span>` : ''}</div>${btn}`;
    if (ms) sheetT = setTimeout(hideSheet, ms);
  }
  function hideSheet() { clearTimeout(sheetT); const sh = $('#sheet'); if (sh) sh.className = ''; }
  const plus = n => `<bdi dir="ltr">+${n}</bdi>`;
  const gain = (n, ic = 'coin') => `<span class="gain">${plus(n)} ${icon(ic)}</span>`;
  const earn = n => { const k = (L && L.replay) ? Math.max(1, Math.round(n * 0.2)) : n; return L && L.golden ? k * 2 : k; };   // דף זהב = כל מטבע כפול
  function fly(html, el) {
    const r = (el || $('#coinsPill')).getBoundingClientRect();
    const f = document.createElement('div'); f.className = 'floattxt'; f.innerHTML = html;
    f.style.left = (r.left + r.width / 2 - 24) + 'px'; f.style.top = r.top + 'px';
    document.body.appendChild(f); setTimeout(() => f.remove(), 1000);
  }
  function bump(el) { if (!el) return; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  /** מטבעות שעפים מהמקום שבו הרווחת אותם אל המונה למעלה */
  function flyIcons(n, el, target, ic = 'coin') {
    if (!target || !target.getBoundingClientRect().width) return;
    const a = (el || target).getBoundingClientRect(), b = target.getBoundingClientRect();
    const k = Math.min(6, Math.max(1, Math.round(n / 5)));
    for (let i = 0; i < k; i++) {
      const c = document.createElement('div'); c.className = 'coinfly'; c.innerHTML = icon(ic);
      const x0 = a.left + a.width / 2 - 17 + (Math.random() - .5) * 50, y0 = a.top + a.height / 2 - 17 + (Math.random() - .5) * 30;
      c.style.left = x0 + 'px'; c.style.top = y0 + 'px'; document.body.appendChild(c);
      const dx = b.left - 6 - x0, dy = b.top - 2 - y0;
      if (!c.animate) { c.remove(); continue; }
      const an = c.animate([{ transform: 'translate(0,0) scale(.5)', opacity: 0 },
        { transform: `translate(${(Math.random() - .5) * 70}px,-46px) scale(1.15)`, opacity: 1, offset: .3 },
        { transform: `translate(${dx}px,${dy}px) scale(.75)`, opacity: 1 }], { duration: 650 + i * 80, easing: 'cubic-bezier(.5,0,.3,1)' });
      an.onfinish = () => { c.remove(); bump(target); };
    }
  }
  function addCoins(n, el) {
    if (n <= 0) return; S.coins += n; save(); refreshBar();
    flyIcons(n, el, $('#coinsPill'));
    if (n >= 5) setTimeout(() => sound('coin'), 120);
  }
  async function awardTickets(n, reason, force = false) {
    ensureToday();
    const give = force ? n : Math.min(n, Math.max(0, SET.dailyTicketCap - S.today.tickets));
    if (give <= 0) return 0;
    if (!force) S.today.tickets += give;   // פרס של אבא (חידה) לא נספר במכסה היומית
    save();
    T.balance = await store.addTickets(give, reason);
    refreshBar(); flyIcons(5, null, $('#ticketsBtn'), 'ticket'); fly(plus(give), $('#ticketsBtn'));
    return give;
  }
  function confetti(n = 40) {
    const col = ['#ffc928', '#ff5a7e', '#4a9bff', '#2fcf6f', '#a06bff', '#ff9a2e', '#ffffff'];
    for (let i = 0; i < n; i++) {
      const c = document.createElement('div'); c.className = 'confetti'; c.style.background = pick(col);
      c.style.width = (8 + Math.random() * 8) + 'px'; c.style.height = (12 + Math.random() * 10) + 'px';
      c.style.left = Math.random() * 100 + 'vw'; c.style.animationDuration = (1.6 + Math.random() * 1.6) + 's'; c.style.animationDelay = (Math.random() * .3) + 's';
      document.body.appendChild(c); setTimeout(() => c.remove(), 3200);
    }
  }
  /* צלילים ומוזיקה – lib/game/audio.js */
  function sound(type, arg) { audio.sfx(type, arg); }
  /* ---- הקראה בתשלום: הקול של המכשיר בעברית. השורה שמוקראת מודגשת – כך הילד עוקב בעיניים וממשיך ללמוד לקרוא ---- */
  const tts = typeof window !== 'undefined' && window.speechSynthesis;
  let heVoice = null;
  const findVoice = () => { if (!tts) return null; heVoice = tts.getVoices().find(v => /^(he|iw)/i.test(v.lang)) || null; return heVoice; };
  if (tts) { findVoice(); tts.onvoiceschanged = () => { findVoice(); if (screen === 'level' && L && L.lvl.steps[L.step]?.t === 'read' && !$('#tts') && heVoice) renderStep(); }; }
  /* קול טבעי של מספר סיפורים מהשרת (/api/tts). בלי קול טבעי – אין כפתור הקראה (לא קול רובוטי) */
  let niceVoice = false;
  if (typeof fetch !== 'undefined') fetch('/api/tts?probe=1').then(r => r.json()).then(j => {
    niceVoice = !!j.ok; if (niceVoice && screen === 'level' && L && L.lvl.steps[L.step]?.t === 'read' && !$('#tts')) renderStep();
  }).catch(() => {});
  const ttsOn = () => niceVoice && SET.readAloud !== false;
  const player = typeof Audio !== 'undefined' ? new Audio() : null;   // נגן אחד לכל ההקראה – כך הוא עובד גם באייפון
  let voiceTok = 0;
  function stopSpeak() {
    voiceTok++; if (player) { player.onended = player.onerror = null; try { player.pause(); } catch (e) {} }
    if (tts) tts.cancel(); audio.duck(false); root.querySelectorAll('.story p.speaking').forEach(p => p.classList.remove('speaking')); const b = $('#tts'); if (b) b.classList.remove('on');
  }
  /** מקריא שורות מהסיפור (כמו שהן כתובות בתוכן, עם {name}), ומדגיש כל שורה בזמן שהיא מוקראת */
  function speakStory(raw) {
    stopSpeak(); if (!ttsOn() || !player) return;
    const tok = voiceTok, ps = [...root.querySelectorAll('#app .story p')];
    const urls = raw.map(l => `/api/tts?t=${encodeURIComponent(l)}&n=${encodeURIComponent(S.name || '')}`);
    urls.slice(1).forEach(u => fetch(u).catch(() => {}));   // מכינים מראש את השורות הבאות
    audio.duck(true); $('#tts')?.classList.add('on');
    const play = i => {
      if (tok !== voiceTok) return;
      if (i >= urls.length) { stopSpeak(); return; }
      ps.forEach(p => p.classList.remove('speaking')); ps[i]?.classList.add('speaking'); ps[i]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      player.onended = () => play(i + 1); player.onerror = () => play(i + 1);
      player.src = urls[i]; player.play().catch(() => { if (tok === voiceTok) stopSpeak(); });
    };
    play(0);
  }
  function speakLines(lines) {
    stopSpeak(); if (!ttsOn()) return;
    const ps = [...root.querySelectorAll('#app .story p')]; audio.duck(true); $('#tts')?.classList.add('on');
    lines.forEach((line, i) => {
      const u = new SpeechSynthesisUtterance(line.replace(/[^\u0590-\u05FF0-9a-zA-Z\s.,!?:;"'()–-]/g, ' '));
      u.voice = heVoice; u.lang = heVoice.lang; u.rate = .85;
      u.onstart = () => { ps.forEach(p => p.classList.remove('speaking')); ps[i]?.classList.add('speaking'); ps[i]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
      u.onend = () => { if (i === lines.length - 1) stopSpeak(); };
      tts.speak(u);
    });
  }
  /* ---------------- 🐣 מצב גן: ילד שעוד לא קורא – אותו משחק, אבל הסיפור מוקרא, המסכים מדברים, והמשימות הן אותיות וחשבון ראשון ---------------- */
  const KIDS = () => !!(SET && (SET.mode === 'kinder' || (child && child.grade === 0)));
  const plainTxt = h => String(h || '').replace(/<[^>]+>/g, ' ').replace(/\{name\}/g, S && S.name || '').replace(/[\p{Extended_Pictographic}\u200d\ufe0f]/gu, ' ').replace(/\s+/g, ' ').trim();
  let kTok = 0, kPlaying = false;
  /** מקריא משפט (קול עברי של המכשיר). מחזיר Promise שמסתיים כשהמשפט נגמר */
  function kSay(text) {
    const t = plainTxt(text); kTok++; const tok = kTok;
    try { if (tts) tts.cancel(); } catch (e) {}
    try { if (kPlaying && player) { player.onended = player.onerror = null; player.pause(); } } catch (e) {} kPlaying = false;
    if (!t || SET.kVoice === false) return Promise.resolve();
    const est = Math.min(12000, 700 + t.replace(/[\u0591-\u05C7]/g, '').length * 85);
    return new Promise(res => {
      let ended = false; const end = () => { if (ended) return; ended = true; kPlaying = false; res(); };
      const device = () => {
        if (tok !== kTok) return end();
        if (tts && (heVoice || findVoice())) {
          try { const u = new SpeechSynthesisUtterance(t); u.voice = heVoice; u.lang = heVoice.lang; u.rate = .88; u.pitch = 1.08; u.onend = end; u.onerror = end; tts.speak(u); setTimeout(end, est + 900); return; } catch (e) {}
        }
        setTimeout(end, 350);
      };
      // קול טבעי מהשרת (אם חובר) – ואם המשפט לא אצלו או שאין חיבור: הקול העברי של המכשיר
      if (niceVoice && player) {
        kPlaying = true; let started = false;
        player.onended = end; player.onerror = () => { kPlaying = false; if (!started) device(); else end(); };
        player.onplaying = () => { started = true; };
        player.src = `/api/tts?t=${encodeURIComponent(t)}&n=${encodeURIComponent(S.name || '')}`;
        player.play().catch(() => { kPlaying = false; if (!started) device(); });
        setTimeout(() => { if (!started && !ended && tok === kTok) { try { player.pause(); } catch (e) {} kPlaying = false; device(); } }, 3500);
        setTimeout(end, est + 6000); return;
      }
      device();
    }).then(() => tok);
  }
  let kLast = '';
  let kLastAt = 0;
  const kNarrate = text => { if (!KIDS()) return Promise.resolve(); kLast = text; kLastAt = Date.now(); return kSay(text); };
  /* מה מקריאים בכל מסך בפעם הראשונה (וגם כשלוחצים על ❓) */
  /** פעם ראשונה במסך → מקריאים מה יש בו. אחר כך – רק כשלוחצים על ❓ (או משפט קצר אם יש) */
  function kScreen(key, short) {
    if (!KIDS() || !K_SCREEN[key]) return;
    S.kd = S.kd || {}; const seen = S.kd.seen = S.kd.seen || {};
    setTimeout(() => {
      if (overlayOpen() || tour || kLocked) return;
      if (!seen[key]) { seen[key] = 1; save(); kNarrate(K_SCREEN[key]); } else kNarrate(short || K_SCREEN[key + 'Short'] || K_SCREEN[key]);
    }, 500);
  }
  let kLocked = false;
  /** הדפדפן לא נותן לדבר לפני נגיעה ראשונה – אז בגן כל כניסה מתחילה בכפתור ▶ גדול */
  function kUnlock(then) {
    if (!KIDS()) { then(); return; }
    kLocked = true;
    const d = document.createElement('div'); d.className = 'k-unlock';
    d.innerHTML = `<button class="k-unlock-btn" aria-label="▶"><img src="/guide/yuval.jpg" alt=""><span>▶</span></button>`;
    root.appendChild(d);
    d.querySelector('button').onclick = () => {
      try { audio.unlock(); } catch (e) {}
      try { if (tts) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; tts.speak(u); } } catch (e) {}
      d.remove(); kLocked = false; sound('magic'); then();
    };
  }
  let kgames = null;
  let kgTok = 0;   // מתחלף בכל מעבר מסך/צעד – כך משחקון שעזבו לא "קופץ" חזרה
  const KG = () => kgames || (kgames = createKGames({ app, root, say: t => kNarrate(t), sound, later: (fn, ms) => { const tok = kgTok; setTimeout(() => { if (!destroyed && tok === kgTok) fn(); }, ms); }, confetti, kd: () => S.kd }));
  const readCost = () => readAloudCost(S.skill, SET.readAloudCost ?? 20);                       // למי שקשה לו לקרוא – חצי מחיר
  const readEvery = () => Math.max(1, readAloudEvery(S.skill, SET.readAloudEvery ?? 3));          // הקראה פעם אחת בכל 3 דפי סיפור
  const readWait = () => Math.max(0, S.ttsWait || 0);              // כמה דפים עוד צריך לקרוא לבד
  const overlayOpen = () => !$('#overlay').classList.contains('hidden');
  function overlay(html) {
    $('#overlayBody').innerHTML = html; $('#overlay').classList.remove('hidden'); $('#overlayBody').scrollTop = 0;
    if (KIDS()) setTimeout(() => { const b = $('#overlayBody'); if (b && overlayOpen()) kNarrate([...b.querySelectorAll('h2,h3,.story,p')].map(x => x.innerHTML).join('. ').slice(0, 400)); }, 250);
  }
  function closeOverlay() { $('#overlay').classList.add('hidden'); }
  function shake(el) { if (!el) return; el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 400); }
  /** מעדכן רצף ימים. מחזיר את הרצף החדש אם השתנה היום, אחרת null */
  function updateStreak() {
    const today = todayStr();
    if (S.streak.last === today) return null;
    const diff = S.streak.last ? Math.round((new Date(today) - new Date(S.streak.last)) / 86400000) : 99;
    const need = diff - 2;   // סלחני: יום אחד שפוספס לא מאפס. על כל יום נוסף – מגן רצף אחד
    if (diff <= 2) S.streak.count++;
    else if (S.streak.count && diff < 99 && (S.shields || 0) >= need) { S.shields -= need; S.streak.count++; S.shieldSaved = need; store.log('shield_used', { days: need }); }
    else S.streak.count = 1;
    S.bestStreak = Math.max(S.bestStreak || 0, S.streak.count);
    S.streak.last = today; save();
    return S.streak.count;
  }

  /* ---------------- שלד ---------------- */
  const TABS = [['home', 'home', 'בַּיִת'], ['map', 'map', 'מַפָּה'], ['practice', 'practice', 'אִימּוּן'], ['shop', 'shop', 'חֲנוּת'], ['cards', 'cards', 'אֹסֶף']];
  root.innerHTML = `<div class="kg">
    <div id="topbar">
      <button class="player" id="me" title="הַשּׁוֹמֵר שֶׁלִּי"><span class="pav" id="meAv"></span>
        <span class="pinfo"><b id="meName"></b><span class="prank">${icon('crown')}<span id="rank"></span></span><span class="xp"><i id="xpBar"></i></span></span></button>
      <div id="lvlbar"><button class="iconbtn" id="lvlClose" title="יְצִיאָה">${icon('close')}</button><div class="lprog"><i id="lvlProg"></i><span id="lvlMarks"></span><span id="lvlMe"></span></div><span id="lvlPow"></span></div>
      <div class="spacer"></div>
      <button class="res" id="streakPill" title="יָמִים בָּרֶצֶף">${icon('flame')}<span id="streak">0</span></button>
      <button class="res" id="ticketsBtn" title="כַּרְטִיסִים">${icon('ticket')}<span id="tickets">0</span></button>
      <div class="res" id="coinsPill" title="מַטְבְּעוֹת">${icon('coin')}<span id="coins">0</span></div>
      <button class="iconbtn" id="soundBtn" title="מוּזִיקָה וּצְלִילִים"></button>
      <button class="iconbtn" id="helpBtn" title="אֵיךְ מְשַׂחֲקִים">${icon('help')}</button>
      <button class="iconbtn" id="exitBtn" title="אֵזוֹר הוֹרִים">${icon('gear')}</button>
    </div>
    <main id="app"><div class="loading">⏳</div></main>
    <nav id="tabbar"><div class="tabs">${TABS.map(([id, ic, name]) => `<button class="tab" id="tab-${id}" data-tab="${id}">${icon(ic)}<span>${name}</span><i class="badge hidden"></i></button>`).join('')}</div></nav>
    <div id="actionbar"></div>
    <div id="sheet"><div class="sh"></div></div>
    <div class="rotate-hint" aria-hidden="true"><span>📱</span><b>סוֹבֵב אֶת הַטֵּלֵפוֹן</b></div>
    <div id="overlay" class="hidden"><div class="panel" id="overlayBody"></div></div>
    <div id="coach" class="hidden"><div class="coach-hole" id="coachHole"></div><div class="coach-card" id="coachCard"></div></div>
  </div>`;
  const app = $('#app'), kgEl = $('.kg');

  /* ---------------- תיבת דואר: אישורים ומכתבים מאבא ---------------- */
  let inboxBusy = false;
  async function checkInbox() {
    if (inboxBusy || overlayOpen() || tour) return;
    inboxBusy = true;
    try {
      const decisions = await store.unseenDecisions();
      for (const d of decisions) {
        await store.markDecisionSeen(d.id);
        T.balance = await store.ticketBalance(); T.pending = await store.pendingRedemption(); refreshBar();
        if (d.status === 'approved') {
          sound('win'); confetti();
          await popup(`${icon('ticket', 'bigico')}<h2 class="display" style="font-size:32px">${helper()} ${tx('אִשֵּׁר!')}</h2>
            <p class="story" style="font-size:28px">${minutesText(d.minutes)} ${tx('שֶׁל מָסָךְ – מַגִּיעַ לְךָ!')}</p>`, tx('יֵשׁ!'));
        } else {
          await popup(`${icon('ticket', 'bigico')}<p class="story" style="font-size:26px">${helper()} ${tx('אָמַר: לֹא עַכְשָׁו.')}<br>${tx('הַכַּרְטִיסִים שֶׁלְּךָ נִשְׁמָרִים בְּצַד.')}</p>`, tx('בְּסֵדֶר'));
        }
      }
      const replies = await store.unreadReplies();
      for (const r of replies) {
        sound('ok');
        await popup(`<div class="letter">
            <div class="letter-head">${icon('letter')} ${tx('מִכְתָּב מֵ')}${helper()}!</div>
            <div class="small" style="text-align:right">${tx('כָּתַבְתָּ:')} "${esc(r.text).slice(0, 120)}${r.text.length > 120 ? '…' : ''}"</div>
            <div class="story letter-body">${esc(SET.nikud ? (r.reply_nikud || r.reply) : plain(r.reply_nikud || r.reply))}</div>
          </div>`, tx('תּוֹדָה!') + ' ❤️');
        await store.markReplySeen(r.id);
      }
    } catch (e) { console.warn('inbox', e); }
    inboxBusy = false;
  }
  function popup(html, okText, after) {
    return new Promise(res => {
      overlay(html + `<div class="row" style="justify-content:center"><button class="btn go" id="ppOk">${okText}</button></div>`);
      if (after) after();
      $('#ppOk').onclick = () => { closeOverlay(); res(); };
    });
  }

  /* ---------------- 🌱 משחק שגדל: לא מציגים הכול בהתחלה. כל יום-יומיים מתגלה הפתעה אחת חדשה ----------------
     ההפתעות ותנאי הפתיחה – lib/game/progress.js (FEATURES). כל הפתעה מוצגת פעם אחת, בחלון קצר עם משפט הסבר אחד,
     ברגע רגוע (אחרי ניצחון או בכניסה לבית). ההורה יכול לבטל את ההדרגה ולפתוח הכול (SET.gradual = false). */
  const gradual = () => SET.gradual !== false;
  const has = id => !gradual() || !!(S.feat || {})[id];
  const isFree = id => !!(LEVELS.history.find(l => l.id === id) || {}).free;
  const epsDone = () => S.done.filter(id => !isFree(id)).length;
  const heroesDoneN = () => heroesOf('history').filter(chDone).length;
  const stats = () => ({ eps: epsDone(), days: (S.days || {}).n || 1, streak: S.streak.count, arena: (S.arena || {}).played || 0, heroes: heroesDoneN() });
  const owlName = () => (S.owl && S.owl.name) ? esc(S.owl.name) : tx('יַנְשׁוּפִי');
  function refreshTabs() {
    const pt = $('#tab-practice'); if (pt) pt.classList.toggle('hidden', !has('practice'));
    root.querySelectorAll('.tab').forEach(t => t.classList.toggle('isnew', !!(S.newTab || {})[t.dataset.tab]));
  }
  const markNew = tab => { S.newTab = { ...(S.newTab || {}), [tab]: true }; save(); refreshTabs(); };
  /** חלון "חדש!" אחיד: ציור, כותרת, משפט אחד. go = כפתור "להציץ" שלוקח לשם. מחזיר true אם הילד הלך לשם */
  function revealPopup(art, title, text, o = {}) {
    return new Promise(res => {
      overlay(`<div class="modal reveal"><div class="rv-new">${tx(o.kicker || 'חָדָשׁ!')}</div><div class="rv-art">${art}</div>
        <h2 class="display">${tx(title)}</h2><p class="story">${tx(text)}</p>${o.extra || ''}
        <div class="row" style="justify-content:center">${o.go ? `<button class="btn go" id="rvGo">${tx(o.goText)} ${icon('next')}</button><button class="btn ghost" id="rvLater">${tx('אַחַר כָּךְ')}</button>`
          : `<button class="btn go" id="rvLater">${tx(o.okText || 'יֵשׁ!')}</button>`}</div></div>`);
      sound('magic'); confetti(35);
      if (o.go) $('#rvGo').onclick = () => { closeOverlay(); res(true); o.go(); };
      $('#rvLater').onclick = () => { closeOverlay(); res(false); };
    });
  }
  const bigE = e => `<span class="rv-emoji">${e}</span>`;
  const REVEAL = {
    owl: () => new Promise(res => {
      S.owl = { words: 0, name: '', ...(S.owl || {}) };
      const st = owlStage(S.owl.words);
      overlay(`<div class="modal reveal"><div class="rv-new">${tx('הַפְתָּעָה!')}</div>
        <button class="rv-art egg" id="egg">${owlSVG(-1, { crack: true })}</button>
        <h2 class="display" id="owlH">${tx('בֵּיצַת קֶסֶם!')}</h2><p class="story" id="owlP">${tx('מַשֶּׁהוּ זָז בִּפְנִים... גַּע בַּבֵּיצָה!')}</p>
        <div id="owlName"></div></div>`);
      sound('magic'); kNarrate('מַשֶּׁהוּ זָז בִּפְנִים... גַּע בַּבֵּיצָה!');
      $('#egg').onclick = () => {
        $('#egg').onclick = null; $('#egg').classList.add('hatch'); sound('pop');
        setTimeout(() => {
          $('#egg').innerHTML = owlSVG(st); $('#egg').classList.add('born'); sound('levelup'); confetti(50);
          $('#owlH').textContent = tx('זֶה הַיַּנְשׁוּף שֶׁלְּךָ!');
          $('#owlP').innerHTML = tx('כָּל מִלָּה שֶׁאַתָּה קוֹרֵא אוֹ כּוֹתֵב – מַאֲכִילָה אוֹתוֹ, וְהוּא גָּדֵל.') + (S.owl.words ? `<br><small>${tx('כְּבָר קָרָאתָ')} ${S.owl.words} ${tx('מִלִּים!')}</small>` : '');
          // שמות מוכנים לבחירה בנגיעה (ילד בגן לא צריך להקליד); הגדול יכול גם לכתוב שם משלו
          const NAMES = ['הוּפִּי', 'נוֹצָה', 'יַנְשׁוּפִי', 'שׁוֹקוֹ', 'כּוֹכָבִי', 'פִּיפּוֹ'];
          const done = nm => { S.owl.name = String(nm || '').trim().slice(0, 14) || plain(NAMES[0]); S.owl.stage = st; save(); store.log('owl_hatch', { name: S.owl.name }); closeOverlay(); res(false); };
          $('#owlName').innerHTML = `<div class="chips" style="justify-content:center;min-height:0;margin:6px 0 10px">${NAMES.map(n => `<button class="chip" data-n="${esc(tx(n))}">${tx(n)}</button>`).join('')}</div>`
            + (KIDS() ? '' : `<input type="text" id="owlIn" maxlength="14" autocomplete="off" placeholder="${tx('אוֹ כְּתֹב שֵׁם מִשֶּׁלְּךָ...')}">
            <div class="row" style="justify-content:center"><button class="btn go" id="owlOk">${tx('זֶה הַשֵּׁם שֶׁלּוֹ!')}</button></div>`);
          $('#owlName').querySelectorAll('.chip').forEach(c => c.onclick = () => { sound('tap'); if (KIDS()) { kNarrate(c.dataset.n); setTimeout(() => done(c.dataset.n), 900); } else { $('#owlIn').value = c.dataset.n; $('#owlName').querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === c)); } });
          if (KIDS()) kNarrate(K_SCREEN.owl);
          else {
            $('#owlIn').onkeydown = e => { if (e.key === 'Enter') $('#owlOk').click(); };
            $('#owlOk').onclick = () => done($('#owlIn').value);
          }
        }, 700);
      };
    }),
    practice: () => { markNew('practice'); return revealPopup(`<span class="rv-ico">${icon('practice')}</span>`, 'נִפְתַּח חֲדַר הָאִימּוּנִים!',
      'חֶשְׁבּוֹן, כְּתִיבָה וְחִידָה. עוֹשִׂים אֶת שְׁלָשְׁתָּם בְּיוֹם אֶחָד – וּמְקַבְּלִים עוֹד כַּרְטִיס!', { go: showPractice, goText: 'לְהָצִיץ' }); },
    gift: () => openGift(true).then(() => false),
    arena: () => SET.endGame === 'arena' ? revealPopup(`<span class="rv-ico">${icon('trophy')}</span>`, 'זִירַת הַחִידוֹן נִפְתְּחָה!',
      'מֵעַכְשָׁו כָּל פֶּרֶק נִגְמָר בְּחִידוֹן מוּל שׁוֹמְרֵי זְמַן אֲחֵרִים. מִי זוֹכֵר הֲכִי טוֹב אֶת הַסִּפּוּר – וְעוֹנֶה הֲכִי מַהֵר?')
      : revealPopup(bigE('🏃'), 'מֵרוֹץ הַסִּפּוּר נִפְתַּח!',
      'מֵעַכְשָׁו כָּל פֶּרֶק נִגְמָר בְּמֵרוֹץ: רָצִים בָּעוֹלָם שֶׁל הַסִּפּוּר, קוֹפְצִים מֵעַל מִכְשׁוֹלִים וְאוֹסְפִים מַטְבְּעוֹת. וּבְכָל שַׁעַר – שְׁאֵלָה עַל הַסִּפּוּר. מִי שֶׁזּוֹכֵר – מְנַצֵּחַ!'),
    badges: () => {
      checkBadges(true); markNew('cards');
      const mine = BADGES.filter(b => (S.badges || {})[b.id]);
      return revealPopup(bigE('🏅'), 'תָּגִים!', mine.length ? `עַל כָּל הֶשֵּׂג מְקַבְּלִים תָּג. כְּבָר יֵשׁ לְךָ ${mine.length}:` : 'עַל כָּל הֶשֵּׂג מְקַבְּלִים תָּג.',
        { extra: `<div class="rv-badges">${mine.slice(0, 6).map(b => `<span class="bdg mini"><span class="be">${b.e}</span><b>${tx(b.name)}</b></span>`).join('')}</div>`, go: showCards, goText: 'לְכָל הַתָּגִים' });
    },
    shield: () => {
      S.shields = Math.max(1, S.shields || 0); save();
      return revealPopup(bigE('🛡️'), 'מָגֵן רֶצֶף!', '3 יָמִים בָּרֶצֶף – וָאוּ! אִם תְּפַסְפֵס יוֹם, הַמָּגֵן שׁוֹמֵר לְךָ עַל הָרֶצֶף. הִנֵּה מָגֵן רִאשׁוֹן בְּמַתָּנָה!',
        { extra: `<p class="small">${tx('רוֹצֶה עוֹד מָגֵן? לוֹחֲצִים עַל הָאֵשׁ')} ${icon('flame')} ${tx('לְמַעְלָה.')}</p>` });
    },
    wheel: () => {
      S.spins = Math.max(1, S.spins || 0); save();
      return revealPopup(bigE('🎡'), 'גַּלְגַּל הַמַּזָּל!', 'מֵעַכְשָׁו, כְּשֶׁמַּשְׁלִימִים אֶת מְשִׂימַת הַיּוֹם אוֹ אֶת הָאִימּוּן הַיּוֹמִי – מְקַבְּלִים סִבּוּב בַּגַּלְגַּל. וְהִנֵּה סִבּוּב רִאשׁוֹן בְּמַתָּנָה!',
        { go: () => showWheel(() => { if (screen === 'level') afterLevelNav(); else if (screen === 'worlds') showWorlds(true); }), goText: 'לְסוֹבֵב!' });
    },
    joint: () => {
      const h = SET.helperName || 'אַבָּא';
      if (!ensureJoint()) return Promise.resolve(false);
      return revealPopup(bigE('🤝'), `מְשִׂימוֹת עִם ${h}!`, `מִדֵּי כַּמָּה יָמִים תְּקַבֵּל מְשִׂימָה מְיֻחֶדֶת שֶׁעוֹשִׂים יַחַד עִם ${h} – בְּלִי מָסָךְ: קוֹרְאִים, כּוֹתְבִים, מְצַיְּרִים וּבוֹנִים. סִיַּמְתֶּם וְקִבַּלְתֶּם אִשּׁוּר? יֵשׁ פְּרָס!`,
        { go: () => { if (screen === 'level') afterLevelNav(); showJoint(); }, goText: 'לַמְּשִׂימָה הָרִאשׁוֹנָה' });
    },
    golden: () => { S.goldenNext = true; save(); },      // שקט: דף הזהב הראשון מגיע בפרק הבא, והוא עצמו ההסבר
    league: () => {
      S.league = { tier: 0, ...(S.league || {}) }; save();
      const lg = LEAGUES[S.league.tier], nx = LEAGUES[S.league.tier + 1];
      return revealPopup(bigE(lg.e), 'לִיגוֹת!', `אַתָּה בְּלִיגַת ${lg.name}. מְסַיְּמִים אֶת הַשָּׁבוּעַ בְּ־3 הַמְּקוֹמוֹת הָרִאשׁוֹנִים בַּטַּבְלָה – וְעוֹלִים לְלִיגַת ${nx ? nx.name : ''}!`);
    },
    bonus: () => { markNew('shop'); return revealPopup(bigE('⭐'), 'בּוֹנוּסִים בַּחֲנוּת!',
      'הִצַּלְתָּ גִּבּוֹר שָׁלֵם! בַּחֲנוּת נִפְתְּחוּ סִפּוּרֵי בּוֹנוּס אֲמִתִּיִּים וַחֲבִילוֹת שֶׁל עֻבְדּוֹת מַדְהִימוֹת עַל הַגִּבּוֹרִים שֶׁפָּגַשְׁתָּ.',
      { go: () => { shopTab = 'bonus'; showShop(); }, goText: 'לַחֲנוּת' }); },
  };
  /** פותח את ההפתעה הבאה שהגיע זמנה (אחת בכל פעם). מחזיר true אם הילד הלך למסך אחר */
  async function revealNext() {
    if (!gradual() || tour || !S.tutorialDone) return false;
    S.feat = S.feat || {};
    let f;
    while ((f = FEATURES.find(x => !S.feat[x.id] && featureReady(x, stats())))) {
      S.feat[f.id] = todayStr(); save(); store.log('feature_unlock', { feature: f.id });
      if (f.silent) { REVEAL[f.id](); continue; }
      const went = await REVEAL[f.id]();
      refreshTabs(); refreshBar();
      return !!went;
    }
    return false;
  }
  /** "הַפְתָּעָה בְּעוֹד N פְּרָקִים" – מה מחכה, בלי לגלות מה */
  function teaserHTML(bar) {
    if (!gradual()) return '';
    const x = stats(), f = FEATURES.find(q => !(S.feat || {})[q.id] && q.need.eps != null && !featureReady(q, x));
    if (!f) return '';
    const left = f.need.eps - x.eps, prev = Math.max(0, ...FEATURES.filter(q => q.need.eps != null && q.need.eps < f.need.eps).map(q => q.need.eps));
    return `<button class="quest surprise" id="qSurprise"><span class="qi"><span class="qe">🎁</span></span>
      <span class="qb"><b>${left === 1 ? tx('עוֹד פֶּרֶק אֶחָד – וְנִפְתַּחַת הַפְתָּעָה!') : `${tx('עוֹד')} ${left} ${tx('פְּרָקִים – וְנִפְתַּחַת הַפְתָּעָה!')}`}</b>${bar(x.eps - prev, f.need.eps - prev)}</span><span class="qr"><span class="qe">❓</span></span></button>`;
  }

  /* ---- 🦉 ינשוף הזמן: גדל מכל מילה שקוראים וכותבים ---- */
  function feedOwl(n) {
    if (!n) return;
    S.owl = { words: 0, name: '', ...(S.owl || {}) }; S.owl.words += n;
    if (L) L.words = (L.words || 0) + n;
  }
  function owlInfo() {
    const O = S.owl || { words: 0 }, st = owlStage(O.words), cur = OWL_STAGES[st];
    return { O, st, cur, pct: cur.next ? Math.round((O.words - cur.min) / (cur.next - cur.min) * 100) : 100, left: cur.next ? cur.next - O.words : 0 };
  }
  function owlRowHTML(bar) {
    if (!has('owl') || !S.owl) return '';
    const { O, st, cur } = owlInfo();
    return `<button class="quest owlq" id="qOwl"><span class="qi owl-qi">${owlSVG(st)}</span>
      <span class="qb"><b>${owlName()} · ${tx(cur.name)}</b>${cur.next ? bar(O.words - cur.min, cur.next - cur.min) : `<span class="small" style="color:#ffe7a6">${tx('גָּדַל עַד הַסּוֹף!')}</span>`}</span>
      <span class="qr"><span class="qe">📖</span><small>${tx('מִלִּים')}</small></span></button>`;
  }
  function showOwl() {
    const { O, st, cur, left } = owlInfo(), nx = OWL_STAGES[st + 1];
    overlay(`<div class="reveal"><div class="rv-art owl-big">${owlSVG(st)}</div>
      <h2 class="display">${owlName()}</h2><div class="rv-new soft">${tx(cur.name)}</div>
      <p class="story">${O.words} ${tx('מִלִּים שֶׁקָּרָאתָ וְכָתַבְתָּ.')}${nx ? `<br>${tx('עוֹד')} ${left} ${tx('מִלִּים – וְהוּא יִהְיֶה')} ${tx(nx.name)}!` : `<br>${tx('הוּא שׁוֹמֵר זְמַן אֲמִתִּי – בִּזְכוּתְךָ!')}`}</p>
      <div class="owl-steps">${OWL_STAGES.map((s, i) => `<span class="${i <= st ? 'on' : ''}">${i <= st ? owlSVG(i) : '<i>?</i>'}</span>`).join('')}</div>
      <p class="small">${tx('כָּל דַּף שֶׁקּוֹרְאִים, וְכָל מִכְתָּב שֶׁכּוֹתְבִים – מַאֲכִילִים אוֹתוֹ.')}</p>
      <div class="row" style="justify-content:center"><button class="btn go" id="owlClose">${tx('סָגוּר')}</button></div></div>`);
    $('#owlClose').onclick = closeOverlay;
  }
  /** הינשוף גדל? חגיגה – ברגע רגוע, לא באמצע קריאה */
  async function owlMoment() {
    if (!has('owl') || !S.owl) return;
    const st = owlStage(S.owl.words);
    if ((S.owl.stage || 0) >= st) return;
    S.owl.stage = st; save(); store.log('owl_stage', { stage: st, words: S.owl.words });
    sound('levelup'); confetti(60);
    await popup(`<div class="reveal"><div class="rv-new">${tx('הַיַּנְשׁוּף גָּדַל!')}</div><div class="rv-art owl-big evolve">${owlSVG(st)}</div>
      <h2 class="display">${owlName()} ${tx('הוּא עַכְשָׁו')} ${tx(OWL_STAGES[st].name)}!</h2>
      <p class="story">${S.owl.words} ${tx('מִלִּים שֶׁקָּרָאתָ וְכָתַבְתָּ – הֵן מָה שֶׁגִּדֵּל אוֹתוֹ.')}</p></div>`, tx('וָאוּ!'));
    checkBadges();
  }

  /* ---- 🎡 גלגל המזל: מקבלים סיבוב על משימת היום, על האימון היומי ועל עלייה בליגה (עד 3 שמורים).
     על הגלגל מופיעים רק פרסים שאפשר באמת לקבל עכשיו, וגודל כל פלח = הסיכוי שלו ---- */
  const grantSpin = why => { if (!has('wheel')) return false; S.spins = Math.min(SPIN_MAX, (S.spins || 0) + 1); save(); store.log('wheel_earn', { why }); return true; };
  const freeItems = () => ITEMS.filter(it => !S.owned.includes(it.id) && !it.lock && it.price <= 250);
  const factPool = () => BONUS ? BONUS.BONUS_FACTS.filter(f => heroMet(f.hero) && !bonusState().facts.includes(f.id)) : [];
  const anyPagesLeft = () => openWorlds().some(w => chaptersOf(w).some(c => chAvail(w, c) && !chDone(c)));
  function wheelPrizes() {
    const all = [
      { id: 'c20', e: '🪙', label: '20', w: 22, col: '#ffc928' },
      { id: 'page', e: '📖', label: 'דַּף נוֹסָף', w: 12, col: '#4a9bff', ok: anyPagesLeft },
      { id: 'c50', e: '🪙', label: '50', w: 16, col: '#ff9a2e' },
      { id: 'item', e: '🎁', label: 'בֶּגֶד', w: 10, col: '#a06bff', ok: () => freeItems().length > 0 },
      { id: 'golden', e: '✨', label: 'דַּף זָהָב', w: 9, col: '#ffe36e', ok: () => has('golden') && !S.goldenNext },
      { id: 'fact', e: '🃏', label: 'עֻבְדָּה', w: 12, col: '#2fcf6f', ok: () => has('bonus') && factPool().length > 0 },
      { id: 'shield', e: '🛡️', label: 'מָגֵן', w: 8, col: '#9fb4c8', ok: () => has('shield') && (S.shields || 0) < SHIELD_MAX },
      { id: 'ticket', e: '🎟️', label: 'כַּרְטִיס', w: 5, col: '#ff5a7e', ok: () => SET.wheelTickets !== false && (ensureToday(), S.today.tickets < SET.dailyTicketCap) },
      { id: 'c100', e: '💰', label: '100', w: 5, col: '#ffd24a' },
    ];
    return all.filter(p => !p.ok || p.ok());
  }
  let wheelRot = 0, wheelBusy = false;
  function wheelSVG(P) {
    const tot = P.reduce((a, p) => a + p.w, 0), R = 140, C = 150; let a0 = 0, h = '';
    const pt = (deg, r) => { const t = (deg - 90) * Math.PI / 180; return [C + r * Math.cos(t), C + r * Math.sin(t)]; };
    P.forEach(p => {
      const a1 = a0 + p.w / tot * 360, [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R), m = (a0 + a1) / 2, [ex, ey] = pt(m, 104), [lx, ly] = pt(m, 70);
      const mid = m > 90 && m < 270 ? m + 180 : m;   // כתוב תמיד בכיוון קריא (לא הפוך)
      p.a0 = a0; p.a1 = a1;
      h += `<path d="M${C} ${C}L${x0.toFixed(1)} ${y0.toFixed(1)}A${R} ${R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}Z" fill="${p.col}" stroke="#2b1838" stroke-width="3"/>`;
      h += `<text x="${ex.toFixed(1)}" y="${ey.toFixed(1)}" font-size="${a1 - a0 < 22 ? 20 : 26}" text-anchor="middle" dominant-baseline="central" transform="rotate(${mid.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)})">${p.e}</text>`;
      if (a1 - a0 >= 30) h += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" font-size="14" font-weight="700" fill="#2b1838" text-anchor="middle" dominant-baseline="central" transform="rotate(${mid.toFixed(1)} ${lx.toFixed(1)} ${ly.toFixed(1)})">${tx(p.label)}</text>`;
      a0 = a1;
    });
    for (let i = 0; i < 16; i++) { const [x, y] = pt(i * 22.5, R + 1); h += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="#fff6c8" stroke="#2b1838" stroke-width="1.5"/>`; }
    return `<svg viewBox="0 0 300 300" aria-hidden="true"><g id="whRot" style="transform-origin:150px 150px;transform:rotate(${wheelRot}deg)">${h}</g>
      <circle cx="${C}" cy="${C}" r="26" fill="#ffe36e" stroke="#2b1838" stroke-width="4"/><text x="${C}" y="${C + 1}" font-size="22" text-anchor="middle" dominant-baseline="central">⭐</text></svg>`;
  }
  async function showWheel(onClose) {
    if (has('bonus')) await loadBonus().catch(() => {});
    const P = wheelPrizes(), n = S.spins || 0;
    const close = () => { closeOverlay(); if (onClose) onClose(); else if (screen === 'worlds') showWorlds(true); };
    overlay(`<div class="modal wheel-pop"><div class="ar-banner small">🎡<span>${tx('גַּלְגַּל הַמַּזָּל')}</span></div>
      <div class="wh-wrap"><div class="wh-pointer"></div><div class="wh" id="wh">${wheelSVG(P)}</div></div>
      <div id="whOut"><p class="small wh-n">${n ? `${tx('יֵשׁ לְךָ')} <b>${n}</b> ${tx(n === 1 ? 'סִבּוּב' : 'סִבּוּבִים')}` : tx('אֵין סִבּוּבִים כָּרֶגַע. מַשְׁלִימִים אֶת מְשִׂימַת הַיּוֹם אוֹ אֶת הָאִימּוּן – וּמְקַבְּלִים סִבּוּב!')}</p>
        <div class="row" style="justify-content:center">${n ? `<button class="btn gold big" id="whSpin">${tx('סוֹבֵב!')}</button>` : ''}<button class="btn ghost" id="whClose">${tx(n ? 'אַחַר כָּךְ' : 'סָגוּר')}</button></div></div></div>`);
    $('#whClose').onclick = close;
    if ($('#whSpin')) $('#whSpin').onclick = () => spinWheel(P, close);
  }
  function spinWheel(P, close) {
    if (wheelBusy || !(S.spins > 0)) return;
    wheelBusy = true; S.spins--; save();
    const tot = P.reduce((a, p) => a + p.w, 0); let r = Math.random() * tot, prize = P[P.length - 1];
    for (const p of P) { if ((r -= p.w) < 0) { prize = p; break; } }
    const span = prize.a1 - prize.a0, land = prize.a0 + span / 2 + (Math.random() - .5) * span * .6;
    const base = wheelRot - (wheelRot % 360);
    wheelRot = base + 360 * 6 + (360 - land);
    const g = $('#whRot'); $('#whSpin').disabled = true; $('#whClose').disabled = true; sound('whoosh');
    g.style.transition = 'transform 4.4s cubic-bezier(.12,.62,.08,1)'; g.style.transform = `rotate(${wheelRot}deg)`;
    // טיק־טיק בכל פעם שעובר פלח
    let last = -1; const t0 = performance.now();
    const tick = () => {
      if (!g.isConnected || performance.now() - t0 > 4500) return;
      const m = getComputedStyle(g).transform; let deg = 0;
      if (m && m !== 'none') { const v = m.match(/matrix\(([^)]+)\)/)[1].split(',').map(Number); deg = (Math.atan2(v[1], v[0]) * 180 / Math.PI + 360) % 360; }
      const at = (360 - deg) % 360, k = P.findIndex(p => at >= p.a0 && at < p.a1);
      if (k !== last) { if (last !== -1) sound('tick'); last = k; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setTimeout(() => { wheelBusy = false; if (!destroyed && g.isConnected) givePrize(prize, close); }, 4600);
  }
  async function givePrize(p, close) {
    let art = `<span class="rv-emoji">${p.e}</span>`, title = '', text = '', extra = '';
    store.log('wheel_spin', { prize: p.id });
    if (p.id === 'c20' || p.id === 'c50' || p.id === 'c100') {
      const n = +p.id.slice(1); addCoins(n, $('#wh')); title = `${n} ${tx('מַטְבְּעוֹת!')}`; if (n === 100) { title = tx('הַקֻּפָּה הַגְּדוֹלָה!') + ' 100 🪙'; }
    } else if (p.id === 'page') {
      ensureToday(); S.today.extra = (S.today.extra || 0) + 1; save();
      title = tx('דַּף נוֹסָף לְהַיּוֹם!'); text = tx('הַיּוֹם אֶפְשָׁר לְהַצִּיל עוֹד פֶּרֶק אֶחָד – מֵעֵבֶר לָרָגִיל.');
    } else if (p.id === 'item') {
      const it = pick(freeItems()); S.owned.push(it.id); save();
      art = `<span class="wh-item">${itemThumb(it, S.look)}</span>`; title = `${tx('קִבַּלְתָּ:')} ${tx(it.name)}!`; text = tx('זֶה מְחַכֶּה לְךָ בַּחֲנוּת – בְּחִנָּם.');
      extra = `<button class="btn go" id="whWear">${tx('לִלְבֹּשׁ עַכְשָׁו')}</button>`;
      p.item = it;
    } else if (p.id === 'golden') {
      S.goldenNext = true; save(); title = tx('דַּף זָהָב!'); text = tx('הַפֶּרֶק הֶחָדָשׁ הַבָּא שֶׁלְּךָ יִהְיֶה דַּף זָהָב – כָּל מַטְבֵּעַ כָּפוּל!');
    } else if (p.id === 'fact') {
      const f = pick(factPool()); bonusState().facts.push(f.id); save();
      art = `<div class="fcard flat wh-fact"><span class="fe">${f.e}</span><small>${heroName(f.hero)}</small><p>${tx(f.text)}</p></div>`; title = tx('עֻבְדָּה מַדְהִימָה לָאֹסֶף!');
    } else if (p.id === 'shield') {
      S.shields = Math.min(SHIELD_MAX, (S.shields || 0) + 1); save(); title = tx('מָגֵן רֶצֶף!'); text = tx('אִם תְּפַסְפֵס יוֹם – הָרֶצֶף שֶׁלְּךָ שָׁמוּר.');
    } else if (p.id === 'ticket') {
      const g = await awardTickets(1, 'גלגל המזל');
      if (g) { title = tx('כַּרְטִיס!'); text = `${minutesText(SET.ticketMinutes)} ${tx('שֶׁל מָסָךְ – בִּזְכוּת הַמַּזָּל!')}`; }
      else { addCoins(40, $('#wh')); title = '40 ' + tx('מַטְבְּעוֹת!'); }
    }
    sound(p.id === 'c100' || p.id === 'ticket' ? 'cheer' : 'win'); confetti(p.id === 'c100' ? 90 : 45);
    $('.wheel-pop')?.classList.add('won');
    const left = S.spins || 0;
    $('#whOut').innerHTML = `<div class="wh-prize">${art}<h2 class="display">${title}</h2>${text ? `<p class="story">${text}</p>` : ''}</div>
      <div class="row" style="justify-content:center">${extra}${left ? `<button class="btn gold" id="whAgain">${tx('עוֹד סִבּוּב')} (${left})</button>` : ''}<button class="btn ${extra || left ? 'ghost' : 'go'}" id="whClose">${tx('יֵשׁ!')}</button></div>`;
    $('#whClose').onclick = close;
    if ($('#whAgain')) $('#whAgain').onclick = () => showWheel(close === undefined ? undefined : close);
    if ($('#whWear')) $('#whWear').onclick = () => { S.equipped[p.item.slot] = p.item.id; save(); refreshBar(); closeOverlay(); showShop(); };
    checkBadges(); refreshBar();
  }

  /* ---- 🤝 משימה משותפת עם ההורה: משימה בלי מסך מדי כמה ימים. הילד לוחץ "סִיַּמְנוּ!", ההורה מאשר באזור ההורים (SET.jointOk) ---- */
  const jointOn = () => has('joint') && SET.jointTasks !== false;
  const jointText = t => t.replace(/\{helper\}/g, SET.helperName || 'אַבָּא');
  const jointTask = () => S.joint && JOINT.find(j => j.id === S.joint.id);
  const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
  function ensureJoint(exclude) {
    if (!jointOn()) return null;
    const cur = jointTask(), today = todayStr();
    if (cur && S.joint.status !== 'done') return cur;
    const forced = SET.jointNow === today && !(S.joint && S.joint.at === today);   // ההורה ביקש משימה עכשיו
    if (S.joint && !forced && daysBetween(S.joint.doneAt || S.joint.at, today) < JOINT_EVERY) return null;
    let pool = JOINT.filter(j => !(S.jointDone || []).includes(j.id) && j.id !== exclude);
    if (!pool.length) { S.jointDone = []; pool = JOINT.filter(j => j.id !== exclude); }
    const ok = pool.filter(j => !j.hero || heroMet(j.hero)), mine = ok.filter(j => j.hero);
    const t = pick(mine.length && Math.random() < .5 ? mine : ok.length ? ok : pool);   // לפעמים – משימה על גיבור שהוא פגש
    S.joint = { id: t.id, at: today, status: 'active' }; save(); store.log('joint_new', { id: t.id });
    return t;
  }
  function jointRowHTML() {
    const t = ensureJoint(); if (!t) return '';
    const asked = S.joint.status === 'asked';
    return `<button class="quest joint ${asked ? '' : 'hot'}" id="qJoint"><span class="qi"><span class="qe">🤝</span></span>
      <span class="qb"><b>${tx('מְשִׂימָה עִם')} ${helper()}: ${tx(t.title)}</b><span class="small" style="color:#ffe7a6">${tx(asked ? 'מְחַכִּים לְאִשּׁוּר...' : 'בְּלִי מָסָךְ – יַחַד!')}</span></span>
      <span class="qr">${icon('ticket')}${plus(JOINT_REWARD.tickets)}</span></button>`;
  }
  function showJoint() {
    const t = ensureJoint(); if (!t) return;
    const c = JOINT_CATS[t.cat], asked = S.joint.status === 'asked', canSwap = !asked && S.joint.swap !== todayStr();
    overlay(`<div class="modal joint-pop"><div class="ar-banner small">🤝<span>${tx('מְשִׂימָה עִם')} ${helper()}</span></div>
      <div class="jt-art">${t.e}</div><span class="jt-cat">${c.e} ${tx(c.name)}</span>
      <h2 class="display">${tx(t.title)}</h2><p class="story">${tx(jointText(t.text))}</p>
      <div class="jt-reward">${tx('הַפְּרָס:')} ${icon('ticket')} ${plus(JOINT_REWARD.tickets)} <span>·</span> ${icon('coin')} ${plus(JOINT_REWARD.coins)}</div>
      ${asked ? `<div class="hint">⏳<span>${tx('נִשְׁלְחָה הוֹדָעָה. מְחַכִּים לָאִשּׁוּר שֶׁל')} ${helper()}...</span></div>`
        : `<p class="small">${tx('בְּלִי מָסָךְ! כְּשֶׁתְּסַיְּמוּ – לְחַץ "סִיַּמְנוּ!", וְתִשָּׁלַח הוֹדָעָה לְ')}${helper()}.</p>`}
      <div class="row" style="justify-content:center">${asked ? `<button class="btn go" id="jtClose">${tx('סָגוּר')}</button>`
        : `<button class="btn go big" id="jtDone">${tx('סִיַּמְנוּ!')} 🙌</button><button class="btn ghost" id="jtClose">${tx('אַחַר כָּךְ')}</button>`}</div>
      ${canSwap ? `<button class="jt-swap" id="jtSwap">🔄 ${tx('מְשִׂימָה אַחֶרֶת')}</button>` : ''}</div>`);
    $('#jtClose').onclick = () => { closeOverlay(); if (screen === 'worlds') showWorlds(true); };
    if ($('#jtSwap')) $('#jtSwap').onclick = () => { const old = S.joint.id; S.joint = null; ensureJoint(old); S.joint.swap = todayStr(); save(); sound('page'); showJoint(); };
    if ($('#jtDone')) $('#jtDone').onclick = () => {
      S.joint.status = 'asked'; S.joint.askedAt = todayStr(); save();
      store.notify('joint', { title: plain(tx(t.title)) }); store.log('joint_ask', { id: t.id });
      sound('ok'); confetti(25); showJoint();
    };
  }
  /** ההורה אישר? פרס + חגיגה. נקרא בכניסה לבית ובבדיקה התקופתית */
  async function jointCheck() {
    const ok = SET.jointOk, t = jointTask();
    if (!ok || !t || ok.id !== S.joint.id || S.joint.status === 'done') return false;
    S.joint.status = 'done'; S.joint.doneAt = todayStr(); S.jointDone = [...(S.jointDone || []), t.id]; save();
    const g = await awardTickets(JOINT_REWARD.tickets, 'משימה משותפת: ' + plain(t.title), true);
    store.log('joint_done', { id: t.id });
    sound('cheer'); confetti(80);
    await popup(`<div class="reveal"><div class="rv-new">🤝 ${tx('מְשִׂימָה מְשֻׁתֶּפֶת')}</div><div class="rv-art"><span class="rv-emoji">${t.e}</span></div>
      <h2 class="display">${helper()} ${tx('אִשֵּׁר!')}</h2><p class="story">${tx('"')}${tx(t.title)}${tx('" – הֻשְׁלְמָה. אַתֶּם צֶוֶת מְנַצֵּחַ!')}</p>
      ${ok.note ? `<div class="letter"><div class="letter-head">${icon('letter')} ${helper()} ${tx('כָּתַב:')}</div><div class="story letter-body">${esc(SET.nikud ? (ok.note_nikud || ok.note) : plain(ok.note_nikud || ok.note))}</div></div>` : ''}
      <div class="rewards">${g ? `<span class="rchip">${icon('ticket')} ${plus(g)}</span>` : ''}<span class="rchip">${icon('coin')} ${plus(JOINT_REWARD.coins)}</span></div></div>`, tx('יֵשׁ!'));
    addCoins(JOINT_REWARD.coins, $('#coinsPill')); checkBadges();
    return true;
  }

  /* ---- 🎁 מתנה יומית: 7 קופסאות, אחת בכל יום שמשחקים. ביום ה־7 – תיבת אוצר ---- */
  const giftDue = () => has('gift') && (S.gift || {}).last !== todayStr();
  function openGift(first) {
    return new Promise(res => {
      const G = S.gift = { n: 0, last: null, ...(S.gift || {}) }, k = G.n % 7, amount = DAILY_GIFTS[k], due = G.last !== todayStr();
      overlay(`<div class="modal gift-pop"><div class="ar-banner small">🎁<span>${tx('מַתָּנָה יוֹמִית')}</span></div>
        <p class="small" style="margin:4px 0 10px">${tx(first ? 'חָדָשׁ! כָּל יוֹם שֶׁאַתָּה בָּא – פּוֹתְחִים קֻפְסָה אַחַת. בַּיּוֹם הַ־7 מְחַכָּה תֵּבַת אוֹצָר!' : 'כָּל יוֹם שֶׁאַתָּה בָּא – קֻפְסָה אַחַת. בַּיּוֹם הַ־7: תֵּבַת אוֹצָר!')}</p>
        <div class="gcal">${DAILY_GIFTS.map((c, i) => `<button class="gday ${i < k ? 'got' : ''} ${i === k ? (due ? 'today' : 'tmrw') : ''} ${i === 6 ? 'big' : ''}" ${i === k && due ? 'id="gOpen"' : 'disabled'}>
          <small>${tx('יוֹם')} ${i + 1}</small><span class="gi">${i < k ? icon('check') : i === 6 ? icon('chest') : '🎁'}</span><b>${c} ${icon('coin')}</b></button>`).join('')}</div>
        <p class="display v-tap" id="gMsg">${tx(due ? 'גַּע בַּמַּתָּנָה שֶׁל הַיּוֹם!' : 'אֶת הַמַּתָּנָה שֶׁל הַיּוֹם כְּבָר פָּתַחְתָּ. הַקֻּפְסָה הַבָּאָה – מָחָר!')}</p>
        <div id="gFoot">${due ? '' : `<div class="row" style="justify-content:center"><button class="btn go" id="gOk">${tx('סָגוּר')}</button></div>`}</div></div>`);
      if (!due) { $('#gOk').onclick = () => { closeOverlay(); res(); }; return; }
      sound('magic');
      $('#gOpen').onclick = () => {
        const b = $('#gOpen'); b.onclick = null; b.disabled = true;
        G.n++; G.last = todayStr(); save(); store.log('daily_gift', { day: k + 1, coins: amount });
        b.classList.add('opened'); b.querySelector('.gi').innerHTML = k === 6 ? CHEST_OPEN : '✨';
        addCoins(amount, b); sound(k === 6 ? 'chest' : 'coin'); confetti(k === 6 ? 70 : 25);
        $('#gMsg').textContent = `${tx('קִבַּלְתָּ')} ${amount} ${tx('מַטְבְּעוֹת!')} ${k === 6 ? tx('הִשְׁלַמְתָּ שָׁבוּעַ שָׁלֵם!') : tx('נִתְרָאֶה מָחָר')} 👋`;
        $('#gFoot').innerHTML = `<div class="row" style="justify-content:center"><button class="btn go" id="gOk">${tx('יֵשׁ!')}</button></div>`;
        $('#gOk').onclick = () => { closeOverlay(); res(); };
      };
    });
  }

  /* ---- 🔥 הרצף + 🛡️ מגן רצף ---- */
  function showStreak() {
    const n = S.streak.count, wk = n % 7 || (n ? 7 : 0), sh = S.shields || 0;
    overlay(`<div class="reveal streak-pop"><div class="rv-art">${icon('flame')}</div>
      <h2 class="display">${n} ${tx('יָמִים בָּרֶצֶף')}</h2>
      <div class="week big">${Array.from({ length: 7 }, (_, k) => `<i class="${k < wk ? 'on' : ''}"></i>`).join('')}</div>
      <p class="story">${tx('כָּל יוֹם שֶׁמַּצִּילִים דַּף – הָאֵשׁ גְּדֵלָה. 3 יָמִים = כַּרְטִיס, 7 יָמִים = 2 כַּרְטִיסִים!')}</p>
      ${has('shield') ? `<div class="shields"><div class="sh-row">${Array.from({ length: SHIELD_MAX }, (_, k) => `<span class="${k < sh ? 'on' : ''}">🛡️</span>`).join('')}</div>
        <p class="small">${tx('מָגֵן שׁוֹמֵר עַל הָרֶצֶף אִם מְפַסְפְסִים יוֹם. אֶפְשָׁר לְהַחְזִיק עַד')} ${SHIELD_MAX}.</p>
        ${sh >= SHIELD_MAX ? `<span class="hint">${icon('check')}<span>${tx('יֵשׁ לְךָ מַקְסִימוּם מְגִנִּים')}</span></span>`
          : `<button class="btn gold" id="shBuy" ${S.coins < SHIELD_PRICE ? 'disabled' : ''}>🛡️ ${tx('לִקְנוֹת מָגֵן')} · ${SHIELD_PRICE} ${icon('coin')}</button>`}</div>` : ''}
      <div class="row" style="justify-content:center"><button class="btn go" id="stClose">${tx('סָגוּר')}</button></div></div>`);
    $('#stClose').onclick = closeOverlay;
    if ($('#shBuy')) $('#shBuy').onclick = () => {
      if (S.coins < SHIELD_PRICE || (S.shields || 0) >= SHIELD_MAX) return;
      S.coins -= SHIELD_PRICE; S.shields = (S.shields || 0) + 1; save(); refreshBar(); sound('win'); confetti(20);
      store.log('shield_buy', { price: SHIELD_PRICE }); showStreak();
    };
  }

  /* ---- 🏅 תגים ---- */
  function badgeStats() {
    const P = pr();
    return { pages: epsDone(), heroes: heroesDoneN(), perfect: Object.entries(S.stars || {}).filter(([id, v]) => v >= 3 && !isFree(id)).length,
      heroesAll: heroesOf('history').length, wins: (S.arena || {}).wins || 0, streak: Math.max(S.streak.count, S.bestStreak || 0), letters: S.letters || 0, mathLevel: P.level,
      golden: S.goldenCount || 0, joint: (S.jointDone || []).length, owl: owlStage((S.owl || {}).words || 0), league: (S.league || {}).tier || 0 };
  }
  function checkBadges(silent) {
    S.badges = S.badges || {};
    const x = badgeStats(), got = BADGES.filter(b => !S.badges[b.id] && b.test(x));
    if (!got.length) return [];
    got.forEach(b => { S.badges[b.id] = todayStr(); store.log('badge', { badge: b.id }); });
    save();
    if (has('badges') && !silent) { got.forEach((b, i) => setTimeout(() => toast(b), 500 + i * 2700)); markNew('cards'); }
    return got;
  }
  function toast(b, label = 'תָּג חָדָשׁ!') {
    if (destroyed) return;
    if (KIDS() && Date.now() - kLastAt > 1500) kNarrate(`${label ? tx(label) + ' ' : ''}${tx(b.name)}`);
    const t = document.createElement('div'); t.className = 'btoast';
    t.innerHTML = `<span class="be">${b.e}</span><span class="bt"><small>${tx(label)}</small><b>${tx(b.name)}</b></span>`;
    kgEl.appendChild(t); sound('star', 2);
    setTimeout(() => t.classList.add('out'), 2500); setTimeout(() => t.remove(), 3000);
  }

  /* ---- 🥉 ליגות: בסוף כל שבוע – 3 המקומות הראשונים בטבלה עולים ליגה. לא יורדים אף פעם ---- */
  function checkWeek() {
    const w = S.arena && S.arena.week;
    if (!w || w.key === weekKeyNow()) return;
    if (has('league') && w.games) {
      S.league = { tier: 0, ...(S.league || {}) };
      const rank = w.lastRank || 9, from = S.league.tier;
      if (rank <= 3 && from < LEAGUES.length - 1) {
        S.league.tier++; (S.notes = S.notes || []).push({ t: 'league', from, to: S.league.tier, rank });
        store.log('league_up', { to: S.league.tier, rank });
      }
    }
    ensureWeek(S); save();
  }
  async function showNote(n) {
    if (n.t === 'league') {
      const lg = LEAGUES[n.to]; sound('cheer'); confetti(70); addCoins(50, $('#coinsPill')); const sp = grantSpin('league');
      await popup(`<div class="reveal"><div class="rv-new">${tx('שָׁבוּעַ חָדָשׁ!')}</div><div class="rv-art">${bigE(lg.e)}</div>
        <h2 class="display">${tx('עָלִיתָ לְלִיגַת')} ${tx(lg.name)}!</h2>
        <p class="story">${tx('בַּשָּׁבוּעַ שֶׁעָבַר סִיַּמְתָּ בְּמָקוֹם')} ${n.rank} ${tx('בַּטַּבְלָה. פְּרָס:')} ${plus(50)} ${icon('coin')}${sp ? ` + 🎡 ${tx('סִבּוּב')}` : ''}</p></div>`, tx('יֵשׁ!'));
      checkBadges();
    }
  }
  const leagueTag = () => has('league') && S.league ? `${LEAGUES[S.league.tier].e} ${tx('לִיגַת')} ${tx(LEAGUES[S.league.tier].name)}` : '';

  /** רגעים בכניסה לבית: הודעות, מתנה יומית, ינשוף שגדל, הפתעה חדשה – אחד אחרי השני, אף פעם לא באמצע משהו */
  let momentBusy = false;
  async function homeMoments() {
    if (momentBusy || tour || !S.tutorialDone || overlayOpen() || screen !== 'worlds' || destroyed) return;
    momentBusy = true; let shown = false, cnt = 0;
    const here = () => screen === 'worlds' && !destroyed;
    const room = () => here() && cnt < 2;   // לכל היותר 2 חלונות בכל כניסה לבית – השאר מחכים לפעם הבאה, כדי שהילד יוכל פשוט לשחק
    try {
      checkWeek();
      if (await jointCheck()) { shown = true; cnt++; }
      const notes = (S.notes || []).splice(0); if (notes.length) save();
      for (const n of notes) { await showNote(n); shown = true; cnt++; }
      if (room() && await worldsMoment()) return;   // עולם חדש – לפני כל השאר (קורה פעם אחת)
      if (room() && giftDue()) { await openGift(false); shown = true; cnt++; }
      const st = S.owl ? S.owl.stage || 0 : 0;
      if (room()) { await owlMoment(); if (S.owl && (S.owl.stage || 0) !== st) { shown = true; cnt++; } }
      const before = Object.keys(S.feat || {}).length;
      if (room() && await revealNext()) return;
      if (Object.keys(S.feat || {}).length !== before) shown = true;
      if (shown && here() && !overlayOpen()) showWorlds(true);   // מציירים שוב – כדי שמה שנפתח יופיע בבית
    } finally { momentBusy = false; }
  }

  /** 🌍 נפתחו עולמות חדשים (סיפורים, חלל, קסם, טבע) – מספרים לילד פעם אחת, אחרי הפתיחה */
  function worldsMoment() {
    const fresh = openWorlds().filter(w => w !== 'history' && !(S.seenWorlds || []).includes(w));
    if (!fresh.length || !S.done.includes(LEVELS.history[0].id)) return Promise.resolve(false);
    if (gradual() && epsDone() < 3) return Promise.resolve(false);   // שחקן חדש: קודם מתמקמים בעולם הגיבורים, ואז – הפתעה
    S.seenWorlds = [...(S.seenWorlds || []), ...fresh]; save(); store.log('worlds_new', { worlds: fresh });
    return new Promise(res => {
      overlay(`<div class="modal reveal"><div class="rv-new">${tx('חָדָשׁ!')}</div>
        <h2 class="display">${tx(fresh.length > 1 ? 'נִפְתְּחוּ עוֹלָמוֹת חֲדָשִׁים!' : 'נִפְתַּח עוֹלָם חָדָשׁ!')}</h2>
        <p class="story">${tx('בַּסִּפְרִיָּה שֶׁל יוּבַל הוֹפִיעוּ סְפָרִים חֲדָשִׁים. בְּאֵיזֶה תַּתְחִיל?')}</p>
        <div class="rv-worlds">${fresh.map(id => { const w = WORLDS.find(x => x.id === id);
          return `<button class="rvw" data-w="${id}"><span class="art">${worldArt(id)}</span><b>${w.e} ${tx(w.title)}</b><small>${tx(w.desc)}</small></button>`; }).join('')}</div>
        <div class="row" style="justify-content:center"><button class="btn ghost" id="rvLater">${tx('אַחַר כָּךְ')}</button></div></div>`);
      sound('magic'); confetti(35);
      root.querySelectorAll('#overlayBody .rvw').forEach(b => b.onclick = () => { closeOverlay(); sound('page'); res(true); showMap(b.dataset.w); });
      $('#rvLater').onclick = () => { closeOverlay(); res(false); };
    });
  }

  /* ---------------- דפים יומיים: "להשאיר טעם של עוד" ---------------- */
  const bonusToday = () => { const b = SET.bonusPages; return b && b.date === todayStr() ? (b.n || 0) : 0; };
  function pagesLeftToday() { ensureToday(); return SET.pagesPerDay + bonusToday() + (S.today.extra || 0) - S.today.pages; }   // extra = דף נוסף מגלגל המזל
  /* ---- התקדמות: בוחרים גיבור במפה. בתוך גיבור – פרק אחרי פרק, ותמיד אפשר לחזור לפרק שנגמר ---- */
  const playableOf = c => c.levels.filter(l => !l.locked);
  /* ---- טעינת עונה רק כשצריך: הסיפורים והמשימות של גיבור נטענים כשבוחרים אותו ---- */
  const seasonLoads = {};
  function loadSeason(file) {
    if (!file) return Promise.resolve();
    if (!seasonLoads[file]) {
      const f = SEASON_FILES.find(x => x.file === file);
      seasonLoads[file] = (f ? f.load() : Promise.reject(new Error('no season ' + file))).then(m => {
        (m[f.exp] || []).forEach(ep => { const tgt = Object.values(LEVELS).flat().find(l => l.id === ep.id); if (tgt) Object.assign(tgt, ep); });
      }).catch(e => { delete seasonLoads[file]; throw e; });
    }
    return seasonLoads[file];
  }
  const prefetch = c => { const l = c && c.levels.find(x => x.season); if (l && !l.steps) loadSeason(l.season).catch(() => {}); };
  const chDone = c => playableOf(c).length > 0 && playableOf(c).every(l => S.done.includes(l.id));
  const chStarted = c => c.levels.some(l => S.done.includes(l.id));
  const chNext = c => (c ? playableOf(c).find(l => !S.done.includes(l.id)) : null) || null;
  const freeMode = () => SET.heroOrder !== 'ordered';
  const heroesOf = world => chaptersOf(world).filter(c => playableOf(c).length && !c.levels[0].free);
  const openWorlds = () => WORLDS.filter(w => w.open && LEVELS[w.id]).map(w => w.id);
  const worldHasNext = w => chaptersOf(w).some(c => chAvail(w, c) && !chDone(c));
  /** העולם שבדף הבית: העולם האחרון ששיחקו בו (אם יש בו עוד דפים), אחרת – גיבורי ההיסטוריה */
  const homeWorld = () => { const w = S.lastWorld; return w && w !== 'history' && openWorlds().includes(w) && worldHasNext(w) ? w : 'history'; };
  function chAvail(world, c) {
    if (!playableOf(c).length) return false;                       // "עונה 2" – בקרוב
    if (c.levels[0].free) return true;                             // הפתיחה
    if (!S.done.includes(LEVELS.history[0].id)) return false;      // קודם עושים את הפתיחה (גם לפני העולמות האחרים)
    if (chDone(c) || chStarted(c)) return true;
    const heroes = heroesOf(world), finale = heroes[heroes.length - 1];
    if (!freeMode()) return c === heroes.find(x => !chDone(x));    // לפי הסדר: רק הגיבור הבא
    if (world === 'history' && c === finale) return heroes.filter(x => x !== finale).every(chDone);   // הגילוי של המוחק – בסוף
    return true;
  }
  /** הגיבור שהילד באמצע שלו (או הפתיחה). בבחירה חופשית – null עד שבוחרים במפה */
  function curChapter(world) {
    const chs = chaptersOf(world), pro = chs.find(c => c.levels[0].free);
    if (pro && !chDone(pro)) return pro;
    const c = chs.find(x => x.id === (S.curSeason || {})[world]);
    if (c && !chDone(c) && chAvail(world, c)) return c;
    if (!freeMode() || world !== 'history') return chs.find(x => chAvail(world, x) && !chDone(x)) || null;   // בעולמות האחרים – העונה הבאה
    return null;
  }
  const nextNewLevel = world => chNext(curChapter(world));
  const chapterOfLevel = (world, id) => chaptersOf(world).find(c => c.levels.some(l => l.id === id));
  const isSleeping = lvl => lvl && !lvl.free && !S.done.includes(lvl.id) && pagesLeftToday() <= 0;
  function untilTomorrow() {
    const d = new Date(); d.setHours(24, 0, 0, 0);
    const ms = d - Date.now(), h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
    const hs = h === 1 ? tx('שָׁעָה אַחַת') : h === 2 ? tx('שְׁעָתַיִם') : `${h} ${tx('שָׁעוֹת')}`;
    return h > 0 ? `${hs} ${tx('וְעוֹד')} ${minutesText(m)}` : minutesText(Math.max(1, m));
  }
  const profileOf = () => ({ ...((child && child.intake) || {}), ...(SET.profile || {}) });
  async function refreshSettings() {
    try { const st = await store.childSettings(); if (st) { SET = { ...DEFAULT_SETTINGS, ...st }; if (S) { S.skill = syncSkill(S.skill, profileOf()); kgEl.classList.toggle('bigread', bigFont(S.skill)); } } } catch (e) {}
  }
  /** המסך שאומר שנגמרו הדפים של היום, עם הצצה לדף של מחר */
  async function showSleep(world, celebrate) {
    await refreshSettings();
    kScreen('sleep', K_SCREEN.sleep);
    const next = nextNewLevel(world);
    if (pagesLeftToday() > 0) { showMap(world); return; }
    const allDone = !chaptersOf(world).some(c => chAvail(world, c) && !chDone(c));
    screen = 'sleep'; closeOverlay(); setTab('map');
    app.innerHTML = `<div class="panel sleep">
      ${celebrate ? `<div class="sleep-trophy">${icon('trophy')}</div><h2>${tx('הִצַּלְתָּ אֶת כָּל הַדַּפִּים שֶׁל הַיּוֹם!')}</h2>` : `<div class="sleep-trophy">${icon('moon')}</div><h2>${tx('נִגְמְרוּ הַדַּפִּים שֶׁל הַיּוֹם')}</h2>`}
      <div class="guide flat"><div class="avatar">${guideAvatar()}</div><div class="guide-name">${tx(GUIDE.name)}</div></div>
      <div class="story" style="font-size:26px">
        <p>${tx('{name}, עָבַדְתָּ מְצֻיָּן!')}</p>
        <p>${tx('סֵפֶר הַזְּמַן צָרִיךְ לָנוּחַ בַּלַּיְלָה, כְּדֵי לְהַחְזִיר אֶת הַכֹּחַ הַקָּסוּם שֶׁלּוֹ.')}</p>
        <p>${tx('מָחָר יִפָּתַח דַּף חָדָשׁ...')}</p>
      </div>
      ${next ? `<div class="teaser"><div class="teaser-art">${scene(next.scene, { night: true })}<span>?</span></div>
        <div><small>${tx('הַדַּף שֶׁל מָחָר:')}</small><b>${tx(next.title)}</b></div></div>`
        : allDone ? `<div class="hint">${icon('pencil')}<span>${tx('יוּבַל כּוֹתֵב עַכְשָׁיו דַּפִּים חֲדָשִׁים בִּשְׁבִילְךָ!')}</span></div>`
        : `<div class="hint">${icon('map')}<span>${tx('מָחָר תּוּכַל לִבְחֹר גִּבּוֹר בַּמַּפָּה – וּלְהַמְשִׁיךְ לְהַצִּיל.')}</span></div>`}
      <div class="countdown">${icon('moon')} ${tx('נִפְתָּח בְּעוֹד')} <b>${untilTomorrow()}</b></div>
      <div class="small" style="margin-top:14px">${tx('בֵּינְתַיִם אֶפְשָׁר:')}</div>
      <div class="row" style="justify-content:center;margin-top:8px">
        ${has('practice') ? `<button class="btn go" id="slPractice">${icon('practice')} ${tx('לְהִתְאַמֵּן')}</button>` : ''}
        <button class="btn gold" id="slShop">${icon('shop')} ${tx('לְהִתְלַבֵּשׁ')}</button>
        ${T.riddle ? `<button class="btn purple" id="slRiddle">${icon('scroll')} ${tx('לִפְתֹּר חִידָה')}</button>` : ''}
        <button class="btn ghost" id="slMap">${icon('star')} ${tx('לְשַׁפֵּר כּוֹכָבִים')}</button>
      </div></div>`;
    $('#slShop').onclick = showShop;
    if ($('#slPractice')) $('#slPractice').onclick = showPractice;
    $('#slMap').onclick = () => showMap(world);
    if ($('#slRiddle')) $('#slRiddle').onclick = showRiddle;
    refreshBar();
  }

  /* ---------------- משימת היום + חידה ---------------- */
  function showRiddle() {
    const r = T.riddle; if (!r) return;
    const q = SET.nikud ? (r.question_nikud || r.question) : plain(r.question_nikud || r.question);
    const h = r.hint ? (SET.nikud ? (r.hint_nikud || r.hint) : plain(r.hint_nikud || r.hint)) : '';
    let tries = 0;
    overlay(`${icon('scroll', 'bigico')}<h2 class="display">${tx('חִידָה מֵ')}${helper()}</h2>
      <div class="story" style="font-size:28px">${esc(q)}</div>
      <input type="text" id="rdIn" autocomplete="off" placeholder="${tx('הַתְּשׁוּבָה שֶׁלִּי...')}" style="margin-top:12px">
      <div class="feedback" id="rdFb"></div>
      <div class="row" style="justify-content:center"><button class="btn go" id="rdOk">${tx('בְּדִיקָה')}</button>
${h ? `<button class="btn ghost" id="rdHint">${icon('bulb')} ${tx('רֶמֶז')}</button>` : ''}
        <button class="btn ghost" id="rdClose">${tx('אַחַר כָּךְ')}</button></div>`);
    $('#rdClose').onclick = closeOverlay;
    if (h) $('#rdHint').onclick = () => { $('#rdFb').innerHTML = `<div class="hint">${icon('bulb')}<span>${esc(h)}</span></div>`; };
    $('#rdIn').focus();
    $('#rdIn').onkeydown = e => { if (e.key === 'Enter') $('#rdOk').click(); };
    $('#rdOk').onclick = async () => {
      const v = norm($('#rdIn').value); if (!v) return;
      const ok = (r.answers || []).some(a => { const n = norm(a); return n && (v === n || (n.length >= 3 && v.includes(n))); });
      if (!ok) { tries++; sound('bad'); shake($('#rdIn')); $('#rdFb').style.color = 'var(--gold2)'; $('#rdFb').textContent = tx(pick(RETRY)); return; }
      $('#rdOk').disabled = true; sound('win'); confetti();
      await store.solveRiddle(r.id);
      pr().day.riddle++; save();
      addCoins(r.reward_coins || 20, $('#rdOk'));
      if (r.reward_tickets) await awardTickets(r.reward_tickets, 'חידה נפתרה', true);
      store.notify('riddle', { answer: $('#rdIn').value });
      store.log('riddle_solved', { id: r.id, tries });
      T.riddle = await store.activeRiddle();
      overlay(`${icon('trophy', 'bigico')}<h2 class="display" style="font-size:32px">${tx('פָּתַרְתָּ אֶת הַחִידָה!')}</h2>
        <p class="story" style="font-size:24px">${helper()} ${tx('יְקַבֵּל הוֹדָעָה שֶׁפָּתַרְתָּ.')}</p>
        <div class="row" style="justify-content:center"><button class="btn go" id="rdDone">${tx('יֵשׁ!')}</button></div>`);
      $('#rdDone').onclick = async () => { closeOverlay(); await checkPracticeBonus(); rerender(); };
    };
  }

  /* ---------------- מסכים ---------------- */
  function rerender() {
    if (screen === 'level' && L) renderStep(); else if (screen === 'map') showMap(mapWorld); else if (screen === 'sleep') showSleep(mapWorld, false);
    else if (screen === 'practice') showPractice(); else if (screen === 'cards') showCards(); else if (screen === 'shop') showShop(); else if (screen === 'tickets') showTickets(); else showWorlds();
  }

  function questsHTML() {
    ensureToday();
    const g = SET.dailyGoal, p = Math.min(S.today.pages, g), P = pr(), d = practiceDone(P), dn = d.filter(Boolean).length;
    const reward = (done, n = 1, ic = 'ticket') => done ? `<span class="qr">${icon('check')}</span>` : `<span class="qr">${icon(ic)}${plus(n)}</span>`;
    const bar = (v, max) => `<div class="qbar"><i style="width:${Math.round(v / max * 100)}%"></i><span>${v}/${max}</span></div>`;
    const wk = S.streak.count % 7 || (S.streak.count ? 7 : 0);
    // רק מה שכבר נפתח לילד. מה שעוד לא נפתח – "הַפְתָּעָה בְּעוֹד N פְּרָקִים"
    let h = `<button class="quest ${S.today.goalDone ? 'done' : ''}" id="qPages"><span class="qi">${icon('book')}</span>
        <span class="qb"><b>${tx(`לְהַצִּיל ${g} דַּפִּים חֲדָשִׁים`)}</b>${bar(p, g)}</span>${reward(S.today.goalDone)}</button>`;
    if (has('practice')) h += `<button class="quest ${P.day.bonus ? 'done' : ''}" id="qPractice"><span class="qi">${icon('practice')}</span>
        <span class="qb"><b>${tx('אִימּוּן: חֶשְׁבּוֹן, כְּתִיבָה, חִידָה')}</b>
        <span class="qsteps">${['math', 'pencil', 'puzzle'].map((ic, k) => `<i class="${d[k] ? 'on' : ''}">${icon(d[k] ? 'check' : ic)}</i>`).join('')}</span></span>${reward(P.day.bonus)}</button>`;
    if (T.riddle) h += `<button class="quest hot" id="qRiddle"><span class="qi">${icon('scroll')}</span>
        <span class="qb"><b>${tx('חִידָה מֵ')}${helper()}!</b><span class="small" style="color:#ffe7a6">${tx('פְּתֹר וְתַרְוִיחַ')}</span></span>${reward(false, T.riddle.reward_tickets || T.riddle.reward_coins || 20, T.riddle.reward_tickets ? 'ticket' : 'coin')}</button>`;
    if (has('wheel')) h += `<button class="quest ${S.spins ? 'hot' : ''}" id="qWheel"><span class="qi"><span class="qe">🎡</span></span>
        <span class="qb"><b>${tx('גַּלְגַּל הַמַּזָּל')}</b><span class="small" style="color:#ffe7a6">${S.spins ? `${tx('יֵשׁ לְךָ')} ${S.spins} ${tx(S.spins === 1 ? 'סִבּוּב – סוֹבֵב!' : 'סִבּוּבִים – סוֹבֵב!')}` : tx('מְשִׂימַת הַיּוֹם אוֹ אִימּוּן = סִבּוּב')}</span></span>
        <span class="qr">${S.spins ? `<span class="qe">${S.spins}</span>` : ''}</span></button>`;
    if (has('gift')) h += `<button class="quest ${giftDue() ? 'hot' : 'done'}" id="qGift"><span class="qi"><span class="qe">🎁</span></span>
        <span class="qb"><b>${tx('מַתָּנָה יוֹמִית')}</b><span class="small" style="color:#ffe7a6">${tx(giftDue() ? 'מְחַכָּה לְךָ – פְּתַח!' : 'הַקֻּפְסָה הַבָּאָה – מָחָר')}</span></span>
        <span class="qr">${giftDue() ? icon('coin') : icon('check')}</span></button>`;
    h += owlRowHTML(bar);
    h += `<button class="quest" id="qStreak"><span class="qi">${icon('flame')}</span>
        <span class="qb"><b>${S.streak.count} ${tx('יָמִים בָּרֶצֶף')}${has('shield') && S.shields ? ` <span class="shtag">${'🛡️'.repeat(S.shields)}</span>` : ''}</b><span class="week">${Array.from({ length: 7 }, (_, k) => `<i class="${k < wk ? 'on' : ''}"></i>`).join('')}</span></span>
        <span class="qr">${icon('ticket')}${plus(S.streak.count < 3 ? 1 : 2)}</span></button>`;
    const aw = S.arena && S.arena.week && S.arena.week.key === weekKeyNow() ? S.arena.week : null;
    if (has('arena') && aw && aw.games) { const wr = leaderboard(S).findIndex(r => r.me) + 1;
      h += `<button class="quest" id="qBoard"><span class="qi">${icon('crown')}</span><span class="qb"><b>${tx(SET.endGame === 'arena' ? 'זִירַת הַטְּרִיוְיָה' : 'מֵרוֹץ הַסִּפּוּר')}</b><span class="small" style="color:#ffe7a6">${leagueTag() ? leagueTag() + ' · ' : ''}${tx('מָקוֹם')} ${wr} ${tx('בְּטַבְלַת הַשָּׁבוּעַ')}</span></span><span class="qr">${icon('trophy')}</span></button>`; }
    h = jointRowHTML() + teaserHTML(bar) + h;
    return `<div class="uicard quests"><h3>${icon('chest')} ${tx('מְשִׂימוֹת הַיּוֹם')}<small>${icon('ticket')} ${S.today.tickets}/${SET.dailyTicketCap} ${tx('הַיּוֹם')}</small></h3>${h}</div>`;
  }

  /* ---------------- 🏠 הבית: במה חיה – העולם של הגיבור הנוכחי, יובל מברך, השומר והינשוף, כפתור ענק ---------------- */
  const greetWord = () => { const h = new Date().getHours(); return h >= 5 && h < 12 ? 'בֹּקֶר טוֹב' : h >= 12 && h < 17 ? 'צָהֳרַיִם טוֹבִים' : h >= 17 && h < 21 ? 'עֶרֶב טוֹב' : 'לַיְלָה טוֹב'; };
  const dayNo = () => Math.floor(Date.now() / 86400000);
  const sparkles = n => `<div class="st-spark">${Array.from({ length: n }, (_, i) => `<i style="left:${(i * 37 + 11) % 96}%;top:${(i * 53 + 7) % 70}%;animation-delay:${(i * .7) % 4}s;width:${6 + (i % 3) * 3}px;height:${6 + (i % 3) * 3}px"></i>`).join('')}</div>`;
  /** משפט של יובל – מילה אחרי מילה, כאילו הוא מדבר */
  const words = t => tx(t).split(' ').map((w, i) => `<i style="animation-delay:${(.25 + i * .07).toFixed(2)}s">${w}</i>`).join(' ');
  function yuvalLines() {
    const mine = S.cards.map(id => CARDS[id]).filter(c => c && c.fact).sort(() => Math.random() - .5).slice(0, 5).map(c => `הֲיָדַעְתָּ? ${c.name}: ${c.fact}`);
    return [...mine,
      'הַמּוֹחֵק שׂוֹנֵא קוֹרְאִים. אָז מָה עוֹשִׂים? קוֹרְאִים עוֹד! 😄',
      'הַדָּבָר שֶׁאֲנִי הֲכִי אוֹהֵב? סִפּוּרִים אֲמִתִּיִּים שֶׁנִּשְׁמָעִים כְּמוֹ אַגָּדוֹת.',
      'לִפְנֵי בְּעֵרֶךְ 600 שָׁנָה, בְּאֵירוֹפָּה כָּל סֵפֶר נִכְתַּב בַּיָּד. סֵפֶר אֶחָד – חֳדָשִׁים שֶׁל עֲבוֹדָה!',
      'שָׁמַעְתִּי שֶׁאַתָּה אַלּוּף בְּחֶשְׁבּוֹן... נִרְאֶה אוֹתְךָ בַּפֶּרֶק הַבָּא!',
      'כָּל דַּף שֶׁאַתָּה מַצִּיל – מַחְזִיר גִּבּוֹר אֲמִתִּי לַהִיסְטוֹרְיָה.'];
  }
  const heroHTML = o => `<div class="hero ${o.night ? 'night' : ''}"><div class="hero-art">${scene(o.scene || 'library', { night: o.night })}</div>
      <button class="hero-keeper" id="keeperBtn" title="${tx('לְהִתְלַבֵּשׁ')}">${keeperSVG(S.equipped, { look: S.look })}</button>
      <div class="hero-txt"><span class="kicker">${o.kicker}</span><h2>${o.title}</h2>${o.text ? `<p>${o.text}</p>` : ''}
        <div class="hero-yuval talk" id="stGreet"><button class="hy-pic" id="yuvalBtn" title="${tx('יוּבַל')}"><img src="/guide/yuval.jpg" alt=""><span class="hy-mic">🎙️</span></button>
          <span class="hy-txt"><b>${o.hi}</b> <span id="yuvalSay">${words(o.say)}</span></span></div>
        <div class="row">${o.btn}</div></div></div>`;
  function showWorlds(quiet) {
    closeOverlay(); screen = 'worlds'; setTab('home');
    const world = homeWorld(), hist = world === 'history', cur = curChapter(world), next = chNext(cur), sleeping = isSleeping(next) || (!next && pagesLeftToday() <= 0);
    const allDone = !chaptersOf(world).some(c => chAvail(world, c) && !chDone(c));
    const place = cur && MAPPOS[cur.id] ? MAPPOS[cur.id].place : '';
    const epNo = cur && next ? playableOf(cur).indexOf(next) + 1 : 0;
    const hi = `${tx(greetWord())}, ${esc(S.name || tx('שׁוֹמֵר'))}!`;
    const toMap = `<button class="btn go big pulse" id="playBtn">${icon('map')} ${tx('לַמַּפָּה')}</button>`;
    // מה יובל אומר: לפי המצב, ולפעמים – רמז לדף זהב או למשימה עם ההורה
    let say;
    if (allDone) say = 'הִצַּלְתָּ אֶת כָּל הַדַּפִּים! עַכְשָׁו אֲנִי כּוֹתֵב בִּשְׁבִילְךָ דַּפִּים חֲדָשִׁים...';
    else if (sleeping) say = has('practice') ? 'סֵפֶר הַזְּמַן נָח בַּלַּיְלָה. בֵּינְתַיִם – בּוֹא נִתְאַמֵּן!' : 'סֵפֶר הַזְּמַן נָח בַּלַּיְלָה. מָחָר – דַּפִּים חֲדָשִׁים!';
    else if (!next) say = 'הַמּוֹחֵק תָּלַשׁ דַּפִּים שֶׁל גִּבּוֹרִים מִכָּל הָעוֹלָם. בּוֹא לַמַּפָּה – וּבְחַר אֶת מִי נַצִּיל!';
    else {
      const lines = S.goldenNext ? ['✨ יֵשׁ לִי הַרְגָּשָׁה שֶׁהַדַּף הַבָּא יִהְיֶה מְיֻחָד מְאוֹד...']
        : cur.levels[0].free || S.done.length <= 1 ? ['הַהַרְפַּתְקָה מַתְחִילָה! מוּכָן?']
        : epNo === 1 ? [`הַיּוֹם מַתְחִילִים סִפּוּר חָדָשׁ: ${cur.name}!`]
        : !hist ? [`${cur.name} – הַפֶּרֶק הַבָּא מְחַכֶּה לְךָ!`, 'מָה יִקְרֶה בַּפֶּרֶק הַבָּא? יֵשׁ לִי הַפְתָּעָה...', 'מוּכָן? הַסִּפּוּר מַמְשִׁיךְ!']
        : [`${cur.name} מְחַכֶּה לְךָ – וְהַמּוֹחֵק כְּבָר בַּדֶּרֶךְ!`, 'הַדַּף הַבָּא כְּבָר רוֹעֵד... מַהֵר, לִפְנֵי שֶׁהוּא נִמְחָק!', 'מוּכָן לְעוֹד קְפִיצָה בַּזְּמַן? 🌀', 'רַק אַתָּה יָכוֹל לְהַצִּיל אֶת הַדַּף הַזֶּה!'];
      say = lines[(dayNo() + S.done.length) % lines.length];
    }
    if (!allDone && jointOn() && S.joint && S.joint.status === 'active' && S.joint.at === todayStr()) say = `יֵשׁ לְךָ מְשִׂימָה מְיֻחֶדֶת עִם ${SET.helperName || 'אַבָּא'}! 🤝 הִיא מְחַכָּה לְמַטָּה, בַּמְּשִׂימוֹת.`;
    const hero = allDone ? heroHTML({ scene: 'library', kicker: icon('book') + tx('סֵפֶר הַזְּמַן'), title: tx('הִצַּלְתָּ אֶת כָּל הַדַּפִּים!'), hi, say,
        btn: `<button class="btn gold big" id="playBtn">${icon('map')} ${tx('לַמַּפָּה')}</button>` })
      : sleeping ? heroHTML({ scene: next ? next.scene : 'library', night: true, kicker: icon('moon') + tx(next ? 'הַפֶּרֶק הַבָּא' : 'סֵפֶר הַזְּמַן'), title: tx(next ? next.title : 'נִגְמְרוּ הַדַּפִּים שֶׁל הַיּוֹם'), hi, say,
        btn: `<span class="countdown">${icon('moon')} ${tx('נִפְתָּח בְּעוֹד')} <b>${untilTomorrow()}</b></span>${has('practice') ? `<button class="btn go" id="playBtn">${icon('practice')} ${tx('לַחֲדַר הָאִימּוּנִים')}</button>` : `<button class="btn gold" id="playBtn">${icon('shop')} ${tx('לְהִתְלַבֵּשׁ בַּחֲנוּת')}</button>`}` })
      : !next ? heroHTML({ scene: 'library', kicker: icon('map') + tx('מַפַּת סֵפֶר הַזְּמַן'), title: tx('אֶת מִי תַּצִּיל?'), hi, say, btn: toMap })
      : heroHTML({ scene: next.scene, kicker: icon('map') + tx(cur.name) + (place ? ' · ' + tx(place) : ''), title: tx(next.title), hi, say,
        text: cur.levels[0].free ? '' : `${tx('פֶּרֶק')} ${epNo} ${tx('מִתּוֹךְ')} ${playableOf(cur).length}`, btn: toMap });
    const owlPerch = has('owl') && S.owl ? `<button class="hero-owl" id="owlBtn" title="${owlName()}">${owlSVG(owlStage(S.owl.words))}</button>` : '';
    app.innerHTML = `<div class="lobby">${hero.replace('<div class="hero-txt">', owlPerch + '<div class="hero-txt">')}
      <div class="lobby-grid">${questsHTML()}
        <div class="uicard"><h3>${icon('map')} ${tx('הָעוֹלָמוֹת')}</h3><div class="worlds">${WORLDS.map(w => `
          <button class="world ${w.open ? '' : 'locked'}" data-w="${w.id}">
            <span class="art">${worldArt(w.id)}</span>
            <span class="wtxt"><b>${tx(w.title)}</b><span>${tx(w.desc)}</span>${w.open ? '' : `<span class="lock-tag">${icon('lock')} ${tx(w.lockText)}</span>`}</span>
          </button>`).join('')}</div></div>
      </div>
      <div class="lobby-foot"><button class="howto" id="howto">${icon('help')} ${tx('אֵיךְ מְשַׂחֲקִים?')}</button>
        <button class="howto only-small" id="parentLink">${icon('gear')} ${tx('אֵזוֹר הוֹרִים')}</button></div></div>`;
    prefetch(cur);
    // תמיד דרך המפה: שם בוחרים גיבור וממשיכים לפרק הבא שלו
    $('#playBtn').onclick = () => { if (sleeping && !allDone) { if (has('practice')) showPractice(); else showShop(); } else showMap(world); };
    $('#keeperBtn').onclick = () => { sound('pop'); setTimeout(showShop, 200); };
    // יובל חי: לוחצים עליו – והוא מספר עוד משהו (עובדה מהקלפים שאספת, או בדיחה על המוחק)
    let yi = 0; const yl = [say, ...yuvalLines()];
    const talk = () => { const g = $('#stGreet'); if (!g) return; g.classList.add('talk'); clearTimeout(g._t); g._t = setTimeout(() => g.classList.remove('talk'), 2600); };
    talk(); if (KIDS()) setTimeout(() => { if (screen !== 'worlds' || overlayOpen() || kLocked || tour) return; const seen = (S.kd.seen = S.kd.seen || {}); if (!seen.worlds) { seen.worlds = 1; save(); kNarrate(K_SCREEN.worlds); } else kNarrate(say); }, 600);
    $('#yuvalBtn').onclick = () => { yi = (yi + 1) % yl.length; $('#yuvalSay').innerHTML = words(yl[yi]); sound('pop'); bump($('#yuvalBtn')); talk(); kNarrate(yl[yi]); };
    if ($('#qWheel')) $('#qWheel').onclick = () => { sound('tap'); showWheel(); };
    if ($('#qGift')) $('#qGift').onclick = () => { sound('tap'); openGift(false).then(() => showWorlds(true)); };
    $('#qPages').onclick = () => { if (sleeping) showSleep(world, false); else showMap(world); };
    if ($('#qPractice')) $('#qPractice').onclick = showPractice;
    if ($('#qJoint')) $('#qJoint').onclick = () => { sound('tap'); showJoint(); };
    if ($('#qSurprise')) $('#qSurprise').onclick = () => { if (sleeping) showSleep(world, false); else showMap(world); };
    if ($('#qOwl')) $('#qOwl').onclick = showOwl;
    if ($('#owlBtn')) $('#owlBtn').onclick = () => { sound('pop'); showOwl(); };
    $('#qStreak').onclick = showStreak;
    if ($('#qRiddle')) $('#qRiddle').onclick = showRiddle;
    if ($('#qBoard')) $('#qBoard').onclick = showBoard;
    app.querySelectorAll('.world').forEach(b => b.onclick = () => {
      const w = WORLDS.find(x => x.id === b.dataset.w);
      if (w.open) showMap(w.id); else shake(b);
    });
    $('#howto').onclick = () => startTutorial(false);
    $('#parentLink').onclick = askExit;
    window.scrollTo(0, 0);
    refreshBar();
    if (!quiet) { checkInbox().then(() => setTimeout(homeMoments, 350)); maybeTutorial(); }
  }

  /* ---------------- מפת העולם ---------------- */
  const chCache = {};
  function chaptersOf(world) {   // התוכן לא משתנה – מחשבים פעם אחת, כדי שהשוואות בין פרקים יעבדו
    if (chCache[world]) return chCache[world];
    const out = [];
    LEVELS[world].forEach((l, i) => {
      if (l.chapter || !out.length) out.push({ id: l.id, name: l.chapter || l.title, levels: [] });
      out[out.length - 1].levels.push({ ...l, idx: i });
    });
    return (chCache[world] = out);
  }
  let mapSel = null;
  function showMap(world) {
    closeOverlay(); screen = 'map'; mapWorld = world; if (LEVELS[world] && S.lastWorld !== world) { S.lastWorld = world; save(); } setTab('map');
    const chs = chaptersOf(world), cur = curChapter(world), noPages = pagesLeftToday() <= 0;
    const chState = c => {
      if (!chAvail(world, c)) return 'locked';
      if (chDone(c)) return 'done';
      if (c === cur) return noPages && !c.levels[0].free ? 'sleep' : 'current';
      return chStarted(c) ? 'started' : 'open';
    };
    // מסלולים: בתוך גיבור שהתחילו, ובין גיבורים שכבר הצילו (לפי סדר הסיפור)
    const segs = [];
    chs.forEach((c, k) => {
      const pos = MAPPOS[c.id]; if (!pos) return;
      if (pos.route && chStarted(c)) { let prev = pos.from || pos.dot; pos.route.forEach((r, n) => { const lvDone = c.levels[n + 1] && S.done.includes(c.levels[n + 1].id); segs.push({ from: prev, to: [r[0], r[1]], done: !!lvDone }); prev = [r[0], r[1]]; }); }
      const nc = chs[k + 1], nx = nc && MAPPOS[nc.id];
      if (nx && chDone(c) && (chDone(nc) || chStarted(nc))) segs.push({ from: pos.dot, to: nx.dot, done: chDone(nc) });
    });
    const firstOpen = chs.find(c => chAvail(world, c) && !chDone(c));
    if (!mapSel || !chs.find(c => c.id === mapSel)) mapSel = (cur || firstOpen || chs[0]).id;
    const pct = (v, m) => (v / m * 100).toFixed(2) + '%';
    const pins = chs.map(c => {
      const pos = MAPPOS[c.id]; if (!pos) return '';
      const st = chState(c), first = c.levels.find(l => !l.locked) || c.levels[0];
      const doneN = c.levels.filter(l => S.done.includes(l.id)).length, total = c.levels.filter(l => !l.locked).length;
      const art = pos.art || first.scene;   // לכל גיבור ציור משלו (לא חוזר על עצמו)
      const inner = st === 'locked' && !art ? '<span class="wq">?</span>' : scene(art || 'library', { night: st === 'sleep' }) + (st === 'locked' ? `<div class="lockveil">${icon('lock')}</div>` : '');
      return `<button class="wpin ${st} ${c.id === mapSel ? 'sel' : ''}" data-ch="${c.id}" style="left:${pct(pos.pin[0], MAP_W)};top:${pct(pos.pin[1], MAP_H)}">
          ${c === cur ? `<span class="wme">${keeperSVG(S.equipped, { head: true, look: S.look })}</span>` : ''}
          <span class="wdisc">${inner}</span>${pos.e && st !== 'locked' ? `<span class="wemb ${pos.eside === 'r' ? 'r' : ''}">${pos.e}</span>` : ''}
          <span class="wlabel">${tx(c.name)}${total ? ` <small>${doneN}/${total}</small>` : ''}</span>
        </button>`;
    }).join('');
    // סיכה אדומה במקום האמיתי של כל גיבור + קו אל העיגול שלו. הגיבור שבחרת – קו זהב, סיכה קופצת ושם המקום
    const stemsSVG = () => [...chs].sort((a, b) => (a.id === mapSel) - (b.id === mapSel)).map(c => {
      const p2 = MAPPOS[c.id]; if (!p2 || (p2.pin[0] === p2.dot[0] && p2.pin[1] === p2.dot[1])) return '';
      const sel = c.id === mapSel, lk = !chAvail(world, c), [dx, dy] = p2.dot, [px, py] = p2.pin;
      const place = tx(p2.place || '').split(' – ')[0];
      return `<g class="wst ${sel ? 'sel' : ''} ${lk ? 'lk' : ''}"><path class="wst-l" d="M${px} ${py}L${dx} ${dy}"/>
        <g transform="translate(${dx} ${dy})"><g class="wst-m"><path d="M0 0C-2.6 -4.5 -7 -8 -7 -12.5A7 7 0 1 1 7 -12.5C7 -8 2.6 -4.5 0 0Z"/><circle cy="-12.5" r="2.8"/></g></g>
        ${sel ? `<text class="wst-t" x="${dx}" y="${dy + 15}" text-anchor="middle">${place}</text>` : ''}</g>`;
    }).join('');
    // תחנות בדרך (🏜️ 🏯 🐘 ...) – רק לגיבורים שכבר התחלת, כדי שהמפה תישאר ברורה
    const waypoints = chs.filter(c => chStarted(c) || c.id === mapSel).map(c => (MAPPOS[c.id]?.route || []).map(r => `<span class="wway" style="left:${pct(r[0], MAP_W)};top:${pct(r[1], MAP_H)}">${r[2]}</span>`).join('')).join('');
    const ctaFor = c => {
      const st = chState(c), nx = chNext(c), name = tx(c.name);
      if (st === 'locked') return `<button class="btn ghost next-cta" disabled>${icon('lock')} ${!playableOf(c).length ? tx('בְּקָרוֹב...')
        : !S.done.includes(LEVELS.history[0].id) ? tx('נִפְתָּח אַחֲרֵי הַפְּתִיחָה בְּעוֹלַם הַגִּבּוֹרִים')
        : freeMode() ? tx('הַגִּבּוֹר הַזֶּה נִפְתָּח אַחֲרֵי שֶׁתַּצִּיל אֶת כָּל הַשְּׁאָר') : tx('נִפְתָּח אַחֲרֵי הַגִּבּוֹר הַקּוֹדֵם')}</button>`;
      if (st === 'done') return `<button class="btn ghost next-cta" disabled>${icon('check')} ${tx('הִצַּלְתָּ אֶת כָּל הַפְּרָקִים שֶׁל')} ${name}!</button>`;
      if (noPages && !c.levels[0].free) return `<button class="btn next-cta sleep" id="nextCta">${icon('moon')} ${tx('הַפֶּרֶק הַבָּא נִפְתָּח מָחָר')}</button>`;
      const n = playableOf(c).indexOf(nx) + 1;
      return `<button class="btn go next-cta pulse" id="nextCta">${icon('play')} ${c.levels[0].free ? tx(nx.title) : `${name} · ${tx('פֶּרֶק')} ${n}: ${tx(nx.title)}`}</button>`;
    };
    const wm = WORLD_MAP[world], bgMap = !wm ? worldMapSVG(segs) : wm.kind === 'world' ? worldMapSVG(segs, { inset: false, title: tx(wm.title) }) : themeMapSVG(world, segs);
    const ows = openWorlds(), wtabs = ows.length < 2 ? '' : `<div class="wtabs">${ows.map(id => { const w = WORLDS.find(x => x.id === id);
      return `<button class="wtab ${id === world ? 'on' : ''}" data-w="${id}"><span>${w.e}</span>${tx(w.short || w.title)}${id !== world && worldHasNext(id) && !chaptersOf(id).some(chStarted) ? '<i class="wnew"></i>' : ''}</button>`; }).join('')}</div>`;
    app.innerHTML = `${wtabs}<div class="wmap-scroll ${wm && wm.kind === 'scene' ? 'theme' : ''}"><div class="wmap">${bgMap}
        <svg class="wstems" viewBox="0 0 ${MAP_W} ${MAP_H}" preserveAspectRatio="xMidYMid meet">${stemsSVG()}</svg>
        ${waypoints}${pins}</div></div>
      <div class="cta-wrap" id="ctaWrap"></div>
      <div id="chSheet"></div>`;
    const drawSheet = () => {
      const c = chs.find(x => x.id === mapSel), st = chState(c), pos = MAPPOS[c.id], next = st === 'locked' ? null : chNext(c), nextSleeping = noPages && !c.levels[0].free;
      $('#ctaWrap').innerHTML = ctaFor(c);
      const nc = $('#nextCta');
      if (nc) nc.onclick = () => { if (nextSleeping) showSleep(world, false); else playLevel(world, next.idx); };
      $('#chSheet').innerHTML = `<div class="sheet uicard"><div class="sheet-head"><b>${tx(c.name)}</b><span>📍 ${tx(pos?.place || '')}</span></div>
        <div class="pages">${c.levels.map((l, k) => {
          const done = S.done.includes(l.id), isNext = next && l.id === next.id, sleeping = isNext && nextSleeping;
          const avail = !l.locked && (done || (isNext && !sleeping));
          const stars = S.stars[l.id] || 0;
          return `<button class="page ${done ? 'done' : ''} ${isNext && !sleeping ? 'next' : ''} ${avail ? '' : 'off'}" data-i="${l.idx}" ${l.locked ? 'disabled' : ''}>
            <span class="pthumb">${l.locked ? '<span class="wq">?</span>' : scene(l.scene, { night: sleeping })}${!avail && !sleeping && !l.locked ? `<span class="lockveil">${icon('lock')}</span>` : ''}${sleeping ? `<span class="lockveil moon">${icon('moon')}</span>` : ''}</span>
            ${c.levels.length > 1 && !l.locked ? `<span class="pep">${tx('פֶּרֶק')} ${k + 1}</span>` : ''}<span class="ptitle">${tx(l.title)}</span>
            <span class="pstate">${done ? `${icon('star').repeat(stars)}${icon('starOff').repeat(3 - stars)}${S.aluf[l.id] ? icon('trophy') : ''}` : isNext && !sleeping ? `${tx('שַׂחֵק')}` : sleeping ? tx('נִפְתָּח מָחָר') : icon('lock')}</span>
          </button>`;
        }).join('')}</div></div>`;
      $('#chSheet').querySelectorAll('.page').forEach(b => b.onclick = () => {
        const l = LEVELS[world][+b.dataset.i];
        if (S.done.includes(l.id)) playLevel(world, +b.dataset.i);
        else if (next && l.id === next.id) { if (nextSleeping) showSleep(world, false); else playLevel(world, +b.dataset.i); }
        else { shake(b); sound('bad'); toast({ e: '🔒', name: K_SCREEN.pageLocked }, 'עוֹד נָעוּל'); kNarrate(K_SCREEN.pageLocked); }
      });
    };
    drawSheet(); prefetch(chs.find(x => x.id === mapSel));
    app.querySelectorAll('.wtab').forEach(b => b.onclick = () => { if (b.dataset.w !== world) { sound('page'); showMap(b.dataset.w); } });
    app.querySelectorAll('.wpin').forEach(b => b.onclick = () => {
      mapSel = b.dataset.ch; app.querySelectorAll('.wpin').forEach(x => x.classList.toggle('sel', x === b)); app.querySelector('.wstems').innerHTML = stemsSVG(); drawSheet(); sound('page');
      const cta = $('#ctaWrap .next-cta'); if (cta) { cta.classList.remove('wob'); void cta.offsetWidth; cta.classList.add('wob'); }
      if (KIDS()) { const c = chs.find(x => x.id === mapSel); kNarrate(chState(c) === 'locked' ? K_SCREEN.mapLocked : K_SCREEN.mapGo); }
      prefetch(chs.find(x => x.id === mapSel));
    });
    kScreen('map', $('#nextCta') ? 'גַּע בַּכַּפְתּוֹר הַיָּרֹק לְמַטָּה – וְנַמְשִׁיךְ בַּסִּפּוּר!' : 'בְּחַר גִּבּוֹר בַּמַּפָּה!');
    // בטלפון: גוללים את המפה לפרק הנוכחי
    const sc = app.querySelector('.wmap-scroll'), cp = app.querySelector('.wpin.sel');
    if (sc && cp && sc.scrollWidth > sc.clientWidth) setTimeout(() => cp.scrollIntoView({ inline: 'center', block: 'nearest' }), 100);
    window.scrollTo(0, 0);
    refreshBar(); checkInbox(); maybeTutorial();
  }

  function showCards() {
    closeOverlay(); screen = 'cards'; setTab('cards');
    kScreen('cards');
    const total = Object.keys(CARDS).length;
    const nb = Object.keys(S.badges || {}).length;
    const badgesHTML = has('badges') ? `<h2 class="big-title sub">${tx('הַתָּגִים שֶׁלִּי')}</h2>
        <div class="cards-meter"><div class="qbar"><i style="width:${Math.round(nb / BADGES.length * 100)}%"></i><span>${nb}/${BADGES.length}</span></div></div>
        <div class="badges">${BADGES.map(b => { const got = (S.badges || {})[b.id];
          return `<div class="bdg ${got ? '' : 'off'}"><span class="be">${got ? b.e : icon('lock')}</span><b>${tx(b.name)}</b><small>${tx(b.desc)}</small></div>`; }).join('')}</div>` : '';
    // התגים קודם (מעט ומרגשים), אחר כך הקלפים
    app.innerHTML = `<h1 class="big-title">${tx('הָאֹסֶף שֶׁלִּי')}</h1>${badgesHTML}
      ${badgesHTML ? `<h2 class="big-title sub">${tx('הַקְּלָפִים')}</h2>` : ''}
      <div class="cards-meter"><div class="qbar"><i style="width:${Math.round(S.cards.length / total * 100)}%"></i><span>${S.cards.length}/${total}</span></div></div>
      <div class="cards">${Object.entries(CARDS).map(([id, c]) => {
        const has = S.cards.includes(id);
        return `<div class="ccard ${has ? '' : 'off'}"><div class="e">${c.e}</div><b>${has ? tx(c.name) : '???'}</b><small>${tx(has ? c.fact : 'הַצֵּל עוֹד דַּפִּים כְּדֵי לְגַלּוֹת')}</small></div>`;
      }).join('')}</div>
      <div id="factsBox"></div>
      <div class="credit">${GUIDE_CREDIT}</div>`;
    if (has('bonus')) loadBonus().then(() => {
      const box = $('#factsBox'); if (!box || screen !== 'cards') return;
      const B = bonusState(), mine = BONUS.BONUS_FACTS.filter(f => B.facts.includes(f.id));
      box.innerHTML = `<h2 class="big-title" style="font-size:34px;margin-top:28px">${tx('עֻבְדּוֹת מַדְהִימוֹת')}</h2>
        <div class="cards-meter"><div class="qbar"><i style="width:${Math.round(mine.length / BONUS.BONUS_FACTS.length * 100)}%"></i><span>${mine.length}/${BONUS.BONUS_FACTS.length}</span></div></div>
        ${mine.length ? `<div class="facts-list">${mine.map(f => `<div class="fcard flat"><span class="fe">${f.e}</span><small>${heroName(f.hero)}</small><p>${tx(f.text)}</p></div>`).join('')}</div>`
          : `<p class="subtitle">${tx('קוֹנִים חֲבִילוֹת עֻבְדּוֹת בַּחֲנוּת – בַּלַּשׁוֹנִית "בּוֹנוּסִים".')}</p>`}`;
    }).catch(() => {});
  }

  /* ---------------- חנות הציוד ---------------- */
  let shopTab = 'hat', tryOn = null;
  /* ---- בונוסים בחנות: סיפורי בונוס וחבילות עובדות מדהימות (נטענים רק כשצריך) ---- */
  let BONUS = null, bonusLoading = null;
  const loadBonus = () => bonusLoading || (bonusLoading = import('./bonus.js').then(m => (BONUS = m)).catch(e => { bonusLoading = null; throw e; }));
  const FACT_PRICE = () => SET.factPackPrice ?? 50;
  const bonusState = () => (S.bonus = { owned: [], read: [], facts: [], ...(S.bonus || {}) });
  const heroMet = heroId => { const ch = chaptersOf('history').find(c => c.id === heroId); return !!ch && chStarted(ch); };
  const heroName = heroId => tx(chaptersOf('history').find(c => c.id === heroId)?.name || '');
  function bonusGridHTML() {
    if (!BONUS) return `<div class="loading-page small">${icon('book')}<b>${tx('פּוֹתְחִים...')}</b></div>`;
    const B = bonusState();
    const pool = BONUS.BONUS_FACTS.filter(f => heroMet(f.hero) && !B.facts.includes(f.id));
    const allFacts = BONUS.BONUS_FACTS.length;
    let h = `${tipHTML('bonus')}<button class="bitem pack ${pool.length ? '' : 'off'}" id="factPack">
        <span class="bpack">${['❓', '❓', '❓'].map((q, i) => `<i style="--r:${(i - 1) * 9}deg">${q}</i>`).join('')}</span>
        <span class="btxt"><b>${tx('חֲבִילַת עֻבְדּוֹת מַדְהִימוֹת')}</b><small>${pool.length ? `${Math.min(3, pool.length)} ${tx('עֻבְדּוֹת מַפְתִּיעוֹת עַל הַגִּבּוֹרִים שֶׁפָּגַשְׁתָּ')}` : tx('פְּגֹשׁ עוֹד גִּבּוֹרִים כְּדֵי לְגַלּוֹת עוֹד עֻבְדּוֹת')}</small>
          <small class="bcount">${icon('cards')} ${B.facts.length}/${allFacts} ${tx('בָּאֹסֶף')}</small></span>
        <span class="sprice">${pool.length ? FACT_PRICE() + ' ' + icon('coin') : icon('lock')}</span></button>`;
    h += `<div class="bstories">${BONUS.BONUS_STORIES.map(b => {
      const own = B.owned.includes(b.id), read = B.read.includes(b.id), met = heroMet(b.hero);
      return `<button class="bitem story ${own ? 'own' : ''} ${met || own ? '' : 'off'}" data-b="${b.id}">
        <span class="bthumb">${scene(b.scene, {})}${met || own ? '' : `<span class="lockveil">${icon('lock')}</span>`}${read ? `<span class="bdone">${icon('check')}</span>` : ''}</span>
        <span class="btxt"><small class="bhero">${heroName(b.hero)}</small><b>${tx(b.title)}</b></span>
        <span class="sprice">${own ? (read ? tx('קְרָא שׁוּב') : tx('לִקְרֹא')) : met ? b.price + ' ' + icon('coin') : tx('פְּגֹשׁ קֹדֶם אֶת') + ' ' + heroName(b.hero)}</span>
      </button>`;
    }).join('')}</div>`;
    return h;
  }
  function bindBonus() {
    if (!BONUS) return;
    const B = bonusState();
    $('#factPack').onclick = () => {
      const pool = BONUS.BONUS_FACTS.filter(f => heroMet(f.hero) && !B.facts.includes(f.id));
      if (!pool.length) { shake($('#factPack')); return; }
      if (S.coins < FACT_PRICE()) { sound('bad'); shake($('#factPack')); fly(`${tx('חֲסֵרִים')} ${FACT_PRICE() - S.coins}`, $('#coinsPill')); return; }
      S.coins -= FACT_PRICE(); refreshBar();
      const got = pool.sort(() => Math.random() - .5).slice(0, 3);
      B.facts.push(...got.map(f => f.id)); save(); store.log('facts_pack', { facts: got.map(f => f.id) });
      openFactPack(got);
    };
    app.querySelectorAll('.bitem.story').forEach(el => el.onclick = () => {
      const b = BONUS.BONUS_STORIES.find(x => x.id === el.dataset.b), own = B.owned.includes(b.id);
      if (own) { playBonus(b); return; }
      if (!heroMet(b.hero)) { shake(el); return; }
      overlay(`<div class="bprev">${scene(b.scene, {})}</div><div class="qlabel">${icon('book')} ${tx('סִפּוּר בּוֹנוּס')} · ${heroName(b.hero)}</div>
        <h2 class="display" style="font-size:28px;margin:6px 0">${tx(b.title)}</h2>
        <p class="small">${tx('סִפּוּר אֲמִתִּי שֶׁלֹּא מוֹפִיעַ בָּעוֹנָה. אַחֲרֵי שֶׁקּוֹנִים – אֶפְשָׁר לִקְרֹא אוֹתוֹ שׁוּב וָשׁוּב.')}</p>
        <div class="row" style="justify-content:center">${S.coins >= b.price ? `<button class="btn go" id="bBuy">${tx('לִקְנוֹת וְלִקְרֹא')} · ${b.price} ${icon('coin')}</button>`
          : `<span class="hint">${icon('coin')}<span>${tx('חֲסֵרִים לְךָ עוֹד')} ${b.price - S.coins} ${tx('מַטְבְּעוֹת')}</span></span>`}<button class="btn ghost" id="bNo">${tx('אַחַר כָּךְ')}</button></div>`);
      $('#bNo').onclick = closeOverlay;
      if ($('#bBuy')) $('#bBuy').onclick = () => {
        S.coins -= b.price; B.owned.push(b.id); save(); refreshBar(); sound('win'); confetti(30);
        store.log('bonus_buy', { story: b.id, price: b.price }); playBonus(b);
      };
    });
  }
  function openFactPack(got) {
    sound('magic');
    overlay(`<div class="ar-banner small">${icon('cards')}<span>${tx('עֻבְדּוֹת מַדְהִימוֹת!')}</span></div>
      <div class="facts-open">${got.map((f, i) => `<div class="fcard" style="animation-delay:${.25 + i * .45}s"><span class="fe">${f.e}</span><small>${heroName(f.hero)}</small><p>${tx(f.text)}</p></div>`).join('')}</div>
      <div class="row" style="justify-content:center"><button class="btn go" id="fOk">${tx('וָאוּ!')} ${icon('next')}</button></div>`);
    got.forEach((_, i) => setTimeout(() => sound('star', i), 300 + i * 450));
    $('#fOk').onclick = () => { closeOverlay(); showShop(); };
  }
  function playBonus(b) {
    const lvl = { id: b.id, title: b.title, scene: b.scene, steps: b.steps, free: true, bonus: true };
    L = { world: 'bonus', idx: -1, lvl, step: 0, mistakes: 0, lastRead: null, replay: bonusState().read.includes(b.id), start: Date.now(), words: 0 };
    screen = 'level'; closeOverlay(); setFocus(askLeave);
    renderStep();
  }
  function finishBonus() {
    const B = bonusState(), id = L.lvl.id, first = !B.read.includes(id);
    if (first) B.read.push(id); S.cards = S.cards || []; save();
    store.log('bonus_read', { story: id, mistakes: L.mistakes, seconds: Math.round((Date.now() - L.start) / 1000) });
    sound('win'); confetti(50); setProg(100); setActions('');
    overlay(`<div class="vbanner">${tx('סִפּוּר בּוֹנוּס!')}</div><div class="restored">${scene(L.lvl.scene, {})}</div>
      <p class="story" style="font-size:22px">${tx(first ? 'קָרָאתָ סִפּוּר שֶׁרַק מְעַטִּים מַכִּירִים. עַכְשָׁו אַתָּה יוֹדֵעַ!' : 'כָּל הַכָּבוֹד – קָרָאתָ אוֹתוֹ שׁוּב!')}</p>
      <div class="row" style="justify-content:center"><button class="btn go big" id="bDone">${tx('לַחֲנוּת')} ${icon('next')}</button></div>`);
    $('#bDone').onclick = () => { closeOverlay(); shopTab = 'bonus'; showShop(); };
  }
  function lockInfo(it) {
    if (!it.lock) return null;
    const have = { aluf: Object.keys(S.aluf || {}).length, pages: S.done.length, streak: S.streak.count };
    const [k, need] = Object.entries(it.lock)[0];
    const label = { aluf: 'גְּבִיעֵי אַלּוּף 🏆', pages: 'דַּפִּים שֶׁהִצַּלְתָּ 📖', streak: 'יָמִים בָּרֶצֶף 🔥' }[k];
    return have[k] >= need ? null : { have: have[k], need, label };
  }
  function showShop() {
    closeOverlay(); screen = 'shop'; setTab('shop');
    kScreen('shop');
    if (shopTab === 'bonus' && !has('bonus')) shopTab = 'hat';
    const eq = tryOn ? { ...S.equipped, [tryOn.slot]: tryOn.id } : S.equipped;
    const items = ITEMS.filter(i => i.slot === shopTab);
    let bar = '';
    if (tryOn) {
      const lk = lockInfo(tryOn), miss = tryOn.price - S.coins;
      bar = `<div class="buybar r-${tryOn.r}"><b>${tx(tryOn.name)}</b>
        ${lk ? `<span>${icon('lock')} ${tx('נִפְתָּח אַחֲרֵי')} ${lk.need} ${tx(lk.label)} (${lk.have}/${lk.need})</span>`
          : miss > 0 ? `<span>${tx('חֲסֵרִים לְךָ עוֹד')} ${miss} ${icon('coin')}</span>`
          : `<button class="btn go" id="buyNow">${tx('לִקְנוֹת')} · ${tryOn.price} ${icon('coin')}</button>`}
        <button class="btn ghost" id="tryOff">${icon('close')}</button></div>`;
    }
    app.innerHTML = `<div class="shop2">
      <div class="stage uicard"><div class="stage-keeper">${keeperSVG(eq, { look: S.look })}<div class="pedestal"></div></div>
        <div class="stage-info"><div class="stage-name">${esc(S.name || '')}</div><div class="stage-rank">${icon('crown')} ${tx(rank())}</div>
          <div class="res stage-coins">${icon('coin')}<span>${S.coins}</span></div>
          <button class="btn ghost" id="editLook">${icon('pencil')} ${tx('שַׁנֵּה מַרְאֶה')}</button></div></div>
      ${bar}
      <div class="shop-tabs">${[...SLOTS, ...(has('bonus') ? [{ id: 'bonus', name: 'בּוֹנוּסִים', e: '⭐' }] : [])].map(t => `<button class="stab ${t.id === shopTab ? 'on' : ''} ${t.id === 'bonus' ? 'bonus' : ''}" data-t="${t.id}"><span>${t.e}</span>${tx(t.name)}</button>`).join('')}</div>
      ${shopTab === 'bonus' ? `<div class="bonus-grid">${bonusGridHTML()}</div>` : ''}
      <div class="shop-grid">${items.map(it => {
        const own = S.owned.includes(it.id), on = S.equipped[it.slot] === it.id, lk = !own && lockInfo(it), trying = tryOn && tryOn.id === it.id;
        return `<button class="sitem r-${it.r} ${own ? 'own' : ''} ${on ? 'on' : ''} ${trying ? 'trying' : ''}" data-id="${it.id}">
          <span class="rarity">${tx(RARITY[it.r].name)}</span>
          <span class="sthumb">${itemThumb(it, S.look)}${lk ? `<span class="slock">${icon('lock')}</span>` : ''}</span>
          <b>${tx(it.name)}</b>
          <span class="sprice">${on ? '✔ ' + tx('לָבוּשׁ') : own ? tx('שֶׁלְּךָ') : lk ? `${lk.have}/${lk.need} ${lk.label.split(' ').pop()}` : it.price + ' ' + icon('coin')}</span>
        </button>`;
      }).join('')}</div></div>`;
    app.querySelectorAll('.stab').forEach(b => b.onclick = () => { shopTab = b.dataset.t; tryOn = null; sound('page'); showShop(); });
    app.querySelectorAll('.sitem').forEach(b => b.onclick = () => {
      const it = ITEMS.find(x => x.id === b.dataset.id);
      if (S.owned.includes(it.id)) {
        tryOn = null;
        if (S.equipped[it.slot] === it.id) delete S.equipped[it.slot]; else S.equipped[it.slot] = it.id;
        save(); refreshBar(); sound('ok'); showShop(); return;
      }
      tryOn = tryOn && tryOn.id === it.id ? null : it; sound('page'); showShop();
    });
    $('#editLook').onclick = () => showCreator(() => showShop());
    if (shopTab === 'bonus') { if (BONUS) bindBonus(); else loadBonus().then(() => { if (screen === 'shop' && shopTab === 'bonus') showShop(); }).catch(() => {}); }
    if ($('#tryOff')) $('#tryOff').onclick = () => { tryOn = null; showShop(); };
    if ($('#buyNow')) $('#buyNow').onclick = () => {
      const it = tryOn; tryOn = null;
      S.coins -= it.price; S.owned.push(it.id); S.equipped[it.slot] = it.id; save(); refreshBar();
      sound('win'); confetti(40); store.log('shop_buy', { item: it.id }); showShop(); bump(root.querySelector('.stage-keeper'));
    };
    refreshBar();
  }

  /* ---------------- יצירת הדמות ---------------- */
  function showCreator(onDone, onClose) {
    closeOverlay(); screen = 'creator'; setFocus(onClose || onDone); setProg(100);
    kScreen('creator');
    let L = { ...DEFAULT_LOOK, ...(S.look || {}) };
    const draw = () => {
      const sw = (key, arr) => `<div class="cr-row"><div class="cr-swatches">${arr.map(c => `<button class="sw ${L[key] === c ? 'on' : ''}" data-k="${key}" data-v="${c}" style="background:${c}"></button>`).join('')}</div></div>`;
      app.innerHTML = `<h1 class="big-title">${tx('צוֹר אֶת הַשּׁוֹמֵר שֶׁלְּךָ')}</h1>
        <div class="creator">
          <div class="cr-preview uicard"><div class="stage-keeper">${keeperSVG(S.equipped, { look: L })}<div class="pedestal"></div></div></div>
          <div class="cr-panel panel">
            <h3>${tx('דְּמוּת')}</h3><div class="cr-opts">${LOOK_OPTIONS.body.map(o => `<button class="cr-opt ${L.body === o.id ? 'on' : ''}" data-k="body" data-v="${o.id}">${keeperSVG({}, { look: { ...L, body: o.id }, viewBox: '20 0 80 110' })}<span>${tx(o.name)}</span></button>`).join('')}</div>
            <h3>${tx('תִּסְפֹּרֶת')}</h3><div class="cr-opts">${LOOK_OPTIONS.hair.map(o => `<button class="cr-opt small ${L.hair === o.id ? 'on' : ''}" data-k="hair" data-v="${o.id}">${keeperSVG({}, { look: { ...L, hair: o.id }, head: true })}</button>`).join('')}</div>
            <h3>${tx('צֶבַע שֵׂעָר')}</h3>${sw('hairColor', LOOK_OPTIONS.hairColor)}
            <h3>${tx('צֶבַע עוֹר')}</h3>${sw('skin', LOOK_OPTIONS.skin)}
            <h3>${tx('צֶבַע בֶּגֶד')}</h3>${sw('shirt', LOOK_OPTIONS.shirt)}
            <div class="cr-toggles"><button class="cr-tog ${L.glasses ? 'on' : ''}" data-t="glasses">👓 ${tx('מִשְׁקָפַיִם')}</button><button class="cr-tog ${L.freckles ? 'on' : ''}" data-t="freckles">✨ ${tx('נְמָשִׁים')}</button></div>
          </div></div>`;
      setActions(`<div class="grow"></div><button class="btn go" id="crDone">${tx('זֶה אֲנִי!')} ${icon('next')}</button>`);
      app.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { L = { ...L, [b.dataset.k]: b.dataset.v }; sound('page'); draw(); });
      app.querySelectorAll('.cr-tog').forEach(b => b.onclick = () => { L = { ...L, [b.dataset.t]: !L[b.dataset.t] }; sound('page'); draw(); });
      $('#crDone').onclick = () => { S.look = L; save(); refreshBar(); sound('win'); confetti(25); store.log('avatar', L); onDone && onDone(); };
    };
    draw();
  }

  /* ---------------- כרטיסים (פרסים בעולם האמיתי) ---------------- */
  async function showTickets() {
    closeOverlay(); screen = 'tickets'; setTab(null);
    kScreen('tickets');
    T.balance = await store.ticketBalance(); T.pending = await store.pendingRedemption(); refreshBar();
    ensureToday();
    let n = Math.max(1, Math.min(T.balance, 2)), kind = 'screen';
    // על מה משתמשים בכרטיסים: מסך או כדורגל. הכרטיסים יורדים מיד, ואבא מקבל הודעה
    const REWARDS = [['screen', '📺', 'מָסָךְ'], ['football', '⚽', 'כַּדּוּרֶגֶל']];
    const rw = k => REWARDS.find(r => r[0] === k);
    const draw = () => {
      app.innerHTML = `<h1 class="big-title">${tx('הַכַּרְטִיסִים שֶׁלִּי')}</h1>
        <div class="panel tickets-panel">
          <div class="tk-big">${icon('ticket')}<b>${T.balance}</b></div>
          <div class="story" style="font-size:24px;text-align:center">${tx('כָּל כַּרְטִיס =')} ${minutesText(SET.ticketMinutes)} ${tx('שֶׁל מָסָךְ אוֹ כַּדּוּרֶגֶל')}<br>
            <span class="small">${tx('הַיּוֹם הִרְוַחְתָּ')} ${S.today.tickets} ${tx('מִתּוֹךְ')} ${SET.dailyTicketCap}</span></div>
          ${T.pending ? `<div class="hint" style="justify-content:center;text-align:center">${icon('moon')}<span>${tx('בִּקַּשְׁתָּ')} ${ticketsText(T.pending.tickets)} (${minutesText(T.pending.minutes)}).<br>${tx('מְחַכִּים לְאִשּׁוּר שֶׁל')} ${helper()}.</span></div>
              <div class="row" style="justify-content:center"><button class="btn ghost" id="tkCancel">${icon('close')} ${tx('בַּטֵּל אֶת הַבַּקָּשָׁה')}</button><button class="btn go" id="tkBack">${tx('חֲזָרָה לַמַּפָּה')} ${icon('next')}</button></div>`
          : T.balance > 0 ? `<div class="tk-kinds">${REWARDS.map(([k, e, name]) => `<button class="tk-kind ${k === kind ? 'on' : ''}" data-k="${k}"><span>${e}</span><b>${tx(name)}</b></button>`).join('')}</div>
              <div class="tk-pick"><button class="btn ghost" id="tkMinus">${icon('minus')}</button><div class="tk-n"><b>${n}</b><small>${minutesText(n * SET.ticketMinutes)}</small></div><button class="btn ghost" id="tkPlus">${icon('plus')}</button></div>
              <div class="row" style="justify-content:center"><button class="btn gold big" id="tkUse">${rw(kind)[1]} ${tx('לְהִשְׁתַּמֵּשׁ עַכְשָׁו!')}</button></div>`
          : `<div class="hint" style="justify-content:center">${icon('book')}<span>${tx('עוֹד אֵין כַּרְטִיסִים. כָּל דַּף שֶׁתַּצִּיל = כַּרְטִיס!')}</span></div>`}
          <div class="tk-rules">
            <div>${icon('book')} ${tx('דַּף חָדָשׁ שֶׁהִצַּלְתָּ')} <b>+1</b></div>
            <div>${icon('chest')} ${tx('מְשִׂימַת הַיּוֹם')} <b>+1</b></div>
            <div>${icon('flame')} ${tx('3 יָמִים בָּרֶצֶף')} · ${tx('7 יָמִים')} <b>+1 / +2</b></div>
            ${has('practice') ? `<div>${icon('practice')} ${tx('אִימּוּן יוֹמִי: חֶשְׁבּוֹן + כְּתִיבָה + חִידָה')} <b>+1</b></div>` : ''}
            <div>${icon('scroll')} ${tx('חִידָה מֵ')}${helper()} <b>${icon('ticket')}</b></div>
          </div>
        </div>`;
      if ($('#tkCancel')) {
        $('#tkCancel').onclick = async () => { $('#tkCancel').disabled = true; await store.cancelRedemption(T.pending.id); T.pending = await store.pendingRedemption(); draw(); };
        $('#tkBack').onclick = () => showMap(mapWorld);
      }
      if ($('#tkMinus')) {
        $('#tkMinus').onclick = () => { n = Math.max(1, n - 1); draw(); };
        $('#tkPlus').onclick = () => { n = Math.min(T.balance, n + 1); draw(); };
        app.querySelectorAll('.tk-kind').forEach(b => b.onclick = () => { kind = b.dataset.k; sound('tap'); kNarrate(rw(kind)[2]); draw(); });
        $('#tkUse').onclick = () => {
          const [, e, name] = rw(kind), mins = n * SET.ticketMinutes;
          const q = `לְהִשְׁתַּמֵּשׁ ${n === 1 ? 'בְּכַרְטִיס אֶחָד' : n === 2 ? 'בִּשְׁנֵי כַּרְטִיסִים' : 'בְּ־' + n + ' כַּרְטִיסִים'}? זֶה ${minutesText(mins)} שֶׁל ${name}. הַכַּרְטִיסִים יֵרְדוּ עַכְשָׁו.`;
          overlay(`<div class="rv-art">${bigE(e)}</div><p class="story" style="font-size:24px;text-align:center">${tx(q)}</p>
            <div class="row" style="justify-content:center"><button class="btn ghost" id="tkNo">${tx('לֹא עַכְשָׁו')}</button><button class="btn gold" id="tkYes">${tx('כֵּן!')} ${e}</button></div>`);
          kNarrate(q);
          $('#tkNo').onclick = () => { sound('tap'); closeOverlay(); };
          $('#tkYes').onclick = async () => {
            $('#tkYes').disabled = true; $('#tkNo').disabled = true;
            try { T.balance = await store.useTickets(n, mins, kind); } catch (err) {
              overlay(`<p class="story" style="text-align:center">${tx('מַשֶּׁהוּ לֹא עָבַד. נְנַסֶּה שׁוּב עוֹד רֶגַע.')}</p><div class="row" style="justify-content:center"><button class="btn go" id="tkErr">${tx('בְּסֵדֶר')}</button></div>`);
              $('#tkErr').onclick = closeOverlay; return;
            }
            store.notify('used', { tickets: n, minutes: mins, kind }); store.log('tickets_used', { tickets: n, minutes: mins, kind });
            refreshBar(); sound('cheer'); confetti(50);
            const done = `תֵּהָנֶה! ${minutesText(mins)} שֶׁל ${name}. ${helper()} קִבֵּל הוֹדָעָה.`;
            overlay(`<div class="rv-art">${bigE(e)}</div><h2 class="display" style="text-align:center">${tx('יֵשׁ!')} 🎉</h2><p class="story" style="font-size:24px;text-align:center">${tx(done)}</p>
              <div class="row" style="justify-content:center"><button class="btn go" id="tkOk">${tx('יוֹפִי!')}</button></div>`);
            kNarrate(done);
            $('#tkOk').onclick = () => { closeOverlay(); n = Math.max(1, Math.min(T.balance, 2)); draw(); };
          };
        };
      }
    };
    draw();
  }

  /* ---------------- חדר האימונים ---------------- */
  const PR0 = { level: 0, up: 0, rounds: 0, best: 0, writes: 0, solved: [], skipped: [], day: null };
  const STATIONS = ['🧮', '✍️', '🧩'];
  function pr() {
    // מעדכנים את אותו אובייקט (לא מחליפים אותו) – אחרת מונים שנשמרו באמצע סבב הולכים לאיבוד
    if (!S.practice) S.practice = {};
    const P = S.practice;
    for (const k in PR0) if (P[k] === undefined) P[k] = Array.isArray(PR0[k]) ? [] : PR0[k];
    if (!P.level) P.level = START_LEVEL(+(child && child.grade) || 3);
    if (!P.day || P.day.date !== todayStr()) P.day = { date: todayStr(), math: 0, write: false, riddle: 0, seen: 0, bonus: false };
    return P;
  }
  const practiceDone = P => [P.day.math > 0, !!P.day.write, P.day.riddle > 0];
  const dayPrompt = () => { const d = new Date(), n = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000); return PROMPTS[n % PROMPTS.length]; };
  const minWordsPractice = P => Math.max(5, Math.round(Math.min(20, 10 + Math.floor(P.writes / 3)) * (S.skill ? S.skill.write.f : 1)));
  /** האימון היומי: חשבון + כתיבה + חידה = כרטיס בונוס */
  async function checkPracticeBonus() {
    const P = pr();
    if (P.day.bonus || !practiceDone(P).every(Boolean)) return false;
    P.day.bonus = true; save();
    const got = await awardTickets(1, 'אימון יומי בחדר האימונים');
    const spin = grantSpin('practice');
    store.log('practice_daily', {});
    sound('magic'); confetti(50);
    await popup(`${icon('trophy', 'bigico')}<h2 class="display" style="font-size:32px">${tx('הָאִימּוּן הַיּוֹמִי הֻשְׁלַם!')}</h2>
      <p class="story" style="font-size:24px">${tx('חֶשְׁבּוֹן, כְּתִיבָה וְחִידָה – כְּמוֹ שׁוֹמֵר זְמַן אֲמִתִּי.')}<br>
      ${got ? tx('קִבַּלְתָּ כַּרְטִיס בּוֹנוּס!') + ' ' + icon('ticket') : tx('הַכַּרְטִיסִים שֶׁל הַיּוֹם כְּבָר אָזְלוּ, אָז קִבַּלְתָּ 30 מַטְבְּעוֹת בּוֹנוּס!')}
      ${spin ? `<br>🎡 ${tx('וְגַם סִבּוּב בְּגַלְגַּל הַמַּזָּל!')}` : ''}</p>`, tx('יֵשׁ!'));
    addCoins(got ? 15 : 30, $('#coinsPill'));
    return true;
  }
  function showPractice() {
    if (KIDS()) { showKidsPractice(); return; }
    closeOverlay(); screen = 'practice'; setTab('practice');
    const P = pr(), d = practiceDone(P), pm = dayPrompt(), left = RIDDLES.filter(r => !P.solved.includes(r.id)).length;
    const st = (id, cls, done, art, title, body, foot) => `<button class="station ${cls} ${done ? 'done' : ''}" id="${id}">
        <span class="st-art">${art}</span>${done ? `<span class="st-check">${icon('check')}</span>` : ''}
        <span class="st-body"><b>${title}</b><span>${body}</span></span><span class="st-foot">${foot}</span></button>`;
    const riddleFoot = T.riddle ? `${tx('יֵשׁ חִידָה חֲדָשָׁה מֵ')}${helper()}!`
      : P.day.seen >= 3 ? tx('חִידוֹת חֲדָשׁוֹת מָחָר') : !left ? tx('פָּתַרְתָּ אֶת כֻּלָּן!') : tx('לַחִידָה הַבָּאָה');
    app.innerHTML = `<div class="practice">
      <div class="pr-head"><div class="avatar">${guideAvatar()}</div>
        <div><h1 class="big-title">${tx('חֲדַר הָאִימּוּנִים')}</h1>
        <p>${tx('כָּל שׁוֹמֵר זְמַן מִתְאַמֵּן כָּל יוֹם. עֲבֹר בִּשְׁלוֹשׁ הַתַּחֲנוֹת – וְקַבֵּל כַּרְטִיס בּוֹנוּס!')}</p></div></div>
      <div class="pr-goal uicard ${P.day.bonus ? 'done' : ''}">
        ${['math', 'pencil', 'puzzle'].map((ic, i) => `<span class="${d[i] ? 'on' : ''}">${icon(d[i] ? 'check' : ic)}</span>`).join('<i></i>')}
        <b>${P.day.bonus ? tx('הֻשְׁלַם הַיּוֹם!') + ' ' + icon('check') : `${d.filter(Boolean).length}/3 → ${plus(1)} ${icon('ticket')}`}</b></div>
      <div class="stations">
        ${st('stMath', 'st-math', d[0], icon('math'), tx('זִירַת הַחֶשְׁבּוֹן'), tx('5 תַּרְגִּילִים. כְּכָל שֶׁתַּצְלִיחַ – הָרָמָה תַּעֲלֶה!'),
          `<span class="st-lv">${tx('רָמָה')} ${P.level} <em>${icon('star').repeat(P.level)}${icon('starOff').repeat(5 - P.level)}</em></span>${d[0] ? tx('אֶפְשָׁר עוֹד סִבּוּב') : tx('לְהַתְחִיל')}`)}
        ${st('stWrite', 'st-write', d[1], icon('pencil'), tx('סַדְנַת הַכְּתִיבָה'), `${tx('הַנּוֹשֵׂא שֶׁל הַיּוֹם:')} <q>${tx(pm.q)}</q>`,
          d[1] ? `${tx('נִשְׁלַח לְ')}${helper()} · ${tx('נוֹשֵׂא חָדָשׁ מָחָר')}` : `${tx('לִכְתֹּב לְ')}${helper()} (${minWordsPractice(P)} ${tx('מִלִּים')})`)}
        ${st('stRiddle', 'st-riddle', d[2], icon('puzzle'), tx('מְעָרַת הַחִידוֹת'), `${tx('פָּתַרְתָּ')} ${P.solved.length} ${tx('מִתּוֹךְ')} ${RIDDLES.length} ${tx('חִידוֹת')}`, riddleFoot)}
      </div></div>`;
    $('#stMath').onclick = playMath;
    $('#stWrite').onclick = () => {
      if (pr().day.write) { popup(`${icon('letter', 'bigico')}<p class="story" style="font-size:26px">${tx('כְּבָר כָּתַבְתָּ הַיּוֹם – כָּל הַכָּבוֹד!')}<br>${tx('מָחָר יְחַכֶּה לְךָ נוֹשֵׂא חָדָשׁ.')}</p>`, tx('בְּסֵדֶר')); return; }
      playWrite();
    };
    $('#stRiddle').onclick = playPracticeRiddle;
    refreshBar();
  }

  /* --- זירת החשבון: 5 תרגילים, הרמה מתאימה את עצמה --- */
  let curQ = null;
  function playMath() {
    const P = pr(), lv = P.level, extra = P.day.math >= 3;
    const qs = Array.from({ length: 5 }, (_, i) => makeProblem(lv, lv >= 2 && (i === 1 || i === 3)));
    let i = 0, score = 0, combo = 0;
    screen = 'practice-math'; setFocus(showPractice); const pTok = kgTok;
    const draw = () => {
      const q = qs[i]; curQ = q; let tries = 0, val = '', busy = false;
      const shown = q.text ? `<div class="question">${tx(q.text)}</div><div class="numdisplay" id="tgt"></div>`
        : `<div class="eq" dir="ltr">${q.missing ? q.eq.replace('□', '<span class="box" id="tgt"></span>') : `${q.eq} = <span class="box" id="tgt"></span>`}</div>`;
      setProg(i / qs.length * 100); hideSheet();
      app.innerHTML = `<div class="panel math-panel">
          <div class="math-top"><span class="tagp">${icon('math')} ${tx('רָמָה')} ${lv}</span><span class="combo ${combo >= 2 ? 'hot' : ''}">${combo >= 2 ? icon('flame') + ' ' + tx('רֶצֶף') + ' ' + combo : ''}</span><span class="tagp">${i + 1}/5</span></div>
          ${i === 0 ? tipHTML('pmath') : ''}${shown}
          <div class="numwrap"><div class="numpad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => `<button data-n="${n}">${n}</button>`).join('')}<button class="del" id="del">${icon('backspace')}</button></div></div>
          <div class="feedback" id="fb"></div></div>`;
      setActions(`<div class="grow"></div><button class="btn go" id="ok">${tx('בְּדִיקָה')}</button>`);
      const tgt = $('#tgt'), fb = $('#fb'), upd = () => { tgt.textContent = val || (q.text ? '' : '?'); };
      upd();
      const press = n => { if (!busy && val.length < 4) { val += n; upd(); } };
      app.querySelectorAll('.numpad button[data-n]').forEach(b => b.onclick = () => press(b.dataset.n));
      $('#del').onclick = () => { val = val.slice(0, -1); upd(); };
      const go = () => { if (destroyed || pTok !== kgTok || screen !== 'practice-math') return; i++; if (i < qs.length) draw(); else finish(); };
      $('#ok').onclick = () => {
        if (!val || busy) return;
        if (+val === q.answer) {
          busy = true; const first = tries === 0;
          if (first) { score++; combo++; } else combo = 0;
          const c = extra ? 1 : first ? 4 + Math.min(combo, 4) : 2;
          sound('ok'); addCoins(c, tgt);
          tgt.classList.add('good'); showSheet('good', tx(pick(PRAISE)), gain(c), 950);
          setTimeout(go, 900);
        } else {
          tries++; combo = 0; sound('bad'); shake(tgt);
          if (tries >= 2) {
            busy = true;
            showSheet('bad', `${tx('הַתְּשׁוּבָה הַנְּכוֹנָה:')} <bdi dir="ltr">${q.answer}</bdi>`, tx('לֹא נוֹרָא – מַמְשִׁיכִים!'), 2300);
            val = String(q.answer); upd(); tgt.classList.add('reveal');
            setTimeout(go, 2300);
          } else { showSheet('bad', tx(pick(RETRY)), '', 1300); val = ''; upd(); }
        }
      };
      keyHandler = e => {
        if (screen !== 'practice-math' || overlayOpen()) return;
        if (/^\d$/.test(e.key)) press(e.key);
        if (e.key === 'Backspace') { val = val.slice(0, -1); upd(); }
        if (e.key === 'Enter') $('#ok')?.click();
      };
    };
    const finish = async () => {
      keyHandler = null; setTab('practice');
      P.rounds++; P.day.math++; P.best = Math.max(P.best || 0, score);
      let change = 0;
      const up = () => { P.up = 0; if (P.level < 5) { P.level++; change = 1; } };
      if (score === 5) up();
      else if (score === 4) { P.up++; if (P.up >= 2) up(); }
      else { P.up = 0; if (score <= 2 && P.level > 1) { P.level--; change = -1; } }
      save(); store.log('practice_math', { level: lv, score, newLevel: P.level }); checkBadges();
      if (!extra) addCoins(score === 5 ? 20 : 10, $('#coinsPill'));
      if (score >= 4) { sound('win'); confetti(score === 5 ? 45 : 20); }
      app.innerHTML = `<div class="panel pr-result">
        ${icon(score === 5 ? 'trophy' : score >= 3 ? 'star' : 'bulb', 'bigico')}
        <h2 class="display">${score === 5 ? tx('מֻשְׁלָם! 5 מִתּוֹךְ 5') : `${score} ${tx('מִתּוֹךְ')} 5 ${tx('בְּנִסָּיוֹן רִאשׁוֹן')}`}</h2>
        <div class="pr-dots">${Array.from({ length: 5 }, (_, k) => icon(k < score ? 'star' : 'starOff')).join('')}</div>
        ${change > 0 ? `<div class="lvup">${icon('crown')} ${tx('עָלִיתָ לְרָמָה')} ${P.level}!</div>`
          : change < 0 ? `<div class="hint">${icon('bulb')}<span>${tx('נִתְאַמֵּן קְצָת בְּרָמָה')} ${P.level}, ${tx('וְאָז נַעֲלֶה שׁוּב.')}</span></div>`
          : score === 4 && P.up === 1 ? `<div class="hint">${icon('crown')}<span>${tx('עוֹד סִבּוּב כָּזֶה – וְעוֹלִים רָמָה!')}</span></div>` : ''}
        ${extra ? `<div class="small">${tx('אַחֲרֵי 3 סִבּוּבִים בַּיּוֹם – מַטְבֵּעַ אֶחָד לְכָל תְּשׁוּבָה.')}</div>` : ''}
        <div class="row" style="justify-content:center"><button class="btn gold" id="again">${icon('math')} ${tx('עוֹד סִבּוּב')}</button><button class="btn go" id="back">${tx('לַחֲדַר הָאִימּוּנִים')} ${icon('next')}</button></div></div>`;
      if (change > 0) sound('magic');
      $('#again').onclick = playMath; $('#back').onclick = showPractice;
      await checkPracticeBonus();
    };
    draw();
  }

  /* --- סדנת הכתיבה: נושא יומי, המכתב נשלח לאבא --- */
  function playWrite() {
    const P = pr(), pm = dayPrompt(), minW = minWordsPractice(P);
    screen = 'practice-write'; setFocus(showPractice); setProg(30);
    app.innerHTML = `<div class="panel">
      <div class="pr-title">${icon('pencil')} ${tx('סַדְנַת הַכְּתִיבָה')}</div>${tipHTML('pwrite')}
      <div class="question">${tx(pm.q)}</div>
      <div class="chips" style="min-height:0;margin-bottom:12px">${pm.starters.map(w => `<button class="chip" data-w="${esc(tx(w))}">${tx(w)}</button>`).join('')}</div>
      <textarea id="ta" placeholder="${tx('כְּתֹב כָּאן...')}"></textarea>
      <div class="meter"><i id="mt"></i></div><div class="meter-label" id="ml"></div>
      <div class="feedback" id="fb"></div></div>`;
    setActions(`<div class="grow"></div><button class="btn gold main" id="ok" disabled>${icon('letter')} ${tx('שְׁלַח לְ')}${helper()} <small class="cost" id="okLeft"></small></button>`);
    const ta = $('#ta'), cnt = () => ta.value.trim().split(/\s+/).filter(Boolean).length;
    const upd = () => {
      const n = cnt(); $('#mt').style.width = Math.min(100, n / minW * 100) + '%'; setProg(30 + Math.min(70, n / minW * 70));
      $('#okLeft').textContent = n < minW ? `(${tx('עוֹד')} ${minW - n} ${tx('מִלִּים')})` : '';   // רואים כמה חסר גם כשהמקלדת פתוחה
      $('#ml').textContent = n >= minW ? tx('✔ מְצֻיָּן! אֶפְשָׁר לִשְׁלֹחַ (וְגַם לְהוֹסִיף עוֹד)') : tx(minW - n === 1 ? 'עוֹד מִלָּה אַחַת' : `עוֹד ${minW - n} מִלִּים`);
      $('#ok').disabled = n < minW;
    };
    app.querySelectorAll('.chip').forEach(c => c.onclick = () => { ta.value = (ta.value.trim() + ' ' + c.dataset.w + ' ').trimStart(); ta.focus(); upd(); });
    ta.oninput = upd; upd();
    $('#ok').onclick = async () => {
      const n = cnt(); $('#ok').disabled = true;
      P.writes++; P.day.write = true; S.tasks++; S.firstTry++; S.letters = (S.letters || 0) + 1; feedOwl(n); adapted(noteWrite(S.skill, n, minWordsPractice(P))); save(); checkBadges();
      store.sendLetter('practice', ta.value).catch(() => {});
      store.notify('letter', { text: ta.value.slice(0, 140), level: 'סדנת הכתיבה' });
      store.log('practice_write', { words: n });
      sound('win'); confetti(25); addCoins(20 + Math.min(15, n - minW), $('#ok'));
      await popup(`${icon('letter', 'bigico')}<h2 class="display" style="font-size:32px">${tx('הַמִּכְתָּב נִשְׁלַח!')}</h2>
        <p class="story" style="font-size:24px">${n} ${tx('מִלִּים – כָּל הַכָּבוֹד!')}<br>${helper()} ${tx('יִקְרָא וְיַעֲנֶה לְךָ.')}</p>`, tx('יֵשׁ!'));
      if (!(await checkPracticeBonus())) showPractice(); else showPractice();
    };
  }

  /* --- מערת החידות: קודם החידה של אבא, אחר כך מהמאגר. עד 3 ביום --- */
  function playPracticeRiddle() {
    if (T.riddle) { showRiddle(); return; }
    const P = pr();
    if (P.day.seen >= 3) { popup(`${icon('moon', 'bigico')}<p class="story" style="font-size:26px">${tx('3 חִידוֹת בְּיוֹם אֶחָד – מוֹחַ שֶׁל בַּלָּשׁ!')}<br>${tx('מָחָר יְחַכּוּ לְךָ חִידוֹת חֲדָשׁוֹת.')}</p>`, tx('בְּסֵדֶר')); return; }
    let r = RIDDLES.find(x => !P.solved.includes(x.id) && !P.skipped.includes(x.id));
    if (!r) { P.skipped = []; r = RIDDLES.find(x => !P.solved.includes(x.id)); }
    if (!r) { popup(`${icon('trophy', 'bigico')}<p class="story" style="font-size:26px">${tx('פָּתַרְתָּ אֶת כָּל הַחִידוֹת בַּמְּעָרָה!')}<br>${tx('בַּקֵּשׁ מֵ')}${helper()} ${tx('חִידָה חֲדָשָׁה.')}</p>`, tx('יֵשׁ!')); return; }
    screen = 'practice-riddle'; setFocus(showPractice); setProg(P.day.seen / 3 * 100 + 8);
    let tries = 0, hinted = false;
    const num = P.solved.length + 1;
    app.innerHTML = `<div class="panel riddle-cave">
      <div class="cave-top"><span class="cave-art">${icon('puzzle')}</span><div><div class="pr-title">${tx('מְעָרַת הַחִידוֹת')}</div><small>${tx('חִידָה מִסְפָּר')} ${num}</small></div></div>
      <div class="story riddle-q">${tx(r.q)}</div>
      <input type="text" id="rIn" autocomplete="off" placeholder="${tx('הַתְּשׁוּבָה שֶׁלִּי...')}">
      <div class="feedback" id="fb"></div></div>`;
    setActions(`<button class="btn ghost" id="rHint">${icon('bulb')} ${tx('רֶמֶז')}</button><button class="btn ghost hidden" id="rGive">🏳️ ${tx('גַּלֵּה לִי')}</button>
      <div class="grow"></div><button class="btn go" id="rOk">${tx('בְּדִיקָה')}</button>`);
    const fb = $('#fb');
    $('#rIn').focus();
    $('#rIn').onkeydown = e => { if (e.key === 'Enter') $('#rOk').click(); };
    $('#rHint').onclick = () => { hinted = true; $('#rHint').disabled = true; fb.insertAdjacentHTML('afterend', `<div class="hint">${icon('bulb')}<span>${tx(r.hint)}</span></div>`); };
    const after = (solved) => {
      P.day.seen++; save();
      const more = P.day.seen < 3 && RIDDLES.some(x => !P.solved.includes(x.id));
      setProg(P.day.seen / 3 * 100);
      setActions(`${more ? `<button class="btn gold" id="rNext">${icon('puzzle')} ${tx('עוֹד חִידָה')}</button>` : ''}<div class="grow"></div><button class="btn go" id="rDone">${tx('לַחֲדַר הָאִימּוּנִים')} ${icon('next')}</button>`);
      if (more) $('#rNext').onclick = playPracticeRiddle;
      $('#rDone').onclick = showPractice;
      $('#rIn').disabled = true;
      if (solved) checkPracticeBonus();
    };
    $('#rOk').onclick = () => {
      const v = norm($('#rIn').value); if (!v) return;
      const ok = r.a.some(a => { const n = norm(a); return n && (v === n || (n.length >= 3 && v.includes(n))); });
      if (!ok) {
        tries++; sound('bad'); shake($('#rIn')); showSheet('bad', tx(pick(RETRY)), tries >= 2 ? tx('אֶפְשָׁר לְבַקֵּשׁ רֶמֶז, אוֹ לְגַלּוֹת אֶת הַתְּשׁוּבָה') : '', 1500);
        if (tries >= 2) $('#rGive').classList.remove('hidden');
        return;
      }
      sound('win'); confetti(30);
      P.solved.push(r.id); P.skipped = P.skipped.filter(x => x !== r.id); P.day.riddle++;
      addCoins(tries === 0 && !hinted ? 15 : 8, $('#rOk'));
      store.log('practice_riddle', { id: r.id, tries, hinted });
      fb.style.color = 'var(--ok)'; fb.innerHTML = `${tx('נָכוֹן!')} ${tx('הַתְּשׁוּבָה:')} <b>${tx(r.show)}</b>`;
      showSheet('good', tx(pick(PRAISE)), gain(tries === 0 && !hinted ? 15 : 8), 1400);
      after(true);
    };
    $('#rGive').onclick = () => {
      P.skipped.push(r.id); store.log('practice_riddle_reveal', { id: r.id });
      fb.style.color = 'var(--ink)'; fb.innerHTML = `${tx('הַתְּשׁוּבָה הָיְתָה:')} <b>${tx(r.show)}</b>. ${tx('נִשְׁמֹר אוֹתָהּ לְפַעַם אַחֶרֶת!')}`;
      after(false);
    };
  }

  /* ---------------- שלב ---------------- */
  let playTok = 0;
  function playLevel(world, idx) {
    const base = LEVELS[world][idx]; if (!base || base.locked) return Promise.resolve();   // "עונה 2" נעולה – אין מה לשחק
    if (!base.steps) {   // העונה עוד לא נטענה – טוענים ואז ממשיכים
      const tok = ++playTok; screen = 'loading'; closeOverlay();
      app.innerHTML = `<div class="loading-page">${icon('book')}<b>${tx('פּוֹתְחִים אֶת הַסֵּפֶר...')}</b><span class="dots big"><i></i><i></i><i></i></span></div>`;
      return loadSeason(base.season).then(() => { if (!destroyed && tok === playTok && screen === 'loading') playLevel(world, idx); })
        .catch(() => { if (tok !== playTok) return; app.innerHTML = `<div class="panel loading-page">${icon('book')}<b>${tx('הַסֵּפֶר לֹא נִפְתַּח – אוּלַי אֵין אִינְטֶרְנֶט?')}</b>
          <button class="btn go" id="retryLoad">${tx('לְנַסּוֹת שׁוּב')}</button></div>`; $('#retryLoad').onclick = () => playLevel(world, idx); });
    }
    if (!base.free && !S.done.includes(base.id)) { const ch = chapterOfLevel(world, base.id); if (ch) { S.curSeason = { ...(S.curSeason || {}), [world]: ch.id }; mapSel = ch.id; } }
    if (!base.bonus && LEVELS[world]) S.lastWorld = world;
    const steps = [...base.steps];
    // כל דף נגמר בזירת טריוויה (במקום שאלת האלוף הבודדת)
    const quiz = base.free || !has('arena') ? [] : buildQuiz(base, ALUF[base.id]);   // הזירה נפתחת אחרי כמה פרקים
    // ⚡ אתגר חשבון בכל פרק – ברמה של הילד (עולה ויורדת לפי ההצלחה)
    const mlv = base.free ? null : mathChallenge(S.skill, pr().level);
    if (mlv) { const pb = makeProblem(mlv, true); if (pb.text) steps.splice(Math.max(1, steps.length - 1), 0, { t: 'number', q: pb.text, answer: pb.answer, challenge: true, hint: 'קְרָא שׁוּב לְאַט, וְחַשֵּׁב שָׁלָב אַחֲרֵי שָׁלָב.' }); }
    if (quiz.length >= 3) steps.push({ t: 'arena', quiz });
    // 🎬 סרטון בכל פרק: הסרטון שמתאים לפרק הזה (ep), ואם אין – סרטון אחר של הגיבור שעוד לא ראה. רק סרטונים שההורה אישר
    if (!base.free && !base.bonus && base.season) {
      const topic = topicOfSeason(base.season), ch = chapterOfLevel(world, base.id), ei = ch ? playableOf(ch).findIndex(x => x.id === base.id) : -1;
      const unseen = v => !(S.videosSeen || []).includes(videoKey(v));
      const forEp = list => [...list.filter(v => v.ep === ei + 1), ...list.filter(v => v.ep !== ei + 1)].filter(unseen);
      const own = topic ? forEp(videosFor(topic, SET)) : [];
      // ילד בגן: בפרק 2 שיר אותיות ובפרק 5 שיר מספרים (בעברית); בשאר הפרקים – הסרטון של הגיבור
      const vids = KIDS() && (ei === 1 || ei === 4) ? [...videosFor(ei === 1 ? 'letters' : 'numbers', SET).filter(unseen), ...own] : own;
      if (vids.length && ei >= 0) {
        let reads = 0, at = steps.findIndex(st => st.t === 'read' && ++reads === 2);
        steps.splice(at > 0 ? at + 1 : 1, 0, { t: 'video', v: vids[0], topic: vids[0].topic });
      }
    }
    if (KIDS()) kinderSteps(base, steps);
    // 🎁 תיבת אוצר באמצע פרק חדש – אחרי משימה, לפני הדף הבא
    if (!base.free && !S.done.includes(base.id)) {
      let at = -1; for (let i = Math.floor(steps.length / 2); i < steps.length - 2; i++) if (steps[i].t === 'read' && steps[i - 1] && steps[i - 1].t !== 'read') { at = i; break; }
      if (at > 0) steps.splice(at, 0, { t: 'chest' });
    }
    const lvl = { ...base, steps };
    // ✨ דף זהב: פרק חדש נדיר שבו כל מטבע כפול. נקבע פעם אחת לכל פרק (יציאה וכניסה לא מגרילות מחדש)
    let golden = false;
    if (has('golden') && !base.free && !S.done.includes(base.id)) {
      S.golden = S.golden || {};
      if (S.golden[base.id] === undefined) { S.golden[base.id] = !!S.goldenNext || Math.random() < GOLDEN_CHANCE; S.goldenNext = false; save(); }
      golden = !!S.golden[base.id];
    }
    L = { world, idx, lvl, step:0, mistakes:0, lastRead:null, replay: S.done.includes(lvl.id), start: Date.now(), golden, words: 0 };
    screen = 'level'; closeOverlay(); setFocus(askLeave); kgEl.classList.toggle('golden', golden);
    // יצא באמצע (או שהדף נסגר/רוענן)? ממשיכים מהעמוד האחרון שקרא – לא מההתחלה
    const R = S.resume, steps2 = lvl.steps;
    if (R && R.id === lvl.id && R.reads > 0 && Date.now() - (R.at || 0) < 4 * 864e5) {
      let k = 0, at = -1; for (let j = 0; j < steps2.length; j++) if (steps2[j].t === 'read' && ++k === R.reads) { at = j; break; }
      if (at > 0 && at < steps2.length - 1) {
        L.step = at; L.maxStep = at; L.doneSet = new Set(); L.readSet = new Set(); L.resumed = true;
        for (let j = 0; j < at; j++) { L.doneSet.add(j); if (steps2[j].t === 'read') L.readSet.add(j); }
        setTimeout(() => { if (screen === 'level' && L && L.resumed) toast({ e: '🔖', name: tx('מַמְשִׁיכִים מֵאֵיפֹה שֶׁעָצַרְתָּ') }, ''); }, 500);
      }
    }
    renderStep();
    if (golden) {
      sound('magic'); confetti(40);
      const first = !S.goldenCount;
      overlay(`<div class="reveal golden-pop"><div class="rv-new gold">${tx('נָדִיר!')}</div><div class="rv-art">${bigE('✨')}</div>
        <h2 class="display">${tx('דַּף זָהָב!')}</h2>
        <p class="story">${tx(first ? 'מָצָאתָ דַּף זָהָב – דַּף נָדִיר בִּמְיֻחָד! בַּדַּף הַזֶּה כָּל מַטְבֵּעַ שָׁוֶה כָּפוּל, וּבַסּוֹף מְחַכֶּה בּוֹנוּס.' : 'כָּל מַטְבֵּעַ כָּפוּל, וּבַסּוֹף – בּוֹנוּס!')}</p>
        <div class="row" style="justify-content:center"><button class="btn gold" id="gpOk">${tx('בּוֹא נַתְחִיל!')} ${icon('next')}</button></div></div>`);
      $('#gpOk').onclick = closeOverlay;
    }
    return Promise.resolve();
  }
  const guideHTML = flat => `<div class="guide ${flat ? 'flat' : ''}"><div class="avatar">${guideAvatar()}</div><div class="guide-name">${tx(GUIDE.name)}</div></div>`;
  const setProg = pct => { const b = $('#lvlProg'); if (b) b.style.width = Math.max(4, Math.min(100, pct)) + '%'; };
  /* ---- 🗺️ סרגל המסע: כל דף וכל משימה הם תחנה, הדמות שלך הולכת עליו, 🎁 באמצע ו־🏁 בסוף ---- */
  const BOOST = { shield: ['🛡️', 'מָגֵן'], magnet: ['🧲', 'מַגְנֵט'], double: ['⭐', 'מַטְבְּעוֹת כְּפוּלִים'] };
  function drawJourney() {
    const mk = $('#lvlMarks'), me = $('#lvlMe'); if (!mk || !L) return;
    const st = L.lvl.steps, n = st.length, pos = i => ((i + .5) / n * 100).toFixed(2) + '%';
    mk.innerHTML = st.map((s, i) => {
      const k = s.t === 'read' ? 'r' : s.t === 'chest' ? 'c' : s.t === 'arena' ? 'f' : 't', done = (L.doneSet && L.doneSet.has(i)) || i < L.step;
      return `<b class="jm ${k} ${done ? 'done' : ''} ${L.starSet && L.starSet.has(i) ? 'star' : ''}" style="inset-inline-start:${pos(i)}">${k === 'c' ? '🎁' : k === 'f' ? '🏁' : ''}</b>`;
    }).join('');
    if (!me.dataset.on) { me.innerHTML = keeperSVG(S.equipped, { head: true, look: S.look }); me.dataset.on = '1'; }
    me.style.insetInlineStart = pos(L.step);
    drawPow();
  }
  function drawPow() {
    const el = $('#lvlPow'); if (!el || !L) return;
    const c = L.combo >= 2 ? `<span class="pw-combo">🔥${L.combo}</span>` : '', b = (L.boosts || []).map(x => `<span class="pw-b">${BOOST[x][0]}</span>`).join('');
    el.innerHTML = c + b; el.classList.toggle('on', !!(c || b));
  }
  /** תשובה נכונה בניסיון ראשון → הרצף עולה (בונוס מטבעות), וכל 3 ברצף = כוח למרוץ שבסוף הפרק */
  function comboHit(ok, el) {
    if (!L) return 0;
    if (!ok) { if (L.combo >= 2) { const c = $('#lvlPow .pw-combo'); if (c) c.classList.add('break'); } L.combo = 0; setTimeout(drawPow, 300); return 0; }
    L.combo = (L.combo || 0) + 1; L.starSet = L.starSet || new Set(); L.starSet.add(L.step);
    const bonus = L.combo >= 2 ? 5 * (Math.min(L.combo, 4) - 1) : 0;
    if (L.combo % 3 === 0 && !L.lvl.bonus && !L.replay) {
      const kinds = Object.keys(BOOST), kind = kinds[(L.boosts || []).length % kinds.length];
      L.boosts = [...(L.boosts || []), kind];
      setTimeout(() => toast({ e: BOOST[kind][0], name: `${tx('כֹּחַ לַמֵּרוֹץ:')} ${tx(BOOST[kind][1])}` }, `${tx('רֶצֶף')} ${L.combo}! 🔥`), 1250);
    }
    drawPow(); const c = $('#lvlPow .pw-combo'); if (c) { c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); }
    return bonus;
  }
  function askLeave() {
    overlay(`${icon('book', 'bigico')}<h2 class="display" style="font-size:28px">${tx('לָצֵאת מֵהַדַּף?')}</h2>
      <p class="story" style="font-size:22px">${tx('אֵין בְּעָיָה! שָׁמַרְתִּי אֶת הַמָּקוֹם – בַּפַּעַם הַבָּאָה תַּמְשִׁיךְ מֵהָעַמּוּד שֶׁעָצַרְתָּ בּוֹ.')}</p>
      <div class="row" style="justify-content:center"><button class="btn go" id="lvStay">${tx('לְהַמְשִׁיךְ')}</button><button class="btn ghost" id="lvLeave">${tx('לָצֵאת')}</button></div>`);
    $('#lvStay').onclick = closeOverlay;
    $('#lvLeave').onclick = () => { closeOverlay(); if (L && L.lvl.bonus) { shopTab = 'bonus'; showShop(); } else showMap(L ? L.world : mapWorld); };
  }
  function tipHTML(type) {
    if (!TIPS[type] || (S.tips || {})[type]) return '';
    S.tips = { ...(S.tips || {}), [type]: true }; save();
    return `<div class="tip"><img src="/guide/yuval.jpg" alt=""><span>${tx(TIPS[type])}</span></div>`;
  }
  const frame = (inner, tipType, actions = '') => {
    app.innerHTML = `<div class="panel">${tipType ? tipHTML(tipType) : ''}${inner}</div>`;
    setProg(L.step / L.lvl.steps.length * 100); setActions(backBtn() + actions); bindBack(); drawJourney(); window.scrollTo(0, 0);
  };
  /* ---- ↩️ חזרה לדף הקודם: אפשר לחזור לקרוא (גם מתוך שאלה). קדימה – משימות שכבר נפתרו מדלגים עליהן ---- */
  const prevRead = i => { for (let j = i - 1; j >= 0; j--) if (L.lvl.steps[j].t === 'read') return j; return -1; };
  const backBtn = () => (L && screen === 'level' && prevRead(L.step) >= 0 ? `<button class="btn ghost back" id="lvBack" title="${tx('חֲזָרָה')}">${icon('next')}<span>${tx('חֲזָרָה')}</span></button>` : '');
  function bindBack() { const b = $('#lvBack'); if (b) b.onclick = () => { const j = prevRead(L.step); if (j < 0) return; stopSpeak(); sound('page'); L.step = j; renderStep(); }; }
  /** "הַבָּא" אחרי השהיה – רק אם הילד עדיין באותו צעד (לא יצא, לא חזר אחורה) */
  const nextLater = ms => { const tok = kgTok; setTimeout(() => { if (!destroyed && tok === kgTok && screen === 'level') next(); }, ms); };
  function next() {
    L.doneSet = L.doneSet || new Set(); L.doneSet.add(L.step); L.step++;
    while (L.step < (L.maxStep || 0) && L.doneSet.has(L.step) && L.lvl.steps[L.step].t !== 'read') L.step++;   // אחרי חזרה: לא פותרים שוב מה שכבר נפתר
    if (L.step >= L.lvl.steps.length) finishLevel(); else renderStep();
  }
  const rereadBtn = () => L.lastRead ? `<button class="btn ghost" id="reread">${icon('book')} ${tx('לִקְרֹא שׁוּב')}</button>` : '';
  function bindReread() {
    const b = $('#reread'); if (!b) return;
    b.onclick = () => {
      overlay(`<div class="story" style="text-align:right">${L.lastRead.map(l => `<p>${tx(l)}</p>`).join('')}</div>
        <div class="row" style="justify-content:center"><button class="btn go" id="ovClose">${tx('הֵבַנְתִּי')} ${icon('next')}</button></div>`);
      $('#ovClose').onclick = closeOverlay;
    };
  }

  /* ---- גלגל הצלה: טלפון לאבא. פעם אחת בכל סשן בחינם, אחר כך עולה מטבעות ---- */
  function touchSession() {
    const now = Date.now();
    if (!S.session || now - (S.session.last || 0) > 30 * 60000) S.session = { start: now, last: now, freeUsed: false };
    else S.session.last = now;
  }
  function lifelineCost() { touchSession(); return S.session.freeUsed ? (SET.lifelineCost || 0) : 0; }
  function lifelineBtn() {
    ensureToday();
    const left = SET.lifelinesPerDay - S.today.lifelines, cost = lifelineCost();
    if (left <= 0) return `<button class="btn ghost phone" id="phone" disabled>${icon('phone')} ${tx('נִגְמְרוּ הַשִּׂיחוֹת לְהַיּוֹם')}</button>`;
    const price = cost ? `<small class="cost">${cost}${icon('coin')}</small>` : `<small class="free">${tx('חִנָּם')}</small>`;
    return `<button class="btn ghost phone" id="phone" ${cost > S.coins ? 'disabled' : ''}>${icon('phone')} ${tx('טֵלֵפוֹן לְ')}${helper()} ${price}</button>`;
  }
  function bindLifeline(s) { const b = $('#phone'); if (b) b.onclick = () => askLifeline(s); }
  function askLifeline(s) {
    const cost = lifelineCost();
    if (!cost) return phoneFriend(s, 0);
    overlay(`${icon('phone', 'bigico')}
      <p class="story" style="font-size:26px">${tx('אֶת הַשִּׂיחָה הַחִנָּמִית כְּבָר הִשְׁתַּמַּשְׁתָּ.')}<br>${tx('שִׂיחָה נוֹסֶפֶת עוֹלָה')} ${cost} ${icon('coin')}</p>
      <div class="row" style="justify-content:center"><button class="btn gold" id="llPay">${tx('לְהִתְקַשֵּׁר')} · ${cost} ${icon('coin')}</button><button class="btn ghost" id="llNo">${tx('אֲנַסֶּה לְבַד')}</button></div>`);
    $('#llNo').onclick = closeOverlay;
    $('#llPay').onclick = () => phoneFriend(s, cost);
  }
  async function phoneFriend(s, cost) {
    ensureToday();
    if (S.today.lifelines >= SET.lifelinesPerDay || cost > S.coins) return;
    const correctText = s.t === 'choice' ? s.options[s.answer] : s.t === 'tf' ? (s.answer ? 'נכון' : 'לא נכון')
      : s.t === 'find' ? s.answer : s.t === 'order' ? s.words.join(' ') : s.t === 'number' ? String(s.answer)
      : s.t === 'timeline' ? s.items.join(' ← ') : s.t === 'balance' ? `במספר ${s.a.w * s.a.d / s.b.w}` : '';
    const payload = {
      level: L.lvl.id, levelTitle: plain(L.lvl.title), type: s.t, question: plain(s.q || ''),
      options: s.t === 'choice' ? s.options.map(plain) : s.t === 'tf' ? ['נכון', 'לא נכון'] : [],
      text: s.text ? plain(s.text) : '', correct: plain(correctText), story: (L.lastRead || []).map(l => plain(tx(l))),
      hint: plain(s.hint || ''),
    };
    const wasFree = !cost;
    const charge = () => { S.today.lifelines++; if (wasFree) S.session.freeUsed = true; else S.coins -= cost; save(); refreshBar(); };
    const refund = () => { S.today.lifelines--; if (wasFree) S.session.freeUsed = false; else S.coins += cost; save(); refreshBar(); };
    charge();
    let id; try { id = await store.createLifeline(payload); } catch (e) { refund(); closeOverlay(); return; }
    store.notify('lifeline', { question: payload.question, lifelineId: id });
    store.log('lifeline', { level: L.lvl.id, step: L.step, cost });
    sound('ring');
    let done = false, unsub = () => {}, to;
    const finish = () => { done = true; unsub(); clearTimeout(to); };
    overlay(`<div class="calling"><div class="phone-anim">${icon('phone')}</div>
      <h2 class="display" style="font-size:30px">${tx('מִתְקַשְּׁרִים לְ')}${helper()}...</h2>
      <p class="story" style="font-size:22px">${tx('שָׁלַחְנוּ לוֹ אֶת הַשְּׁאֵלָה. הוּא יַעֲנֶה עוֹד רֶגַע.')}</p>
      <div class="dots"><i></i><i></i><i></i></div></div>
      <div class="row" style="justify-content:center"><button class="btn ghost" id="llCancel">${tx('בִּטּוּל')}</button></div>`);
    $('#llCancel').onclick = () => { finish(); store.closeLifeline(id, 'cancelled'); refund(); closeOverlay(); renderStep(); };
    unsub = store.watchLifeline(id, row => {
      if (done || row.status !== 'answered') return;
      finish(); sound('ok');
      const ans = SET.nikud ? (row.answer_nikud || row.answer) : plain(row.answer_nikud || row.answer);
      overlay(`<div class="letter"><div class="letter-head">${icon('phone')} ${helper()} ${tx('אוֹמֵר:')}</div>
        <div class="story letter-body">${esc(ans)}</div></div>
        <div class="row" style="justify-content:center"><button class="btn go" id="llOk">${tx('תּוֹדָה!')} ${icon('next')}</button></div>`);
      $('#llOk').onclick = () => { closeOverlay(); renderStep(); };
    });
    to = setTimeout(() => {
      if (done) return;
      finish(); store.closeLifeline(id, 'expired'); refund();
      overlay(`${icon('phone', 'bigico')}<p class="story" style="font-size:24px">${helper()} ${tx('עָסוּק כָּרֶגַע, אָז הַשִּׂיחָה לֹא נֶחְשֶׁבֶת.')}<br>${tx('הִנֵּה רֶמֶז מִיּוּבַל:')}</p>
        <div class="hint">${icon('bulb')}<span>${tx(s.hint || 'תִּקְרָא שׁוּב לְאַט, מִלָּה אַחֲרֵי מִלָּה.')}</span></div>
        <div class="row" style="justify-content:center"><button class="btn go" id="llOk">${tx('הֵבַנְתִּי')}</button></div>`);
      $('#llOk').onclick = () => { closeOverlay(); renderStep(); };
    }, SET.lifelineTimeoutSec * 1000);
    timers.push(to);
  }

  /* 🧠 פרופיל למידה: כל שינוי נרשם להורה, ושינוי לטובה – גם חגיגה קטנה לילד */
  const PRAISE_ADAPT = { 'read-page': ['📖', 'קוֹרֵא מַהֵר! מֵעַכְשָׁו – עַמּוּד שָׁלֵם'], 'math-3': ['🧮', 'אַלּוּף חֶשְׁבּוֹן! הָאֶתְגָּרִים עוֹלִים רָמָה'], 'write-up': ['✍️', 'כּוֹתֵב כְּמוֹ סוֹפֵר!'], 'comp-3': ['🧠', 'מֵבִין כָּל מִלָּה!'], 'run-up': ['⚡', 'עָלִיתָ רָמָה בַּמֵּרוֹץ!'] };
  function adapted(ch) {
    if (!ch) return; save(); store.log('adapt', ch); kgEl.classList.toggle('bigread', bigFont(S.skill));
    const pr2 = PRAISE_ADAPT[ch.what]; if (pr2) setTimeout(() => toast({ e: pr2[0], name: pr2[1] }, 'כָּל הַכָּבוֹד!'), 900);
  }
  function correct(el, base = 10) {
    if (L.okTok === kgTok) return; L.okTok = kgTok;   // לחיצה כפולה על התשובה הנכונה – לא מדלגת על המשימה הבאה
    sound('ok'); S.tasks++; const first = L.tries === 0; if (first) S.firstTry++;
    const cur = L.lvl.steps[L.step]; if (cur && CAT[cur.t]) adapted(noteAnswer(S.skill, CAT[cur.t], first));
    const bonus = comboHit(first, el), n = earn((first ? base : Math.ceil(base / 2)) + bonus);
    addCoins(n, el);
    showSheet('good', L.combo >= 2 ? `🔥 ${tx('רֶצֶף')} ${L.combo}!` : tx(pick(PRAISE)), gain(n), 1150);
    nextLater(1050);
  }
  function wrong(el, hint) {
    sound('bad'); L.tries++; L.mistakes++; shake(el); comboHit(false);
    try { navigator.vibrate && navigator.vibrate(40); } catch (e) {}
    const cur = L.lvl.steps[L.step], showHint = hint && L.tries >= hintAfter(S.skill, CAT[cur && cur.t] || 'comp');   // מי שקשה לו – רמז כבר אחרי טעות אחת
    showSheet('bad', tx(pick(RETRY)), showHint ? tx('הִנֵּה רֶמֶז קָטָן לְמַעְלָה') : '', 1500);
    const fb = $('#fb');
    if (showHint && !$('#hintbox') && fb) fb.insertAdjacentHTML('afterend', `<div class="hint" id="hintbox">${icon('bulb')}<span>${tx(hint)}</span></div>`);
  }

  /** 🧩 שאלה חדשה מתוך הסיפור עצמו: משפט מהדף עם מילה חסרה, ו־3 מילים מאותו דף לבחירה */
  const heCore = w => w.replace(/^[^\u05D0-\u05EA\u0591-\u05C7]+|[^\u05D0-\u05EA\u0591-\u05C7]+$/g, '');
  const hePlain = w => w.replace(/[\u0591-\u05C7]/g, '');
  function clozeQuestion(lines) {
    if (!lines || !lines.length) return null;
    const okWord = w => { const c = heCore(w); return c && !/[^\u05D0-\u05EA\u0591-\u05C7]/.test(c) && hePlain(c).length >= 3 && !w.includes('{'); };
    const all = [...new Set(lines.join(' ').split(/\s+/).filter(okWord).map(heCore))];
    const cands = lines.filter(l => !l.includes('{') && l.split(/\s+/).length >= 5);
    for (let tries = 0; tries < 8 && cands.length; tries++) {
      const line = pick(cands), toks = line.split(/\s+/), idx = toks.map((w, i) => i).filter(i => i > 0 && okWord(toks[i]));
      if (!idx.length) continue;
      const i = pick(idx), ans = heCore(toks[i]);
      const inLine = new Set(toks.map(w => hePlain(heCore(w))));   // מילים מאותו משפט לא יהיו מסיחים (שלא יתבלבל)
      const others = all.filter(w => hePlain(w) !== hePlain(ans) && !inLine.has(hePlain(w))).sort(() => Math.random() - .5).slice(0, 2);
      if (others.length < 2) continue;
      const blank = toks.map((w, k) => (k === i ? w.replace(ans, '____') : w)).join(' ');
      const options = [ans, ...others].sort(() => Math.random() - .5);
      return { t: 'choice', q: `אֵיזוֹ מִלָּה חֲסֵרָה בַּמִּשְׁפָּט מֵהַסִּפּוּר?<span class="cloze">${blank}</span>`, options, answer: options.indexOf(ans), isAlt: true, hint: 'חֲזֹר לַדַּף וְחַפֵּשׂ אֶת הַמִּשְׁפָּט.' };
    }
    return null;
  }
  /** שאלה אחרת על אותו פרק: שאלה שלא תיכנס למרוץ, ואם אין – מילה חסרה מהדף שקראת עכשיו */
  function altQuestion() {
    const race = L.lvl.steps.find(x => x.t === 'arena'), need = arenaQs(S.skill);
    if (race && race.quiz.length > Math.max(3, need)) {
      const k = race.quiz.findIndex(x => !x.tf), q = race.quiz.splice(k >= 0 ? k : race.quiz.length - 1, 1)[0];
      return q.tf ? { t: 'tf', q: q.q, answer: q.answer === 0, isAlt: true } : { t: 'choice', q: q.q, options: q.options, answer: q.answer, isAlt: true };
    }
    return clozeQuestion(L.lastRead);
  }
  const LETTERS = ['א', 'ב', 'ג', 'ד'];
  const go = (id, label, cls = 'go', ic = 'next') => `<div class="grow"></div><button class="btn ${cls}" id="${id}">${label}${ic ? ' ' + icon(ic) : ''}</button>`;
  function renderStep() {
    const s = L.lvl.steps[L.step]; L.tries = 0; touchSession(); hideSheet(); keyHandler = null; stopSpeak(); kgTok++;
    if (!L.lvl.bonus) { const reads = L.lvl.steps.slice(0, L.step + 1).filter(x => x.t === 'read').length; if (!S.resume || S.resume.id !== L.lvl.id || S.resume.reads !== reads) { S.resume = { id: L.lvl.id, reads, at: Date.now() }; save(); } }
    L.maxStep = Math.max(L.maxStep || 0, L.step);
    if (s.t === 'read') {
      L.lastRead = s.lines; L.readSet = L.readSet || new Set();
      const again = L.readSet.has(L.step);   // חזר לדף שכבר קרא – בלי מטבעות שוב, ובלי שורה-אחרי-שורה
      const sc = scene(s.scene || L.lvl.scene, { cabin: L.lvl.cabin, ...s });
      // קורא לאט? שורה אחרי שורה – פחות עומס, יותר ריכוז (המשחק עובר לעמוד שלם כשהקריאה משתפרת)
      const lineMode = !KIDS() && readMode(S.skill) === 'lines' && s.lines.length > 1 && !again; let shown = lineMode ? 1 : s.lines.length;
      const t0 = Date.now();
      // 💎 יהלום שמתחבא בציור (בערך בדף אחד מכל שלושה) – מי שמסתכל טוב מוצא
      const gem = !again && !L.replay && !L.lvl.free && Math.random() < .35 ? `<button class="gem" id="gem" style="left:${Math.round(8 + Math.random() * 70)}%;top:${Math.round(18 + Math.random() * 55)}%" aria-label="💎">💎</button>` : '';
      frame(`<div class="scene">${sc}${s.pic ? `<div class="sticker">${s.pic}</div>` : ''}${gem}</div>
        ${guideHTML()}<div class="story ${lineMode ? 'linemode' : ''}">${s.lines.map((l, i) => `<p class="${lineMode && i > 0 ? 'hide' : ''}" style="animation-delay:${lineMode ? 0 : i * 0.6}s">${tx(l)}</p>`).join('')}</div>${tipHTML('read')}`,
        // כפתור ההקראה מופיע רק כשבאמת אפשר להשתמש בו: יש קול עברי, עבר זמן ההמתנה, ויש מספיק מטבעות (או שכבר שילמת על הדף)
        null, (ttsOn() && ((L.paidRead || {})[L.step] || (!readWait() && S.coins >= readCost()))
          ? `<button class="btn ghost" id="tts">${icon('soundOn')} ${tx('הַקְרָאָה')} ${(L.paidRead || {})[L.step] ? '' : `<small class="cost">${readCost()}${icon('coin')}</small>`}</button>` : '') + go('nx', tx(lineMode ? 'הַשּׁוּרָה הַבָּאָה' : 'הַמְשֵׁךְ')));
      if ($('#gem')) $('#gem').onclick = e => { const g = e.currentTarget, n = earn(3); g.disabled = true; g.classList.add('got'); sound('coin'); addCoins(n, g); L.gems = (L.gems || 0) + 1; setTimeout(() => g.remove(), 700); };
      if ($('#tts')) $('#tts').onclick = () => {
        L.paidRead = L.paidRead || {};
        if (!L.paidRead[L.step]) {
          if (S.coins < readCost()) { sound('bad'); shake($('#tts')); showSheet('bad', tx('חֲסֵרִים לְךָ מַטְבְּעוֹת'), `${tx('הַקְרָאָה עוֹלָה')} ${readCost()} ${icon('coin')}`, 1600); return; }
          S.coins -= readCost(); L.paidRead[L.step] = true; S.ttsWait = readEvery() - 1; save(); refreshBar(); fly(`−${readCost()}`, $('#coinsPill'));
          store.log('read_aloud', { level: L.lvl.id, step: L.step, cost: readCost() });
          $('#tts').querySelector('small')?.remove();
        }
        if ($('#tts').classList.contains('on')) { stopSpeak(); return; }
        if (lineMode) { app.querySelectorAll('.story p.hide').forEach(p => p.classList.remove('hide')); shown = s.lines.length; nx.innerHTML = `${tx('הַמְשֵׁךְ')} ${icon('next')}`; }
        speakStory(s.lines);
      };
      const nx = $('#nx'); nx.disabled = true; setTimeout(() => { if (nx) { nx.disabled = false; nx.classList.add('pulse'); } }, again ? 300 : lineMode ? 700 : 600 * s.lines.length + 300);
      if (KIDS()) {   // 🐣 הסיפור מוקרא, שורה אחרי שורה, והשורה מודגשת
        const myStep = L.step, ps = [...app.querySelectorAll('.story p')];
        const ab = $('#actionbar .ab'); if (ab && !$('#kRe')) { ab.insertAdjacentHTML('afterbegin', `<button class="btn ghost" id="kRe" aria-label="🔊">🔊</button>`); $('#kRe').onclick = () => { sound('tap'); (async () => { for (const l of s.lines) { if (L.step !== myStep) return; await kNarrate(l); } })(); }; }
        (async () => { for (let i = 0; i < s.lines.length; i++) { if (screen !== 'level' || L.step !== myStep) return; ps.forEach(p => p.classList.remove('speaking')); ps[i]?.classList.add('speaking'); await kNarrate(s.lines[i]); } ps.forEach(p => p.classList.remove('speaking')); })();
      }
      nx.onclick = () => {
        if (shown < s.lines.length) {   // מצב שורה-אחרי-שורה: חושפים את השורה הבאה
          const p = app.querySelectorAll('.story p')[shown++]; p.classList.remove('hide'); p.classList.add('reveal-line'); sound('tap');
          p.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          if (shown >= s.lines.length) nx.innerHTML = `${tx('הַמְשֵׁךְ')} ${icon('next')}`;
          nx.disabled = true; setTimeout(() => { nx.disabled = false; }, 450); return;
        }
        if (again) { sound('page'); next(); return; }
        if (KIDS()) { try { tts && tts.cancel(); } catch (e) {} kTok++; }
        L.readSet.add(L.step);
        if (!L.replay && !KIDS()) adapted(noteRead(S.skill, countWords(s.lines.join(' ')), (Date.now() - t0) / 1000));   // מודדים מהירות קריאה
        sound('page'); addCoins(L.replay ? 0 : earn(2), nx); feedOwl(countWords(s.lines.join(' ')));
        if (!(L.paidRead || {})[L.step] && S.ttsWait > 0) { S.ttsWait--; save(); }   // דף שנקרא לבד – מקרב את ההקראה הבאה
        next();
      };
    }
    else if (s.t === 'aluf') renderAluf(s);
    else if (s.t === 'chest') renderChest();
    else if (s.t === 'kg') renderKG(s);
    else if (s.t === 'video') renderVideo(s);
    else if (s.t === 'kname') {
      const nm = S.name || (child && child.name) || '';
      frame(`${guideHTML(true)}<div class="question" style="text-align:center"><div style="font-size:56px">👋</div><b style="font-size:44px">${nm ? esc(nm) : tx('שׁוֹמֵר זְמַן')}</b></div>`, null, go('nx', tx('זֶה אֲנִי!')));
      kNarrate(`נָעִים מְאוֹד${nm ? ', ' + nm : ''}! עַכְשָׁו אַתָּה שׁוֹמֵר זְמַן. בּוֹא נִבְנֶה אֶת הַדְּמוּת שֶׁלְּךָ!`);
      $('#nx').onclick = () => { sound('page'); next(); };
    }
    else if (s.t === 'kgrun') renderKGRun(s);
    else if (s.t === 'arena') { if (SET.endGame === 'arena') renderArena(s); else renderRun(s); }
    else if (s.t === 'choice' || s.t === 'tf') {
      const isTF = s.t === 'tf';
      const options = isTF ? ['נָכוֹן', 'לֹא נָכוֹן'] : s.options;
      const answer = isTF ? (s.answer ? 0 : 1) : s.answer;
      const order = isTF ? [0, 1] : options.map((_, i) => i).sort(() => Math.random() - .5);
      const qHTML = (isTF ? `<div class="qlabel">${tx('נָכוֹן אוֹ לֹא נָכוֹן?')}</div><div>${tx(s.q)}</div>` : tx(s.q))
        + (s.mirror ? `<div class="mirror-card"><span class="mirror">${tx(s.mirror)}</span><small>🪞 ${tx(s.mirrorLabel || 'כְּתַב מַרְאָה – קוֹרְאִים מִשְּׂמֹאל לְיָמִין')}</small></div>` : '');
      frame(`<div class="question">${qHTML}</div>
        <div class="options ${isTF ? 'tf' : ''}">${order.map((i, k) => `<button class="opt" data-i="${i}"><span class="ob">${isTF ? icon(i === 0 ? 'check' : 'cross') : LETTERS[k]}</span><span>${tx(options[i])}</span></button>`).join('')}</div>
        <div class="feedback" id="fb"></div>`, s.t, `${rereadBtn()}${lifelineBtn()}`);
      bindReread(); bindLifeline(s);
      app.querySelectorAll('.opt').forEach(b => b.onclick = () => {
        if (+b.dataset.i === answer) { b.classList.add('right'); app.querySelectorAll('.opt').forEach(x => x.disabled = true); correct(b); }
        else {
          b.classList.add('wrong'); b.disabled = true; wrong(b, s.hint);
          const left = app.querySelectorAll('.opt:not([disabled])').length, alt = left <= 1 && !s.isAlt ? altQuestion() : null;
          if (alt) {   // נשארה רק תשובה אחת → במקום "לנחש" אותה, שאלה אחרת על הסיפור
            app.querySelectorAll('.opt').forEach(x => x.disabled = true);
            setTimeout(() => { if (screen !== 'level' || L.lvl.steps[L.step] !== s) return;
              showSheet('bad', tx('לֹא נוֹרָא!'), tx('הִנֵּה שְׁאֵלָה אַחֶרֶת – נַסֵּה אוֹתָהּ'), 1300);
              L.lvl.steps[L.step] = alt; renderStep(); L.tries = 1; }, 1350);
          }
        }
      });
      keyHandler = e => { const k = { '1': 0, '2': 1, '3': 2, '4': 3 }[e.key]; const b = k != null && app.querySelectorAll('.opt')[k]; if (b && !b.disabled && !overlayOpen()) b.click(); };
    }
    else if (s.t === 'find') {
      const words = s.text.split(/\s+/);
      frame(`<div class="question">${tx(s.q)}</div>
        <div class="words">${words.map((w, i) => `<span class="w" data-i="${i}">${tx(w)}</span>`).join(' ')}</div>
        <div class="feedback" id="fb"></div>`, 'find', lifelineBtn());
      bindLifeline(s);
      app.querySelectorAll('.w').forEach(el => el.onclick = () => {
        if (norm(words[+el.dataset.i]) === norm(s.answer)) { el.classList.add('right'); correct(el); }
        else { el.classList.add('wrong'); setTimeout(() => el.classList.remove('wrong'), 600); wrong(el, s.hint); }
      });
    }
    else if (s.t === 'order') {
      let pool = s.words.map((w, i) => i).sort(() => Math.random() - .5);
      if (pool.every((v, i) => v === i)) pool.reverse();
      let built = [];
      const draw = () => {
        frame(`<div class="question">${tx(s.q)}</div>
          <div class="slot chips" id="built">${built.map((i, k) => `<button class="chip" data-k="${k}">${tx(s.words[i])}</button>`).join('')}</div>
          <div class="chips" id="pool">${pool.map((i, k) => `<button class="chip" data-k="${k}">${tx(s.words[i])}</button>`).join('')}</div>
          <div class="feedback" id="fb"></div>`, 'order', lifelineBtn());
        bindLifeline(s);
        $('#pool').querySelectorAll('.chip').forEach(c => c.onclick = () => { sound('page'); built.push(pool.splice(+c.dataset.k, 1)[0]); check(); });
        $('#built').querySelectorAll('.chip').forEach(c => c.onclick = () => { pool.push(built.splice(+c.dataset.k, 1)[0]); draw(); });
      };
      const check = () => {
        draw();
        if (pool.length === 0) {
          if (built.every((v, i) => v === i)) correct($('#built'));
          else {
            wrong($('#built'), s.hint);
            setTimeout(() => { pool = built.concat(pool); built = []; const h = $('#hintbox')?.outerHTML; draw(); if (h) $('#fb').insertAdjacentHTML('afterend', h); }, 900);
          }
        }
      };
      draw();
    }
    else if (s.t === 'number') {
      let val = '';
      frame(`${s.challenge ? `<div class="qlabel challenge">⚡ ${tx('אֶתְגַּר חֶשְׁבּוֹן')} <small>${tx('בּוֹנוּס!')}</small></div>` : ''}<div class="question">${tx(s.q)}</div>
        <div class="numwrap"><div class="numdisplay" id="nd"></div>
        <div class="numpad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => `<button data-n="${n}">${n}</button>`).join('')}<button class="del" id="del">${icon('backspace')}</button></div></div>
        <div class="feedback" id="fb"></div>`, 'number', `${lifelineBtn()}${go('ok', tx('בְּדִיקָה'), 'go', '')}`);
      bindLifeline(s);
      const nd = $('#nd'), upd = () => nd.textContent = val;
      app.querySelectorAll('.numpad button[data-n]').forEach(b => b.onclick = () => { if (val.length < 4) { val += b.dataset.n; upd(); } });
      $('#del').onclick = () => { val = val.slice(0, -1); upd(); };
      $('#ok').onclick = () => { if (!val) return; if (+val === s.answer) { nd.classList.add('good'); correct(nd, s.challenge ? 15 : 10); } else { wrong(nd, s.hint); val = ''; upd(); } };
      keyHandler = e => {
        if (screen !== 'level' || L.lvl.steps[L.step] !== s || overlayOpen()) return;
        if (/^\d$/.test(e.key) && val.length < 4) { val += e.key; upd(); }
        if (e.key === 'Backspace') { val = val.slice(0, -1); upd(); }
        if (e.key === 'Enter') $('#ok')?.click();
      };
    }
    else if (s.t === 'predict') {
      // ניחוש: אין טעות. מנחשים מה יקרה – ואז מגלים
      frame(`<div class="qlabel">${icon('bulb')} ${tx('מָה אַתָּה חוֹשֵׁב?')}</div><div class="question">${tx(s.q)}</div>
        <div class="options">${s.options.map((o, i) => `<button class="opt" data-i="${i}"><span class="ob">${LETTERS[i]}</span><span>${tx(o)}</span></button>`).join('')}</div>
        <div id="pred"></div>`, 'predict');
      app.querySelectorAll('.opt').forEach(b => b.onclick = () => {
        const hit = +b.dataset.i === s.answer;
        app.querySelectorAll('.opt').forEach(x => x.disabled = true);
        app.querySelector(`.opt[data-i="${s.answer}"]`).classList.add('right'); if (!hit) b.classList.add('picked');
        sound(hit ? 'magic' : 'page'); addCoins(earn(hit ? 10 : 4), b);
        L.lastRead = (L.lastRead || []).concat(s.reveal || []); feedOwl(countWords((s.reveal || []).join(' ')));
        $('#pred').innerHTML = `<div class="reveal-box ${hit ? 'hit' : ''}"><b>${hit ? tx('נִחַשְׁתָּ נָכוֹן! יֵשׁ לְךָ חוּשׁ שֶׁל הִיסְטוֹרְיוֹן.') : tx('מַפְתִּיעַ, נָכוֹן? הִנֵּה מָה שֶׁקָּרָה בֶּאֱמֶת:')}</b>${(s.reveal || []).map((l, i) => `<p style="animation-delay:${.2 + i * .5}s">${tx(l)}</p>`).join('')}</div>`;
        setTimeout(() => $('#pred')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 150);
        setActions(go('nx', tx('הַמְשֵׁךְ'))); $('#nx').onclick = () => { sound('page'); next(); };
      });
    }
    else if (s.t === 'myth') {
      // אמת או אגדה – ואחר כך ההסבר
      frame(`<div class="qlabel">${icon('scroll')} ${tx('אֱמֶת אוֹ אַגָּדָה?')}</div><div class="myth-card">${tx(s.q)}</div>
        <div class="options tf">
          <button class="opt" data-i="1"><span class="ob">${icon('check')}</span><span>${tx('אֱמֶת')}</span></button>
          <button class="opt" data-i="0"><span class="ob">${icon('book')}</span><span>${tx('אַגָּדָה')}</span></button></div><div id="pred"></div>`, 'myth');
      app.querySelectorAll('.opt').forEach(b => b.onclick = () => {
        const ok = (b.dataset.i === '1') === !!s.answer;
        app.querySelectorAll('.opt').forEach(x => x.disabled = true);
        app.querySelector(`.opt[data-i="${s.answer ? 1 : 0}"]`).classList.add('right'); if (!ok) b.classList.add('wrong');
        S.tasks++;
        if (ok) { S.firstTry++; sound('ok'); const c = earn(10 + comboHit(true, b)); addCoins(c, b); showSheet('good', L.combo >= 2 ? `🔥 ${tx('רֶצֶף')} ${L.combo}!` : tx(pick(PRAISE)), gain(c), 1300); }
        else { sound('bad'); comboHit(false); showSheet('bad', tx('לֹא בְּדִיּוּק...'), tx('קְרָא אֶת הַהֶסְבֵּר'), 1500); }
        L.lastRead = (L.lastRead || []).concat(s.explain || []); feedOwl(countWords((s.explain || []).join(' ')));
        $('#pred').innerHTML = `<div class="reveal-box ${ok ? 'hit' : ''}"><b>${tx(s.answer ? 'זֶה אֱמֶת!' : 'זֹאת כַּנִּרְאֶה אַגָּדָה!')}</b>${(s.explain || []).map((l, i) => `<p style="animation-delay:${.2 + i * .5}s">${tx(l)}</p>`).join('')}</div>`;
        setTimeout(() => $('#pred')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 150);
        setActions(go('nx', tx('הַמְשֵׁךְ'))); $('#nx').onclick = () => { sound('page'); next(); };
      });
    }
    else if (s.t === 'balance') {
      // המנוף של ארכימדס: איפה לשים את המשקולת כדי שהקרש יהיה ישר?
      const A = s.a, B = s.b, U = 27;
      let pos = 0;
      const draw = () => {
        const tq = B.w * pos - A.w * A.d, ang = pos ? Math.max(-13, Math.min(13, tq * 1.3)) : -13, xa = 200 - A.d * U, xb = 200 + pos * U;
        return `<svg class="lever" viewBox="0 0 400 220" aria-hidden="true">
          <path d="M20 206H380" stroke="#c9b07a" stroke-width="4" stroke-linecap="round"/>
          <g class="beam" style="transform:rotate(${ang}deg)">
            <rect x="24" y="132" width="352" height="14" rx="5" fill="#a8743f" stroke="#2b1838" stroke-width="3"/>
            ${[1, 2, 3, 4, 5, 6].map(k => `<path d="M${200 + k * U} 132v14M${200 - k * U} 132v14" stroke="#2b1838" stroke-width="1.5" opacity=".45"/><text x="${200 + k * U}" y="164" text-anchor="middle" font-size="13" font-weight="700" fill="#6b5a7b">${k}</text>`).join('')}
            <g transform="translate(${xa} 132)"><path d="M-26 0Q-30 -34 -6 -44Q22 -50 28 -22Q32 -4 26 0Z" fill="#9a8a7a" stroke="#2b1838" stroke-width="3"/><text x="0" y="-16" text-anchor="middle" font-size="20" font-weight="800" fill="#fff">${A.w}</text></g>
            ${pos ? `<g transform="translate(${xb} 132)"><rect x="-17" y="-34" width="34" height="34" rx="6" fill="#ffc928" stroke="#2b1838" stroke-width="3"/><text x="0" y="-10" text-anchor="middle" font-size="19" font-weight="800" fill="#2b1838">${B.w}</text></g>` : ''}
          </g>
          <path d="M200 146L176 206H224Z" fill="#7a5530" stroke="#2b1838" stroke-width="3" stroke-linejoin="round"/>
        </svg>`;
      };
      frame(`<div class="qlabel">${icon('practice')} ${tx('הַמָּנוֹף שֶׁל אַרְכִימֶדֶס')}</div><div class="question">${tx(s.q)}</div>
        <div id="lv">${draw()}</div>
        <div class="lv-label">${tx('בְּאֵיזֶה מִסְפָּר לָשִׂים אֶת הַמִּשְׁקֹלֶת הַצְּהֻבָּה?')}</div>
        <div class="lv-pos">${[1, 2, 3, 4, 5, 6].map(k => `<button data-k="${k}">${k}</button>`).join('')}</div>
        <div class="feedback" id="fb"></div>`, 'balance', lifelineBtn());
      bindLifeline(s);
      app.querySelectorAll('.lv-pos button').forEach(b => b.onclick = () => {
        pos = +b.dataset.k; app.querySelectorAll('.lv-pos button').forEach(x => x.classList.toggle('on', x === b));
        $('#lv').innerHTML = draw(); sound('tap');
        const ok = B.w * pos === A.w * A.d;
        setTimeout(() => {
          if (ok) { app.querySelectorAll('.lv-pos button').forEach(x => x.disabled = true); correct($('#lv'), 12); }
          else wrong($('#lv'), s.hint);
        }, 650);
      });
    }
    else if (s.t === 'timeline') {
      // ציר זמן: מסדרים משפטים לפי הסדר
      let pool = s.items.map((_, i) => i).sort(() => Math.random() - .5);
      if (pool.every((v, i) => v === i)) pool.reverse();
      let built = [];
      const draw = () => {
        frame(`<div class="question">${tx(s.q)}</div>
          <div class="tl-built" id="built">${s.items.map((_, k) => built[k] != null
            ? `<button class="tl-card set" data-k="${k}"><span class="tl-n">${k + 1}</span><span>${tx(s.items[built[k]])}</span></button>`
            : `<div class="tl-slot"><span class="tl-n">${k + 1}</span></div>`).join('')}</div>
          <div class="tl-pool" id="pool">${pool.map((i, k) => `<button class="tl-card" data-k="${k}"><span>${tx(s.items[i])}</span></button>`).join('')}</div>
          <div class="feedback" id="fb"></div>`, 'timeline', lifelineBtn());
        bindLifeline(s);
        $('#pool').querySelectorAll('.tl-card').forEach(c => c.onclick = () => { sound('tap'); built.push(pool.splice(+c.dataset.k, 1)[0]); check(); });
        $('#built').querySelectorAll('.tl-card').forEach(c => c.onclick = () => { pool.push(built.splice(+c.dataset.k, 1)[0]); draw(); });
      };
      const check = () => {
        draw();
        if (pool.length) return;
        if (built.every((v, i) => v === i)) correct($('#built'), 12);
        else {
          wrong($('#built'), s.hint);
          setTimeout(() => { pool = built.concat(pool); built = []; const h = $('#hintbox')?.outerHTML; draw(); if (h) $('#fb').insertAdjacentHTML('afterend', h); }, 1000);
        }
      };
      draw();
    }
    else if (s.t === 'avatar') { showCreator(() => { screen = 'level'; next(); }, askLeave); }
    else if (s.t === 'name') {
      frame(`${guideHTML(true)}<div class="question">${tx(s.q)}</div>
        <input type="text" id="nm" maxlength="20" value="" autocomplete="off" placeholder="${tx('הַשֵּׁם שֶׁלִּי...')}">
        <div class="feedback" id="fb"></div>`, null, go('ok', tx('זֶה אֲנִי!')));
      $('#nm').focus();
      $('#nm').onkeydown = e => { if (e.key === 'Enter') $('#ok').click(); };
      $('#ok').onclick = () => { const v = $('#nm').value.trim(); if (v.length < 2) { wrong($('#nm')); return; } S.name = v; save(); refreshBar(); correct($('#ok'), 10); };
    }
    else if (s.t === 'write') {
      frame(`<div class="question">${tx(s.q)}</div>
        <div class="chips" style="min-height:0;margin-bottom:12px">${s.starters.map(w => `<button class="chip" data-w="${esc(tx(w))}">${tx(w)}</button>`).join('')}</div>
        <textarea id="ta" placeholder="${tx('כְּתֹב כָּאן...')}"></textarea>
        <div class="meter"><i id="mt"></i></div><div class="meter-label" id="ml"></div>
        <div class="feedback" id="fb"></div>`, 'write', `${rereadBtn()}${lifelineBtn()}${go('ok', `${icon('letter')} ${tx('שְׁלַח אֶת הַמִּכְתָּב')}`, 'gold main', '')}`);
      bindReread(); bindLifeline(s);
      const ta = $('#ta'), cnt = () => ta.value.trim().split(/\s+/).filter(Boolean).length, minW = writeMin(S.skill, s.minWords);   // מינימום מילים לפי הפרופיל
      const upd = () => {
        const n = cnt(); $('#mt').style.width = Math.min(100, n / minW * 100) + '%';
        $('#ml').textContent = n >= minW ? tx('✔ מְצֻיָּן! אֶפְשָׁר לִשְׁלֹחַ (וְגַם לְהוֹסִיף עוֹד)') : tx(minW - n === 1 ? 'עוֹד מִלָּה אַחַת' : `עוֹד ${minW - n} מִלִּים`);
        $('#ok').disabled = n < minW;
      };
      app.querySelectorAll('.chip').forEach(c => c.onclick = () => { ta.value = (ta.value.trim() + ' ' + c.dataset.w + ' ').trimStart(); ta.focus(); upd(); });
      ta.oninput = upd; upd();
      $('#ok').onclick = () => {
        const text = plain(ta.value), n = cnt();
        const hits = s.keywords.filter(k => text.includes(k)).length;
        const bonus = earn(15 + Math.min(15, n - minW) + hits * 3);
        S.tasks++; S.firstTry++; S.letters = (S.letters || 0) + 1; feedOwl(n); adapted(noteWrite(S.skill, n, minW)); save();
        store.sendLetter(L.lvl.id, ta.value).catch(() => {});
        store.notify('letter', { text: ta.value.slice(0, 140), level: plain(L.lvl.title) });
        sound('win'); addCoins(bonus, $('#ok'));
        showSheet('good', hits >= 2 ? tx('מִכְתָּב שֶׁל בַּלָּשׁ אֲמִתִּי!') : tx('מִכְתָּב נֶהְדָּר! הוּא נִשְׁלַח.'),
          (hits >= 2 ? tx('הִסְבַּרְתָּ בְּדִיּוּק מָה גִּלִּיתָ.') + ' ' : '') + gain(bonus), 1900);
        $('#ok').disabled = true; nextLater(1800);
      };
    }
  }

  async function finishLevel() {
    if (L.lvl.bonus) return finishBonus();
    const id = L.lvl.id, stars = L.mistakes === 0 ? 3 : L.mistakes <= 2 ? 2 : 1;
    if (S.resume && S.resume.id === id) delete S.resume;
    const firstTime = !S.done.includes(id);
    ensureToday();
    S.stars[id] = Math.max(S.stars[id] || 0, stars);
    if (firstTime) { S.done.push(id); if (!L.lvl.free) S.today.pages++; }
    const newCard = L.lvl.card && !S.cards.includes(L.lvl.card);
    if (newCard) S.cards.push(L.lvl.card);
    const golden = !!L.golden && firstTime;
    if (golden) S.goldenCount = (S.goldenCount || 0) + 1;
    S.shieldSaved = 0;
    const streakNow = updateStreak(); save(); refreshBar();
    store.log('level_done', { level: id, stars, mistakes: L.mistakes, seconds: Math.round((Date.now() - L.start) / 1000), replay: L.replay, golden, words: L.words || 0 });
    sound('win'); confetti(golden ? 90 : 60); setProg(100); setActions('');
    const c = CARDS[L.lvl.card] || { e: '🃏', name: L.lvl.title || '', fact: '' };
    overlay(`<div class="vbanner ${golden ? 'gold' : ''}">${tx(golden ? 'דַּף הַזָּהָב נִצַּל!' : 'הַדַּף נִצַּל!')}</div>
      <div class="restored">${scene(L.lvl.scene, {})}</div>
      <div class="vstars">${[0, 1, 2].map(i => icon(i < stars ? 'star' : 'starOff')).join('')}</div>
      <div class="rewards" id="tkLines"></div>
      ${L.replay ? `<div class="small">${tx('שָׁלָב חוֹזֵר: פָּחוֹת מַטְבְּעוֹת, אֲבָל אֶפְשָׁר לְשַׁפֵּר כּוֹכָבִים')}</div>` : ''}
      <p class="display v-tap">${tx('גַּע בַּתֵּבָה!')}</p>
      <button class="chest" id="chest">${CHEST_CLOSED}</button>`);
    root.querySelectorAll('.vstars .ico').forEach((st, i) => { st.style.animationDelay = (.35 + i * .3) + 's'; if (i < stars) setTimeout(() => sound('star', i), 350 + i * 300); });
    // כרטיסים
    const lines = [];
    if (firstTime) {
      const g = await awardTickets(1, 'דף: ' + plain(L.lvl.title));
      if (g) lines.push(`${icon('ticket')} ${plus(1)} · ${minutesText(SET.ticketMinutes)}`);
      if (!S.today.goalDone && S.today.pages >= SET.dailyGoal) {
        S.today.goalDone = true; save();
        const b = await awardTickets(1, 'משימת היום');
        lines.push(`${icon('chest')} ${tx('מְשִׂימַת הַיּוֹם הֻשְׁלְמָה!')}${b ? ' ' + plus(1) + icon('ticket') : ''}`);
        if (grantSpin('goal')) lines.push(`🎡 ${plus(1)} ${tx('סִבּוּב בְּגַלְגַּל הַמַּזָּל!')}`);
        store.notify('goal', { pages: S.today.pages });
        store.log('daily_goal', { pages: S.today.pages });
      }
      if (streakNow === 3 || (streakNow && streakNow % 7 === 0)) {
        const k = streakNow === 3 ? 1 : 2, b = await awardTickets(k, `רצף ${streakNow} ימים`);
        if (b) lines.push(`${icon('flame')} ${streakNow} ${tx('יָמִים בָּרֶצֶף!')} ${plus(b)}${icon('ticket')}`);
      }
      if (S.shieldSaved) lines.push(`🛡️ ${tx('מָגֵן הָרֶצֶף שָׁמַר עַל הָאֵשׁ שֶׁלְּךָ!')}`);
      if (!g && S.today.tickets >= SET.dailyTicketCap) lines.push(`<span class="muted">${tx('הִגַּעְתָּ לַמַּקְסִימוּם שֶׁל הַיּוֹם – מָחָר יֵשׁ עוֹד!')}</span>`);
    }
    if (golden) { lines.push(`✨ ${tx('בּוֹנוּס דַּף זָהָב')} ${plus(GOLDEN_BONUS)}${icon('coin')}`); setTimeout(() => addCoins(GOLDEN_BONUS, $('#tkLines') || $('#coinsPill')), 1400); }
    if (has('owl') && L.words) lines.push(`🦉 ${plus(L.words)} ${tx('מִלִּים לְ')}${owlName()}`);
    S.shieldSaved = 0; save();
    checkBadges();
    const tk = $('#tkLines'); if (tk && lines.length) tk.innerHTML = lines.map((l, i) => `<span class="rchip ${l.includes('class="muted"') ? 'muted' : ''}" style="animation-delay:${1.2 + i * .2}s">${l}</span>`).join('');
    $('#chest').onclick = () => {
      $('#chest').onclick = null;   // התיבה נפתחת פעם אחת בלבד – גם אם משהו ישתבש בהמשך
      const prize = earn(pick([10, 15, 20, 25, 30, 50]));
      addCoins(prize, $('#chest')); sound('chest'); confetti(20);
      // שלב 2: הפרס, הקלף החדש, ומה מחכה בפרק הבא
      $('#overlayBody').innerHTML = `<div class="v2">
        <div class="v2-prize"><span class="v2-chest">${CHEST_OPEN}</span><span class="prize">${plus(prize)} ${icon('coin')}</span></div>
        ${newCard ? `<div class="v2-label">${icon('cards')} ${tx('קְלָף חָדָשׁ לָאֹסֶף!')}</div>
          <div class="ccard wincard flipin"><div class="e">${c.e}</div><div><b>${tx(c.name)}</b><small>${tx(c.fact)}</small></div></div>` : ''}
        ${L.lvl.end ? `<p class="story v2-end">${tx(L.lvl.end)}</p>` : ''}
        <div class="row" style="justify-content:center"><button class="btn go big" id="cont">${tx('הַמְשֵׁךְ')} ${icon('next')}</button></div></div>`;
      $('#overlayBody').scrollTop = 0;
      if (newCard) setTimeout(() => sound('magic'), 350);
      kNarrate(`קִבַּלְתָּ ${prize} מַטְבְּעוֹת!${newCard ? ' וְגַם קְלָף חָדָשׁ: ' + c.name + '.' : ''} ${L.lvl.end || ''} גַּע בַּכַּפְתּוֹר הַיָּרֹק.`);
      $('#cont').onclick = async () => {
        const ch = chapterOfLevel(L.world, L.lvl.id);
        if (firstTime && ch && !L.lvl.free && chDone(ch)) {
          sound('cheer'); confetti(70);
          await popup(`${icon('crown', 'bigico')}<h2 class="display" style="font-size:30px">${tx('הִצַּלְתָּ אֶת כָּל הַסִּפּוּר שֶׁל')} ${tx(ch.name)}!</h2>
            <p class="story" style="font-size:22px">${tx(L.world === 'history' ? 'כָּל הַפְּרָקִים חָזְרוּ לַסֵּפֶר. עַכְשָׁו – בְּחַר גִּבּוֹר חָדָשׁ בַּמַּפָּה!' : 'קָרָאתָ אֶת כָּל הַסִּפּוּר! הַסִּפּוּר הַבָּא כְּבָר נִכְתָּב... בֵּינְתַיִם – בְּחַר עוֹלָם אַחֵר בַּמַּפָּה.')}</p>`, tx('לַמַּפָּה'));
        }
        // הרגע הכי טוב להפתעה: מיד אחרי ניצחון. ינשוף שגדל, ואז הפתעה חדשה אחת (אם הגיע הזמן)
        await owlMoment();
        if (await revealNext()) return;
        afterLevelNav();
      };
    };
  }

  /** אחרי ניצחון: נגמרו הדפים של היום → מסך הלילה; ישב הרבה זמן → הפסקה; אחרת → המפה */
  function afterLevelNav() {
    if (!L.lvl.free && pagesLeftToday() <= 0) { showSleep(L.world, true); return; }
    const mins = (Date.now() - sessionStart) / 60000;
    if (mins >= sessionMin(S.skill, SET.sessionMin)) showBreak(); else showMap(L.world);
  }
  function showBreak() {
    overlay(`${icon('moon', 'bigico')}<h2 class="display" style="font-size:30px">${tx('שׁוֹמֵר זְמַן טוֹב יוֹדֵעַ גַּם לָנוּחַ!')}</h2>
      <p class="story" style="font-size:24px">${tx('עָבַדְתָּ הַיּוֹם מְצֻיָּן. הַסֵּפֶר מְחַכֶּה לְךָ מָחָר – וְהָרֶצֶף שֶׁלְּךָ מַמְשִׁיךְ! 🔥')}</p>
      <div class="row" style="justify-content:center"><button class="btn go" id="bye">${tx('לְהִתְרָאוֹת!')} 👋</button><button class="btn ghost" id="more">${tx('עוֹד שָׁלָב אֶחָד')}</button></div>`);
    $('#bye').onclick = () => { closeOverlay(); showWorlds(); };
    $('#more').onclick = () => showMap(L.world);
  }

  /** 🏋️ חדר האימונים בגן: משחקונים על האותיות והמספרים שכבר פגשת */
  function showKidsPractice() {
    closeOverlay(); screen = 'practice'; setTab('practice');
    const k = S.kd, ls = k.letters.length ? k.letters : ['א', 'ב'], mx = Math.max(3, ...k.nums);
    const games = [['🎈', 'balloons', { mode: 'l', targets: [ls[ls.length - 1], ls[Math.floor(Math.random() * ls.length)]] }], ['🔤', 'first', { focus: ls[ls.length - 1], n: 3 }],
      ['✍️', 'trace', { letters: [ls[Math.floor(Math.random() * ls.length)]] }], ['🃏', 'memory', { letters: ls.slice(-3) }], ['🔢', 'count', { focus: mx, n: 3 }], ['🐻', 'feed', { focus: mx, n: 2 }]];
    app.innerHTML = `<h1 class="big-title">🏋️</h1><div class="kd-prac">${games.map(([e], i) => `<button class="kd-pbtn" data-i="${i}">${e}</button>`).join('')}</div>`;
    kScreen('practice', 'בְּמָה נְשַׂחֵק?');
    app.querySelectorAll('.kd-pbtn').forEach(b => b.onclick = () => {
      const [, g, a] = games[+b.dataset.i]; sound('tap'); screen = 'practice';
      let miss = 0; KG()[g]({ mark: ok => { if (!ok) miss++; }, miss: () => { miss++; }, done: () => { const n = 10 - Math.min(6, miss * 2); addCoins(n, $('#coinsPill')); sound('levelup'); showSheet('good', '⭐', gain(n), 1300); setTimeout(showKidsPractice, 1400); } }, a);
    });
  }
  /* 🐣 בגן: אותו מסלול בדיוק כמו אצל גור – אותם דפים, אותו סדר, אותן תחנות (שם, דמות, תיבה, מרוץ).
     רק המשימות מוחלפות, כל אחת במקום שלה, במשימת גן מקבילה: שאלה על הסיפור → משחק אותיות, תרגיל חשבון → ספירה,
     כתיבה → ציור אות, זירה → מרוץ איסוף. כל פרק מלמד אות אחת (מתחילים מהאות הראשונה של השם), והמספרים עולים בהדרגה. */
  function kinderSteps(base, steps) {
    const k = S.kd, fin = { 'ם': 'מ', 'ן': 'נ', 'ץ': 'צ', 'ך': 'כ', 'ף': 'פ' }, f0 = (S.name || '').replace(/[\u0591-\u05C7]/g, '').trim()[0];
    const order = [...(letterOf(fin[f0] || f0) ? [fin[f0] || f0] : []), ...LETTER_ORDER.filter(x => x !== (fin[f0] || f0))];
    if (!k.epL[base.id]) { k.epL[base.id] = order.find(x => !k.letters.includes(x)) || order[Math.floor(Math.random() * order.length)]; k.epN[base.id] = Math.min(10, Math.max(1, Math.ceil((k.letters.length + 1) / 2))); }
    const l = k.epL[base.id], n = k.epN[base.id] || 1;
    if (!k.letters.includes(l)) k.letters.push(l);
    if (!k.nums.includes(n)) k.nums.push(n);
    k.math = n >= 10 ? 6 : n >= 7 ? 5 : n >= 5 ? 4 : n >= 3 ? 3 : n >= 2 ? 2 : 1;
    const known = k.letters.filter(x => x !== l), other = () => (known.length ? known[Math.floor(Math.random() * known.length)] : l);
    const LETTER = ['first', 'balloons', 'memory'], MATH = ['count', 'feed', n >= 6 ? 'add' : n >= 3 ? 'more' : 'count'];
    let li = 0, mi = 0, met = false;
    const letterTask = () => {
      const g = LETTER[li++ % LETTER.length];
      const a = g === 'first' ? { focus: l, n: 2 } : g === 'balloons' ? { mode: 'l', targets: [l, other()] } : { letters: [l, ...known.slice(-2)] };
      const st = { t: 'kg', g: g === 'memory' && known.length < 2 ? 'first' : g, a: g === 'memory' && known.length < 2 ? { focus: l, n: 2 } : a };
      if (!met) { met = true; st.meet = l; }   // הפעם הראשונה בפרק: קודם פוגשים את האות
      return st;
    };
    const mathTask = () => { const g = MATH[mi++ % MATH.length]; return { t: 'kg', g, a: g === 'add' ? { max: Math.min(10, n), n: 2 } : g === 'more' ? { max: Math.max(5, n), n: 2 } : { focus: n, n: 2 } }; };
    const out = steps.map(st => {
      if (['read', 'chest', 'avatar', 'video'].includes(st.t)) return st;
      if (st.t === 'name') return { t: 'kname' };
      if (st.t === 'arena') return { t: 'kgrun', l };
      if (st.t === 'write') return { t: 'kg', g: 'trace', a: { letters: [l] }, ...(met ? {} : (met = true, { meet: l })) };
      if (st.t === 'number' || st.t === 'balance') return mathTask();
      return letterTask();   // choice, tf, find, order, timeline, myth, predict, aluf...
    });
    steps.length = 0; steps.push(...out); save();
  }
  /** משחקון גן בתוך פרק: בסוף – מטבעות לפי ההצלחה, והפרק ממשיך */
  function renderKG(s) {
    setActions(''); hideSheet(); setProg(L.step / L.lvl.steps.length * 100); drawJourney();
    const G = KG(), myStep = L.step, myL = L;
    if (s.meet && !(L.met || {})[myStep]) { L.met = { ...(L.met || {}), [myStep]: true }; G.meetLetter(s.meet, () => { if (L === myL && L.step === myStep) renderKG(s); }); return; }
    let miss = 0, first = 0;
    const ctx = { mark: ok => { if (ok) first++; else miss++; if (ok && !L.replay) { S.tasks++; S.firstTry++; } }, miss: () => { miss++; L.mistakes++; }, done: () => {
      const n = earn(Math.max(4, first * 4 + comboHit(miss === 0)));
      addCoins(n, $('#coinsPill')); showSheet('good', `${'⭐'.repeat(miss === 0 ? 3 : miss <= 2 ? 2 : 1)}`, gain(n), 1300); sound('levelup');
      setTimeout(() => { if (!destroyed && screen === 'level' && L === myL && L.step === myStep) next(); }, 1400);
    } };
    G[s.g](ctx, s.a || {});
  }
  /** 🏃 מרוץ גן: אוספים את האות של הפרק */
  function renderKGRun(s) {
    setFocus(askLeave, 'arena'); setActions(''); hideSheet(); keyHandler = null;
    const myL = L, myStep = L.step, alive = () => !destroyed && screen === 'level' && L === myL && myL.step === myStep;
    app.innerHTML = `<div class="runwrap" id="runHost"></div>`; window.scrollTo(0, 0);
    const pool = KG().distractors(s.l, 3);
    kNarrate(KST.runL(letterOf(s.l)));
    runCtl = startRun($('#runHost'), {
      qs: [], collect: { target: s.l, pool, need: 6 }, speed: 4.4, sceneName: L.lvl.scene, look: S.look || DEFAULT_LOOK, eq: S.equipped || {}, sound, TQ: 30, alive,
      boosts: L.boosts || [], coinIcon: `<b class="kd-rt">${s.l}</b>`, labels: { go: '▶', start: '!', finished: '⭐', finish: '🏁' },
      introHTML: `<div class="kd-run-intro">${friendSVG(s.l)}<div class="kd-swipe">👈 👉</div></div>`,
      onTok: (ok, c) => { KG().noteLetter(s.l, ok); if (ok && c % 2 === 0) kSay(KNUM[c]); },
      onProgress: p => setProg(p),
      onDone: r => { runCtl = null; if (!alive()) return; const n = earn(10 + r.coins * 3); addCoins(n, $('#coinsPill')); sound('cheer'); confetti(60); showSheet('good', '🏁 ' + tx(KPRAISE[Math.floor(Math.random() * KPRAISE.length)]), gain(n), 1600); kNarrate(KPRAISE[0]); nextLater(1800); },
    });
  }

  /* ---------------- 🎬 סרטון בתוך הסיפור ---------------- */
  function renderVideo(s) {
    const v = s.v, t = TOPICS[s.topic] || { title: '' }, line = `רֶגַע! מָצָאתִי בִּשְׁבִילְךָ סִרְטוֹן קָצָר עַל ${v.about || t.title}. רוֹצֶה לִרְאוֹת?`;
    frame(`${guideHTML(true)}<div class="vid-intro"><div class="qlabel">🎬 ${tx('סִרְטוֹן')}</div>
      <button class="vid-thumb" id="vidGo">${v.id ? `<img src="${ytThumb(v.id)}" alt="">` : v.poster ? `<img src="${v.poster}" alt="">` : ''}<span class="vid-play">▶</span></button>
      <p class="story">${tx(line)}</p></div>`, null, `<button class="btn ghost" id="vidSkip">${tx('אַחַר כָּךְ')}</button>` + go('vidGo2', `▶ ${tx('לִצְפּוֹת')}`));
    kNarrate(line);
    const play = () => { sound('tap'); openVideo(v, watched => {
      if (watched && !(S.videosSeen || []).includes(videoKey(v))) { S.videosSeen = [...(S.videosSeen || []), videoKey(v)]; const n = earn(15); addCoins(n, $('#coinsPill')); showSheet('good', '🎬 ' + tx('צָפִיתָ בַּסִּרְטוֹן!'), gain(n), 1300); save(); }
      store.log('video', { level: L.lvl.id, video: videoKey(v), title: v.title, watched });
      setTimeout(() => { if (screen === 'level') next(); }, watched ? 1300 : 200);
    }); };
    $('#vidGo').onclick = play; $('#vidGo2').onclick = play;
    $('#vidSkip').onclick = () => { sound('tap'); store.log('video_skip', { level: L.lvl.id, video: videoKey(v) }); next(); };
  }
  /** נגן נעול בחלון: בלי כפתורי יוטיוב ובלי קישורים החוצה; נסגר כשהסרטון נגמר. done(watched) */
  function openVideo(v, done) {
    const box = document.createElement('div'); box.className = 'vbox';
    box.innerHTML = `<div class="vb-card"><div class="vb-frame"><div id="vbPlayer"></div><div class="vb-shield" id="vbShield"></div>
        <div class="vb-paused" id="vbPaused"><span>▶</span></div><div class="vb-msg" id="vbMsg"></div></div>
      <div class="vb-bar"><button class="vb-btn" id="vbPlay">⏸</button><div class="vb-prog"><i id="vbProg"></i></div><button class="vb-btn" id="vbClose">✕</button></div></div>`;
    root.appendChild(box); audio.duck(true); try { tts && tts.cancel(); } catch (e) {}
    const q = sel => box.querySelector(sel);
    let player = null, playing = false, maxPct = 0, closed = false, tick = null;
    const setPlaying = on => { playing = on; q('#vbPlay').textContent = on ? '⏸' : '▶'; q('#vbPaused').classList.toggle('on', !on); };
    const close = watched => { if (closed) return; closed = true; clearInterval(tick); try { player && player.destroy && player.destroy(); } catch (e) {} box.remove(); audio.duck(false); done(!!watched || maxPct >= .8); };
    const toggle = () => { if (!player) return; try { if (playing) player.pauseVideo ? player.pauseVideo() : player.pause(); else player.playVideo ? player.playVideo() : player.play(); } catch (e) {} };
    q('#vbShield').onclick = toggle; q('#vbPaused').onclick = toggle; q('#vbPlay').onclick = toggle; q('#vbClose').onclick = () => { sound('tap'); close(false); };
    const prog = (cur, dur) => { if (!dur) return; const p = cur / dur; maxPct = Math.max(maxPct, p); q('#vbProg').style.width = (p * 100).toFixed(1) + '%'; };
    if (v.src) {   // סרטון שלנו
      q('#vbPlayer').outerHTML = `<video id="vbPlayer" src="${v.src}" ${v.poster ? `poster="${v.poster}"` : ''} playsinline controlslist="nodownload noplaybackrate" disablepictureinpicture></video>`;
      player = q('#vbPlayer'); player.onplay = () => setPlaying(true); player.onpause = () => setPlaying(false); player.onended = () => close(true);
      player.ontimeupdate = () => prog(player.currentTime, player.duration); player.play().catch(() => setPlaying(false)); return;
    }
    const start = () => {
      if (closed) return;
      player = new window.YT.Player(q('#vbPlayer'), { videoId: v.id, host: 'https://www.youtube-nocookie.com',
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, iv_load_policy: 3, fs: 0, disablekb: 1, controls: 0, cc_load_policy: 0, origin: location.origin },
        events: { onReady: e => { try { e.target.playVideo(); } catch (x) {} tick = setInterval(() => { try { prog(e.target.getCurrentTime(), e.target.getDuration()); } catch (x) {} }, 500); },
          onStateChange: e => { if (e.data === 0) close(true); else if (e.data === 1) setPlaying(true); else if (e.data === 2) setPlaying(false); },
          onError: () => { q('#vbMsg').textContent = tx('הַסִּרְטוֹן לֹא נִטְעַן. נַמְשִׁיךְ בַּסִּפּוּר!'); q('#vbMsg').classList.add('on'); setTimeout(() => close(false), 2500); } } });
    };
    if (window.YT && window.YT.Player) start();
    else {
      const prev = window.onYouTubeIframeAPIReady; window.onYouTubeIframeAPIReady = () => { if (prev) try { prev(); } catch (e) {} start(); };
      if (!document.getElementById('ytApi')) { const sc = document.createElement('script'); sc.id = 'ytApi'; sc.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(sc); }
      setTimeout(() => { if (!player && !closed) { q('#vbMsg').textContent = tx('הַסִּרְטוֹן לֹא נִטְעַן. נַמְשִׁיךְ בַּסִּפּוּר!'); q('#vbMsg').classList.add('on'); setTimeout(() => close(false), 2500); } }, 9000);
    }
    setPlaying(false); q('#vbPaused').classList.remove('on');
  }

  /* ---------------- 🎁 תיבת אוצר: נוגעים 3 פעמים – והיא נפתחת. בפנים: מטבעות או כוח למרוץ ---------------- */
  function renderChest() {
    frame(`<div class="chest-step"><div class="qlabel">🎁 ${tx('תֵּבַת אוֹצָר!')}</div>
      <button class="chest-big" id="chestBtn" aria-label="🎁"><span class="cb-glow"></span>${icon('chest')}<span class="cb-taps" id="cbTaps">3</span></button>
      <p class="story" id="chestTxt">${tx('מָצָאתָ תֵּבָה בְּאֶמְצַע הַדֶּרֶךְ! גַּע בָּהּ 3 פְּעָמִים כְּדֵי לִפְתֹּחַ אוֹתָהּ.')}</p></div>`, null, '');
    let taps = 0; const btn = $('#chestBtn');
    btn.onclick = () => {
      taps++; sound(taps < 3 ? 'tap' : 'chest'); btn.classList.remove('wob'); void btn.offsetWidth; btn.classList.add('wob');
      $('#cbTaps').textContent = Math.max(0, 3 - taps);
      if (taps < 3) return;
      btn.onclick = null; btn.classList.add('open'); confetti(45);
      const boost = !L.replay && Math.random() < .45, kinds = Object.keys(BOOST), kind = kinds[Math.floor(Math.random() * kinds.length)];
      let html;
      if (boost) { L.boosts = [...(L.boosts || []), kind]; drawPow(); html = `<span class="cb-prize">${BOOST[kind][0]}</span><b>${tx('כֹּחַ לַמֵּרוֹץ:')} ${tx(BOOST[kind][1])}!</b><small>${tx(kind === 'shield' ? 'מִכְשׁוֹל אֶחָד לֹא יַעֲצֹר אוֹתְךָ' : kind === 'magnet' ? 'הַמַּטְבְּעוֹת נִמְשָׁכִים אֵלֶיךָ מִכָּל הַמַּסְלוּלִים' : 'כָּל מַטְבֵּעַ בַּמֵּרוֹץ שָׁוֶה כָּפוּל')}</small>`; }
      else { const n = earn(L.replay ? 5 : 15 + Math.floor(Math.random() * 4) * 5); addCoins(n, btn); html = `<span class="cb-prize">🪙</span><b>${plus(n)} ${tx('מַטְבְּעוֹת!')}</b>`; }
      $('#chestTxt').innerHTML = `<span class="cb-out">${html}</span>`;
      setTimeout(() => { setActions(go('nx', tx('הַמְשֵׁךְ'))); $('#nx').onclick = () => { sound('page'); next(); }; }, 700);
    };
  }

  /* ---------------- 🏆 שאלת אלוף ---------------- */
  function renderAluf(s) {
    const order = s.options.map((_, i) => i).sort(() => Math.random() - .5);
    frame(`<div class="aluf-head">${icon('trophy')} ${tx('שְׁאֵלַת אַלּוּף')} <small>${tx('נִסָּיוֹן אֶחָד')} · ${plus(25)} ${icon('coin')}</small></div>
      <div class="question">${tx(s.q)}</div>
      <div class="options">${order.map((i, k) => `<button class="opt" data-i="${i}"><span class="ob">${LETTERS[k]}</span><span>${tx(s.options[i])}</span></button>`).join('')}</div>
      <div class="feedback" id="fb"></div>`, 'aluf');
    app.querySelectorAll('.opt').forEach(b => b.onclick = () => {
      app.querySelectorAll('.opt').forEach(x => x.disabled = true);
      const ok = +b.dataset.i === s.answer;
      const right = app.querySelector(`.opt[data-i="${s.answer}"]`); right.classList.add('right');
      S.tasks++;
      if (ok) {
        S.firstTry++; S.aluf = { ...(S.aluf || {}), [L.lvl.id]: true }; save();
        sound('win'); confetti(30); addCoins(earn(25), b);
      } else { b.classList.add('wrong'); sound('bad'); save(); }
      store.log('aluf', { level: L.lvl.id, ok });
      const btn = `<button class="btn ${ok ? 'go' : 'gold'}" id="alNext">${tx('הַמְשֵׁךְ')} ${icon('next')}</button>`;
      if (ok) showSheet('good', tx('אַלּוּף אֲמִתִּי!'), tx('זָכַרְתָּ אֶת כָּל הַדַּף!') + ' ' + gain(earn(25)), 0, btn);
      else showSheet('bad', tx('לֹא נוֹרָא!'), tx('הַתְּשׁוּבָה הַנְּכוֹנָה מְסֻמֶּנֶת בְּיָרֹק. בַּפַּעַם הַבָּאָה!'), 0, btn);
      $('#alNext').onclick = () => { hideSheet(); next(); };
    });
  }

  /* ---------------- 🏆 זירת הטריוויה ---------------- */
  const headOf = p => keeperSVG(p.eq || {}, { head: true, look: p.look || DEFAULT_LOOK });
  function renderArena(s) {
    setFocus(askLeave, 'arena'); setActions('');
    const myL = L, myStep = L.step, alive = () => !destroyed && screen === 'level' && L === myL && myL.step === myStep;
    const later = (fn, ms) => { const t = setTimeout(() => { if (alive()) fn(); }, ms); timers.push(t); return t; };
    checkWeek(); ensureWeek(S);
    const TQ = SET.arenaSec || arenaSec(S.skill), qs = s.quiz.slice(0, arenaQs(S.skill)), luck = Math.random(), played = S.arena.played || 0;   // זמן לשאלה לפי מהירות הקריאה
    const me = { id: 'me', me: true, look: S.look, eq: S.equipped, total: 0, got: 0 };
    const bots = pickRivals(S.name).map(r => ({ ...r, total: 0, got: 0 }));
    const players = [me, ...bots];
    let qi = 0, right = 0;
    const pname = p => p.me ? tx('אַתָּה') : tx(p.name);
    const ranked = () => [...players].sort((a, b) => b.total - a.total || (a.me ? -1 : b.me ? 1 : 0));
    const slot = p => `<span class="ar-av">${headOf(p)}</span><b>${pname(p)}</b><small>${p.me ? esc(S.name || '') : tx(p.city)}</small>`;
    const chip = p => `<div class="ar-chip ${p.me ? 'me' : ''}" data-id="${p.id}"><span class="ar-av">${headOf(p)}</span><b>${pname(p)}</b><span class="ar-pts">${p.total}</span><span class="ar-gain"></span></div>`;

    // 1. מחפשים מתחרים – כ־5 שניות: כל מושב "מגלגל" פרצופים עד שמישהו נכנס
    const heads = RIVALS.map(r => headOf(r)), joinAt = [900, 1750, 2650, 3550, 4450].map(t => t + Math.round(Math.random() * 200));
    app.innerHTML = `<div class="panel arena-lobby">
      <div class="ar-banner">${icon('trophy')}<span>${tx('זִירַת הַטְּרִיוְיָה')}</span></div>
      ${tipHTML('arena')}<p class="ar-sub">${tx('שִׁשָּׁה שׁוֹמְרֵי זְמַן מֵהָאָקָדֶמְיָה שֶׁל יוּבַל.')} ${qs.length} ${tx('שְׁאֵלוֹת עַל הַדַּף. מִי יַעֲנֶה הֲכִי נָכוֹן – וַהֲכִי מַהֵר?')}</p>
      <div class="ar-search"><span class="ar-radar"><i></i></span><div class="ar-meter"><b id="arCount">1/6</b><div class="qbar"><i id="arFill" style="width:16%"></i></div></div></div>
      <div class="ar-slots">${players.map((p, i) => `<div class="ar-slot ${p.me ? 'me in' : 'spin'}" data-i="${i}">${p.me ? slot(p) : `<span class="ar-av ar-roll">${heads[i % heads.length]}</span><b class="ar-looking">${tx('מְחַפֵּשׂ...')}</b>`}</div>`).join('')}</div>
      <div class="ar-feed" id="arFeed"></div>
      <div class="ar-status" id="arStatus"><span class="dots"><i></i><i></i><i></i></span> ${tx('מְחַפְּשִׂים שׁוֹמְרִים פְּנוּיִים...')}</div></div>`;
    let joined = 1;
    bots.forEach((b, k) => {
      const el = app.querySelector(`.ar-slot[data-i="${k + 1}"]`), roll = el && el.querySelector('.ar-roll');
      let n = k * 3;
      const spin = setInterval(() => { if (!alive() || !roll || !roll.isConnected) { clearInterval(spin); return; } roll.innerHTML = heads[(n++) % heads.length]; if (n % 4 === 0) sound('tick'); }, 120);
      timers.push(spin);
      later(() => {
        clearInterval(spin); if (!el) return;
        el.classList.remove('spin'); el.innerHTML = slot(b); el.classList.add('in'); sound('pop');
        joined++; $('#arCount').textContent = `${joined}/6`; $('#arFill').style.width = (joined / 6 * 100) + '%';
        const girl = b.look && b.look.body === 'girl';
        $('#arFeed').insertAdjacentHTML('afterbegin', `<div class="ar-join"><span class="ar-av">${headOf(b)}</span><span><b>${tx(b.name)}</b> ${tx(girl ? 'הִצְטָרְפָה לַזִּירָה!' : 'הִצְטָרֵף לַזִּירָה!')} <small>📍 ${tx(b.city)}</small></span></div>`);
        const feed = $('#arFeed'); while (feed.children.length > 2) feed.lastChild.remove();
      }, joinAt[k]);
    });
    later(() => {
      app.querySelector('.ar-search')?.classList.add('full');
      $('#arStatus').innerHTML = `${icon('check')} ${tx('כֻּלָּם כָּאן! מוּכָן?')}`; sound('levelup');
      setActions(`<div class="grow"></div><button class="btn go big" id="arGo">${tx('אֲנִי מוּכָן!')} ${icon('next')}</button>`);
      $('#arGo').onclick = countdown;
    }, joinAt[joinAt.length - 1] + 450);

    // 2. ספירה לאחור
    function countdown() {
      setActions(''); let n = 3;
      const show = () => {
        app.innerHTML = `<div class="ar-count"><span>${n || tx('צֵא!')}</span></div>`;
        sound(n ? 'beep' : 'go');
        if (n === 0) { later(askQ, 650); return; }
        n--; later(show, 800);
      };
      show();
    }

    // 3. שאלה
    function askQ() {
      const q = qs[qi], order = q.tf ? [0, 1] : q.options.map((_, i) => i).sort(() => Math.random() - .5);
      setProg(qi / qs.length * 100); hideSheet();
      app.innerHTML = `<div class="arena"><div class="ar-strip">${ranked().map(chip).join('')}</div>
        <div class="panel ar-q"><div class="ar-meta"><span class="tagp">${tx('שְׁאֵלָה')} ${qi + 1}/${qs.length}</span><div class="ar-timer" id="arTW"><i id="arT"></i></div><span class="ar-secs" id="arS">${TQ}</span></div>
        <div class="question">${tx(q.q)}</div>
        <div class="options ${q.tf ? 'tf' : ''}">${order.map((i, k) => `<button class="opt" data-i="${i}"><span class="ob">${q.tf ? icon(i === 0 ? 'check' : 'cross') : LETTERS[k]}</span><span>${tx(q.options[i])}</span></button>`).join('')}</div></div></div>`;
      const t0 = performance.now(); let done = false, lastSec = TQ;
      const markBot = b => { if (b.answered) return; b.answered = true; app.querySelector(`.ar-chip[data-id="${b.id}"]`)?.classList.add('answered'); };
      bots.forEach(b => { b.answered = false; b.got = 0; b.t = TQ * (.2 + Math.random() * .42) * (1.2 - b.skill * .35); b.to = later(() => markBot(b), b.t * 1000); });
      const tInt = setInterval(() => {
        if (!alive() || done) { clearInterval(tInt); return; }
        const left = Math.max(0, TQ - (performance.now() - t0) / 1000);
        const bar = $('#arT'); if (bar) bar.style.width = (left / TQ * 100) + '%';
        const sec = Math.ceil(left);
        if (sec !== lastSec) { lastSec = sec; const se = $('#arS'); if (se) se.textContent = sec; if (sec <= 5) { $('#arTW')?.classList.add('low'); if (sec > 0) sound('tick'); } }
        if (left <= 0) finishQ(null, TQ);
      }, 100);
      timers.push(tInt);
      function finishQ(choice, el) {
        if (done) return; done = true; clearInterval(tInt);
        app.querySelectorAll('.opt').forEach(x => x.disabled = true);
        const ok = choice === q.answer; if (ok) right++;
        me.got = ok ? 100 + speedPts(el, TQ) : 0;
        if (choice == null) sound('buzz');
        let wait = 900;
        bots.forEach(b => { if (!b.answered) { const d = 250 + Math.random() * 650; wait = Math.max(wait, d + 250); clearTimeout(b.to); later(() => markBot(b), d); } });
        later(() => reveal(choice, ok), wait);
      }
      app.querySelectorAll('.opt').forEach(b => b.onclick = () => { sound('tap'); b.classList.add('picked'); finishQ(+b.dataset.i, (performance.now() - t0) / 1000); });
      keyHandler = e => { const k = { '1': 0, '2': 1, '3': 2, '4': 3 }[e.key]; const b = k != null && app.querySelectorAll('.opt')[k]; if (b && !b.disabled) b.click(); };
    }

    // 4. חשיפה וניקוד
    function reveal(choice, ok) {
      const q = qs[qi];
      bots.forEach(b => { b.right = Math.random() < b.skill * .95; b.got = b.right ? 100 + speedPts(b.t, TQ) : 0; });
      me.total += me.got;
      settleRound(me, bots, allowedAbove(right, qi + 1, played, luck));
      app.querySelector(`.opt[data-i="${q.answer}"]`)?.classList.add('right');
      if (choice != null && !ok) app.querySelector(`.opt[data-i="${choice}"]`)?.classList.add('wrong');
      if (ok) { sound('ok'); showSheet('good', tx(pick(PRAISE)), gain(me.got), 1900); }
      else { sound('bad'); showSheet('bad', choice == null ? tx('נִגְמַר הַזְּמַן!') : tx('לֹא הַפַּעַם...'), tx('הַתְּשׁוּבָה הַנְּכוֹנָה מְסֻמֶּנֶת בְּיָרֹק'), 1900); }
      players.forEach(p => {
        const c = app.querySelector(`.ar-chip[data-id="${p.id}"]`); if (!c) return;
        c.classList.remove('answered'); c.querySelector('.ar-pts').textContent = p.total;
        const g = c.querySelector('.ar-gain'); g.textContent = p.got ? '+' + p.got : '0'; g.className = 'ar-gain show ' + (p.got ? 'up' : 'zero');
      });
      later(() => { const st = app.querySelector('.ar-strip'); if (st) { st.innerHTML = ranked().map(chip).join(''); st.classList.add('reorder'); } }, 1350);
      later(() => { qi++; if (qi < qs.length) askQ(); else results(); }, 2700);
    }

    // 5. פודיום
    function results() {
      setProg(100); setActions(''); hideSheet(); keyHandler = null;
      app.innerHTML = `<div class="ar-drum"><div class="ar-banner">${icon('trophy')}<span>${tx('וְהַמְּנַצֵּחַ הוּא...')}</span></div><span class="dots big"><i></i><i></i><i></i></span></div>`;
      sound('drumroll');
      later(podium, 1550);
    }
    function podium() { arenaPodium(players, right, qs.length); }
  }

  /* ---------------- 🏃 מֵרוֹץ הַסִּפּוּר (במקום הזירה): רצים בעולם של הפרק, ובכל שער עונים על שאלה מהסיפור ---------------- */
  let runCtl = null;
  function renderRun(s) {
    setFocus(askLeave, 'arena'); setActions(''); hideSheet(); keyHandler = null;
    const myL = L, myStep = L.step, alive = () => !destroyed && screen === 'level' && L === myL && myL.step === myStep;
    checkWeek(); ensureWeek(S);
    const TQ = SET.arenaSec || arenaSec(S.skill), qs = s.quiz.slice(0, arenaQs(S.skill));   // בלי שעון: הזמן רק לבונוס מהירות
    const first = !(S.tips || {}).run; S.tips = { ...(S.tips || {}), run: true };
    const lv = runLevel(S.skill), hints = (S.skill.run.n || 0) < 2; save();   // רמה לפי ההצלחה במרוצים הקודמים; בשני המרוצים הראשונים – רמזים
    app.innerHTML = `<div class="runwrap" id="runHost"></div>`;
    window.scrollTo(0, 0);
    const how = (e, t) => `<div class="rn-how"><span>${e}</span><b>${tx(t)}</b></div>`;
    runCtl = startRun($('#runHost'), {
      qs: qs.map(q => ({ ...q, q: tx(q.q), options: q.options.map(x => tx(x)) })),
      sceneName: L.lvl.scene, look: S.look || DEFAULT_LOOK, eq: S.equipped || {}, sound, TQ, alive, coinIcon: icon('coin'),
      level: lv, nOpts: runOptions(S.skill), hints, boosts: L.boosts || [],
      spare: [...s.quiz.slice(qs.length), ...(ALUF[L.lvl.id] ? [ALUF[L.lvl.id]] : []),
        ...L.lvl.steps.filter(x => x.t === 'read').sort(() => Math.random() - .5).slice(0, 4).map(x => clozeQuestion(x.lines)).filter(Boolean)]
        .map(q => ({ ...q, q: tx(q.q), options: q.options.map(x => tx(x)) })),
      labels: { question: tx('שַׁעַר'), pick: tx('בְּחַר תְּשׁוּבָה – וְתָרוּץ דֶּרֶךְ הַשַּׁעַר שֶׁלָּהּ!'), answer: tx('הַתְּשׁוּבָה הַנְּכוֹנָה:'), finish: tx('סִיּוּם'),
        finished: tx('🏁 הִגַּעְתָּ!'), go: `${tx('יוֹצְאִים לַדֶּרֶךְ!')} ${icon('next')}`, start: tx('רוּץ!'),
        hintJump: `⬆️ ${tx('מִכְשׁוֹל! הַחְלֵק לְמַעְלָה – וְתִקְפֹּץ')}`, hintSide: `👈👉 ${tx('הַחְלֵק הַצִּדָּה – אֶל הַמַּטְבְּעוֹת')}`,
        retry: tx('כִּמְעַט! נַסֵּה שׁוּב – יֵשׁ לְךָ עוֹד נִסָּיוֹן'), other: tx('לֹא נוֹרָא! הִנֵּה שְׁאֵלָה אַחֶרֶת'), shield: tx('הַמָּגֵן שָׁמַר עָלֶיךָ!') },
      introHTML: `<div class="rn-title">🏃 ${tx('מֵרוֹץ הַסִּפּוּר')}</div><div class="rn-lv">${'⚡'.repeat(lv)}<span>${tx('רָמָה')} ${lv}</span></div>
        <p>${tx(first ? 'רָצִים בָּעוֹלָם שֶׁל הַפֶּרֶק! בְּכָל שַׁעַר יֵשׁ שְׁאֵלָה עַל הַסִּפּוּר – בּוֹחֲרִים תְּשׁוּבָה, וְרָצִים דֶּרֶךְ הַשַּׁעַר שֶׁלָּהּ.' : `${qs.length} שְׁעָרִים, ${qs.length} שְׁאֵלוֹת עַל הַסִּפּוּר. מוּכָן?`)}</p>
        ${(L.boosts || []).length ? `<div class="rn-boost-in">${tx('הַכֹּחוֹת שֶׁאָסַפְתָּ בַּפֶּרֶק:')} ${L.boosts.map(b => `<span title="${tx(BOOST[b][1])}">${BOOST[b][0]}</span>`).join('')}</div>` : ''}
        <div class="rn-hows">${how('👈👉', 'מַחְלִיקִים לַצְּדָדִים – עוֹבְרִים מַסְלוּל')}${how('👆', 'מַחְלִיקִים לְמַעְלָה – קוֹפְצִים')}${how('🪙', 'אוֹסְפִים מַטְבְּעוֹת')}${how('🚪', 'בַּשַּׁעַר – בּוֹחֲרִים תְּשׁוּבָה')}</div>`,
      onProgress: p => setProg(p),
      onDone: r => { runCtl = null; if (alive()) runResults(r, qs, TQ, lv); },
    });
  }
  /** אחרי המרוץ: אותם מתחרים כמו בזירה (בלי לראות אותם רצים), פודיום וטבלת השבוע */
  function runResults(r, qs, TQ, lv) {
    hideSheet(); setProg(100);
    // המשחק לומד: הבנת הנקרא מהשערים, ורמת המרוץ מהמטבעות וההתנגשויות
    r.answers.forEach(a => adapted(noteAnswer(S.skill, 'comp', a.first)));
    const ch = noteRun(S.skill, r), nlv = S.skill.run.lv; adapted(ch);
    const me = { id: 'me', me: true, look: S.look, eq: S.equipped, total: 0, got: 0 };
    const bots = pickRivals(S.name).map(b => ({ ...b, total: 0, got: 0 }));
    const luck = Math.random(), played = (S.arena || {}).played || 0;
    let ok = 0;
    r.answers.forEach((a, i) => {
      if (a.ok) ok++;
      me.got = a.pts; me.total += a.pts;
      bots.forEach(b => { b.got = Math.random() < b.skill * .95 ? 100 + speedPts(TQ * (.2 + Math.random() * .42) * (1.2 - b.skill * .35), TQ) : 0; });
      settleRound(me, bots, allowedAbove(ok, i + 1, played, luck));
    });
    const extra = Math.max(0, r.score - r.answers.reduce((a, x) => a + x.pts, 0));   // נקודות המטבעות מהדרך
    me.got = extra; me.total += extra;
    bots.forEach(b => { b.got = Math.round((60 + Math.random() * 120) * b.skill); });
    settleRound(me, bots, allowedAbove(ok, Math.max(1, r.answers.length), played, luck));
    arenaPodium([me, ...bots], ok, qs.length, { mode: 'run', bonusCoins: r.coins, hits: r.hits,
      chips: `<span class="rchip">🪙 ${r.coins} ${tx('מַטְבְּעוֹת בַּדֶּרֶךְ')}</span><span class="rchip ${nlv > lv ? 'lvup' : ''}">⚡ ${tx('רָמָה')} ${nlv}${nlv > lv ? ' <bdi dir="ltr" class="up">▲</bdi>' : ''}</span>` });
  }

  /** הפודיום בסוף זירה או מרוץ: מקום, מטבעות, טבלת השבוע. extra – פרסים נוספים (למשל מטבעות שנאספו במרוץ) */
  function arenaPodium(players, right, nq, o = {}) {
      const me = players.find(p => p.me), pname = p => p.me ? tx('אַתָּה') : tx(p.name);
      const ranked = () => [...players].sort((a, b) => b.total - a.total || (a.me ? -1 : b.me ? 1 : 0));
      const R = ranked(), my = R.findIndex(p => p.me) + 1;
      S.arena.played = (S.arena.played || 0) + 1;
      if (my === 1) { S.arena.wins = (S.arena.wins || 0) + 1; S.aluf = { ...(S.aluf || {}), [L.lvl.id]: true }; }
      S.arena.best = S.arena.best ? Math.min(S.arena.best, my) : my;
      const board = updateWeek(S, players), w = S.arena.week, wRank = board.findIndex(r => r.me) + 1, wPrev = w.lastRank || 0; w.lastRank = wRank;
      S.tasks += nq; S.firstTry += right; save(); checkBadges();
      const prize = earn([0, 40, 30, 25, 15, 10, 10][my] + (o.bonusCoins || 0));
      store.log('arena', { level: L.lvl.id, rank: my, right, of: nq, points: me.total, week: wRank, mode: o.mode || 'arena', coins: o.bonusCoins || 0, hits: o.hits || 0 });
      const stand = (p, place) => p ? `<div class="pd pd${place} ${p.me ? 'me' : ''}"><span class="pd-av">${keeperSVG(p.eq || {}, { look: p.look || DEFAULT_LOOK })}</span>
        <b>${pname(p)}</b><small>${p.total}</small><div class="pd-block"><span>${place}</span></div></div>` : '';
      const msg = my === 1 ? (o.mode === 'run' ? 'נִצַּחְתָּ בַּמֵּרוֹץ! אַתָּה הָאַלּוּף שֶׁל הַדַּף!' : 'נִצַּחְתָּ בַּזִּירָה! אַתָּה הָאַלּוּף שֶׁל הַדַּף!') : my <= 3 ? 'עָלִיתָ לַפּוֹדְיוּם! כָּל הַכָּבוֹד!' : (o.mode === 'run' ? 'כִּמְעַט בַּפּוֹדְיוּם! בַּמֵּרוֹץ הַבָּא תַּצְלִיחַ עוֹד יוֹתֵר.' : 'כִּמְעַט בַּפּוֹדְיוּם! בַּזִּירָה הַבָּאָה תַּצְלִיחַ עוֹד יוֹתֵר.');
      app.innerHTML = `<div class="panel ar-results">
        <div class="ar-banner">${icon(my === 1 ? 'crown' : 'trophy')}<span>${tx(msg)}</span></div>
        <div class="podium">${stand(R[1], 2)}${stand(R[0], 1)}${stand(R[2], 3)}</div>
        <div class="ar-rest">${R.slice(3).map((p, k) => `<div class="ar-row ${p.me ? 'me' : ''}"><span class="ar-place">${k + 4}</span><span class="ar-av">${headOf(p)}</span><b>${pname(p)}</b><span class="ar-pts">${p.total}</span></div>`).join('')}</div>
        <div class="rewards">
          <span class="rchip">${icon('check')} ${right}/${nq} ${tx('נְכוֹנוֹת')}</span>
          ${o.chips || ''}<span class="rchip">${icon('coin')} ${plus(prize)}</span>
          <span class="rchip">${icon('crown')} ${tx('מָקוֹם')} ${wRank} ${tx('בַּשָּׁבוּעַ')}${wPrev && wRank < wPrev ? ` <bdi dir="ltr" class="up">▲${wPrev - wRank}</bdi>` : ''}</span>
          ${leagueTag() ? `<span class="rchip">${leagueTag()}</span>` : ''}
        </div></div>`;
      addCoins(prize, app.querySelector('.pd.me') || $('#coinsPill'));
      if (my <= 3) { sound('cheer'); confetti(my === 1 ? 80 : 45); } else sound('ok');
      setActions(`<button class="btn ghost" id="arBoard">${icon('crown')} ${tx('טַבְלַת הַשָּׁבוּעַ')}</button><div class="grow"></div><button class="btn go" id="arDone">${tx('הַמְשֵׁךְ')} ${icon('next')}</button>`);
      $('#arBoard').onclick = showBoard;
      $('#arDone').onclick = () => { setActions(''); next(); };
    }

  /** הטבלה השבועית */
  function showBoard() {
    checkWeek();
    const board = leaderboard(S), w = S.arena.week, byId = Object.fromEntries(RIVALS.map(r => [r.id, r]));
    const lg = has('league') && S.league ? LEAGUES[S.league.tier] : null, nxl = lg && LEAGUES[S.league.tier + 1];
    overlay(`<div class="ar-banner small">${icon('crown')}<span>${tx('טַבְלַת הַשָּׁבוּעַ')}</span></div>
      ${lg ? `<div class="league-line" style="--lc:${lg.c}"><span class="le">${lg.e}</span><b>${tx('לִיגַת')} ${tx(lg.name)}</b><small>${nxl ? `${tx('3 הָרִאשׁוֹנִים בְּסוֹף הַשָּׁבוּעַ עוֹלִים לְלִיגַת')} ${tx(nxl.name)} ${nxl.e}` : tx('הַלִּיגָה הֲכִי גְּבוֹהָה!')}</small></div>` : ''}
      <p class="small" style="margin:0 0 6px">${w.games ? tx(SET.endGame === 'arena' ? 'הַנְּקֻדּוֹת מִכָּל הַזִּירוֹת הַשָּׁבוּעַ. הַטַּבְלָה מִתְאַפֶּסֶת בְּיוֹם רִאשׁוֹן.' : 'הַנְּקֻדּוֹת מִכָּל הַמֵּרוֹצִים הַשָּׁבוּעַ. הַטַּבְלָה מִתְאַפֶּסֶת בְּיוֹם רִאשׁוֹן.') : tx(SET.endGame === 'arena' ? 'עוֹד לֹא הִשְׁתַּתַּפְתָּ הַשָּׁבוּעַ. כָּל דַּף נִגְמָר בְּזִירָה!' : 'עוֹד לֹא הִשְׁתַּתַּפְתָּ הַשָּׁבוּעַ. כָּל דַּף נִגְמָר בְּמֵרוֹץ!')}</p>
      <div class="lb">${board.slice(0, 8).map((r, i) => { const p = r.me ? { me: true, look: S.look, eq: S.equipped } : byId[r.id];
        return `<div class="lb-row ${r.me ? 'me' : ''} ${i < 3 ? 'top' : ''}"><span class="ar-place">${i + 1}</span><span class="ar-av">${headOf(p)}</span>
          <span class="lb-name"><b>${r.me ? esc(S.name || tx('אַתָּה')) : tx(p.name)}</b><small>${r.me ? tx('אַתָּה') : tx(p.city)}</small></span><span class="ar-pts">${r.pts}</span></div>`; }).join('')}</div>
      <div class="row" style="justify-content:center;margin-top:10px"><button class="btn go" id="lbOk">${tx('סָגוּר')}</button></div>`);
    $('#lbOk').onclick = closeOverlay;
  }

  /* ---------------- אימון שומרי הזמן: הסבר על המשחק לילד ---------------- */
  let tour = null;
  function maybeTutorial() {
    if (!S.done.includes('p1') || overlayOpen() || tour) return;
    if (!S.look) { showCreator(() => showMap('history')); return; }
    if (S.tutorialDone) return;
    if (screen !== 'worlds') { showWorlds(); return; }
    setTimeout(() => startTutorial(true), 500);
  }
  function tourSteps(first) {
    const h = helper(), mins = SET.ticketMinutes === 1 ? 'דַּקָּה אַחַת' : `${SET.ticketMinutes} דַּקּוֹת`;
    const pp = SET.pagesPerDay === 1 ? 'דַּף אֶחָד חָדָשׁ' : `${SET.pagesPerDay} דַּפִּים חֲדָשִׁים`;
    const box = (ic, b, t) => `<div class="tg-box"><span class="tg-ic">${ic}</span><b>${tx(b)}</b>${t ? `<span>${tx(t)}</span>` : ''}</div>`;
    const flow = (...boxes) => `<div class="tg-flow">${boxes.join('<i class="tg-arr">←</i>')}</div>`;
    // ילד בגן: סיור קצר, בקול, בלי כרטיסים/טלפון/הקראה בתשלום
    if (KIDS()) {
      const ks = [
        { sel: null, icon: 'crown', title: 'הַמְּשִׂימָה שֶׁלְּךָ', say: K_SCREEN.tour1, html: `<div class="tg-goal"><span class="tg-book">${icon('book')}</span><span class="tg-zap">⚡</span>
          <svg class="tg-er" viewBox="-60 -80 120 136" aria-hidden="true">${eraserFig(0, 0, 1)}</svg></div><p class="coach-text">${tx(K_SCREEN.tour1)}</p>` },
        { sel: '#playBtn', say: K_SCREEN.tour2, text: K_SCREEN.tour2 },
      ];
      if (first) ks.push({ sel: null, icon: 'chest', title: 'מַתָּנָה!', say: K_SCREEN.tour3, text: K_SCREEN.tour3, gift: true });
      return ks;
    }
    // הדרכה שמסבירה את המטרה ואיך זה עובד – בכרטיסים קצרים עם ציורים. אפשר לדלג בכל רגע
    const steps = [
      { sel: null, icon: 'crown', title: 'הַמְּשִׂימָה שֶׁלְּךָ', html: `<div class="tg-goal"><span class="tg-book">${icon('book')}</span><span class="tg-zap">⚡</span>
          <svg class="tg-er" viewBox="-60 -80 120 136" aria-hidden="true">${eraserFig(0, 0, 1)}</svg></div>
        <p class="coach-text">${tx('הַמּוֹחֵק מוֹחֵק גִּבּוֹרִים אֲמִתִּיִּים מִסֵּפֶר הַזְּמַן – וְכָל הָעוֹלָם שׁוֹכֵחַ אוֹתָם!')}</p>
        <p class="coach-text"><b>${tx('אַתָּה שׁוֹמֵר הַזְּמַן:')}</b> ${tx('קוֹפְצִים לְתוֹךְ הַסִּפּוּרִים – וּמַצִּילִים אֶת הַדַּפִּים, אֶחָד אַחֲרֵי הַשֵּׁנִי.')}</p>` },
      { sel: null, icon: 'book', title: 'אֵיךְ מַצִּילִים דַּף?', html: flow(box(icon('book'), 'קוֹרְאִים', 'אֶת הַסִּפּוּר'), box(icon('pencil'), 'פּוֹתְרִים', 'שְׁאֵלוֹת, כְּתִיבָה וְחֶשְׁבּוֹן'), box(icon('star'), 'הַדַּף נִצַּל!', ''))
        + `<p class="coach-text">${tx('לְכָל גִּבּוֹר יֵשׁ 7 פְּרָקִים – כְּמוֹ סִדְרָה!')}</p>` },
      { sel: '#playBtn', text: 'מַתְחִילִים כָּאן: לוֹחֲצִים ← בּוֹחֲרִים גִּבּוֹר בַּמַּפָּה ← וְקוֹפְצִים לַסִּפּוּר שֶׁלּוֹ.' },
      { sel: null, icon: 'chest', title: 'מָה מַרְוִיחִים?', html: `<div class="tg-flow three">${box(icon('coin'), 'מַטְבְּעוֹת', 'קוֹנִים בַּחֲנוּת בְּגָדִים לַשּׁוֹמֵר')}${box(icon('cards'), 'קְלָפִים', 'אוֹסְפִים גִּבּוֹרִים וְאוֹצָרוֹת')}${box(icon('ticket'), 'כַּרְטִיסִים', `כָּל פֶּרֶק חָדָשׁ = ${mins} מָסָךְ!`)}</div>` },
      { sel: '#ticketsBtn', text: `כָּאן הַכַּרְטִיסִים שֶׁלְּךָ. אוֹסְפִים – וּמְשַׁלְּמִים בָּהֶם עַל זְמַן מָסָךְ אוֹ כַּדּוּרֶגֶל!` },
      ...(!first && has('practice') ? [{ sel: '#tab-practice', text: 'חֲדַר הָאִימּוּנִים: חֶשְׁבּוֹן, כְּתִיבָה וְחִידָה. עָשִׂיתָ אֶת שְׁלָשְׁתָּם? עוֹד כַּרְטִיס!' }] : []),
      { sel: null, icon: 'flame', title: 'כָּל יוֹם – הַרְפַּתְקָה חֲדָשָׁה', html: `<div class="tg-list">
          ${box(icon('moon'), `כָּל יוֹם נִפְתָּחִים ${pp}`, 'בַּלַּיְלָה הַסֵּפֶר נָח – וּמָחָר מַמְשִׁיכִים.')}
          ${box(icon('flame'), 'בָּאִים כָּל יוֹם? הָרֶצֶף גָּדֵל!', 'וְעַל רֶצֶף מְקַבְּלִים עוֹד כַּרְטִיסִים.')}
          ${box('🎁', 'וְכָל כַּמָּה פְּרָקִים –', 'מִתְגַּלָּה הַפְתָּעָה חֲדָשָׁה!')}</div>` },
      { sel: null, icon: 'bulb', title: 'נִתְקַעְתָּ?', html: `<div class="coach-help">
          <div>${icon('book')}<b>${tx('לִקְרֹא שׁוּב')}</b><span>${tx('הַתְּשׁוּבָה מְחַכָּה בַּסִּפּוּר.')}</span></div>
          <div>${icon('phone')}<b>${tx('טֵלֵפוֹן לְ')}${h}</b><span>${tx('פַּעַם אַחַת בְּכָל כְּנִיסָה – בְּחִנָּם.')}</span></div>
          ${ttsOn() ? `<div>${icon('soundOn')}<b>${tx('הַקְרָאָה')}</b><span>${tx('הַסִּפּוּר מֻקְרָא לְךָ – תְּמוּרַת')} ${readCost()} ${tx('מַטְבְּעוֹת.')}</span></div>` : ''}
        </div><p class="coach-text">${tx('וְאִם טוֹעִים? זֶה בְּסֵדֶר גָּמוּר. מְנַסִּים שׁוּב!')} 💪</p>` },
    ];
    if (first) steps.push({ sel: null, icon: 'chest', title: 'מוּכָן? יוֹצְאִים לַדֶּרֶךְ!', text: 'מַתָּנָה מִמֶּנִּי לְהַתְחָלָה: 100 מַטְבְּעוֹת לַחֲנוּת. בּוֹא נִקְנֶה לַשּׁוֹמֵר שֶׁלְּךָ בֶּגֶד רִאשׁוֹן!', gift: true });
    return steps;
  }
  function startTutorial(first) {
    const steps = tourSteps(first);
    tour = { steps, i: 0, first };
    $('#coach').classList.remove('hidden');
    drawTour();
  }
  function endTour() {
    $('#coach').classList.add('hidden');
    const t = tour; tour = null;
    if (t && t.first) { S.tutorialDone = true; save(); store.log('tutorial_done', {}); }
  }
  async function drawTour() {
    const t = tour; if (!t) return;
    const st = t.steps[t.i], last = t.i === t.steps.length - 1;
    const hole = $('#coachHole'), card = $('#coachCard');
    let el = null;
    if (st.sel) { el = st.sel.split(',').map(x => app.parentElement.querySelector(x.trim())).find(Boolean); }
    if (el && !el.closest('#topbar') && !el.closest('#tabbar')) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); await new Promise(r => setTimeout(r, 450)); }
    const body = st.html || `<p class="coach-text">${st.raw ? tx(st.text) : tx(st.text)}</p>`;
    card.innerHTML = `<button class="coach-skip" id="coachSkip" title="סְגִירָה">${icon('close')} ${tx('דַּלֵּג')}</button>${st.icon ? `<div class="coach-icon">${icon(st.icon)}</div>` : ''}${st.title ? `<h3 class="display">${tx(st.title)}</h3>` : ''}
      <div class="coach-who"><img src="/guide/yuval.jpg" alt=""><b>${tx(GUIDE.name)}</b></div>${body}
      <div class="coach-foot">${t.i > 0 ? `<button class="btn ghost" id="coachPrev" title="${tx('חֲזָרָה')}">${tx('חֲזָרָה')}</button>` : ''}<div class="coach-dots">${t.steps.map((_, i) => `<i class="${i === t.i ? 'on' : ''}"></i>`).join('')}</div>
      ${st.gift ? `<button class="btn gold" id="coachGift">${icon('shop')} ${tx('לַחֲנוּת!')}</button>` : `<button class="btn go" id="coachNext">${last ? tx('יוֹצְאִים לַדֶּרֶךְ!') : tx('הֵבַנְתִּי')} ${icon('next')}</button>`}</div>`;
    card.classList.remove('coach-in'); void card.offsetWidth; card.classList.add('coach-in');
    if (KIDS()) kNarrate(st.say || [st.title, st.text, card.querySelector('.coach-text, .tg-flow, .tg-list')?.innerText].filter(Boolean).slice(0, 2).join('. '));
    if ($('#coachPrev')) $('#coachPrev').onclick = () => { if (t.i > 0) { t.i--; drawTour(); } };
    const W = window.innerWidth, Hh = window.innerHeight;
    if (el) {
      const r = el.getBoundingClientRect(), pad = 8;
      Object.assign(hole.style, { display: 'block', left: (r.left - pad) + 'px', top: (r.top - pad) + 'px', width: (r.width + pad * 2) + 'px', height: (r.height + pad * 2) + 'px' });
      const cw = Math.min(420, W - 32), ch = card.offsetHeight;
      let top = r.bottom + 18; if (top + ch > Hh - 12) top = Math.max(12, r.top - ch - 18);
      const left = Math.min(Math.max(16, r.left + r.width / 2 - cw / 2), W - cw - 16);
      Object.assign(card.style, { width: cw + 'px', left: left + 'px', top: top + 'px' });
    } else {
      Object.assign(hole.style, { display: 'block', left: W / 2 + 'px', top: Hh / 2 + 'px', width: '0px', height: '0px' });
      const cw = Math.min(460, W - 32);
      Object.assign(card.style, { width: cw + 'px', left: (W - cw) / 2 + 'px', top: Math.max(12, (Hh - card.offsetHeight) / 2) + 'px' });
    }
    sound('page');
    const nb = $('#coachNext');
    if (nb) nb.onclick = () => { if (last) { endTour(); return; } t.i++; drawTour(); };
    $('#coachSkip').onclick = () => {
      const first = t.first; endTour();
      if (first) { addCoins(100, $('#coinsPill')); sound('coin'); }   // מתנת הפתיחה גם למי שדילג
    };
    const gb = $('#coachGift');
    if (gb) gb.onclick = () => { endTour(); addCoins(100, $('#coinsPill')); sound('magic'); showShop(); };
  }

  /* ---------------- כריכה: הפעם הראשונה ---------------- */
  function showCover() {
    screen = 'cover'; setTab(null); kgEl.classList.add('bare'); audio.music('story');
    // הגיבורים מסתובבים סביב הספר – וכל כמה שניות אחד מהם מהבהב ונמחק לרגע
    const heroes = heroesOf('history'), n = heroes.length;
    const meds = heroes.map((c, i) => { const f = c.levels.find(l => !l.locked) || c.levels[0], pos = MAPPOS[c.id] || {};
      return `<span class="cv-md" style="--a:${(360 / n * i).toFixed(1)}deg;--d:${(i * .9).toFixed(1)}s"><span class="cv-mdi"><span class="cv-pic">${scene(pos.art || f.scene || 'library', {})}</span>${pos.e ? `<span class="cv-emb">${pos.e}</span>` : ''}<b>${tx(c.name)}</b></span></span>`; }).join('');
    const lines = ['יֵשׁ כָּאן סֵפֶר מְיֻחָד מְאוֹד... וְהוּא חִכָּה רַק לְךָ.', 'אַתָּה רוֹאֶה אֶת הַגִּבּוֹרִים מִסָּבִיב? הֵם מִתְחִילִים לְהֵעָלֵם!',
      'בַּלַּיְלָה שָׁמַעְתִּי רַעַשׁ בַּסִּפְרִיָּה... מִישֶׁהוּ הָיָה כָּאן.', 'לְחַץ עַל הַכַּפְתּוֹר הַצָּהֹב – וְנִכָּנֵס פְּנִימָה יַחַד! 📖'];
    app.innerHTML = `<div class="cover2">
      <div class="cv-bg">${scene('library', { night: true })}</div>${sparkles(22)}
      <button class="cv-eyes" id="cvEyes" aria-label=""><i></i><i></i></button>
      <div class="st-greet cv-greet talk" id="stGreet"><button class="st-host" id="yuvalBtn" title="${tx('יוּבַל')}"><img src="/guide/yuval.jpg" alt=""><span class="st-wave"><i></i><i></i><i></i><i></i></span><span class="st-tag">🎙️ ${tx('יוּבַל')}</span></button>
        <div class="st-bubble"><b>${S.name ? esc(S.name) + '!' : tx('שָׁלוֹם!')} ${tx('סוֹף סוֹף הִגַּעְתָּ.')}</b><span id="yuvalSay">${words(lines[0])}</span></div></div>
      <div class="cv-stage"><div class="cv-rays"></div><div class="cv-orbit">${meds}</div>
        <div class="book3d" id="book">
          <div class="book-pages"></div>
          <div class="book-cover"><div class="bc-frame">${LOGO}<div class="bc-title">${tx('סֵפֶר הַזְּמַן')}</div><div class="bc-sub">${tx('שׁוֹמְרֵי הַזְּמַן')}</div></div></div>
          <div class="book-glow"></div>
        </div></div>
      <button class="btn gold mega" id="openBook">${icon('book')} ${tx('פְּתַח אֶת הַסֵּפֶר')}</button>
      <p class="cv-hint">${tx('בְּתוֹךְ הַסֵּפֶר מְחַכִּים גִּבּוֹרִים אֲמִתִּיִּים... וּמִישֶׁהוּ מְנַסֶּה לִמְחֹק אוֹתָם.')}</p>
    </div>`;
    if (KIDS()) setTimeout(() => { if (screen === 'cover' && !kLocked) kNarrate(K_SCREEN.cover); }, 500);
    let yi = 0;
    const say = t => { $('#yuvalSay').innerHTML = words(t); const g = $('#stGreet'); g.classList.add('talk'); clearTimeout(g._t); g._t = setTimeout(() => g.classList.remove('talk'), 2600); };
    $('#stGreet')._t = setTimeout(() => $('#stGreet')?.classList.remove('talk'), 3000);
    $('#yuvalBtn').onclick = () => { yi = (yi + 1) % lines.length; say(lines[yi]); sound('pop'); bump($('#yuvalBtn')); kNarrate(lines[yi]); };
    $('#cvEyes').onclick = () => { $('#cvEyes').classList.add('gone'); sound('whoosh'); say('רָאִיתָ אֶת זֶה?! מִישֶׁהוּ מִסְתַּתֵּר שָׁם בַּחֹשֶׁךְ...'); };
    $('#openBook').onclick = () => {
      $('#openBook').disabled = true; sound('magic'); $('.cover2').classList.add('opening');
      $('#book').classList.add('open');
      setTimeout(() => { const f = document.createElement('div'); f.className = 'flash'; document.body.appendChild(f); setTimeout(() => f.remove(), 900); }, 900);
      setTimeout(() => playLevel('history', 0), 1250);
    };
  }

  function askExit() {
    overlay(`<h2 class="display">${tx('אֵזוֹר הוֹרִים')} 🔒</h2><p class="small">${tx('הַכְנֵס קוֹד:')}</p>
      <input type="password" id="pin" inputmode="numeric" maxlength="8"><div class="row" style="justify-content:center">
      <button class="btn" id="pinok">${tx('כְּנִיסָה')}</button><button class="btn ghost" id="pincancel">${tx('בִּטּוּל')}</button></div>
      <button class="linkbtn" id="pinforgot">${tx('שָׁכַחְתִּי אֶת הַקּוֹד')}</button>`);
    $('#pin').focus();
    $('#pincancel').onclick = closeOverlay;
    $('#pinforgot').onclick = () => { store.flush?.(); if (opts.onLocked) opts.onLocked(); else opts.onExit?.(); };
    const go = () => { if ($('#pin').value === String(SET.pin)) { store.flush?.(); opts.onExit?.(); } else shake($('#pin')); };
    $('#pinok').onclick = go; $('#pin').onkeydown = e => { if (e.key === 'Enter') go(); };
  }

  /* ---------------- חיבורים ---------------- */
  let keyHandler = null;
  const onKey = e => keyHandler && keyHandler(e);
  document.addEventListener('keydown', onKey);
  const TAB_GO = { home: () => showWorlds(), map: () => showMap(S.lastWorld && openWorlds().includes(S.lastWorld) ? S.lastWorld : mapWorld), practice: () => showPractice(), shop: () => showShop(), cards: () => showCards() };
  root.querySelectorAll('.tab').forEach(b => b.onclick = () => { sound('page'); TAB_GO[b.dataset.tab](); });
  /* 🐣 בגן: כל כפתור שהילד נוגע בו – אומר מה הוא (אם המשחק לא דיבר בעצמו בתגובה לנגיעה) */
  root.addEventListener('click', e => {
    if (!KIDS() || destroyed) return;
    const el = e.target.closest('button, .chip, .tab, .opt, .page, .item, .shop-item, [data-k]'); if (!el || !root.contains(el)) return;
    const at = Date.now();
    setTimeout(() => {
      if (kLastAt >= at - 50) return;   // המשחק כבר הקריא משהו בעקבות הנגיעה
      const raw = el.getAttribute('aria-label') || el.getAttribute('title') || el.innerText || '';
      const t = plainTxt(raw).replace(/\s+/g, ' ').trim();
      if (t.replace(/[^\u05D0-\u05EA]/g, '').length >= 2) kNarrate(t.slice(0, 120));
    }, 180);
  });
  $('#lvlClose').onclick = () => { if (focusClose) focusClose(); else showWorlds(); };
  $('#streakPill').onclick = () => { bump($('#streakPill')); sound('tap'); showStreak(); };
  $('#me').onclick = showShop;
  const soundIcon = () => { const p = audio.prefs; $('#soundBtn').innerHTML = icon(p.music ? 'music' : p.sfx ? 'soundOn' : 'mute'); };
  soundIcon();
  $('#soundBtn').onclick = () => {
    const p = audio.cycle(); soundIcon();
    fly(tx(p.music ? 'מוּזִיקָה וּצְלִילִים' : p.sfx ? 'רַק צְלִילִים' : 'שֶׁקֶט'), $('#soundBtn'));
    sound('tap');
  };
  const unlockAudio = () => audio.unlock();
  root.addEventListener('pointerdown', unlockAudio);
  root.addEventListener('keydown', unlockAudio);
  $('#ticketsBtn').onclick = showTickets;
  $('#exitBtn').onclick = askExit;
  /* ❓ בכל מסך: מה עושים כאן (עם 🔊 הקראה), ואפשר גם סיור מלא. בגן – פשוט מקריאים */
  const HELP8 = { practice: 'זֶה חֲדַר הָאִימּוּנִים. יֵשׁ כָּאן תַּחֲנוֹת שֶׁל חֶשְׁבּוֹן, כְּתִיבָה וְחִידוֹת. גַּע בְּתַחֲנָה כְּדֵי לְהִתְאַמֵּן וְלִזְכּוֹת בְּמַטְבְּעוֹת.' };
  $('#helpBtn').onclick = () => {
    sound('tap'); const line = (!KIDS() && HELP8[screen]) || K_SCREEN[screen];
    if (KIDS() && line) { kNarrate(line); return; }
    overlay(`<div class="help-ov"><h2 class="big-title" style="margin:0 0 8px">❓ ${tx('מָה עוֹשִׂים כָּאן?')}</h2>
      ${line ? `<p class="story" style="text-align:right">${tx(line)}</p>` : ''}
      <div class="row" style="justify-content:center;gap:8px;flex-wrap:wrap">
        ${line ? `<button class="btn ghost" id="hSay">🔊 ${tx('תַּקְרִיא לִי')}</button>` : ''}
        <button class="btn ghost" id="hTour">🎓 ${tx('סִיּוּר בַּמִּשְׂחָק')}</button>
        <button class="btn go" id="hOk">${tx('הֵבַנְתִּי')}</button></div></div>`);
    if ($('#hSay')) $('#hSay').onclick = () => kSay(line);
    $('#hOk').onclick = () => { kSay(''); closeOverlay(); };
    $('#hTour').onclick = () => { kSay(''); closeOverlay(); if (screen !== 'worlds') showWorlds(); setTimeout(() => startTutorial(false), 300); };
  };
  $('#overlay').onclick = e => { if (e.target.id === 'overlay' && !$('#overlayBody .modal') && !$('#chest') && !$('#cont') && !$('#ppOk') && !$('#llCancel') && !$('#llOk')) closeOverlay(); };
  let rz; const onResize = () => { clearTimeout(rz); rz = setTimeout(() => { if (screen === 'map' && !tour) showMap(mapWorld); if (tour) drawTour(); }, 250); };
  window.addEventListener('resize', onResize);
  const onHide = () => store.flush?.();
  window.addEventListener('pagehide', onHide);

  if (typeof window !== 'undefined') window.__guideSVG = guideSVG;
  // גישה לבדיקות אוטומטיות
  if (typeof window !== 'undefined') window.__kg = { state: () => S, level: () => L, playLevel, startTutorial, tour: () => tour, renderStep: () => renderStep(), showWorlds, showMap, showShop, showTickets, showPractice, playMath: () => playMath(), mathAnswer: () => curQ && curQ.answer, showCreator: () => showCreator(() => showShop()), showCards, finishLevel: () => finishLevel(), ttsOn: () => ttsOn(), preloadAll: () => Promise.all(SEASON_FILES.map(f => loadSeason(f.file))), addCoins: n => addCoins(n), has: id => has(id), stats: () => stats(), revealNext: () => revealNext(), homeMoments: () => homeMoments(), showStreak: () => showStreak(), showOwl: () => showOwl(), openGift: () => openGift(false), checkBadges: () => checkBadges(), checkWeek: () => checkWeek(), showWheel: () => showWheel(), showJoint: () => showJoint(), jointCheck: () => jointCheck(), grantSpin: () => { S.spins = Math.min(SPIN_MAX, (S.spins || 0) + 1); save(); }, set: (k, v) => { SET[k] = v; }, run: () => runCtl, kSaid: () => kLast };

  /* ---------------- התחלה ---------------- */
  (async () => {
    try {
      const data = await store.init();
      if (destroyed) return;
      child = data.child;
      SET = { ...DEFAULT_SETTINGS, ...(child.settings || {}) };
      S = { ...structuredClone(BASE_STATE), ...(data.state || {}) };
      S.skill = syncSkill(S.skill, profileOf());   // פרופיל הלמידה: מהשאלון של ההורה + מה שנמדד עד עכשיו
      S.today = { ...BASE_STATE.today, ...(S.today || {}) }; S.equipped = S.equipped || {}; S.owned = S.owned || [];
      if (!S.name) S.name = child.name || '';
      if (S.equipped.cape) { S.equipped.outfit = S.equipped.cape; delete S.equipped.cape; }
      touchSession();
      ensureToday();
      // ימים ששיחק (המתנה היומית נפתחת ביום השני)
      S.days = S.days || { n: 0, last: null };
      if (S.days.last !== todayStr()) { S.days.n++; S.days.last = todayStr(); }
      // ילד שכבר שיחק לפני שהיה "משחק שגדל": מה שהכיר כבר (אימונים, זירה) נשאר פתוח. החדשים יתגלו אחד אחד
      if (!S.feat) {
        S.feat = {};
        if (S.tutorialDone) ['practice', 'arena'].forEach(id => { const f = FEATURES.find(q => q.id === id); if (featureReady(f, stats())) S.feat[id] = 'old'; });
      }
      if (S.letters == null) S.letters = (S.practice || {}).writes || 0;
      if (KIDS()) { S.kd = { letters: [], nums: [], stat: {}, epL: {}, epN: {}, ...(S.kd || {}) }; kgEl.classList.add('kids'); kgEl.classList.remove('bigread'); }
      S.bestStreak = Math.max(S.bestStreak || 0, S.streak.count || 0);
      checkWeek(); checkBadges(true); save();
      root.querySelectorAll('.tab span').forEach((sp, i) => sp.textContent = tx(TABS[i][2]));
      [T.balance, T.pending, T.riddle] = await Promise.all([store.ticketBalance(), store.pendingRedemption(), store.activeRiddle()]);
      store.log('session_start', {});
      timers.push(setInterval(() => { if (document.visibilityState === 'visible') { S.minutes += 1; save(); } }, 60000));
      // בדיקה תקופתית: חידה חדשה, תשובה למכתב, אישור כרטיסים
      timers.push(setInterval(async () => {
        if (screen !== 'worlds' && screen !== 'map' && screen !== 'sleep' && screen !== 'practice') return;
        const before = JSON.stringify(SET.bonusPages || null);
        await refreshSettings();
        if (!overlayOpen() && !tour && await jointCheck()) { rerender(); return; }
        const r = await store.activeRiddle(); const changed = (r?.id || null) !== (T.riddle?.id || null) || before !== JSON.stringify(SET.bonusPages || null); T.riddle = r;
        if (changed && !overlayOpen() && screen !== 'sleep') rerender(); else checkInbox();
      }, 30000));
      refreshBar();
      kgEl.classList.toggle('bigread', bigFont(S.skill));
      if (!S.done.includes('p1')) showCover(); else showWorlds();
      if (KIDS()) kUnlock(() => { if (screen === 'cover') kNarrate(K_SCREEN.cover); else if (screen === 'worlds') { const seen = (S.kd.seen = S.kd.seen || {}); if (!seen.worlds) { seen.worlds = 1; save(); kNarrate(K_SCREEN.worlds); } else kNarrate($('#yuvalSay') ? $('#yuvalSay').innerText : ''); } });
    } catch (e) {
      console.error(e);
      app.innerHTML = `<div class="panel" style="text-align:center"><h2>אופס, משהו השתבש</h2><p>${esc(e.message || e)}</p></div>`;
    }
  })();

  return {
    destroy() {
      destroyed = true;
      timers.forEach(t => { clearTimeout(t); clearInterval(t); });
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pagehide', onHide);
      root.removeEventListener('pointerdown', unlockAudio); root.removeEventListener('keydown', unlockAudio);
      try { if (tts) { tts.cancel(); tts.onvoiceschanged = null; } } catch (e) {}
      try { if (player) { player.pause(); player.src = ''; } } catch (e) {}
      audio.stop();
      store.flush?.();
    },
  };
}
