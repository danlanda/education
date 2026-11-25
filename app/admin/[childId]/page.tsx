'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import { LifelineCard, RedemptionCard, ReplyBox } from '@/components/admin/Cards';
import { KeeperHead } from '@/components/Art';
import { api, vowelize, fmtTime, type Row } from '@/lib/admin';
import { LEVELS, DEFAULT_SETTINGS } from '@/lib/game/content.js';
import { ITEMS as SHOP } from '@/lib/game/avatar.js';
import { JOINT, JOINT_CATS } from '@/lib/game/joint.js';

const NIKUD = /[֑-ׇ]/g;
const plain = (s: string) => String(s || '').replace(NIKUD, '');
const ALL_LEVELS: Row[] = Object.values(LEVELS as Record<string, Row[]>).flat();
// עונות: כל גיבור הוא עונה של כמה פרקים
const SEASONS: { name: string; levels: Row[] }[] = [];
ALL_LEVELS.filter(l => !l.locked).forEach(l => { if (l.chapter || !SEASONS.length) SEASONS.push({ name: plain(l.chapter || l.title), levels: [] }); SEASONS[SEASONS.length - 1].levels.push(l); });
const levelTitle = (id: string) => id === 'practice' ? 'סדנת הכתיבה' : plain(ALL_LEVELS.find(l => l.id === id)?.title || id || '');
const TABS = [
  { id: 'overview', t: 'סקירה' }, { id: 'rewards', t: 'פרסים' }, { id: 'letters', t: 'מכתבים' },
  { id: 'lifeline', t: 'גלגל הצלה' }, { id: 'riddles', t: 'חידות' }, { id: 'settings', t: 'הגדרות' },
];

export default function ChildAdmin() {
  const { childId } = useParams<{ childId: string }>();
  return (
    <AdminShell title="אזור הורים" back="/admin">
      {kids => { const k = kids.find(x => x.id === childId) || kids[0]; return k ? <ChildView child={k} /> : <div className="a-card">לא נמצא</div>; }}
    </AdminShell>
  );
}

function ChildView({ child }: { child: Row }) {
  const [tab, setTab] = useState('overview');
  const [d, setD] = useState<Row | null>(null);
  const [settings, setSettings] = useState<Row>({ ...DEFAULT_SETTINGS, ...(child.settings || {}) });

  useEffect(() => { const t = new URLSearchParams(window.location.search).get('tab'); if (t) setTab(t); }, []);
  const load = useCallback(async () => {
    const a = api(), id = child.id;
    const [state, events, ledger, reds, letters, lifelines, riddles] = await Promise.all([
      a.state(id), a.events(id, 40), a.ledger(id), a.redemptions([id]), a.letters(id), a.lifelines([id]), a.riddles(id),
    ]);
    setD({ state, events, ledger, reds, letters, lifelines, riddles, balance: ledger.reduce((s: number, r: Row) => s + r.delta, 0) });
  }, [child.id]);
  useEffect(() => { load(); return api().live(load); }, [load]);

  if (!d) return <div className="a-card">טוען…</div>;
  const s = d.state || {};
  const badge: Record<string, number> = {
    rewards: d.reds.filter((r: Row) => r.status === 'pending').length,
    letters: d.letters.filter((l: Row) => !l.reply).length,
    lifeline: d.lifelines.filter((l: Row) => l.status === 'open').length,
  };
  return (
    <>
      <div className="a-card"><div className="a-child-card"><KeeperHead equipped={s.equipped} look={s.look} /><div className="a-grow"><b style={{ fontSize: 22 }}>{child.name}</b>
        <div className="a-help">🪙 {s.coins || 0} מטבעות · 🎟️ {d.balance} כרטיסים ({d.balance * settings.ticketMinutes} דק׳)</div></div></div></div>
      <div className="a-tabs">{TABS.map(t => (
        <button key={t.id} className={'a-tab' + (tab === t.id ? ' on' : '')} onClick={() => { setTab(t.id); history.replaceState(null, '', '?tab=' + t.id); }}>
          {t.t}{badge[t.id] ? <span className="a-badge">{badge[t.id]}</span> : null}
        </button>))}</div>
      {tab === 'overview' && <Overview d={d} child={child} settings={settings} setSettings={setSettings} />}
      {tab === 'rewards' && <Rewards d={d} child={child} settings={settings} reload={load} />}
      {tab === 'letters' && <Letters d={d} reload={load} />}
      {tab === 'lifeline' && <Lifelines d={d} reload={load} />}
      {tab === 'riddles' && <Riddles d={d} child={child} reload={load} />}
      {tab === 'settings' && <Settings child={child} settings={settings} setSettings={setSettings} />}
    </>
  );
}

/* 🤝 משימה משותפת: מה הוא קיבל, האם סיים, ואישור עם פתק אישי */
function JointCard({ s, child, settings, setSettings }: { s: Row; child: Row; settings: Row; setSettings: (s: Row) => void }) {
  const [note, setNote] = useState(''), [busy, setBusy] = useState(false);
  const today = new Date().toDateString(), j = s.joint, task: Row | undefined = j && (JOINT as Row[]).find(x => x.id === j.id);
  const helperPlain = plain(settings.helperName || 'אבא');
  const text = (t: string) => plain(t.replace(/\{helper\}/g, helperPlain));
  if (settings.jointTasks === false) return null;
  const approve = async () => {
    setBusy(true);
    const nikud = note.trim() ? await vowelize(note.trim()).catch(() => '') : '';
    const next = { ...settings, jointOk: { id: j.id, at: new Date().toISOString(), note: note.trim() || null, note_nikud: nikud || null } };
    await api().saveSettings(child.id, next); setSettings(next); setNote(''); setBusy(false);
  };
  const giveNow = async () => { const next = { ...settings, jointNow: today }; await api().saveSettings(child.id, next); setSettings(next); };
  const approved = j && settings.jointOk?.id === j.id;
  const doneN = (s.jointDone || []).length;
  return (
    <div className="a-card"><h2>🤝 משימה משותפת (בלי מסך)</h2>
      {!s.feat?.joint && settings.gradual !== false ? <p className="a-help">ייפתח במשחק ביום השלישי שהוא משחק. מדי יומיים הוא יקבל משימה לעשות איתך: לקרוא, לכתוב, לצייר או לבנות משהו יחד.</p>
      : task && j.status !== 'done' && !approved ? <>
        <div className="a-row" style={{ alignItems: 'flex-start', gap: 12 }}>
          <span style={{ fontSize: 40, lineHeight: 1 }}>{task.e}</span>
          <div className="a-grow"><b>{plain(task.title)}</b> <span className="a-help">· {plain((JOINT_CATS as Row)[task.cat].name)}</span>
            <div>{text(task.text)}</div>
            {task.parent && <div className="a-help" style={{ marginTop: 4 }}>💡 {task.parent}</div>}
            <div style={{ marginTop: 6 }}>{j.status === 'asked' ? <b style={{ color: '#b25d00' }}>⏳ הוא סימן שסיימתם – מחכה לאישור שלך</b> : <span className="a-help">קיבל את המשימה {j.at === today ? 'היום' : 'ב-' + new Date(j.at).toLocaleDateString('he-IL')} · עוד לא סימן שסיימתם</span>}</div>
          </div></div>
        <label className="a-label" style={{ marginTop: 10 }}>פתק אישי שיופיע לו עם הפרס (לא חובה)</label>
        <input className="a-input" value={note} onChange={e => setNote(e.target.value)} placeholder="למשל: היה ממש כיף לבנות איתך את האוהל!" />
        <div className="a-row" style={{ marginTop: 10 }}><button className="a-btn gold" disabled={busy} onClick={approve}>✔ עשינו את זה – אשר ותן לו פרס (🎟️ 1 + 40 מטבעות)</button></div>
      </> : <div className="a-row"><span className="a-grow a-help">{approved && j?.status !== 'done' ? '✔ אישרת – הוא יקבל את הפרס בכניסה הבאה למשחק.' : 'אין משימה פתוחה כרגע. המשימה הבאה תגיע לבד בעוד יום-יומיים.'} {doneN ? `עד עכשיו עשיתם יחד ${doneN} משימות 💛` : ''}</span>
        {settings.jointNow !== today && <button className="a-btn" onClick={giveNow}>🎁 תן לו משימה עכשיו</button>}</div>}
    </div>
  );
}

function Overview({ d, child, settings, setSettings }: { d: Row; child: Row; settings: Row; setSettings: (s: Row) => void }) {
  const s = d.state || {}, today = new Date().toDateString();
  const bonus = settings.bonusPages?.date === today ? settings.bonusPages.n || 0 : 0;
  const [busy, setBusy] = useState(false);
  const openPage = async () => {
    setBusy(true);
    const next = { ...settings, bonusPages: { date: today, n: bonus + 1 } };
    await api().saveSettings(child.id, next); setSettings(next); setBusy(false);
  };
  const t = s.today?.date === today ? s.today : { pages: 0, tickets: 0, lifelines: 0 };
  const acc = s.tasks ? Math.round((s.firstTry / s.tasks) * 100) : 0;
  const p = s.practice || {}, pd = p.day?.date === today ? p.day : {};
  const ev = (e: Row) => {
    const x = e.data || {};
    switch (e.type) {
      case 'level_done': return `📖 ${x.replay ? 'שיחק שוב' : 'הציל את'} "${levelTitle(x.level)}" ${'⭐'.repeat(x.stars || 0)} · ${Math.max(1, Math.round((x.seconds || 0) / 60))} דק׳ · ${x.mistakes || 0} טעויות`;
      case 'daily_goal': return '🎯 השלים את משימת היום';
      case 'lifeline': return `📞 ביקש עזרה ב"${levelTitle(x.level)}"`;
      case 'riddle_solved': return `🧩 פתר חידה (${x.tries ? x.tries + ' ניסיונות שגויים' : 'בניסיון ראשון'})`;
      case 'practice_math': return `🧮 סבב חשבון ברמה ${x.level}: ${x.score}/5 בניסיון ראשון${x.newLevel > x.level ? ' · עלה לרמה ' + x.newLevel : x.newLevel < x.level ? ' · ירד לרמה ' + x.newLevel : ''}`;
      case 'practice_write': return `✍️ כתב מכתב בסדנת הכתיבה (${x.words} מילים)`;
      case 'practice_riddle': return `🧩 פתר חידה ממערת החידות${x.tries ? ` (${x.tries} ניסיונות שגויים)` : ''}`;
      case 'practice_riddle_reveal': return '🏳️ ביקש לגלות תשובה לחידה';
      case 'practice_daily': return '🏅 השלים את האימון היומי (+1 🎟️)';
      case 'avatar': return '🧑‍🎨 עיצב את הדמות שלו';
      case 'tutorial_done': return '🎓 סיים את ההדרכה';
      case 'bonus_buy': return `⭐ קנה סיפור בונוס (${x.price} מטבעות)`;
      case 'bonus_read': return `📚 קרא סיפור בונוס עד הסוף`;
      case 'facts_pack': return `🃏 פתח חבילת עובדות מדהימות`;
      case 'read_aloud': return `🔊 קנה הקראה ב"${levelTitle(x.level)}" (${x.cost} מטבעות)`;
      case 'arena': return `🏆 זירת טריוויה ב"${levelTitle(x.level)}": מקום ${x.rank} מתוך 6 (${x.right}/${x.of} נכונות)`;
      case 'feature_unlock': return `🎁 נפתחה הפתעה חדשה במשחק: ${({ owl: 'ינשוף הזמן', practice: 'חדר האימונים', gift: 'מתנה יומית', arena: 'זירת החידון', badges: 'תגים', wheel: 'גלגל המזל', joint: 'משימות משותפות', shield: 'מגן רצף', golden: 'דפי זהב', league: 'ליגות', bonus: 'בונוסים בחנות' } as Row)[x.feature] || x.feature}`;
      case 'owl_hatch': return `🦉 הינשוף בקע${x.name ? ` – קרא לו "${x.name}"` : ''}`;
      case 'owl_stage': return `🦉 הינשוף גדל לשלב ${x.stage + 1} (${x.words} מילים)`;
      case 'badge': return `🏅 קיבל תג חדש`;
      case 'joint_new': return `🤝 קיבל משימה משותפת: "${plain((JOINT as Row[]).find(j => j.id === x.id)?.title || '')}"`;
      case 'joint_ask': return `🙌 סימן שסיימתם את המשימה המשותפת – מחכה לאישור`;
      case 'joint_done': return `🤝 קיבל פרס על משימה משותפת`;
      case 'wheel_earn': return `🎡 הרוויח סיבוב בגלגל המזל`;
      case 'wheel_spin': return `🎡 סובב את גלגל המזל וזכה ב${({ c20: '־20 מטבעות', c50: '־50 מטבעות', c100: '־100 מטבעות', page: 'דף נוסף להיום', item: 'בגד לדמות', golden: 'דף זהב', fact: 'עובדה מדהימה', shield: 'מגן רצף', ticket: 'כרטיס (בתוך המכסה היומית)' } as Row)[x.prize] || x.prize}`;
      case 'daily_gift': return `🎁 פתח מתנה יומית (יום ${x.day})`;
      case 'shield_buy': return `🛡️ קנה מגן רצף`;
      case 'shield_used': return `🛡️ מגן רצף שמר על הרצף`;
      case 'league_up': return `🥉 עלה ליגה בזירה`;
      case 'shop_buy': return `🛍️ קנה ${plain(SHOP.find((i: Row) => i.id === x.item)?.name || '')}`;
      case 'session_start': return '🎮 נכנס למשחק';
      default: return e.type;
    }
  };
  return (
    <>
      <JointCard s={s} child={child} settings={settings} setSettings={setSettings} />
      <div className="a-card"><h2>היום</h2><div className="a-stats">
        <div className="a-stat"><b>{t.pages}/{settings.dailyGoal}</b><span>משימת היום</span></div>
        <div className="a-stat"><b>🎟️ {t.tickets}/{settings.dailyTicketCap}</b><span>כרטיסים היום</span></div>
        <div className="a-stat"><b>📞 {t.lifelines || 0}/{settings.lifelinesPerDay}</b><span>גלגלי הצלה</span></div>
        <div className="a-stat"><b>🔥 {s.streak?.count || 0}</b><span>ימים ברצף</span></div>
        <div className="a-stat"><b>📖 {t.pages}/{settings.pagesPerDay + bonus}</b><span>דפים חדשים היום</span></div>
      </div>
      <div className="a-row" style={{ marginTop: 12 }}>
        <span className="a-grow a-help">כל יום נפתחים {settings.pagesPerDay} דפים חדשים, ואז הוא מקבל &quot;נגמרו הדפים של היום – מחר נפתח דף חדש&quot;. רוצה לפנק?</span>
        <button className="a-btn gold" disabled={busy} onClick={openPage}>📖 פתח לו עוד דף היום</button>
      </div></div>
      <div className="a-card"><h2>בסך הכול</h2><div className="a-stats">
        <div className="a-stat"><b>{(s.done || []).length}</b><span>דפים שהציל</span></div>
        <div className="a-stat"><b>{acc}%</b><span>הצלחה בניסיון ראשון<br />(יעד 70%–85%)</span></div>
        <div className="a-stat"><b>{s.minutes || 0}</b><span>דקות משחק</span></div>
        <div className="a-stat"><b>{(s.cards || []).length}</b><span>קלפים באוסף</span></div>
      </div>
      <h3>חדר האימונים</h3>
      <div className="a-stats">
        <div className="a-stat"><b>🧮 {p.level || '–'}/5</b><span>רמת חשבון<br />(עולה ויורדת לבד)</span></div>
        <div className="a-stat"><b>{p.rounds || 0}</b><span>סבבי חשבון</span></div>
        <div className="a-stat"><b>✍️ {p.writes || 0}</b><span>מכתבים בסדנה</span></div>
        <div className="a-stat"><b>🧩 {(p.solved || []).length}</b><span>חידות שפתר</span></div>
        <div className="a-stat"><b>{pd.math ? '✔' : '○'}{pd.write ? '✔' : '○'}{pd.riddle ? '✔' : '○'}</b><span>אימון יומי היום</span></div>
      </div>
      <h3>העונות</h3>
      <div className="a-levels">{SEASONS.map(se => {
        const n = se.levels.filter(l => (s.done || []).includes(l.id)).length, wins = se.levels.filter(l => s.aluf?.[l.id]).length;
        return <div key={se.name} className={'a-level' + (n === se.levels.length ? ' done' : '')} title={se.levels.map(l => plain(l.title)).join(' · ')}>
          {n === se.levels.length ? '✅' : n ? '📖' : '⬜'} {se.name} · {n}/{se.levels.length}{wins ? ` · 🏆${wins}` : ''}</div>;
      })}</div>
      <h3>מה שגדל איתו</h3>
      <div className="a-stats">
        <div className="a-stat"><b>🦉 {(s.owl?.words || 0).toLocaleString()}</b><span>מילים שקרא וכתב<br />{s.owl?.name ? `(הינשוף "${s.owl.name}")` : ''}</span></div>
        <div className="a-stat"><b>🏅 {Object.keys(s.badges || {}).length}</b><span>תגים</span></div>
        <div className="a-stat"><b>✨ {s.goldenCount || 0}</b><span>דפי זהב</span></div>
        <div className="a-stat"><b>🛡️ {s.shields || 0}</b><span>מגיני רצף</span></div>
        <div className="a-stat"><b>🎁 {Object.keys(s.feat || {}).length}/11</b><span>הפתעות שנפתחו</span></div>
      </div>
      {s.arena?.played ? <p className="a-help" style={{ marginTop: 10 }}>🏆 זירות טריוויה: {s.arena.played} · ניצחונות: {s.arena.wins || 0} · מקום בטבלה השבועית: {s.arena.week?.lastRank || '–'}</p> : null}</div>
      <div className="a-card"><h2>פעילות אחרונה</h2>
        <div className="a-ledger">{d.events.filter((e: Row) => e.type !== 'session_start').slice(0, 25).map((e: Row, i: number) => <div key={i}><span>{ev(e)}</span><span className="a-help">{fmtTime(e.created_at)}</span></div>)}
          {!d.events.length && <div className="a-help">עוד אין פעילות</div>}</div></div>
    </>
  );
}

function Rewards({ d, child, settings, reload }: { d: Row; child: Row; settings: Row; reload: () => void }) {
  const pending = d.reds.filter((r: Row) => r.status === 'pending');
  const [reason, setReason] = useState('בונוס מאבא');
  const grant = async (n: number) => { await api().grant(child.id, n, reason || 'בונוס'); reload(); };
  return (
    <>
      <div className="a-card" style={{ textAlign: 'center' }}><div style={{ fontSize: 44, fontWeight: 800 }}>🎟️ {d.balance}</div>
        <div className="a-help">= {d.balance * settings.ticketMinutes} דקות מסך · כל כרטיס = {settings.ticketMinutes} דקות (אפשר לשנות בהגדרות)</div></div>
      {pending.length > 0 && <div className="a-card a-urgent"><h2>ממתין לאישור שלך</h2><div className="a-list">{pending.map((r: Row) => <RedemptionCard key={r.id} row={r} onDone={reload} />)}</div></div>}
      <div className="a-card"><h2>לתת כרטיס בונוס</h2>
        <input className="a-input" value={reason} onChange={e => setReason(e.target.value)} placeholder="על מה?" />
        <div className="a-row" style={{ marginTop: 8 }}><button className="a-btn green" onClick={() => grant(1)}>+1 🎟️</button><button className="a-btn green" onClick={() => grant(2)}>+2 🎟️</button></div></div>
      <div className="a-card"><h2>היסטוריה</h2><div className="a-ledger">
        {d.ledger.map((r: Row, i: number) => <div key={i}><span>{r.reason}</span><span><span className={r.delta > 0 ? 'a-plus' : 'a-minus'}>{r.delta > 0 ? '+' : ''}{r.delta}</span> <span className="a-help">{fmtTime(r.created_at)}</span></span></div>)}
        {!d.ledger.length && <div className="a-help">עוד אין כרטיסים</div>}</div></div>
    </>
  );
}

function Letters({ d, reload }: { d: Row; reload: () => void }) {
  if (!d.letters.length) return <div className="a-card"><div className="a-help">עוד לא כתב מכתבים. בכל פרק יש משימת כתיבה, והמכתבים יופיעו כאן.</div></div>;
  return (
    <div className="a-list">{d.letters.map((l: Row) => (
      <div key={l.id} className={'a-card' + (!l.reply ? ' a-urgent' : '')} style={{ marginBottom: 0 }}>
        <div className="a-meta">✉️ {levelTitle(l.level_id)} · {fmtTime(l.created_at)}</div>
        <div className="a-kid">{l.text}</div>
        {l.reply ? <><div className="a-help">התשובה שלך {l.reply_seen ? '· ✔ הוא קרא' : '· עוד לא קרא'}</div><div className="a-nikud">{l.reply_nikud || l.reply}</div></>
          : <ReplyBox button="שלח תשובה ✉️" quick={['איזה מכתב מעולה! אני גאה בך', 'וואו, הסברת את זה ממש טוב!']} onSend={async (t, n) => { await api().reply(l.id, t, n); reload(); }} />}
      </div>))}</div>
  );
}

function Lifelines({ d, reload }: { d: Row; reload: () => void }) {
  const open = d.lifelines.filter((l: Row) => l.status === 'open'), past = d.lifelines.filter((l: Row) => l.status !== 'open');
  const st: Record<string, string> = { answered: '✔ ענית', cancelled: 'ביטל', expired: '⏰ לא נענה בזמן' };
  return (
    <>
      <div className="a-card"><h2>📞 טלפון לחבר</h2><div className="a-help">כשהוא נתקע בשאלה הוא יכול &quot;להתקשר&quot; אליך. תקבל התראה, ומה שתכתוב יופיע לו במשחק (מנוקד). אם לא תענה תוך כמה דקות, יובל ייתן לו רמז, והגלגל לא יורד לו.</div></div>
      {open.length > 0 && <div className="a-card a-urgent"><h2>מחכה לך עכשיו</h2><div className="a-list">{open.map((r: Row) => <LifelineCard key={r.id} row={r} onDone={reload} />)}</div></div>}
      <div className="a-card"><h2>היסטוריה</h2><div className="a-list">{past.map((r: Row) => (
        <div key={r.id} className="a-item"><div className="a-meta">{r.payload?.levelTitle} · {fmtTime(r.created_at)} · {st[r.status]}</div>
          <div className="a-q">❓ {r.payload?.question}</div>{r.answer && <div className="a-nikud">{r.answer_nikud || r.answer}</div>}</div>))}
        {!past.length && <div className="a-help">עוד לא ביקש עזרה</div>}</div></div>
    </>
  );
}

const SAMPLE_RIDDLES = [
  { q: 'מה עולה ולא יורד אף פעם?', a: 'גיל' },
  { q: 'יש לו שיניים, אבל הוא לא נושך. מה זה?', a: 'מסרק' },
  { q: 'מה נהיה רטוב יותר ככל שהוא מייבש?', a: 'מגבת' },
  { q: 'יש לי ידיים, אבל אני לא יכול למחוא כפיים. מי אני?', a: 'שעון' },
  { q: 'מה שייך לך, אבל אחרים משתמשים בו יותר ממך?', a: 'שם, השם שלי' },
];
function Riddles({ d, child, reload }: { d: Row; child: Row; reload: () => void }) {
  const [q, setQ] = useState(''), [a, setA] = useState(''), [h, setH] = useState(''), [tk, setTk] = useState(1);
  const [busy, setBusy] = useState(false), [prev, setPrev] = useState('');
  const save = async () => {
    setBusy(true);
    const [qn, hn] = await Promise.all([vowelize(q), h ? vowelize(h) : Promise.resolve('')]);
    await api().addRiddle(child.id, { question: q, question_nikud: qn, answers: a.split(/[,،\/]/).map(x => x.trim()).filter(Boolean), hint: h || null, hint_nikud: hn || null, reward_tickets: tk, reward_coins: 20 });
    setQ(''); setA(''); setH(''); setPrev(''); setBusy(false); reload();
  };
  const st: Record<string, string> = { active: '🟡 מחכה לו', solved: '✔ פתר', archived: 'בארכיון' };
  return (
    <>
      <div className="a-card"><h2>📜 חידה חדשה</h2>
        <div className="a-help">החידה תופיע לו במסך הראשי של המשחק כמגילה זוהרת. כתוב בלי ניקוד – נוסיף אוטומטית.</div>
        <div className="a-chips" style={{ marginTop: 8 }}>{SAMPLE_RIDDLES.map(r => <button key={r.q} className="a-chip" onClick={() => { setQ(r.q); setA(r.a); }}>💡 {r.q.slice(0, 22)}…</button>)}</div>
        <label className="a-label">החידה</label><textarea className="a-textarea" value={q} onChange={e => { setQ(e.target.value); setPrev(''); }} />
        {prev && <div className="a-nikud">{prev}</div>}
        <label className="a-label">תשובות נכונות (אפשר כמה, מופרדות בפסיק)</label><input className="a-input" value={a} onChange={e => setA(e.target.value)} placeholder="למשל: שעון, השעון" />
        <label className="a-label">רמז (לא חובה)</label><input className="a-input" value={h} onChange={e => setH(e.target.value)} />
        <label className="a-label">פרס</label>
        <div className="a-chips">{[0, 1, 2].map(n => <button key={n} className={'a-chip' + (tk === n ? ' on' : '')} onClick={() => setTk(n)}>{n ? `${n} 🎟️ + 20 🪙` : 'רק 20 🪙'}</button>)}</div>
        <div className="a-row" style={{ marginTop: 10 }}><button className="a-btn gold" disabled={busy || !q.trim() || !a.trim()} onClick={save}>{busy ? '...' : 'שלח לו את החידה'}</button>
          <button className="a-btn light" disabled={!q.trim()} onClick={async () => setPrev(await vowelize(q))}>👁️ איך זה ייראה לו</button></div></div>
      <div className="a-card"><h2>החידות שלך</h2><div className="a-list">{d.riddles.map((r: Row) => (
        <div key={r.id} className="a-item"><div className="a-meta">{st[r.status]} · {fmtTime(r.solved_at || r.created_at)}</div>
          <div className="a-q">{r.question_nikud || r.question}</div><div className="a-help">תשובה: {(r.answers || []).join(' / ')}</div>
          {r.status === 'active' && <button className="a-chip" style={{ marginTop: 6 }} onClick={async () => { await api().archiveRiddle(r.id); reload(); }}>הסר</button>}</div>))}
        {!d.riddles.length && <div className="a-help">עוד אין חידות</div>}</div></div>
    </>
  );
}

const HELPERS: Record<string, string> = { 'אבא': 'אַבָּא', 'אמא': 'אִמָּא', 'סבא': 'סַבָּא', 'סבתא': 'סַבְתָּא' };
function Settings({ child, settings, setSettings }: { child: Row; settings: Row; setSettings: (s: Row) => void }) {
  const [s, setS] = useState<Row>(settings);
  const [voice, setVoice] = useState<boolean | null>(null);
  useEffect(() => { fetch('/api/tts?probe=1').then(r => r.json()).then(j => setVoice(!!j.ok)).catch(() => setVoice(false)); }, []);
  const [msg, setMsg] = useState('');
  const num = (k: string, label: string, help?: string, min = 0, max = 99) => (
    <div><label className="a-label">{label}</label><input className="a-input" type="number" min={min} max={max} value={s[k]} onChange={e => setS({ ...s, [k]: +e.target.value })} />{help && <div className="a-help">{help}</div>}</div>
  );
  const save = async () => { await api().saveSettings(child.id, s); setSettings(s); setMsg('נשמר ✔ (נכנס לתוקף במשחק תוך חצי דקה)'); setTimeout(() => setMsg(''), 3000); };
  const intake = child.intake || {};
  return (
    <>
      <div className="a-card"><h2>🎟️ פרסים בעולם האמיתי</h2>
        {num('ticketMinutes', 'כרטיס אחד שווה (דקות מסך)', 'מומלץ 5–10 דקות', 1, 60)}
        {num('dailyGoal', 'משימת היום: כמה דפים', 'השלמת המשימה = כרטיס בונוס', 1, 10)}
        {num('dailyTicketCap', 'מקסימום כרטיסים ביום', `כרגע: עד ${s.dailyTicketCap * s.ticketMinutes} דקות ביום`, 1, 30)}
      </div>
      <div className="a-card"><h2>📞 גלגל הצלה</h2>
        <label className="a-label">מי עונה?</label>
        <div className="a-chips">{Object.entries(HELPERS).map(([k, v]) => <button key={k} className={'a-chip' + (plain(s.helperName) === k ? ' on' : '')} onClick={() => setS({ ...s, helperName: v })}>{k}</button>)}</div>
        {num('lifelinesPerDay', 'כמה פעמים ביום (מקסימום)', undefined, 0, 10)}
        {num('lifelineCost', 'מחיר שיחה נוספת (במטבעות)', 'השיחה הראשונה בכל פעם שהוא נכנס למשחק – בחינם', 0, 200)}
        <div><label className="a-label">כמה זמן לחכות לתשובה שלך (דקות)</label><input className="a-input" type="number" min={1} max={15} value={Math.round(s.lifelineTimeoutSec / 60 * 10) / 10} onChange={e => setS({ ...s, lifelineTimeoutSec: Math.round(+e.target.value * 60) })} /></div>
      </div>
      <div className="a-card"><h2>🎮 המשחק</h2>
        {num('pagesPerDay', 'כמה דפים חדשים נפתחים כל יום', 'כשהם נגמרים – "מחר נפתח דף חדש". כך נשאר לו טעם של עוד', 1, 10)}
        {num('sessionMin', 'אחרי כמה דקות להציע הפסקה', undefined, 3, 60)}
        <label className="a-label">סדר הגיבורים במפה</label>
        <div className="a-chips">
          <button className={'a-chip' + (s.heroOrder !== 'ordered' ? ' on' : '')} onClick={() => setS({ ...s, heroOrder: 'free' })}>בחירה חופשית</button>
          <button className={'a-chip' + (s.heroOrder === 'ordered' ? ' on' : '')} onClick={() => setS({ ...s, heroOrder: 'ordered' })}>לפי הסדר</button>
        </div>
        <p className="a-help">בחירה חופשית: הוא בוחר עם איזה גיבור להתחיל (הגיבור האחרון, שבו מתגלה מי הוא המוחק, נפתח רק בסוף). לפי הסדר: גיבור אחד פתוח בכל פעם. בתוך כל גיבור הפרקים תמיד לפי הסדר, ואפשר לחזור לפרק שכבר עשה.</p>
        <label className="a-label"><input type="checkbox" checked={s.gradual !== false} onChange={e => setS({ ...s, gradual: e.target.checked })} /> משחק שגדל: חלקי המשחק נפתחים בהדרגה, הפתעה אחת בכל פעם (מומלץ)</label>
        <div className="a-help" style={{ marginTop: -4 }}>ביום הראשון הוא רואה רק סיפור, מפה, כרטיסים וחנות. אחר כך, כל יום-יומיים, נפתח משהו חדש: ינשוף שגדל מקריאה, חדר אימונים, מתנה יומית, זירת חידון, תגים, גלגל מזל, מגן רצף, דפי זהב, ליגות ובונוסים. בלי סימון – הכול פתוח מההתחלה.</div>
        <label className="a-label"><input type="checkbox" checked={s.jointTasks !== false} onChange={e => setS({ ...s, jointTasks: e.target.checked })} /> משימות משותפות איתך (בלי מסך) מדי כמה ימים – אתה מאשר כשסיימתם</label>
        <label className="a-label"><input type="checkbox" checked={s.wheelTickets !== false} onChange={e => setS({ ...s, wheelTickets: e.target.checked })} /> גלגל המזל יכול לתת כרטיס (נספר בתוך מקסימום הכרטיסים היומי)</label>
        <label className="a-label"><input type="checkbox" checked={!!s.nikud} onChange={e => setS({ ...s, nikud: e.target.checked })} /> ניקוד בכל המשחק (מומלץ)</label>
        <label className="a-label"><input type="checkbox" checked={s.readAloud !== false} onChange={e => setS({ ...s, readAloud: e.target.checked })} /> כפתור הקראה בדפי הסיפור (בתשלום מטבעות)</label>
        {s.readAloud !== false && voice !== null && <div className="a-help" style={{ marginTop: -4, color: voice ? '#19a85a' : '#b25d00' }}>{voice ? '✔ קול מספר הסיפורים פעיל' : '⚠ עוד לא חובר שירות קול טבעי, ולכן כפתור ההקראה מוסתר במשחק'}</div>}
        {s.readAloud !== false && num('readAloudCost', 'מחיר הקראה של עמוד (במטבעות)', 'הקראה בקול טבעי של מספר סיפורים, והשורה שמוקראת מודגשת – כך הוא עוקב וממשיך לקרוא', 0, 200)}
        {s.readAloud !== false && num('readAloudEvery', 'הקראה פעם אחת בכל כמה דפים', 'למשל 3: אחרי דף מוקרא, הוא קורא לבד עוד 2 דפים לפני שההקראה חוזרת', 1, 10)}
        <label className="a-label">קוד הורים (ליציאה מהמשחק)</label><input className="a-input" value={s.pin} onChange={e => setS({ ...s, pin: e.target.value })} inputMode="numeric" />
      </div>
      <button className="a-btn block green" onClick={save}>שמירה</button>
      {msg && <div className="a-msg">{msg}</div>}
      <div className="a-card" style={{ marginTop: 14 }}><h2>📝 השאלון שמילאת</h2>
        <div className="a-help">כיתה {child.grade || '?'} · {intake.reading || ''}</div>
        {intake.interests && <div className="a-help">תחומי עניין: {intake.interests.join(', ')}</div>}
        {intake.challenges && <div className="a-help">קשיים: {intake.challenges.join(', ')}</div>}
        {intake.notes && <div className="a-kid">{intake.notes}</div>}
      </div>
    </>
  );
}
