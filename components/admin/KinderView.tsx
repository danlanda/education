'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, type Row } from '@/lib/admin';
import { KLETTERS, STICKERS } from '@/lib/game/kinder-data.js';

/* 🐣 אזור הורים לילד בגן חובה: אילו אותיות הוא כבר מכיר, מה רמת החשבון, כמה שיחק היום, והגדרות פשוטות */
const MATH_TEXT = ['', 'סופר עד 3', 'סופר עד 5', 'סופר עד 7 ומשווה "איפה יותר"', 'סופר עד 10', 'חיבור עד 5 (עם תמונות)', 'חיבור עד 10 (עם תמונות)'];
const ACT_TEXT: Record<string, string> = {
  balloons: '🎈 בלוני אותיות', first: '🔤 באיזו אות מתחילה המילה', trace: '✍️ ציור אות', memory: '🃏 זוגות אות-תמונה',
  count: '🔢 ספירה', feed: '🐲 להאכיל את הדרקון', numpop: '🎈 בלוני מספרים', more: '⚖️ איפה יותר', add: '➕ חיבור',
};
const known = (st?: Row) => !!st && st.ok >= 3 && st.win?.length >= 4 && st.win.slice(-6).reduce((a: number, b: number) => a + b, 0) / Math.min(6, st.win.length) >= .7;

export default function KinderView({ child }: { child: Row }) {
  const [d, setD] = useState<Row | null>(null);
  const [settings, setSettings] = useState<Row>({ kinderMinutes: 20, ...(child.settings || {}) });
  const [msg, setMsg] = useState('');
  const load = useCallback(async () => {
    const a = api(); const [state, events] = await Promise.all([a.state(child.id), a.events(child.id, 60)]);
    setD({ state, events });
  }, [child.id]);
  useEffect(() => { load(); return api().live(load); }, [load]);
  if (!d) return <div className="a-card">טוען…</div>;
  const k: Row = d.state?.kd || {}, letters: string[] = k.letters || [], stat: Row = k.stat || {};
  const today = k.day && k.day.d === new Date().toDateString() ? k.day : { secs: 0, acts: 0 };
  const acts = (d.events as Row[]).filter(e => e.type === 'kd_act').slice(0, 10);
  const save = async (s: Row) => { setSettings(s); await api().saveSettings(child.id, s); setMsg('נשמר ✔'); setTimeout(() => setMsg(''), 2500); };
  const knownN = letters.filter(l => known(stat[l])).length;
  return (
    <>
      <div className="a-card"><div className="a-child-card"><span style={{ fontSize: 46 }}>🦉</span><div className="a-grow"><b style={{ fontSize: 22 }}>{child.name}</b>
        <div className="a-help">גן חובה · משחק עם הוּפִּי הינשוף: אותיות וחשבון ראשון, הכול בקול</div></div></div></div>

      <div className="a-card"><h2>📅 היום</h2>
        <div className="a-stats">
          <div className="a-stat"><b>⏱️ {Math.round((today.secs || 0) / 60)} / {settings.kinderMinutes || 20} דק׳</b><span>זמן משחק היום<br />בסוף הזמן הינשוף הולך לישון</span></div>
          <div className="a-stat"><b>🎮 {today.acts || 0}</b><span>משחקונים היום</span></div>
          <div className="a-stat"><b>📒 {(k.stickers || []).length}/{STICKERS.length}</b><span>מדבקות באלבום</span></div>
        </div>
      </div>

      <div className="a-card"><h2>🔤 אותיות</h2>
        <p className="a-help">הוא לומד אות-אות: מתחילים מהאות הראשונה של השם שלו, ואות חדשה נפתחת רק כשהקודמות כבר יושבות טוב. {knownN} אותיות כבר יושבות, {letters.length} נפתחו.</p>
        <div className="a-row" style={{ flexWrap: 'wrap', gap: 6 }}>{(KLETTERS as Row[]).map(L => {
          const open = letters.includes(L.l), ok = known(stat[L.l]), st = stat[L.l];
          return <span key={L.l} title={st ? `${st.ok} נכון · ${st.bad} טעויות` : ''} style={{ width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', fontSize: 24, fontWeight: 900,
            background: ok ? '#d7ffe2' : open ? '#fff3c4' : '#f2f0f7', border: `2px solid ${ok ? '#2fcf6f' : open ? '#ffc928' : '#e4e0ef'}`, color: open ? '#2b1d55' : '#bbb' }}>{L.l}</span>;
        })}</div>
        <div className="a-help" style={{ marginTop: 6 }}>🟩 יודע · 🟨 לומד עכשיו · ⬜ עוד לא נפתחה</div>
      </div>

      <div className="a-card"><h2>🔢 חשבון</h2>
        <div className="a-stats"><div className="a-stat"><b>רמה {k.math || 1}/6</b><span>{MATH_TEXT[k.math || 1]}<br />עולה אחרי שני משחקונים מוצלחים, יורדת כשקשה</span></div></div>
      </div>

      <div className="a-card"><h2>🕹️ מה הוא שיחק לאחרונה</h2>
        {acts.length ? <div className="a-ledger">{acts.map((e, i) => <div key={i}><span>{ACT_TEXT[e.data?.kind] || e.data?.kind} · {e.data?.first}/{e.data?.of} בניסיון ראשון</span>
          <span className="a-help">{new Date(e.created_at).toLocaleString('he-IL', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>)}</div>
          : <p className="a-help">עוד לא שיחק.</p>}
      </div>

      <div className="a-card"><h2>⚙️ הגדרות</h2>
        <label className="a-label">כמה זמן ביום?</label>
        <div className="a-row" style={{ flexWrap: 'wrap', gap: 6 }}>{[10, 15, 20, 30, 45].map(m => <button key={m} className={'a-chip' + ((settings.kinderMinutes || 20) === m ? ' on' : '')} onClick={() => save({ ...settings, kinderMinutes: m })}>{m} דק׳</button>)}</div>
        <label className="a-label"><input type="checkbox" checked={settings.kVoice !== false} onChange={e => save({ ...settings, kVoice: e.target.checked })} /> הינשוף מדבר (מומלץ מאוד – הוא עוד לא קורא)</label>
        <div className="a-help">הקול: אם חובר קול מספר סיפורים – הוא ישמש גם כאן. אחרת – הקול העברי של המכשיר (בטלפונים ובטאבלטים יש כזה; ודאו שהווליום פתוח).</div>
        {msg && <div className="a-msg">{msg}</div>}
      </div>
    </>
  );
}
