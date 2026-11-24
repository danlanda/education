'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEMO, sb } from '@/lib/supabase/client';
import { Logo } from '@/components/Art';

/* שאלון פתיחה להורה (גרסה ראשונה של "אינטייק").
   התשובות נשמרות, ובהמשך ישמשו לבניית משחק מותאם לכל ילד. */
const INTERESTS = ['היסטוריה', 'הרפתקאות', 'גיבורי על', 'חלל', 'חיות', 'ספורט', 'מדע והמצאות', 'אגדות'];
const CHALLENGES = ['קריאה (פענוח)', 'הבנת הנקרא', 'כתיבה', 'חשבון', 'ריכוז', 'מוטיבציה'];
const READING = ['עוד לומד את האותיות', 'קורא עם ניקוד, לאט', 'קורא עם ניקוד, בשטף', 'קורא בלי ניקוד'];
const HELPERS: Record<string, string> = { 'אבא': 'אַבָּא', 'אמא': 'אִמָּא', 'סבא': 'סַבָּא', 'סבתא': 'סַבְתָּא' };

export default function Onboarding() {
  const router = useRouter();
  const [family, setFamily] = useState('');
  const [name, setName] = useState('');
  const [grade, setGrade] = useState(3);
  const [reading, setReading] = useState(READING[1]);
  const [interests, setInterests] = useState<string[]>(['היסטוריה', 'הרפתקאות']);
  const [challenges, setChallenges] = useState<string[]>(['קריאה (פענוח)', 'כתיבה']);
  const [helper, setHelper] = useState('אבא');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const toggle = (arr: string[], set: (x: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (DEMO) { router.push('/play/demo'); return; }
    setBusy(true); setErr('');
    const { data, error } = await sb().rpc('create_family_with_child', {
      p_family_name: family, p_child_name: name.trim(), p_grade: grade,
      p_intake: { reading, interests, challenges, notes, filled_at: new Date().toISOString() },
      p_settings: { helperName: HELPERS[helper] || helper },
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    try { localStorage.setItem('kidMode', String(data)); } catch {}
    router.replace('/admin');
  }

  const Chips = ({ list, value, set }: { list: string[]; value: string[]; set: (x: string[]) => void }) => (
    <div className="a-chips">{list.map(v => <button type="button" key={v} className={'a-chip' + (value.includes(v) ? ' on' : '')} onClick={() => toggle(value, set, v)}>{v}</button>)}</div>
  );

  return (
    <div className="a-auth">
      <form className="a-auth-card" style={{ maxWidth: 560 }} onSubmit={submit}>
        <Logo />
        <h1>ספר לנו על הילד</h1>
        <div className="a-sub">לפי זה נתאים לו את המשחק. אפשר לשנות הכול אחר כך.</div>

        <label className="a-label">שם המשפחה</label>
        <input className="a-input" value={family} onChange={e => setFamily(e.target.value)} placeholder="למשל: משפחת לנדא" />
        <label className="a-label">שם הילד</label>
        <input className="a-input" required value={name} onChange={e => setName(e.target.value)} />
        <label className="a-label">כיתה</label>
        <select className="a-select" value={grade} onChange={e => setGrade(+e.target.value)}>
          {[1, 2, 3, 4, 5, 6].map(g => <option key={g} value={g}>כיתה {'אבגדהו'[g - 1]}׳</option>)}
        </select>
        <label className="a-label">איך הוא קורא היום?</label>
        <select className="a-select" value={reading} onChange={e => setReading(e.target.value)}>{READING.map(r => <option key={r}>{r}</option>)}</select>
        <label className="a-label">מה מעניין אותו?</label>
        <Chips list={INTERESTS} value={interests} set={setInterests} />
        <label className="a-label">במה הוא מתקשה?</label>
        <Chips list={CHALLENGES} value={challenges} set={setChallenges} />
        <label className="a-label">מי יענה לו ב&quot;טלפון לחבר&quot;?</label>
        <div className="a-chips">{Object.keys(HELPERS).map(h => <button type="button" key={h} className={'a-chip' + (helper === h ? ' on' : '')} onClick={() => setHelper(h)}>{h}</button>)}</div>
        <label className="a-label">עוד משהו שחשוב שנדע?</label>
        <textarea className="a-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="למשל: אוהב סיפורים מצחיקים, מתעייף אחרי 10 דקות..." />
        {err && <div className="a-msg a-err">{err}</div>}
        <div style={{ height: 14 }} />
        <button className="a-btn block gold" disabled={busy || !name.trim()}>{busy ? '...' : 'יוצאים לדרך! ✨'}</button>
      </form>
    </div>
  );
}
