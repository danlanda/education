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
  const [forgot, setForgot] = useState(false), [pw, setPw] = useState(''), [busy, setBusy] = useState(false), [shown, setShown] = useState('');

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
    const codes = [...new Set(kids.map(k => String(k.settings?.pin || '1234')))].join(' / ');
    // שכחתי את הקוד: מאמתים עם הסיסמה של חשבון ההורה, ומראים את הקוד
    const tryPassword = async () => {
      setBusy(true); setBad(false);
      try {
        if (DEMO) { setShown(codes); return; }
        const { data } = await sb().auth.getUser(), email = data.user?.email;
        const { error } = email ? await sb().auth.signInWithPassword({ email, password: pw }) : { error: new Error('no user') };
        if (error) setBad(true); else setShown(codes);
      } finally { setBusy(false); }
    };
    if (shown) return (
      <div className="a-auth"><div className="a-auth-card">
        <h1>🔓 הקוד שלך</h1><div className="a-sub">קוד ההורים הוא:</div>
        <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: 6, textAlign: 'center', margin: '10px 0' }} dir="ltr">{shown}</div>
        <div className="a-help" style={{ textAlign: 'center' }}>אפשר לשנות אותו באזור ההורים ← הגדרות ← &quot;קוד הורים&quot;.</div>
        <div style={{ height: 12 }} />
        <button className="a-btn block" onClick={() => { try { sessionStorage.setItem('adminUnlocked', '1'); } catch {} setLocked(false); }}>לאזור ההורים</button>
      </div></div>
    );
    if (forgot) return (
      <div className="a-auth"><div className="a-auth-card">
        <h1>🔑 שכחתי את הקוד</h1><div className="a-sub">{DEMO ? 'במצב הדגמה הקוד מוצג מיד.' : 'הכנס את הסיסמה של חשבון ההורה (זו שאיתה נרשמת), ונציג לך את הקוד.'}</div>
        {!DEMO && <input className="a-input" type="password" autoComplete="current-password" value={pw} onChange={e => { setPw(e.target.value); setBad(false); }} onKeyDown={e => e.key === 'Enter' && tryPassword()} placeholder="סיסמת החשבון" />}
        {bad && <div className="a-msg a-err">הסיסמה לא נכונה</div>}
        <div style={{ height: 12 }} />
        <button className="a-btn block" disabled={busy} onClick={tryPassword}>{busy ? '...' : 'הצג את הקוד'}</button>
        <div style={{ height: 8 }} />
        <button className="a-btn light block" onClick={() => { setForgot(false); setBad(false); }}>חזרה</button>
        {!DEMO && <div className="a-help" style={{ textAlign: 'center', marginTop: 10 }}>שכחת גם את הסיסמה? במסך הכניסה יש &quot;שכחתי סיסמה&quot; – נשלח לך מייל.</div>}
      </div></div>
    );
    return (
      <div className="a-auth"><div className="a-auth-card">
        <h1>🔒 אזור הורים</h1><div className="a-sub">הכנס את קוד ההורים</div>
        <input className="a-input" type="password" inputMode="numeric" value={pin} onChange={e => { setPin(e.target.value); setBad(false); }} onKeyDown={e => e.key === 'Enter' && tryPin()} />
        {bad && <div className="a-msg a-err">קוד לא נכון</div>}
        <div style={{ height: 12 }} />
        <button className="a-btn block" onClick={tryPin}>כניסה</button>
        <button className="a-link" style={{ display: 'block', margin: '10px auto 0', background: 'none', border: 0, color: '#6a4bd8', fontSize: 16, textDecoration: 'underline', cursor: 'pointer' }} onClick={() => { setForgot(true); setBad(false); }}>שכחתי את הקוד</button>
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
