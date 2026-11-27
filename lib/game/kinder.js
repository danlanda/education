/* 🐣 גן חובה: משחק לילד שעוד לא קורא – אותיות וחשבון ראשון, עם הוּפִּי הַיַּנְשׁוּף שמדבר.
   עקרונות: הכול בקול ובתמונות (בלי לקרוא), כפתורים ענקיים, אין "פסילה" – טעות = רמז עדין,
   משחקונים קצרים (דקה-שתיים) ובסוף כל אחד מדבקה לאלבום. האותיות נפתחות אחת-אחת לפי ההצלחה,
   והחשבון עולה רמה (ספירה עד 3 → עד 10 → חיבור) כשהולך טוב. */
import { createAudio } from './audio.js';
import { owlSVG } from './progress.js';
import { KLETTERS, LETTER_ORDER, letterOf, NUM, THINGS, STICKERS, MATH_LEVELS, PRAISE, RETRY, V } from './kinder-data.js';

const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const today = () => new Date().toDateString();
const FINAL = { 'ם': 'מ', 'ן': 'נ', 'ץ': 'צ', 'ך': 'כ', 'ף': 'פ' };
const dots = n => `<span class="kd-dots n${n}">${'<i></i>'.repeat(n)}</span>`;
const COLORS = ['#ff5d73', '#4a9bff', '#ffc928', '#3fcf6a', '#a06bff', '#ff8a3d', '#22c1c3'];

export function createKinder(root, store, opts = {}) {
  const audio = createAudio(), sound = (t, a) => { try { audio.sfx(t, a); } catch (e) {} };
  let S = null, SET = {}, child = {}, destroyed = false, screen = 'start', lastLine = '', timers = [], tick = null, actStart = 0;
  const later = (fn, ms) => { const t = setTimeout(() => { if (!destroyed) fn(); }, ms); timers.push(t); return t; };
  root.innerHTML = `<div class="kd">
    <div class="kd-top"><button class="kd-ib" id="kdHome" aria-label="🏠">🏠</button><div class="kd-prog" id="kdProg"></div>
      <button class="kd-ib" id="kdSay" aria-label="🔊">🔊</button><button class="kd-ib kd-parent" id="kdParent" aria-label="⚙️"><span>⚙️</span><i></i></button></div>
    <div class="kd-app" id="kdApp"></div><div class="kd-fx" id="kdFx"></div></div>`;
  const $ = s => root.querySelector(s), app = $('#kdApp');
  const kidName = () => (S && S.name) || child.name || 'חָבֵר';

  /* ---------------- 🔊 הקול: קול טבעי מהשרת אם מחובר, אחרת הקול העברי של המכשיר ---------------- */
  let natural = false, voiceHe = null, cur = null;
  fetch('/api/tts?probe=1').then(r => r.json()).then(j => { natural = !!j.ok; }).catch(() => {});
  const pickVoice = () => { try { const vs = speechSynthesis.getVoices(); voiceHe = vs.find(v => /^(he|iw)/i.test(v.lang)) || null; } catch (e) {} };
  if (typeof speechSynthesis !== 'undefined') { pickVoice(); try { speechSynthesis.onvoiceschanged = pickVoice; } catch (e) {} }
  const hasVoice = () => natural || !!voiceHe;
  function stopVoice() { if (cur) { try { cur.pause(); } catch (e) {} cur = null; } try { speechSynthesis.cancel(); } catch (e) {} owlTalk(false); }
  function say(line) {
    lastLine = line; stopVoice();
    if (SET.kVoice === false || destroyed) return Promise.resolve();
    const text = line.replace(/\{name\}/g, kidName());
    const est = Math.min(8000, 700 + text.replace(/[֑-ׇ]/g, '').length * 85);   // כמה זמן לוקח להגיד את זה (גיבוי אם הצליל לא מודיע שנגמר)
    owlTalk(true);
    return new Promise(res => {
      let ended = false; const end = () => { if (ended) return; ended = true; owlTalk(false); res(); };
      if (natural) {
        const a = new Audio(`/api/tts?t=${encodeURIComponent(line)}&n=${encodeURIComponent(kidName())}`); cur = a;
        a.onended = end; a.onerror = end; a.play().catch(end); setTimeout(end, est + 600); return;
      }
      if (voiceHe) {
        try {
          const u = new SpeechSynthesisUtterance(text); u.lang = 'he-IL'; u.voice = voiceHe; u.rate = .88; u.pitch = 1.12;
          u.onend = end; u.onerror = end; speechSynthesis.speak(u); setTimeout(end, est + 900); return;
        } catch (e) {}
      }
      setTimeout(end, 350);   // בלי קול – לא מחכים
    });
  }
  function owlTalk(on) { root.querySelectorAll('.kd-owl').forEach(o => o.classList.toggle('talk', on)); }
  const owl = (cls = '') => `<div class="kd-owl ${cls}">${owlSVG(1)}</div>`;

  /* ---------------- 💾 מצב ---------------- */
  const save = () => { try { store.saveState(S); } catch (e) {} };
  const log = (type, data) => { try { store.log(type, data); } catch (e) {} };
  function initState(st) {
    S = { ...st };
    S.name = S.name || child.name || '';
    const k = S.kd = S.kd || {};
    k.letters = k.letters || []; k.stat = k.stat || {}; k.math = k.math || 1; k.mwin = k.mwin || []; k.stickers = k.stickers || [];
    k.plays = k.plays || 0; k.rot = k.rot || { l: 0, m: 0 }; k.day = k.day && k.day.d === today() ? k.day : { d: today(), secs: 0, acts: 0 };
    if (!k.letters.length) {   // מתחילים מהאות הראשונה של השם (אם יש), ועוד אות אחת
      const f = (kidName() || '').replace(/[֑-ׇ]/g, '').trim()[0], first = FINAL[f] || f;
      const order = [...(letterOf(first) ? [first] : []), ...LETTER_ORDER.filter(x => x !== first)];
      k.letters = order.slice(0, 2); k.order = order; k.newLetter = null;
    }
    k.order = k.order || LETTER_ORDER;
  }
  const K = () => S.kd;
  const noteLetter = (l, ok) => { const st = K().stat[l] = K().stat[l] || { ok: 0, bad: 0, win: [] }; if (ok) st.ok++; else st.bad++; st.win = [...st.win, ok ? 1 : 0].slice(-8); };
  const known = l => { const st = K().stat[l]; if (!st || st.ok < 3 || st.win.length < 4) return false; return st.win.slice(-6).reduce((a, b) => a + b, 0) / Math.min(6, st.win.length) >= .7; };
  /** אות חדשה נפתחת כשכל האותיות שכבר נפתחו "יושבות" טוב */
  function maybeNewLetter() {
    const k = K(); if (k.letters.length >= KLETTERS.length) return null;
    if (!k.letters.every(known)) return null;
    if ((k.sinceNew || 0) < 2) return null;
    const nl = k.order.find(x => !k.letters.includes(x)); if (!nl) return null;
    k.letters.push(nl); k.newLetter = nl; k.sinceNew = 0; log('kd_letter', { letter: nl, n: k.letters.length }); save();
    return nl;
  }
  /** בוחר אות לשאלה: יותר מהאות החדשה ומאותיות שעוד לא יושבות */
  function pickLetter(except = []) {
    const pool = K().letters.filter(l => !except.includes(l)); if (!pool.length) return K().letters[0];
    const w = pool.map(l => (l === K().newLetter ? 3 : known(l) ? 1 : 2));
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return pool[i]; }
    return pool[pool.length - 1];
  }
  /** אותיות "מסיחות": קודם מהאותיות שהוא מכיר, ואם אין מספיק – אותיות אחרות */
  const distractors = (l, n) => shuffle([...shuffle(K().letters.filter(x => x !== l)), ...shuffle(KLETTERS.map(x => x.l).filter(x => x !== l && !K().letters.includes(x)))]).filter((x, i, a) => a.indexOf(x) === i).sort((a, b) => (K().letters.includes(b) - K().letters.includes(a))).slice(0, n);
  const ML = () => MATH_LEVELS[clamp(K().math, 1, MATH_LEVELS.length - 1)];

  /* ---------------- ⏱️ זמן משחק יומי ---------------- */
  function startClock() { clearInterval(tick); tick = setInterval(() => { if (destroyed || document.hidden || screen === 'sleep' || screen === 'start') return; K().day.secs += 5; if (K().day.secs % 30 === 0) save(); }, 5000); }
  const minutesLeft = () => (SET.kinderMinutes || 20) * 60 - K().day.secs;

  /* ---------------- 🧭 סרגל עליון ---------------- */
  function setProg(i, n) { $('#kdProg').innerHTML = n ? Array.from({ length: n }, (_, k) => `<i class="${k < i ? 'on' : ''} ${k === i ? 'cur' : ''}"></i>`).join('') : ''; }
  $('#kdHome').onclick = () => { sound('tap'); stopVoice(); if (screen !== 'start' && screen !== 'sleep') showHome(); };
  $('#kdSay').onclick = () => { sound('tap'); if (lastLine) say(lastLine); };
  // ⚙️ אזור הורים: לחיצה ארוכה (כדי שהילד לא ייצא בטעות)
  let hold = null;
  const holdStart = e => { e.preventDefault(); $('#kdParent').classList.add('hold'); hold = setTimeout(() => { $('#kdParent').classList.remove('hold'); stopVoice(); try { store.flush && store.flush(); } catch (e) {} if (opts.onLocked) opts.onLocked(); else if (opts.onExit) opts.onExit(); }, 1600); };
  const holdEnd = () => { clearTimeout(hold); $('#kdParent').classList.remove('hold'); };
  $('#kdParent').addEventListener('pointerdown', holdStart); ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => $('#kdParent').addEventListener(ev, holdEnd));

  /* ---------------- ✨ אפקטים ---------------- */
  function confetti(n = 40) {
    const fx = $('#kdFx'); if (!fx) return;
    for (let i = 0; i < n; i++) { const c = document.createElement('i'); c.style.left = Math.random() * 100 + '%'; c.style.background = pick(COLORS); c.style.animationDelay = Math.random() * .4 + 's'; c.style.setProperty('--dx', (Math.random() * 200 - 100) + 'px'); fx.appendChild(c); setTimeout(() => c.remove(), 2200); }
  }
  function star(el) {
    const r = el.getBoundingClientRect(), fx = $('#kdFx'), s = document.createElement('b'); s.className = 'kd-star'; s.textContent = '⭐';
    const rr = root.getBoundingClientRect(); s.style.left = (r.left - rr.left + r.width / 2) + 'px'; s.style.top = (r.top - rr.top + r.height / 2) + 'px'; fx.appendChild(s); setTimeout(() => s.remove(), 1000);
  }
  const wiggle = el => { el.classList.remove('kd-no'); void el.offsetWidth; el.classList.add('kd-no'); };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  // אחרי תשובה נכונה ממשיכים כשהמשפט נגמר – אבל לא מחכים יותר מ־2.6 שניות
  function good(el, line) { sound('ok'); if (el) star(el); return Promise.race([say(line || pick(PRAISE)), wait(2600)]); }
  function bad(el, line) { sound('bad'); if (el) wiggle(el); return say(line || pick(RETRY)); }

  /* ---------------- 🏁 מסכים ---------------- */
  function showStart() {
    screen = 'start'; setProg(0, 0);
    app.innerHTML = `<div class="kd-start">${owl('big')}<h1>${kidName() ? kidName() + '!' : ''}</h1>
      <button class="kd-play" id="kdGo" aria-label="▶">▶</button></div>`;
    $('#kdGo').onclick = () => { audio.unlock(); sound('magic'); startClock(); say(V.hello); later(showHome, 400); };
  }
  function showHome() {
    if (minutesLeft() <= 0) { showSleep(); return; }
    screen = 'home'; setProg(0, 0); stopVoice();
    const k = K(), ls = k.letters;
    app.innerHTML = `<div class="kd-home">
      <div class="kd-guide">${owl()}<div class="kd-bubble">${hasVoice() ? '🔊' : '👋'}</div></div>
      <div class="kd-worlds">
        <button class="kd-world letters" id="kdLetters"><span class="kd-wart">${ls.slice(0, 3).map((l, i) => `<b style="--c:${COLORS[i]}">${l}</b>`).join('')}</span><span class="kd-wlabel">אוֹתִיּוֹת</span></button>
        <button class="kd-world numbers" id="kdNumbers"><span class="kd-wart"><b style="--c:${COLORS[3]}">1</b><b style="--c:${COLORS[4]}">2</b><b style="--c:${COLORS[5]}">3</b></span><span class="kd-wlabel">מִסְפָּרִים</span></button>
      </div>
      <div class="kd-mine">${ls.map(l => `<span class="${known(l) ? 'ok' : ''}">${l}</span>`).join('')}</div>
      <button class="kd-album-btn" id="kdAlbum">📒 <b>${k.stickers.length}</b></button></div>`;
    $('#kdLetters').onclick = () => { sound('tap'); say(V.pickLetters); later(() => nextActivity('l'), 500); };
    $('#kdNumbers').onclick = () => { sound('tap'); say(V.pickNumbers); later(() => nextActivity('m'), 500); };
    $('#kdAlbum').onclick = () => { sound('tap'); showAlbum(); };
    root.querySelector('.kd-guide').onclick = () => say(V.home);
    later(() => { if (screen === 'home') say(V.home); }, 700);
  }
  function showSleep() {
    screen = 'sleep'; setProg(0, 0);
    app.innerHTML = `<div class="kd-sleep">${owl('sleep big')}<div class="kd-zzz">💤</div><div class="kd-moon">🌙</div></div>`;
    say(V.sleep); log('kd_sleep', { secs: K().day.secs });
  }
  function showAlbum() {
    screen = 'album'; setProg(0, 0);
    const mine = K().stickers;
    app.innerHTML = `<div class="kd-album"><h2>📒</h2><div class="kd-grid">${STICKERS.map(s => `<span class="${mine.includes(s) ? 'got' : ''}">${mine.includes(s) ? s : '?'}</span>`).join('')}</div>
      <button class="kd-big-btn" id="kdBack">🏠</button></div>`;
    say(V.album); $('#kdBack').onclick = () => { sound('tap'); showHome(); };
  }

  /* ---------------- 🎮 בחירת המשחקון הבא ---------------- */
  const L_ACTS = ['balloons', 'first', 'trace', 'first', 'memory', 'balloons'];
  function nextActivity(world) {
    if (minutesLeft() <= 0) { showSleep(); return; }
    const k = K();
    if (world === 'l') { const a = L_ACTS[k.rot.l++ % L_ACTS.length]; save(); return runAct(a); }
    const acts = ML().acts; const a = acts[k.rot.m++ % acts.length]; save(); return runAct(a);
  }
  function runAct(kind) {
    screen = 'act'; actStart = Date.now(); stopVoice();
    const ctx = { kind, first: 0, total: 0, world: ['count', 'feed', 'numpop', 'more', 'add'].includes(kind) ? 'm' : 'l' };
    ctx.mark = ok => { ctx.total++; if (ok) ctx.first++; };
    ctx.done = () => finishAct(ctx);
    const nl = ctx.world === 'l' && K().newLetter && !K().shownNew ? K().newLetter : null;
    if (nl) { K().shownNew = true; save(); return introLetter(nl, () => ACTS[kind](ctx)); }
    ACTS[kind](ctx);
  }
  function introLetter(l, then) {
    const L = letterOf(l); sound('magic'); confetti(30);
    app.innerHTML = `<div class="kd-newl">${owl()}<div class="kd-newcard"><b>${l}</b><span>${L.words[0][1]}</span></div><button class="kd-play small" id="kdOk">▶</button></div>`;
    say(V.newLetter(L)); $('#kdOk').onclick = () => { sound('tap'); then(); };
    root.querySelector('.kd-newcard').onclick = () => say(V.newLetter(L));
  }
  function finishAct(ctx) {
    const k = K(), rate = ctx.total ? ctx.first / ctx.total : 1;
    k.plays++; k.day.acts++; k.sinceNew = (k.sinceNew || 0) + (ctx.world === 'l' ? 1 : 0);
    if (ctx.world === 'm') {   // החשבון עולה ויורד לפי ההצלחה
      k.mwin = [...k.mwin, rate].slice(-3);
      const prev = k.math;
      if (k.mwin.length >= 2 && k.mwin.slice(-2).every(r => r >= .8)) { k.math = Math.min(MATH_LEVELS.length - 1, k.math + 1); k.mwin = []; }
      else if (rate < .5) { k.math = Math.max(1, k.math - 1); k.mwin = []; }
      if (k.math !== prev) log('kd_math', { level: k.math, up: k.math > prev });
    }
    const left = STICKERS.filter(s => !k.stickers.includes(s)), st = left.length ? pick(left) : pick(STICKERS);
    if (!k.stickers.includes(st)) k.stickers.push(st);
    log('kd_act', { kind: ctx.kind, first: ctx.first, of: ctx.total, secs: Math.round((Date.now() - actStart) / 1000), math: k.math, letters: k.letters.length });
    if (ctx.world === 'l') maybeNewLetter();
    save();
    screen = 'reward'; setProg(0, 0); sound('cheer'); confetti(70);
    app.innerHTML = `<div class="kd-reward">${owl('dance')}<div class="kd-sticker">${st}</div>
      <div class="kd-row"><button class="kd-big-btn home" id="kdH">🏠</button><button class="kd-play small" id="kdMore">▶</button><button class="kd-big-btn" id="kdAl">📒</button></div></div>`;
    say(V.sticker).then(() => { if (screen === 'reward') say(V.again); });
    $('#kdMore').onclick = () => { sound('tap'); nextActivity(ctx.world === 'l' ? 'm' : 'l'); };   // מתחלפים: אותיות ← → מספרים
    $('#kdH').onclick = () => { sound('tap'); showHome(); };
    $('#kdAl').onclick = () => { sound('tap'); showAlbum(); };
  }

  /* ================= המשחקונים ================= */
  const ACTS = {
    /* 🎈 בלונים: פוצצים את כל הבלונים עם האות (או המספר) */
    balloons: ctx => balloonGame(ctx, 'l'),
    numpop: ctx => balloonGame(ctx, 'n'),
    /* 🔤 באיזו אות מתחילה המילה? */
    first(ctx) {
      const N = 5; let q = 0, prevL = null;
      const ask = () => {
        if (q >= N) { ctx.done(); return; }
        setProg(q, N);
        const l = pickLetter(prevL ? [prevL] : []), L = letterOf(l), [w, e] = pick(L.words); prevL = l;
        const opts3 = shuffle([l, ...distractors(l, 2)]); let tries = 0;
        app.innerHTML = `<div class="kd-first"><button class="kd-pic" id="kdPic">${e}</button>
          <div class="kd-opts">${opts3.map(x => `<button class="kd-card" data-l="${x}">${x}</button>`).join('')}</div></div>`;
        say(V.firstQ(w));
        $('#kdPic').onclick = () => say(w);
        root.querySelectorAll('.kd-card').forEach(b => b.onclick = () => {
          const x = b.dataset.l;
          if (x === l) {
            ctx.mark(tries === 0); noteLetter(l, tries === 0); b.classList.add('right'); root.querySelectorAll('.kd-card').forEach(c => c.disabled = true);
            good(b, V.firstOk(L, w)).then(() => later(() => { q++; ask(); }, 300));
          } else {
            tries++; if (tries === 1) noteLetter(l, false); b.disabled = true; bad(b, V.firstNo(letterOf(x)));
            if (tries >= 2) root.querySelector(`.kd-card[data-l="${l}"]`).classList.add('glow');
          }
        });
      };
      ask();
    },
    /* ✍️ מציירים את האות עם האצבע */
    trace(ctx) {
      const letters = [K().newLetter && K().letters.includes(K().newLetter) ? K().newLetter : pickLetter(), null];
      letters[1] = pickLetter([letters[0]]);
      let q = 0;
      const draw1 = () => {
        if (q >= letters.length) { ctx.done(); return; }
        setProg(q, letters.length);
        const l = letters[q], L = letterOf(l);
        app.innerHTML = `<div class="kd-trace"><div class="kd-tl"><span>${L.words[0][1]}</span></div>
          <div class="kd-pad"><canvas id="kdCv"></canvas><div class="kd-meter"><i id="kdMeter"></i></div></div>
          <button class="kd-big-btn" id="kdClear">🧽</button></div>`;
        say(V.trace(L));
        root.querySelector('.kd-tl').onclick = () => say(V.trace(L));
        traceCanvas($('#kdCv'), l, pct => { $('#kdMeter').style.width = Math.round(pct * 100) + '%'; }, () => {
          ctx.mark(true); noteLetter(l, true); sound('levelup'); confetti(40);
          say(V.traceOk(L)).then(() => later(() => { q++; draw1(); }, 400));
        }, clear => { $('#kdClear').onclick = () => { sound('tap'); clear(); }; });
      };
      draw1();
    },
    /* 🃏 זוגות: אות ותמונה שמתחילה בה */
    memory(ctx) {
      const ls = shuffle(K().letters).slice(0, 3); while (ls.length < 3) { const x = pick(LETTER_ORDER.filter(y => !ls.includes(y))); ls.push(x); }
      const cards = shuffle(ls.flatMap(l => { const L = letterOf(l), [w, e] = pick(L.words); return [{ l, face: l, kind: 'l', say: L.name }, { l, face: e, kind: 'p', say: w }]; }));
      app.innerHTML = `<div class="kd-mem">${cards.map((c, i) => `<button class="kd-mc" data-i="${i}" data-l="${c.l}"><span class="back">?</span><span class="face ${c.kind}">${c.face}</span></button>`).join('')}</div>`;
      say(V.memory); setProg(0, 3);
      let open = [], pairs = 0, misses = 0, busy = false;
      root.querySelectorAll('.kd-mc').forEach(b => b.onclick = () => {
        const i = +b.dataset.i, c = cards[i];
        if (busy || b.classList.contains('up')) return;
        b.classList.add('up'); sound('page'); say(c.say); open.push([b, c]);
        if (open.length < 2) return;
        const [[b1, c1], [b2, c2]] = open; open = [];
        if (c1.l === c2.l && c1.kind !== c2.kind) {
          pairs++; ctx.mark(misses === 0); noteLetter(c1.l, misses === 0); misses = 0; setProg(pairs, 3);
          later(() => { b1.classList.add('done'); b2.classList.add('done'); good(b2, V.memOk(letterOf(c1.l))); }, 500);
          if (pairs === 3) later(() => ctx.done(), 2200);
        } else { busy = true; misses++; later(() => { sound('bad'); b1.classList.remove('up'); b2.classList.remove('up'); busy = false; }, 1100); }
      });
    },
    /* 🔢 כמה יש? נוגעים בכל אחד וסופרים, ואז בוחרים מספר */
    count(ctx) {
      const N = 5; let q = 0;
      const ask = () => {
        if (q >= N) { ctx.done(); return; }
        setProg(q, N);
        const n = 1 + Math.floor(Math.random() * ML().max), [t, e] = pick(THINGS);
        const choices = shuffle([n, ...shuffle([...Array(ML().max + 1).keys()].slice(1).filter(x => x !== n && Math.abs(x - n) <= 3)).slice(0, 2)]);
        let counted = 0, tries = 0;
        app.innerHTML = `<div class="kd-count"><div class="kd-field">${scatter(n).map(([x, y], i) => `<button class="kd-obj" style="left:${x}%;top:${y}%" data-i="${i}">${e}<b></b></button>`).join('')}</div>
          <div class="kd-nums">${choices.map(c => `<button class="kd-num" data-n="${c}"><b>${c}</b>${dots(c)}</button>`).join('')}</div></div>`;
        say(V.count(t));
        root.querySelectorAll('.kd-obj').forEach(o => o.onclick = () => {
          if (o.classList.contains('on')) return;
          counted++; o.classList.add('on'); o.querySelector('b').textContent = counted; sound('pop', counted); say(NUM[counted]);
          if (counted === n) later(() => say(V.countPick), 700);
        });
        root.querySelectorAll('.kd-num').forEach(b => b.onclick = () => {
          const c = +b.dataset.n;
          if (c === n) { ctx.mark(tries === 0); root.querySelectorAll('.kd-num').forEach(x => x.disabled = true); b.classList.add('right'); good(b, V.numOk(n, pick(PRAISE))).then(() => later(() => { q++; ask(); }, 300)); }
          else { tries++; bad(b); if (tries >= 2) { root.querySelector(`.kd-num[data-n="${n}"]`).classList.add('glow'); countAloud(n); } }
        });
      };
      // ספירה בקול: כל החפצים נדלקים אחד-אחד
      const countAloud = n => { root.querySelectorAll('.kd-obj').forEach((o, i) => later(() => { o.classList.add('on'); o.querySelector('b').textContent = i + 1; say(NUM[i + 1]); }, 700 * i + 900)); };
      ask();
    },
    /* 🐲 מאכילים את הדרקון בדיוק בכמה שהוא ביקש */
    feed(ctx) {
      const N = 4; let q = 0;
      const ask = () => {
        if (q >= N) { ctx.done(); return; }
        setProg(q, N);
        const n = 1 + Math.floor(Math.random() * ML().max), [t, e] = pick(THINGS); let given = 0, tries = 0;
        app.innerHTML = `<div class="kd-feed"><div class="kd-dragon" id="kdDr"><span class="dr">🐲</span><span class="want">${n}<small>${dots(n)}</small></span><span class="belly" id="kdBelly"></span></div>
          <div class="kd-pile">${Array.from({ length: ML().max + 2 }, (_, i) => `<button class="kd-food" data-i="${i}">${e}</button>`).join('')}</div>
          <div class="kd-row"><button class="kd-big-btn undo" id="kdUndo">↩️</button><button class="kd-play small ok" id="kdDone">✔</button></div></div>`;
        say(V.feed(n, t));
        $('#kdDr').onclick = () => say(V.feed(n, t));
        const upd = () => { $('#kdBelly').innerHTML = given ? `${given}` : ''; };
        root.querySelectorAll('.kd-food').forEach(f => f.onclick = () => {
          if (f.classList.contains('gone')) return;
          given++; f.classList.add('gone'); sound('pop', given); say(NUM[given]); upd();
          $('#kdDr').classList.remove('chomp'); void $('#kdDr').offsetWidth; $('#kdDr').classList.add('chomp');
        });
        $('#kdUndo').onclick = () => { const g = [...root.querySelectorAll('.kd-food.gone')].pop(); if (!g) return; g.classList.remove('gone'); given--; sound('tap'); upd(); };
        $('#kdDone').onclick = () => {
          if (given === n) { ctx.mark(tries === 0); $('#kdDr').classList.add('happy'); good($('#kdDr'), V.numOk(n, pick(PRAISE))).then(() => later(() => { q++; ask(); }, 300)); }
          else {
            tries++; bad($('#kdDr'), given > n ? V.tooMany : V.tooFew);
            root.querySelectorAll('.kd-food.gone').forEach(g => g.classList.remove('gone')); given = 0; upd();
            if (tries >= 2) root.querySelectorAll('.kd-food').forEach((f, i) => { if (i < n) f.classList.add('glow'); });
          }
        };
      };
      ask();
    },
    /* ⚖️ איפה יש יותר? */
    more(ctx) {
      const N = 4; let q = 0;
      const ask = () => {
        if (q >= N) { ctx.done(); return; }
        setProg(q, N);
        const mx = ML().max, a = 1 + Math.floor(Math.random() * mx); let b = 1 + Math.floor(Math.random() * mx); while (b === a) b = 1 + Math.floor(Math.random() * mx);
        const [, e] = pick(THINGS), less = K().math >= 4 && Math.random() < .35, ans = less ? (a < b ? 0 : 1) : (a > b ? 0 : 1); let tries = 0;
        app.innerHTML = `<div class="kd-more"><div class="kd-ask">${less ? '🐜' : '🐘'}</div><div class="kd-trays">${[a, b].map((n, i) => `<button class="kd-tray" data-i="${i}">${Array(n).fill(`<span>${e}</span>`).join('')}</button>`).join('')}</div></div>`;
        say(less ? V.less : V.more);
        root.querySelector('.kd-ask').onclick = () => say(less ? V.less : V.more);
        root.querySelectorAll('.kd-tray').forEach(t => t.onclick = () => {
          if (+t.dataset.i === ans) { ctx.mark(tries === 0); t.classList.add('right'); root.querySelectorAll('.kd-tray').forEach(x => x.disabled = true); good(t).then(() => later(() => { q++; ask(); }, 300)); }
          else { tries++; bad(t); if (tries >= 2) root.querySelector(`.kd-tray[data-i="${ans}"]`).classList.add('glow'); }
        });
      };
      ask();
    },
    /* ➕ חיבור עם תמונות */
    add(ctx) {
      const N = 4; let q = 0;
      const ask = () => {
        if (q >= N) { ctx.done(); return; }
        setProg(q, N);
        const mx = ML().max, a = 1 + Math.floor(Math.random() * (mx - 1)), b = 1 + Math.floor(Math.random() * (mx - a)), n = a + b, [t, e] = pick(THINGS);
        const choices = shuffle([n, ...shuffle([n - 1, n + 1, n + 2, n - 2].filter(x => x > 0 && x <= 10)).slice(0, 2)]); let tries = 0, counted = 0;
        app.innerHTML = `<div class="kd-add"><div class="kd-sum"><span class="grp">${Array(a).fill(`<button class="kd-o">${e}<b></b></button>`).join('')}</span><span class="op">+</span>
          <span class="grp">${Array(b).fill(`<button class="kd-o">${e}<b></b></button>`).join('')}</span></div>
          <div class="kd-nums">${choices.map(c => `<button class="kd-num" data-n="${c}"><b>${c}</b>${dots(c)}</button>`).join('')}</div></div>`;
        say(V.add(a, b, t));
        root.querySelectorAll('.kd-o').forEach(o => o.onclick = () => { if (o.classList.contains('on')) return; counted++; o.classList.add('on'); o.querySelector('b').textContent = counted; sound('pop', counted); say(NUM[counted]); });
        root.querySelectorAll('.kd-num').forEach(btn => btn.onclick = () => {
          const c = +btn.dataset.n;
          if (c === n) { ctx.mark(tries === 0); root.querySelectorAll('.kd-num').forEach(x => x.disabled = true); btn.classList.add('right'); good(btn, V.addOk(a, b, pick(PRAISE))).then(() => later(() => { q++; ask(); }, 300)); }
          else { tries++; bad(btn); if (tries >= 2) root.querySelector(`.kd-num[data-n="${n}"]`).classList.add('glow'); }
        });
      };
      ask();
    },
  };

  /* 🎈 משחק הבלונים (אותיות או מספרים) */
  function balloonGame(ctx, mode) {
    const R = 3; let r = 0, prev = null;
    const round = () => {
      if (r >= R) { ctx.done(); return; }
      setProg(r, R);
      let target, label, line, others;
      if (mode === 'l') { target = pickLetter(prev ? [prev] : []); const L = letterOf(target), [w, e] = pick(L.words); label = `<b>${target}</b><span>${e}</span>`; line = V.balloons(L, w); others = distractors(target, 3); }
      else { const mx = ML().max; target = String(1 + Math.floor(Math.random() * mx)); label = `<b>${target}</b>${dots(+target)}`; line = V.numpop(+target); others = shuffle([...Array(Math.max(mx, 5)).keys()].map(x => String(x + 1)).filter(x => x !== target)).slice(0, 3); }
      prev = target;
      const need = 3, items = shuffle([...Array(need).fill(target), ...others, pick(others)]);
      let popped = 0, misses = 0;
      app.innerHTML = `<div class="kd-balloons"><button class="kd-target" id="kdT">${label}</button><div class="kd-sky" id="kdSky">${items.map((x, i) => {
        const left = 6 + (i * 83 / items.length) + Math.random() * 6, dur = 7 + Math.random() * 3.5, delay = -Math.random() * dur;
        return `<button class="kd-bal" data-v="${x}" style="left:${left}%;--c:${COLORS[i % COLORS.length]};animation-duration:${dur}s;animation-delay:${delay}s"><span>${x}</span></button>`; }).join('')}</div></div>`;
      say(line); $('#kdT').onclick = () => say(line);
      root.querySelectorAll('.kd-bal').forEach(b => b.onclick = () => {
        if (b.classList.contains('pop')) return;
        if (b.dataset.v === target) {
          popped++; b.classList.add('pop'); sound('pop', popped + 2); star(b);
          if (popped === need) { ctx.mark(misses === 0); if (mode === 'l') noteLetter(target, misses === 0); root.querySelectorAll('.kd-bal').forEach(x => x.disabled = true); good(null).then(() => later(() => { r++; round(); }, 400)); }
        } else { misses++; if (misses === 1 && mode === 'l') noteLetter(target, false); bad(b, mode === 'l' ? V.firstNo(letterOf(b.dataset.v)) : null); if (misses >= 2) root.querySelectorAll(`.kd-bal[data-v="${target}"]`).forEach(x => x.classList.add('glow')); }
      });
    };
    round();
  }

  /* פיזור חפצים בלי חפיפה (על רשת) */
  function scatter(n) {
    const cells = shuffle([...Array(12).keys()]).slice(0, n);
    return cells.map(c => [8 + (c % 4) * 22 + Math.random() * 8, 8 + Math.floor(c / 4) * 30 + Math.random() * 10]);
  }

  /* ✍️ ציור אות: האות מצוירת באפור, הילד עובר עליה עם האצבע. כשכיסה מספיק ממנה – הצליח */
  function traceCanvas(cv, letter, onProg, onDone, bindClear) {
    const box = cv.parentElement, dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = Math.min(box.clientWidth || 320, 380); cv.width = cv.height = Math.round(size * dpr); cv.style.width = cv.style.height = size + 'px';
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const mask = document.createElement('canvas'); mask.width = mask.height = size; const mg = mask.getContext('2d');
    const font = `900 ${Math.round(size * .78)}px Rubik, Heebo, Arial, sans-serif`;
    mg.font = font; mg.textAlign = 'center'; mg.textBaseline = 'middle'; mg.fillStyle = '#000'; mg.fillText(letter, size / 2, size * .54);
    const md = mg.getImageData(0, 0, size, size).data, pts = [];
    for (let y = 4; y < size; y += 8) for (let x = 4; x < size; x += 8) if (md[(y * size + x) * 4 + 3] > 128) pts.push([x, y]);
    const hit = new Set(); let done = false, drawing = false, last = null;
    const paintGuide = () => {
      g.clearRect(0, 0, size, size);
      g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#efe6cf'; g.fillText(letter, size / 2, size * .54);
      g.setLineDash([10, 10]); g.lineWidth = 3; g.strokeStyle = '#c9b78a'; g.strokeText(letter, size / 2, size * .54); g.setLineDash([]);
    };
    paintGuide();
    const R = Math.max(16, size * .07);
    const at = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * size / r.width, (e.clientY - r.top) * size / r.height]; };
    const stroke = (a, b) => {
      g.strokeStyle = '#ff5d73'; g.lineWidth = R * 1.6; g.lineCap = g.lineJoin = 'round';
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 6));
      for (let s = 0; s <= steps; s++) { const x = a[0] + (b[0] - a[0]) * s / steps, y = a[1] + (b[1] - a[1]) * s / steps;
        pts.forEach((p, i) => { if (!hit.has(i) && Math.hypot(p[0] - x, p[1] - y) < R) hit.add(i); }); }
      const pct = pts.length ? hit.size / pts.length : 0; onProg(Math.min(1, pct / .6));
      if (!done && pct >= .6) { done = true; drawing = false; setTimeout(onDone, 250); }
    };
    cv.onpointerdown = e => { if (done) return; e.preventDefault(); drawing = true; last = at(e); stroke(last, last); try { cv.setPointerCapture(e.pointerId); } catch (x) {} };
    cv.onpointermove = e => { if (!drawing || done) return; const p = at(e); stroke(last, p); last = p; };
    cv.onpointerup = cv.onpointercancel = () => { drawing = false; };
    bindClear(() => { if (done) return; hit.clear(); paintGuide(); onProg(0); });
  }

  /* ---------------- 🚀 התחלה ---------------- */
  (async () => {
    try {
      const r = await store.init(); child = r.child || {}; SET = { kinderMinutes: 20, ...(child.settings || {}) };
      initState(r.state || {}); save();
      if (!destroyed) showStart();
    } catch (e) { app.innerHTML = `<div class="kd-start">${owl('big')}<p>😕</p></div>`; }
  })();
  if (typeof window !== 'undefined') window.__kd = { state: () => S, run: k => runAct(k), home: () => showHome(), next: w => nextActivity(w), say: () => lastLine, screen: () => screen, setLevel: n => { K().math = n; }, voice: () => ({ natural, he: !!voiceHe }) };
  return {
    destroy() { destroyed = true; stopVoice(); clearInterval(tick); timers.forEach(clearTimeout); try { store.flush && store.flush(); } catch (e) {} root.innerHTML = ''; },
  };
}
