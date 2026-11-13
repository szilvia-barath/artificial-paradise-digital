#!/usr/bin/env python3
"""Adds or replaces keys under "ui" in both language files, keeping their formatting.
Usage: python3 tests/tools/add-strings.py strings.json   ({"en": {"a.b": "…"}, "hu": {"a.b": "…"}})"""
import json, sys
spec = json.load(open(sys.argv[1], encoding='utf-8'))
assert set(spec['en']) == set(spec['hu']), 'EN and HU keys differ: %s' % (set(spec['en']) ^ set(spec['hu']))
for lang in ('en', 'hu'):
    path = f'src/i18n/{lang}.json'
    d = json.load(open(path, encoding='utf-8'))
    for key, val in spec[lang].items():
        node = d['ui']
        parts = key.split('.')
        for p in parts[:-1]:
            node = node.setdefault(p, {})
        node[parts[-1]] = val
    open(path, 'w', encoding='utf-8').write(json.dumps(d, indent=2, ensure_ascii=False) + '\n')
print('ok', len(spec['en']), 'keys')
