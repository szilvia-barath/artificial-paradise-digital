# Hungarian strings to check

Every string in `src/i18n/hu.json` that is new or changed since the last check by a Hungarian reader: 0. The assistant wrote them (unless the note beside one says otherwise), impersonal, with the names in `CLAUDE.md`. They are live as they stand; nothing in the interface marks them. The last check was on 14 November 2026, when the reconstructor had worded or confirmed every string then in the file.

To check: read each line against its English, correct it in `src/i18n/hu.json` if needed, then run `python3 tests/tools/hu-confirm.py --checked`, which empties this list. `python3 tests/tools/hu-confirm.py --write` rewrites the list; it also checks that both language files have the same keys and that no string carries a `[HU: confirm]` mark.

