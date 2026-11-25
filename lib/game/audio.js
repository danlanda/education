/* מוזיקה וצלילים – הכול מסונתז בדפדפן (Web Audio), בלי קבצים.
   שלושה נושאים מוזיקליים: לובי (הרפתקה חמימה), סיפור (שקט ומסתורי, כדי לא להפריע לקריאה),
   זירה (מהיר ומותח, כמו שעשועון). ההעדפה (מוזיקה / צלילים) נשמרת במכשיר. */

const KEY = 'kg-audio';
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

/* אקורדים כ־MIDI (שורש, טרצה, קווינטה) */
const THEMES = {
  lobby: { bpm: 96, vol: .55, chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],
    arp: [0, 1, 2, 1, 2, 1, 0, 2], arpOct: 12, arpType: 'triangle', arpVol: .045, bass: [0, 4], bassVol: .11, pad: .018, hats: [2, 6], hatVol: .012,
    melody: [[0, 76, 2], [2, 74, 1], [3, 72, 1], [4, 71, 3], [8, 72, 2], [10, 74, 1], [11, 76, 1], [12, 79, 4],
             [16, 77, 2], [18, 76, 1], [19, 74, 1], [20, 72, 3], [24, 71, 2], [26, 72, 1], [27, 74, 1], [28, 71, 4]], melVol: .035 },
  story: { bpm: 66, vol: .45, chords: [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]],
    arp: [0, -1, 1, -1, 2, -1, 1, -1], arpOct: 24, arpType: 'sine', arpVol: .03, bass: [0], bassVol: .06, pad: .02, hats: [], hatVol: 0, melody: [], melVol: 0 },
  arena: { bpm: 128, vol: .6, chords: [[52, 55, 59], [48, 52, 55], [55, 59, 62], [50, 54, 57]],
    arp: [0, 2, 1, 2, 0, 2, 1, 2], arpOct: 12, arpType: 'square', arpVol: .022, arpFilter: 1800, bass: [0, 1, 2, 3, 4, 5, 6, 7], bassVol: .075,
    pad: 0, hats: [1, 3, 5, 7], hatVol: .02, kick: [0, 2, 4, 6], kickVol: .16, clap: [2, 6], clapVol: .05, melody: [], melVol: 0 },
};

export function createAudio() {
  let ctx = null, comp, musicBus, sfxBus, verb, noiseBuf = null;
  let theme = null, playing = null, timer = null, nextT = 0, step = 0;
  const pref = { music: true, sfx: true };
  try { Object.assign(pref, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
  const savePref = () => { try { localStorage.setItem(KEY, JSON.stringify(pref)); } catch (e) {} };

  function ensure() {
    if (typeof window === 'undefined') return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      ctx = new AC();
      comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ctx.destination);
      musicBus = ctx.createGain(); musicBus.gain.value = 0; musicBus.connect(comp);
      sfxBus = ctx.createGain(); sfxBus.gain.value = pref.sfx ? 1 : 0; sfxBus.connect(comp);
      // הד קטן – נותן "חלל" לצלילים
      verb = ctx.createConvolver(); const len = ctx.sampleRate * 2.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
      verb.buffer = ir; const wet = ctx.createGain(); wet.gain.value = .22; verb.connect(wet); wet.connect(comp);
      musicBus.connect(verb); sfxBus.connect(verb);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* ---- כלי בסיס ---- */
  function tone(bus, f, t, dur, o = {}) {
    const osc = ctx.createOscillator(), g = ctx.createGain(), vol = o.vol ?? .15, att = o.att ?? .008;
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let n = osc;
    if (o.filter) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.filter; osc.connect(fl); n = fl; }
    n.connect(g); g.connect(bus); osc.start(t); osc.stop(t + dur + .05);
  }
  function noise(bus, t, dur, o = {}) {
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf; src.loop = true;
    f.type = o.ftype || 'bandpass'; f.frequency.setValueAtTime(o.freq || 1200, t); if (o.freqTo) f.frequency.exponentialRampToValueAtTime(o.freqTo, t + dur); f.Q.value = o.q || 1;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.vol || .1, t + (o.att || .005)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(bus); src.start(t); src.stop(t + dur + .05);
  }
  const kick = (bus, t, vol) => tone(bus, 120, t, .18, { vol, slide: 42, att: .002 });

  /* ---- מוזיקה ---- */
  function scheduleStep(th, t) {
    const spb = 60 / th.bpm / 2, bar = Math.floor(step / 8) % th.chords.length, s = step % 8, ch = th.chords[bar];
    if (s === 0 && th.pad) ch.forEach(m => tone(musicBus, mtof(m + 12), t, spb * 8.2, { vol: th.pad, att: .4, type: 'sine' }));
    const ai = th.arp[s];
    if (ai != null && ai >= 0) tone(musicBus, mtof(ch[ai] + th.arpOct), t, spb * 1.6, { vol: th.arpVol, type: th.arpType, filter: th.arpFilter });
    if (th.bass.includes(s)) tone(musicBus, mtof(ch[0] - 12), t, spb * (th.bass.length > 4 ? .9 : 3.5), { vol: th.bassVol, type: 'triangle', filter: 600 });
    if (th.hats.includes(s)) noise(musicBus, t, .05, { ftype: 'highpass', freq: 7000, vol: th.hatVol });
    if (th.kick && th.kick.includes(s)) kick(musicBus, t, th.kickVol);
    if (th.clap && th.clap.includes(s)) noise(musicBus, t, .12, { freq: 1500, q: .8, vol: th.clapVol });
    const ms = step % 32;
    (th.melody || []).forEach(([at, m, len]) => { if (at === ms) tone(musicBus, mtof(m), t, spb * len * 1.1, { vol: th.melVol, type: 'sine', att: .01 }); });
  }
  function loop() {
    if (!ctx || !playing) return;
    const th = THEMES[playing], spb = 60 / th.bpm / 2;
    while (nextT < ctx.currentTime + .25) { scheduleStep(th, nextT); nextT += spb; step++; }
  }
  function startMusic(name) {
    if (!ensure()) return;
    if (playing === name) return;
    playing = name; step = 0; nextT = ctx.currentTime + .08;
    const target = pref.music ? (THEMES[name]?.vol ?? .5) * .5 : 0;
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setValueAtTime(musicBus.gain.value, ctx.currentTime);
    musicBus.gain.linearRampToValueAtTime(target, ctx.currentTime + 1.2);
    clearInterval(timer); timer = setInterval(loop, 60); loop();
  }

  /* ---- אפקטים ---- */
  const SFX = {
    tap: t => tone(sfxBus, 660, t, .06, { vol: .05, type: 'triangle' }),
    page: t => noise(sfxBus, t, .35, { freq: 900, freqTo: 2600, q: .7, vol: .06, att: .08 }),
    ok: t => { [784, 988, 1318].forEach((f, i) => tone(sfxBus, f, t + i * .07, .35, { vol: .1, type: 'triangle' })); tone(sfxBus, 2637, t + .2, .3, { vol: .03 }); },
    bad: t => { tone(sfxBus, 330, t, .16, { vol: .09, type: 'triangle' }); tone(sfxBus, 247, t + .12, .28, { vol: .08, type: 'triangle' }); },
    coin: t => { tone(sfxBus, 1318, t, .1, { vol: .05, type: 'square', filter: 4000 }); tone(sfxBus, 1760, t + .07, .25, { vol: .05, type: 'square', filter: 4000 }); },
    win: t => { [523, 659, 784, 1046].forEach((f, i) => tone(sfxBus, f, t + i * .11, .5, { vol: .1, type: 'triangle' })); [523, 659, 784].forEach(f => tone(sfxBus, f * 2, t + .46, .9, { vol: .05 })); },
    magic: t => { [392, 523, 659, 784, 988, 1175, 1568].forEach((f, i) => tone(sfxBus, f, t + i * .06, .8, { vol: .06 })); noise(sfxBus, t, .5, { freq: 3000, freqTo: 8000, vol: .03 }); },
    ring: t => [0, .3].forEach(d => { tone(sfxBus, 880, t + d, .12, { vol: .07, type: 'square', filter: 3000 }); tone(sfxBus, 660, t + d + .14, .12, { vol: .07, type: 'square', filter: 3000 }); }),
    star: (t, i = 0) => { tone(sfxBus, 880 * Math.pow(1.26, i), t, .45, { vol: .1, type: 'triangle' }); tone(sfxBus, 1760 * Math.pow(1.26, i), t + .03, .3, { vol: .04 }); },
    tick: t => tone(sfxBus, 1500, t, .04, { vol: .05, type: 'square', filter: 2500 }),
    buzz: t => tone(sfxBus, 150, t, .45, { vol: .09, type: 'sawtooth', filter: 900 }),
    pop: t => tone(sfxBus, 500, t, .12, { vol: .08, slide: 1100 }),
    whoosh: t => noise(sfxBus, t, .45, { freq: 400, freqTo: 3000, q: .6, vol: .08, att: .15 }),
    beep: t => tone(sfxBus, 880, t, .18, { vol: .09, type: 'square', filter: 2500 }),
    go: t => { tone(sfxBus, 1320, t, .35, { vol: .1, type: 'square', filter: 3000 }); tone(sfxBus, 1760, t + .05, .3, { vol: .05 }); },
    drumroll: t => { for (let i = 0; i < 26; i++) noise(sfxBus, t + i * .05, .06, { freq: 1800, q: .7, vol: .025 + i * .002 }); kick(sfxBus, t + 1.32, .2); noise(sfxBus, t + 1.32, .5, { freq: 3000, vol: .06 }); },
    cheer: t => { for (let i = 0; i < 4; i++) noise(sfxBus, t + i * .12, 1.2, { freq: 1100 + i * 300, q: .6, vol: .035, att: .3 }); [523, 659, 784, 1046].forEach((f, i) => tone(sfxBus, f, t + i * .09, .6, { vol: .06, type: 'triangle' })); },
    levelup: t => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(sfxBus, f, t + i * .08, .4, { vol: .08, type: 'square', filter: 3500 })),
    chest: t => { noise(sfxBus, t, .3, { freq: 300, freqTo: 900, q: 3, vol: .06 }); [1046, 1318, 1568, 2093].forEach((f, i) => tone(sfxBus, f, t + .25 + i * .06, .4, { vol: .05, type: 'triangle' })); },
  };

  return {
    /** חייבים מגע ראשון של המשתמש לפני שמשמיעים צלילים */
    unlock() { if (ensure() && playing && pref.music) { const want = playing; playing = null; startMusic(want); } },
    sfx(name, arg) { if (!pref.sfx || !ensure() || !SFX[name]) return; try { SFX[name](ctx.currentTime + .01, arg); } catch (e) {} },
    music(name) {
      if (!ctx) { playing = name; return; }   // יתחיל אחרי המגע הראשון
      if (!name) { playing = null; clearInterval(timer); if (musicBus) musicBus.gain.linearRampToValueAtTime(0, ctx.currentTime + .6); return; }
      startMusic(name);
    },
    get prefs() { return { ...pref }; },
    /** מחזור: הכול פועל → בלי מוזיקה → שקט → הכול פועל */
    cycle() {
      if (pref.music && pref.sfx) pref.music = false; else if (pref.sfx) pref.sfx = false; else { pref.music = true; pref.sfx = true; }
      savePref();
      if (ensure()) {
        sfxBus.gain.value = pref.sfx ? 1 : 0;
        const th = playing && THEMES[playing];
        musicBus.gain.cancelScheduledValues(ctx.currentTime);
        musicBus.gain.setValueAtTime(musicBus.gain.value, ctx.currentTime);
        musicBus.gain.linearRampToValueAtTime(pref.music && th ? th.vol * .5 : 0, ctx.currentTime + .4);
      }
      return { ...pref };
    },
    stop() { clearInterval(timer); playing = null; try { ctx && ctx.close(); } catch (e) {} ctx = null; },
  };
}
