import { NextResponse } from 'next/server';

/* 🔊 הקראה בקול טבעי של מספר סיפורים (במקום הקול הרובוטי של המכשיר).
   GET /api/tts?t=<שורה מהסיפור>&n=<שם הילד>  →  קובץ שמע (mp3).
   - מקריא רק שורות שבאמת מופיעות בסיפורי המשחק (כדי שאף אחד לא ישתמש במפתח לדברים אחרים).
   - התשובה נשמרת ב־CDN של Vercel: אותה שורה מוקראת רק פעם אחת, וכל השאר מגיעים מהמטמון.
   ספק הקול – לפי משתני הסביבה ב־Vercel (מספיק אחד):
     OPENAI_API_KEY                         → קול מספר סיפורים חם ומלא הבעה (gpt-4o-mini-tts)
     AZURE_SPEECH_KEY + AZURE_SPEECH_REGION → אבי, קול עברי טבעי של מיקרוסופט (he-IL-AvriNeural)
   GET /api/tts?probe=1 → האם יש קול טבעי מוגדר */

export const runtime = 'nodejs';

const STORYTELLER = `Voice: a warm, friendly, lively storyteller reading an adventure history book aloud to an 8-year-old boy.
Language: native Israeli Hebrew. Follow the nikud (vowel marks) exactly for pronunciation.
Pace: unhurried and clear, a little slower than normal conversation, with short natural pauses between sentences.
Tone: excited at surprises, suspenseful at cliffhangers, gentle at sad moments, playful at jokes. Never robotic or flat.`;

const provider = () => process.env.OPENAI_API_KEY ? 'openai' : process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION ? 'azure'
  : process.env.TTS_MOCK === '1' ? 'mock' : null;   // mock – רק לבדיקות אוטומטיות: חצי שנייה של שקט
const silence = () => { const n = 8000, b = new ArrayBuffer(44 + n), v = new DataView(b), w = (o: number, t: string) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 16000, true); v.setUint32(28, 16000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, 'data'); v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128); return b; };

/* כל השורות שמותר להקריא: סיפורי העונות, הפתיחה וסיפורי הבונוס (נבנה פעם אחת לכל שרת) */
type Step = { t: string; lines?: string[]; reveal?: string[]; explain?: string[] };
type Episode = { steps?: Step[] };
let allowed: Promise<Set<string>> | null = null;
const collect = (set: Set<string>, steps: Step[] = []) => {
  for (const s of steps) for (const l of [...(s.t === 'read' ? s.lines || [] : []), ...(s.reveal || []), ...(s.explain || [])]) set.add(l);
};
function allowedLines() {
  if (!allowed) allowed = (async () => {
    const set = new Set<string>();
    const content = (await import('@/lib/game/content.js')) as unknown as { LEVELS: Record<string, Episode[]> };
    const seasons = (await import('@/lib/game/seasons/index.js')) as unknown as { SEASON_FILES: { exp: string; load: () => Promise<Record<string, Episode[]>> }[] };
    const bonus = (await import('@/lib/game/bonus.js')) as unknown as { BONUS_STORIES: Episode[] };
    for (const l of Object.values(content.LEVELS).flat()) collect(set, l.steps);
    for (const f of seasons.SEASON_FILES) for (const ep of (await f.load())[f.exp] || []) collect(set, ep.steps);
    for (const b of bonus.BONUS_STORIES) collect(set, b.steps);
    return set;
  })();
  return allowed;
}

/* ניקוי לפני ההקראה: בלי אימוג'י, שם הילד במקום {name} */
const clean = (line: string, name: string) => line.replace(/\{name\}/g, name).replace(/[\p{Extended_Pictographic}‍️]/gu, '').replace(/\s+/g, ' ').trim();
const esc = (s: string) => s.replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string));

async function speak(text: string): Promise<ArrayBuffer> {
  if (provider() === 'mock') return silence();
  if (provider() === 'openai') {
    const r = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.TTS_MODEL || 'gpt-4o-mini-tts', voice: process.env.TTS_VOICE || 'ash', input: text, instructions: STORYTELLER, response_format: 'mp3' }),
      signal: AbortSignal.timeout(25000),
    });
    if (!r.ok) throw new Error('openai ' + r.status + ' ' + (await r.text()).slice(0, 200));
    return r.arrayBuffer();
  }
  const region = process.env.AZURE_SPEECH_REGION;
  const ssml = `<speak version="1.0" xml:lang="he-IL"><voice name="${process.env.TTS_VOICE || 'he-IL-AvriNeural'}"><prosody rate="-10%">${esc(text)}</prosody></voice></speak>`;
  const r = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST', headers: { 'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY as string, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'keepers-game' },
    body: ssml, signal: AbortSignal.timeout(25000),
  });
  if (!r.ok) throw new Error('azure ' + r.status);
  return r.arrayBuffer();
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  if (u.searchParams.get('probe')) return NextResponse.json({ ok: !!provider() }, { headers: { 'Cache-Control': 'no-store' } });
  if (!provider()) return NextResponse.json({ error: 'no voice configured' }, { status: 404 });
  const line = (u.searchParams.get('t') || '').slice(0, 1200);
  const name = (u.searchParams.get('n') || '').replace(/[^֐-׿a-zA-Z ]/g, '').slice(0, 20).trim() || 'שׁוֹמֵר הַזְּמַן';
  if (!line || !(await allowedLines()).has(line)) return NextResponse.json({ error: 'not a story line' }, { status: 403 });
  try {
    const audio = await speak(clean(line, name));
    return new NextResponse(audio, { headers: { 'Content-Type': provider() === 'mock' ? 'audio/wav' : 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable' } });
  } catch (e) {
    console.error('tts', e);
    return NextResponse.json({ error: 'voice service failed' }, { status: 502 });
  }
}
