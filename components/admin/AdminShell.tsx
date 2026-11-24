'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEMO, sb } from '@/lib/supabase/client';
import { api, type Row } from '@/lib/admin';

/* מסגרת אזור ההורים: בדיקת התחברות, נעילה בקוד במכשיר של הילד, וכותרת */
export default function AdminShell({ title, back, children }: { title: string; back?: string; children: (kids: Row[]) => React.ReactNode }) {
  const router = useRouter();
  const [kids, setKids] = useState<Row[] | null>(null);
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState('');
  const [bad, setBad] = useState(false);

  useEffect(() => {
    (async () => {
      if (!DEMO) {
        const { data } = await sb().auth.getUser();
        if (!data.user) { router.replace('/login'); return; }
      }
      const k = await api().children();
      if (!k.length && !DEMO) { router.replace('/onboarding'); return; }
      let isKidDevice = false, unlocked = false;
      try { isKidDevice = localStorage.getItem('deviceRole') === 'kid'; unlocked = sessionStorage.getItem('adminUnlocked') === '1'; } catch {}
      setLocked(isKidDevice && !unlocked);
      setKids(k);
    })();
  }, [router]);

  if (!kids) return <div className="a-page"><div className="a-head"><h1>{title}</h1></div></div>;
  if (locked) {
    const tryPin = () => {
      const ok = kids.some(k => String(k.settings?.pin || '1234') === pin);
      if (ok) { try { sessionStorage.setItem('adminUnlocked', '1'); } catch {} setLocked(false); } else setBad(true);
    };
    return (
      <div className="a-auth"><div className="a-auth-card">
        <h1>🔒 אזור הורים</h1><div className="a-sub">הכנס את קוד ההורים</div>
        <input className="a-input" type="password" inputMode="numeric" value={pin} onChange={e => { setPin(e.target.value); setBad(false); }} onKeyDown={e => e.key === 'Enter' && tryPin()} />
        {bad && <div className="a-msg a-err">קוד לא נכון</div>}
        <div style={{ height: 12 }} />
        <button className="a-btn block" onClick={tryPin}>כניסה</button>
        <div style={{ height: 8 }} />
        <a className="a-btn light block" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }} href="/play">חזרה למשחק</a>
      </div></div>
    );
  }
  return (
    <div className="a-page">
      <div className="a-head">
        {back && <a href={back}>→</a>}
        <h1>{title}</h1>
        <a href={kids.length === 1 ? `/play/${kids[0].id}` : '/play'} onClick={() => { try { sessionStorage.removeItem('adminUnlocked'); } catch {} }}>🎮 למשחק</a>
        {!DEMO && <button onClick={async () => { await api().signOut(); try { localStorage.removeItem('deviceRole'); } catch {} router.replace('/login'); }}>יציאה</button>}
      </div>
      <div className="a-wrap">
        {DEMO && <div className="a-msg">מצב הדגמה – הנתונים נשמרים רק בדפדפן הזה. אחרי החיבור ל-Supabase הכול יעבור לענן.</div>}
        {children(kids)}
      </div>
    </div>
  );
}
