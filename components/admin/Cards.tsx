'use client';
import { useEffect, useState } from 'react';
import { api, vowelize, fmtTime, type Row } from '@/lib/admin';
import { pushStatus, enablePush, testPush, type PushStatus } from '@/lib/push-client';

/* ---------- תיבת תשובה עם ניקוד אוטומטי ---------- */
export function ReplyBox({ quick = [], placeholder, button, onSend }: {
  quick?: string[]; placeholder?: string; button: string; onSend: (text: string, nikud: string) => Promise<void>;
}) {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async (t = text) => {
    if (!t.trim()) return;
    setBusy(true);
    const n = await vowelize(t.trim());
    await onSend(t.trim(), n);
    setText(''); setPreview(''); setBusy(false);
  };
  return (
    <div>
      {quick.length > 0 && <div className="a-chips">{quick.map(q => <button key={q} type="button" className="a-chip" disabled={busy} onClick={() => send(q)}>{q}</button>)}</div>}
      <textarea className="a-textarea" value={text} placeholder={placeholder || 'כתוב כאן (בלי ניקוד – נוסיף אוטומטית)'} onChange={e => { setText(e.target.value); setPreview(''); }} />
      {preview && <div className="a-nikud">{preview}</div>}
      <div className="a-row" style={{ marginTop: 8 }}>
        <button className="a-btn" disabled={busy || !text.trim()} onClick={() => send()}>{busy ? 'שולח...' : button}</button>
        <button className="a-btn light" disabled={busy || !text.trim()} onClick={async () => setPreview(await vowelize(text))}>👁️ איך זה ייראה לו</button>
      </div>
    </div>
  );
}

/* ---------- גלגל הצלה: בקשת עזרה פתוחה ---------- */
const QUICK_HELP = ['תקרא שוב את הסיפור, לאט 😊', 'התשובה נמצאת בשורה האחרונה', 'תקרא את השאלה עוד פעם, מילה אחרי מילה', 'אתה כמעט שם! תחשוב עוד רגע'];
export function LifelineCard({ row, childName, onDone }: { row: Row; childName?: string; onDone: () => void }) {
  const p = row.payload || {};
  const [open, setOpen] = useState(false);
  return (
    <div className="a-item">
      <div className="a-meta">{childName ? childName + ' · ' : ''}{p.levelTitle} · {fmtTime(row.created_at)}</div>
      <div className="a-q">❓ {p.question}</div>
      {p.text && <div className="a-opt">הטקסט: {p.text}</div>}
      {(p.options || []).map((o: string) => <div key={o} className={'a-opt' + (o === p.correct ? ' ok' : '')}>{o === p.correct ? '✔ ' : '• '}{o}</div>)}
      {p.correct && !(p.options || []).length && <div className="a-opt ok">✔ התשובה הנכונה: {p.correct}</div>}
      {p.story?.length > 0 && <div style={{ margin: '6px 0' }}><button className="a-chip" onClick={() => setOpen(!open)}>📖 מה הוא קרא לפני השאלה</button>
        {open && <div className="a-kid">{p.story.join('\n')}</div>}</div>}
      {p.hint && <div className="a-help">רמז מובנה: {p.hint}</div>}
      <div style={{ marginTop: 8 }}>
        <ReplyBox quick={QUICK_HELP} button="שלח לו 📞" placeholder="תן לו רמז – עדיף לא את התשובה עצמה 😉"
          onSend={async (t, n) => { await api().answerLifeline(row.id, t, n); onDone(); }} />
      </div>
    </div>
  );
}

/* ---------- בקשת מימוש כרטיסים ---------- */
export function RedemptionCard({ row, childName, onDone }: { row: Row; childName?: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const decide = async (ok: boolean) => { setBusy(true); await api().decide(row.id, ok); onDone(); };
  return (
    <div className="a-item">
      <div className="a-meta">{childName ? childName + ' · ' : ''}{fmtTime(row.created_at)}</div>
      <div className="a-q">🎟️ {row.tickets} כרטיסים = {row.minutes} דקות מסך</div>
      <div className="a-row" style={{ marginTop: 8 }}>
        <button className="a-btn green" disabled={busy} onClick={() => decide(true)}>✔ מאשר</button>
        <button className="a-btn light" disabled={busy} onClick={() => decide(false)}>לא עכשיו</button>
      </div>
    </div>
  );
}

/* ---------- הפעלת התראות ---------- */
export function PushCard() {
  const [st, setSt] = useState<PushStatus | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { pushStatus().then(setSt).catch(() => setSt('unsupported')); }, []);
  if (!st || st === 'on') return st === 'on' ? (
    <div className="a-card a-good"><div className="a-row"><span className="a-grow">🔔 ההתראות פעילות במכשיר הזה</span><button className="a-btn light" onClick={() => testPush()}>שלח התראת בדיקה</button></div></div>
  ) : null;
  return (
    <div className="a-card">
      <h2>🔔 התראות לטלפון</h2>
      {st === 'not-configured' && <div className="a-help">ההתראות יופעלו אחרי החיבור לשרת (Vercel + Supabase).</div>}
      {st === 'ios-needs-install' && <div className="a-help">באייפון: לחץ על כפתור השיתוף ⬆️ ← &quot;הוסף למסך הבית&quot;, פתח את האפליקציה מהאייקון, וחזור לכאן.</div>}
      {st === 'unsupported' && <div className="a-help">הדפדפן הזה לא תומך בהתראות. נסה מכרום באנדרואיד, או מאייפון אחרי &quot;הוסף למסך הבית&quot;.</div>}
      {st === 'denied' && <div className="a-help">ההתראות חסומות. צריך לאפשר אותן בהגדרות הדפדפן לאתר הזה.</div>}
      {st === 'off' && <>
        <div className="a-help" style={{ marginBottom: 10 }}>תקבל הודעה כשהוא מבקש עזרה, כשהוא רוצה לממש כרטיסים, כשהוא כותב מכתב ועוד.</div>
        <button className="a-btn gold" onClick={async () => { try { setSt(await enablePush()); } catch (e) { setErr((e as Error).message); } }}>הפעל התראות במכשיר הזה</button>
      </>}
      {err && <div className="a-msg a-err">{err}</div>}
    </div>
  );
}
