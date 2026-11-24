'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEMO, sb } from '@/lib/supabase/client';
import { api } from '@/lib/admin';
import { Logo } from '@/components/Art';
import { PENDING_KEY, createFamilyFromIntake } from '@/components/Wizard';
import { scene } from '@/lib/game/art.js';

/* מסך הבית:
   לא מחובר → דף נחיתה להורים
   מחובר → המכשיר של הילד נפתח ישר למשחק, המכשיר של ההורה לאזור ההורים */
export default function Home() {
  const router = useRouter();
  const [view, setView] = useState<'loading' | 'landing' | 'choose'>('loading');
  const [kidId, setKidId] = useState('demo');

  useEffect(() => {
    (async () => {
      let role: string | null = null, kid: string | null = null, pending: string | null = null;
      try { role = localStorage.getItem('deviceRole'); kid = localStorage.getItem('kidMode'); pending = localStorage.getItem(PENDING_KEY); } catch {}
      if (DEMO) {
        if (role === 'kid') { router.replace('/play/demo'); return; }
        if (role === 'admin') { router.replace('/admin'); return; }
        setView('landing'); return;
      }
      const { data } = await sb().auth.getUser();
      if (!data.user) { setView('landing'); return; }
      let kids = await api().children();
      if (!kids.length && pending) {
        // השאלון מולא לפני אישור המייל – משלימים עכשיו
        try { const id = await createFamilyFromIntake(JSON.parse(pending)); localStorage.removeItem(PENDING_KEY); localStorage.setItem('kidMode', id); kids = await api().children(); } catch {}
      }
      if (!kids.length) { router.replace('/onboarding'); return; }
      if (role === 'kid') { router.replace('/play/' + (kids.find(k => k.id === kid)?.id || kids[0].id)); return; }
      if (role === 'admin') { router.replace('/admin'); return; }
      setKidId(kids.length === 1 ? kids[0].id : '');
      setView('choose');
    })();
  }, [router]);

  const choose = (role: 'kid' | 'admin') => { try { localStorage.setItem('deviceRole', role); } catch {} };

  if (view === 'loading') return <div className="a-auth"><Logo /></div>;

  if (view === 'choose') return (
    <div className="a-auth">
      <div className="a-auth-card">
        <Logo />
        <h1>שומרי הזמן</h1>
        <div className="a-sub">של מי המכשיר הזה?</div>
        <div className="a-choice">
          <a href={kidId ? `/play/${kidId}` : '/play'} onClick={() => choose('kid')}><span className="e">🎮</span><span><b>המכשיר של הילד</b>ייפתח ישר למשחק</span></a>
          <a href="/admin" onClick={() => choose('admin')}><span className="e">🛠️</span><span><b>המכשיר של ההורה</b>אזור הורים, התראות, תשובות לגלגל ההצלה</span></a>
        </div>
      </div>
    </div>
  );

  return (
    <div className="lp">
      <div className="lp-wrap">
        <div className="lp-top"><Logo size={48} /><a href="/login">כניסת הורים</a></div>
        <div className="lp-hero">
          <div>
            <h1>הילד שלך לא אוהב לקרוא?<br />הוא פשוט עוד לא מצא את הסיפור הנכון.</h1>
            <p>שומרי הזמן הוא משחק הרפתקאות שבו הקריאה היא הדרך היחידה להציל את ההיסטוריה. משימות קצרות, טקסט מנוקד, הצלחה בכל צעד, ואתם בתוך המשחק.</p>
            <a className="lp-cta" href="/start">בואו נתחיל ✨</a>
            <span className="lp-small">שתי דקות של הרשמה · מתאים לכיתות א׳–ד׳ · מחשב וטאבלט</span>
          </div>
          <div className="lp-art">
            <div dangerouslySetInnerHTML={{ __html: scene('library', { eraser: true }) }} style={{ height: '100%' }} />
            <div className="lp-bubble"><img src="/guide/yuval.jpg" alt="יובל" /><span>&quot;מִישֶׁהוּ מוֹחֵק דַּפִּים מִסֵּפֶר הַזְּמַן... אֲנִי צָרִיךְ אֶת הָעֶזְרָה שֶׁלְּךָ!&quot;</span></div>
          </div>
        </div>
        <div className="lp-feats">
          <div className="lp-feat"><div className="e">📖</div><b>קורא בלי לשים לב</b><span>סיפורים אמיתיים מההיסטוריה, 2–3 משפטים בכל מסך, הכול מנוקד. בלי הקראה, כי המטרה שיקרא בעצמו.</span></div>
          <div className="lp-feat"><div className="e">🎯</div><b>מצליח כל הזמן</b><span>משימות של 4 דקות, רמזים במקום כישלון, ופרסים קטנים בעולם האמיתי שאתם מאשרים.</span></div>
          <div className="lp-feat"><div className="e">📞</div><b>אתם בתוך המשחק</b><span>הוא &quot;מתקשר&quot; אליכם כשהוא נתקע, אתם שולחים חידות ועונים למכתבים שלו, ומקבלים התראה לטלפון.</span></div>
        </div>
      </div>
    </div>
  );
}
