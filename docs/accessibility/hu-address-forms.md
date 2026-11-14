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
- `accessibility.sections[2].p[2]` was reworded by the reconstructor on 14 November 2026 and addresses no one now.
- The first nine were on the site before the pilot.
- The authors' texts (exhibition text, opening speech, the artist's texts) address no one; the legal and privacy sections were not read for this list.

## Proposed impersonal versions (14 November 2026)

These were proposals, marked `[HU: confirm]` in `hu.json` until the reconstructor gave her final wording (next section). They already follow the naming rule in `CLAUDE.md` ("digitális kiállítás"). The line for `accessibility.sections[2].p[2]` is the reconstructor's own wording, set with her other confirmed strings. The contact line keeps its chosen Ön form.

| Key | Old | New |
|---|---|---|
| `ui.docDescription` | Nézd meg Szabó Kristóf - KristofLab Artificial Paradise című kiállítását fotókból rekonstruálva, bejárható 3D kiállításként a böngészőben. A kiállítás eredetileg a MAMŰ Galériában, Budapesten, 2025. január 10-31. között volt megtekinthető. | Szabó Kristóf - KristofLab Artificial Paradise című kiállításának digitális változata, fotókból rekonstruálva: a termek a böngészőben végigjárhatók. A kiállítás eredetileg a MAMŰ Galériában, Budapesten, 2025. január 10-31. között volt megtekinthető. |
| `ui.soundAsk.question` | Hanggal nézed a kiállítást? | Hanggal vagy hang nélkül? |
| `ui.soundAsk.hint` | Fejhallgatóval izgalmasabb · az M billentyűvel bármikor be- és kikapcsolhatod | Fejhallgatóval izgalmasabb · a hang az M billentyűvel bármikor be- és kikapcsolható |
| `ui.loader.failure` | Ez a böngésző nem tudta elindítani a 3D kiállítást (WebGL szükséges). Próbáld meg egy friss Chrome, Firefox vagy Safari böngészővel. | Ez a böngésző nem tudta elindítani a digitális kiállítást (WebGL szükséges). Egy friss Chrome, Firefox vagy Safari böngészővel érdemes újra megpróbálni. |
| `ui.hud.clickToLook` | Húzd az egeret a körülnézéshez | Egérhúzás: körülnézés |
| `ui.hud.promptText` | Kattints a kiállítási szöveg elolvasásához | Kattintás: a kiállítási szöveg elolvasása |
| `ui.hud.promptWork` | Kattints a megtekintéshez · {no} {title} | Kattintás: megtekintés · {no} {title} |
| `ui.hud.minimap` | Térkép: kattints egy teremre az odaugráshoz | Térkép: egy teremre kattintva oda lehet ugrani |
| `ui.hud.keys.wheel` | görgess a sétához | görgetés: séta |
| `accessibility.sections[2].p[2]` | Képernyőolvasóknak a bejárás egyszerre egy sort ír egy élő régióba: a termet, ahová belépsz, az előtted lévő művet és a tárlatvezetés minden feliratát. A 3D nézetnek neve van, amely a szöveges változatra mutat. | (the reconstructor's wording) A 3D nézetre lépve a képernyőolvasó felolvassa, hogy ez a digitális kiállítás nézete, és jelzi, hol érhető el az akadálymentes változat. Séta közben bemondja, melyik teremben van a látogató, és melyik kiállított mű van épp fókuszban. |

## Final wording (14 November 2026)

The reconstructor's own wording, set in both languages. No string in `hu.json` carries a mark now, and outside the legal and privacy sections the contact line is the only one that addresses the reader (Ön, chosen by the reconstructor). The legal notice has one te form left, "kérj engedélyt" in its copyright section; it is legal text, so it changes only when the reconstructor asks.

| Key | Hungarian | English |
|---|---|---|
| `ui.docDescription` | Szabó Kristóf - KristofLab Artificial Paradise című kiállítása fotókból rekonstruálva, a böngészőben bejárható digitális kiállításként. A kiállítás eredetileg a MAMŰ Galériában, Budapesten, 2025. január 10–31. között volt megtekinthető. | The exhibition Artificial Paradise by Kristóf Szabó - KristofLab, reconstructed from photographs as a digital exhibition that can be walked through in the browser. It was on view at MAMŰ Gallery, Budapest, 10–31 January 2025. |
| `ui.soundAsk.question` | Hanggal induljon a kiállítás? | Start with sound? |
| `ui.soundAsk.hint` | Fejhallgatóval izgalmasabb · a hang az M billentyűvel bármikor be- és kikapcsolható | Better with headphones · M switches the sound on or off any time |
| `ui.loader.failure` | Ez a böngésző nem tudta elindítani a digitális kiállítást (WebGL szükséges). Friss verziójú Chrome, Firefox vagy Safari böngészővel érdemes megpróbálni. | This browser could not start the digital exhibition (WebGL is needed). Try a recent Chrome, Firefox or Safari. |
| `ui.hud.clickToLook` | Az egeret húzva körbe lehet nézni a teremben. | Drag the mouse to look around the room. |
| `ui.hud.promptText` | Kattintás a bal egérgombbal: a kiállítási szöveg elolvasásához | Left-click to read the exhibition text |
| `ui.hud.promptWork` | Kattintás a megtekintéshez · {no} {title} | Click to view · {no} {title} |
| `ui.hud.minimap` | Alaprajz: egy teremre kattintva automatikusan oda lehet jutni | Floor plan: click a room to go there |
| `ui.hud.keys.wheel` | Sétáláshoz az egér görgője is használható | The mouse wheel also walks |
| `accessibility.sections[5].p[0]` | Ha valami nem működik, kérem, jelezze e-mailben a digitális kiállítás alkotójának. | If something does not work, please tell the creator of the digital exhibition by e-mail. |
