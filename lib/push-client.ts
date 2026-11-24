'use client';
/* הפעלת התראות בטלפון של ההורה */

function b64ToBytes(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export type PushStatus = 'unsupported' | 'ios-needs-install' | 'denied' | 'off' | 'on' | 'not-configured';

export async function pushStatus(): Promise<PushStatus> {
  if (typeof window === 'undefined') return 'unsupported';
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return 'not-configured';
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return ios && !standalone ? 'ios-needs-install' : 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  const sub = await reg?.pushManager.getSubscription();
  return sub ? 'on' : 'off';
}

export async function enablePush(): Promise<PushStatus> {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) return 'not-configured';
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return 'denied';
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) }));
  const r = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(sub.toJSON()) });
  if (!r.ok) throw new Error('שמירת ההתראות נכשלה');
  return 'on';
}

export async function testPush() {
  await fetch('/api/notify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'test' }) });
}
