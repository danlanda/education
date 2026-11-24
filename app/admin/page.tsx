'use client';
import { useCallback, useEffect, useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { LifelineCard, RedemptionCard, PushCard } from '@/components/admin/Cards';
import { KeeperHead } from '@/components/Art';
import { api, type Row } from '@/lib/admin';
import { DEFAULT_SETTINGS } from '@/lib/game/content.js';

export default function AdminHome() {
  return <AdminShell title="אזור הורים">{kids => <Dashboard kids={kids} />}</AdminShell>;
}

function Dashboard({ kids }: { kids: Row[] }) {
  const ids = kids.map(k => k.id);
  const [lifelines, setLifelines] = useState<Row[]>([]);
  const [reds, setReds] = useState<Row[]>([]);
  const [info, setInfo] = useState<Record<string, { state: Row; balance: number }>>({});
  const nameOf = (id: string) => kids.find(k => k.id === id)?.name;

  const load = useCallback(async () => {
    const a = api();
    const [ll, rr] = await Promise.all([a.lifelines(ids, true), a.redemptions(ids, true)]);
    setLifelines(ll); setReds(rr);
    const entries = await Promise.all(kids.map(async k => {
      const [state, ledger] = await Promise.all([a.state(k.id), a.ledger(k.id)]);
      return [k.id, { state, balance: ledger.reduce((s: number, r: Row) => s + r.delta, 0) }] as const;
    }));
    setInfo(Object.fromEntries(entries));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(',')]);

  useEffect(() => { load(); return api().live(load); }, [load]);

  const today = new Date().toDateString();
  return (
    <>
      {lifelines.length > 0 && (
        <div className="a-card a-urgent"><h2>📞 מבקש עזרה עכשיו!</h2>
          <div className="a-list">{lifelines.map(r => <LifelineCard key={r.id} row={r} childName={nameOf(r.child_id)} onDone={load} />)}</div></div>
      )}
      {reds.length > 0 && (
        <div className="a-card a-urgent"><h2>🎟️ בקשות לממש פרס</h2>
          <div className="a-list">{reds.map(r => <RedemptionCard key={r.id} row={r} childName={nameOf(r.child_id)} onDone={load} />)}</div></div>
      )}
      <PushCard />
      {kids.map(k => {
        const s = info[k.id]?.state || {}, set = { ...DEFAULT_SETTINGS, ...(k.settings || {}) };
        const t = s.today?.date === today ? s.today : { pages: 0, tickets: 0 };
        const acc = s.tasks ? Math.round((s.firstTry / s.tasks) * 100) : 0;
        return (
          <a key={k.id} href={`/admin/${k.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="a-card">
              <div className="a-child-card" style={{ marginBottom: 12 }}>
                <KeeperHead equipped={s.equipped} />
                <div className="a-grow"><b style={{ fontSize: 20 }}>{k.name}</b><div className="a-help">{s._updated ? 'שיחק לאחרונה ' + new Date(s._updated).toLocaleDateString('he-IL') : 'עוד לא שיחק'}</div></div>
                <span style={{ fontSize: 22 }}>←</span>
              </div>
              <div className="a-stats">
                <div className="a-stat"><b>{t.pages}/{set.dailyGoal}</b><span>משימת היום</span></div>
                <div className="a-stat"><b>🎟️ {info[k.id]?.balance ?? '…'}</b><span>כרטיסים ({(info[k.id]?.balance || 0) * set.ticketMinutes} דק׳)</span></div>
                <div className="a-stat"><b>{(s.done || []).length}</b><span>דפים שהציל</span></div>
                <div className="a-stat"><b>🔥 {s.streak?.count || 0}</b><span>ימים ברצף</span></div>
                <div className="a-stat"><b>{acc}%</b><span>הצלחה בניסיון ראשון</span></div>
                <div className="a-stat"><b>{s.minutes || 0}</b><span>דקות משחק</span></div>
              </div>
            </div>
          </a>
        );
      })}
      <div style={{ textAlign: 'center' }}><a className="a-btn light" style={{ textDecoration: 'none', display: 'inline-block' }} href="/onboarding">➕ הוסף ילד</a></div>
    </>
  );
}
