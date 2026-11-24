'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEMO, sb } from '@/lib/supabase/client';
import { api } from '@/lib/admin';
import { Logo } from '@/components/Art';

/* מסך פתיחה: המכשיר הזה של הילד או של ההורה? */
export default function Home() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [kidId, setKidId] = useState<string>('demo');

  useEffect(() => {
    (async () => {
      let role: string | null = null, kid: string | null = null;
      try { role = localStorage.getItem('deviceRole'); kid = localStorage.getItem('kidMode'); } catch {}
      if (!DEMO) {
        const { data } = await sb().auth.getUser();
        if (!data.user) { router.replace('/login'); return; }
        const kids = await api().children();
        if (!kids.length) { router.replace('/onboarding'); return; }
        setKidId(kids.length === 1 ? kids[0].id : '');
      }
      if (role === 'kid' && kid) { router.replace('/play/' + kid); return; }
      if (role === 'admin') { router.replace('/admin'); return; }
      setReady(true);
    })();
  }, [router]);

  const choose = (role: 'kid' | 'admin') => { try { localStorage.setItem('deviceRole', role); } catch {} };
  if (!ready) return <div className="a-auth"><Logo /></div>;
  return (
    <div className="a-auth">
      <div className="a-auth-card">
        <Logo />
        <h1>שומרי הזמן</h1>
        <div className="a-sub">של מי המכשיר הזה?</div>
        {DEMO && <div className="a-msg">מצב הדגמה: עדיין לא מחובר למסד נתונים. הכול נשמר בדפדפן הזה בלבד.</div>}
        <div className="a-choice">
          <a href={kidId ? `/play/${kidId}` : '/play'} onClick={() => choose('kid')}><span className="e">🎮</span><span><b>המכשיר של הילד</b>ייפתח ישר למשחק</span></a>
          <a href="/admin" onClick={() => choose('admin')}><span className="e">🛠️</span><span><b>המכשיר של ההורה</b>אזור הורים, התראות, תשובות לגלגל ההצלה</span></a>
        </div>
      </div>
    </div>
  );
}
