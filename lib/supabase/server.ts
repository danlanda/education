import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const serverConfigured = !!URL && !!KEY;

/** לקוח שפועל בשם ההורה המחובר (עם ההרשאות שלו) */
export async function sbServer() {
  const store = await cookies();
  return createServerClient(URL!, KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* server component */ }
      },
    },
  });
}

/** לקוח עם הרשאות מלאות – רק בשרת, למשל כדי לשלוח התראות לכל ההורים במשפחה */
export function sbAdmin() {
  return createClient(URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}
