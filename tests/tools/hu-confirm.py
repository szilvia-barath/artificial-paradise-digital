#!/usr/bin/env python3
"""Lists the Hungarian strings still marked [HU: confirm], and checks that en.json and
hu.json have the same keys. With --write it also rewrites docs/accessibility/hu-confirm.md.
Usage: python3 tests/tools/hu-confirm.py [--write]"""
import json, sys
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
# the exhibition text has four paragraphs in English and two in the Hungarian original
known = {'text[2]', 'text[3]'}
diff = (set(E) ^ set(H)) - known
for k in sorted(diff):
    print('key in one language only:', k)
marked = [(k, v) for k, v in H.items() if isinstance(v, str) and '[HU: confirm]' in v]
for k, v in marked:
    print(f'{k}\n  HU: {v}\n  EN: {E.get(k, "")}')
print(f'{len(marked)} strings to confirm; keys match: {not diff}')
if '--write' in sys.argv:
    out = ['# Hungarian wording to confirm', '',
           f'Every string in `src/i18n/hu.json` that still carries the mark `[HU: confirm]`: {len(marked)}. '
           'To confirm one, correct it if needed and delete the mark. The mark shows in the interface on purpose, '
           'so nothing unconfirmed can go live unnoticed. Rule: the Hungarian addresses no one where it can (see `hu-address-forms.md`).', '',
           'Written by `python3 tests/tools/hu-confirm.py --write`, which also checks that both language files have the same keys.', '']
    for k, v in marked:
        out += [f'- `{k}`', f'  - HU: {v.replace(" [HU: confirm]", "")}', f'  - EN: {E.get(k, "")}']
    open('docs/accessibility/hu-confirm.md', 'w', encoding='utf-8').write('\n'.join(out) + '\n')
sys.exit(1 if diff else 0)
