'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import '@/app/game.css';
import { createGame } from '@/lib/game/engine.js';
import { supabaseStore, demoStore } from '@/lib/game/store.js';
import { DEMO, sb } from '@/lib/supabase/client';

export default function GameHost({ childId }: { childId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (!ref.current) return;
    try { localStorage.setItem('kidMode', childId); } catch {}
    const store = DEMO || childId === 'demo' ? demoStore() : supabaseStore(sb(), childId);
    const game = createGame(ref.current, store, {
      onExit: () => { try { sessionStorage.setItem('adminUnlocked', '1'); } catch {} router.push('/admin'); },
    });
    return () => game.destroy();
  }, [childId, router]);
  return <div ref={ref} />;
}
