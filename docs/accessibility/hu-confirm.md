# Hungarian wording to confirm

Every string in `src/i18n/hu.json` that carries the mark `[HU: confirm]`: 53 strings, all added in the accessibility pilot. To confirm one, correct it if needed and delete the mark. The mark shows in the interface on purpose, so nothing unconfirmed can go live unnoticed. The no-JavaScript notice in `index.html` repeats one of them without the mark ("A kiállítás szöveges változata").

`python3 tests/tools/hu-confirm.py` prints the current list and checks that both language files have the same keys.

## Where a work is (text version)

- `ui.textEdition.positionsNote`
  - HU: Az itt megadott helyek a 3D rekonstrukciót és annak döntési naplóját követik.
  - EN: The positions given here follow the 3D reconstruction and its decision log.
- `ui.textEdition.pos.left`
  - HU: Belépéskor a bal oldali falon.
  - EN: On the left wall as you enter.
- `ui.textEdition.pos.right`
  - HU: Belépéskor a jobb oldali falon.
  - EN: On the right wall as you enter.
- `ui.textEdition.pos.ahead`
  - HU: Belépéskor a szemközti falon.
  - EN: On the wall facing you as you enter.
- `ui.textEdition.pos.behind`
  - HU: Belépéskor a hátad mögötti falon.
  - EN: On the wall behind you as you enter.
- `ui.textEdition.pos.only`
  - HU: Ezen a falon ez az egyetlen mű.
  - EN: It is the only work on this wall.
- `ui.textEdition.pos.orderSide`
  - HU: Ezen a falon {n} mű van. Sorszáma a bejárat felőli végtől számolva: {i}.
  - EN: It is work {i} of {n} on this wall, counting from the end you enter at.
- `ui.textEdition.pos.orderFacing`
  - HU: Ezen a falon {n} mű van. Sorszáma balról számolva, a fallal szemben állva: {i}.
  - EN: It is work {i} of {n} on this wall, counting from the left as you face it.
- `ui.textEdition.pos.alongNear`
  - HU: A fal bejárat felőli végénél van.
  - EN: It hangs near the end you enter at.
- `ui.textEdition.pos.alongMid`
  - HU: Nagyjából a fal közepén van.
  - EN: It hangs about halfway along the wall.
- `ui.textEdition.pos.alongFar`
  - HU: A fal túlsó vége felé van.
  - EN: It hangs towards the far end of the wall.
- `ui.textEdition.pos.doorAheadLeft`
  - HU: A következő terembe ({room}) vezető átjárótól balra van.
  - EN: It hangs to the left of the way through to {room}.
- `ui.textEdition.pos.doorAheadRight`
  - HU: A következő terembe ({room}) vezető átjárótól jobbra van.
  - EN: It hangs to the right of the way through to {room}.
- `ui.textEdition.pos.doorBehindLeft`
  - HU: A bejárat mellett van, belépéskor a bal kezed felől.
  - EN: It hangs beside the doorway you came through, on your left as you walk in.
- `ui.textEdition.pos.doorBehindRight`
  - HU: A bejárat mellett van, belépéskor a jobb kezed felől.
  - EN: It hangs beside the doorway you came through, on your right as you walk in.
- `ui.textEdition.pos.floorNear`
  - HU: A padlón, a bejárat közelében.
  - EN: On the floor, near the entrance.
- `ui.textEdition.pos.floorMid`
  - HU: A padlón, a terem közepén.
  - EN: On the floor, in the middle of the room.
- `ui.textEdition.pos.floorFar`
  - HU: A padlón, a terem túlsó végében.
  - EN: On the floor, at the far end of the room.

## Text version: other lines

- `ui.textEdition.intro`
  - HU: Ez az oldal szövegként adja vissza a kiállítást: a négy termet a bejárás sorrendjében és a {count} művet, mindegyiknél azt is, hol volt. Nem kell hozzá 3D grafika, és JavaScript nélkül is működik.
  - EN: This page gives the exhibition as text: the four rooms in visiting order and the {count} works, each with where it hung. It needs no 3D graphics and works without JavaScript.
- `ui.textEdition.toWalk`
  - HU: Tovább a 3D bejáráshoz
  - EN: Go to the 3D walk
- `ui.textEdition.enterStairs`
  - HU: A lépcsőn lefelé érkezel.
  - EN: You come in down the stairs.
- `ui.textEdition.enterFrom`
  - HU: Innen érkezel: {room}.
  - EN: You come in from {room}.
- `ui.textEdition.sheet`
  - HU: A kiállítási szöveg ebben a teremben is ott van a falon. {where}
  - EN: The exhibition text is on a wall in this room. {where}
- `ui.textEdition.openInWalk`
  - HU: {no}. mű, {title}: megnyitás a 3D bejárásban
  - EN: Open No. {no}, {title}, in the 3D walk
- `ui.textEdition.textAbove`
  - HU: A műhöz tartozó szöveg feljebb olvasható, itt: {ref}.
  - EN: The artist's text that goes with this work is printed above, under {ref}.
- `ui.textEdition.part`
  - HU: A műhöz tartozó kis képernyő külön van. {where}
  - EN: A small screen that belongs to the work hangs apart from it. {where}
- `ui.textEdition.skip`
  - HU: A kiállítás szöveges változata
  - EN: Text version of the exhibition

## Screen reader announcements

- `ui.announce.work`
  - HU: {no}. mű, {title}. Megnyitás: Enter.
  - EN: No. {no}, {title}. Press Enter to open.
- `ui.announce.text`
  - HU: Kiállítási szöveg. Elolvasás: Enter.
  - EN: Exhibition text. Press Enter to read.
- `ui.announce.tourStopped`
  - HU: A tárlatvezetés leállt.
  - EN: Tour stopped.

## Name of the 3D view

- `ui.sceneLabel`
  - HU: A kiállítás 3D nézete: a nyílbillentyűkkel sétálhatsz, az Enter megnyitja az előtted lévő művet. A szöveges változat, az oldal első hivatkozása, felsorolja az összes művet és billentyűt.
  - EN: 3D view of the exhibition: walk with the arrow keys, press Enter to open the work in front of you. The text version, the first link on the page, lists every work and all the keys.

## Accessibility statement

- `accessibility.sections[0].p[0]`
  - HU: Ez egy pilot: a bejárás első akadálymentesített változata. Nem állítja, hogy megfelel a WCAG-nak. A WCAG 2.2 és a W3C XR-akadálymentességi felhasználói követelményei (XAUR) alapján dolgoztam; ez az oldal azt írja le, mit teszteltem, mi működik, és mi nem működik még.
  - EN: This is a pilot: the first accessible version of the walk. It does not claim conformance with WCAG. I worked from WCAG 2.2 and the W3C's XR Accessibility User Requirements, and this page says what was tested, what works and what does not work yet.
- `accessibility.sections[1].p[0]`
  - HU: Automatikusan: axe-core 4.14, Playwrighton keresztül, Chromiumban, a szöveges változaton mindkét nyelven (világos és sötét módban), valamint a bejárás minden állapotában: a nyitóképernyőn, minden panelen, a hangra vonatkozó kérdésnél, a belső vezérlőknél, a teremmenünél és a műnézőben. Eredmény 2026. november 13-án: a 34 állapot egyikében sem volt hiba. Az axe nem tudta megítélni a 3D nézet vagy egy kép fölött álló szöveg kontrasztját.
  - EN: Automated: axe-core 4.14 through Playwright in Chromium, on the text version in both languages (light and dark) and on the walk in each of its states: the title screen, every panel, the sound question, the controls inside, the rooms menu and the artwork viewer. Result on 13 November 2026: no violations in any of the 34 states. axe could not judge the contrast of text that lies over the 3D view or a picture.
- `accessibility.sections[1].p[1]`
  - HU: Csak billentyűzettel: gépi tesztfutás Chromiumban az oldal betöltésétől, a Tab, Shift+Tab, Enter, Esc, Page Down, Page Up és T billentyűkkel: az ugróhivatkozás oda-vissza, minden panel, a hangra vonatkozó kérdés, a műnéző, mind a 17 mű, a tárlatvezetés, a teremmenü és a nyelvváltó. Mind a 29 lépés sikeres volt.
  - EN: Keyboard only: a scripted run in Chromium from page load, with Tab, Shift+Tab, Enter, Esc, Page Down, Page Up and T: the skip link and back, every panel, the sound question, the viewer, all 17 works, the tour, the rooms menu and the language switch. All 29 steps passed.
- `accessibility.sections[1].p[2]`
  - HU: Csökkentett mozgás: a rendszerbeállítást Chromiumban emulálva.
  - EN: Reduced motion: with the system setting emulated in Chromium.
- `accessibility.sections[1].p[3]`
  - HU: Telefonszélesség: a szöveges változat 375 képpont szélesen, JavaScripttel és anélkül.
  - EN: Phone width: the text version at 375 pixels, with and without JavaScript.
- `accessibility.sections[1].p[4]`
  - HU: Még nem teszteltem: képernyőolvasóval, Firefoxban és Safariban, valódi telefonon és táblagépen, 200%-os vagy nagyobb böngészőnagyítással, a Google Drive videólejátszójával, és fogyatékossággal élő látogatókkal.
  - EN: Not tested yet: any screen reader, Firefox and Safari, real phones and tablets, browser zoom at 200% or more, the Google Drive video player, and visits by people with disabilities.
- `accessibility.sections[2].p[0]`
  - HU: A szöveges változat 3D grafika és JavaScript nélkül adja a teljes kiállítást: a négy termet a bejárás sorrendjében, a 17 művet az adataival és azzal, hogy melyik hol volt, a szövegeket és a közreműködőket. Ez az oldal első hivatkozása.
  - EN: The text version gives the whole exhibition without 3D graphics and without JavaScript: the four rooms in visiting order, the 17 works with their data and where each one hung, the texts and the credits. It is the first link on the page.
- `accessibility.sections[2].p[1]`
  - HU: Billentyűzet: a Tab minden gombot és hivatkozást elér, és mindegyiken látszik a fókuszkeret. A panelek, a műnéző és a hangra vonatkozó kérdés megnyitáskor átveszik a fókuszt, a Tab bennük marad, Esc-re bezárulnak, és a fókusz visszakerül oda, ahol voltál. A Page Down és a Page Up a következő és az előző műhöz visz. Az Enter megnyitja az előtted lévő művet.
  - EN: Keyboard: Tab reaches every button and link, and each shows a focus ring. Panels, the artwork viewer and the sound question take focus when they open, keep Tab inside, close with Esc and hand focus back to where you were. Page Down and Page Up go to the next and the previous work. Enter opens the work in front of you.
- `accessibility.sections[2].p[2]`
  - HU: Képernyőolvasóknak a bejárás egyszerre egy sort ír egy élő régióba: a termet, ahová belépsz, az előtted lévő művet és a tárlatvezetés minden feliratát. A 3D nézetnek neve van, amely a szöveges változatra mutat.
  - EN: For screen readers the walk writes one line at a time into a live region: the room you enter, the work in front of you, each caption of the tour. The 3D view has a name that points to the text version.
- `accessibility.sections[2].p[3]`
  - HU: Ha a rendszeredben be van kapcsolva a csökkentett mozgás, a bejárásban nincs glitch-átmenet, nincs szemcse, nincs színszegély és nincs lüktetés, a tárlatvezetés pedig megállóról megállóra ugrik. A betöltőképernyő mindenkinek állókép.
  - EN: With reduced motion switched on in your system, the walk has no glitch transition, no grain, no colour fringes and no pulsing, and the tour jumps from stop to stop. The loading screen is a still image for everyone.
- `accessibility.sections[3].p[0]`
  - HU: Az élő bemondásokat csak szövegként ellenőriztem. Még nem tudni, hogyan olvassa fel őket egy képernyőolvasó a 3D bejárásban.
  - EN: The live announcements were checked as text only. How a screen reader reads them in the 3D walk is not known yet.
- `accessibility.sections[3].p[1]`
  - HU: Az egybillentyűs parancsok (T, M, E és W, A, S, D) nem kapcsolhatók ki és nem állíthatók át. Ez nem felel meg a WCAG 2.1.4-nek, ami leginkább a beszédvezérlést használókat érinti.
  - EN: The single-key shortcuts T, M, E and W, A, S, D cannot be switched off or changed. This fails WCAG 2.1.4, which matters most to people who use speech input.
- `accessibility.sections[3].p[2]`
  - HU: A művekhez nincs leírás arról, mit ábrázolnak, a videókhoz pedig nincs felirat, átirat vagy audionarráció. A szöveges változat minden mű adatait, helyét és a művész szövegét adja meg.
  - EN: The works have no descriptions of what they show, and the videos have no captions, transcripts or audio description. The text version gives each work's data, its place and the artist's text.
- `accessibility.sections[3].p[3]`
  - HU: Érintőképernyős telefonon a 3D bejárás képernyőolvasóval nem használható. A szöveges változat igen.
  - EN: On a touch phone the 3D walk cannot be used with a screen reader. The text version can.
- `accessibility.sections[3].p[4]`
  - HU: Billentyűzettel sétálni és jobbra-balra fordulni lehet, felfelé vagy lefelé nézni nem. A térképre csak kattintani lehet; ugyanezt billentyűzettel a teremmenü adja.
  - EN: By keyboard you can walk and turn left and right, but not look up or down. The map can only be clicked; the rooms menu does the same by keyboard.
- `accessibility.sections[3].p[5]`
  - HU: A sétához nyomva kell tartani egy billentyűt. A Page Down és a Page Up, a teremmenü és a tárlatvezetés úgy visz tovább, hogy semmit sem kell nyomva tartani.
  - EN: Walking means holding a key down. Page Down and Page Up, the rooms menu and the tour move you without holding anything.
- `accessibility.sections[3].p[6]`
  - HU: A tárlatvezetés feliratai maguktól váltanak: 5 másodperc után, a hangos videóknál 14 után. A tárlatvezetés leállítható (T vagy Esc), de nem szüneteltethető és nem lassítható.
  - EN: The tour's captions change by themselves: after 5 seconds, or 14 at the videos with sound. The tour can be stopped (T or Esc) but not paused or slowed.
- `accessibility.sections[3].p[7]`
  - HU: A 3D nézet fölötti apró feliratok kontrasztja a mögöttük lévő faltól függ; ezt nem mértem.
  - EN: The contrast of the small labels over the 3D view depends on the wall behind them and was not measured.
- `accessibility.sections[3].p[8]`
  - HU: Az új részek magyar szövege még megerősítésre vár.
  - EN: The Hungarian wording of the new parts is still to be confirmed.
- `accessibility.sections[4].p[0]`
  - HU: A tér hangos leírása (audionarráció). Egy nézet, amely megmutatja, mi mért és mi becsült a rekonstrukcióban. Teszt az NVDA képernyőolvasóval, Windowson.
  - EN: An audio description of the space. A view that shows what in the reconstruction was measured and what was guessed. A test with the NVDA screen reader on Windows.
- `accessibility.sections[5].p[0]`
  - HU: Ha itt valami nem működik nálad, vagy más formában lenne szükséged a kiállításra, írj nekem.
  - EN: If something here does not work for you, or you need the exhibition in another form, write to me.
- `accessibility.updated`
  - HU: A nyilatkozat kelte: 2026. november 13.
  - EN: Statement of 13 November 2026
