# Hungarian strings that address the reader

14 November 2026. The rule (in `CLAUDE.md`): Hungarian addresses no one where it can, with no te forms, and Ön only where the reconstructor chose it. This is every string in `src/i18n/hu.json`, outside the legal and privacy sections, that still uses a te or an Ön form. Nothing here has been changed. Found by three independent readings of the file (the interface strings, the content, and a sweep by verb and possessive endings), each hit then checked on its own; all three agreed on these eleven.

| Key | Form | Words | String |
|---|---|---|---|
| `ui.docDescription` | te | Nézd meg | Nézd meg Szabó Kristóf - KristofLab Artificial Paradise című kiállítását fotókból rekonstruálva, bejárható 3D kiállításként a böngészőben. A kiállítás eredetileg a MAMŰ Galériában, Budapesten, 2025. január 10-31. között volt megtekinthető. |
| `ui.soundAsk.question` | te | nézed | Hanggal nézed a kiállítást? |
| `ui.soundAsk.hint` | te | be- és kikapcsolhatod | Fejhallgatóval izgalmasabb · az M billentyűvel bármikor be- és kikapcsolhatod |
| `ui.loader.failure` | te | Próbáld meg | Ez a böngésző nem tudta elindítani a 3D kiállítást (WebGL szükséges). Próbáld meg egy friss Chrome, Firefox vagy Safari böngészővel. |
| `ui.hud.clickToLook` | te | Húzd | Húzd az egeret a körülnézéshez |
| `ui.hud.promptText` | te | Kattints | Kattints a kiállítási szöveg elolvasásához |
| `ui.hud.promptWork` | te | Kattints | Kattints a megtekintéshez · {no} {title} |
| `ui.hud.minimap` | te | kattints | Térkép: kattints egy teremre az odaugráshoz |
| `ui.hud.keys.wheel` | te | görgess | görgess a sétához |
| `accessibility.sections[2].p[2]` | te | belépsz; előtted | Képernyőolvasóknak a bejárás egyszerre egy sort ír egy élő régióba: a termet, ahová belépsz, az előtted lévő művet és a tárlatvezetés minden feliratát. A 3D nézetnek neve van, amely a szöveges változatra mutat. [HU: confirm] |
| `accessibility.sections[5].p[0]` | Ön | kérem, jelezze | Ha valami nem működik, kérem, jelezze {link}. |

Notes:

- `accessibility.sections[5].p[0]` is the one Ön form the reconstructor chose (the contact line).
- `accessibility.sections[2].p[2]` still carries its `[HU: confirm]` mark; the paragraph before it already says "a nézet közepén lévő művet" for the same thing.
- The first nine were on the site before the pilot.
- The authors' texts (exhibition text, opening speech, the artist's texts) address no one; the legal and privacy sections were not read for this list.
