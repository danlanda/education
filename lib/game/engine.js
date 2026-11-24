/* מנוע המשחק "שומרי הזמן".
   מקבל store – שכבת שמירה (Supabase או מצב הדגמה) – ומצייר את המשחק בתוך root. */
import { GUIDE, CARDS, WORLDS, LEVELS, RANKS, PRAISE, RETRY, SHOP, DEFAULT_SETTINGS } from './content.js';
import { scene, guideSVG, guideAvatar, GUIDE_CREDIT, LOGO, worldArt, CHEST_CLOSED, CHEST_OPEN, keeperSVG } from './art.js';

const NIKUD = /[֑-ׇֽֿׁׂׅׄ]/g;
export const plain = s => String(s ?? '').replace(NIKUD, '');
const norm = s => plain(s).replace(/[^א-ת0-9a-zA-Z]/g, '');
const pick = a => a[Math.floor(Math.random() * a.length)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
const todayStr = () => new Date().toDateString();

const BASE_STATE = {
  name:'', coins:0, stars:{}, cards:[], done:[], streak:{ last:null, count:0 }, minutes:0, firstTry:0, tasks:0,
  owned:[], equipped:{}, today:{ date:null, pages:0, tickets:0, goalDone:false, lifelines:0 },
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
    $('#me').innerHTML = keeperSVG(S.equipped, { head:true });
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
      <div class="pill" title="מַטְבְּעוֹת">🪙 <span id="coins">0</span></div>
      <button class="pill pill-btn" id="ticketsBtn" title="כַּרְטִיסִים">🎟️ <span id="tickets">0</span></button>
      <div class="pill" title="יָמִים בָּרֶצֶף">🔥 <span id="streak">0</span></div>
      <div id="rank"></div>
      <div class="spacer"></div>
      <button class="iconbtn me" id="me" title="הַשּׁוֹמֵר שֶׁלִּי"></button>
      <button class="iconbtn" id="cardsBtn" title="הָאֹסֶף שֶׁלִּי">🃏</button>
      <button class="iconbtn" id="exitBtn" title="אֵזוֹר הוֹרִים">⚙️</button>
    </div>
    <main id="app"><div class="loading">⏳</div></main>
    <div id="overlay" class="hidden"><div class="panel" id="overlayBody"></div></div>
  </div>`;
  const app = $('#app');

  /* ---------------- תיבת דואר: אישורים ומכתבים מאבא ---------------- */
  let inboxBusy = false;
  async function checkInbox() {
    if (inboxBusy || overlayOpen()) return;
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
        <button class="btn gold" id="slShop">🛍️ ${tx('לְהִתְלַבֵּשׁ')}</button>
        ${T.riddle ? `<button class="btn" id="slRiddle">📜 ${tx('לִפְתֹּר חִידָה')}</button>` : ''}
        <button class="btn ghost" id="slMap">⭐ ${tx('לְשַׁפֵּר כּוֹכָבִים')}</button>
      </div></div>`;
    $('#slShop').onclick = showShop;
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
        <span>${left <= 0 ? '🌙 ' + tx('הַדַּף הַבָּא נִפְתָּח מָחָר') : S.today.goalDone ? tx('הֻשְׁלְמָה! כָּל הַכָּבוֹד') + ' 🎯' : tx(`לְהַצִּיל ${g} דַּפִּים`) + ' → +1 🎟️'}</span></div>
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
      addCoins(r.reward_coins || 20, $('#rdOk'));
      if (r.reward_tickets) await awardTickets(r.reward_tickets, 'חידה נפתרה', true);
      store.notify('riddle', { answer: $('#rdIn').value });
      store.log('riddle_solved', { id: r.id, tries });
      T.riddle = await store.activeRiddle();
      overlay(`<div style="font-size:80px">🧠</div><h2 class="display" style="font-size:32px">${tx('פָּתַרְתָּ אֶת הַחִידָה!')}</h2>
        <p class="story" style="font-size:24px">${helper()} ${tx('יְקַבֵּל הוֹדָעָה שֶׁפָּתַרְתָּ.')}</p>
        <div class="row" style="justify-content:center"><button class="btn go" id="rdDone">${tx('יֵשׁ!')}</button></div>`);
      $('#rdDone').onclick = () => { closeOverlay(); rerender(); };
    };
  }

  /* ---------------- מסכים ---------------- */
  function rerender() {
    if (screen === 'level' && L) renderStep(); else if (screen === 'map' || screen === 'sleep') showMap(mapWorld);
    else if (screen === 'cards') showCards(); else if (screen === 'shop') showShop(); else if (screen === 'tickets') showTickets(); else showWorlds();
  }

  function showWorlds() {
    closeOverlay(); screen = 'worlds';
    app.innerHTML = `<div class="logo">${LOGO}<h1 class="big-title">${tx('שׁוֹמְרֵי הַזְּמַן')}</h1></div>
      ${dailyHTML()}${riddleHTML()}
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
    bindRiddle(); refreshBar(); checkInbox();
  }

  function showMap(world) {
    closeOverlay(); screen = 'map'; mapWorld = world;
    const lv = LEVELS[world];
    const firstOpen = lv.findIndex(l => !l.locked && !S.done.includes(l.id));
    const W = Math.min(app.clientWidth - 32, 640), amp = Math.min(150, W * 0.27), stepY = 215, top = 90;
    const pts = lv.map((l, i) => ({ x: W / 2 + Math.sin(i * 1.2) * amp, y: top + i * stepY }));
    const H = top + (lv.length - 1) * stepY + 150;
    let trail = '';
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], d = `M${a.x} ${a.y}C${a.x} ${a.y + stepY / 2} ${b.x} ${b.y - stepY / 2} ${b.x} ${b.y}`;
      trail += S.done.includes(lv[i].id)
        ? `<path d="${d}" stroke="#f0c35a" stroke-width="8" fill="none" stroke-linecap="round" opacity=".95"/>`
        : `<path d="${d}" stroke="#ffffff" stroke-width="5" fill="none" stroke-dasharray="2 14" stroke-linecap="round" opacity=".45"/>`;
    }
    app.innerHTML = `<h1 class="big-title" style="font-size:40px">${tx(WORLDS.find(w => w.id === world).title)}</h1>
      ${dailyHTML()}${riddleHTML()}
      <div class="mapwrap" style="width:${W}px;height:${H}px">
        <svg class="trail" width="${W}" height="${H}">${trail}</svg>
        ${lv.map((l, i) => {
          const done = S.done.includes(l.id), avail = !l.locked && (done || i <= firstOpen || firstOpen === -1), st = S.stars[l.id] || 0;
          const sleeping = i === firstOpen && isSleeping(l), cur = i === firstOpen && !sleeping;
          const inner = l.locked ? '🔒' : scene(l.scene, { night: sleeping }) + (sleeping ? '<div class="lockveil moon">🌙</div>' : avail ? '' : '<div class="lockveil">🔒</div>');
          return `<div class="mnode" style="left:${pts[i].x - 62}px;top:${pts[i].y - 59}px">
            ${l.chapter ? `<div class="ribbon">${tx(l.chapter)}</div>` : ''}
            <button class="medal ${done ? 'done' : ''} ${cur ? 'current' : ''} ${l.locked ? 'lockedm' : ''}" data-i="${i}" ${avail ? '' : 'disabled'}>${inner}</button>
            ${cur ? `<div class="youhere">${tx('אַתָּה כָּאן')}</div>` : ''}${sleeping ? `<div class="youhere tomorrow">🌙 ${tx('מָחָר')}</div>` : ''}
            <div class="mlabel">${tx(l.title)}</div>
            ${done ? `<div class="mstars">${'⭐'.repeat(st)}${'☆'.repeat(3 - st)}</div>` : ''}
          </div>`;
        }).join('')}
      </div>`;
    app.querySelectorAll('.medal:not([disabled])').forEach(b => b.onclick = () => {
      const l = lv[+b.dataset.i];
      if (isSleeping(l)) showSleep(world, false); else playLevel(world, +b.dataset.i);
    });
    const cur = app.querySelector('.medal.current') || app.querySelector('.youhere.tomorrow'); if (cur) setTimeout(() => cur.scrollIntoView({ behavior:'smooth', block:'center' }), 200);
    bindRiddle(); refreshBar(); checkInbox();
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
  function showShop() {
    closeOverlay(); screen = 'shop';
    app.innerHTML = `<h1 class="big-title" style="font-size:40px">${tx('הַשּׁוֹמֵר שֶׁלִּי')}</h1>
      <div class="shop-top"><div class="keeper-big">${keeperSVG(S.equipped)}</div>
        <div><div class="display" style="font-size:28px;color:#ffe7a6">${esc(S.name || '')}</div><div style="color:#d9cfff;font-size:20px">${tx(rank())}</div>
        <div class="pill" style="display:inline-flex;margin-top:10px">🪙 ${S.coins}</div>
        <p style="color:#d9cfff;font-size:18px">${tx('קְנֵה צִיּוּד בַּמַּטְבְּעוֹת שֶׁהִרְוַחְתָּ. גַּע בְּפָרִיט כְּדֵי לִלְבֹּשׁ אוֹתוֹ.')}</p></div></div>
      <div class="shop">${SHOP.map(it => {
        const own = S.owned.includes(it.id), on = S.equipped[it.slot] === it.id;
        return `<button class="item ${own ? 'own' : ''} ${on ? 'on' : ''}" data-id="${it.id}">
          <div class="thumb">${keeperSVG({ [it.slot]: it.id })}</div><b>${tx(it.name)}</b>
          <span>${on ? '✔ ' + tx('לָבוּשׁ') : own ? tx('שֶׁלְּךָ') : it.price + ' 🪙'}</span></button>`;
      }).join('')}</div>`;
    app.querySelectorAll('.item').forEach(b => b.onclick = () => {
      const it = SHOP.find(x => x.id === b.dataset.id);
      if (S.owned.includes(it.id)) {
        if (S.equipped[it.slot] === it.id) delete S.equipped[it.slot]; else S.equipped[it.slot] = it.id;
        save(); refreshBar(); showShop(); return;
      }
      if (S.coins < it.price) {
        shake(b); overlay(`<div style="font-size:60px">🪙</div><p class="story" style="font-size:26px">${tx('חֲסֵרִים לְךָ עוֹד')} ${it.price - S.coins} ${tx('מַטְבְּעוֹת.')}<br>${tx('הַצֵּל עוֹד דַּף וְתַחְזֹר!')}</p>
          <div class="row" style="justify-content:center"><button class="btn go" id="okx">${tx('בְּסֵדֶר')}</button></div>`);
        $('#okx').onclick = closeOverlay; return;
      }
      overlay(`<div class="keeper-mid">${keeperSVG({ ...S.equipped, [it.slot]: it.id })}</div>
        <p class="story" style="font-size:26px">${tx('לִקְנוֹת')} ${tx(it.name)} ${tx('בְּ־')}${it.price} 🪙?</p>
        <div class="row" style="justify-content:center"><button class="btn gold" id="buy">${tx('כֵּן, לִקְנוֹת!')}</button><button class="btn ghost" id="nob">${tx('לֹא עַכְשָׁו')}</button></div>`);
      $('#nob').onclick = closeOverlay;
      $('#buy').onclick = () => {
        S.coins -= it.price; S.owned.push(it.id); S.equipped[it.slot] = it.id; save(); refreshBar();
        sound('win'); confetti(25); store.log('shop_buy', { item: it.id }); showShop();
      };
    });
    refreshBar();
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
          ${T.pending ? `<div class="hint" style="text-align:center">⏳ ${tx('בִּקַּשְׁתָּ')} ${ticketsText(T.pending.tickets)} (${minutesText(T.pending.minutes)}).<br>${tx('מְחַכִּים לְאִשּׁוּר שֶׁל')} ${helper()}.</div>`
          : T.balance > 0 ? `<div class="tk-pick"><button class="btn ghost" id="tkMinus">−</button><div class="tk-n"><b>${n}</b><small>${minutesText(n * SET.ticketMinutes)}</small></div><button class="btn ghost" id="tkPlus">+</button></div>
              <div class="row" style="justify-content:center"><button class="btn gold" id="tkAsk">🙋 ${tx('לְבַקֵּשׁ מֵ')}${helper()}</button></div>`
          : `<div class="hint" style="text-align:center">${tx('עוֹד אֵין כַּרְטִיסִים. כָּל דַּף שֶׁתַּצִּיל = כַּרְטִיס!')}</div>`}
          <div class="tk-rules">
            <div>📖 ${tx('דַּף חָדָשׁ שֶׁהִצַּלְתָּ')} <b>+1</b></div>
            <div>🎯 ${tx('מְשִׂימַת הַיּוֹם')} <b>+1</b></div>
            <div>🔥 ${tx('3 יָמִים בָּרֶצֶף')} <b>+1</b> · ${tx('7 יָמִים')} <b>+2</b></div>
            <div>📜 ${tx('חִידָה מֵ')}${helper()} <b>🎟️</b></div>
          </div>
        </div>`;
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

  /* ---------------- שלב ---------------- */
  function playLevel(world, idx) {
    const lvl = LEVELS[world][idx];
    L = { world, idx, lvl, step:0, mistakes:0, lastRead:null, replay: S.done.includes(lvl.id), start: Date.now() };
    screen = 'level';
    renderStep();
  }
  const guideHTML = flat => `<div class="guide ${flat ? 'flat' : ''}"><div class="avatar">${guideAvatar()}</div><div class="guide-name">${tx(GUIDE.name)}</div></div>`;
  const progressHTML = () => `<div class="progress">${L.lvl.steps.map((_, i) => `<span class="${i < L.step ? 'on' : ''}"></span>`).join('')}</div>`;
  const frame = inner => { app.innerHTML = progressHTML() + `<div class="panel">${inner}</div>`; };
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
    if (hint && !$('#hintbox') && fb) fb.insertAdjacentHTML('afterend', `<div class="hint" id="hintbox">💡 ${tx(hint)}</div>`);
  }

  function renderStep() {
    const s = L.lvl.steps[L.step]; L.tries = 0; touchSession();
    if (s.t === 'read') {
      L.lastRead = s.lines;
      const sc = scene(s.scene || L.lvl.scene, { cabin: L.lvl.cabin, ...s });
      frame(`<div class="scene">${sc}${s.pic ? `<div class="sticker">${s.pic}</div>` : ''}</div>
        ${guideHTML()}<div class="story">${s.lines.map((l, i) => `<p style="animation-delay:${i * 0.6}s">${tx(l)}</p>`).join('')}</div>
        <div class="row"><div style="flex:1"></div><button class="btn go" id="nx">${tx('הַמְשֵׁךְ')} ◀</button></div>`);
            const nx = $('#nx'); nx.disabled = true; setTimeout(() => { if (nx) nx.disabled = false; }, 600 * s.lines.length + 300);
      nx.onclick = () => { sound('page'); addCoins(L.replay ? 0 : 2, nx); next(); };
    }
    else if (s.t === 'choice' || s.t === 'tf') {
      const isTF = s.t === 'tf';
      const options = isTF ? ['✔ נָכוֹן', '✘ לֹא נָכוֹן'] : s.options;
      const answer = isTF ? (s.answer ? 0 : 1) : s.answer;
      const qHTML = (isTF ? `<div class="small" style="font-size:22px">${tx('נָכוֹן אוֹ לֹא נָכוֹן?')}</div>${tx(s.q)}` : tx(s.q))
        + (s.mirror ? `<div class="mirror-card"><span class="mirror">${tx(s.mirror)}</span><small>🪞 ${tx('כְּתַב הַמַּרְאָה שֶׁל לֵאוֹנַרְדוֹ')}</small></div>` : '');
      frame(`<div class="question">${qHTML}</div>
        <div class="options ${isTF ? 'tf' : ''}">${options.map((o, i) => `<button class="opt" data-i="${i}">${tx(o)}</button>`).join('')}</div>
        <div class="feedback" id="fb"></div><div class="row">${rereadBtn()}${lifelineBtn()}</div>`);
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
        <div class="feedback" id="fb"></div><div class="row">${lifelineBtn()}</div>`);
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
          <div class="feedback" id="fb"></div><div class="row">${lifelineBtn()}</div>`);
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
        <div class="feedback" id="fb"></div>`);
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
    else if (s.t === 'name') {
      frame(`${guideHTML(true)}<div class="question">${tx(s.q)}</div>
        <input type="text" id="nm" maxlength="20" value="" autocomplete="off" placeholder="${tx('הַשֵּׁם שֶׁלִּי...')}">
        <div class="row"><button class="btn go" id="ok">${tx('זֶה אֲנִי!')} ◀</button></div><div class="feedback" id="fb"></div>`);
            $('#nm').focus();
      $('#ok').onclick = () => { const v = $('#nm').value.trim(); if (v.length < 2) { wrong($('#nm')); return; } S.name = v; save(); refreshBar(); correct($('#ok'), 10); };
    }
    else if (s.t === 'write') {
      frame(`${guideHTML(true)}<div class="question">${tx(s.q)}</div>
        <div class="chips" style="min-height:0;margin-bottom:12px">${s.starters.map(w => `<button class="chip" data-w="${esc(tx(w))}">${tx(w)}</button>`).join('')}</div>
        <textarea id="ta" placeholder="${tx('כְּתֹב כָּאן...')}"></textarea>
        <div class="meter"><i id="mt"></i></div><div class="meter-label" id="ml"></div>
        <div class="row"><button class="btn gold" id="ok" disabled>${tx('שְׁלַח אֶת הַמִּכְתָּב')} ✉️</button>${rereadBtn()}${lifelineBtn()}</div>
        <div class="feedback" id="fb"></div>`);
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
  $('#overlay').onclick = e => { if (e.target.id === 'overlay' && !$('#chest') && !$('#cont') && !$('#ppOk') && !$('#llCancel') && !$('#llOk')) closeOverlay(); };
  let rz; const onResize = () => { clearTimeout(rz); rz = setTimeout(() => { if (screen === 'map') showMap(mapWorld); }, 250); };
  window.addEventListener('resize', onResize);
  const onHide = () => store.flush?.();
  window.addEventListener('pagehide', onHide);

  if (typeof window !== 'undefined') window.__guideSVG = guideSVG;
  // גישה לבדיקות אוטומטיות
  if (typeof window !== 'undefined') window.__kg = { state: () => S, level: () => L, playLevel, renderStep: () => renderStep(), showWorlds, showMap, showShop, showTickets, addCoins: n => addCoins(n) };

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
      touchSession();
      ensureToday();
      [T.balance, T.pending, T.riddle] = await Promise.all([store.ticketBalance(), store.pendingRedemption(), store.activeRiddle()]);
      store.log('session_start', {});
      timers.push(setInterval(() => { if (document.visibilityState === 'visible') { S.minutes += 1; save(); } }, 60000));
      // בדיקה תקופתית: חידה חדשה, תשובה למכתב, אישור כרטיסים
      timers.push(setInterval(async () => {
        if (screen !== 'worlds' && screen !== 'map' && screen !== 'sleep') return;
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
