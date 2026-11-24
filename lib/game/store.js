/* שכבת השמירה של המשחק.
   supabaseStore – הנתונים נשמרים בענן ואבא רואה הכול באזור ההורים.
   demoStore     – בלי שרת: הכול נשמר בדפדפן, ו"אבא" עונה אוטומטית (לבדיקות). */

export function supabaseStore(db, childId) {
  let timer = null, pending = null;
  const flush = async () => {
    clearTimeout(timer); timer = null;
    if (!pending) return;
    const state = pending; pending = null;
    await db.from('game_states').upsert({ child_id: childId, state, updated_at: new Date().toISOString() });
  };
  const one = async q => { const { data, error } = await q; if (error) throw error; return data; };
  return {
    async init() {
      const child = await one(db.from('children').select('id,name,settings,family_id').eq('id', childId).single());
      const gs = await one(db.from('game_states').select('state').eq('child_id', childId).maybeSingle());
      return { child, state: gs?.state || {} };
    },
    saveState(state) { pending = state; clearTimeout(timer); timer = setTimeout(flush, 1200); },
    flush,
    log(type, data = {}) { db.from('events').insert({ child_id: childId, type, data }).then(() => {}); },
    async ticketBalance() {
      const rows = await one(db.from('ticket_ledger').select('delta').eq('child_id', childId));
      return (rows || []).reduce((a, r) => a + r.delta, 0);
    },
    async addTickets(delta, reason) {
      await one(db.from('ticket_ledger').insert({ child_id: childId, delta, reason }));
      return this.ticketBalance();
    },
    async pendingRedemption() {
      const rows = await one(db.from('redemptions').select('*').eq('child_id', childId).eq('status', 'pending').order('created_at', { ascending: false }).limit(1));
      return rows?.[0] || null;
    },
    async requestRedemption(tickets, minutes) { await one(db.from('redemptions').insert({ child_id: childId, tickets, minutes })); },
    async unseenDecisions() {
      return (await one(db.from('redemptions').select('*').eq('child_id', childId).neq('status', 'pending').eq('kid_seen', false).order('decided_at'))) || [];
    },
    async markDecisionSeen(id) { await db.from('redemptions').update({ kid_seen: true }).eq('id', id); },
    async sendLetter(levelId, text) { await one(db.from('letters').insert({ child_id: childId, level_id: levelId, text })); },
    async unreadReplies() {
      return (await one(db.from('letters').select('*').eq('child_id', childId).not('reply', 'is', null).eq('reply_seen', false).order('replied_at'))) || [];
    },
    async markReplySeen(id) { await db.from('letters').update({ reply_seen: true }).eq('id', id); },
    async createLifeline(payload) {
      const row = await one(db.from('lifelines').insert({ child_id: childId, level_id: payload.level, payload }).select('id').single());
      return row.id;
    },
    watchLifeline(id, cb) {
      const ch = db.channel('lifeline-' + id)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'lifelines', filter: `id=eq.${id}` }, p => cb(p.new))
        .subscribe();
      // גיבוי למקרה שהחיבור בזמן אמת נופל
      const poll = setInterval(async () => {
        const { data } = await db.from('lifelines').select('*').eq('id', id).single();
        if (data && data.status !== 'open') cb(data);
      }, 4000);
      return () => { clearInterval(poll); db.removeChannel(ch); };
    },
    async closeLifeline(id, status) { await db.from('lifelines').update({ status }).eq('id', id).eq('status', 'open'); },
    async activeRiddle() {
      const rows = await one(db.from('riddles').select('*').eq('child_id', childId).eq('status', 'active').order('created_at').limit(1));
      return rows?.[0] || null;
    },
    async solveRiddle(id) { await db.from('riddles').update({ status: 'solved', solved_at: new Date().toISOString() }).eq('id', id); },
    notify(kind, data = {}) {
      fetch('/api/notify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ childId, kind, data }) }).catch(() => {});
    },
  };
}

/* ---------------- מצב הדגמה ---------------- */
const K = 'keepers-demo';
function readDemo() {
  try { return JSON.parse(localStorage.getItem(K) || '{}'); } catch (e) { return {}; }
}
function writeDemo(d) { try { localStorage.setItem(K, JSON.stringify(d)); } catch (e) {} }
export function demoData() {
  const d = readDemo();
  d.child ||= { id: 'demo', name: 'הַשּׁוֹמֵר', settings: {} };
  d.state ||= {}; d.ledger ||= []; d.redemptions ||= []; d.letters ||= []; d.lifelines ||= []; d.events ||= [];
  d.riddles ||= [{ id: 'r1', question: 'מה יש לו ראש ורגל, אבל אין לו גוף?', question_nikud: 'מָה יֵשׁ לוֹ רֹאשׁ וְרֶגֶל, אֲבָל אֵין לוֹ גּוּף?',
    answers: ['מסמר'], hint: 'דופקים עליו עם פטיש', hint_nikud: 'דּוֹפְקִים עָלָיו עִם פַּטִּישׁ', reward_tickets: 1, reward_coins: 20, status: 'active', created_at: new Date().toISOString() }];
  return d;
}
export function saveDemoData(d) { writeDemo(d); }

export function demoStore() {
  const uid = () => Math.random().toString(36).slice(2);
  const upd = fn => { const d = demoData(); fn(d); writeDemo(d); return d; };
  const later = (ms, fn) => setTimeout(fn, ms);
  return {
    demo: true,
    async init() { const d = demoData(); writeDemo(d); return { child: d.child, state: d.state }; },
    saveState(state) { upd(d => { d.state = state; }); },
    flush() {},
    log(type, data) { upd(d => { d.events.push({ type, data, created_at: new Date().toISOString() }); d.events = d.events.slice(-200); }); },
    async ticketBalance() { return demoData().ledger.reduce((a, r) => a + r.delta, 0); },
    async addTickets(delta, reason) { upd(d => d.ledger.push({ delta, reason, created_at: new Date().toISOString() })); return this.ticketBalance(); },
    async pendingRedemption() { return demoData().redemptions.find(r => r.status === 'pending') || null; },
    async requestRedemption(tickets, minutes) {
      const id = uid();
      upd(d => d.redemptions.push({ id, tickets, minutes, status: 'pending', kid_seen: false, created_at: new Date().toISOString() }));
      later(5000, () => upd(d => { const r = d.redemptions.find(x => x.id === id); if (r && r.status === 'pending') { r.status = 'approved'; r.decided_at = new Date().toISOString(); d.ledger.push({ delta: -r.tickets, reason: 'מימוש' }); } }));
    },
    async unseenDecisions() { return demoData().redemptions.filter(r => r.status !== 'pending' && !r.kid_seen); },
    async markDecisionSeen(id) { upd(d => { const r = d.redemptions.find(x => x.id === id); if (r) r.kid_seen = true; }); },
    async sendLetter(levelId, text) {
      const id = uid();
      upd(d => d.letters.push({ id, level_id: levelId, text, reply: null, reply_seen: false, created_at: new Date().toISOString() }));
      later(6000, () => upd(d => { const l = d.letters.find(x => x.id === id); if (l && !l.reply) { l.reply = 'איזה מכתב מעולה! אני גאה בך'; l.reply_nikud = 'אֵיזֶה מִכְתָּב מְעֻלֶּה! אֲנִי גֵּאֶה בְּךָ ❤️'; l.replied_at = new Date().toISOString(); } }));
    },
    async unreadReplies() { return demoData().letters.filter(l => l.reply && !l.reply_seen); },
    async markReplySeen(id) { upd(d => { const l = d.letters.find(x => x.id === id); if (l) l.reply_seen = true; }); },
    async createLifeline(payload) { const id = uid(); upd(d => d.lifelines.push({ id, payload, status: 'open', created_at: new Date().toISOString() })); return id; },
    watchLifeline(id, cb) {
      const t = later(3500, () => {
        const d = upd(d => { const l = d.lifelines.find(x => x.id === id); if (l && l.status === 'open') { l.status = 'answered'; l.answer = 'תקרא שוב את השורה האחרונה בסיפור'; l.answer_nikud = 'תִּקְרָא שׁוּב אֶת הַשּׁוּרָה הָאַחֲרוֹנָה בַּסִּפּוּר 😉'; } });
        const l = d.lifelines.find(x => x.id === id); if (l) cb(l);
      });
      return () => clearTimeout(t);
    },
    async closeLifeline(id, status) { upd(d => { const l = d.lifelines.find(x => x.id === id); if (l && l.status === 'open') l.status = status; }); },
    async activeRiddle() { return demoData().riddles.find(r => r.status === 'active') || null; },
    async solveRiddle(id) { upd(d => { const r = d.riddles.find(x => x.id === id); if (r) { r.status = 'solved'; r.solved_at = new Date().toISOString(); } }); },
    notify() {},
  };
}
