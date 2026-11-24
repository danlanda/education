'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEMO } from '@/lib/supabase/client';
import { api, type Row } from '@/lib/admin';
import { Logo, KeeperHead } from '@/components/Art';

/* בחירת ילד (אם יש יותר מאחד) */
export default function PlayPick() {
  const router = useRouter();
  const [kids, setKids] = useState<Row[] | null>(null);
  useEffect(() => {
    try { localStorage.setItem('deviceRole', 'kid'); } catch {}
    if (DEMO) { router.replace('/play/demo'); return; }
    api().children().then(k => { if (k.length === 1) router.replace('/play/' + k[0].id); else if (!k.length) router.replace('/onboarding'); else setKids(k); })
      .catch(() => router.replace('/login'));
  }, [router]);
  if (!kids) return <div className="a-auth"><Logo /></div>;
  return (
    <div className="a-auth">
      <div className="a-auth-card">
        <Logo /><h1>מי משחק?</h1>
        <div className="a-choice">{kids.map(k => (
          <a key={k.id} href={`/play/${k.id}`}><KeeperHead /><span><b>{k.name}</b></span></a>
        ))}</div>
      </div>
    </div>
  );
}
