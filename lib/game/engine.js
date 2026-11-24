/* מנוע המשחק "שומרי הזמן".
   מקבל store – שכבת שמירה (Supabase או מצב הדגמה) – ומצייר את המשחק בתוך root. */
import { GUIDE, CARDS, WORLDS, LEVELS, RANKS, PRAISE, RETRY, DEFAULT_SETTINGS, ALUF, TIPS } from './content.js';
import { keeperSVG, itemThumb, ITEMS, SLOTS, RARITY, LOOK_OPTIONS, DEFAULT_LOOK } from './avatar.js';
import { scene, guideSVG, guideAvatar, GUIDE_CREDIT, LOGO, worldArt, CHEST_CLOSED, CHEST_OPEN } from './art.js';
import { worldMapSVG, MAPPOS, MAP_W, MAP_H } from './worldmap.js';
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
  function rank() { let r = RANKS[0]; RANKS.forEach(x => { if (S.done.length >= x.min) r = x; }); return r.name; }
  function refreshBar() {
    $('#coins').textContent = S.coins;
    $('#tickets').textContent = T.balance;
    $('#streak').textContent = S.streak.count;
    $('#rank').textContent = tx(rank()) + (S.name ? ' · ' + S.name : '');
    $('#me').innerHTML = keeperSVG(S.equipped, { head:true, look: S.look });
  }
  const earn = n => (L && L.replay) ? Math.max(1, Math.round(n * 0.2)) : n;
  function fly(text, el, cls = '') {
    const r = (el || $('#coins')).getBoundingClientRect();
    const f = document.createElement('div'); f.className = 'coinfly ' + cls; f.textContent = text;
    f.style.left = (r.left + r.width / 2 - 30) + 'px'; f.style.top = r.top + 'px';
    document.body.appendChild(f); setTimeout(() => f.remove(), 1000);
  }
  function addCoins(n, el) { if (n <= 0) return; S.coins += n; save(); refreshBar(); fly('+' + n + ' 🪙', el); if (n >= 5) setTimeout(() => sound('coin'), 120); }
  async function awardTickets(n, reason, force = false) {
    ensureToday();
    const give = force ? n : Math.min(n, Math.max(0, SET.dailyTicketCap - S.today.tickets));
    if (give <= 0) return 0;
    if (!force) S.today.tickets += give;   // פרס של אבא (חידה) לא נספר במכסה היומית
    save();
    T.balance = await store.addTickets(give, reason);
    refreshBar(); fly('+' + give + ' 🎟️', $('#tickets'));
    return give;
  }
  function confetti(n = 40) {
    const em = ['⭐','✨','🪙','💛','🌟'];
    for (let i = 0; i < n; i++) {
      const c = document.createElement('div'); c.className = 'confetti'; c.textContent = pick(em);
      c.style.left = Math.random() * 100 + 'vw'; c.style.animationDuration = (1.5 + Math.random() * 1.5) + 's';
      document.body.appendChild(c); setTimeout(() => c.remove(), 3200);
    }
  }
  let actx = null;
  /* צלילים – מסונתזים בדפדפן, בלי קבצים */
  function tone(f, t0, dur, vol = .12, type = 'sine') {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, actx.currentTime + t0);
    g.gain.setValueAtTime(0, actx.currentTime + t0);
    g.gain.linearRampToValueAtTime(vol, actx.currentTime + t0 + .015);
    g.gain.exponentialRampToValueAtTime(.0008, actx.currentTime + t0 + dur);
    o.connect(g); g.connect(actx.destination); o.start(actx.currentTime + t0); o.stop(actx.currentTime + t0 + dur + .05);
  }
  function swoosh(vol = .08) {
    const len = .35, buf = actx.createBuffer(1, actx.sampleRate * len, actx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / d.length);
    const src = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
    f.type = 'bandpass'; f.frequency.setValueAtTime(900, actx.currentTime); f.frequency.exponentialRampToValueAtTime(2600, actx.currentTime + len);
    g.gain.value = vol; src.buffer = buf; src.connect(f); f.connect(g); g.connect(actx.destination); src.start();
  }
  function sound(type) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      if (type === 'ok') { tone(784, 0, .25, .12); tone(1175, .09, .35, .1); }
      else if (type === 'coin') { tone(1318, 0, .12, .07, 'square'); tone(1760, .07, .25, .06, 'square'); }
      else if (type === 'win') { [523, 659, 784, 1046].forEach((f, i) => tone(f, i * .11, .45, .11, 'triangle')); tone(1568, .5, .7, .07); }
      else if (type === 'magic') { [392, 523, 659, 784, 988, 1175, 1568].forEach((f, i) => tone(f, i * .07, .8, .07)); swoosh(.05); }
      else if (type === 'page') swoosh(.06);
      else if (type === 'ring') [0, .3].forEach(t => { tone(880, t, .12, .08, 'square'); tone(660, t + .14, .12, .08, 'square'); });
      else { tone(311, 0, .18, .08, 'triangle'); tone(277, .1, .25, .07, 'triangle'); }
    } catch (e) {}
  }
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
  root.innerHTML = `<div class="kg">
    <div id="topbar">
      <button class="iconbtn" id="homeBtn" title="${'בַּיִת'}">🏠</button>
      <div class="pill" id="coinsPill" title="מַטְבְּעוֹת">🪙 <span id="coins">0</span></div>
      <button class="pill pill-btn" id="ticketsBtn" title="כַּרְטִיסִים">🎟️ <span id="tickets">0</span></button>
      <div class="pill" id="streakPill" title="יָמִים בָּרֶצֶף">🔥 <span id="streak">0</span></div>
      <div id="rank"></div>
      <div class="spacer"></div>
      <button class="iconbtn me" id="me" title="הַשּׁוֹמֵר שֶׁלִּי"></button>
      <button class="iconbtn" id="cardsBtn" title="הָאֹסֶף שֶׁלִּי">🃏</button>
      <button class="iconbtn" id="helpBtn" title="אֵיךְ מְשַׂחֲקִים">❓</button>
      <button class="iconbtn" id="exitBtn" title="אֵזוֹר הוֹרִים">⚙️</button>
    </div>
    <main id="app"><div class="loading">⏳</div></main>
    <div id="overlay" class="hidden"><div class="panel" id="overlayBody"></div></div>
    <div id="coach" class="hidden"><div class="coach-hole" id="coachHole"></div><div class="coach-card" id="coachCard"></div></div>
  </div>`;
  const app = $('#app');

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
          await popup(`<div style="font-size:80px">🎉</div><h2 class="display" style="font-size:32px">${helper()} ${tx('אִשֵּׁר!')}</h2>
            <p class="story" style="font-size:28px">${minutesText(d.minutes)} ${tx('שֶׁל צְפִיָּה – מַגִּיעַ לְךָ!')}</p>`, tx('יֵשׁ!'));
        } else {
          await popup(`<div style="font-size:70px">🙂</div><p class="story" style="font-size:26px">${helper()} ${tx('אָמַר: לֹא עַכְשָׁו.')}<br>${tx('הַכַּרְטִיסִים שֶׁלְּךָ נִשְׁמָרִים בְּצַד.')} 🎟️</p>`, tx('בְּסֵדֶר'));
        }
      }
      const replies = await store.unreadReplies();
      for (const r of replies) {
        sound('ok');
        await popup(`<div class="letter">
            <div class="letter-head">✉️ ${tx('מִכְתָּב מֵ')}${helper()}!</div>
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
  const nextNewLevel = world => LEVELS[world].find(l => !l.locked && !S.done.includes(l.id));
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
    if (next && !isSleeping(next)) { playLevel(world, LEVELS[world].indexOf(next)); return; }
    screen = 'sleep'; closeOverlay();
    app.innerHTML = `<div class="panel sleep">
      ${celebrate ? `<div class="sleep-trophy">🏆</div><h2 class="display">${tx('הִצַּלְתָּ אֶת כָּל הַדַּפִּים שֶׁל הַיּוֹם!')}</h2>` : `<div class="sleep-trophy">🌙</div><h2 class="display">${tx('נִגְמְרוּ הַדַּפִּים שֶׁל הַיּוֹם')}</h2>`}
      <div class="guide flat"><div class="avatar">${guideAvatar()}</div><div class="guide-name">${tx(GUIDE.name)}</div></div>
      <div class="story" style="font-size:26px">
        <p>${tx('{name}, עָבַדְתָּ מְצֻיָּן!')}</p>
        <p>${tx('סֵפֶר הַזְּמַן צָרִיךְ לָנוּחַ בַּלַּיְלָה, כְּדֵי לְהַחְזִיר אֶת הַכֹּחַ הַקָּסוּם שֶׁלּוֹ.')}</p>
        <p>${tx('מָחָר יִפָּתַח דַּף חָדָשׁ...')}</p>
      </div>
      ${next ? `<div class="teaser"><div class="teaser-art">${scene(next.scene, { night: true })}<span>?</span></div>
        <div><small>${tx('הַדַּף שֶׁל מָחָר:')}</small><b>${tx(next.title)}</b></div></div>`
        : `<div class="hint">${tx('יוּבַל כּוֹתֵב עַכְשָׁיו דַּפִּים חֲדָשִׁים בִּשְׁבִילְךָ!')} ✍️</div>`}
      <div class="countdown">⏳ ${tx('נִפְתָּח בְּעוֹד')} <b>${untilTomorrow()}</b></div>
      <div class="small" style="margin-top:14px">${tx('בֵּינְתַיִם אֶפְשָׁר:')}</div>
      <div class="row" style="justify-content:center;margin-top:8px">
        <button class="btn go" id="slPractice">🏋️ ${tx('לְהִתְאַמֵּן')}</button>
        <button class="btn gold" id="slShop">🛍️ ${tx('לְהִתְלַבֵּשׁ')}</button>
        ${T.riddle ? `<button class="btn" id="slRiddle">📜 ${tx('לִפְתֹּר חִידָה')}</button>` : ''}
        <button class="btn ghost" id="slMap">⭐ ${tx('לְשַׁפֵּר כּוֹכָבִים')}</button>
      </div></div>`;
    $('#slShop').onclick = showShop;
    $('#slPractice').onclick = showPractice;
    $('#slMap').onclick = () => showMap(world);
    if ($('#slRiddle')) $('#slRiddle').onclick = showRiddle;
    refreshBar();
  }

  /* ---------------- משימת היום + חידה ---------------- */
  function dailyHTML() {
    ensureToday();
    const g = SET.dailyGoal, p = Math.min(S.today.pages, g), pct = Math.round(p / g * 100), left = pagesLeftToday();
    return `<div class="daily">
      <div class="ring" style="--p:${pct}"><span>${p}/${g}</span></div>
      <div class="daily-txt"><b>${tx('מְשִׂימַת הַיּוֹם')}</b>
        <span>${left <= 0 ? '🌙 ' + tx('הַדַּף הַבָּא נִפְתָּח מָחָר') : S.today.goalDone ? tx('הֻשְׁלְמָה! כָּל הַכָּבוֹד') + ' 🎯' : tx(`לְהַצִּיל ${g} דַּפִּים`) + ' → <span dir="ltr">+1 🎟️</span>'}</span></div>
      <div class="daily-t">🎟️ ${S.today.tickets}/${SET.dailyTicketCap} <small>${tx('הַיּוֹם')}</small></div>
    </div>`;
  }
  function riddleHTML() {
    if (!T.riddle) return '';
    return `<button class="riddle-card" id="riddleBtn"><span class="scroll">📜</span>
      <span><b>${tx('חִידָה מֵ')}${helper()}!</b><small>${tx('פְּתֹר וְתַרְוִיחַ')} ${T.riddle.reward_tickets ? '🎟️' : '🪙'}</small></span></button>`;
  }
  function bindRiddle() { const b = $('#riddleBtn'); if (b) b.onclick = showRiddle; }
  function showRiddle() {
    const r = T.riddle; if (!r) return;
    const q = SET.nikud ? (r.question_nikud || r.question) : plain(r.question_nikud || r.question);
    const h = r.hint ? (SET.nikud ? (r.hint_nikud || r.hint) : plain(r.hint_nikud || r.hint)) : '';
    let tries = 0;
    overlay(`<div style="font-size:64px">📜</div><h2 class="display">${tx('חִידָה מֵ')}${helper()}</h2>
      <div class="story" style="font-size:28px">${esc(q)}</div>
      <input type="text" id="rdIn" autocomplete="off" placeholder="${tx('הַתְּשׁוּבָה שֶׁלִּי...')}" style="margin-top:12px">
      <div class="feedback" id="rdFb"></div>
      <div class="row" style="justify-content:center"><button class="btn go" id="rdOk">${tx('בְּדִיקָה')} ✔</button>
${h ? `<button class="btn ghost" id="rdHint">💡 ${tx('רֶמֶז')}</button>` : ''}
        <button class="btn ghost" id="rdClose">${tx('אַחַר כָּךְ')}</button></div>`);
    $('#rdClose').onclick = closeOverlay;
    if (h) $('#rdHint').onclick = () => { $('#rdFb').innerHTML = `<div class="hint">💡 ${esc(h)}</div>`; };
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
      overlay(`<div style="font-size:80px">🧠</div><h2 class="display" style="font-size:32px">${tx('פָּתַרְתָּ אֶת הַחִידָה!')}</h2>
        <p class="story" style="font-size:24px">${helper()} ${tx('יְקַבֵּל הוֹדָעָה שֶׁפָּתַרְתָּ.')}</p>
        <div class="row" style="justify-content:center"><button class="btn go" id="rdDone">${tx('יֵשׁ!')}</button></div>`);
      $('#rdDone').onclick = async () => { closeOverlay(); await checkPracticeBonus(); rerender(); };
    };
  }

  /* ---------------- מסכים ---------------- */
  function rerender() {
    if (screen === 'level' && L) renderStep(); else if (screen === 'map' || screen === 'sleep') showMap(mapWorld);
    else if (screen === 'practice') showPractice(); else if (screen === 'cards') showCards(); else if (screen === 'shop') showShop(); else if (screen === 'tickets') showTickets(); else showWorlds();
  }

  function showWorlds() {
    closeOverlay(); screen = 'worlds';
    app.innerHTML = `<div class="logo">${LOGO}<h1 class="big-title">${tx('שׁוֹמְרֵי הַזְּמַן')}</h1></div>
      <button class="howto" id="howto">❓ ${tx('אֵיךְ מְשַׂחֲקִים?')}</button>
      ${dailyHTML()}${riddleHTML()}${practiceCardHTML()}
      <div class="subtitle">${tx('בְּחַר עוֹלָם וְהַצֵּל אֶת הַסִּפּוּרִים')}</div>
      <div class="worlds">${WORLDS.map(w => `
        <button class="world ${w.open ? '' : 'locked'}" data-w="${w.id}">
          <div class="art">${worldArt(w.id)}</div>
          ${w.open ? '' : `<span class="lock-tag">🔒 ${tx(w.lockText)}</span>`}
          <div class="wtxt"><b>${tx(w.title)}</b><span>${tx(w.desc)}</span></div>
        </button>`).join('')}</div>`;
    app.querySelectorAll('.world').forEach(b => b.onclick = () => {
      const w = WORLDS.find(x => x.id === b.dataset.w);
      if (w.open) showMap(w.id); else shake(b);
    });
    $('#howto').onclick = () => { showMap('history'); setTimeout(() => startTutorial(false), 300); };
    bindRiddle(); bindPractice(); refreshBar(); checkInbox(); maybeTutorial();
  }

  /* ---------------- מפת העולם ---------------- */
  function chaptersOf(world) {
    const out = [];
    LEVELS[world].forEach((l, i) => {
      if (l.chapter || !out.length) out.push({ id: l.id, name: l.chapter || l.title, levels: [] });
      out[out.length - 1].levels.push({ ...l, idx: i });
    });
    return out;
  }
  let mapSel = null;
  function showMap(world) {
    closeOverlay(); screen = 'map'; mapWorld = world;
    const chs = chaptersOf(world), next = nextNewLevel(world), nextSleeping = isSleeping(next);
    const curCh = chs.find(c => c.levels.some(l => next && l.id === next.id)) || chs[chs.length - 1];
    const chState = c => {
      const playable = c.levels.filter(l => !l.locked);
      if (!playable.length) return 'locked';
      if (playable.every(l => S.done.includes(l.id))) return 'done';
      if (c === curCh) return nextSleeping ? 'sleep' : 'current';
      return chs.indexOf(c) < chs.indexOf(curCh) ? 'done' : 'locked';
    };
    // מסלולים בין הפרקים
    const segs = [];
    chs.forEach((c, k) => {
      const pos = MAPPOS[c.id]; if (!pos) return;
      const done = chState(c) === 'done';
      if (pos.route) { let prev = pos.dot; pos.route.forEach((r, n) => { const lvDone = c.levels[n + 1] && S.done.includes(c.levels[n + 1].id); segs.push({ from: prev, to: [r[0], r[1]], done: !!lvDone }); prev = [r[0], r[1]]; }); }
      const nx = chs[k + 1] && MAPPOS[chs[k + 1].id]; if (nx) segs.push({ from: pos.dot, to: nx.dot, done });
    });
    if (!mapSel || !chs.find(c => c.id === mapSel)) mapSel = curCh.id;
    const pct = (v, m) => (v / m * 100).toFixed(2) + '%';
    const pins = chs.map(c => {
      const pos = MAPPOS[c.id]; if (!pos) return '';
      const st = chState(c), first = c.levels.find(l => !l.locked) || c.levels[0];
      const doneN = c.levels.filter(l => S.done.includes(l.id)).length, total = c.levels.filter(l => !l.locked).length;
      const inner = st === 'locked' && !first.scene ? '<span class="wq">?</span>' : scene(first.scene || 'library', { night: st === 'sleep' }) + (st === 'locked' ? '<div class="lockveil">🔒</div>' : '');
      return `<button class="wpin ${st} ${c.id === mapSel ? 'sel' : ''}" data-ch="${c.id}" style="left:${pct(pos.pin[0], MAP_W)};top:${pct(pos.pin[1], MAP_H)}">
          ${st === 'current' || st === 'sleep' ? `<span class="wme">${keeperSVG(S.equipped, { head: true, look: S.look })}</span>` : ''}
          <span class="wdisc">${inner}</span>
          <span class="wlabel">${tx(c.name)}${total ? ` <small>${doneN}/${total}</small>` : ''}</span>
        </button>`;
    }).join('');
    const stems = chs.map(c => { const p2 = MAPPOS[c.id]; return p2 && (p2.pin[0] !== p2.dot[0] || p2.pin[1] !== p2.dot[1]) ? `<line x1="${p2.dot[0]}" y1="${p2.dot[1]}" x2="${p2.pin[0]}" y2="${p2.pin[1]}" stroke="#5a3a14" stroke-width="2.5" stroke-dasharray="3 4"/><circle cx="${p2.dot[0]}" cy="${p2.dot[1]}" r="6" fill="#c0392b" stroke="#fff6dc" stroke-width="2"/>` : ''; }).join('');
    const waypoints = chs.map(c => (MAPPOS[c.id]?.route || []).map(r => `<span class="wway" style="left:${pct(r[0], MAP_W)};top:${pct(r[1], MAP_H)}">${r[2]}</span>`).join('')).join('');
    const cta = !next ? `<button class="btn ghost next-cta" disabled>🎉 ${tx('הִצַּלְתָּ אֶת כָּל הַדַּפִּים! עוֹד דַּפִּים בַּדֶּרֶךְ...')}</button>`
      : nextSleeping ? `<button class="btn next-cta sleep" id="nextCta">🌙 ${tx('הַדַּף הַבָּא נִפְתָּח מָחָר')}</button>`
      : `<button class="btn gold next-cta" id="nextCta">▶ ${tx('הַדַּף הַבָּא:')} ${tx(next.title)}</button>`;
    app.innerHTML = `${dailyHTML()}${riddleHTML()}
      <div class="wmap-scroll"><div class="wmap">${worldMapSVG(segs)}
        <svg class="wstems" viewBox="0 0 ${MAP_W} ${MAP_H}" preserveAspectRatio="xMidYMid meet">${stems}</svg>
        ${waypoints}${pins}</div></div>
      <div class="cta-wrap">${cta}</div>
      <div id="chSheet"></div>${practiceCardHTML()}`;
    const drawSheet = () => {
      const c = chs.find(x => x.id === mapSel), st = chState(c), pos = MAPPOS[c.id];
      $('#chSheet').innerHTML = `<div class="sheet"><div class="sheet-head"><b>${tx(c.name)}</b><span>📍 ${tx(pos?.place || '')}</span></div>
        <div class="pages">${c.levels.map(l => {
          const done = S.done.includes(l.id), isNext = next && l.id === next.id, sleeping = isNext && nextSleeping;
          const avail = !l.locked && (done || (isNext && !sleeping));
          const stars = S.stars[l.id] || 0;
          return `<button class="page ${done ? 'done' : ''} ${isNext && !sleeping ? 'next' : ''} ${avail ? '' : 'off'}" data-i="${l.idx}" ${l.locked ? 'disabled' : ''}>
            <span class="pthumb">${l.locked ? '<span class="wq">?</span>' : scene(l.scene, { night: sleeping })}${!avail && !sleeping && !l.locked ? '<span class="lockveil">🔒</span>' : ''}${sleeping ? '<span class="lockveil moon">🌙</span>' : ''}</span>
            <span class="ptitle">${tx(l.title)}</span>
            <span class="pstate">${done ? `${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}${S.aluf[l.id] ? ' 🏆' : ''}` : isNext && !sleeping ? `▶ ${tx('שַׂחֵק')}` : sleeping ? tx('נִפְתָּח מָחָר') : '🔒'}</span>
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
    const nc = $('#nextCta');
    if (nc) nc.onclick = () => { if (nextSleeping) showSleep(world, false); else playLevel(world, LEVELS[world].indexOf(next)); };
    // בטלפון: גוללים את המפה לפרק הנוכחי
    const sc = app.querySelector('.wmap-scroll'), cp = app.querySelector('.wpin.current, .wpin.sleep');
    if (sc && cp && sc.scrollWidth > sc.clientWidth) setTimeout(() => cp.scrollIntoView({ inline: 'center', block: 'nearest' }), 100);
    window.scrollTo(0, 0);
    bindRiddle(); bindPractice(); refreshBar(); checkInbox(); maybeTutorial();
  }

  function showCards() {
    closeOverlay(); screen = 'cards';
    app.innerHTML = `<h1 class="big-title" style="font-size:40px">${tx('הָאֹסֶף שֶׁלִּי')}</h1>
      <div class="subtitle">${S.cards.length} / ${Object.keys(CARDS).length}</div>
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
    closeOverlay(); screen = 'shop';
    const eq = tryOn ? { ...S.equipped, [tryOn.slot]: tryOn.id } : S.equipped;
    const items = ITEMS.filter(i => i.slot === shopTab);
    let bar = '';
    if (tryOn) {
      const lk = lockInfo(tryOn), miss = tryOn.price - S.coins;
      bar = `<div class="buybar r-${tryOn.r}"><b>${tx(tryOn.name)}</b>
        ${lk ? `<span>🔒 ${tx('נִפְתָּח אַחֲרֵי')} ${lk.need} ${tx(lk.label)} (${lk.have}/${lk.need})</span>`
          : miss > 0 ? `<span>${tx('חֲסֵרִים לְךָ עוֹד')} ${miss} 🪙</span>`
          : `<button class="btn gold" id="buyNow">${tx('לִקְנוֹת')} · ${tryOn.price} 🪙</button>`}
        <button class="btn ghost" id="tryOff">✖</button></div>`;
    }
    app.innerHTML = `<div class="shop2">
      <div class="stage"><div class="stage-keeper">${keeperSVG(eq, { look: S.look })}<div class="pedestal"></div></div>
        <div class="stage-info"><div class="display stage-name">${esc(S.name || '')}</div><div class="stage-rank">${tx(rank())}</div>
          <div class="pill stage-coins">🪙 ${S.coins}</div>
          <button class="btn ghost" id="editLook">✏️ ${tx('שַׁנֵּה מַרְאֶה')}</button></div></div>
      ${bar}
      <div class="shop-tabs">${SLOTS.map(t => `<button class="stab ${t.id === shopTab ? 'on' : ''}" data-t="${t.id}"><span>${t.e}</span>${tx(t.name)}</button>`).join('')}</div>
      <div class="shop-grid">${items.map(it => {
        const own = S.owned.includes(it.id), on = S.equipped[it.slot] === it.id, lk = !own && lockInfo(it), trying = tryOn && tryOn.id === it.id;
        return `<button class="sitem r-${it.r} ${own ? 'own' : ''} ${on ? 'on' : ''} ${trying ? 'trying' : ''}" data-id="${it.id}">
          <span class="rarity">${tx(RARITY[it.r].name)}</span>
          <span class="sthumb">${itemThumb(it, S.look)}${lk ? '<span class="slock">🔒</span>' : ''}</span>
          <b>${tx(it.name)}</b>
          <span class="sprice">${on ? '✔ ' + tx('לָבוּשׁ') : own ? tx('שֶׁלְּךָ') : lk ? `${lk.have}/${lk.need} ${lk.label.split(' ').pop()}` : it.price + ' 🪙'}</span>
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
      sound('win'); confetti(30); store.log('shop_buy', { item: it.id }); showShop();
    };
    refreshBar();
  }

  /* ---------------- יצירת הדמות ---------------- */
  function showCreator(onDone) {
    closeOverlay(); screen = 'creator';
    let L = { ...DEFAULT_LOOK, ...(S.look || {}) };
    const draw = () => {
      const sw = (key, arr) => `<div class="cr-row"><div class="cr-swatches">${arr.map(c => `<button class="sw ${L[key] === c ? 'on' : ''}" data-k="${key}" data-v="${c}" style="background:${c}"></button>`).join('')}</div></div>`;
      app.innerHTML = `<h1 class="big-title" style="font-size:38px">${tx('צוֹר אֶת הַשּׁוֹמֵר שֶׁלְּךָ')}</h1>
        <div class="creator">
          <div class="cr-preview"><div class="stage-keeper">${keeperSVG(S.equipped, { look: L })}<div class="pedestal"></div></div></div>
          <div class="cr-panel panel">
            <h3>${tx('דְּמוּת')}</h3><div class="cr-opts">${LOOK_OPTIONS.body.map(o => `<button class="cr-opt ${L.body === o.id ? 'on' : ''}" data-k="body" data-v="${o.id}">${keeperSVG({}, { look: { ...L, body: o.id }, viewBox: '20 0 80 110' })}<span>${tx(o.name)}</span></button>`).join('')}</div>
            <h3>${tx('תִּסְפֹּרֶת')}</h3><div class="cr-opts">${LOOK_OPTIONS.hair.map(o => `<button class="cr-opt small ${L.hair === o.id ? 'on' : ''}" data-k="hair" data-v="${o.id}">${keeperSVG({}, { look: { ...L, hair: o.id }, head: true })}</button>`).join('')}</div>
            <h3>${tx('צֶבַע שֵׂעָר')}</h3>${sw('hairColor', LOOK_OPTIONS.hairColor)}
            <h3>${tx('צֶבַע עוֹר')}</h3>${sw('skin', LOOK_OPTIONS.skin)}
            <h3>${tx('צֶבַע בֶּגֶד')}</h3>${sw('shirt', LOOK_OPTIONS.shirt)}
            <div class="cr-toggles"><button class="cr-tog ${L.glasses ? 'on' : ''}" data-t="glasses">👓 ${tx('מִשְׁקָפַיִם')}</button><button class="cr-tog ${L.freckles ? 'on' : ''}" data-t="freckles">✨ ${tx('נְמָשִׁים')}</button></div>
            <div class="row" style="justify-content:center"><button class="btn go" id="crDone">${tx('זֶה אֲנִי!')} ✔</button></div>
          </div></div>`;
      app.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { L = { ...L, [b.dataset.k]: b.dataset.v }; sound('page'); draw(); });
      app.querySelectorAll('.cr-tog').forEach(b => b.onclick = () => { L = { ...L, [b.dataset.t]: !L[b.dataset.t] }; sound('page'); draw(); });
      $('#crDone').onclick = () => { S.look = L; save(); refreshBar(); sound('win'); confetti(25); store.log('avatar', L); onDone && onDone(); };
    };
    draw();
  }

  /* ---------------- כרטיסים (פרסים בעולם האמיתי) ---------------- */
  async function showTickets() {
    closeOverlay(); screen = 'tickets';
    T.balance = await store.ticketBalance(); T.pending = await store.pendingRedemption(); refreshBar();
    ensureToday();
    let n = Math.max(1, Math.min(T.balance, 2));
    const draw = () => {
      app.innerHTML = `<h1 class="big-title" style="font-size:40px">${tx('הַכַּרְטִיסִים שֶׁלִּי')}</h1>
        <div class="panel tickets-panel">
          <div class="tk-big">🎟️ <b>${T.balance}</b></div>
          <div class="story" style="font-size:24px;text-align:center">${tx('כָּל כַּרְטִיס =')} ${minutesText(SET.ticketMinutes)} ${tx('צְפִיָּה')}<br>
            <span class="small">${tx('הַיּוֹם הִרְוַחְתָּ')} ${S.today.tickets} ${tx('מִתּוֹךְ')} ${SET.dailyTicketCap}</span></div>
          ${T.pending ? `<div class="hint" style="text-align:center">⏳ ${tx('בִּקַּשְׁתָּ')} ${ticketsText(T.pending.tickets)} (${minutesText(T.pending.minutes)}).<br>${tx('מְחַכִּים לְאִשּׁוּר שֶׁל')} ${helper()}.</div>
              <div class="row" style="justify-content:center"><button class="btn ghost" id="tkCancel">✖ ${tx('בַּטֵּל אֶת הַבַּקָּשָׁה')}</button><button class="btn go" id="tkBack">${tx('חֲזָרָה לַמַּפָּה')} ◀</button></div>`
          : T.balance > 0 ? `<div class="tk-pick"><button class="btn ghost" id="tkMinus">−</button><div class="tk-n"><b>${n}</b><small>${minutesText(n * SET.ticketMinutes)}</small></div><button class="btn ghost" id="tkPlus">+</button></div>
              <div class="row" style="justify-content:center"><button class="btn gold" id="tkAsk">🙋 ${tx('לְבַקֵּשׁ מֵ')}${helper()}</button></div>`
          : `<div class="hint" style="text-align:center">${tx('עוֹד אֵין כַּרְטִיסִים. כָּל דַּף שֶׁתַּצִּיל = כַּרְטִיס!')}</div>`}
          <div class="tk-rules">
            <div>📖 ${tx('דַּף חָדָשׁ שֶׁהִצַּלְתָּ')} <b>+1</b></div>
            <div>🎯 ${tx('מְשִׂימַת הַיּוֹם')} <b>+1</b></div>
            <div>🔥 ${tx('3 יָמִים בָּרֶצֶף')} <b>+1</b> · ${tx('7 יָמִים')} <b>+2</b></div>
            <div>🏋️ ${tx('אִימּוּן יוֹמִי: חֶשְׁבּוֹן + כְּתִיבָה + חִידָה')} <b>+1</b></div>
            <div>📜 ${tx('חִידָה מֵ')}${helper()} <b>🎟️</b></div>
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
    S.practice = { ...PR0, ...(S.practice || {}) };
    const P = S.practice;
    if (!P.level) P.level = START_LEVEL(+(child && child.grade) || 3);
    if (!P.day || P.day.date !== todayStr()) P.day = { date: todayStr(), math: 0, write: false, riddle: 0, seen: 0, bonus: false };
    return P;
  }
  const practiceDone = P => [P.day.math > 0, !!P.day.write, P.day.riddle > 0];
  const dayPrompt = () => { const d = new Date(), n = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000); return PROMPTS[n % PROMPTS.length]; };
  const minWordsPractice = P => Math.min(20, 10 + Math.floor(P.writes / 3));
  function practiceCardHTML() {
    const P = pr(), d = practiceDone(P);
    return `<button class="practice-card ${P.day.bonus ? 'done' : ''}" id="practiceBtn"><span class="pc-icon">🏋️</span>
      <span class="pc-txt"><b>${tx('חֲדַר הָאִימּוּנִים')}</b><small>${P.day.bonus ? tx('הָאִימּוּן הַיּוֹמִי הֻשְׁלַם!') + ' ✔' : tx('3 תַּחֲנוֹת') + ' → <span dir="ltr">+1 🎟️</span>'}</small></span>
      <span class="pc-checks">${STATIONS.map((e, i) => `<i class="${d[i] ? 'on' : ''}">${d[i] ? '✔' : e}</i>`).join('')}</span></button>`;
  }
  function bindPractice() { const b = $('#practiceBtn'); if (b) b.onclick = showPractice; }
  /** האימון היומי: חשבון + כתיבה + חידה = כרטיס בונוס */
  async function checkPracticeBonus() {
    const P = pr();
    if (P.day.bonus || !practiceDone(P).every(Boolean)) return false;
    P.day.bonus = true; save();
    const got = await awardTickets(1, 'אימון יומי בחדר האימונים');
    store.log('practice_daily', {});
    sound('magic'); confetti(50);
    await popup(`<div style="font-size:84px">🏅</div><h2 class="display" style="font-size:32px">${tx('הָאִימּוּן הַיּוֹמִי הֻשְׁלַם!')}</h2>
      <p class="story" style="font-size:24px">${tx('חֶשְׁבּוֹן, כְּתִיבָה וְחִידָה – כְּמוֹ שׁוֹמֵר זְמַן אֲמִתִּי.')}<br>
      ${got ? tx('קִבַּלְתָּ כַּרְטִיס בּוֹנוּס!') + ' 🎟️' : tx('הַכַּרְטִיסִים שֶׁל הַיּוֹם כְּבָר אָזְלוּ, אָז קִבַּלְתָּ 30 מַטְבְּעוֹת בּוֹנוּס!')}</p>`, tx('יֵשׁ!'));
    addCoins(got ? 15 : 30, $('#coinsPill'));
    return true;
  }
  function showPractice() {
    closeOverlay(); screen = 'practice'; keyHandler = null;
    const P = pr(), d = practiceDone(P), pm = dayPrompt(), left = RIDDLES.filter(r => !P.solved.includes(r.id)).length;
    const st = (id, cls, done, art, title, body, foot) => `<button class="station ${cls} ${done ? 'done' : ''}" id="${id}">
        <span class="st-art">${art}</span>${done ? '<span class="st-check">✔</span>' : ''}
        <span class="st-body"><b>${title}</b><span>${body}</span></span><span class="st-foot">${foot}</span></button>`;
    const riddleFoot = T.riddle ? `📜 ${tx('יֵשׁ חִידָה חֲדָשָׁה מֵ')}${helper()}!`
      : P.day.seen >= 3 ? `🌙 ${tx('חִידוֹת חֲדָשׁוֹת מָחָר')}` : !left ? `🏆 ${tx('פָּתַרְתָּ אֶת כֻּלָּן!')}` : `▶ ${tx('לְחִידָה הַבָּאָה')}`;
    app.innerHTML = `<div class="practice">
      <div class="pr-head"><div class="avatar">${guideAvatar()}</div>
        <div><h1 class="big-title">${tx('חֲדַר הָאִימּוּנִים')}</h1>
        <p>${tx('כָּל שׁוֹמֵר זְמַן מִתְאַמֵּן כָּל יוֹם. עֲבֹר בִּשְׁלוֹשׁ הַתַּחֲנוֹת – וְקַבֵּל כַּרְטִיס בּוֹנוּס!')}</p></div></div>
      <div class="pr-goal ${P.day.bonus ? 'done' : ''}">
        ${STATIONS.map((e, i) => `<span class="${d[i] ? 'on' : ''}">${d[i] ? '✔' : e}</span>`).join('<i></i>')}
        <b>${P.day.bonus ? tx('הֻשְׁלַם הַיּוֹם!') + ' 🎟️' : `${d.filter(Boolean).length}/3 → <span dir="ltr">+1 🎟️</span>`}</b></div>
      <div class="stations">
        ${st('stMath', 'st-math', d[0], '🧮', tx('זִירַת הַחֶשְׁבּוֹן'), tx('5 תַּרְגִּילִים. כְּכָל שֶׁתַּצְלִיחַ – הָרָמָה תַּעֲלֶה!'),
          `<span class="st-lv">${tx('רָמָה')} ${P.level} <em>${'★'.repeat(P.level)}${'☆'.repeat(5 - P.level)}</em></span>${d[0] ? tx('אֶפְשָׁר עוֹד סִבּוּב') : '▶ ' + tx('לְהַתְחִיל')}`)}
        ${st('stWrite', 'st-write', d[1], '✍️', tx('סַדְנַת הַכְּתִיבָה'), `${tx('הַנּוֹשֵׂא שֶׁל הַיּוֹם:')} <q>${tx(pm.q)}</q>`,
          d[1] ? `✉️ ${tx('נִשְׁלַח לְ')}${helper()} · ${tx('נוֹשֵׂא חָדָשׁ מָחָר')}` : `▶ ${tx('לִכְתֹּב לְ')}${helper()} (${minWordsPractice(P)} ${tx('מִלִּים')})`)}
        ${st('stRiddle', 'st-riddle', d[2], '🧩', tx('מְעָרַת הַחִידוֹת'), `${tx('פָּתַרְתָּ')} ${P.solved.length} ${tx('מִתּוֹךְ')} ${RIDDLES.length} ${tx('חִידוֹת')}`, riddleFoot)}
      </div></div>`;
    $('#stMath').onclick = playMath;
    $('#stWrite').onclick = () => {
      if (pr().day.write) { popup(`<div style="font-size:70px">✉️</div><p class="story" style="font-size:26px">${tx('כְּבָר כָּתַבְתָּ הַיּוֹם – כָּל הַכָּבוֹד!')}<br>${tx('מָחָר יְחַכֶּה לְךָ נוֹשֵׂא חָדָשׁ.')}</p>`, tx('בְּסֵדֶר')); return; }
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
    screen = 'practice-math';
    const draw = () => {
      const q = qs[i]; curQ = q; let tries = 0, val = '', busy = false;
      const shown = q.text ? `<div class="question">${tx(q.text)}</div><div class="numdisplay" id="tgt"></div>`
        : `<div class="eq" dir="ltr">${q.missing ? q.eq.replace('□', '<span class="box" id="tgt"></span>') : `${q.eq} = <span class="box" id="tgt"></span>`}</div>`;
      app.innerHTML = `<div class="progress">${qs.map((_, k) => `<span class="${k < i ? 'on' : ''}"></span>`).join('')}</div>
        <div class="panel math-panel">
          <div class="math-top"><span class="pill">🧮 ${tx('רָמָה')} ${lv}</span><span class="combo ${combo >= 2 ? 'hot' : ''}">${combo >= 2 ? '🔥 ' + tx('רֶצֶף') + ' ' + combo : ''}</span><span class="pill">${i + 1}/5</span></div>
          ${i === 0 ? tipHTML('pmath') : ''}${shown}
          <div class="numpad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => `<button data-n="${n}">${n}</button>`).join('')}</div>
          <div class="row"><button class="btn ghost" id="del">⌫</button><button class="btn go" id="ok">${tx('בְּדִיקָה')} ✔</button><div style="flex:1"></div><button class="btn ghost" id="mQuit">${tx('יְצִיאָה')}</button></div>
          <div class="feedback" id="fb"></div></div>`;
      const tgt = $('#tgt'), fb = $('#fb'), upd = () => { tgt.textContent = val || (q.text ? '' : '?'); };
      upd();
      const press = n => { if (!busy && val.length < 4) { val += n; upd(); } };
      app.querySelectorAll('.numpad button').forEach(b => b.onclick = () => press(b.dataset.n));
      $('#del').onclick = () => { val = val.slice(0, -1); upd(); };
      $('#mQuit').onclick = showPractice;
      const go = () => { i++; if (i < qs.length) draw(); else finish(); };
      $('#ok').onclick = () => {
        if (!val || busy) return;
        if (+val === q.answer) {
          busy = true; const first = tries === 0;
          if (first) { score++; combo++; } else combo = 0;
          sound('ok'); addCoins(extra ? 1 : first ? 4 + Math.min(combo, 4) : 2, tgt);
          tgt.classList.add('good'); fb.style.color = 'var(--ok)'; fb.textContent = tx(pick(PRAISE));
          setTimeout(go, 850);
        } else {
          tries++; combo = 0; sound('bad'); shake(tgt);
          if (tries >= 2) {
            busy = true; fb.style.color = 'var(--gold2)';
            fb.innerHTML = `${tx('הַתְּשׁוּבָה הַנְּכוֹנָה:')} <b dir="ltr">${q.answer}</b>. ${tx('לֹא נוֹרָא – מַמְשִׁיכִים!')}`;
            val = String(q.answer); upd(); tgt.classList.add('reveal');
            setTimeout(go, 2300);
          } else { fb.style.color = 'var(--gold2)'; fb.textContent = tx(pick(RETRY)); val = ''; upd(); }
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
      keyHandler = null;
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
        <div style="font-size:80px">${score === 5 ? '🏆' : score >= 3 ? '💪' : '🌱'}</div>
        <h2 class="display">${score === 5 ? tx('מֻשְׁלָם! 5 מִתּוֹךְ 5') : `${score} ${tx('מִתּוֹךְ')} 5 ${tx('בְּנִסָּיוֹן רִאשׁוֹן')}`}</h2>
        <div class="pr-dots">${Array.from({ length: 5 }, (_, k) => `<span class="${k < score ? 'on' : ''}">${k < score ? '⭐' : '☆'}</span>`).join('')}</div>
        ${change > 0 ? `<div class="lvup">⬆️ ${tx('עָלִיתָ לְרָמָה')} ${P.level}!</div>`
          : change < 0 ? `<div class="hint">${tx('נִתְאַמֵּן קְצָת בְּרָמָה')} ${P.level}, ${tx('וְאָז נַעֲלֶה שׁוּב.')} 💪</div>`
          : score === 4 && P.up === 1 ? `<div class="hint">${tx('עוֹד סִבּוּב כָּזֶה – וְעוֹלִים רָמָה!')} ⬆️</div>` : ''}
        ${extra ? `<div class="small">${tx('אַחֲרֵי 3 סִבּוּבִים בַּיּוֹם – מַטְבֵּעַ אֶחָד לְכָל תְּשׁוּבָה.')}</div>` : ''}
        <div class="row" style="justify-content:center"><button class="btn gold" id="again">🔁 ${tx('עוֹד סִבּוּב')}</button><button class="btn go" id="back">${tx('לְחַדַר הָאִימּוּנִים')} ◀</button></div></div>`;
      if (change > 0) sound('magic');
      $('#again').onclick = playMath; $('#back').onclick = showPractice;
      await checkPracticeBonus();
    };
    draw();
  }

  /* --- סדנת הכתיבה: נושא יומי, המכתב נשלח לאבא --- */
  function playWrite() {
    const P = pr(), pm = dayPrompt(), minW = minWordsPractice(P);
    screen = 'practice-write'; keyHandler = null;
    app.innerHTML = `<div class="panel">
      <div class="pr-title">✍️ ${tx('סַדְנַת הַכְּתִיבָה')}</div>${tipHTML('pwrite')}
      <div class="question">${tx(pm.q)}</div>
      <div class="chips" style="min-height:0;margin-bottom:12px">${pm.starters.map(w => `<button class="chip" data-w="${esc(tx(w))}">${tx(w)}</button>`).join('')}</div>
      <textarea id="ta" placeholder="${tx('כְּתֹב כָּאן...')}"></textarea>
      <div class="meter"><i id="mt"></i></div><div class="meter-label" id="ml"></div>
      <div class="row actions"><button class="btn ghost" id="wBack">${tx('חֲזָרָה')}</button><div style="flex:1"></div><button class="btn gold" id="ok" disabled>${tx('שְׁלַח לְ')}${helper()} ✉️</button></div>
      <div class="feedback" id="fb"></div></div>`;
    const ta = $('#ta'), cnt = () => ta.value.trim().split(/\s+/).filter(Boolean).length;
    const upd = () => {
      const n = cnt(); $('#mt').style.width = Math.min(100, n / minW * 100) + '%';
      $('#ml').textContent = n >= minW ? tx('✔ מְצֻיָּן! אֶפְשָׁר לִשְׁלֹחַ (וְגַם לְהוֹסִיף עוֹד)') : tx(minW - n === 1 ? 'עוֹד מִלָּה אַחַת' : `עוֹד ${minW - n} מִלִּים`);
      $('#ok').disabled = n < minW;
    };
    app.querySelectorAll('.chip').forEach(c => c.onclick = () => { ta.value = (ta.value.trim() + ' ' + c.dataset.w + ' ').trimStart(); ta.focus(); upd(); });
    ta.oninput = upd; upd();
    $('#wBack').onclick = showPractice;
    $('#ok').onclick = async () => {
      const n = cnt(); $('#ok').disabled = true;
      P.writes++; P.day.write = true; S.tasks++; S.firstTry++; save();
      store.sendLetter('practice', ta.value).catch(() => {});
      store.notify('letter', { text: ta.value.slice(0, 140), level: 'סדנת הכתיבה' });
      store.log('practice_write', { words: n });
      sound('win'); confetti(25); addCoins(20 + Math.min(15, n - minW), $('#ok'));
      await popup(`<div style="font-size:80px">✉️</div><h2 class="display" style="font-size:32px">${tx('הַמִּכְתָּב נִשְׁלַח!')}</h2>
        <p class="story" style="font-size:24px">${n} ${tx('מִלִּים – כָּל הַכָּבוֹד!')}<br>${helper()} ${tx('יִקְרָא וְיַעֲנֶה לְךָ.')}</p>`, tx('יֵשׁ!'));
      if (!(await checkPracticeBonus())) showPractice(); else showPractice();
    };
  }

  /* --- מערת החידות: קודם החידה של אבא, אחר כך מהמאגר. עד 3 ביום --- */
  function playPracticeRiddle() {
    if (T.riddle) { showRiddle(); return; }
    const P = pr();
    if (P.day.seen >= 3) { popup(`<div style="font-size:70px">🌙</div><p class="story" style="font-size:26px">${tx('3 חִידוֹת בְּיוֹם אֶחָד – מוֹחַ שֶׁל בַּלָּשׁ!')}<br>${tx('מָחָר יְחַכּוּ לְךָ חִידוֹת חֲדָשׁוֹת.')}</p>`, tx('בְּסֵדֶר')); return; }
    let r = RIDDLES.find(x => !P.solved.includes(x.id) && !P.skipped.includes(x.id));
    if (!r) { P.skipped = []; r = RIDDLES.find(x => !P.solved.includes(x.id)); }
    if (!r) { popup(`<div style="font-size:70px">🏆</div><p class="story" style="font-size:26px">${tx('פָּתַרְתָּ אֶת כָּל הַחִידוֹת בַּמְּעָרָה!')}<br>${tx('בַּקֵּשׁ מֵ')}${helper()} ${tx('חִידָה חֲדָשָׁה.')}</p>`, tx('יֵשׁ!')); return; }
    screen = 'practice-riddle'; keyHandler = null;
    let tries = 0, hinted = false;
    const num = P.solved.length + 1;
    app.innerHTML = `<div class="panel riddle-cave">
      <div class="cave-top"><span class="cave-art">🧩</span><div><div class="pr-title">${tx('מְעָרַת הַחִידוֹת')}</div><small>${tx('חִידָה מִסְפָּר')} ${num}</small></div></div>
      <div class="story riddle-q">${tx(r.q)}</div>
      <input type="text" id="rIn" autocomplete="off" placeholder="${tx('הַתְּשׁוּבָה שֶׁלִּי...')}">
      <div class="feedback" id="fb"></div>
      <div class="row"><button class="btn go" id="rOk">${tx('בְּדִיקָה')} ✔</button><button class="btn ghost" id="rHint">💡 ${tx('רֶמֶז')}</button>
        <button class="btn ghost hidden" id="rGive">🏳️ ${tx('גַּלֵּה לִי')}</button><div style="flex:1"></div><button class="btn ghost" id="rBack">${tx('חֲזָרָה')}</button></div></div>`;
    const fb = $('#fb');
    $('#rIn').focus();
    $('#rIn').onkeydown = e => { if (e.key === 'Enter') $('#rOk').click(); };
    $('#rBack').onclick = showPractice;
    $('#rHint').onclick = () => { hinted = true; $('#rHint').disabled = true; fb.insertAdjacentHTML('afterend', `<div class="hint">💡 ${tx(r.hint)}</div>`); };
    const after = (solved) => {
      P.day.seen++; save();
      const more = P.day.seen < 3 && RIDDLES.some(x => !P.solved.includes(x.id));
      const box = app.querySelector('.riddle-cave .row');
      box.innerHTML = `${more ? `<button class="btn gold" id="rNext">🧩 ${tx('עוֹד חִידָה')}</button>` : ''}<button class="btn go" id="rDone">${tx('לְחַדַר הָאִימּוּנִים')} ◀</button>`;
      if (more) $('#rNext').onclick = playPracticeRiddle;
      $('#rDone').onclick = showPractice;
      $('#rIn').disabled = true;
      if (solved) checkPracticeBonus();
    };
    $('#rOk').onclick = () => {
      const v = norm($('#rIn').value); if (!v) return;
      const ok = r.a.some(a => { const n = norm(a); return n && (v === n || (n.length >= 3 && v.includes(n))); });
      if (!ok) {
        tries++; sound('bad'); shake($('#rIn')); fb.style.color = 'var(--gold2)'; fb.textContent = tx(pick(RETRY));
        if (tries >= 2) $('#rGive').classList.remove('hidden');
        return;
      }
      sound('win'); confetti(30);
      P.solved.push(r.id); P.skipped = P.skipped.filter(x => x !== r.id); P.day.riddle++;
      addCoins(tries === 0 && !hinted ? 15 : 8, $('#rOk'));
      store.log('practice_riddle', { id: r.id, tries, hinted });
      fb.style.color = 'var(--ok)'; fb.innerHTML = `🧠 ${tx('נָכוֹן!')} ${tx('הַתְּשׁוּבָה:')} <b>${tx(r.show)}</b>`;
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
    const base = LEVELS[world][idx], steps = [...base.steps], al = ALUF[base.id];
    if (al) { const at = steps[steps.length - 1].t === 'read' ? steps.length - 1 : steps.length; steps.splice(at, 0, { t: 'aluf', ...al }); }
    const lvl = { ...base, steps };
    L = { world, idx, lvl, step:0, mistakes:0, lastRead:null, replay: S.done.includes(lvl.id), start: Date.now() };
    screen = 'level';
    renderStep();
  }
  const guideHTML = flat => `<div class="guide ${flat ? 'flat' : ''}"><div class="avatar">${guideAvatar()}</div><div class="guide-name">${tx(GUIDE.name)}</div></div>`;
  const progressHTML = () => `<div class="progress">${L.lvl.steps.map((_, i) => `<span class="${i < L.step ? 'on' : ''}"></span>`).join('')}</div>`;
  function tipHTML(type) {
    if (!TIPS[type] || (S.tips || {})[type]) return '';
    S.tips = { ...(S.tips || {}), [type]: true }; save();
    return `<div class="tip"><img src="/guide/yuval.jpg" alt=""><span>${tx(TIPS[type])}</span></div>`;
  }
  const frame = (inner, tipType) => { app.innerHTML = progressHTML() + `<div class="panel">${tipType ? tipHTML(tipType) : ''}${inner}</div>`; };
  function next() { L.step++; if (L.step >= L.lvl.steps.length) finishLevel(); else renderStep(); }
  const rereadBtn = () => L.lastRead ? `<button class="btn ghost" id="reread">📖 ${tx('לִקְרֹא שׁוּב')}</button>` : '';
  function bindReread() {
    const b = $('#reread'); if (!b) return;
    b.onclick = () => {
      overlay(`<div class="story" style="text-align:right">${L.lastRead.map(l => `<p>${tx(l)}</p>`).join('')}</div>
        <div class="row" style="justify-content:center"><button class="btn go" id="ovClose">${tx('הֵבַנְתִּי')}</button></div>`);
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
    if (left <= 0) return `<button class="btn ghost phone" id="phone" disabled>📞 ${tx('נִגְמְרוּ הַשִּׂיחוֹת לְהַיּוֹם')}</button>`;
    const price = cost ? `<small>${cost} 🪙</small>` : `<small class="free">${tx('חִנָּם')}</small>`;
    return `<button class="btn ghost phone" id="phone" ${cost > S.coins ? 'disabled' : ''}>📞 ${tx('טֵלֵפוֹן לְ')}${helper()} ${price}</button>`;
  }
  function bindLifeline(s) { const b = $('#phone'); if (b) b.onclick = () => askLifeline(s); }
  function askLifeline(s) {
    const cost = lifelineCost();
    if (!cost) return phoneFriend(s, 0);
    overlay(`<div style="font-size:60px">📞</div>
      <p class="story" style="font-size:26px">${tx('אֶת הַשִּׂיחָה הַחִנָּמִית כְּבָר הִשְׁתַּמַּשְׁתָּ.')}<br>${tx('שִׂיחָה נוֹסֶפֶת עוֹלָה')} ${cost} 🪙</p>
      <div class="row" style="justify-content:center"><button class="btn gold" id="llPay">${tx('לְהִתְקַשֵּׁר')} (${cost} 🪙)</button><button class="btn ghost" id="llNo">${tx('אֲנַסֶּה לְבַד')}</button></div>`);
    $('#llNo').onclick = closeOverlay;
    $('#llPay').onclick = () => phoneFriend(s, cost);
  }
  async function phoneFriend(s, cost) {
    ensureToday();
    if (S.today.lifelines >= SET.lifelinesPerDay || cost > S.coins) return;
    const correctText = s.t === 'choice' ? s.options[s.answer] : s.t === 'tf' ? (s.answer ? 'נכון' : 'לא נכון')
      : s.t === 'find' ? s.answer : s.t === 'order' ? s.words.join(' ') : s.t === 'number' ? String(s.answer) : '';
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
    overlay(`<div class="calling"><div class="phone-anim">📞</div>
      <h2 class="display" style="font-size:30px">${tx('מִתְקַשְּׁרִים לְ')}${helper()}...</h2>
      <p class="story" style="font-size:22px">${tx('שָׁלַחְנוּ לוֹ אֶת הַשְּׁאֵלָה. הוּא יַעֲנֶה עוֹד רֶגַע.')}</p>
      <div class="dots"><i></i><i></i><i></i></div></div>
      <div class="row" style="justify-content:center"><button class="btn ghost" id="llCancel">${tx('בִּטּוּל')}</button></div>`);
    $('#llCancel').onclick = () => { finish(); store.closeLifeline(id, 'cancelled'); refund(); closeOverlay(); renderStep(); };
    unsub = store.watchLifeline(id, row => {
      if (done || row.status !== 'answered') return;
      finish(); sound('ok');
      const ans = SET.nikud ? (row.answer_nikud || row.answer) : plain(row.answer_nikud || row.answer);
      overlay(`<div class="letter"><div class="letter-head">💬 ${helper()} ${tx('אוֹמֵר:')}</div>
        <div class="story letter-body">${esc(ans)}</div></div>
        <div class="row" style="justify-content:center"><button class="btn go" id="llOk">${tx('תּוֹדָה!')} ◀</button></div>`);
      $('#llOk').onclick = () => { closeOverlay(); renderStep(); };
    });
    to = setTimeout(() => {
      if (done) return;
      finish(); store.closeLifeline(id, 'expired'); refund();
      overlay(`<div style="font-size:60px">⏰</div><p class="story" style="font-size:24px">${helper()} ${tx('עָסוּק כָּרֶגַע, אָז הַשִּׂיחָה לֹא נֶחְשֶׁבֶת.')}<br>${tx('הִנֵּה רֶמֶז מִיּוּבַל:')}</p>
        <div class="hint">💡 ${tx(s.hint || 'תִּקְרָא שׁוּב לְאַט, מִלָּה אַחֲרֵי מִלָּה.')}</div>
        <div class="row" style="justify-content:center"><button class="btn go" id="llOk">${tx('הֵבַנְתִּי')}</button></div>`);
      $('#llOk').onclick = () => { closeOverlay(); renderStep(); };
    }, SET.lifelineTimeoutSec * 1000);
    timers.push(to);
  }

  function correct(el, base = 10) {
    sound('ok'); S.tasks++; const first = L.tries === 0; if (first) S.firstTry++;
    addCoins(earn(first ? base : Math.ceil(base / 2)), el);
    const fb = $('#fb'); if (fb) { fb.style.color = 'var(--ok)'; fb.textContent = tx(pick(PRAISE)); }
    setTimeout(next, 900);
  }
  function wrong(el, hint) {
    sound('bad'); L.tries++; L.mistakes++; shake(el);
    const fb = $('#fb'); if (fb) { fb.style.color = 'var(--gold2)'; fb.textContent = tx(pick(RETRY)); }
    if (hint && L.tries >= 2 && !$('#hintbox') && fb) fb.insertAdjacentHTML('afterend', `<div class="hint" id="hintbox">💡 ${tx(hint)}</div>`);
  }

  function renderStep() {
    const s = L.lvl.steps[L.step]; L.tries = 0; touchSession();
    if (s.t === 'read') {
      L.lastRead = s.lines;
      const sc = scene(s.scene || L.lvl.scene, { cabin: L.lvl.cabin, ...s });
      frame(`<div class="scene">${sc}${s.pic ? `<div class="sticker">${s.pic}</div>` : ''}</div>
        ${guideHTML()}<div class="story">${s.lines.map((l, i) => `<p style="animation-delay:${i * 0.6}s">${tx(l)}</p>`).join('')}</div>${tipHTML('read')}
        <div class="row actions"><div style="flex:1"></div><button class="btn go" id="nx">${tx('הַמְשֵׁךְ')} ◀</button></div>`);
            const nx = $('#nx'); nx.disabled = true; setTimeout(() => { if (nx) nx.disabled = false; }, 600 * s.lines.length + 300);
      nx.onclick = () => { sound('page'); addCoins(L.replay ? 0 : 2, nx); next(); };
    }
    else if (s.t === 'aluf') renderAluf(s);
    else if (s.t === 'choice' || s.t === 'tf') {
      const isTF = s.t === 'tf';
      const options = isTF ? ['✔ נָכוֹן', '✘ לֹא נָכוֹן'] : s.options;
      const answer = isTF ? (s.answer ? 0 : 1) : s.answer;
      const order = isTF ? [0, 1] : options.map((_, i) => i).sort(() => Math.random() - .5);
      const qHTML = (isTF ? `<div class="small" style="font-size:22px">${tx('נָכוֹן אוֹ לֹא נָכוֹן?')}</div>${tx(s.q)}` : tx(s.q))
        + (s.mirror ? `<div class="mirror-card"><span class="mirror">${tx(s.mirror)}</span><small>🪞 ${tx('כְּתַב הַמַּרְאָה שֶׁל לֵאוֹנַרְדוֹ')}</small></div>` : '');
      frame(`<div class="question">${qHTML}</div>
        <div class="options ${isTF ? 'tf' : ''}">${order.map(i => `<button class="opt" data-i="${i}">${tx(options[i])}</button>`).join('')}</div>
        <div class="feedback" id="fb"></div><div class="row">${rereadBtn()}${lifelineBtn()}</div>`, s.t);
      bindReread(); bindLifeline(s);
      app.querySelectorAll('.opt').forEach(b => b.onclick = () => {
        if (+b.dataset.i === answer) { b.classList.add('right'); app.querySelectorAll('.opt').forEach(x => x.disabled = true); correct(b); }
        else { b.classList.add('wrong'); b.disabled = true; wrong(b, s.hint); }
      });
    }
    else if (s.t === 'find') {
      const words = s.text.split(/\s+/);
      frame(`<div class="question">${tx(s.q)}</div>
        <div class="words">${words.map((w, i) => `<span class="w" data-i="${i}">${tx(w)}</span>`).join(' ')}</div>
        <div class="feedback" id="fb"></div><div class="row">${lifelineBtn()}</div>`, 'find');
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
          <div class="feedback" id="fb"></div><div class="row">${lifelineBtn()}</div>`, 'order');
        bindLifeline(s);
        $('#pool').querySelectorAll('.chip').forEach(c => c.onclick = () => { built.push(pool.splice(+c.dataset.k, 1)[0]); check(); });
        $('#built').querySelectorAll('.chip').forEach(c => c.onclick = () => { pool.push(built.splice(+c.dataset.k, 1)[0]); draw(); });
      };
      const check = () => {
        draw();
        if (pool.length === 0) {
          if (built.every((v, i) => v === i)) correct($('#built'));
          else {
            wrong($('#built'), s.hint);
            setTimeout(() => { pool = built.concat(pool); built = []; const fb = $('#fb')?.textContent, h = $('#hintbox')?.outerHTML; draw(); $('#fb').textContent = fb || ''; if (h) $('#fb').insertAdjacentHTML('afterend', h); }, 900);
          }
        }
      };
      draw();
    }
    else if (s.t === 'number') {
      let val = '';
      frame(`<div class="question">${tx(s.q)}</div>
        <div class="numdisplay" id="nd"></div>
        <div class="numpad">${[1,2,3,4,5,6,7,8,9,0].map(n => `<button data-n="${n}">${n}</button>`).join('')}</div>
        <div class="row"><button class="btn ghost" id="del">⌫</button><button class="btn go" id="ok">${tx('בְּדִיקָה')} ✔</button>${lifelineBtn()}</div>
        <div class="feedback" id="fb"></div>`, 'number');
      bindLifeline(s);
      const nd = $('#nd'), upd = () => nd.textContent = val;
      app.querySelectorAll('.numpad button').forEach(b => b.onclick = () => { if (val.length < 4) { val += b.dataset.n; upd(); } });
      $('#del').onclick = () => { val = val.slice(0, -1); upd(); };
      $('#ok').onclick = () => { if (!val) return; if (+val === s.answer) correct(nd); else { wrong(nd, s.hint); val = ''; upd(); } };
      keyHandler = e => {
        if (screen !== 'level' || L.lvl.steps[L.step] !== s || overlayOpen()) return;
        if (/^\d$/.test(e.key) && val.length < 4) { val += e.key; upd(); }
        if (e.key === 'Backspace') { val = val.slice(0, -1); upd(); }
        if (e.key === 'Enter') $('#ok')?.click();
      };
    }
    else if (s.t === 'avatar') { showCreator(() => { screen = 'level'; next(); }); }
    else if (s.t === 'name') {
      frame(`${guideHTML(true)}<div class="question">${tx(s.q)}</div>
        <input type="text" id="nm" maxlength="20" value="" autocomplete="off" placeholder="${tx('הַשֵּׁם שֶׁלִּי...')}">
        <div class="row"><button class="btn go" id="ok">${tx('זֶה אֲנִי!')} ◀</button></div><div class="feedback" id="fb"></div>`);
            $('#nm').focus();
      $('#ok').onclick = () => { const v = $('#nm').value.trim(); if (v.length < 2) { wrong($('#nm')); return; } S.name = v; save(); refreshBar(); correct($('#ok'), 10); };
    }
    else if (s.t === 'write') {
      frame(`<div class="question">${tx(s.q)}</div>
        <div class="chips" style="min-height:0;margin-bottom:12px">${s.starters.map(w => `<button class="chip" data-w="${esc(tx(w))}">${tx(w)}</button>`).join('')}</div>
        <textarea id="ta" placeholder="${tx('כְּתֹב כָּאן...')}"></textarea>
        <div class="meter"><i id="mt"></i></div><div class="meter-label" id="ml"></div>
        <div class="row"><button class="btn gold" id="ok" disabled>${tx('שְׁלַח אֶת הַמִּכְתָּב')} ✉️</button>${rereadBtn()}${lifelineBtn()}</div>
        <div class="feedback" id="fb"></div>`, 'write');
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
        const bonus = 15 + Math.min(15, n - s.minWords) + hits * 3;
        S.tasks++; S.firstTry++; save();
        store.sendLetter(L.lvl.id, ta.value).catch(() => {});
        store.notify('letter', { text: ta.value.slice(0, 140), level: plain(L.lvl.title) });
        sound('win'); addCoins(earn(bonus), $('#ok'));
        $('#fb').style.color = 'var(--ok)';
        $('#fb').textContent = hits >= 2 ? tx('😮 מִכְתָּב שֶׁל בַּלָּשׁ אֲמִתִּי! הִסְבַּרְתָּ בְּדִיּוּק מָה גִּלִּיתָ.') : tx('✉️ מִכְתָּב נֶהְדָּר! הוּא נִשְׁלַח.');
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
    sound('win'); confetti();
    const c = CARDS[L.lvl.card];
    overlay(`<div class="restored">${scene(L.lvl.scene, {})}</div>
      <h2 class="display" style="font-size:36px;margin:8px 0 0">${tx('הַדַּף נִצַּל!')}</h2>
      <div class="stars-big">${[0,1,2].map(i => `<span style="animation-delay:${.3 + i * .25}s">${i < stars ? '⭐' : '☆'}</span>`).join('')}</div>
      <div id="tkLines"></div>
      ${newCard ? `<div class="ccard wincard"><div class="e">${c.e}</div><div><b>${tx(c.name)}</b><small>${tx(c.fact)}</small></div></div><div class="small">${tx('קְלָף חָדָשׁ לָאֹסֶף!')}</div>` : ''}
      ${L.replay ? `<div class="small">${tx('שָׁלָב חוֹזֵר: פָּחוֹת מַטְבְּעוֹת, אֲבָל אֶפְשָׁר לְשַׁפֵּר כּוֹכָבִים')} ⭐</div>` : ''}
      <p style="font-size:22px;margin:10px 0 4px">${tx('גַּע בַּתֵּבָה!')}</p>
      <button class="chest" id="chest">${CHEST_CLOSED}</button>`);
    // כרטיסים
    const lines = [];
    if (firstTime) {
      const g = await awardTickets(1, 'דף: ' + plain(L.lvl.title));
      if (g) lines.push(`🎟️ +1 ${tx('כַּרְטִיס')} (${minutesText(SET.ticketMinutes)})`);
      if (!S.today.goalDone && S.today.pages >= SET.dailyGoal) {
        S.today.goalDone = true; save();
        const b = await awardTickets(1, 'משימת היום');
        lines.push(`🎯 ${tx('מְשִׂימַת הַיּוֹם הֻשְׁלְמָה!')}${b ? ' +1 🎟️' : ''}`);
        store.notify('goal', { pages: S.today.pages });
        store.log('daily_goal', { pages: S.today.pages });
      }
      if (streakNow === 3 || (streakNow && streakNow % 7 === 0)) {
        const k = streakNow === 3 ? 1 : 2, b = await awardTickets(k, `רצף ${streakNow} ימים`);
        if (b) lines.push(`🔥 ${streakNow} ${tx('יָמִים בָּרֶצֶף!')} +${b} 🎟️`);
      }
      if (!g && S.today.tickets >= SET.dailyTicketCap) lines.push(`<span class="small">${tx('הִגַּעְתָּ לַמַּקְסִימוּם שֶׁל הַיּוֹם – מָחָר יֵשׁ עוֹד!')} 🎟️</span>`);
    }
    const tk = $('#tkLines'); if (tk && lines.length) tk.innerHTML = `<div class="tk-lines">${lines.map(l => `<div>${l}</div>`).join('')}</div>`;
    $('#chest').onclick = () => {
      const prize = earn(pick([10, 15, 20, 25, 30, 50]));
      addCoins(prize, $('#chest')); confetti(20);
      $('#chest').outerHTML = `<div style="width:120px;margin:0 auto">${CHEST_OPEN}</div><div style="font-size:40px;font-weight:800;color:var(--gold2)">+${prize} 🪙</div>`;
      $('#overlayBody').insertAdjacentHTML('beforeend', `<p class="story" style="font-size:24px">${tx(L.lvl.end || '')}</p>
        <div class="row" style="justify-content:center"><button class="btn go" id="cont">${tx('הַמְשֵׁךְ')} ◀</button></div>`);
      $('#cont').scrollIntoView({ behavior:'smooth', block:'end' });
      $('#cont').onclick = () => {
        const next = nextNewLevel(L.world);
        if (next && isSleeping(next)) { showSleep(L.world, true); return; }
        const mins = (Date.now() - sessionStart) / 60000;
        if (mins >= SET.sessionMin) showBreak(); else showMap(L.world);
      };
    };
  }

  function showBreak() {
    overlay(`<div style="font-size:80px">🌙</div><h2 class="display" style="font-size:30px">${tx('שׁוֹמֵר זְמַן טוֹב יוֹדֵעַ גַּם לָנוּחַ!')}</h2>
      <p class="story" style="font-size:24px">${tx('עָבַדְתָּ הַיּוֹם מְצֻיָּן. הַסֵּפֶר מְחַכֶּה לְךָ מָחָר – וְהָרֶצֶף שֶׁלְּךָ מַמְשִׁיךְ! 🔥')}</p>
      <div class="row" style="justify-content:center"><button class="btn go" id="bye">${tx('לְהִתְרָאוֹת!')} 👋</button><button class="btn ghost" id="more">${tx('עוֹד שָׁלָב אֶחָד')}</button></div>`);
    $('#bye').onclick = () => { closeOverlay(); showWorlds(); };
    $('#more').onclick = () => showMap(L.world);
  }

  /* ---------------- 🏆 שאלת אלוף ---------------- */
  function renderAluf(s) {
    const order = s.options.map((_, i) => i).sort(() => Math.random() - .5);
    frame(`<div class="aluf-head">🏆 ${tx('שְׁאֵלַת אַלּוּף')} <small>${tx('נִסָּיוֹן אֶחָד · +25 🪙')}</small></div>
      <div class="question">${tx(s.q)}</div>
      <div class="options">${order.map(i => `<button class="opt" data-i="${i}">${tx(s.options[i])}</button>`).join('')}</div>
      <div class="feedback" id="fb"></div>`, 'aluf');
    app.querySelectorAll('.opt').forEach(b => b.onclick = () => {
      app.querySelectorAll('.opt').forEach(x => x.disabled = true);
      const ok = +b.dataset.i === s.answer;
      const right = app.querySelector(`.opt[data-i="${s.answer}"]`); right.classList.add('right');
      S.tasks++;
      if (ok) {
        S.firstTry++; S.aluf = { ...(S.aluf || {}), [L.lvl.id]: true }; save();
        sound('win'); confetti(30); addCoins(earn(25), b);
        $('#fb').style.color = 'var(--ok)'; $('#fb').textContent = tx('🏆 אַלּוּף אֲמִתִּי! זָכַרְתָּ אֶת כָּל הַדַּף!');
      } else {
        b.classList.add('wrong'); sound('bad'); save();
        $('#fb').style.color = 'var(--gold2)'; $('#fb').innerHTML = tx('לֹא נוֹרָא! הַתְּשׁוּבָה הַנְּכוֹנָה מְסֻמֶּנֶת בְּיָרֹק. בַּפַּעַם הַבָּאָה! 💪');
      }
      store.log('aluf', { level: L.lvl.id, ok });
      $('#fb').insertAdjacentHTML('afterend', `<div class="row" style="justify-content:center"><button class="btn go" id="alNext">${tx('הַמְשֵׁךְ')} ◀</button></div>`);
      $('#alNext').onclick = next;
    });
  }

  /* ---------------- אימון שומרי הזמן: הסבר על המשחק לילד ---------------- */
  let tour = null;
  function maybeTutorial() {
    if (!S.done.includes('p1') || overlayOpen() || tour) return;
    if (!S.look) { showCreator(() => showMap('history')); return; }
    if (S.tutorialDone) return;
    if (screen !== 'map') { showMap('history'); return; }
    setTimeout(() => startTutorial(true), 500);
  }
  function tourSteps(first) {
    const h = helper();
    const steps = [
      { sel: null, icon: '🎓', title: 'אִימּוּן שׁוֹמְרֵי הַזְּמַן', text: first ? '{name}, לִפְנֵי שֶׁיּוֹצְאִים לַדֶּרֶךְ – אֲנִי אַרְאֶה לְךָ אֵיךְ הַכֹּל עוֹבֵד. זֶה קָצָר, מַבְטִיחַ!' : 'בּוֹא נִזָּכֵר אֵיךְ הַכֹּל עוֹבֵד.' },
      { sel: '.wmap', text: 'זֹאת מַפַּת הָעוֹלָם שֶׁל סֵפֶר הַזְּמַן. כָּל סִכָּה הִיא פֶּרֶק – בַּמָּקוֹם הָאֲמִתִּי שֶׁבּוֹ הוּא קָרָה! גַּע בְּסִכָּה כְּדֵי לִרְאוֹת אֶת הַדַּפִּים שֶׁלָּהּ.' },
      { sel: '.next-cta', text: 'וְזֶה הַכַּפְתּוֹר הֲכִי חָשׁוּב: הוּא תָּמִיד לוֹקֵחַ אוֹתְךָ לַדַּף הַבָּא שֶׁצָּרִיךְ לְהַצִּיל.' },
      { sel: '#coinsPill', text: 'אֵלֶּה הַמַּטְבְּעוֹת שֶׁלְּךָ. מְקַבְּלִים אוֹתָם עַל קְרִיאָה וְעַל כָּל תְּשׁוּבָה נְכוֹנָה.' },
      { sel: '#me', text: 'בַּמַּטְבְּעוֹת קוֹנִים צִיּוּד לַשּׁוֹמֵר שֶׁלְּךָ: גְּלִימוֹת, כּוֹבָעִים, פָּנָס וְעוֹד. גַּע כָּאן כְּדֵי לְהִתְלַבֵּשׁ.' },
      { sel: '#ticketsBtn', text: `וְזֶה הַחֵלֶק הֲכִי טוֹב: כָּל דַּף חָדָשׁ שֶׁתַּצִּיל = כַּרְטִיס. כָּל כַּרְטִיס = ${SET.ticketMinutes === 1 ? 'דַּקָּה אַחַת' : SET.ticketMinutes + ' דַּקּוֹת'} צְפִיָּה! גַּע כָּאן כְּדֵי לְבַקֵּשׁ מֵ${SET.helperName || 'אַבָּא'}.` },
      { sel: '.daily', text: `כָּל יוֹם נִפְתָּחִים ${SET.pagesPerDay} דַּפִּים חֲדָשִׁים. הִצַּלְתָּ אוֹתָם? מְשִׂימַת הַיּוֹם הֻשְׁלְמָה – וְעוֹד כַּרְטִיס בּוֹנוּס!` },
      { sel: '#practiceBtn', text: 'וְזֶה חֲדַר הָאִימּוּנִים: חֶשְׁבּוֹן, כְּתִיבָה וְחִידוֹת. עָבַרְתָּ בִּשְׁלוֹשׁ הַתַּחֲנוֹת? עוֹד כַּרְטִיס!' },
      { sel: '#streakPill', text: 'זֶה הָרֶצֶף שֶׁלְּךָ. בָּאתָ כָּל יוֹם? הָרֶצֶף גָּדֵל. 3 יָמִים בָּרֶצֶף = עוֹד כַּרְטִיס!' },
      { sel: '#cardsBtn', text: 'עַל כָּל פֶּרֶק מְקַבְּלִים קְלָף לָאֹסֶף. תַּצְלִיחַ לֶאֱסֹף אֶת כֻּלָּם?' },
      { sel: null, icon: '🛟', title: 'נִתְקַעְתָּ? יֵשׁ עֶזְרָה!', html: `<div class="coach-help">
          <div><b>📖 ${tx('לִקְרֹא שׁוּב')}</b><span>${tx('חוֹזְרִים לַסִּפּוּר, וּמְחַפְּשִׂים אֶת הַתְּשׁוּבָה.')}</span></div>
          <div><b>💡 ${tx('רֶמֶז')}</b><span>${tx('מוֹפִיעַ אַחֲרֵי שְׁתֵּי טָעֻיּוֹת.')}</span></div>
          <div><b>📞 ${tx('טֵלֵפוֹן לְ')}${h}</b><span>${h} ${tx('שׁוֹלֵחַ לְךָ רֶמֶז. פַּעַם אַחַת בְּכָל כְּנִיסָה – בְּחִנָּם!')}</span></div>
          <div><b>🏆 ${tx('שְׁאֵלַת אַלּוּף')}</b><span>${tx('בְּסוֹף כָּל דַּף. נִסָּיוֹן אֶחָד – וּפְרָס גָּדוֹל.')}</span></div>
        </div><p class="coach-text">${tx('וְאִם טוֹעִים? זֶה בְּסֵדֶר גָּמוּר. כָּאן אֵין כִּשָּׁלוֹן – רַק עוֹד נִסָּיוֹן.')} 💪</p>` },
    ];
    if (first) steps.push({ sel: null, icon: '🎁', title: 'סִיַּמְתָּ אֶת הָאִימּוּן!', text: 'מַתְּנַת פְּתִיחָה מִמֶּנִּי: 100 מַטְבְּעוֹת! בּוֹא נִקְנֶה אֶת הַצִּיּוּד הָרִאשׁוֹן שֶׁלְּךָ.', gift: true });
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
    if (el && !el.closest('#topbar')) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); await new Promise(r => setTimeout(r, 450)); }
    const body = st.html || `<p class="coach-text">${st.raw ? tx(st.text) : tx(st.text)}</p>`;
    card.innerHTML = `${st.icon ? `<div class="coach-icon">${st.icon}</div>` : ''}${st.title ? `<h3 class="display">${tx(st.title)}</h3>` : ''}
      <div class="coach-who"><img src="/guide/yuval.jpg" alt=""><b>${tx(GUIDE.name)}</b></div>${body}
      <div class="coach-foot"><div class="coach-dots">${t.steps.map((_, i) => `<i class="${i === t.i ? 'on' : ''}"></i>`).join('')}</div>
      ${st.gift ? `<button class="btn gold" id="coachGift">🛍️ ${tx('לַחֲנוּת!')}</button>` : `<button class="btn go" id="coachNext">${last ? tx('יוֹצְאִים לַדֶּרֶךְ!') : tx('הֵבַנְתִּי')} ◀</button>`}</div>`;
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
    const gb = $('#coachGift');
    if (gb) gb.onclick = () => { endTour(); addCoins(100, $('#coinsPill')); sound('magic'); showShop(); };
  }

  /* ---------------- כריכה: הפעם הראשונה ---------------- */
  function showCover() {
    screen = 'cover';
    app.innerHTML = `<div class="cover-wrap">
      <div class="cover-msg">${tx('יֵשׁ כָּאן סֵפֶר מְיֻחָד מְאוֹד...')}<br><span>${tx('הוּא חִכָּה רַק לְךָ.')}</span></div>
      <div class="book3d" id="book">
        <div class="book-pages"></div>
        <div class="book-cover"><div class="bc-frame">${LOGO}<div class="bc-title">${tx('סֵפֶר הַזְּמַן')}</div><div class="bc-sub">${tx('שׁוֹמְרֵי הַזְּמַן')}</div></div></div>
        <div class="book-glow"></div>
      </div>
      <button class="btn gold big-cta" id="openBook">✨ ${tx('פְּתַח אֶת הַסֵּפֶר')}</button>
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
  $('#homeBtn').onclick = showWorlds;
  $('#cardsBtn').onclick = showCards;
  $('#me').onclick = showShop;
  $('#ticketsBtn').onclick = showTickets;
  $('#exitBtn').onclick = askExit;
  $('#helpBtn').onclick = () => { if (screen !== 'map') showMap(mapWorld); setTimeout(() => startTutorial(false), 300); };
  $('#overlay').onclick = e => { if (e.target.id === 'overlay' && !$('#chest') && !$('#cont') && !$('#ppOk') && !$('#llCancel') && !$('#llOk')) closeOverlay(); };
  let rz; const onResize = () => { clearTimeout(rz); rz = setTimeout(() => { if (screen === 'map' && !tour) showMap(mapWorld); if (tour) drawTour(); }, 250); };
  window.addEventListener('resize', onResize);
  const onHide = () => store.flush?.();
  window.addEventListener('pagehide', onHide);

  if (typeof window !== 'undefined') window.__guideSVG = guideSVG;
  // גישה לבדיקות אוטומטיות
  if (typeof window !== 'undefined') window.__kg = { state: () => S, level: () => L, playLevel, startTutorial, tour: () => tour, renderStep: () => renderStep(), showWorlds, showMap, showShop, showTickets, showPractice, playMath: () => playMath(), mathAnswer: () => curQ && curQ.answer, showCreator: () => showCreator(() => showShop()), addCoins: n => addCoins(n) };

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
      store.flush?.();
    },
  };
}
