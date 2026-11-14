# Hungarian wording to confirm

Every string in `src/i18n/hu.json` that still carries the mark `[HU: confirm]`: 0. To confirm one, correct it if needed and delete the mark. The mark shows in the interface on purpose, so nothing unconfirmed can go live unnoticed. Rule: the Hungarian addresses no one where it can (see `hu-address-forms.md`).

Written by `python3 tests/tools/hu-confirm.py --write`, which also checks that both language files have the same keys.

