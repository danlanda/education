import { NextResponse } from 'next/server';
import { sbServer, serverConfigured } from '@/lib/supabase/server';

/* שומר את הטלפון של ההורה כדי לשלוח אליו התראות */
export async function POST(req: Request) {
  if (!serverConfigured) return NextResponse.json({ error: 'not configured' }, { status: 503 });
  const db = await sbServer();
  const { data } = await db.auth.getUser();
  if (!data.user) return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  const sub = await req.json();
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return NextResponse.json({ error: 'bad subscription' }, { status: 400 });
  const { data: m } = await db.from('family_members').select('family_id').eq('user_id', data.user.id).limit(1);
  if (!m?.length) return NextResponse.json({ error: 'no family' }, { status: 400 });
  const { error } = await db.from('push_subscriptions').upsert(
    { user_id: data.user.id, family_id: m[0].family_id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    { onConflict: 'endpoint' },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
