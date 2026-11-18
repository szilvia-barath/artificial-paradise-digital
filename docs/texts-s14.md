# What still comes from the old spreadsheet of interface texts (S14)

Recorded on 16 November 2026. The check was made against commit ba3b7f1 and changed nothing: no string in `src/i18n`, in the spreadsheet or in any Drive file.

## What was asked

Which of the site's texts still come from the old spreadsheet of interface texts, source S14 in the catalogue's `sources` sheet, and what the repository records about where each group of texts comes from.

## Confirmed by the reconstructor

Szilvia Baráth confirmed on 16 November 2026:

- S14 is the Drive file `Artificial Paradise - texts EN-HU.xlsx`.
- There is no newer version of it.
- Nothing in the texts is to change because of this check.

## The answer in short

1. **Three strings still stand exactly as they were edited in the spreadsheet**, all in Hungarian or in the credits:
   - `ui.docTitle` (HU), the browser tab title: "Artificial Paradise digitális kiállítás". The site had "Artificial Paradise – digitális kiállítás" before.
   - `ui.loader.preparing` (HU), the first loading line: "Lemegyünk a pincébe..." The site had "Készül a pince…" before. This one uses a "we" form and three dots, not the one-character ellipsis.
   - The photography credit: "Photography: Kristóf Szabó" / "Fotó: Szabó Kristóf" (`credits`, row 7). The site had Szilvia Barath there before the spreadsheet. The artist confirmed the fact again on 12 November 2026, so it no longer rests on the sheet alone.
2. **Six more strings carry part of the spreadsheet's wording**, inside text that was rewritten later (section 3b). The clearest: "Fejhallgatóval izgalmasabb" in the sound question's hint, "All artworks were created by Kristóf Szabó / KristofLab" / "Minden műalkotás Szabó Kristóf / KristofLab munkája" in the rights line of the About panel, and about half of Behind the scenes.
3. **About 170 short strings are identical to their spreadsheet cell, but the spreadsheet is not where they come from.** They were written for the site on 22 and 23 October 2026, copied into the spreadsheet for editing, and left there as they were: menu names, button names, key names, room names, the media lines of the works. Section 3c lists them.
4. **Nothing else in the site's texts comes from S14.** The exhibition text, the opening speech, the artist's texts, the legal notice, the privacy note, the accessibility statement and everything written since 13 November 2026 have other sources (section 2).

## 1. What S14 is

- **The name S14 was not in the repository before this file.** A search for "S14" over `docs/`, `PROGRESS.md`, `src/`, `scripts/`, `tests/` and all five branches found only binary files. `references - texts.csv` in Brief 4 lists S11, S12, S13 and S28, not S14.
- **It is defined in the Google Sheet `sources`** (Drive folder with the catalogue tables), row S14: type "spreadsheet", description "Spreadsheet of interface texts and corrections", creator "Szilvia Szerena Barath; Kristóf Szabó", held at "Drive", used for "Interface texts, credits order, Behind the scenes", note "PROGRESS.md calls its author 'the owner'". The row names no file.
- **The file** is `Artificial Paradise - texts EN-HU.xlsx` in the exhibition's Drive folder (created 26 October 2026, last changed 30 October 2026), as the reconstructor confirmed. It holds every value that `PROGRESS.md` quotes from "the sheet" (for example "show the frames caught on camera" in Behind the scenes). It has five tabs: Művek (works: titles, years, sizes, media, captions, photo file names), Kiállítás kísérőszöveg (exhibition text, credits, Behind the scenes, the works-list note, the tour's first line), Termek (room names, subtitles, descriptions), Weboldal szövege (about 75 interface strings) and Drive mappa képek (photo file names with their Drive links).
- **What the repository says about it:**
  - `PROGRESS.md`, "Next", item 0: "the site shows only texts from the Drive folder (the exhibition text and opening speech, the artist's texts on the works and series, the spreadsheet's interface texts and Behind the scenes)".
  - `PROGRESS.md`, "Known issues": "Website texts follow the owner's spreadsheet where they edited them (Behind the scenes, the works-list note, the MAMŰ link label). Where the sheet still held values from before the Word files (credits order, the text credit, the Hungarian exhibition text, the address with the entrance, the video captions), the Word files' versions are kept. Behind the scenes says 'the screens play the artist's videos with their own sound' where the sheet said they 'show the frames caught on camera'".
  - Commit ba982c2 (30 October 2026, 11:35): "The owner's spreadsheet edits".
  - Commit a3df1b1 (30 October 2026, 12:18): "Texts from the owner's spreadsheet: Behind the scenes, the works-list note and the MAMŰ link label."
  - No later commit or log entry mentions the spreadsheet.

## 2. Every text group and its recorded source

"Recorded" means the repository says it (log line, commit message or code comment). "Inferred" is a reading of the history by the assistant who made the check.

| Group (keys) | What it is | Source as far as recorded | Evidence |
|---|---|---|---|
| `text` (HU) | Exhibition text, About panel and the two wall sheets | Word file, the curator's Hungarian original (S11) | Recorded. ba982c2: "Official Hungarian exhibition text"; `PROGRESS.md`, "Known issues": the sheet's Hungarian was the older draft and was not used |
| `text` (EN) | The same in English | Word file (S11), "a cleaned version" | Partly recorded. `PROGRESS.md`, "Known issues", says the site keeps a cleaned version of the Word file's English. The four paragraphs are unchanged since the first commit (5e8235b, 22 October 2026), a week before the commit that brought the Word file's Hungarian. The spreadsheet holds them too, unedited. Who cleaned the English and from which copy is not recorded |
| `textCredit`, `credits` | Line under the text, and the credits list | Word file (S11) for the order, the curator, the opening speaker and the supporters; **the photography credit follows the spreadsheet edit**; "Digital exhibition: Szilvia Baráth" got its accent on 14 November (5f5937c) | Recorded for the order and the text credit (`PROGRESS.md`, "Known issues"). Inferred for the photography credit: the sheet says Kristóf Szabó, the site before it said Szilvia Barath, ba982c2 changed it |
| `meta.address`, `meta.opening`, `meta.hours` | Address with the entrance, opening date, opening hours | Word file (S11) | Recorded (ba982c2; `PROGRESS.md`, "Known issues": "the address with the entrance"). The `sources` sheet says the Word file is the exhibition announcement with hours, venue and supporters |
| `meta.artist`, `.venue`, `.dates`, `.medium`, `.subtitle` | Short facts | Written for the site, 22 and 23 October | Inferred: unchanged since a560647 or earlier; in the spreadsheet unedited |
| `openingSpeech` | Opening speech, HU and EN, and its note | Google Doc (S12); the English supplied by the artist | Recorded: `PROGRESS.md` ("Next", item 0, and the entry "Whose English it is", 14 November 2026), commit fa2cb43, `references - texts.csv` |
| `descriptions.human-as-error`, `.landscape`, `.paradise-factory`, `.let-it-flow` | The artist's texts in the viewer | The artist's files in the Drive room folders (S13) | Recorded: `PROGRESS.md` ("Status": "The artist's texts from the room folders"), commit c84be34. "3.5 billion" and the Eden Project's place corrected on 13 November (06ba7c7) |
| `descriptions.artificial-paradise-videos`, `.artificial-paradise-prints`, `.natural-life` | The artist's texts in the viewer | Google Docs (S13) | Recorded: `PROGRESS.md`, "Status" ("from the owner's Google Docs"), commit 8e65d73. `references - texts.csv` has rows for the videos and Natural Life; it has no row for the prints text, the Landscape text or the Paradise Factory text |
| `descriptions.*.heading`, `.note` | "About the series", "English text supplied by the artist…" | Written by the assistant | Inferred from c84be34 and fa2cb43 (the note's wording: "assistant", `PROGRESS.md`, the entry "Whose English it is") |
| `behindTheScenes` | How it's built | Written by the assistant on 23 October, **edited in the spreadsheet**, then changed five times in the repository (c84be34, 8e65d73, bd6c74c, d51f252, 8570915) | Recorded (`PROGRESS.md`, "Known issues"; a3df1b1). See section 3b |
| `source` | Note under the works list | First clause from the spreadsheet stage; the rest set on 13 November by the reconstructor (bd6c74c, 8570915: "Decided by the reconstructor") | Recorded |
| `rooms.*.name`, `.subtitle` | Room names and the line under them | Written by the assistant, 23 October; Room 4's subtitle changed on 16 November (eefd647) | Inferred; in the spreadsheet unedited |
| `works.*.medium` | Media of the 17 works | The room sheet shown in the gallery (S03), as typed by the assistant on 23 October | Recorded in the visitor note `source`; in the spreadsheet unedited |
| Titles, years, sizes (`src/data/exhibition.json`) | Work data | Room sheet (S03) and floor plan (S05) with the artist's corrections | Recorded: `PROGRESS.md`, "Status" ("All 17 works from the room sheet…"), commits bd6c74c, ef2b96b, 3f35ef8. The spreadsheet's Művek tab holds the older titles (nos 6 and 7 as "Artificial Paradise I / II", "Wiena Wrong Data Landscape"); none of those is on the site now |
| `ui.nav`, `ui.loader`, `ui.footer`, `ui.hud`, `ui.viewer`, `ui.panels`, `ui.wall` | Interface: menus, buttons, hints, panel labels | Written by the assistant, 22 to 23 October; copied into the spreadsheet; a few edited there; many reworded since 13 November, part of them in the reconstructor's own words (253e97f "wording as given", 01eefce "the reconstructor's own words", d8d8465 "set word for word") | Mixed. Sections 3a to 3d give each string |
| `ui.docTitle`, `ui.docDescription` | Browser tab title and description | Title: assistant (EN), spreadsheet edit (HU). Description: the reconstructor's wording of 14 November (01eefce), which grew out of the spreadsheet wording | Recorded for 01eefce; inferred for the spreadsheet stage |
| `ui.soundAsk` | "Start with sound?" | Assistant, 3 November (9f32a2e); question and hint in the reconstructor's words, 14 November (01eefce) | Recorded |
| `ui.sceneLabel`, `ui.announce`, `ui.textEdition`, `accessibility` | 3D view's name, spoken messages, the accessible version, the accessibility statement | Written by the assistant from 13 November; several lines set in the reconstructor's wording | Recorded in the pilot section of `PROGRESS.md` and the commits 95deb0f, 4b289ed, 253e97f, d8d8465, 01eefce. Never in the spreadsheet |
| `legal`, `privacy` | Legal notice, privacy note | Written by the assistant on 7 November (cac2a97); changed at the reconstructor's request on 9, 14 and 15 November | Recorded (`PROGRESS.md`, the two "Legal notice" entries of 14 and 15 November 2026). Never in the spreadsheet |
| `contacts` in `exhibition.json` | Contact panel | The gallery's own site, the artist's site, the reconstructor's details | Recorded: `PROGRESS.md` ("gallery details from its own site"). Never in the spreadsheet |

## 3. The spreadsheet's strings, one by one

### 3a. Spreadsheet edits that are still on the site word for word

| Key | Language | On the site now | Before the spreadsheet |
|---|---|---|---|
| `ui.docTitle` | HU | Artificial Paradise digitális kiállítás | Artificial Paradise – digitális kiállítás |
| `ui.loader.preparing` | HU | Lemegyünk a pincébe... | Készül a pince… |
| `credits`, Photography | EN, HU | Kristóf Szabó / Szabó Kristóf | Szilvia Barath / Barath Szilvia |
| `ui.panels.linkGallery` | EN, HU | MAMŰ Gallery / MAMŰ Galéria | the same. The log calls this "the MAMŰ link label": commit ba982c2 of 30 October added "(mamu.hu)", and the next commit (a3df1b1) took it off again, naming the spreadsheet as the reason |

### 3b. Spreadsheet wording that survives inside a later text

| Key | What is left of the spreadsheet | What changed since |
|---|---|---|
| `ui.soundAsk.hint`, `.hintTouch` (HU) | "Fejhallgatóval izgalmasabb" (the sheet's `ui.loader.hint`: "Hanggal · fejhallgatóval izgalmasabb") | The line moved from the title screen to the sound question (9f32a2e, 2a66f2d), and the rest was set on 14 and 16 November |
| `ui.panels.rights` (EN, HU) | "All artworks were created by Kristóf Szabó / KristofLab," / "Minden műalkotás Szabó Kristóf / KristofLab munkája;" | The second half was rewritten on 30 October and 7 November (c84be34, 1893d06) |
| `ui.docDescription` (HU) | "Szabó Kristóf - KristofLab Artificial Paradise című kiállítás…" and the whole second sentence, "A kiállítás eredetileg a MAMŰ Galériában, Budapesten, 2025. január 10–31. között volt megtekinthető." (the sheet had a hyphen in the date) | "Nézd meg" is gone; reworded on 14 November (298cec8, 01eefce) |
| `ui.docDescription` (EN) | The name form "Kristóf Szabó - KristofLab" and "reconstructed from photographs" | "Check out the digital version of" is gone; reworded on 14 November |
| `behindTheScenes` (EN, HU) | Three sentences as in the sheet: "…and its overall length matches the building's outline on OpenStreetMap."; "Rooms are measured from 360° panorama photos: … where the windows, the screen and the plant stood."; "Every painting hangs at its listed canvas size and measured height."; and the start of the last one, "Three.js and Vite, no backend;". The edits in the sheet were: "A reconstruction, not an invention." cut, "photographed on the wall by the bar" cut, "Room 1 is measured from a 360° panorama" made "Rooms are measured from 360° panorama photos", and in Hungarian "szerver nélkül" made "backend nélkül" | The source of the plan (now "the gallery's floor plan"), the bricks, the reproductions, the videos with their sound, the plant model and the sound line were rewritten in the repository |
| `source` (EN, HU) | "Titles, sizes, media and years … the room sheet displayed in the gallery" (the edit was cutting "(photographed in DSC_0049)") | Extended on 6 and 13 November |

### 3c. Strings that were in the spreadsheet, unedited, and are unchanged today

These were written for the site on 22 and 23 October 2026 (commits 5e8235b to 885afcd, by the assistant; the spreadsheet's own Termek tab says "HU: draft translation by Claude, replace with the official Hungarian text"). The spreadsheet was a copy of them. They were not changed there and nobody has changed them since: 85 in English, 80 in Hungarian.

- **Facts:** `meta.artist`, `meta.venue`, `meta.dates`, `meta.medium`, `meta.subtitle`; credits row 1 (the value in both languages; the label "Artist" in English only, the Hungarian label is now "Kiállító művész").
- **Rooms:** `rooms.r1` to `r4` `.name`; `rooms.r1` to `r3` `.subtitle`.
- **Works:** `works.*.medium` for all 18 entries.
- **Navbar:** `ui.nav.main`, `.about`, `.works`, `.menu`, `.language`; `.build` in English only.
- **Title screen:** `ui.docTitle` (EN), `ui.loader.meta1`, `.preparing` (EN), `.loading`, `.ready`, `.enter`.
- **Footer:** `ui.footer.rights`, `.venue`.
- **Toolbar and keys:** `ui.hud.tour`, `.tourTitle`, `.rooms`, `.roomsTitle`, `.sound`, `.soundTitle`, `.toolbar`, `.north`, `.keys.group`, `.keys.forward`, `.keys.back`, `.keys.left`, `.keys.right`, `.keys.zoom`, `.keys.zoomIn`, `.keys.zoomOut`, `.keys.zoomReset`; `.promptWork` in English only.
- **Viewer:** `ui.viewer.close`, `.loading`, `.exhibitionText`, `.next`, `.prevLabel`, `.nextLabel`, `.goto`, `.situ`, `.work`, `.no`; `.prev` in Hungarian only.
- **Panels:** `ui.panels.credits`, `.real`, `.address`, `.map`, `.linkExhibition`, `.linkInstagram`, `.worksTitle`, `.btsTitle`, `.controls`; `.btsEyebrow` in English only.
- **English exhibition text:** `text`, four paragraphs (see section 4).

### 3d. Spreadsheet strings that are no longer on the site as the sheet had them

- **Changed since** (the site's present wording is newer than the sheet): `ui.sceneLabel`, `ui.loader.meta2` (the date is gone), `ui.loader.howtoDesk`, `.howtoTouch`, `.failure`, `ui.footer.digital` (accent), `ui.hud.clickToLook`, `.promptText`, `.minimap`, `.keys.run`, `.keys.wheel`, `ui.hud.promptWork` (HU), `ui.viewer.prev` (EN), `ui.nav.build` and `ui.panels.btsEyebrow` (HU: "A kulisszák mögött"), `ui.panels.controlsDesk`, `.controlsTouch`, `ui.wall.sheetMeta`, `meta.address`, `textCredit`, the credits rows other than the first and the photography value, `rooms.r4.subtitle`, the Hungarian exhibition text.
- **Sheet edit not kept:** the dates with a hyphen ("10-31.01.2025", "2025. 01. 10-31.") in `ui.loader.meta2`, `ui.wall.sheetMeta` and `tourIntro`. They went in on 30 October (ba982c2) and were replaced on 15 November (a5aad4f, "One date form everywhere") or removed.
- **Gone from the site:** `tourIntro` (the tour's first line, cut on 14 November, a6bc2dd), `ui.loader.hint` (2a66f2d; its Hungarian wording lives on in the sound question, 3b), `ui.hud.stop`, `ui.hud.promptSheet` (the plan sheet by the toilet door was removed on 9 November), the three room descriptions (`rooms.*.blurb`, including the sheet edit "Két fal és egy függöny között") and all 18 work captions (removed on 2 November, f898fe0: "The captions and room descriptions written for the site are replaced by the texts from the Drive folder").

## 4. What is not recorded

1. **Which edits in the sheet are Szilvia Baráth's and which are Kristóf Szabó's.** The `sources` row names both; `PROGRESS.md` says only "the owner". The files do not say who typed each edit.
2. **The English exhibition text.** The log says it is a cleaned version of the Word file's English. It has been in the repository since the first commit of 22 October 2026, and the log does not say who cleaned it, when, or from which copy. The same paragraphs sit in the spreadsheet unedited.
3. **`PROGRESS.md`, "Next", item 0, says more than the history shows.** It says the site shows "only texts from the Drive folder", including "the spreadsheet's interface texts". Most interface strings were written for the site and only copied into the spreadsheet (3c), and of today's roughly 350 strings in each language only about 125 ever had a cell in it; about 150 were first written on or after 13 November 2026. The line was true of 2 November in the sense that the captions written for the site had gone.
4. **The spreadsheet edits that the log does not list.** `PROGRESS.md`, "Known issues", names three edited strings (Behind the scenes, the works-list note, the MAMŰ link label). The history shows more edits taken from the sheet on 30 October: the Hungarian tab title, "Lemegyünk a pincébe...", "fejhallgatóval izgalmasabb", the page description, "were created by" in the rights line, the photography credit, the hyphened dates and "Két fal" in the Room 4 description.
5. **The last save of the spreadsheet.** The file was last changed on 30 October 2026 at 15:09 UTC, about four hours after the two commits that used it. What changed in that last save cannot be seen.
6. **The file's name in the `sources` sheet.** Row S14 names no file or link. The reconstructor's confirmation above is, with this file, the only record of which file S14 is.

## 5. How it was found

- For every string in `src/i18n/en.json` and `hu.json` at ba3b7f1 (about 350 in each language), the commit in which its present wording first appeared was found with `git show` over the 75 commits that touched the two files.
- The spreadsheet's short rows (119 keys, both languages) were typed out from the Drive connector's reading of the file and compared with the site of 23 October 2026 (commit 885afcd, the last one before the spreadsheet was made) and with the site at ba3b7f1. A cell that differs from the 23 October site is an edit made in the spreadsheet. The long cells (exhibition text, Behind the scenes, page description, rights line, controls text, room descriptions) were compared by reading.
- `index.html` repeats English strings as fallbacks in 56 places; all match `en.json`. `scripts/text-edition.mjs` holds no visitor text of its own: it reads the i18n files and `exhibition.json`.
- Limits: the spreadsheet was not downloaded; the check worked from the connector's text of it. Formatting, cell comments and hidden cells are not in that text. The typed rows could hold a typing slip; a slip would show as a false difference, not as a false match, and every difference was checked against the text.
- The scripts and tables of the check (the history of each string, the typed rows, the comparison) were working files and are not in the repository.
