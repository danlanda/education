# איך כותבים עונה ב"שומרי הזמן" (Season writing brief)

This is the brief for writing a **season**: one historical figure told as 7 episodes, like a podcast.
The gold-standard example is `lib/game/seasons/archimedes.js` – read it fully before writing. Match its depth, tone, length and variety.

## Who it's for
Kids around grades 2–4 (age ~8) who **read Hebrew with nikud, slowly**, and who love history, adventure and superheroes.
Reading is the core skill we train, so the story has to be gripping enough that the child *wants* to keep reading.
There is **no read-aloud**: every word the child sees must carry **full nikud** (except digits).

## The voice: Yuval Malchi's style
Yuval (a real Israeli history podcaster) is the narrator. His style:
- Tells real history beautifully, packed with **true anecdotes** and surprising details kids love ("he ran into the street without clothes!").
- **Action and suspense**: every episode has danger, a chase, a mystery or a big reveal.
- Humor, warmth, rhetorical questions, short punchy sentences. Emojis sparingly (only as a `pic` sticker or at the end of a line).
- **The child is inside the story** ("אַתָּה עוֹמֵד עַל הַסִּפּוּן...", "אַתָּה רָץ אַחֲרָיו..."). Yuval talks to him; the child helps, hides, watches.
- **Real facts only.** If a famous story is probably a legend, say so – that's what `myth` tasks are for. Never invent historical facts. If unsure, leave it out.
- Age-appropriate: wars and deaths are told honestly but gently, no gore (see how Archimedes' death is told).

## The big mystery arc (across all 10 seasons)
A villain, **"הַמּוֹחֵק" (the Eraser)** – a figure in a black cloak with glowing red eyes – tears pages out of Yuval's magical **"סֵפֶר הַזְּמַן" (Book of Time)**. When a page is erased, the whole world forgets that hero. The child is a **שׁוֹמֵר זְמַן (Time Keeper)** who jumps into the pages and restores them.
Secret (revealed only in season 10): the Eraser is **זְכַרְיָה הַסּוֹפֵר**, the scribe who wrote the Book of Time long ago – but never wrote his own story in it, so nobody remembers him (his name ironically means "God remembered"). Bitter, he wants everyone forgotten, like him. In the finale the child writes Zechariah's page, and he is redeemed.

Each season: episode 1 opens in Yuval's library with the previous season's clue leading here; the Eraser appears 2–3 times during the season (shadow, ink notes, threats – escalating); episode 7 ends with the season's **clue** (awarded as the episode's collection card) pointing to the next season.

| # | Season | file / export / id prefix | Clue found in ep 7 (card) | Next season |
|---|---|---|---|---|
| 1 | אַרְכִימֶדֶס | archimedes.js / ARCHIMEDES / a0–a6 | black feather (quill) `feather` (found in ep1) | Venice |
| 2 | מַרְקוֹ פּוֹלוֹ | marco.js / MARCO / m1–m7 | old ink bottle with a broken-hourglass symbol `inkpot` | Florence |
| 3 | לֵאוֹנַרְדוֹ | leonardo.js / LEONARDO / l1–l7 | note in mirror writing: "גַּם לִי הָיָה סִפּוּר..." `mirrornote`. Ep1 also introduces a small **locked door** at the back of Yuval's library whose key was never found | Seville (Magellan) |
| 4 | מָגֶלָּן | magellan.js / MAGELLAN / g1–g7 | torn first page of the Book's index – one name scratched out `index` | Carthage (Hannibal) |
| 5 | חַנִּיבַּעַל | hannibal.js / HANNIBAL / n1–n7 | ring engraved with the letter ז `ring` | America (Harriet) |
| 6 | הָרִיֶּט טַבְּמַן | harriet.js / HARRIET / h1–h7 | an old key – existing card `key` ("מַפְתֵּחַ הַזְּמַן") – Yuval suspects it opens the locked door | Macedonia (Alexander) |
| 7 | אֲלֶכְּסַנְדֶּר מוֹקְדוֹן | alexander.js / ALEXANDER / x1–x7 | scroll in newly-founded Alexandria signed "ז. הַסּוֹפֵר" `scroll_z` | Egypt, Valley of the Kings |
| 8 | תּוּתְעַנְחָאמוֹן | tutankhamun.js / TUTANKHAMUN / t1–t7 | broken hourglass carved in a corner of the tomb `hourglass` | Antarctica |
| 9 | שֶׁקְלְטוֹן | shackleton.js / SHACKLETON / k1–k7 | frozen diary page: "סִפַּרְתִּי עַל כֻּלָּם, וְעָלַי אַף אֶחָד לֹא סִפֵּר" `diary` | The Moon |
| 10 | אַפּוֹלוֹ 11 | apollo.js / APOLLO / o1–o7 | finale: the key opens the locked door; the Eraser is revealed and redeemed; card `quill` (golden quill) | (season 2 teaser) |

## File format
```js
export const MARCO = [ /* exactly 7 episodes */ ];
export const MARCO_CARDS = { /* only NEW cards, id: { e:'emoji', name:'…', fact:'…' } */ };
```
Episode: `{ id:'m1', chapter:'מַרְקוֹ פּוֹלוֹ' /* first episode only */, title, scene, card, end, steps:[…], quiz:[…] }`
- `title`: the episode name (with nikud). `end`: one teaser line shown after the episode ("what happens next...").
- `card`: one collection card per episode (unique). Reuse existing card ids where they fit (listed in `scripts/validate-season.mjs` EXISTING_CARDS); define new ones in `<EXPORT>_CARDS` with ids prefixed by the season (e.g. `mag_ship`).
- `scene` (and optional per-step `scene`): one of `library` (Yuval's magical library – use for Eraser/frame scenes), `syracuse` (ancient Mediterranean city by the sea), `bath`, `venice`, `desert` (dunes + camels), `palace` (Chinese palace), `prison`, `workshop` (Renaissance workshop), `tuscany` (hills), `forest`, `river`, `alexandria` (lighthouse + library + ships), `harbor` (big ship in port), `siege` (city walls + war machine + ships), `ocean` (sailing ship on open sea; `night:true` = storm at night), `snow` (snowy mountains / ice field), `egypt` (pyramids, temple, the Nile), `space` (the Moon's surface with Earth in the sky).
- Read-step flags: `night:true` (night version), `eraser:true` (the Eraser figure appears in the scene), `pic:'🚢'` (a sticker emoji).

### Step types (see archimedes.js for real examples)
| type | fields | notes |
|---|---|---|
| `read` | `lines:[…]` 2–4 lines | the story. 3–4 lines, each 1–2 short sentences |
| `choice` | `q, options:[3], answer:index, hint` | reading comprehension |
| `tf` | `q, answer:true/false, hint` | |
| `find` | `q, text, answer, hint` | child taps the word; `answer` must be an exact word of `text` |
| `order` | `q, words:[…] in correct order, hint` | 4–6 words, no duplicates |
| `number` | `q, answer:int 0–9999, hint` | **math word problem from the story**, grade-3 level: two-step problems, ×, ÷, +/– up to 1000 |
| `balance` | `q, a:{w,d}, b:{w}, hint` | lever puzzle; `a.w*a.d/b.w` must be an integer 1–6 |
| `write` | `q, starters:[2–4], minWords:8–12, keywords:[no nikud]` | writing, sent to the parent as a letter |
| `predict` | `q, options:[3], answer, reveal:[1–3 lines]` | "what happens next?" – no wrong answer, then the reveal. Put it right before a twist |
| `myth` | `q, answer:true(truth)/false(legend), explain:[1–3 lines]` | truth or legend – great for famous stories of doubtful origin |
| `timeline` | `q, items:[3–5 in correct order], hint` | order events |
Each episode also has `quiz:[5]` for the end-of-episode trivia arena: `{ q, options:[3], answer }` or a true/false `{ q, options:['נָכוֹן','לֹא נָכוֹן'], answer, tf:true }`. Quiz questions must be answerable from this episode.

### Shape of an episode (11–15 steps)
- ~5–6 `read` steps (story) interleaved with ~5–7 tasks. Never two tasks in a row without story in between more than once.
- Every episode: at least 1 math task (`number`/`balance`), 1 `predict` in most episodes, plus reading tasks.
- Per season: ≥ 3 `write`, ≥ 5 `predict`, ≥ 4 `myth`, ≥ 2 `timeline`/`balance`, 7+ math.
- **The last step is always a `read` cliffhanger.** Episode 1 starts in Yuval's library (Eraser/clue hook), then jumps in.
- Total reading per season: about 1,300–1,800 words in `read` lines (like Archimedes ~1,400).

## Hebrew & nikud rules
- **Full, correct nikud on every Hebrew string** the child sees (lines, questions, options, hints, reveals, quiz, titles, card names/facts). Use ktiv male with nikud, like the example file (e.g. `שׁוֹמֵר`, `אַתָּה`, `כָּל`).
- Masculine second person for the child (אַתָּה).
- `keywords` in `write` are WITHOUT nikud (used for matching).
- Digits for numbers. Keep sentences short and concrete; avoid rare words – or explain them in the next sentence.
- Foreign names: choose one nikud spelling and use it consistently.

## Tools – run both before you finish
```bash
node scripts/validate-season.mjs lib/game/seasons/<file>.js <EXPORT> <prefix>
python3 scripts/nikud-check.py lib/game/seasons/<file>.js
```
The validator must print `OK – no errors`. The nikud check compares against the Dicta nakdan: review each flagged word **in context** and fix real mistakes (Dicta is often wrong on names and out-of-context words – don't blindly accept it).

Only create/modify your own season file. Do not edit any other file.
