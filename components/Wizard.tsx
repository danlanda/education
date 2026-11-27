'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEMO, sb } from '@/lib/supabase/client';
import { Logo } from '@/components/Art';

/* אונבורדינג להורה: קודם מספרים על הילד, ורק בסוף פותחים חשבון.
   withAccount=false כשההורה כבר מחובר (למשל מוסיף ילד נוסף). */

const INTERESTS = [
  { k: 'היסטוריה', e: '🏛️' }, { k: 'הרפתקאות', e: '🗺️' }, { k: 'גיבורי על', e: '🦸' }, { k: 'חלל', e: '🚀' },
  { k: 'חיות', e: '🦁' }, { k: 'ספורט', e: '⚽' }, { k: 'מדע והמצאות', e: '🔬' }, { k: 'אגדות וקסמים', e: '🧙' },
];
const READING = [
  { k: 'עוד לומד את האותיות', e: '🔤', d: 'מזהה חלק מהאותיות' },
  { k: 'קורא עם ניקוד, לאט', e: '🐢', d: 'מפענח מילה אחרי מילה' },
  { k: 'קורא עם ניקוד, בשטף', e: '🐇', d: 'קורא משפטים בקלות' },
  { k: 'קורא בלי ניקוד', e: '🚀', d: 'קורא ספרים לבד' },
];
const CHALLENGES = ['קריאה', 'הבנת הנקרא', 'כתיבה', 'חשבון', 'ריכוז', 'מוטיבציה'];
const HELPERS: Record<string, string> = { 'אבא': 'אַבָּא', 'אמא': 'אִמָּא', 'סבא': 'סַבָּא', 'סבתא': 'סַבְתָּא' };
const GRADES = ['א', 'ב', 'ג', 'ד', 'ה', 'ו'];
export const PENDING_KEY = 'pendingIntake';

type Data = { name: string; grade: number; interests: string[]; reading: string; challenges: string[]; ticketMinutes: number; helper: string; notes: string; kinderMinutes?: number };

export async function createFamilyFromIntake(d: Data): Promise<string> {
  const { data, error } = await sb().rpc('create_family_with_child', {
    p_family_name: '', p_child_name: d.name.trim(), p_grade: d.grade,
    p_intake: d.grade === 0 ? { stage: 'gan', reading: 'עוד לומד את האותיות', interests: d.interests, notes: d.notes, filled_at: new Date().toISOString() }
      : { reading: d.reading, interests: d.interests, challenges: d.challenges, notes: d.notes, filled_at: new Date().toISOString() },
    p_settings: d.grade === 0 ? { mode: 'kinder', kinderMinutes: d.kinderMinutes || 20, helperName: HELPERS[d.helper] || d.helper }
      : { helperName: HELPERS[d.helper] || d.helper, ticketMinutes: d.ticketMinutes },
  });
  if (error) throw error;
  return String(data);
}

export default function Wizard({ withAccount }: { withAccount: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Data>({ name: '', grade: 3, interests: [], reading: READING[1].k, challenges: [], ticketMinutes: 5, helper: 'אבא', notes: '' });
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false), [err, setErr] = useState(''), [waitEmail, setWaitEmail] = useState(false);
  const [childId, setChildId] = useState('');
  const set = (p: Partial<Data>) => setD({ ...d, ...p });
  const toggle = (k: 'interests' | 'challenges', v: string) => set({ [k]: d[k].includes(v) ? d[k].filter(x => x !== v) : [...d[k], v] } as Partial<Data>);
  const he = d.name.trim() || 'הוא';

  const gan = d.grade === 0;   // גן חובה: משחק אחר לגמרי (אותיות וחשבון בקול), בלי שאלון קריאה ופרסים
  const steps = gan ? ['child', 'gan', ...(withAccount && !DEMO ? ['account'] : []), 'done'] : ['child', 'interests', 'reading', 'rewards', ...(withAccount && !DEMO ? ['account'] : []), 'done'];
  const cur = steps[step];
  const next = () => { setErr(''); setStep(s => s + 1); window.scrollTo(0, 0); };
  const back = () => { setErr(''); setStep(s => Math.max(0, s - 1)); };

  async function finishWithoutAccount() {
    setBusy(true); setErr('');
    try {
      if (DEMO) setChildId(d.grade === 0 ? 'gan' : 'demo'); else setChildId(await createFamilyFromIntake(d));
      next();
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }
  async function signUp(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const { data, error } = await sb().auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + '/' } });
      if (error) throw error;
      if (!data.session) {
        // צריך לאשר מייל – שומרים את השאלון ונשלים אותו אחרי ההתחברות
        localStorage.setItem(PENDING_KEY, JSON.stringify(d)); setWaitEmail(true); setBusy(false); return;
      }
      setChildId(await createFamilyFromIntake(d));
      next();
    } catch (e2) {
      const m = (e2 as Error).message || '';
      setErr(m.includes('already registered') ? 'האימייל הזה כבר רשום. אפשר להתחבר במקום זה.' : m.includes('least 6') ? 'הסיסמה צריכה להיות לפחות 6 תווים' : m);
    }
    setBusy(false);
  }
  const goPlay = () => { try { localStorage.setItem('deviceRole', 'kid'); localStorage.setItem('kidMode', childId); } catch {} router.push('/play/' + childId); };
  const goAdmin = () => { try { localStorage.setItem('deviceRole', 'admin'); } catch {} router.push('/admin'); };

  return (
    <div className="a-auth">
      <div className="a-auth-card w-card">
        <div className="w-dots">{steps.map((s, i) => <i key={s} className={i <= step ? 'on' : ''} />)}</div>

        {cur === 'child' && <>
          <div className="w-emoji">👋</div>
          <h1>מי הגיבור שלנו?</h1>
          <div className="a-sub">נבנה לו הרפתקה משלו. זה ייקח שתי דקות.</div>
          <label className="a-label">השם שלו</label>
          <input className="a-input w-big" autoFocus value={d.name} onChange={e => set({ name: e.target.value })} placeholder="למשל: איתי" />
          <label className="a-label">באיזו כיתה?</label>
          <div className="w-grades"><button type="button" className={'w-grade wide' + (d.grade === 0 ? ' on' : '')} onClick={() => set({ grade: 0 })}>גן חובה</button>
            {GRADES.map((g, i) => <button key={g} type="button" className={'w-grade' + (d.grade === i + 1 ? ' on' : '')} onClick={() => set({ grade: i + 1 })}>{g}׳</button>)}</div>
          {d.grade === 0 && <div className="a-help" style={{ textAlign: 'center' }}>🐣 לגן חובה יש משחק מיוחד: אותיות וחשבון ראשון, הכול בקול ובתמונות – בלי צורך לקרוא.</div>}
          <button className="a-btn block gold w-next" disabled={!d.name.trim()} onClick={next}>המשך ←</button>
        </>}

        {cur === 'interests' && <>
          <div className="w-emoji">✨</div>
          <h1>מה {he} הכי אוהב?</h1>
          <div className="a-sub">אפשר לבחור כמה. נבנה את הסיפורים סביב זה.</div>
          <div className="w-tiles">{INTERESTS.map(x => (
            <button key={x.k} type="button" className={'w-tile' + (d.interests.includes(x.k) ? ' on' : '')} onClick={() => toggle('interests', x.k)}><span>{x.e}</span>{x.k}</button>))}</div>
          <div className="w-nav"><button className="a-btn light" onClick={back}>→ חזרה</button><button className="a-btn gold" disabled={!d.interests.length} onClick={next}>המשך ←</button></div>
        </>}

        {cur === 'gan' && <>
          <div className="w-emoji">🦉</div>
          <h1>המשחק של {he} בגן</h1>
          <div className="a-sub">הוּפִּי הינשוף מדבר אליו ומלמד אותיות וחשבון ראשון: בלונים, ציור אותיות, ספירה, האכלת דרקון ומדבקות לאלבום. הוא משחק לבד, בלי לקרוא.</div>
          <label className="a-label">כמה זמן ביום? (אחר כך הינשוף הולך לישון)</label>
          <div className="w-grades">{[10, 15, 20, 30].map(m => <button key={m} type="button" className={'w-grade wide' + ((d.kinderMinutes || 20) === m ? ' on' : '')} onClick={() => set({ kinderMinutes: m })}>{m} דק׳</button>)}</div>
          <div className="a-help" style={{ textAlign: 'center' }}>🔊 חשוב: הקול. בטלפון או בטאבלט – להגביר את הווליום. אפשר לשנות הכול אחר כך.</div>
          {err && <div className="a-msg a-err">{err}</div>}
          <div className="w-nav"><button className="a-btn light" onClick={back}>→ חזרה</button>
            {steps.includes('account') ? <button className="a-btn gold" onClick={next}>המשך ←</button>
              : <button className="a-btn gold" disabled={busy} onClick={finishWithoutAccount}>{busy ? '...' : 'סיימנו! ✨'}</button>}</div>
        </>}

        {cur === 'reading' && <>
          <div className="w-emoji">📖</div>
          <h1>איך {he} קורא היום?</h1>
          <div className="a-sub">אין תשובה לא נכונה. המשחק יתאים את עצמו.</div>
          <div className="w-list">{READING.map(x => (
            <button key={x.k} type="button" className={'w-row' + (d.reading === x.k ? ' on' : '')} onClick={() => set({ reading: x.k })}><span className="e">{x.e}</span><span><b>{x.k}</b><small>{x.d}</small></span></button>))}</div>
          <label className="a-label">במה הכי קשה לו? (לא חובה)</label>
          <div className="a-chips">{CHALLENGES.map(c => <button key={c} type="button" className={'a-chip' + (d.challenges.includes(c) ? ' on' : '')} onClick={() => toggle('challenges', c)}>{c}</button>)}</div>
          <div className="w-nav"><button className="a-btn light" onClick={back}>→ חזרה</button><button className="a-btn gold" onClick={next}>המשך ←</button></div>
        </>}

        {cur === 'rewards' && <>
          <div className="w-emoji">🎟️</div>
          <h1>פרסים קטנים, הרבה הצלחות</h1>
          <div className="a-sub">על כל דף ש{he} מציל הוא מקבל כרטיס. כמה זמן מסך שווה כרטיס?</div>
          <div className="w-grades">{[5, 10, 15].map(m => <button key={m} type="button" className={'w-grade wide' + (d.ticketMinutes === m ? ' on' : '')} onClick={() => set({ ticketMinutes: m })}>{m} דק׳</button>)}</div>
          <div className="a-help" style={{ textAlign: 'center' }}>הוא מבקש לממש, ואתה מאשר בלחיצה. אפשר לשנות הכול אחר כך.</div>
          <label className="a-label" style={{ marginTop: 18 }}>📞 כשהוא נתקע, למי הוא &quot;מתקשר&quot;?</label>
          <div className="w-grades">{Object.keys(HELPERS).map(h => <button key={h} type="button" className={'w-grade wide' + (d.helper === h ? ' on' : '')} onClick={() => set({ helper: h })}>{h}</button>)}</div>
          <div className="a-help" style={{ textAlign: 'center' }}>תקבל התראה לטלפון עם השאלה, ותשלח לו רמז. הוא יראה אותו מנוקד.</div>
          {err && <div className="a-msg a-err">{err}</div>}
          <div className="w-nav"><button className="a-btn light" onClick={back}>→ חזרה</button>
            {steps.includes('account') ? <button className="a-btn gold" onClick={next}>המשך ←</button>
              : <button className="a-btn gold" disabled={busy} onClick={finishWithoutAccount}>{busy ? '...' : 'סיימנו! ✨'}</button>}</div>
        </>}

        {cur === 'account' && (waitEmail ? <>
          <div className="w-emoji">📬</div>
          <h1>כמעט סיימנו!</h1>
          <div className="a-sub">שלחנו לך מייל לאישור ל-<b dir="ltr">{email}</b>.<br />לחץ על הקישור שבמייל, והמשחק של {he} יחכה לך מוכן.</div>
        </> : <form onSubmit={signUp}>
          <div className="w-emoji">🔐</div>
          <h1>אחרון: חשבון הורה</h1>
          <div className="a-sub">כדי לשמור את ההתקדמות של {he}, ולשלוח לך התראות.</div>
          <label className="a-label">אימייל</label>
          <input className="a-input" type="email" dir="ltr" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          <label className="a-label">סיסמה (לפחות 6 תווים)</label>
          <input className="a-input" type="password" dir="ltr" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
          {err && <div className="a-msg a-err">{err}</div>}
          <div className="w-nav"><button type="button" className="a-btn light" onClick={back}>→ חזרה</button><button className="a-btn gold" disabled={busy}>{busy ? '...' : 'יצירת חשבון ✨'}</button></div>
          <div className="a-help" style={{ textAlign: 'center', marginTop: 12 }}>כבר רשום? <a href="/login">כניסה</a></div>
        </form>)}

        {cur === 'done' && <>
          <div className="w-emoji">🎉</div>
          <h1>ההרפתקה של {he} מוכנה!</h1>
          <div className="a-sub">עכשיו הרגע הכי חשוב: הפעם הראשונה.</div>
          <div className="w-tips">
            <div>🛋️ <span>שבו ביחד, בלי לחץ. 10–15 דקות זה מושלם.</span></div>
            <div>📖 <span>תנו לו לקרוא לבד. אם הוא נתקע, יש רמזים, וגם &quot;טלפון ל{d.helper}&quot;.</span></div>
            <div>🌙 <span>כל יום נפתחים 2 דפים חדשים. כשהם נגמרים, הוא יחכה למחר. זה בכוונה.</span></div>
          </div>
          <button className="a-btn block gold w-next" onClick={goPlay}>🎮 {d.name.trim() ? `${d.name.trim()} משחק` : 'מתחילים לשחק'} במכשיר הזה</button>
          <div style={{ height: 10 }} />
          <button className="a-btn block light" onClick={goAdmin}>📱 זה הטלפון שלי: לאזור ההורים ולהפעלת התראות</button>
          <div className="a-help" style={{ textAlign: 'center', marginTop: 10 }}>במכשיר של הילד: פשוט נכנסים לאתר עם אותו משתמש ובוחרים &quot;המכשיר של הילד&quot;.</div>
        </>}
      </div>
    </div>
  );
}
