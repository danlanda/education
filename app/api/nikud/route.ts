import { NextResponse } from 'next/server';
import { sbServer, serverConfigured } from '@/lib/supabase/server';

/* ניקוד אוטומטי (Dicta – המרכז הישראלי לניתוח טקסטים).
   ההורה כותב בלי ניקוד, והילד רואה את הטקסט מנוקד. */
const DICTA = 'https://nakdan-5-3.loadbalancer.dicta.org.il/api';

export async function POST(req: Request) {
  if (serverConfigured) {
    const db = await sbServer();
    const { data } = await db.auth.getUser();
    if (!data.user) return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  }
  const { text } = await req.json().catch(() => ({ text: '' }));
  const input = String(text || '').slice(0, 1500);
  if (!input.trim()) return NextResponse.json({ nikud: '' });
  try {
    const r = await fetch(DICTA, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'nakdan', data: input, genre: 'modern', addmorph: false, keepqq: false, nodageshdefmem: false, patachma: false, keepmetagim: true }),
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) throw new Error('dicta ' + r.status);
    const words: { word: string; sep: boolean; options: string[] }[] = await r.json();
    const out = words.map(w => (w.sep || !w.options?.length ? w.word : w.options[0].replace(/\|/g, '').replace(/ֽ/g, ''))).join('');
    return NextResponse.json({ nikud: out });
  } catch (e) {
    // אם השירות לא זמין – מחזירים את הטקסט כמו שהוא
    return NextResponse.json({ nikud: input, fallback: true, error: String(e) });
  }
}
