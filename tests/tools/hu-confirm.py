#!/usr/bin/env python3
"""Lists the Hungarian strings still marked [HU: confirm], and checks that en.json and
hu.json have the same keys. Usage: python3 tests/tools/hu-confirm.py"""
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
sys.exit(1 if diff else 0)
