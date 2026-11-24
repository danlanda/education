'use client';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** כשאין חיבור ל-Supabase האפליקציה רצה במצב הדגמה (הכול נשמר בדפדפן) */
export const DEMO = !URL || !KEY;

let client: SupabaseClient | null = null;
export function sb(): SupabaseClient {
  if (DEMO) throw new Error('Supabase is not configured (demo mode)');
  if (!client) client = createBrowserClient(URL!, KEY!);
  return client;
}
