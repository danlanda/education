'use client';
/* נתונים לאזור ההורים – גרסת ענן (Supabase) וגרסת הדגמה (דפדפן) */
import { DEMO, sb } from '@/lib/supabase/client';
import { demoData, saveDemoData } from '@/lib/game/store.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Row = Record<string, any>;

export interface AdminApi {
  demo: boolean;
  me(): Promise<{ email: string } | null>;
  children(): Promise<Row[]>;
  child(id: string): Promise<Row>;
  state(id: string): Promise<Row>;
  events(id: string, limit?: number): Promise<Row[]>;
  ledger(id: string): Promise<Row[]>;
  redemptions(childIds: string[], pendingOnly?: boolean): Promise<Row[]>;
  decide(redemptionId: string, approve: boolean): Promise<void>;
  grant(childId: string, n: number, reason: string): Promise<void>;
  letters(id: string): Promise<Row[]>;
  reply(letterId: string, text: string, nikud: string): Promise<void>;
  lifelines(childIds: string[], openOnly?: boolean): Promise<Row[]>;
  answerLifeline(id: string, text: string, nikud: string): Promise<void>;
  riddles(id: string): Promise<Row[]>;
  addRiddle(childId: string, r: Row): Promise<void>;
  archiveRiddle(id: string): Promise<void>;
  saveSettings(childId: string, settings: Row): Promise<void>;
  live(onChange: () => void): () => void;
  signOut(): Promise<void>;
}

const must = async (q: PromiseLike<{ data: any; error: any }>): Promise<any> => { const { data, error } = await q; if (error) throw error; return data; };

function cloudApi(): AdminApi {
  const db = sb();
  return {
    demo: false,
    async me() { const { data } = await db.auth.getUser(); return data.user ? { email: data.user.email || '' } : null; },
    async children() {
      const { data: u } = await db.auth.getUser(); if (!u.user) return [];
      const m = await must(db.from('family_members').select('family_id').eq('user_id', u.user.id));
      if (!m?.length) return [];
      return (await must(db.from('children').select('*').in('family_id', m.map((x: Row) => x.family_id)).order('created_at'))) || [];
    },
    async child(id) { return must(db.from('children').select('*').eq('id', id).single()); },
    async state(id) { const r = await must(db.from('game_states').select('state,updated_at').eq('child_id', id).maybeSingle()); return { ...(r?.state || {}), _updated: r?.updated_at }; },
    async events(id, limit = 30) { return (await must(db.from('events').select('*').eq('child_id', id).order('created_at', { ascending: false }).limit(limit))) || []; },
    async ledger(id) { return (await must(db.from('ticket_ledger').select('*').eq('child_id', id).order('created_at', { ascending: false }).limit(200))) || []; },
    async redemptions(ids, pendingOnly = false) {
      if (!ids.length) return [];
      let q = db.from('redemptions').select('*').in('child_id', ids).order('created_at', { ascending: false }).limit(50);
      if (pendingOnly) q = q.eq('status', 'pending');
      return (await must(q)) || [];
    },
    async decide(rid, approve) { await must(db.rpc('decide_redemption', { p_id: rid, p_approve: approve })); },
    async grant(childId, n, reason) { await must(db.from('ticket_ledger').insert({ child_id: childId, delta: n, reason })); },
    async letters(id) { return (await must(db.from('letters').select('*').eq('child_id', id).order('created_at', { ascending: false }).limit(100))) || []; },
    async reply(letterId, text, nikud) { await must(db.from('letters').update({ reply: text, reply_nikud: nikud, replied_at: new Date().toISOString(), reply_seen: false }).eq('id', letterId)); },
    async lifelines(ids, openOnly = false) {
      if (!ids.length) return [];
      let q = db.from('lifelines').select('*').in('child_id', ids).order('created_at', { ascending: false }).limit(50);
      if (openOnly) q = q.eq('status', 'open');
      return (await must(q)) || [];
    },
    async answerLifeline(id, text, nikud) { await must(db.from('lifelines').update({ answer: text, answer_nikud: nikud, status: 'answered', answered_at: new Date().toISOString() }).eq('id', id)); },
    async riddles(id) { return (await must(db.from('riddles').select('*').eq('child_id', id).order('created_at', { ascending: false }))) || []; },
    async addRiddle(childId, r) { await must(db.from('riddles').insert({ child_id: childId, ...r })); },
    async archiveRiddle(id) { await must(db.from('riddles').update({ status: 'archived' }).eq('id', id)); },
    async saveSettings(childId, settings) { await must(db.from('children').update({ settings }).eq('id', childId)); },
    live(onChange) {
      const ch = db.channel('admin-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'lifelines' }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'redemptions' }, onChange)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'letters' }, onChange)
        .subscribe();
      return () => { db.removeChannel(ch); };
    },
    async signOut() { await db.auth.signOut(); },
  };
}

function demoApi(): AdminApi {
  const d = () => demoData();
  const upd = (fn: (x: Row) => void) => { const x = demoData(); fn(x); saveDemoData(x); };
  const now = () => new Date().toISOString();
  return {
    demo: true,
    async me() { return { email: 'הדגמה' }; },
    async children() { return [{ ...d().child, grade: 3, intake: {} }]; },
    async child() { return { ...d().child, grade: 3, intake: {} }; },
    async state() { return d().state; },
    async events() { return [...d().events].reverse().slice(0, 30); },
    async ledger() { return [...d().ledger].reverse(); },
    async redemptions(_ids, pendingOnly) { const r = [...d().redemptions].reverse(); return pendingOnly ? r.filter((x: Row) => x.status === 'pending') : r; },
    async decide(id, approve) { upd(x => { const r = x.redemptions.find((y: Row) => y.id === id); if (r && r.status === 'pending') { r.status = approve ? 'approved' : 'declined'; r.decided_at = now(); if (approve) x.ledger.push({ delta: -r.tickets, reason: 'מימוש', created_at: now() }); } }); },
    async grant(_c, n, reason) { upd(x => x.ledger.push({ delta: n, reason, created_at: now() })); },
    async letters() { return [...d().letters].reverse(); },
    async reply(id, text, nikud) { upd(x => { const l = x.letters.find((y: Row) => y.id === id); if (l) { l.reply = text; l.reply_nikud = nikud; l.replied_at = now(); l.reply_seen = false; } }); },
    async lifelines(_ids, openOnly) { const r = [...d().lifelines].reverse(); return openOnly ? r.filter((x: Row) => x.status === 'open') : r; },
    async answerLifeline(id, text, nikud) { upd(x => { const l = x.lifelines.find((y: Row) => y.id === id); if (l) { l.answer = text; l.answer_nikud = nikud; l.status = 'answered'; l.answered_at = now(); } }); },
    async riddles() { return [...d().riddles].reverse(); },
    async addRiddle(_c, r) { upd(x => x.riddles.push({ id: Math.random().toString(36).slice(2), status: 'active', created_at: now(), ...r })); },
    async archiveRiddle(id) { upd(x => { const r = x.riddles.find((y: Row) => y.id === id); if (r) r.status = 'archived'; }); },
    async saveSettings(_c, settings) { upd(x => { x.child.settings = settings; }); },
    live(onChange) { const t = setInterval(onChange, 3000); return () => clearInterval(t); },
    async signOut() {},
  };
}

export const api = (): AdminApi => (DEMO ? demoApi() : cloudApi());

/** ניקוד אוטומטי לטקסט שההורה כותב (דרך השרת) */
export async function vowelize(text: string): Promise<string> {
  try {
    const r = await fetch('/api/nikud', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) });
    if (!r.ok) return text;
    const j = await r.json();
    return j.nikud || text;
  } catch { return text; }
}

export const fmtTime = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso), diff = (Date.now() - d.getTime()) / 60000;
  if (diff < 1) return 'עכשיו';
  if (diff < 60) return `לפני ${Math.round(diff)} דק׳`;
  if (diff < 60 * 24) return `לפני ${Math.round(diff / 60)} שע׳`;
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }) + ' ' + d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
};
