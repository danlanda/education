'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import '@/app/game.css';
import '@/app/kinder.css';
import { createGame } from '@/lib/game/engine.js';
import { createKinder } from '@/lib/game/kinder.js';
import { supabaseStore, demoStore, setDemoKey } from '@/lib/game/store.js';
import { DEMO, sb } from '@/lib/supabase/client';

export default function GameHost({ childId }: { childId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    let game: { destroy: () => void } | null = null, gone = false;
    try { localStorage.setItem('kidMode', childId); } catch {}
    const ganDemo = childId === 'gan';   // הדגמה של גן חובה
    setDemoKey(ganDemo ? 'keepers-gan' : 'keepers-demo');
    const store = DEMO || childId === 'demo' || ganDemo ? demoStore() : supabaseStore(sb(), childId);
    const opts = { onExit: () => { try { sessionStorage.setItem('adminUnlocked', '1'); } catch {} router.push('/admin'); } };
    // ילד בגן חובה (grade 0) מקבל את משחק הגן – בלי קריאה, הכול בקול
    (async () => {
      let kinder = ganDemo;
      if (!kinder) { try { const r = await store.init(); kinder = r.child?.grade === 0 || r.child?.settings?.mode === 'kinder'; } catch {} }
      if (gone) return;
      game = (kinder ? createKinder : createGame)(el, store, opts);
    })();
    return () => { gone = true; if (game) game.destroy(); };
  }, [childId, router]);
  return <div ref={ref} />;
}
