/* מנוע המשחק "שומרי הזמן".
   מקבל store – שכבת שמירה (Supabase או מצב הדגמה) – ומצייר את המשחק בתוך root. */
import { GUIDE, CARDS, WORLDS, LEVELS, RANKS, PRAISE, RETRY, DEFAULT_SETTINGS, ALUF, TIPS } from './content.js';
import { keeperSVG, itemThumb, ITEMS, SLOTS, RARITY, LOOK_OPTIONS, DEFAULT_LOOK } from './avatar.js';
import { scene, guideSVG, guideAvatar, GUIDE_CREDIT, LOGO, worldArt, CHEST_CLOSED, CHEST_OPEN } from './art.js';
import { worldMapSVG, MAPPOS, MAP_W, MAP_H } from './worldmap.js';
import { icon } from './icons.js';
import { createAudio } from './audio.js';
import { RIVALS, pickRivals, buildQuiz, speedPts, allowedAbove, settleRound, ensureWeek, updateWeek, leaderboard, weekKey as weekKeyNow } from './arena.js';
import { makeProblem, START_LEVEL, PROMPTS, RIDDLES } from './practice.js';

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
    refreshBadges();
  }
  /* ---- טאבים, תגיות ומצב מיקוד ---- */
  let focusClose = null;
  function setTab(id) {
    kgEl.classList.remove('focus', 'bare'); focusClose = null; audio.music('lobby');
    root.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.tab === id));
    setActions(''); hideSheet(); keyHandler = null;
  }
  function setFocus(onClose, theme = 'story') { kgEl.classList.remove('bare'); kgEl.classList.add('focus'); focusClose = onClose; setActions(''); audio.music(theme); }
  function setActions(html) { const a = $('#actionbar'); if (a) a.innerHTML = html ? `<div class="ab">${html}</div>` : ''; }
  function setBadge(tab, n) {
    const b = $(`#tab-${tab} .badge`); if (!b) return;
    if (n) { b.textContent = n; b.classList.remove('hidden'); } else b.classList.add('hidden');
  }
  function refreshBadges() {
    if (!S || !SET) return;
    const anyNew = chaptersOf('history').some(c => chAvail('history', c) && !chDone(c));
    setBadge('map', anyNew && pagesLeftToday() > 0 ? '!' : 0);
    const P = pr(); setBadge('practice', P.day.bonus ? 0 : 3 - practiceDone(P).filter(Boolean).length);
    const afford = ITEMS.filter(it => !S.owned.includes(it.id) && it.price <= S.coins && !lockInfo(it)).length;
    setBadge('shop', afford ? Math.min(afford, 9) : 0);
    setBadge('home', T.riddle ? '!' : 0);
  }
  /* ---- גיליון המשוב בתחתית (כמו בדואולינגו) ---- */
  let sheetT = null;
  function showSheet(kind, title, sub = '', ms = 1300, btn = '') {
    const sh = $('#sheet'); if (!sh) return; clearTimeout(sheetT);
    sh.className = 'show ' + kind;
    sh.querySelector('.sh').innerHTML = `${icon(kind === 'good' ? 'check' : 'cross')}<div class="grow"><b>${title}</b>${sub ? `<span>${sub}</span>` : ''}</div>${btn}`;
    if (ms) sheetT = setTimeout(hideSheet, ms);
  }
  function hideSheet() { clearTimeout(sheetT); const sh = $('#sheet'); if (sh) sh.className = ''; }
  const plus = n => `<bdi dir="ltr">+${n}</bdi>`;
  const gain = (n, ic = 'coin') => `<span class="gain">${plus(n)} ${icon(ic)}</span>`;
  const earn = n => (L && L.replay) ? Math.max(1, Math.round(n * 0.2)) : n;
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
  // אין הקראה בכוונה: המטרה היא שהילד יקרא בעצמו
  const overlayOpen = () => !$('#overlay').classList.contains('hidden');
  function overlay(html) { $('#overlayBody').innerHTML = html; $('#overlay').classList.remove('hidden'); $('#overlayBody').scrollTop = 0; }
  function closeOverlay() { $('#overlay').classList.add('hidden'); }
  function shake(el) { if (!el) return; el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 400); }
  /** מעדכן רצף ימים. מחזיר את הרצף החדש אם השתנה היום, אחרת null */
  function updateStreak() {
    const today = todayStr();
    if (S.streak.last === today) return null;
    const diff = S.streak.last ? Math.round((new Date(today) - new Date(S.streak.last)) / 86400000) : 99;
    S.streak.count = diff <= 2 ? S.streak.count + 1 : 1;   // סלחני: יום אחד שפוספס לא מאפס
    S.streak.last = today; save();
    return S.streak.count;
  }

  /* ---------------- שלד ---------------- */
  const TABS = [['home', 'home', 'בַּיִת'], ['map', 'map', 'מַפָּה'], ['practice', 'practice', 'אִימּוּן'], ['shop', 'shop', 'חֲנוּת'], ['cards', 'cards', 'אֹסֶף']];
  root.innerHTML = `<div class="kg">
    <div id="topbar">
      <button class="player" id="me" title="הַשּׁוֹמֵר שֶׁלִּי"><span class="pav" id="meAv"></span>
        <span class="pinfo"><b id="meName"></b><span class="prank">${icon('crown')}<span id="rank"></span></span><span class="xp"><i id="xpBar"></i></span></span></button>
      <div id="lvlbar"><button class="iconbtn" id="lvlClose" title="יְצִיאָה">${icon('close')}</button><div class="lprog"><i id="lvlProg"></i></div></div>
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
            <p class="story" style="font-size:28px">${minutesText(d.minutes)} ${tx('שֶׁל צְפִיָּה – מַגִּיעַ לְךָ!')}</p>`, tx('יֵשׁ!'));
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

  /* ---------------- דפים יומיים: "להשאיר טעם של עוד" ---------------- */
  const bonusToday = () => { const b = SET.bonusPages; return b && b.date === todayStr() ? (b.n || 0) : 0; };
  function pagesLeftToday() { ensureToday(); return SET.pagesPerDay + bonusToday() - S.today.pages; }
  /* ---- התקדמות: בוחרים גיבור במפה. בתוך גיבור – פרק אחרי פרק, ותמיד אפשר לחזור לפרק שנגמר ---- */
  const playableOf = c => c.levels.filter(l => !l.locked && l.steps);
  const chDone = c => playableOf(c).length > 0 && playableOf(c).every(l => S.done.includes(l.id));
  const chStarted = c => c.levels.some(l => S.done.includes(l.id));
  const chNext = c => (c ? playableOf(c).find(l => !S.done.includes(l.id)) : null) || null;
  const freeMode = () => SET.heroOrder !== 'ordered';
  const heroesOf = world => chaptersOf(world).filter(c => playableOf(c).length && !c.levels[0].free);
  function chAvail(world, c) {
    if (!playableOf(c).length) return false;                       // "עונה 2" – בקרוב
    if (c.levels[0].free) return true;                             // הפתיחה
    if (!S.done.includes(LEVELS[world][0].id)) return false;       // קודם עושים את הפתיחה
    if (chDone(c) || chStarted(c)) return true;
    const heroes = heroesOf(world), finale = heroes[heroes.length - 1];
    if (!freeMode()) return c === heroes.find(x => !chDone(x));    // לפי הסדר: רק הגיבור הבא
    if (c === finale) return heroes.filter(x => x !== finale).every(chDone);   // הגילוי של המוחק – בסוף
    return true;
  }
  /** הגיבור שהילד באמצע שלו (או הפתיחה). בבחירה חופשית – null עד שבוחרים במפה */
  function curChapter(world) {
    const chs = chaptersOf(world), pro = chs.find(c => c.levels[0].free);
    if (pro && !chDone(pro)) return pro;
    const c = chs.find(x => x.id === (S.curSeason || {})[world]);
    if (c && !chDone(c) && chAvail(world, c)) return c;
    if (!freeMode()) return chs.find(x => chAvail(world, x) && !chDone(x)) || null;
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
  async function refreshSettings() {
    try { const st = await store.childSettings(); if (st) SET = { ...DEFAULT_SETTINGS, ...st }; } catch (e) {}
  }
  /** המסך שאומר שנגמרו הדפים של היום, עם הצצה לדף של מחר */
  async function showSleep(world, celebrate) {
    await refreshSettings();
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
        <button class="btn go" id="slPractice">${icon('practice')} ${tx('לְהִתְאַמֵּן')}</button>
        <button class="btn gold" id="slShop">${icon('shop')} ${tx('לְהִתְלַבֵּשׁ')}</button>
        ${T.riddle ? `<button class="btn purple" id="slRiddle">${icon('scroll')} ${tx('לִפְתֹּר חִידָה')}</button>` : ''}
        <button class="btn ghost" id="slMap">${icon('star')} ${tx('לְשַׁפֵּר כּוֹכָבִים')}</button>
      </div></div>`;
    $('#slShop').onclick = showShop;
    $('#slPractice').onclick = showPractice;
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

  const heroHTML = o => `<div class="hero ${o.night ? 'night' : ''}"><div class="hero-art">${scene(o.scene || 'library', { night: o.night })}</div>
      <div class="hero-keeper">${keeperSVG(S.equipped, { look: S.look })}</div>
      <div class="hero-txt"><span class="kicker">${o.kicker}</span><h2>${o.title}</h2><p>${o.text}</p><div class="row">${o.btn}</div></div></div>`;
  function questsHTML() {
    ensureToday();
    const g = SET.dailyGoal, p = Math.min(S.today.pages, g), P = pr(), d = practiceDone(P), dn = d.filter(Boolean).length;
    const reward = (done, n = 1, ic = 'ticket') => done ? `<span class="qr">${icon('check')}</span>` : `<span class="qr">${icon(ic)}${plus(n)}</span>`;
    const bar = (v, max) => `<div class="qbar"><i style="width:${Math.round(v / max * 100)}%"></i><span>${v}/${max}</span></div>`;
    const wk = S.streak.count % 7 || (S.streak.count ? 7 : 0);
    let h = `<button class="quest ${S.today.goalDone ? 'done' : ''}" id="qPages"><span class="qi">${icon('book')}</span>
        <span class="qb"><b>${tx(`לְהַצִּיל ${g} דַּפִּים חֲדָשִׁים`)}</b>${bar(p, g)}</span>${reward(S.today.goalDone)}</button>
      <button class="quest ${P.day.bonus ? 'done' : ''}" id="qPractice"><span class="qi">${icon('practice')}</span>
        <span class="qb"><b>${tx('אִימּוּן: חֶשְׁבּוֹן, כְּתִיבָה, חִידָה')}</b>
        <span class="qsteps">${['math', 'pencil', 'puzzle'].map((ic, k) => `<i class="${d[k] ? 'on' : ''}">${icon(d[k] ? 'check' : ic)}</i>`).join('')}</span></span>${reward(P.day.bonus)}</button>`;
    if (T.riddle) h += `<button class="quest hot" id="qRiddle"><span class="qi">${icon('scroll')}</span>
        <span class="qb"><b>${tx('חִידָה מֵ')}${helper()}!</b><span class="small" style="color:#ffe7a6">${tx('פְּתֹר וְתַרְוִיחַ')}</span></span>${reward(false, T.riddle.reward_tickets || T.riddle.reward_coins || 20, T.riddle.reward_tickets ? 'ticket' : 'coin')}</button>`;
    h += `<div class="quest"><span class="qi">${icon('flame')}</span>
        <span class="qb"><b>${S.streak.count} ${tx('יָמִים בָּרֶצֶף')}</b><span class="week">${Array.from({ length: 7 }, (_, k) => `<i class="${k < wk ? 'on' : ''}"></i>`).join('')}</span></span>
        <span class="qr">${icon('ticket')}${plus(S.streak.count < 3 ? 1 : 2)}</span></div>`;
    const aw = S.arena && S.arena.week && S.arena.week.key === weekKeyNow() ? S.arena.week : null;
    if (aw && aw.games) { const wr = leaderboard(S).findIndex(r => r.me) + 1;
      h += `<button class="quest" id="qBoard"><span class="qi">${icon('crown')}</span><span class="qb"><b>${tx('זִירַת הַטְּרִיוְיָה')}</b><span class="small" style="color:#ffe7a6">${tx('מָקוֹם')} ${wr} ${tx('בְּטַבְלַת הַשָּׁבוּעַ')}</span></span><span class="qr">${icon('trophy')}</span></button>`; }
    return `<div class="uicard quests"><h3>${icon('chest')} ${tx('מְשִׂימוֹת הַיּוֹם')}<small>${icon('ticket')} ${S.today.tickets}/${SET.dailyTicketCap} ${tx('הַיּוֹם')}</small></h3>${h}</div>`;
  }

  function showWorlds() {
    closeOverlay(); screen = 'worlds'; setTab('home');
    const world = 'history', cur = curChapter(world), next = chNext(cur), sleeping = isSleeping(next) || (!next && pagesLeftToday() <= 0);
    const allDone = !chaptersOf(world).some(c => chAvail(world, c) && !chDone(c));
    const place = cur && MAPPOS[cur.id] ? MAPPOS[cur.id].place : '';
    const epNo = cur && next ? playableOf(cur).indexOf(next) + 1 : 0;
    const toMap = `<button class="btn go big pulse" id="playBtn">${icon('map')} ${tx('לַמַּפָּה')}</button>`;
    const hero = allDone ? heroHTML({ scene: 'library', kicker: icon('book') + tx('סֵפֶר הַזְּמַן'), title: tx('הִצַּלְתָּ אֶת כָּל הַדַּפִּים!'),
        text: tx('יוּבַל כּוֹתֵב עַכְשָׁיו דַּפִּים חֲדָשִׁים בִּשְׁבִילְךָ...'), btn: `<button class="btn gold big" id="playBtn">${icon('map')} ${tx('לַמַּפָּה')}</button>` })
      : sleeping ? heroHTML({ scene: next ? next.scene : 'library', night: true, kicker: icon('moon') + tx(next ? 'הַפֶּרֶק הַבָּא' : 'סֵפֶר הַזְּמַן'), title: tx(next ? next.title : 'נִגְמְרוּ הַדַּפִּים שֶׁל הַיּוֹם'),
        text: tx('סֵפֶר הַזְּמַן נָח בַּלַּיְלָה. בֵּינְתַיִם – אֶפְשָׁר לְהִתְאַמֵּן!'),
        btn: `<span class="countdown">${icon('moon')} ${tx('נִפְתָּח בְּעוֹד')} <b>${untilTomorrow()}</b></span><button class="btn go" id="playBtn">${icon('practice')} ${tx('לְחַדַר הָאִימּוּנִים')}</button>` })
      : !next ? heroHTML({ scene: 'library', kicker: icon('map') + tx('מַפַּת סֵפֶר הַזְּמַן'), title: tx('אֶת מִי תַּצִּיל?'),
        text: tx('בַּמַּפָּה מְחַכִּים לְךָ גִּבּוֹרִים מִכָּל הָעוֹלָם. בְּחַר גִּבּוֹר – וְקְפֹץ לְתוֹךְ הַסִּפּוּר שֶׁלּוֹ!'), btn: toMap })
      : heroHTML({ scene: next.scene, kicker: icon('map') + tx(cur.name) + (place ? ' · ' + tx(place) : ''), title: tx(next.title),
        text: (cur.levels[0].free ? '' : `${tx('פֶּרֶק')} ${epNo} ${tx('מִתּוֹךְ')} ${playableOf(cur).length}. `) + tx(S.done.length <= 1 ? 'הַהַרְפַּתְקָה מַתְחִילָה!' : 'הַדַּף הַבָּא מְחַכֶּה לְךָ – רַק אַתָּה יָכוֹל לְהַצִּיל אוֹתוֹ.'),
        btn: toMap });
    app.innerHTML = `<div class="lobby">${hero}
      <div class="lobby-grid">${questsHTML()}
        <div class="uicard"><h3>${icon('map')} ${tx('הָעוֹלָמוֹת')}</h3><div class="worlds">${WORLDS.map(w => `
          <button class="world ${w.open ? '' : 'locked'}" data-w="${w.id}">
            <span class="art">${worldArt(w.id)}</span>
            <span class="wtxt"><b>${tx(w.title)}</b><span>${tx(w.desc)}</span>${w.open ? '' : `<span class="lock-tag">${icon('lock')} ${tx(w.lockText)}</span>`}</span>
          </button>`).join('')}</div></div>
      </div>
      <div class="lobby-foot"><button class="howto" id="howto">${icon('help')} ${tx('אֵיךְ מְשַׂחֲקִים?')}</button>
        <button class="howto only-small" id="parentLink">${icon('gear')} ${tx('אֵזוֹר הוֹרִים')}</button></div></div>`;
    // תמיד דרך המפה: שם בוחרים גיבור וממשיכים לפרק הבא שלו
    $('#playBtn').onclick = () => { if (sleeping && !allDone) showPractice(); else showMap(world); };
    $('#qPages').onclick = () => { if (sleeping) showSleep(world, false); else showMap(world); };
    $('#qPractice').onclick = showPractice;
    if ($('#qRiddle')) $('#qRiddle').onclick = showRiddle;
    if ($('#qBoard')) $('#qBoard').onclick = showBoard;
    app.querySelectorAll('.world').forEach(b => b.onclick = () => {
      const w = WORLDS.find(x => x.id === b.dataset.w);
      if (w.open) showMap(w.id); else shake(b);
    });
    $('#howto').onclick = () => startTutorial(false);
    $('#parentLink').onclick = askExit;
    window.scrollTo(0, 0);
    refreshBar(); checkInbox(); maybeTutorial();
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
    closeOverlay(); screen = 'map'; mapWorld = world; setTab('map');
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
      if (pos.route && chStarted(c)) { let prev = pos.dot; pos.route.forEach((r, n) => { const lvDone = c.levels[n + 1] && S.done.includes(c.levels[n + 1].id); segs.push({ from: prev, to: [r[0], r[1]], done: !!lvDone }); prev = [r[0], r[1]]; }); }
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
      const inner = st === 'locked' && !first.scene ? '<span class="wq">?</span>' : scene(first.scene || 'library', { night: st === 'sleep' }) + (st === 'locked' ? `<div class="lockveil">${icon('lock')}</div>` : '');
      return `<button class="wpin ${st} ${c.id === mapSel ? 'sel' : ''}" data-ch="${c.id}" style="left:${pct(pos.pin[0], MAP_W)};top:${pct(pos.pin[1], MAP_H)}">
          ${c === cur ? `<span class="wme">${keeperSVG(S.equipped, { head: true, look: S.look })}</span>` : ''}
          <span class="wdisc">${inner}</span>
          <span class="wlabel">${tx(c.name)}${total ? ` <small>${doneN}/${total}</small>` : ''}</span>
        </button>`;
    }).join('');
    const stems = chs.map(c => { const p2 = MAPPOS[c.id]; return p2 && (p2.pin[0] !== p2.dot[0] || p2.pin[1] !== p2.dot[1]) ? `<line x1="${p2.dot[0]}" y1="${p2.dot[1]}" x2="${p2.pin[0]}" y2="${p2.pin[1]}" stroke="#5a3a14" stroke-width="2.5" stroke-dasharray="3 4"/><circle cx="${p2.dot[0]}" cy="${p2.dot[1]}" r="6" fill="#c0392b" stroke="#fff6dc" stroke-width="2"/>` : ''; }).join('');
    const waypoints = chs.map(c => (MAPPOS[c.id]?.route || []).map(r => `<span class="wway" style="left:${pct(r[0], MAP_W)};top:${pct(r[1], MAP_H)}">${r[2]}</span>`).join('')).join('');
    const ctaFor = c => {
      const st = chState(c), nx = chNext(c), name = tx(c.name);
      if (st === 'locked') return `<button class="btn ghost next-cta" disabled>${icon('lock')} ${!playableOf(c).length ? tx('בְּקָרוֹב...')
        : freeMode() ? tx('הַגִּבּוֹר הַזֶּה נִפְתָּח אַחֲרֵי שֶׁתַּצִּיל אֶת כָּל הַשְּׁאָר') : tx('נִפְתָּח אַחֲרֵי הַגִּבּוֹר הַקּוֹדֵם')}</button>`;
      if (st === 'done') return `<button class="btn ghost next-cta" disabled>${icon('check')} ${tx('הִצַּלְתָּ אֶת כָּל הַפְּרָקִים שֶׁל')} ${name}!</button>`;
      if (noPages && !c.levels[0].free) return `<button class="btn next-cta sleep" id="nextCta">${icon('moon')} ${tx('הַפֶּרֶק הַבָּא נִפְתָּח מָחָר')}</button>`;
      const n = playableOf(c).indexOf(nx) + 1;
      return `<button class="btn go next-cta pulse" id="nextCta">${icon('play')} ${c.levels[0].free ? tx(nx.title) : `${name} · ${tx('פֶּרֶק')} ${n}: ${tx(nx.title)}`}</button>`;
    };
    app.innerHTML = `<div class="wmap-scroll"><div class="wmap">${worldMapSVG(segs)}
        <svg class="wstems" viewBox="0 0 ${MAP_W} ${MAP_H}" preserveAspectRatio="xMidYMid meet">${stems}</svg>
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
        else shake(b);
      });
    };
    drawSheet();
    app.querySelectorAll('.wpin').forEach(b => b.onclick = () => {
      mapSel = b.dataset.ch; app.querySelectorAll('.wpin').forEach(x => x.classList.toggle('sel', x === b)); drawSheet(); sound('page');
    });
    // בטלפון: גוללים את המפה לפרק הנוכחי
    const sc = app.querySelector('.wmap-scroll'), cp = app.querySelector('.wpin.sel');
    if (sc && cp && sc.scrollWidth > sc.clientWidth) setTimeout(() => cp.scrollIntoView({ inline: 'center', block: 'nearest' }), 100);
    window.scrollTo(0, 0);
    refreshBar(); checkInbox(); maybeTutorial();
  }

  function showCards() {
    closeOverlay(); screen = 'cards'; setTab('cards');
    const total = Object.keys(CARDS).length;
    app.innerHTML = `<h1 class="big-title">${tx('הָאֹסֶף שֶׁלִּי')}</h1>
      <div class="cards-meter"><div class="qbar"><i style="width:${Math.round(S.cards.length / total * 100)}%"></i><span>${S.cards.length}/${total}</span></div></div>
      <div class="cards">${Object.entries(CARDS).map(([id, c]) => {
        const has = S.cards.includes(id);
        return `<div class="ccard ${has ? '' : 'off'}"><div class="e">${c.e}</div><b>${has ? tx(c.name) : '???'}</b><small>${tx(has ? c.fact : 'הַצֵּל עוֹד דַּפִּים כְּדֵי לְגַלּוֹת')}</small></div>`;
      }).join('')}</div>
      <div class="credit">${GUIDE_CREDIT}</div>`;
  }

  /* ---------------- חנות הציוד ---------------- */
  let shopTab = 'hat', tryOn = null;
  function lockInfo(it) {
    if (!it.lock) return null;
    const have = { aluf: Object.keys(S.aluf || {}).length, pages: S.done.length, streak: S.streak.count };
    const [k, need] = Object.entries(it.lock)[0];
    const label = { aluf: 'גְּבִיעֵי אַלּוּף 🏆', pages: 'דַּפִּים שֶׁהִצַּלְתָּ 📖', streak: 'יָמִים בָּרֶצֶף 🔥' }[k];
    return have[k] >= need ? null : { have: have[k], need, label };
  }
  function showShop() {
    closeOverlay(); screen = 'shop'; setTab('shop');
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
      <div class="shop-tabs">${SLOTS.map(t => `<button class="stab ${t.id === shopTab ? 'on' : ''}" data-t="${t.id}"><span>${t.e}</span>${tx(t.name)}</button>`).join('')}</div>
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
    T.balance = await store.ticketBalance(); T.pending = await store.pendingRedemption(); refreshBar();
    ensureToday();
    let n = Math.max(1, Math.min(T.balance, 2));
    const draw = () => {
      app.innerHTML = `<h1 class="big-title">${tx('הַכַּרְטִיסִים שֶׁלִּי')}</h1>
        <div class="panel tickets-panel">
          <div class="tk-big">${icon('ticket')}<b>${T.balance}</b></div>
          <div class="story" style="font-size:24px;text-align:center">${tx('כָּל כַּרְטִיס =')} ${minutesText(SET.ticketMinutes)} ${tx('צְפִיָּה')}<br>
            <span class="small">${tx('הַיּוֹם הִרְוַחְתָּ')} ${S.today.tickets} ${tx('מִתּוֹךְ')} ${SET.dailyTicketCap}</span></div>
          ${T.pending ? `<div class="hint" style="justify-content:center;text-align:center">${icon('moon')}<span>${tx('בִּקַּשְׁתָּ')} ${ticketsText(T.pending.tickets)} (${minutesText(T.pending.minutes)}).<br>${tx('מְחַכִּים לְאִשּׁוּר שֶׁל')} ${helper()}.</span></div>
              <div class="row" style="justify-content:center"><button class="btn ghost" id="tkCancel">${icon('close')} ${tx('בַּטֵּל אֶת הַבַּקָּשָׁה')}</button><button class="btn go" id="tkBack">${tx('חֲזָרָה לַמַּפָּה')} ${icon('next')}</button></div>`
          : T.balance > 0 ? `<div class="tk-pick"><button class="btn ghost" id="tkMinus">${icon('minus')}</button><div class="tk-n"><b>${n}</b><small>${minutesText(n * SET.ticketMinutes)}</small></div><button class="btn ghost" id="tkPlus">${icon('plus')}</button></div>
              <div class="row" style="justify-content:center"><button class="btn gold big" id="tkAsk">${tx('לְבַקֵּשׁ מֵ')}${helper()}</button></div>`
          : `<div class="hint" style="justify-content:center">${icon('book')}<span>${tx('עוֹד אֵין כַּרְטִיסִים. כָּל דַּף שֶׁתַּצִּיל = כַּרְטִיס!')}</span></div>`}
          <div class="tk-rules">
            <div>${icon('book')} ${tx('דַּף חָדָשׁ שֶׁהִצַּלְתָּ')} <b>+1</b></div>
            <div>${icon('chest')} ${tx('מְשִׂימַת הַיּוֹם')} <b>+1</b></div>
            <div>${icon('flame')} ${tx('3 יָמִים בָּרֶצֶף')} · ${tx('7 יָמִים')} <b>+1 / +2</b></div>
            <div>${icon('practice')} ${tx('אִימּוּן יוֹמִי: חֶשְׁבּוֹן + כְּתִיבָה + חִידָה')} <b>+1</b></div>
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
        $('#tkAsk').onclick = async () => {
          $('#tkAsk').disabled = true;
          await store.requestRedemption(n, n * SET.ticketMinutes);
          store.notify('redeem', { tickets: n, minutes: n * SET.ticketMinutes });
          T.pending = await store.pendingRedemption(); sound('ok'); draw();
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
  const minWordsPractice = P => Math.min(20, 10 + Math.floor(P.writes / 3));
  /** האימון היומי: חשבון + כתיבה + חידה = כרטיס בונוס */
  async function checkPracticeBonus() {
    const P = pr();
    if (P.day.bonus || !practiceDone(P).every(Boolean)) return false;
    P.day.bonus = true; save();
    const got = await awardTickets(1, 'אימון יומי בחדר האימונים');
    store.log('practice_daily', {});
    sound('magic'); confetti(50);
    await popup(`${icon('trophy', 'bigico')}<h2 class="display" style="font-size:32px">${tx('הָאִימּוּן הַיּוֹמִי הֻשְׁלַם!')}</h2>
      <p class="story" style="font-size:24px">${tx('חֶשְׁבּוֹן, כְּתִיבָה וְחִידָה – כְּמוֹ שׁוֹמֵר זְמַן אֲמִתִּי.')}<br>
      ${got ? tx('קִבַּלְתָּ כַּרְטִיס בּוֹנוּס!') + ' ' + icon('ticket') : tx('הַכַּרְטִיסִים שֶׁל הַיּוֹם כְּבָר אָזְלוּ, אָז קִבַּלְתָּ 30 מַטְבְּעוֹת בּוֹנוּס!')}</p>`, tx('יֵשׁ!'));
    addCoins(got ? 15 : 30, $('#coinsPill'));
    return true;
  }
  function showPractice() {
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
    screen = 'practice-math'; setFocus(showPractice);
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
      const go = () => { i++; if (i < qs.length) draw(); else finish(); };
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
      save(); store.log('practice_math', { level: lv, score, newLevel: P.level });
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
        <div class="row" style="justify-content:center"><button class="btn gold" id="again">${icon('math')} ${tx('עוֹד סִבּוּב')}</button><button class="btn go" id="back">${tx('לְחַדַר הָאִימּוּנִים')} ${icon('next')}</button></div></div>`;
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
    setActions(`<div class="grow"></div><button class="btn gold main" id="ok" disabled>${icon('letter')} ${tx('שְׁלַח לְ')}${helper()}</button>`);
    const ta = $('#ta'), cnt = () => ta.value.trim().split(/\s+/).filter(Boolean).length;
    const upd = () => {
      const n = cnt(); $('#mt').style.width = Math.min(100, n / minW * 100) + '%'; setProg(30 + Math.min(70, n / minW * 70));
      $('#ml').textContent = n >= minW ? tx('✔ מְצֻיָּן! אֶפְשָׁר לִשְׁלֹחַ (וְגַם לְהוֹסִיף עוֹד)') : tx(minW - n === 1 ? 'עוֹד מִלָּה אַחַת' : `עוֹד ${minW - n} מִלִּים`);
      $('#ok').disabled = n < minW;
    };
    app.querySelectorAll('.chip').forEach(c => c.onclick = () => { ta.value = (ta.value.trim() + ' ' + c.dataset.w + ' ').trimStart(); ta.focus(); upd(); });
    ta.oninput = upd; upd();
    $('#ok').onclick = async () => {
      const n = cnt(); $('#ok').disabled = true;
      P.writes++; P.day.write = true; S.tasks++; S.firstTry++; save();
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
      setActions(`${more ? `<button class="btn gold" id="rNext">${icon('puzzle')} ${tx('עוֹד חִידָה')}</button>` : ''}<div class="grow"></div><button class="btn go" id="rDone">${tx('לְחַדַר הָאִימּוּנִים')} ${icon('next')}</button>`);
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
  function playLevel(world, idx) {
    const base = LEVELS[world][idx]; if (!base || !base.steps) return;   // "עונה 2" נעולה – אין מה לשחק
    if (!base.free && !S.done.includes(base.id)) { const ch = chapterOfLevel(world, base.id); if (ch) { S.curSeason = { ...(S.curSeason || {}), [world]: ch.id }; mapSel = ch.id; } }
    const steps = [...base.steps];
    // כל דף נגמר בזירת טריוויה (במקום שאלת האלוף הבודדת)
    const quiz = base.free ? [] : buildQuiz(base, ALUF[base.id]);
    if (quiz.length >= 3) steps.push({ t: 'arena', quiz });
    const lvl = { ...base, steps };
    L = { world, idx, lvl, step:0, mistakes:0, lastRead:null, replay: S.done.includes(lvl.id), start: Date.now() };
    screen = 'level'; closeOverlay(); setFocus(askLeave);
    renderStep();
  }
  const guideHTML = flat => `<div class="guide ${flat ? 'flat' : ''}"><div class="avatar">${guideAvatar()}</div><div class="guide-name">${tx(GUIDE.name)}</div></div>`;
  const setProg = pct => { const b = $('#lvlProg'); if (b) b.style.width = Math.max(4, Math.min(100, pct)) + '%'; };
  function askLeave() {
    overlay(`${icon('book', 'bigico')}<h2 class="display" style="font-size:28px">${tx('לָצֵאת מֵהַדַּף?')}</h2>
      <p class="story" style="font-size:22px">${tx('אִם תֵּצֵא עַכְשָׁו, הַדַּף יַתְחִיל מֵהַהַתְחָלָה בַּפַּעַם הַבָּאָה.')}</p>
      <div class="row" style="justify-content:center"><button class="btn go" id="lvStay">${tx('לְהַמְשִׁיךְ')}</button><button class="btn ghost" id="lvLeave">${tx('לָצֵאת')}</button></div>`);
    $('#lvStay').onclick = closeOverlay;
    $('#lvLeave').onclick = () => { closeOverlay(); showMap(L ? L.world : mapWorld); };
  }
  function tipHTML(type) {
    if (!TIPS[type] || (S.tips || {})[type]) return '';
    S.tips = { ...(S.tips || {}), [type]: true }; save();
    return `<div class="tip"><img src="/guide/yuval.jpg" alt=""><span>${tx(TIPS[type])}</span></div>`;
  }
  const frame = (inner, tipType, actions = '') => {
    app.innerHTML = `<div class="panel">${tipType ? tipHTML(tipType) : ''}${inner}</div>`;
    setProg(L.step / L.lvl.steps.length * 100); setActions(actions); window.scrollTo(0, 0);
  };
  function next() { L.step++; if (L.step >= L.lvl.steps.length) finishLevel(); else renderStep(); }
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

  function correct(el, base = 10) {
    sound('ok'); S.tasks++; const first = L.tries === 0; if (first) S.firstTry++;
    const n = earn(first ? base : Math.ceil(base / 2));
    addCoins(n, el);
    showSheet('good', tx(pick(PRAISE)), gain(n), 1150);
    setTimeout(next, 1050);
  }
  function wrong(el, hint) {
    sound('bad'); L.tries++; L.mistakes++; shake(el);
    try { navigator.vibrate && navigator.vibrate(40); } catch (e) {}
    const showHint = hint && L.tries >= 2;
    showSheet('bad', tx(pick(RETRY)), showHint ? tx('הִנֵּה רֶמֶז קָטָן לְמַעְלָה') : '', 1500);
    const fb = $('#fb');
    if (showHint && !$('#hintbox') && fb) fb.insertAdjacentHTML('afterend', `<div class="hint" id="hintbox">${icon('bulb')}<span>${tx(hint)}</span></div>`);
  }

  const LETTERS = ['א', 'ב', 'ג', 'ד'];
  const go = (id, label, cls = 'go', ic = 'next') => `<div class="grow"></div><button class="btn ${cls}" id="${id}">${label}${ic ? ' ' + icon(ic) : ''}</button>`;
  function renderStep() {
    const s = L.lvl.steps[L.step]; L.tries = 0; touchSession(); hideSheet(); keyHandler = null;
    if (s.t === 'read') {
      L.lastRead = s.lines;
      const sc = scene(s.scene || L.lvl.scene, { cabin: L.lvl.cabin, ...s });
      frame(`<div class="scene">${sc}${s.pic ? `<div class="sticker">${s.pic}</div>` : ''}</div>
        ${guideHTML()}<div class="story">${s.lines.map((l, i) => `<p style="animation-delay:${i * 0.6}s">${tx(l)}</p>`).join('')}</div>${tipHTML('read')}`,
        null, go('nx', tx('הַמְשֵׁךְ')));
      const nx = $('#nx'); nx.disabled = true; setTimeout(() => { if (nx) { nx.disabled = false; nx.classList.add('pulse'); } }, 600 * s.lines.length + 300);
      nx.onclick = () => { sound('page'); addCoins(L.replay ? 0 : 2, nx); next(); };
    }
    else if (s.t === 'aluf') renderAluf(s);
    else if (s.t === 'arena') renderArena(s);
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
        else { b.classList.add('wrong'); b.disabled = true; wrong(b, s.hint); }
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
      frame(`<div class="question">${tx(s.q)}</div>
        <div class="numwrap"><div class="numdisplay" id="nd"></div>
        <div class="numpad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => `<button data-n="${n}">${n}</button>`).join('')}<button class="del" id="del">${icon('backspace')}</button></div></div>
        <div class="feedback" id="fb"></div>`, 'number', `${lifelineBtn()}${go('ok', tx('בְּדִיקָה'), 'go', '')}`);
      bindLifeline(s);
      const nd = $('#nd'), upd = () => nd.textContent = val;
      app.querySelectorAll('.numpad button[data-n]').forEach(b => b.onclick = () => { if (val.length < 4) { val += b.dataset.n; upd(); } });
      $('#del').onclick = () => { val = val.slice(0, -1); upd(); };
      $('#ok').onclick = () => { if (!val) return; if (+val === s.answer) { nd.classList.add('good'); correct(nd); } else { wrong(nd, s.hint); val = ''; upd(); } };
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
        L.lastRead = (L.lastRead || []).concat(s.reveal || []);
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
        if (ok) { S.firstTry++; sound('ok'); const c = earn(10); addCoins(c, b); showSheet('good', tx(pick(PRAISE)), gain(c), 1300); }
        else { sound('bad'); showSheet('bad', tx('לֹא בְּדִיּוּק...'), tx('קְרָא אֶת הַהֶסְבֵּר'), 1500); }
        L.lastRead = (L.lastRead || []).concat(s.explain || []);
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
      const ta = $('#ta'), cnt = () => ta.value.trim().split(/\s+/).filter(Boolean).length;
      const upd = () => {
        const n = cnt(); $('#mt').style.width = Math.min(100, n / s.minWords * 100) + '%';
        $('#ml').textContent = n >= s.minWords ? tx('✔ מְצֻיָּן! אֶפְשָׁר לִשְׁלֹחַ (וְגַם לְהוֹסִיף עוֹד)') : tx(s.minWords - n === 1 ? 'עוֹד מִלָּה אַחַת' : `עוֹד ${s.minWords - n} מִלִּים`);
        $('#ok').disabled = n < s.minWords;
      };
      app.querySelectorAll('.chip').forEach(c => c.onclick = () => { ta.value = (ta.value.trim() + ' ' + c.dataset.w + ' ').trimStart(); ta.focus(); upd(); });
      ta.oninput = upd; upd();
      $('#ok').onclick = () => {
        const text = plain(ta.value), n = cnt();
        const hits = s.keywords.filter(k => text.includes(k)).length;
        const bonus = earn(15 + Math.min(15, n - s.minWords) + hits * 3);
        S.tasks++; S.firstTry++; save();
        store.sendLetter(L.lvl.id, ta.value).catch(() => {});
        store.notify('letter', { text: ta.value.slice(0, 140), level: plain(L.lvl.title) });
        sound('win'); addCoins(bonus, $('#ok'));
        showSheet('good', hits >= 2 ? tx('מִכְתָּב שֶׁל בַּלָּשׁ אֲמִתִּי!') : tx('מִכְתָּב נֶהְדָּר! הוּא נִשְׁלַח.'),
          (hits >= 2 ? tx('הִסְבַּרְתָּ בְּדִיּוּק מָה גִּלִּיתָ.') + ' ' : '') + gain(bonus), 1900);
        $('#ok').disabled = true; setTimeout(next, 1800);
      };
    }
  }

  async function finishLevel() {
    const id = L.lvl.id, stars = L.mistakes === 0 ? 3 : L.mistakes <= 2 ? 2 : 1;
    const firstTime = !S.done.includes(id);
    ensureToday();
    S.stars[id] = Math.max(S.stars[id] || 0, stars);
    if (firstTime) { S.done.push(id); if (!L.lvl.free) S.today.pages++; }
    const newCard = L.lvl.card && !S.cards.includes(L.lvl.card);
    if (newCard) S.cards.push(L.lvl.card);
    const streakNow = updateStreak(); save(); refreshBar();
    store.log('level_done', { level: id, stars, mistakes: L.mistakes, seconds: Math.round((Date.now() - L.start) / 1000), replay: L.replay });
    sound('win'); confetti(60); setProg(100); setActions('');
    const c = CARDS[L.lvl.card];
    overlay(`<div class="vbanner">${tx('הַדַּף נִצַּל!')}</div>
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
        store.notify('goal', { pages: S.today.pages });
        store.log('daily_goal', { pages: S.today.pages });
      }
      if (streakNow === 3 || (streakNow && streakNow % 7 === 0)) {
        const k = streakNow === 3 ? 1 : 2, b = await awardTickets(k, `רצף ${streakNow} ימים`);
        if (b) lines.push(`${icon('flame')} ${streakNow} ${tx('יָמִים בָּרֶצֶף!')} ${plus(b)}${icon('ticket')}`);
      }
      if (!g && S.today.tickets >= SET.dailyTicketCap) lines.push(`<span class="muted">${tx('הִגַּעְתָּ לַמַּקְסִימוּם שֶׁל הַיּוֹם – מָחָר יֵשׁ עוֹד!')}</span>`);
    }
    const tk = $('#tkLines'); if (tk && lines.length) tk.innerHTML = lines.map((l, i) => `<span class="rchip ${l.includes('class="muted"') ? 'muted' : ''}" style="animation-delay:${1.2 + i * .2}s">${l}</span>`).join('');
    $('#chest').onclick = () => {
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
      $('#cont').onclick = async () => {
        const ch = chapterOfLevel(L.world, L.lvl.id);
        if (firstTime && ch && !L.lvl.free && chDone(ch)) {
          sound('cheer'); confetti(70);
          await popup(`${icon('crown', 'bigico')}<h2 class="display" style="font-size:30px">${tx('הִצַּלְתָּ אֶת כָּל הַסִּפּוּר שֶׁל')} ${tx(ch.name)}!</h2>
            <p class="story" style="font-size:22px">${tx('כָּל הַפְּרָקִים חָזְרוּ לַסֵּפֶר. עַכְשָׁו – בְּחַר גִּבּוֹר חָדָשׁ בַּמַּפָּה!')}</p>`, tx('לַמַּפָּה'));
        }
        if (!L.lvl.free && pagesLeftToday() <= 0) { showSleep(L.world, true); return; }
        const mins = (Date.now() - sessionStart) / 60000;
        if (mins >= SET.sessionMin) showBreak(); else showMap(L.world);
      };
    };
  }

  function showBreak() {
    overlay(`${icon('moon', 'bigico')}<h2 class="display" style="font-size:30px">${tx('שׁוֹמֵר זְמַן טוֹב יוֹדֵעַ גַּם לָנוּחַ!')}</h2>
      <p class="story" style="font-size:24px">${tx('עָבַדְתָּ הַיּוֹם מְצֻיָּן. הַסֵּפֶר מְחַכֶּה לְךָ מָחָר – וְהָרֶצֶף שֶׁלְּךָ מַמְשִׁיךְ! 🔥')}</p>
      <div class="row" style="justify-content:center"><button class="btn go" id="bye">${tx('לְהִתְרָאוֹת!')} 👋</button><button class="btn ghost" id="more">${tx('עוֹד שָׁלָב אֶחָד')}</button></div>`);
    $('#bye').onclick = () => { closeOverlay(); showWorlds(); };
    $('#more').onclick = () => showMap(L.world);
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
    ensureWeek(S);
    const TQ = SET.arenaSec || 25, qs = s.quiz, luck = Math.random(), played = S.arena.played || 0;
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
    function podium() {
      const R = ranked(), my = R.findIndex(p => p.me) + 1;
      S.arena.played = (S.arena.played || 0) + 1;
      if (my === 1) { S.arena.wins = (S.arena.wins || 0) + 1; S.aluf = { ...(S.aluf || {}), [L.lvl.id]: true }; }
      S.arena.best = S.arena.best ? Math.min(S.arena.best, my) : my;
      const board = updateWeek(S, players), w = S.arena.week, wRank = board.findIndex(r => r.me) + 1, wPrev = w.lastRank || 0; w.lastRank = wRank;
      S.tasks += qs.length; S.firstTry += right; save();
      const prize = earn([0, 40, 30, 25, 15, 10, 10][my]);
      store.log('arena', { level: L.lvl.id, rank: my, right, of: qs.length, points: me.total, week: wRank });
      const stand = (p, place) => p ? `<div class="pd pd${place} ${p.me ? 'me' : ''}"><span class="pd-av">${keeperSVG(p.eq || {}, { look: p.look || DEFAULT_LOOK })}</span>
        <b>${pname(p)}</b><small>${p.total}</small><div class="pd-block"><span>${place}</span></div></div>` : '';
      const msg = my === 1 ? 'נִצַּחְתָּ בַּזִּירָה! אַתָּה הָאַלּוּף שֶׁל הַדַּף!' : my <= 3 ? 'עָלִיתָ לַפּוֹדְיוּם! כָּל הַכָּבוֹד!' : 'כִּמְעַט בַּפּוֹדְיוּם! בַּזִּירָה הַבָּאָה תַּצְלִיחַ עוֹד יוֹתֵר.';
      app.innerHTML = `<div class="panel ar-results">
        <div class="ar-banner">${icon(my === 1 ? 'crown' : 'trophy')}<span>${tx(msg)}</span></div>
        <div class="podium">${stand(R[1], 2)}${stand(R[0], 1)}${stand(R[2], 3)}</div>
        <div class="ar-rest">${R.slice(3).map((p, k) => `<div class="ar-row ${p.me ? 'me' : ''}"><span class="ar-place">${k + 4}</span><span class="ar-av">${headOf(p)}</span><b>${pname(p)}</b><span class="ar-pts">${p.total}</span></div>`).join('')}</div>
        <div class="rewards">
          <span class="rchip">${icon('check')} ${right}/${qs.length} ${tx('נְכוֹנוֹת')}</span>
          <span class="rchip">${icon('coin')} ${plus(prize)}</span>
          <span class="rchip">${icon('crown')} ${tx('מָקוֹם')} ${wRank} ${tx('בַּשָּׁבוּעַ')}${wPrev && wRank < wPrev ? ` <bdi dir="ltr" class="up">▲${wPrev - wRank}</bdi>` : ''}</span>
        </div></div>`;
      addCoins(prize, app.querySelector('.pd.me') || $('#coinsPill'));
      if (my <= 3) { sound('cheer'); confetti(my === 1 ? 80 : 45); } else sound('ok');
      setActions(`<button class="btn ghost" id="arBoard">${icon('crown')} ${tx('טַבְלַת הַשָּׁבוּעַ')}</button><div class="grow"></div><button class="btn go" id="arDone">${tx('הַמְשֵׁךְ')} ${icon('next')}</button>`);
      $('#arBoard').onclick = showBoard;
      $('#arDone').onclick = () => { setActions(''); next(); };
    }
  }
  /** הטבלה השבועית */
  function showBoard() {
    const board = leaderboard(S), w = S.arena.week, byId = Object.fromEntries(RIVALS.map(r => [r.id, r]));
    overlay(`<div class="ar-banner small">${icon('crown')}<span>${tx('טַבְלַת הַשָּׁבוּעַ')}</span></div>
      <p class="small" style="margin:0 0 6px">${w.games ? tx('הַנְּקֻדּוֹת מִכָּל הַזִּירוֹת הַשָּׁבוּעַ. הַטַּבְלָה מִתְאַפֶּסֶת בְּיוֹם רִאשׁוֹן.') : tx('עוֹד לֹא הִשְׁתַּתַּפְתָּ הַשָּׁבוּעַ. כָּל דַּף נִגְמָר בְּזִירָה!')}</p>
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
    const h = helper();
    // הדרכה קצרה: רק מה שחייבים לדעת. כל השאר מוסבר בטיפ קטן ברגע שהוא מופיע לראשונה
    const steps = [
      { sel: null, icon: 'crown', title: 'אֵיךְ מְשַׂחֲקִים?', text: first ? '{name}, יֵשׁ רַק 4 דְּבָרִים לָדַעַת. קָצָר, מַבְטִיחַ!' : 'בּוֹא נִזָּכֵר בְּ־4 דְּבָרִים.' },
      { sel: '#playBtn', text: 'לוֹחֲצִים כָּאן ← בּוֹחֲרִים גִּבּוֹר בַּמַּפָּה ← וּמַצִּילִים אֶת הַסִּפּוּר שֶׁלּוֹ, פֶּרֶק אַחֲרֵי פֶּרֶק.' },
      { sel: '#ticketsBtn', text: `כָּל פֶּרֶק חָדָשׁ = כַּרְטִיס. כָּל כַּרְטִיס = ${SET.ticketMinutes === 1 ? 'דַּקָּה אַחַת' : SET.ticketMinutes + ' דַּקּוֹת'} צְפִיָּה. מְבַקְּשִׁים כָּאן מֵ${SET.helperName || 'אַבָּא'}.` },
      { sel: '#tab-practice', text: 'חֲדַר הָאִימּוּנִים: חֶשְׁבּוֹן, כְּתִיבָה וְחִידָה. עָשִׂיתָ אֶת שְׁלָשְׁתָּם? עוֹד כַּרְטִיס!' },
      { sel: null, icon: 'bulb', title: 'נִתְקַעְתָּ?', html: `<div class="coach-help">
          <div>${icon('book')}<b>${tx('לִקְרֹא שׁוּב')}</b><span>${tx('הַתְּשׁוּבָה מְחַכָּה בַּסִּפּוּר.')}</span></div>
          <div>${icon('phone')}<b>${tx('טֵלֵפוֹן לְ')}${h}</b><span>${tx('פַּעַם אַחַת בְּכָל כְּנִיסָה – בְּחִנָּם.')}</span></div>
        </div><p class="coach-text">${tx('וְאִם טוֹעִים? זֶה בְּסֵדֶר גָּמוּר. מְנַסִּים שׁוּב!')} 💪</p>` },
    ];
    if (first) steps.push({ sel: null, icon: 'chest', title: 'זֶהוּ!', text: 'מַתָּנָה מִמֶּנִּי: 100 מַטְבְּעוֹת. בּוֹא נִקְנֶה לַשּׁוֹמֵר שֶׁלְּךָ צִיּוּד רִאשׁוֹן!', gift: true });
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
      <div class="coach-foot"><div class="coach-dots">${t.steps.map((_, i) => `<i class="${i === t.i ? 'on' : ''}"></i>`).join('')}</div>
      ${st.gift ? `<button class="btn gold" id="coachGift">${icon('shop')} ${tx('לַחֲנוּת!')}</button>` : `<button class="btn go" id="coachNext">${last ? tx('יוֹצְאִים לַדֶּרֶךְ!') : tx('הֵבַנְתִּי')} ${icon('next')}</button>`}</div>`;
    card.classList.remove('coach-in'); void card.offsetWidth; card.classList.add('coach-in');
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
    app.innerHTML = `<div class="cover-wrap">
      <div class="cover-msg">${tx('יֵשׁ כָּאן סֵפֶר מְיֻחָד מְאוֹד...')}<br><span>${tx('הוּא חִכָּה רַק לְךָ.')}</span></div>
      <div class="book3d" id="book">
        <div class="book-pages"></div>
        <div class="book-cover"><div class="bc-frame">${LOGO}<div class="bc-title">${tx('סֵפֶר הַזְּמַן')}</div><div class="bc-sub">${tx('שׁוֹמְרֵי הַזְּמַן')}</div></div></div>
        <div class="book-glow"></div>
      </div>
      <button class="btn gold big-cta pulse" id="openBook">${icon('book')} ${tx('פְּתַח אֶת הַסֵּפֶר')}</button>
    </div>`;
    $('#openBook').onclick = () => {
      $('#openBook').disabled = true; sound('magic');
      $('#book').classList.add('open');
      setTimeout(() => { const f = document.createElement('div'); f.className = 'flash'; document.body.appendChild(f); setTimeout(() => f.remove(), 900); }, 900);
      setTimeout(() => playLevel('history', 0), 1250);
    };
  }

  function askExit() {
    overlay(`<h2 class="display">${tx('אֵזוֹר הוֹרִים')} 🔒</h2><p class="small">${tx('הַכְנֵס קוֹד:')}</p>
      <input type="password" id="pin" inputmode="numeric" maxlength="8"><div class="row" style="justify-content:center">
      <button class="btn" id="pinok">${tx('כְּנִיסָה')}</button><button class="btn ghost" id="pincancel">${tx('בִּטּוּל')}</button></div>`);
    $('#pin').focus();
    $('#pincancel').onclick = closeOverlay;
    const go = () => { if ($('#pin').value === String(SET.pin)) { store.flush?.(); opts.onExit?.(); } else shake($('#pin')); };
    $('#pinok').onclick = go; $('#pin').onkeydown = e => { if (e.key === 'Enter') go(); };
  }

  /* ---------------- חיבורים ---------------- */
  let keyHandler = null;
  const onKey = e => keyHandler && keyHandler(e);
  document.addEventListener('keydown', onKey);
  const TAB_GO = { home: () => showWorlds(), map: () => showMap(mapWorld), practice: () => showPractice(), shop: () => showShop(), cards: () => showCards() };
  root.querySelectorAll('.tab').forEach(b => b.onclick = () => { sound('page'); TAB_GO[b.dataset.tab](); });
  $('#lvlClose').onclick = () => { if (focusClose) focusClose(); else showWorlds(); };
  $('#streakPill').onclick = () => { bump($('#streakPill')); };
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
  $('#helpBtn').onclick = () => { if (screen !== 'worlds') showWorlds(); setTimeout(() => startTutorial(false), 300); };
  $('#overlay').onclick = e => { if (e.target.id === 'overlay' && !$('#chest') && !$('#cont') && !$('#ppOk') && !$('#llCancel') && !$('#llOk')) closeOverlay(); };
  let rz; const onResize = () => { clearTimeout(rz); rz = setTimeout(() => { if (screen === 'map' && !tour) showMap(mapWorld); if (tour) drawTour(); }, 250); };
  window.addEventListener('resize', onResize);
  const onHide = () => store.flush?.();
  window.addEventListener('pagehide', onHide);

  if (typeof window !== 'undefined') window.__guideSVG = guideSVG;
  // גישה לבדיקות אוטומטיות
  if (typeof window !== 'undefined') window.__kg = { state: () => S, level: () => L, playLevel, startTutorial, tour: () => tour, renderStep: () => renderStep(), showWorlds, showMap, showShop, showTickets, showPractice, playMath: () => playMath(), mathAnswer: () => curQ && curQ.answer, showCreator: () => showCreator(() => showShop()), showCards, finishLevel: () => finishLevel(), addCoins: n => addCoins(n) };

  /* ---------------- התחלה ---------------- */
  (async () => {
    try {
      const data = await store.init();
      if (destroyed) return;
      child = data.child;
      SET = { ...DEFAULT_SETTINGS, ...(child.settings || {}) };
      S = { ...structuredClone(BASE_STATE), ...(data.state || {}) };
      S.today = { ...BASE_STATE.today, ...(S.today || {}) }; S.equipped = S.equipped || {}; S.owned = S.owned || [];
      if (!S.name) S.name = child.name || '';
      if (S.equipped.cape) { S.equipped.outfit = S.equipped.cape; delete S.equipped.cape; }
      touchSession();
      ensureToday();
      root.querySelectorAll('.tab span').forEach((sp, i) => sp.textContent = tx(TABS[i][2]));
      [T.balance, T.pending, T.riddle] = await Promise.all([store.ticketBalance(), store.pendingRedemption(), store.activeRiddle()]);
      store.log('session_start', {});
      timers.push(setInterval(() => { if (document.visibilityState === 'visible') { S.minutes += 1; save(); } }, 60000));
      // בדיקה תקופתית: חידה חדשה, תשובה למכתב, אישור כרטיסים
      timers.push(setInterval(async () => {
        if (screen !== 'worlds' && screen !== 'map' && screen !== 'sleep' && screen !== 'practice') return;
        const before = JSON.stringify(SET.bonusPages || null);
        await refreshSettings();
        const r = await store.activeRiddle(); const changed = (r?.id || null) !== (T.riddle?.id || null) || before !== JSON.stringify(SET.bonusPages || null); T.riddle = r;
        if (changed && !overlayOpen() && screen !== 'sleep') rerender(); else checkInbox();
      }, 30000));
      refreshBar();
      if (!S.done.includes('p1')) showCover(); else showWorlds();
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
      audio.stop();
      store.flush?.();
    },
  };
}
