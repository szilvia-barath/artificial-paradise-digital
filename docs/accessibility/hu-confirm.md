# Hungarian wording to confirm

Every string in `src/i18n/hu.json` that still carries the mark `[HU: confirm]`: 9. To confirm one, correct it if needed and delete the mark. The mark shows in the interface on purpose, so nothing unconfirmed can go live unnoticed. Rule: the Hungarian addresses no one where it can (see `hu-address-forms.md`).

Written by `python3 tests/tools/hu-confirm.py --write`, which also checks that both language files have the same keys.

- `ui.docDescription`
  - HU: Szabó Kristóf - KristofLab Artificial Paradise című kiállításának digitális változata, fotókból rekonstruálva: a termek a böngészőben végigjárhatók. A kiállítás eredetileg a MAMŰ Galériában, Budapesten, 2025. január 10-31. között volt megtekinthető.
  - EN: The digital version of Kristóf Szabó - KristofLab's exhibition Artificial Paradise, reconstructed from photographs: its rooms can be walked through in the browser. The exhibition was on view at MAMŰ Gallery, Budapest, 10-31 January 2025.
- `ui.soundAsk.question`
  - HU: Hanggal vagy hang nélkül?
  - EN: Visit with sound?
- `ui.soundAsk.hint`
  - HU: Fejhallgatóval izgalmasabb · a hang az M billentyűvel bármikor be- és kikapcsolható
  - EN: Headphones recommended · M switches it on or off any time
- `ui.loader.failure`
  - HU: Ez a böngésző nem tudta elindítani a digitális kiállítást (WebGL szükséges). Egy friss Chrome, Firefox vagy Safari böngészővel érdemes újra megpróbálni.
  - EN: This browser could not start the digital exhibition (WebGL is needed). Try a recent Chrome, Firefox or Safari.
- `ui.hud.clickToLook`
  - HU: Egérhúzás: körülnézés
  - EN: Drag to look around
- `ui.hud.promptText`
  - HU: Kattintás: a kiállítási szöveg elolvasása
  - EN: Click to read the exhibition text
- `ui.hud.promptWork`
  - HU: Kattintás: megtekintés · {no} {title}
  - EN: Click to view · {no} {title}
- `ui.hud.minimap`
  - HU: Térkép: egy teremre kattintva oda lehet ugrani
  - EN: Map: click a room to jump there
- `ui.hud.keys.wheel`
  - HU: görgetés: séta
  - EN: scroll to walk
