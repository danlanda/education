'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEMO, sb } from '@/lib/supabase/client';
import { Logo } from '@/components/Art';

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (DEMO) { router.push('/'); return; }
    setBusy(true); setMsg(null);
    try {
      if (mode === 'in') {
        const { error } = await sb().auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace('/');
      } else {
        const { data, error } = await sb().auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        if (data.session) router.replace('/onboarding');
        else setMsg({ t: 'נשלח אליך מייל לאישור. אחרי שתאשר – חזור לכאן והתחבר.' });
      }
    } catch (err: unknown) {
      const m = (err as Error).message || '';
      setMsg({ err: true, t: m.includes('Invalid login') ? 'האימייל או הסיסמה לא נכונים' : m.includes('least 6') ? 'הסיסמה צריכה להיות לפחות 6 תווים' : m });
    }
    setBusy(false);
  }

  return (
    <div className="a-auth">
      <form className="a-auth-card" onSubmit={submit}>
        <Logo />
        <h1>שומרי הזמן</h1>
        <div className="a-sub">{mode === 'in' ? 'כניסת הורים' : 'הרשמה – הורה חדש'}</div>
        <label className="a-label">אימייל</label>
        <input className="a-input" type="email" dir="ltr" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
        <label className="a-label">סיסמה</label>
        <input className="a-input" type="password" dir="ltr" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} />
        {msg && <div className={'a-msg' + (msg.err ? ' a-err' : '')}>{msg.t}</div>}
        <div style={{ height: 14 }} />
        <button className="a-btn block" disabled={busy}>{busy ? '...' : mode === 'in' ? 'כניסה' : 'הרשמה'}</button>
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          {mode === 'in'
            ? <a className="a-btn light" style={{ textDecoration: 'none', display: 'inline-block' }} href="/start">חדש כאן? בואו נתחיל ✨</a>
            : <button type="button" className="a-btn light" onClick={() => { setMode('in'); setMsg(null); }}>כבר רשום? כניסה</button>}
        </div>
      </form>
    </div>
  );
}
