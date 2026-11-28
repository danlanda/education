/* 🐣 משחקוני גן חובה – משמשים את המשחק הראשי ב"מצב גן" (ילד שעוד לא קורא).
   כל משחקון: הוראה בקול, תמונות וכפתורים גדולים, טעות = עוד ניסיון ורמז זוהר אחרי שתיים.
   ctx = { mark(okFirstTry), miss(), done() }  –  done נקרא בסוף, והמשחק הראשי נותן מטבעות וממשיך. */
import { KLETTERS, LETTER_ORDER, letterOf, NUM, THINGS, PRAISE, RETRY, V, LETTER_STORY, NUMBER_STORY, S as ST } from './kinder-data.js';
import { friendSVG } from './kfriend.js';

const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dots = n => `<span class="kd-dots n${n}">${'<i></i>'.repeat(n)}</span>`;
const COLORS = ['#ff5d73', '#4a9bff', '#ffc928', '#3fcf6a', '#a06bff', '#ff8a3d', '#22c1c3'];
const colorOf = ch => COLORS[String(ch).charCodeAt(0) % COLORS.length];
const wait = ms => new Promise(r => setTimeout(r, ms));
export { friendSVG, colorOf };

/** h = { app, root, say(line) → Promise, sound(type,arg), later(fn,ms), confetti(n), kd() → מצב הגן (letters, nums, stat) } */
export function createKGames(h) {
  const { app, root, say, sound, later, confetti, kd } = h;
  const $ = s => root.querySelector(s);
  const noteLetter = (l, ok) => { const k = kd(); k.stat = k.stat || {}; const st = k.stat[l] = k.stat[l] || { ok: 0, bad: 0, win: [] }; if (ok) st.ok++; else st.bad++; st.win = [...st.win, ok ? 1 : 0].slice(-8); };
  const known = () => (kd().letters || []);
  const distractors = (l, n) => [...shuffle(known().filter(x => x !== l)), ...shuffle(KLETTERS.map(x => x.l).filter(x => x !== l && !known().includes(x)))].slice(0, n);
  function star(el) {
    if (!el || !el.getBoundingClientRect) return; const r = el.getBoundingClientRect(), s = document.createElement('b'); s.className = 'kd-star fixed'; s.textContent = '⭐';
    s.style.left = (r.left + r.width / 2) + 'px'; s.style.top = (r.top + r.height / 2) + 'px'; document.body.appendChild(s); setTimeout(() => s.remove(), 1000);
  }
  const wiggle = el => { el.classList.remove('kd-no'); void el.offsetWidth; el.classList.add('kd-no'); };
  const good = (el, line) => { sound('ok'); star(el); return Promise.race([say(line || pick(PRAISE)), wait(2600)]); };
  const bad = (el, line) => { sound('bad'); if (el) wiggle(el); return say(line || pick(RETRY)); };
  const wrap = inner => { app.innerHTML = `<div class="panel kd-in">${inner}</div>`; window.scrollTo(0, 0); };

  /* 👋 הכרות עם אות: החבר, הצורה, ושלוש מילים עם תמונה */
  function meetLetter(l, next) {
    const L = letterOf(l), st = LETTER_STORY[l];
    wrap(`<div class="kd-meet"><div class="qlabel">✨ אוֹת חֲדָשָׁה</div><button class="kd-friend big" id="kdF">${friendSVG(l)}</button>
      <div class="kd-words">${L.words.map(([w, e]) => `<button class="kd-word" data-w="${w}"><span>${e}</span><b>${l}</b></button>`).join('')}</div>
      <button class="btn go big" id="kdNext">▶</button></div>`);
    const nx = $('#kdNext'); nx.disabled = true; sound('magic');
    say(ST.meet(L)).then(() => say(st.shape)).then(() => say(ST.meetWords(L))).then(() => { nx.disabled = false; });
    later(() => { nx.disabled = false; }, 5000);
    $('#kdF').onclick = () => { sound('pop'); say(st.shape); };
    root.querySelectorAll('.kd-word').forEach(b => b.onclick = () => { sound('pop'); b.classList.add('heard'); say(b.dataset.w); });
    nx.onclick = () => { sound('page'); next(); };
  }
  /* 👋 הכרות עם מספר: הצורה, וסופרים */
  function meetNumber(n, next) {
    const st = NUMBER_STORY[n]; let c = 0;
    wrap(`<div class="kd-meet"><div class="qlabel">🔢 מִסְפָּר</div><button class="kd-friend big" id="kdF">${friendSVG(String(n))}</button>
      <div class="kd-fingers">${Array.from({ length: n }, () => `<button class="kd-fing">${st.animal[1]}</button>`).join('')}</div>
      <button class="btn go big" id="kdNext">▶</button></div>`);
    const nx = $('#kdNext'); nx.disabled = true; sound('magic');
    say(ST.meetN(n)).then(() => say(st.shape)).then(() => say(ST.countFingers(n))).then(() => { nx.disabled = false; });
    later(() => { nx.disabled = false; }, 5000);
    $('#kdF').onclick = () => { sound('pop'); say(st.shape); };
    root.querySelectorAll('.kd-fing').forEach(b => b.onclick = () => { if (b.classList.contains('on')) return; c++; b.classList.add('on'); b.dataset.n = c; sound('pop', c); say(NUM[c]); });
    nx.onclick = () => { sound('page'); next(); };
  }
  /* 🔤 באיזו אות מתחילה המילה? */
  function first(ctx, { focus, n = 3 }) {
    let q = 0;
    const ask = () => {
      if (q >= n) { ctx.done(); return; }
      const l = q % 2 === 0 || known().length < 2 ? focus : pick(known().filter(x => x !== focus)) || focus;
      const L = letterOf(l), [w, e] = pick(L.words), opts = shuffle([l, ...distractors(l, 2)]); let tries = 0;
      wrap(`<div class="kd-first"><div class="qlabel">🔤</div><button class="kd-pic" id="kdPic">${e}</button><div class="kd-opts">${opts.map(x => `<button class="kd-card" data-l="${x}">${x}</button>`).join('')}</div></div>`);
      say(V.firstQ(w)); $('#kdPic').onclick = () => say(w);
      root.querySelectorAll('.kd-card').forEach(b => b.onclick = () => {
        if (b.dataset.l === l) { ctx.mark(tries === 0); noteLetter(l, tries === 0); b.classList.add('right'); root.querySelectorAll('.kd-card').forEach(c => c.disabled = true); good(b, V.firstOk(L, w)).then(() => later(() => { q++; ask(); }, 300)); }
        else { tries++; ctx.miss(); if (tries === 1) noteLetter(l, false); b.disabled = true; bad(b, V.firstNo(letterOf(b.dataset.l))); if (tries >= 2) $(`.kd-card[data-l="${l}"]`).classList.add('glow'); }
      });
    };
    ask();
  }
  /* ✍️ מציירים את האות */
  function trace(ctx, { letters }) {
    let q = 0;
    const one = () => {
      if (q >= letters.length) { ctx.done(); return; }
      const l = letters[q], L = letterOf(l);
      wrap(`<div class="kd-trace"><div class="kd-tl">${friendSVG(l)}</div><div class="kd-pad"><canvas id="kdCv"></canvas><div class="kd-meter"><i id="kdMeter"></i></div></div><button class="kd-big-btn" id="kdClear">🧽</button></div>`);
      say(V.trace(L)); $('.kd-tl').onclick = () => say(V.trace(L));
      traceCanvas($('#kdCv'), l, p => { $('#kdMeter').style.width = Math.round(p * 100) + '%'; }, () => {
        ctx.mark(true); noteLetter(l, true); sound('levelup'); confetti(40);
        Promise.race([say(V.traceOk(L)), wait(2600)]).then(() => later(() => { q++; one(); }, 300));
      }, clear => { $('#kdClear').onclick = () => { sound('tap'); clear(); }; });
    };
    one();
  }
  /* 🎈 בלונים */
  function balloons(ctx, { mode, targets }) {
    let r = 0;
    const round = () => {
      if (r >= targets.length) { ctx.done(); return; }
      const target = String(targets[r]); let label, line, others;
      if (mode === 'l') { const L = letterOf(target), [w, e] = pick(L.words); label = `<b>${target}</b><span>${e}</span>`; line = V.balloons(L, w); others = distractors(target, 3); }
      else { label = `<b>${target}</b>${dots(+target)}`; line = V.numpop(+target); others = shuffle([...Array(Math.max(+target + 2, 5)).keys()].map(x => String(x + 1)).filter(x => x !== target)).slice(0, 3); }
      const items = shuffle([target, target, target, ...others, pick(others)]); let popped = 0, misses = 0;
      wrap(`<div class="kd-balloons"><button class="kd-target" id="kdT">${label}</button><div class="kd-sky">${items.map((x, i) => {
        const left = 6 + (i * 83 / items.length) + Math.random() * 6, dur = 7 + Math.random() * 3.5;
        return `<button class="kd-bal" data-v="${x}" style="left:${left}%;--c:${COLORS[i % COLORS.length]};animation-duration:${dur}s;animation-delay:${-Math.random() * dur}s"><span>${x}</span></button>`; }).join('')}</div></div>`);
      say(line); $('#kdT').onclick = () => say(line);
      root.querySelectorAll('.kd-bal').forEach(b => b.onclick = () => {
        if (b.classList.contains('pop')) return;
        if (b.dataset.v === target) {
          popped++; b.classList.add('pop'); sound('pop', popped + 2); star(b);
          if (popped === 3) { ctx.mark(misses === 0); if (mode === 'l') noteLetter(target, misses === 0); root.querySelectorAll('.kd-bal').forEach(x => x.disabled = true); good(null).then(() => later(() => { r++; round(); }, 400)); }
        } else { misses++; ctx.miss(); bad(b, mode === 'l' ? V.firstNo(letterOf(b.dataset.v)) : null); if (misses >= 2) root.querySelectorAll(`.kd-bal[data-v="${target}"]`).forEach(x => x.classList.add('glow')); }
      });
    };
    round();
  }
  /* 🃏 זוגות */
  function memory(ctx, { letters }) {
    const ls = [...letters]; while (ls.length < 3) ls.push(pick(LETTER_ORDER.filter(y => !ls.includes(y))));
    const cards = shuffle(ls.flatMap(l => { const L = letterOf(l), [w, e] = pick(L.words); return [{ l, face: l, kind: 'l', say: L.name }, { l, face: e, kind: 'p', say: w }]; }));
    wrap(`<div class="kd-mem">${cards.map((c, i) => `<button class="kd-mc" data-i="${i}" data-l="${c.l}"><span class="back">?</span><span class="face ${c.kind}">${c.face}</span></button>`).join('')}</div>`);
    say(V.memory); let open = [], pairs = 0, misses = 0, busy = false;
    root.querySelectorAll('.kd-mc').forEach(b => b.onclick = () => {
      const c = cards[+b.dataset.i]; if (busy || b.classList.contains('up')) return;
      b.classList.add('up'); sound('page'); say(c.say); open.push([b, c]); if (open.length < 2) return;
      const [[b1, c1], [b2, c2]] = open; open = [];
      if (c1.l === c2.l && c1.kind !== c2.kind) { pairs++; ctx.mark(misses === 0); noteLetter(c1.l, misses === 0); misses = 0; later(() => { b1.classList.add('done'); b2.classList.add('done'); good(b2, V.memOk(letterOf(c1.l))); }, 500); if (pairs === 3) later(() => ctx.done(), 2200); }
      else { busy = true; misses++; if (misses > 2) ctx.miss(); later(() => { sound('bad'); b1.classList.remove('up'); b2.classList.remove('up'); busy = false; }, 1100); }
    });
  }
  /* 🔢 כמה יש? (החפצים מהעולם של הפרק, אם יש) */
  function count(ctx, { focus, n = 3, emoji }) {
    let q = 0; const mx = Math.max(focus, 3);
    const ask = () => {
      if (q >= n) { ctx.done(); return; }
      const num = q === 0 ? focus : 1 + Math.floor(Math.random() * mx), [t, e0] = pick(THINGS), e = emoji && q === 0 ? emoji : e0;
      const choices = shuffle([num, ...shuffle([...Array(Math.max(mx, 4) + 1).keys()].slice(1).filter(x => x !== num && Math.abs(x - num) <= 3)).slice(0, 2)]); let counted = 0, tries = 0;
      wrap(`<div class="kd-count"><div class="kd-field">${scatter(num).map(([x, y]) => `<button class="kd-obj" style="left:${x}%;top:${y}%">${e}<b></b></button>`).join('')}</div>
        <div class="kd-nums">${choices.map(c => `<button class="kd-num" data-n="${c}"><b>${c}</b>${dots(c)}</button>`).join('')}</div></div>`);
      say(emoji && q === 0 ? V.countAny : V.count(t));
      root.querySelectorAll('.kd-obj').forEach(o => o.onclick = () => { if (o.classList.contains('on')) return; counted++; o.classList.add('on'); o.querySelector('b').textContent = counted; sound('pop', counted); say(NUM[counted]); if (counted === num) later(() => say(V.countPick), 700); });
      root.querySelectorAll('.kd-num').forEach(b => b.onclick = () => {
        if (+b.dataset.n === num) { ctx.mark(tries === 0); root.querySelectorAll('.kd-num').forEach(x => x.disabled = true); b.classList.add('right'); good(b, V.numOk(num, pick(PRAISE))).then(() => later(() => { q++; ask(); }, 300)); }
        else { tries++; ctx.miss(); bad(b); if (tries >= 2) { $(`.kd-num[data-n="${num}"]`).classList.add('glow'); root.querySelectorAll('.kd-obj').forEach((o, i) => later(() => { o.classList.add('on'); o.querySelector('b').textContent = i + 1; say(NUM[i + 1]); }, 700 * i + 900)); } }
      });
    };
    ask();
  }
  /* 🐰 נותנים בדיוק כמה שצריך */
  function feed(ctx, { focus, n = 2, who }) {
    let q = 0; const w = who || NUMBER_STORY[clamp(focus, 1, 10)].animal;
    const ask = () => {
      if (q >= n) { ctx.done(); return; }
      const num = q === 0 ? focus : clamp(focus + pick([-1, 0, 1]), 1, Math.max(focus, 3)), [t, e] = pick(THINGS); let given = 0, tries = 0;
      const line = V.feedFor(w[0], num, t);
      wrap(`<div class="kd-feed"><div class="kd-dragon" id="kdDr"><span class="dr">${w[1]}</span><span class="want">${num}<small>${dots(num)}</small></span><span class="belly" id="kdBelly"></span></div>
        <div class="kd-pile">${Array.from({ length: Math.max(num + 2, 5) }, () => `<button class="kd-food">${e}</button>`).join('')}</div>
        <div class="kd-row"><button class="kd-big-btn undo" id="kdUndo">↩️</button><button class="btn go big" id="kdDone">✔</button></div></div>`);
      say(line); $('#kdDr').onclick = () => say(line);
      const upd = () => { $('#kdBelly').innerHTML = given ? `${given}` : ''; };
      root.querySelectorAll('.kd-food').forEach(f => f.onclick = () => { if (f.classList.contains('gone')) return; given++; f.classList.add('gone'); sound('pop', given); say(NUM[given]); upd(); });
      $('#kdUndo').onclick = () => { const g = [...root.querySelectorAll('.kd-food.gone')].pop(); if (!g) return; g.classList.remove('gone'); given--; upd(); };
      $('#kdDone').onclick = () => {
        if (given === num) { ctx.mark(tries === 0); $('#kdDr').classList.add('happy'); good($('#kdDr'), V.numOk(num, pick(PRAISE))).then(() => later(() => { q++; ask(); }, 300)); }
        else { tries++; ctx.miss(); bad($('#kdDr'), given > num ? V.tooMany : V.tooFew); root.querySelectorAll('.kd-food.gone').forEach(g => g.classList.remove('gone')); given = 0; upd(); if (tries >= 2) root.querySelectorAll('.kd-food').forEach((f, i) => { if (i < num) f.classList.add('glow'); }); }
      };
    };
    ask();
  }
  /* ⚖️ איפה יש יותר */
  function more(ctx, { max = 5, n = 2 }) {
    let q = 0;
    const ask = () => {
      if (q >= n) { ctx.done(); return; }
      const a = 1 + Math.floor(Math.random() * max); let b = 1 + Math.floor(Math.random() * max); while (b === a) b = 1 + Math.floor(Math.random() * max);
      const [, e] = pick(THINGS), less = max >= 6 && q === n - 1, ans = less ? (a < b ? 0 : 1) : (a > b ? 0 : 1); let tries = 0;
      wrap(`<div class="kd-more"><div class="kd-ask">${less ? '🐜' : '🐘'}</div><div class="kd-trays">${[a, b].map((m, i) => `<button class="kd-tray" data-i="${i}">${Array(m).fill(`<span>${e}</span>`).join('')}</button>`).join('')}</div></div>`);
      say(less ? V.less : V.more); $('.kd-ask').onclick = () => say(less ? V.less : V.more);
      root.querySelectorAll('.kd-tray').forEach(t => t.onclick = () => {
        if (+t.dataset.i === ans) { ctx.mark(tries === 0); t.classList.add('right'); root.querySelectorAll('.kd-tray').forEach(x => x.disabled = true); good(t).then(() => later(() => { q++; ask(); }, 300)); }
        else { tries++; ctx.miss(); bad(t); if (tries >= 2) $(`.kd-tray[data-i="${ans}"]`).classList.add('glow'); }
      });
    };
    ask();
  }
  /* ➕ חיבור עם תמונות */
  function add(ctx, { max = 5, n = 2 }) {
    let q = 0;
    const ask = () => {
      if (q >= n) { ctx.done(); return; }
      const a = 1 + Math.floor(Math.random() * (max - 1)), b = 1 + Math.floor(Math.random() * (max - a)), sum = a + b, [t, e] = pick(THINGS);
      const choices = shuffle([sum, ...shuffle([sum - 1, sum + 1, sum + 2, sum - 2].filter(x => x > 0 && x <= 10)).slice(0, 2)]); let tries = 0, counted = 0;
      wrap(`<div class="kd-add"><div class="kd-sum"><span class="grp">${Array(a).fill(`<button class="kd-o">${e}<b></b></button>`).join('')}</span><span class="op">+</span><span class="grp">${Array(b).fill(`<button class="kd-o">${e}<b></b></button>`).join('')}</span></div>
        <div class="kd-nums">${choices.map(c => `<button class="kd-num" data-n="${c}"><b>${c}</b>${dots(c)}</button>`).join('')}</div></div>`);
      say(V.add(a, b, t));
      root.querySelectorAll('.kd-o').forEach(o => o.onclick = () => { if (o.classList.contains('on')) return; counted++; o.classList.add('on'); o.querySelector('b').textContent = counted; sound('pop', counted); say(NUM[counted]); });
      root.querySelectorAll('.kd-num').forEach(btn => btn.onclick = () => {
        if (+btn.dataset.n === sum) { ctx.mark(tries === 0); root.querySelectorAll('.kd-num').forEach(x => x.disabled = true); btn.classList.add('right'); good(btn, V.addOk(a, b, pick(PRAISE))).then(() => later(() => { q++; ask(); }, 300)); }
        else { tries++; ctx.miss(); bad(btn); if (tries >= 2) $(`.kd-num[data-n="${sum}"]`).classList.add('glow'); }
      });
    };
    ask();
  }
  function scatter(n) { const cells = shuffle([...Array(12).keys()]).slice(0, n); return cells.map(c => [8 + (c % 4) * 22 + Math.random() * 8, 8 + Math.floor(c / 4) * 30 + Math.random() * 10]); }
  function traceCanvas(cv, letter, onProg, onDone, bindClear) {
    const box = cv.parentElement, dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = Math.min(box.clientWidth || 320, 360, Math.max(230, Math.round((window.innerHeight || 700) * .45))); cv.width = cv.height = Math.round(size * dpr); cv.style.width = cv.style.height = size + 'px';
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const mask = document.createElement('canvas'); mask.width = mask.height = size; const mg = mask.getContext('2d');
    const font = `900 ${Math.round(size * .78)}px Rubik, Heebo, Arial, sans-serif`;
    mg.font = font; mg.textAlign = 'center'; mg.textBaseline = 'middle'; mg.fillText(letter, size / 2, size * .54);
    const md = mg.getImageData(0, 0, size, size).data, pts = [];
    for (let y = 4; y < size; y += 8) for (let x = 4; x < size; x += 8) if (md[(y * size + x) * 4 + 3] > 128) pts.push([x, y]);
    const hit = new Set(); let done = false, drawing = false, last = null;
    const paint = () => { g.clearRect(0, 0, size, size); g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#efe6cf'; g.fillText(letter, size / 2, size * .54); g.setLineDash([10, 10]); g.lineWidth = 3; g.strokeStyle = '#c9b78a'; g.strokeText(letter, size / 2, size * .54); g.setLineDash([]); };
    paint();
    const R = Math.max(16, size * .07), col = colorOf(letter);
    const at = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * size / r.width, (e.clientY - r.top) * size / r.height]; };
    const stroke = (a, b) => {
      g.strokeStyle = col; g.lineWidth = R * 1.6; g.lineCap = g.lineJoin = 'round'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 6));
      for (let s = 0; s <= steps; s++) { const x = a[0] + (b[0] - a[0]) * s / steps, y = a[1] + (b[1] - a[1]) * s / steps; pts.forEach((p, i) => { if (!hit.has(i) && Math.hypot(p[0] - x, p[1] - y) < R) hit.add(i); }); }
      const pct = pts.length ? hit.size / pts.length : 0; onProg(Math.min(1, pct / .6));
      if (!done && pct >= .6) { done = true; drawing = false; setTimeout(onDone, 250); }
    };
    cv.onpointerdown = e => { if (done) return; e.preventDefault(); drawing = true; last = at(e); stroke(last, last); try { cv.setPointerCapture(e.pointerId); } catch (x) {} };
    cv.onpointermove = e => { if (!drawing || done) return; const p = at(e); stroke(last, p); last = p; };
    cv.onpointerup = cv.onpointercancel = () => { drawing = false; };
    bindClear(() => { if (done) return; hit.clear(); paint(); onProg(0); });
  }
  return { meetLetter, meetNumber, first, trace, balloons, memory, count, feed, more, add, noteLetter, distractors };
}
