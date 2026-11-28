'use client';
import { useEffect } from 'react';

/* אם משהו נשבר (למשל: המשחק התעדכן בזמן שהדף היה פתוח) – טוענים מחדש לבד פעם אחת, ואם לא עזר – כפתור גדול "לנסות שוב" */
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    try {
      const k = 'autoReloadAt', last = +(sessionStorage.getItem(k) || 0);
      if (Date.now() - last > 60000) { sessionStorage.setItem(k, String(Date.now())); location.reload(); }
    } catch { /* */ }
  }, [error]);
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#140f33', color: '#fff', textAlign: 'center', padding: 24, fontFamily: 'Rubik, sans-serif' }}>
      <div>
        <div style={{ fontSize: 64 }}>📖</div>
        <h1 style={{ fontSize: 26, margin: '8px 0 16px' }}>אוּפְּס! הַסֵּפֶר נִסְגַּר לְרֶגַע</h1>
        <button onClick={() => { try { sessionStorage.removeItem('autoReloadAt'); } catch { /* */ } location.reload(); }}
          style={{ fontSize: 24, fontWeight: 700, padding: '14px 32px', borderRadius: 18, border: 0, background: '#2fcf6f', color: '#fff', cursor: 'pointer' }}>▶ לִפְתֹּחַ שׁוּב</button>
      </div>
    </div>
  );
}
