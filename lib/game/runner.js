/* 🏃 מֵרוֹץ הַסִּפּוּר: בסוף כל פרק, הדמות של הילד רצה בתוך העולם של הפרק.
   - מחליקים ימינה/שמאלה (או נוגעים בצד של המסך) כדי לעבור מסלול, מחליקים למעלה (או נוגעים באמצע) כדי לקפוץ.
   - אוספים מטבעות, קופצים מעל מכשולים.
   - בכל שער: שאלה על הסיפור. המרוץ נעצר לגמרי (בלי לחץ זמן – גם למי שקורא לאט), בוחרים תשובה – ורצים דרך השער שלה.
   הכול מצויר בקנבס: הרקע הוא הציור של הפרק, והרץ הוא הדמות של הילד מאחור, עם הבגדים מהחנות. */
import { scene } from './art.js';

/* ---- עולמות: צבעי הקרקע והדרך, קישוטים בצדדים ומכשולים ---- */
const THEMES = {
  sand: { ground: ['#e8c98a', '#ddbb78'], road: ['#c9a46a', '#bf9a60'], edge: '#8a6a3a', line: '#fff3d6', deco: ['🌴', '🌵', '🏺'], obst: ['🪨', '🏺', '🌵'] },
  grass: { ground: ['#8cc152', '#7fb546'], road: ['#c49a6c', '#ba9062'], edge: '#7a5a34', line: '#fff6e0', deco: ['🌳', '🌲', '🌼'], obst: ['🪨', '🪵'] },
  steppe: { ground: ['#c9c66e', '#bcb961'], road: ['#b08f5c', '#a68552'], edge: '#6d5230', line: '#fff6e0', deco: ['⛺', '🌾', '🐎'], obst: ['🪨', '🐑'] },
  jungle: { ground: ['#5fa63a', '#559b33'], road: ['#b98a58', '#ae8050'], edge: '#6a4a26', line: '#fff6e0', deco: ['🌴', '🌿', '🦜'], obst: ['🪵', '🪨'] },
  snow: { ground: ['#f2f6fb', '#e2ebf5'], road: ['#bcd6ea', '#afcbe1'], edge: '#7d9bb5', line: '#ffffff', deco: ['🌲', '⛄', '🏔️'], obst: ['🧊', '⛄'] },
  space: { ground: ['#2a2350', '#221c44'], road: ['#4b3f8f', '#423683'], edge: '#9b8cff', line: '#ffe36e', deco: ['⭐', '🪐', '🌙'], obst: ['☄️', '🛰️'] },
  mars: { ground: ['#c8572a', '#ba4d23'], road: ['#9a3f1c', '#8e3718'], edge: '#5c220c', line: '#ffd2a8', deco: ['🪨', '⛰️'], obst: ['🪨', '🛰️'] },
  sea: { ground: ['#e3d6a6', '#d6c895'], road: ['#5fb6d6', '#54aacb'], edge: '#2d7d9c', line: '#e8fbff', deco: ['🪸', '🐠', '🐚'], obst: ['🦀', '🐡', '🪸'] },
  deck: { ground: ['#2f86c2', '#2a7ab3'], road: ['#a8763e', '#9c6c36'], edge: '#5e3d18', line: '#e8c48a', deco: ['🌊', '🐬', '⚓'], obst: ['📦', '🛢️'] },
  stone: { ground: ['#7d6a5a', '#725f50'], road: ['#a7a29b', '#9c978f'], edge: '#5a5550', line: '#f1ead8', deco: ['🏛️', '🕯️', '📚'], obst: ['📦', '📚'] },
};
const SCENE_THEME = {
  desert: 'sand', egypt: 'sand', alexandria: 'sand', syracuse: 'sand', siege: 'sand', steppe: 'steppe', tuscany: 'grass', forest: 'grass', river: 'grass',
  jungle: 'jungle', alps: 'snow', snow: 'snow', space: 'space', planets: 'space', mars: 'mars', underwater: 'sea', ocean: 'deck', harbor: 'deck', venice: 'deck',
  library: 'stone', castle: 'stone', palace: 'stone', prison: 'stone', workshop: 'stone', bath: 'stone',
};
const DECO_OVERRIDE = { egypt: ['🌴', '🐫', '🏺'], desert: ['🌵', '🐫', '🌴'], alexandria: ['🌴', '🏛️', '🏺'], venice: ['🏠', '🌊'], tuscany: ['🌻', '🌳', '🍇'], river: ['🌳', '🌾', '🦆'], castle: ['🏰', '🕯️', '✨'] };

export const LANE_COL = ['#4a9bff', '#ffc928', '#ff5d8f'];   // שמאל, אמצע, ימין – אותו צבע בשער ובכפתור התשובה
const PET = { pet_cat: '🐈', pet_dog: '🐕', pet_owl: '🦉', pet_parrot: '🦜', pet_camel: '🐫', pet_dragon: '🐉' };
const FLYING = { pet_owl: 1, pet_parrot: 1, pet_dragon: 1 };
const CAPE = { cape_red: '#d64545', cape_blue: '#3b6fd6', cape_stars: '#2b2370', cape_gold: '#e8b52e' };

const RZ = 1.6;          // איפה הרץ עומד (עומק)
const ZFAR = 42;         // עד איפה רואים
const SEG = 62;          // אורך קטע בין שערים
const ASKZ = 15;         // בעומק הזה השער "עוצר" את המרוץ ומופיעה השאלה
const STOPZ = 3.0;       // כאן השער נעצר בזמן שחושבים (קרוב – כדי שרואים את הצבעים והמילים)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];

/* אימוג'י מצויר פעם אחת לקנבס קטן (הרבה יותר מהיר מ־fillText בכל פריים) */
const sprites = {};
function emojiSprite(e) {
  if (sprites[e]) return sprites[e];
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '100px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.fillText(e, 64, 70);
  return (sprites[e] = c);
}
function coinSprite() {
  if (sprites._coin) return sprites._coin;
  const c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d');
  const gr = g.createRadialGradient(38, 34, 6, 48, 48, 44); gr.addColorStop(0, '#fff3a8'); gr.addColorStop(.55, '#ffc928'); gr.addColorStop(1, '#d08a08');
  g.fillStyle = gr; g.beginPath(); g.arc(48, 48, 42, 0, 7); g.fill();
  g.lineWidth = 6; g.strokeStyle = '#b87405'; g.stroke();
  g.fillStyle = '#e9a514'; g.beginPath(); g.arc(48, 48, 26, 0, 7); g.fill();
  g.fillStyle = '#fff3a8'; g.font = '900 34px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('★', 48, 50);
  return (sprites._coin = c);
}

/** בונה את המסלול: מטבעות, מכשולים וקישוטים בין השערים */
function buildCourse(nq, th) {
  const objs = [];
  let pos = 14;
  for (let qi = 0; qi < nq; qi++) {
    const start = pos, end = pos + SEG - 16;
    let p = start + 4;
    while (p < end) {
      const lane = Math.floor(Math.random() * 3), r = Math.random();
      if (r < .45) {                                   // שורת מטבעות
        const n = 5 + Math.floor(Math.random() * 3), sw = Math.random() < .35;
        for (let k = 0; k < n; k++) objs.push({ t: 'coin', lane: sw && k >= n / 2 ? (lane + 1) % 3 : lane, pos: p + k * 1.4, h: 0 });
        p += n * 1.4 + 3;
      } else if (r < .8) {                             // מכשול, ומעליו קשת מטבעות (קופצים!)
        objs.push({ t: 'obst', lane, pos: p, e: pick(th.obst) });
        for (let k = -1; k <= 1; k++) objs.push({ t: 'coin', lane, pos: p + k * 1.1, h: k === 0 ? 1 : .55 });
        if (Math.random() < .35 && qi > 0) objs.push({ t: 'obst', lane: (lane + 1 + Math.floor(Math.random() * 2)) % 3, pos: p + 0.01, e: pick(th.obst) });
        p += 8;
      } else p += 4;
    }
    pos += SEG;
    objs.push({ t: 'gate', q: qi, pos });
    pos += 6;
  }
  objs.push({ t: 'finish', pos: pos + 22 });
  for (let p = 2; p < pos + 40; p += rnd(1.6, 3.2)) objs.push({ t: 'deco', side: Math.random() < .5 ? -1 : 1, off: rnd(1.75, 2.6), pos: p, e: pick(th.deco), sz: rnd(.8, 1.25) });
  return { objs, length: pos + 22 };
}

/**
 * מתחיל מרוץ בתוך host. qs: [{q, options, answer, tf}] – כבר עם ניקוד/בלי, מוכנים להצגה.
 * מחזיר { stop, answer(k), info() }; בסוף קורא ל־onDone({ score, coins, right, of, answers, hits })
 */
export function startRun(host, o) {
  const { qs, sceneName = 'library', look = {}, eq = {}, sound = () => {}, TQ = 30, alive = () => true, onDone = () => {}, onProgress = () => {}, labels = {} } = o;
  const th = { ...THEMES[SCENE_THEME[sceneName] || 'stone'] };
  if (DECO_OVERRIDE[sceneName]) th.deco = DECO_OVERRIDE[sceneName];
  const night = sceneName === 'space' || sceneName === 'planets';
  host.innerHTML = `<canvas class="rn-cv"></canvas>
    <div class="rn-hud"><span class="rn-pill rn-coins">${o.coinIcon || '🪙'}<b id="rnC">0</b></span><span class="rn-pill rn-gate">🚪 <b id="rnG">1/${qs.length}</b></span><span class="rn-pill rn-score">⭐ <b id="rnS">0</b></span></div>
    <div class="rn-card" id="rnCard"></div><div class="rn-pop" id="rnPop"></div><div class="rn-toast" id="rnToast"></div><div class="rn-over" id="rnOver"></div>`;
  const cv = host.querySelector('canvas'), g = cv.getContext('2d');
  const $h = s => host.querySelector(s);
  let W = 0, H = 0, dpr = 1, hy = 0, RW = 0;
  const resize = () => {
    const r = host.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(200, r.width); H = Math.max(300, r.height);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    hy = Math.round(H * .34); RW = Math.min(W * .62, H * .62);
  };
  resize();
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null; if (ro) ro.observe(host);

  // הרקע: הציור של הפרק
  let bg = null;
  try {
    const svg = scene(sceneName, { night: sceneName === 'underwater' ? false : undefined }).replace('<svg ', '<svg width="800" height="320" ');
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const im = new Image(); im.onload = () => { bg = im; URL.revokeObjectURL(url); }; im.src = url;
  } catch (e) {}

  const course = buildCourse(qs.length, th), objs = course.objs;
  const R = { x: 1, lane: 1, jt: -1, stun: 0, ph: 0 };   // x – מיקום (0..2), jt – זמן בקפיצה
  let dist = 0, v = 0, vmax = 7.2, phase = 'intro', curGate = null, askT0 = 0, last = 0, raf = 0, stopped = false, t = 0;
  let score = 0, coins = 0, right = 0, hits = 0, coinSnd = 0;
  const answers = [], parts = [];
  const proj = z => { const s = 1 / z; return { s, y: hy + (H - hy) * s }; };
  const laneX = (lane, s) => W / 2 + (lane - 1) * (RW * 2 / 3) * s;
  const runnerH = () => (R.jt < 0 ? 0 : Math.sin(Math.PI * clamp(R.jt / .72, 0, 1)));
  const hud = () => { $h('#rnC').textContent = coins; $h('#rnS').textContent = score; };

  /* ---- שליטה ---- */
  const move = d => { if (phase === 'done' || phase === 'intro') return; const nl = clamp(R.lane + d, 0, 2); if (nl !== R.lane) { R.lane = nl; sound('whoosh'); if (phase === 'ask') markOpt(nl); } };
  const jump = () => { if (phase === 'done' || phase === 'intro' || phase === 'ask') return; if (R.jt < 0) { R.jt = 0; sound('pop'); } };
  let sx = 0, sy = 0, st = 0;
  const onDown = e => { sx = e.clientX; sy = e.clientY; st = performance.now(); };
  const onUp = e => {
    if (e.target.closest && e.target.closest('button,.rn-card,.rn-over')) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1);
    else if (dy < -28) jump();
    else if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && performance.now() - st < 400) {
      const r = host.getBoundingClientRect(), x = e.clientX - r.left;
      if (x < W * .33) move(-1); else if (x > W * .67) move(1); else jump();
    }
  };
  const onKey = e => {
    if (e.key === 'ArrowLeft') move(-1); else if (e.key === 'ArrowRight') move(1);
    else if (e.key === 'ArrowUp' || e.key === ' ') { e.preventDefault(); jump(); }
    else if (phase === 'ask' && /^[1-3]$/.test(e.key)) { const b = host.querySelectorAll('.rn-opt')[+e.key - 1]; if (b) b.click(); }
  };
  host.addEventListener('pointerdown', onDown); host.addEventListener('pointerup', onUp); window.addEventListener('keydown', onKey);

  /* ---- שאלה בשער ---- */
  // סדר הקריאה מימין לשמאל: התשובה הראשונה – המסלול הימני
  const lanesFor = q => (q.options.length === 2 ? [2, 0] : [2, 1, 0]);
  function prepQ(q) {
    if (q._ready) return q;
    let idx = q.options.map((_, i) => i);
    if (idx.length > 3) idx = [q.answer, ...idx.filter(i => i !== q.answer).sort(() => Math.random() - .5).slice(0, 2)];
    if (!q.tf) idx.sort(() => Math.random() - .5);
    const lanes = lanesFor({ options: idx });
    return Object.assign(q, { _ready: true, _opts: idx.map((i, k) => ({ i, lane: lanes[k], text: q.options[i] })) });
  }
  function markOpt(lane) { host.querySelectorAll('.rn-opt').forEach(b => b.classList.toggle('on', +b.dataset.lane === lane)); }
  function showQ(gate) {
    const q = prepQ(qs[gate.q]);
    $h('#rnCard').innerHTML = `<div class="rn-qno">${labels.question || ''} ${gate.q + 1}/${qs.length}</div><div class="rn-q">${q.q}</div>
      <div class="rn-opts n${q._opts.length}">${q._opts.map(op => `<button class="rn-opt" data-lane="${op.lane}" style="--lc:${LANE_COL[op.lane]}">${q.tf ? (op.i === 0 ? '✔ ' : '✘ ') : ''}${op.text}</button>`).join('')}</div>
      <div class="rn-hint">${labels.pick || ''}</div>`;
    $h('#rnCard').classList.add('show'); askT0 = performance.now(); markOpt(-1);
    host.querySelectorAll('.rn-opt').forEach(b => b.onclick = () => choose(+b.dataset.lane));
    sound('page');
  }
  function choose(lane) {
    if (phase !== 'ask' || !curGate) return;
    const q = qs[curGate.q], op = q._opts.find(x => x.lane === lane); if (!op) return;
    const secs = (performance.now() - askT0) / 1000, ok = op.i === q.answer;
    curGate.choice = lane; curGate.ok = ok; curGate.pts = ok ? 100 + Math.max(0, Math.round(50 * (1 - secs / TQ))) : 0;
    R.lane = lane; sound('tap');
    $h('#rnCard').classList.remove('show');
    phase = 'go';
  }
  function passGate(gt) {
    gt.passed = true;
    const q = qs[gt.q];
    answers.push({ ok: gt.ok, pts: gt.pts, secs: 0 });
    if (gt.ok) {
      right++; score += gt.pts; hud(); sound('ok'); burst(W / 2 + (gt.choice - 1) * RW * .4, H * .55, 26, ['#ffe36e', '#7cf29a', '#fff']);
      pop(`✓ +${gt.pts}`, 'good');
    } else {
      sound('bad'); pop('✗', 'bad');
      const good = q._opts.find(x => x.i === q.answer);
      toast(`${labels.answer || ''} <b style="color:${LANE_COL[good.lane]}">${good.text}</b>`);
    }
    $h('#rnG').textContent = `${Math.min(qs.length, gt.q + 2)}/${qs.length}`;
  }

  /* ---- אפקטים ---- */
  function burst(x, y, n, cols) { for (let i = 0; i < n; i++) parts.push({ x, y, vx: rnd(-220, 220), vy: rnd(-420, -120), life: rnd(.6, 1.1), c: pick(cols), r: rnd(3, 6) }); }
  function pop(txt, cls) { const p = $h('#rnPop'); p.className = 'rn-pop show ' + cls; p.innerHTML = txt; clearTimeout(p._t); p._t = setTimeout(() => p.classList.remove('show'), 1100); }
  function toast(html) { const p = $h('#rnToast'); p.innerHTML = html; p.classList.add('show'); clearTimeout(p._t); p._t = setTimeout(() => p.classList.remove('show'), 2600); }

  /* ---- ציור ---- */
  function drawBg() {
    const sky = g.createLinearGradient(0, 0, 0, hy);
    sky.addColorStop(0, night ? '#0b0a2a' : '#7cc4f0'); sky.addColorStop(1, night ? '#2a2360' : '#cfeaf7');
    g.fillStyle = sky; g.fillRect(0, 0, W, hy + 2);
    if (bg) {
      const sc = Math.max(W / 800, (hy + 24) / 320), w = 800 * sc, h = 320 * sc;
      g.drawImage(bg, (W - w) / 2 - (dist * 0.15 % 1), hy + 24 - h, w, h);
    }
    const hz = g.createLinearGradient(0, hy - 22, 0, hy + 30);
    hz.addColorStop(0, 'rgba(255,255,255,0)'); hz.addColorStop(.5, night ? 'rgba(120,110,220,.35)' : 'rgba(255,255,255,.45)'); hz.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = hz; g.fillRect(0, hy - 22, W, 52);
  }
  function drawGround() {
    const STR = 1.4, base = Math.floor(dist / STR), off = dist - base * STR;
    for (let k = Math.ceil(ZFAR / STR); k >= 0; k--) {
      const z0 = Math.max(.62, k * STR - off + .62), z1 = z0 + STR;
      const a = proj(z1), b = proj(z0), par = (k + base) % 2;
      const ya = a.y, yb = Math.min(H, b.y);
      if (yb <= ya) continue;
      g.fillStyle = th.ground[par]; g.fillRect(0, ya, W, yb - ya + 1);
      const ra = RW * a.s, rb = RW * b.s;
      g.fillStyle = th.road[par];
      g.beginPath(); g.moveTo(W / 2 - ra, ya); g.lineTo(W / 2 + ra, ya); g.lineTo(W / 2 + rb, yb); g.lineTo(W / 2 - rb, yb); g.closePath(); g.fill();
      g.fillStyle = th.edge;   // שוליים
      [-1, 1].forEach(sd => { g.beginPath(); g.moveTo(W / 2 + sd * ra, ya); g.lineTo(W / 2 + sd * ra * 1.06, ya); g.lineTo(W / 2 + sd * rb * 1.06, yb); g.lineTo(W / 2 + sd * rb, yb); g.closePath(); g.fill(); });
      if (par === 0) {        // קווים מקווקווים בין המסלולים
        g.fillStyle = th.line; g.globalAlpha = .75;
        [-1 / 3, 1 / 3].forEach(f => { const xa = W / 2 + f * 2 * ra, xb = W / 2 + f * 2 * rb, wa = Math.max(.6, 3 * a.s * 3), wb = Math.max(1, 3 * b.s * 3);
          g.beginPath(); g.moveTo(xa - wa, ya); g.lineTo(xa + wa, ya); g.lineTo(xb + wb, yb); g.lineTo(xb - wb, yb); g.closePath(); g.fill(); });
        g.globalAlpha = 1;
      }
    }
  }
  function drawSprite(img, x, yb, size, alpha = 1) { if (alpha < 1) g.globalAlpha = alpha; g.drawImage(img, x - size / 2, yb - size * .92, size, size); g.globalAlpha = 1; }
  function drawObj(ob, z) {
    const p = proj(z); if (p.y > H + 200) return;
    const fade = clamp((ZFAR - z) / 6, 0, 1);
    if (ob.t === 'deco') { const x = W / 2 + ob.side * RW * ob.off * p.s; drawSprite(emojiSprite(ob.e), x, p.y, RW * .55 * ob.sz * p.s, fade); return; }
    const lw = RW * 2 / 3 * p.s;
    if (ob.t === 'coin') {
      if (ob.taken) return;
      const sz = lw * .42, spin = Math.abs(Math.cos(t * 5 + ob.pos)), y = p.y - lw * .25 - ob.h * lw * .75;
      g.globalAlpha = fade; g.drawImage(coinSprite(), laneX(ob.lane, p.s) - sz * spin / 2, y - sz / 2, sz * Math.max(.15, spin), sz); g.globalAlpha = 1; return;
    }
    if (ob.t === 'obst') {
      const x = laneX(ob.lane, p.s);
      g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(x, p.y, lw * .32, lw * .08, 0, 0, 7); g.fill();
      drawSprite(emojiSprite(ob.e), x + (ob.hit ? Math.sin(t * 40) * 3 : 0), p.y, lw * .72, ob.hit ? .5 * fade : fade); return;
    }
    if (ob.t === 'gate') { drawGate(ob, p, lw, fade); return; }
    if (ob.t === 'finish') {
      const x1 = W / 2 - RW * p.s * 1.02, x2 = W / 2 + RW * p.s * 1.02, top = p.y - lw * 1.9;
      g.fillStyle = '#5a3a14'; g.fillRect(x1 - lw * .06, top, lw * .12, p.y - top); g.fillRect(x2 - lw * .06, top, lw * .12, p.y - top);
      const bh = lw * .42; for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? '#222' : '#fff'; g.fillRect(x1 + (x2 - x1) * i / 16, top + j * bh / 2, (x2 - x1) / 16 + 1, bh / 2 + 1); }
      g.font = `900 ${Math.max(10, bh * .9)}px Rubik, Heebo, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl';
      g.lineWidth = Math.max(2, bh * .12); g.strokeStyle = '#000'; g.fillStyle = '#ffe36e'; g.strokeText(labels.finish || '🏁', W / 2, top - bh * .55); g.fillText(labels.finish || '🏁', W / 2, top - bh * .55);
    }
  }
  function drawGate(ob, p, lw, fade) {
    const q = prepQ(qs[ob.q]), top = p.y - lw * 1.35, bh = lw * .5;
    g.globalAlpha = fade;
    q._opts.forEach(op => {
      const cx = laneX(op.lane, p.s), x1 = cx - lw * .46, x2 = cx + lw * .46;
      const dim = ob.passed && op.lane !== ob.choice ? .35 : 1, isRight = ob.passed && op.i === q.answer;
      g.globalAlpha = fade * dim;
      g.fillStyle = '#6b4a22'; g.fillRect(x1, top, lw * .07, p.y - top); g.fillRect(x2 - lw * .07, top, lw * .07, p.y - top);
      g.fillStyle = isRight ? '#3fcf6a' : LANE_COL[op.lane]; g.strokeStyle = '#3a2410'; g.lineWidth = Math.max(1, lw * .03);
      const r = bh * .25; g.beginPath(); g.roundRect ? g.roundRect(x1 - lw * .03, top - bh, (x2 - x1) + lw * .06, bh, r) : g.rect(x1 - lw * .03, top - bh, (x2 - x1) + lw * .06, bh); g.fill(); g.stroke();
      const label = q.tf ? (op.i === 0 ? '✔' : '✘') : op.text;
      let fs = bh * .58; g.font = `800 ${fs}px Rubik, Heebo, sans-serif`; g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const mw = (x2 - x1) * .98, w = g.measureText(label).width; if (w > mw) { fs *= mw / w; g.font = `800 ${Math.max(6, fs)}px Rubik, Heebo, sans-serif`; }
      g.fillStyle = '#20160a'; if (fs > 5) g.fillText(label, cx, top - bh / 2 + 1);
      if (!ob.passed) { g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(x1 + lw * .07, top, x2 - x1 - lw * .14, p.y - top); }
    });
    g.globalAlpha = 1;
  }
  function drawRunner() {
    const p = proj(RZ), s = p.s, x = W / 2 + (R.x - 1) * (RW * 2 / 3) * s, h = (RW * 2 / 3) * s * 1.18;
    const jh = runnerH() * h * .55, feet = p.y - jh, ph = R.ph, swing = Math.sin(ph), run = phase === 'ask' ? .35 : 1;
    const skin = look.skin || '#f1c39b', hairC = look.hairColor || '#5a3a22', shirt = eq.outfit === 'armor' ? '#9aa3ad' : eq.outfit === 'toga' ? '#f4f1e6' : (look.shirt || '#2a8f8a');
    if (R.stun > 0 && Math.floor(t * 18) % 2) g.globalAlpha = .45;
    // צל
    g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(x, p.y, h * .26 * (1 - runnerH() * .4), h * .06, 0, 0, 7); g.fill();
    const u = h / 100;           // יחידת ציור: הדמות בגובה 100
    const X = (dx) => x + dx * u, Y = (dy) => feet - dy * u;
    // רגליים
    [[-9, swing], [9, -swing]].forEach(([dx, sw]) => {
      const lift = Math.max(0, sw) * 10 * run;
      g.fillStyle = '#2b3a67'; g.fillRect(X(dx - 6), Y(44), 12 * u, (40 - lift) * u);
      g.fillStyle = skin; g.fillRect(X(dx - 5), Y(8 + lift), 10 * u, 6 * u);
      g.fillStyle = '#333'; g.beginPath(); g.ellipse(X(dx), Y(3 + lift), 7.5 * u, 4.5 * u, 0, 0, 7); g.fill();
    });
    // גלימה מאחור
    const capeC = CAPE[eq.outfit];
    // גוף
    g.fillStyle = shirt; g.beginPath(); g.roundRect ? g.roundRect(X(-17), Y(82), 34 * u, 42 * u, 9 * u) : g.rect(X(-17), Y(82), 34 * u, 42 * u); g.fill();
    if (capeC) {   // גלימה מתנפנפת מאחור – רחבה למטה, עם צווארון
      const fl = Math.sin(t * 9) * 5, fl2 = Math.cos(t * 9) * 4;
      g.fillStyle = capeC; g.beginPath(); g.moveTo(X(-13), Y(84)); g.lineTo(X(13), Y(84));
      g.quadraticCurveTo(X(26), Y(52), X(30 + fl), Y(26)); g.quadraticCurveTo(X(15), Y(20 + fl2), X(0), Y(24)); g.quadraticCurveTo(X(-15), Y(20 - fl2), X(-30 + fl), Y(26));
      g.quadraticCurveTo(X(-26), Y(52), X(-13), Y(84)); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 1.5 * u; g.beginPath(); g.moveTo(X(-4), Y(80)); g.lineTo(X(-10 + fl * .5), Y(28)); g.moveTo(X(5), Y(80)); g.lineTo(X(11 + fl * .5), Y(28)); g.stroke();
      if (eq.outfit === 'cape_stars') { g.fillStyle = '#ffe36e'; [[-8, 50], [9, 38], [2, 64], [-14, 34], [14, 58]].forEach(([a, b]) => { g.beginPath(); g.arc(X(a), Y(b), 1.9 * u, 0, 7); g.fill(); }); }
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(X(-13), Y(86), 26 * u, 4 * u);
    }
    // ידיים
    [[-21, -swing], [21, swing]].forEach(([dx, sw]) => {
      g.save(); g.translate(X(dx), Y(78)); g.rotate(sw * .6 * run);
      g.fillStyle = shirt; g.fillRect(-4.5 * u, 0, 9 * u, 16 * u);
      g.fillStyle = skin; g.fillRect(-4 * u, 16 * u, 8 * u, 13 * u); g.beginPath(); g.arc(0, 30 * u, 4.6 * u, 0, 7); g.fill();
      g.restore();
    });
    // צוואר וראש (מאחור: רואים בעיקר שיער)
    g.fillStyle = skin; g.fillRect(X(-5), Y(88), 10 * u, 8 * u);
    const hx = X(0), hyH = Y(102), hr = 15 * u;
    g.beginPath(); g.arc(hx - hr * .98, hyH + 2 * u, 3.5 * u, 0, 7); g.arc(hx + hr * .98, hyH + 2 * u, 3.5 * u, 0, 7); g.fill();   // אוזניים
    g.beginPath(); g.arc(hx, hyH, hr, 0, 7); g.fill();
    g.fillStyle = hairC;
    const hs = look.hair || 'short';
    if (hs === 'long') { g.beginPath(); g.moveTo(hx - hr * 1.02, hyH); g.lineTo(hx - hr * .9, Y(72)); g.quadraticCurveTo(hx, Y(68), hx + hr * .9, Y(72)); g.lineTo(hx + hr * 1.02, hyH); g.fill(); }
    g.beginPath(); g.arc(hx, hyH - 1 * u, hr * 1.04, Math.PI * .92, Math.PI * 2.08); g.closePath(); g.fill();
    g.beginPath(); g.ellipse(hx, hyH + 1 * u, hr * 1.0, hr * .82, 0, 0, Math.PI, false); g.fill();
    if (hs === 'ponytail') { const sw2 = Math.sin(t * 9) * .35; g.save(); g.translate(hx, hyH + 3 * u); g.rotate(sw2); g.beginPath(); g.ellipse(0, 13 * u, 6 * u, 13 * u, 0, 0, 7); g.fill(); g.restore(); }
    if (hs === 'bun' && !eq.hat) { g.beginPath(); g.arc(hx, hyH - hr * 1.05, 7 * u, 0, 7); g.fill(); }
    if (hs === 'spiky' && (!eq.hat || eq.hat === 'hat_laurel')) { g.beginPath(); for (let i = -2; i <= 2; i++) { g.moveTo(hx + i * 6 * u - 4 * u, hyH - hr * .7); g.lineTo(hx + i * 6 * u, hyH - hr * 1.45); g.lineTo(hx + i * 6 * u + 4 * u, hyH - hr * .7); } g.fill(); }
    if (hs === 'curly') { for (let i = -2; i <= 2; i++) { g.beginPath(); g.arc(hx + i * 6.5 * u, hyH - hr * .82 + Math.abs(i) * 2.5 * u, 5.5 * u, 0, 7); g.fill(); } }
    // כובע
    const hat = eq.hat;
    if (hat) {
      const top = hyH - hr;
      const C = { hat_cap: '#d64545', hat_explorer: '#c8a66a', hat_pirate: '#222', hat_wizard: '#5b3cc4', hat_knight: '#9aa3ad', hat_crown: '#f5c518', hat_laurel: '#4f9a3a' }[hat] || '#d64545';
      g.fillStyle = C;
      if (hat === 'hat_wizard') { g.beginPath(); g.moveTo(hx - hr * 1.15, top + 5 * u); g.lineTo(hx + 3 * u, top - 26 * u); g.lineTo(hx + hr * 1.15, top + 5 * u); g.fill(); g.fillStyle = '#ffe36e'; g.beginPath(); g.arc(hx, top - 8 * u, 2.2 * u, 0, 7); g.fill(); }
      else if (hat === 'hat_crown') { g.beginPath(); g.moveTo(hx - hr * .9, top + 6 * u); g.lineTo(hx - hr * .9, top - 8 * u); g.lineTo(hx - hr * .45, top - 1 * u); g.lineTo(hx, top - 12 * u); g.lineTo(hx + hr * .45, top - 1 * u); g.lineTo(hx + hr * .9, top - 8 * u); g.lineTo(hx + hr * .9, top + 6 * u); g.fill(); }
      else if (hat === 'hat_laurel') { g.strokeStyle = C; g.lineWidth = 4 * u; g.beginPath(); g.arc(hx, hyH, hr * .98, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); }
      else if (hat === 'hat_knight') { g.beginPath(); g.arc(hx, hyH, hr * 1.12, Math.PI, 0); g.lineTo(hx + hr * 1.12, hyH + 8 * u); g.lineTo(hx - hr * 1.12, hyH + 8 * u); g.fill(); g.fillStyle = '#d64545'; g.fillRect(hx - 2 * u, top - 10 * u, 4 * u, 10 * u); }
      else { const brim = hat === 'hat_explorer' || hat === 'hat_pirate' ? 1.5 : 1.15;
        g.beginPath(); g.ellipse(hx, top + 6 * u, hr * brim, 4.5 * u, 0, 0, 7); g.fill();
        g.beginPath(); g.arc(hx, top + 6 * u, hr * .95, Math.PI, 0); g.fill(); }
    }
    if (eq.neck === 'neck_scarf') { g.fillStyle = '#d64545'; g.fillRect(X(-10), Y(88), 20 * u, 6 * u); const fl = Math.sin(t * 10) * 3; g.beginPath(); g.moveTo(X(4), Y(86)); g.lineTo(X(14 + fl), Y(62)); g.lineTo(X(8 + fl), Y(60)); g.lineTo(X(-1), Y(84)); g.fill(); }
    g.globalAlpha = 1;
    // חיית מחמד רצה ליד
    const pe = PET[eq.pet];
    if (pe) { const fly = FLYING[eq.pet], px = x + (R.x <= 1 ? 1 : -1) * h * .55, py = fly ? feet - h * 1.05 + Math.sin(t * 6) * h * .05 : p.y - Math.abs(Math.sin(R.ph)) * h * .08; drawSprite(emojiSprite(pe), px, py, h * .42); }
  }

  /* ---- לולאה ---- */
  function frame(now) {
    if (stopped) return;
    if (!alive() || !host.isConnected || !cv.isConnected) { stop(); return; }
    const dt = Math.min(.05, last ? (now - last) / 1000 : .016); last = now; t += dt;
    // מהירות לפי השלב
    const gate = objs.find(ob => ob.t === 'gate' && !ob.passed);
    if (phase === 'run' && gate && gate.pos - dist <= ASKZ + RZ) { phase = 'ask'; curGate = gate; showQ(gate); }
    let target = phase === 'intro' || phase === 'done' ? 0 : vmax + Math.min(2.2, dist / 120);
    if (phase === 'ask') { const z = curGate.pos - dist; target = (vmax + 1) * clamp((z - STOPZ) / (ASKZ + RZ - STOPZ), 0, 1); }
    if (R.stun > 0) { R.stun -= dt; target *= .5; }
    v += (target - v) * Math.min(1, dt * (phase === 'ask' ? 6 : 2.2));
    if (phase === 'ask' && curGate.pos - dist < STOPZ + .3) v = Math.min(v, .25);
    dist += v * dt; R.ph += dt * (4 + v * 1.25);
    R.x += (R.lane - R.x) * Math.min(1, dt * 13);
    if (R.jt >= 0) { R.jt += dt; if (R.jt > .72) R.jt = -1; }
    // התנגשויות
    const rl = Math.round(R.x), rh = runnerH();
    for (const ob of objs) {
      const z = ob.pos - dist;
      if (z > RZ + .5 || z < RZ - .6) continue;
      if (ob.t === 'coin' && !ob.taken && ob.lane === rl && Math.abs(ob.h - rh) < .5 && Math.abs(z - RZ) < .45) {
        ob.taken = true; coins++; score += 5; hud(); if (t - coinSnd > .07) { sound('coin'); coinSnd = t; }
        const p = proj(RZ); burst(laneX(ob.lane, p.s), p.y - 60, 5, ['#ffe36e', '#fff6c8']);
      }
      if (ob.t === 'obst' && !ob.hit && ob.lane === rl && rh < .42 && Math.abs(z - RZ) < .32) {
        ob.hit = true; hits++; R.stun = .8; score = Math.max(0, score - 20); hud(); sound('bad'); host.classList.add('shake'); setTimeout(() => host.classList.remove('shake'), 350);
      }
      if (ob.t === 'gate' && !ob.passed && z < RZ && curGate === ob) { passGate(ob); curGate = null; phase = 'run'; }
      if (ob.t === 'finish' && !ob.passed && z < RZ) { ob.passed = true; finish(); }
    }
    onProgress(clamp(dist / course.length * 100, 0, 100));
    // ציור
    g.clearRect(0, 0, W, H);
    drawBg(); drawGround();
    const vis = objs.filter(ob => { const z = ob.pos - dist; return z > .7 && z < ZFAR; }).sort((a, b) => b.pos - a.pos);
    let drewRunner = false;
    for (const ob of vis) { const z = ob.pos - dist; if (!drewRunner && z < RZ) { drawRunner(); drewRunner = true; } drawObj(ob, z); }
    if (!drewRunner) drawRunner();
    for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.life -= dt; if (q.life <= 0) { parts.splice(i, 1); continue; } q.vy += 900 * dt; q.x += q.vx * dt; q.y += q.vy * dt; g.globalAlpha = clamp(q.life * 2, 0, 1); g.fillStyle = q.c; g.beginPath(); g.arc(q.x, q.y, q.r, 0, 7); g.fill(); }
    g.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  }
  function finish() {
    phase = 'done'; sound('cheer'); burst(W / 2, H * .4, 60, ['#ffe36e', '#7cf29a', '#ff8fb1', '#8fd3ff']);
    pop(labels.finished || '🏁', 'good');
    setTimeout(() => { if (stopped) return; stop(); onDone({ score, coins, right, of: qs.length, answers, hits }); }, 1500);
  }
  function stop() {
    stopped = true; cancelAnimationFrame(raf); if (ro) ro.disconnect();
    window.removeEventListener('keydown', onKey); host.removeEventListener('pointerdown', onDown); host.removeEventListener('pointerup', onUp);
  }
  /** הסבר קצר + ספירה לאחור */
  function intro() {
    const ov = $h('#rnOver');
    ov.innerHTML = `<div class="rn-intro">${o.introHTML || ''}<button class="btn go big" id="rnGo">${labels.go || '▶'}</button></div>`;
    ov.classList.add('show');
    $h('#rnGo').onclick = () => {
      let n = 3; const tick = () => {
        if (stopped) return;
        ov.innerHTML = `<div class="rn-count">${n || labels.start || '!'}</div>`; sound(n ? 'beep' : 'go');
        if (n === 0) { setTimeout(() => { ov.classList.remove('show'); ov.innerHTML = ''; phase = 'run'; }, 600); return; }
        n--; setTimeout(tick, 700);
      };
      tick();
    };
  }
  raf = requestAnimationFrame(frame); intro();
  return {
    stop,
    answer: k => { if (phase !== 'ask' || !curGate) return false; const q = qs[curGate.q], op = q._opts.find(x => x.i === k); if (!op) return false; choose(op.lane); return true; },
    info: () => ({ phase, dist, length: course.length, score, coins, right, hits, gate: curGate ? curGate.q : null, lane: R.lane }),
    start: () => { $h('#rnOver').classList.remove('show'); $h('#rnOver').innerHTML = ''; phase = 'run'; },
    jump, move, setSpeed: x => { vmax = x; },
  };
}
