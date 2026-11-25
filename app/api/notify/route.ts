import { NextResponse } from 'next/server';
import * as webpush from 'web-push';
import { sbServer, sbAdmin, serverConfigured } from '@/lib/supabase/server';

/* שולח התראה לטלפונים של ההורים במשפחה */
type Msg = { title: string; body: string; url: string; urgent?: boolean };

function message(kind: string, name: string, childId: string, d: Record<string, unknown>): Msg | null {
  const base = `/admin/${childId}`;
  switch (kind) {
    case 'lifeline': return { title: `📞 ${name} מבקש עזרה!`, body: String(d.question || 'לחץ כדי לענות'), url: `${base}?tab=lifeline`, urgent: true };
    case 'redeem': return { title: `🎟️ ${name} רוצה לממש ${d.tickets} כרטיסים`, body: `${d.minutes} דקות צפייה – לאשר?`, url: `${base}?tab=rewards`, urgent: true };
    case 'goal': return { title: `🎯 ${name} השלים את משימת היום!`, body: 'כל הכבוד לו 👏', url: base };
    case 'letter': return { title: `✉️ ${name} כתב מכתב`, body: String(d.text || ''), url: `${base}?tab=letters` };
    case 'joint': return { title: `🤝 ${name} סיים איתך משימה משותפת!`, body: `"${d.title || ''}" – לאשר ולתת לו פרס?`, url: base };
    case 'riddle': return { title: `🧩 ${name} פתר את החידה!`, body: `התשובה שלו: ${d.answer || ''}`, url: `${base}?tab=riddles` };
    default: return null;
  }
}

export async function POST(req: Request) {
  if (!serverConfigured || !process.env.VAPID_PRIVATE_KEY || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, reason: 'push not configured' });
  }
  const db = await sbServer();
  const { data: u } = await db.auth.getUser();
  if (!u.user) return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  const { childId, kind, data = {} } = await req.json().catch(() => ({}));

  let familyId: string, msg: Msg | null;
  if (kind === 'test') {
    const { data: m } = await db.from('family_members').select('family_id').eq('user_id', u.user.id).limit(1);
    if (!m?.length) return NextResponse.json({ error: 'no family' }, { status: 400 });
    familyId = m[0].family_id;
    msg = { title: '🔔 ההתראות עובדות!', body: 'מעכשיו תקבל כאן הודעות מהמשחק', url: '/admin' };
  } else {
    // בודקים שהילד שייך למשפחה של המשתמש (ההרשאות של ההורה)
    const { data: child } = await db.from('children').select('name,family_id').eq('id', childId).maybeSingle();
    if (!child) return NextResponse.json({ error: 'not allowed' }, { status: 403 });
    familyId = child.family_id;
    msg = message(String(kind), child.name, childId, data);
  }
  if (!msg) return NextResponse.json({ error: 'unknown kind' }, { status: 400 });

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'https://shomrei-hazman.vercel.app', process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  const admin = sbAdmin();
  const { data: subs } = await admin.from('push_subscriptions').select('id,endpoint,p256dh,auth').eq('family_id', familyId);
  const payload = JSON.stringify({ ...msg, tag: kind + '-' + Date.now() });
  let sent = 0;
  await Promise.all((subs || []).map(async s => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 600, urgency: msg!.urgent ? 'high' : 'normal' });
      sent++;
    } catch (e: unknown) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await admin.from('push_subscriptions').delete().eq('id', s.id); // טלפון שכבר לא רשום
    }
  }));
  return NextResponse.json({ ok: true, sent });
}
