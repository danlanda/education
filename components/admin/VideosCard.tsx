'use client';
import { useState } from 'react';
import type { Row } from '@/lib/admin';
import { VIDEOS, TOPICS as TOPICS0, videoKey, ytThumb } from '@/lib/game/videos.js';
const TOPICS = TOPICS0 as Record<string, { title: string }>;

const plain = (s: string) => String(s || '').replace(/[֑-ׇ]/g, '');

/* 🎬 סרטונים בסיפור: ההורה רואה כל סרטון (תצוגה מקדימה) ומאשר. ילד רואה רק מה שאושר */
export default function VideosCard({ settings, save }: { settings: Row; save: (s: Row) => void }) {
  const [preview, setPreview] = useState<Row | null>(null);
  const ok: string[] = settings.videosOk || [], no: string[] = settings.videosNo || [];
  const list = (VIDEOS as Row[]).filter(v => !v.own);
  const pending = list.filter(v => !ok.includes(videoKey(v)) && !no.includes(videoKey(v))).length;
  const set = (v: Row, yes: boolean) => {
    const k = videoKey(v);
    save({ ...settings, videosOk: yes ? [...ok.filter(x => x !== k), k] : ok.filter(x => x !== k), videosNo: yes ? no.filter(x => x !== k) : [...no.filter(x => x !== k), k] });
  };
  const topics = Object.keys(TOPICS).filter(t => list.some(v => v.topic === t));
  return (
    <div className="a-card"><h2>🎬 סרטונים בתוך הסיפור</h2>
      <p className="a-help">פעם-פעמיים בכל גיבור מופיע סרטון קצר על הנושא, בתוך חלון במשחק. כל הסרטונים נבחרו מערוצים חינוכיים מוכרים, אבל <b>הילד רואה רק סרטון שאישרת</b> – תסתכל ותאשר. הנגן נעול: בלי סרטונים מומלצים, בלי כפתורים של יוטיוב, ואי אפשר לצאת ממנו ליוטיוב.</p>
      <label className="a-label"><input type="checkbox" checked={settings.videos !== false} onChange={e => save({ ...settings, videos: e.target.checked })} /> להראות סרטונים (רק מאושרים)</label>
      {pending > 0 && <div className="a-msg" style={{ background: '#fff3c4' }}>⏳ {pending} סרטונים מחכים לאישור שלך</div>}
      {!list.length && <p className="a-help">עוד אין סרטונים ברשימה.</p>}
      {topics.map(t => (
        <div key={t} style={{ marginTop: 12 }}><b>{plain(TOPICS[t].title)}</b>
          {list.filter(v => v.topic === t).map(v => { const k = videoKey(v), st = ok.includes(k) ? 'ok' : no.includes(k) ? 'no' : 'wait';
            return (
              <div key={k} className="a-row" style={{ gap: 10, alignItems: 'center', marginTop: 8, padding: 8, borderRadius: 12, background: st === 'ok' ? '#e9fbef' : st === 'no' ? '#f6f2f2' : '#fffaf0' }}>
                <button onClick={() => setPreview(v)} style={{ border: 0, padding: 0, background: 'none', cursor: 'pointer', position: 'relative' }}>
                  {v.id && <img src={ytThumb(v.id)} alt="" style={{ width: 120, height: 68, objectFit: 'cover', borderRadius: 8, display: 'block' }} />}
                  <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 28, color: '#fff', textShadow: '0 2px 6px #000' }}>▶</span></button>
                <div className="a-grow" style={{ minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{v.title}</div>
                  <div className="a-help">{v.channel} · {v.lang === 'he' ? 'עברית' : 'אנגלית'}{v.minutes ? ` · ${v.minutes} דק׳` : ''}</div>{v.note && <div className="a-help">{v.note}</div>}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <button className={'a-chip' + (st === 'ok' ? ' on' : '')} onClick={() => set(v, true)}>✔ מאשר</button>
                  <button className={'a-chip' + (st === 'no' ? ' on' : '')} onClick={() => set(v, false)}>✖ לא</button>
                </div>
              </div>
            ); })}
        </div>))}
      {preview && (
        <div onClick={() => setPreview(null)} style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,.8)', display: 'grid', placeItems: 'center', padding: 12 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(100%, 800px)', background: '#000', borderRadius: 14, overflow: 'hidden' }}>
            <iframe title="preview" style={{ width: '100%', aspectRatio: '16/9', border: 0, display: 'block' }} allow="autoplay; encrypted-media"
              src={`https://www.youtube-nocookie.com/embed/${preview.id}?rel=0&modestbranding=1&autoplay=1`} />
            <div style={{ display: 'flex', gap: 8, padding: 10, background: '#fff' }}>
              <button className="a-btn" onClick={() => { set(preview, true); setPreview(null); }}>✔ מאשר</button>
              <button className="a-btn light" onClick={() => { set(preview, false); setPreview(null); }}>✖ לא מתאים</button>
              <button className="a-btn light" onClick={() => setPreview(null)}>סגור</button>
            </div>
          </div>
        </div>)}
    </div>
  );
}
