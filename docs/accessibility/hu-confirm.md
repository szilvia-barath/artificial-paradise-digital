# Hungarian strings to check

Every string in `src/i18n/hu.json` that is new or changed since the last check by a Hungarian reader: 10. The assistant wrote them (unless the note beside one says otherwise), impersonal, with the names in `CLAUDE.md`. They are live as they stand; nothing in the interface marks them. The last check was on 14 November 2026, when the reconstructor had worded or confirmed every string then in the file.

To check: read each line against its English, correct it in `src/i18n/hu.json` if needed, then run `python3 tests/tools/hu-confirm.py --checked`, which empties this list. `python3 tests/tools/hu-confirm.py --write` rewrites the list; it also checks that both language files have the same keys and that no string carries a `[HU: confirm]` mark.

- `ui.loader.howtoTouch`
  - HU: A bal oldali karral lehet sétálni, húzással körülnézni, csippentéssel nagyítani, egy műre koppintva pedig megnyitni azt.
  - EN: Walk with the stick on the left, drag to look around, pinch to zoom, and tap a work to open it.
- `ui.footer.digital` (only the accent in the name changed, asked by the reconstructor)
  - HU: Digitális kiállítás: Baráth Szilvia
  - EN: Digital exhibition by Szilvia Baráth
- `ui.panels.controlsTouch`
  - HU: Érintőképernyőn a bal oldali karral lehet sétálni: előre vagy hátra tolva előre és hátra, oldalra tolva oldalra lehet lépni. A kart a széléig tolva futni lehet. Körülnézni az ujjat a nézeten húzva lehet. Nagyítani két ujjal csippentve, vagy a + és − gombbal lehet. Egy művet koppintással lehet megnyitni. Az alsó gombok elindítják a tárlatvezetést, felsorolják a termeket és némítják a hangot.
  - EN: On a touch screen, walk with the stick on the left: push it forward or back to walk, and sideways to step to the side. Pushed all the way, it runs. Drag a finger across the view to look around. Zoom by pinching with two fingers, or with the + and − buttons. Open a work by tapping it. The buttons at the bottom start the tour, list the rooms and mute the sound.
- `ui.panels.contactDigital` (only the accent in the name changed, asked by the reconstructor)
  - HU: Digitális kiállítás: Baráth Szilvia
  - EN: Digital exhibition: Szilvia Baráth
- `credits[5][1]` (only the accent in the name changed, asked by the reconstructor)
  - HU: Baráth Szilvia
  - EN: Szilvia Baráth
- `legal.sections[0].p[0]` (only the accent in the name changed, asked by the reconstructor)
  - HU: Baráth Szilvia, a digitális kiállítás készítője (3D-rekonstrukció, tervezés és programozás).
  - EN: Szilvia Baráth, who made this digital exhibition (3D reconstruction, design and programming).
- `legal.sections[1].p[0]` (legal notice; the reconstructor asked for "digitális kiállítás" in place of "bejárható 3D-rekonstrukcióként")
  - HU: Nem kereskedelmi célú, a böngészőben bejárható digitális kiállítás. Szabó Kristóf / KristofLab Artificial Paradise című kiállítását (MAMŰ Galéria, Budapest, 2025. január 10–31.) mutatja be.
  - EN: A non-commercial digital exhibition that can be walked through in the browser. It documents Artificial Paradise, the exhibition of Kristóf Szabó / KristofLab at MAMŰ Gallery, Budapest (10–31 January 2025).
- `legal.sections[3].p[0]` (only the accent in the name changed, asked by the reconstructor)
  - HU: A műalkotások, reprodukcióik és videóik, valamint a művész szövegei: © Szabó Kristóf / KristofLab. Az installációs fotókat és a dokumentációs videókat is Szabó Kristóf készítette. A MAMŰ logó a MAMŰ Társaság tulajdona. A 3D-rekonstrukció és a weboldal: © Baráth Szilvia.
  - EN: The artworks, their reproductions and videos, and the artist’s texts: © Kristóf Szabó / KristofLab. The installation photographs and the documentation videos were taken by Kristóf Szabó as well. The MAMŰ logo belongs to MAMŰ Society. The 3D reconstruction and the website: © Szilvia Baráth.
- `legal.sections[3].p[1]` (legal notice; a new line the reconstructor asked for)
  - HU: A műalkotások, a fotók, a videók és a szövegek szerzői jogi védelem alatt állnak (In Copyright), és nincs rájuk felhasználási engedély.
  - EN: The artworks, photographs, videos and texts are In Copyright: they are protected by copyright and are not licensed for reuse.
- `legal.updated` (the date only)
  - HU: Utolsó frissítés: 2026. november 14.
  - EN: Last updated: 14 November 2026
