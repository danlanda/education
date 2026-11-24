'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Wizard from '@/components/Wizard';
import { DEMO, sb } from '@/lib/supabase/client';

/* הורה מחובר שמוסיף ילד (או שעוד לא מילא שאלון) */
export default function Onboarding() {
  const router = useRouter();
  const [ok, setOk] = useState(DEMO);
  useEffect(() => {
    if (DEMO) return;
    sb().auth.getUser().then(({ data }) => { if (!data.user) router.replace('/start'); else setOk(true); });
  }, [router]);
  return ok ? <Wizard withAccount={false} /> : null;
}
