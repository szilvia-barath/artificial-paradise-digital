#!/usr/bin/env python3
"""Hungarian strings for a later check by a Hungarian reader.

The rule (CLAUDE.md, "Text and languages"): new Hungarian is written straight into
src/i18n/hu.json, impersonal, with no mark in the interface. This tool lists every
Hungarian string that is new or changed since the last check, with its English beside it.

  python3 tests/tools/hu-confirm.py            list them; also checks that en.json and
                                               hu.json have the same keys and that no
                                               string carries a "[HU: confirm]" mark
  python3 tests/tools/hu-confirm.py --write    also rewrite docs/accessibility/hu-confirm.md
  python3 tests/tools/hu-confirm.py --checked  a Hungarian reader has checked the list:
                                               take the present strings as checked and
                                               empty the list
  python3 tests/tools/hu-confirm.py --note KEY "words"
                                               put a note beside one string in the list
                                               (kept in tests/tools/hu-notes.json against
                                               the string's fingerprint, so it goes when
                                               the string changes again)

tests/tools/hu-checked.txt holds a fingerprint of every string that has been checked (not
the text). It was first written on 14 November 2026, when the reconstructor had worded or
confirmed every Hungarian string then in the file."""
import hashlib, json, sys

CHECKED = 'tests/tools/hu-checked.txt'
DOC = 'docs/accessibility/hu-confirm.md'
en = json.load(open('src/i18n/en.json', encoding='utf-8'))
hu = json.load(open('src/i18n/hu.json', encoding='utf-8'))

def walk(o, p=''):
    if isinstance(o, dict):
        for k, v in o.items():
            yield from walk(v, f'{p}.{k}' if p else k)
    elif isinstance(o, list):
        for i, v in enumerate(o):
            yield from walk(v, f'{p}[{i}]')
    else:
        yield p, o

E, H = dict(walk(en)), dict(walk(hu))
strings = {k: v for k, v in H.items() if isinstance(v, str)}
fp = lambda s: hashlib.sha1(s.encode('utf-8')).hexdigest()[:12]

# the exhibition text has four paragraphs in English and two in the Hungarian original
known = {'text[2]', 'text[3]'}
diff = (set(E) ^ set(H)) - known
for k in sorted(diff):
    print('key in one language only:', k)
marks = [k for k, v in strings.items() if '[HU: confirm]' in v]
for k in marks:
    print('mark in the interface:', k)

if '--checked' in sys.argv:
    open(CHECKED, 'w', encoding='utf-8').write('\n'.join(sorted({fp(v) for v in strings.values()})) + '\n')
try:
    checked = set(open(CHECKED, encoding='utf-8').read().split())
except FileNotFoundError:
    checked = set()
# a string counts as checked wherever it sits, so moving a paragraph does not list it again
# and a string that is the same in both files (an address, a name) is not Hungarian
new = [(k, v) for k, v in strings.items() if fp(v) not in checked and v != E.get(k)]
NOTES = 'tests/tools/hu-notes.json'
try:
    notes = json.load(open(NOTES, encoding='utf-8'))
except FileNotFoundError:
    notes = {}
if '--note' in sys.argv:
    key, words = sys.argv[sys.argv.index('--note') + 1:][:2]
    notes[fp(strings[key])] = words
live = {fp(v) for _, v in new}
notes = {f: n for f, n in notes.items() if f in live}
if '--note' in sys.argv or '--checked' in sys.argv:
    open(NOTES, 'w', encoding='utf-8').write(json.dumps(notes, indent=2, ensure_ascii=False, sort_keys=True) + '\n')
for k, v in new:
    print(f'{k}\n  HU: {v}\n  EN: {E.get(k, "")}')
print(f'{len(new)} Hungarian strings new or changed since the last check; marks: {len(marks)}; keys match: {not diff}')

if '--write' in sys.argv or '--checked' in sys.argv or '--note' in sys.argv:
    out = ['# Hungarian strings to check', '',
           f'Every string in `src/i18n/hu.json` that is new or changed since the last check by a Hungarian reader: {len(new)}. '
           'The assistant wrote them (unless the note beside one says otherwise), impersonal, with the names in `CLAUDE.md`. '
           'They are live as they stand; nothing in the interface marks them. '
           'The last check was on 14 November 2026, when the reconstructor had worded or confirmed every string then in the file.', '',
           'To check: read each line against its English, correct it in `src/i18n/hu.json` if needed, then run '
           '`python3 tests/tools/hu-confirm.py --checked`, which empties this list. '
           '`python3 tests/tools/hu-confirm.py --write` rewrites the list; it also checks that both language files have the same keys '
           'and that no string carries a `[HU: confirm]` mark.', '']
    for k, v in new:
        out += [f'- `{k}`' + (f' ({notes[fp(v)]})' if fp(v) in notes else ''), f'  - HU: {v}', f'  - EN: {E.get(k, "")}']
    open(DOC, 'w', encoding='utf-8').write('\n'.join(out) + '\n')
sys.exit(1 if diff or marks else 0)
