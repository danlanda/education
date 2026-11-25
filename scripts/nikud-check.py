# בדיקת ניקוד מול Dicta (nakdan). שימוש: python3 scripts/nikud-check.py <file.js> ...
# מדפיס מילים שהניקוד שלהן שונה ממה ש־Dicta מציע. לא כל התראה היא טעות – צריך לבדוק בהקשר.
import json, re, sys, urllib.request, unicodedata

files = sys.argv[1:]
NIK = re.compile('[֑-ׇ]')
src = ''.join(open(f, encoding='utf-8').read() for f in files)
strings = set()
for m in re.finditer(r"'((?:[^'\\\n]|\\.)*)'|`([^`]*)`", src):
    t = m.group(1) or m.group(2) or ''
    if NIK.search(t):
        t = re.sub(r'\$\{[^}]*\}', ' ', t)
        t = re.sub(r'<[^>]+>', ' ', t)
        strings.add(t.replace("\\'", "'"))
strings = sorted(strings)

def words(t):
    return re.findall('[א-ת֑-ׇ\'"״׳־]+', t)

def strip(w): return NIK.sub('', w)
def clean(w): return unicodedata.normalize('NFC', w.replace('\u05BD', '').replace('|', '').replace('\u05BE', ''))

# all unique vowelized words
uniq = {}
for s in strings:
    for w in words(s):
        if NIK.search(w):
            uniq.setdefault(strip(w), set()).add(w)

plainwords = sorted(uniq)
# Dicta per batch of words (context-free check is weaker, so we also use sentence context)
def dicta(text):
    req = urllib.request.Request('https://nakdan-5-3.loadbalancer.dicta.org.il/api', data=json.dumps({'task': 'nakdan', 'data': text, 'genre': 'modern', 'addmorph': False, 'keepqq': False, 'nodageshdefmem': False, 'patachma': False, 'keepmetagim': True}).encode(), headers={'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(req, timeout=60))

# sentence-context check: send plain sentences in batches
issues = {}
batch, out = [], []
plains = [strip(s) for s in strings]
B = 25
for i in range(0, len(strings), B):
    chunk_v = strings[i:i+B]
    text = '\n'.join(strip(x) for x in chunk_v)
    res = dicta(text)
    # rebuild lines
    lines, cur = [], []
    for tok in res:
        if tok['sep'] and '\n' in tok['word']:
            lines.append(cur); cur = []
        elif not tok['sep']:
            cur.append(tok)
    lines.append(cur)
    for v, toks in zip(chunk_v, lines):
        mine = [w for w in words(v)]
        dmap = {}
        for t in toks:
            opts = [clean(o) for o in t.get('options', [])]
            dmap.setdefault(t['word'], opts)
        for w in mine:
            if not NIK.search(w): continue
            p = strip(w)
            opts = dmap.get(p)
            if not opts: continue
            cw = clean(w)
            if cw not in opts:
                issues.setdefault(w, {'dicta': opts[:3], 'ctx': strip(v)[:70], 'strong': True})
            elif cw != opts[0]:
                issues.setdefault(w, {'dicta': opts[:3], 'ctx': strip(v)[:70], 'strong': False})

for strong in (True, False):
    print('=== NOT IN DICTA OPTIONS ===' if strong else '=== DICTA PREFERS ANOTHER ===')
    for w, d in sorted(issues.items()):
        if d['strong'] == strong: print(f"{w}\t→ {' / '.join(d['dicta'])}\t| {d['ctx']}")
print('strings', len(strings), 'issues', len(issues), file=sys.stderr)
