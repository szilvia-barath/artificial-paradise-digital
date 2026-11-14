# UI and UX proposal

14 November 2026, branch `wip/a11y-pilot`. A proposal only: no code changed for it.

**How it was made.** Four reviewers looked at the built site from different sides: keyboard and screen reader, low vision, touch and phone, and first use and visual design. A fifth looked for what the four had missed. Each problem was checked in the browser (Chromium through Playwright, 1366 × 768, 375 × 667 as a touch phone, 683 × 384 at 2× for 200% zoom, 342 × 192 for 400%, and with the WCAG 1.4.12 text spacing) or in the code. Contrast was measured over the real rendered rooms, both the white brick of Room 1 and the dark Room 4, not over a flat colour.

**Also used:** the accessibility-review checklist (the four WCAG principles, contrast, keyboard, screen reader). There is no frontend-design skill installed here.

**What it doesn't cover:** nothing was heard with a real screen reader, or tried on a real phone.

The mockup is `docs/design/mockup-interface.html`: plain HTML and CSS, no artwork, nothing loaded from outside. Open it in a browser.

**Size:**

| Size | Means |
|---|---|
| small | CSS or a few lines, under an hour |
| medium | a few hours with a retest |
| large | a day or more |

**Risk to what was tested:**

| Risk | Means |
|---|---|
| none | the tested behaviour is not touched |
| rerun | the same checks only need running again |
| retest | the change touches dialog focus, the live region, the keys or reduced motion, and those checks must be read again, not just rerun |

## What works and should stay

- **The title screen.** A still image: the key visual in strips, the paper card, the blue logotype. It is the strongest and most recognisable part of the project, and the rest of the interface should borrow from it.
- **Sound off by default.** The sound question starts on "Without sound", and Esc means no sound. Calm and safe for a first visit.
- **Dialog focus.** Panels, the viewer and the sound question take focus, keep Tab inside, close on Esc and give focus back. No focused control is hidden under the navbar or footer, in any panel, at 1366, 375 or 200% (WCAG 2.4.11). Keep the scroll padding on `#panel` and `.viewer-info`, and the footer-height sync in `boot.js`.
- **The live region.** Short and the same in both languages ("Room 1. Paintings, Paradise Factory.", "No. 2, Human as Error VI. Press Enter to open."). On a room change the room comes first, then the work.
- **Getting around without a pointer.** Page Down and Page Up go through the works with an on-screen prompt ("Enter to view · 5 Human as Error I"). It is the fastest way through the exhibition, so show it more (see F2).
- **The works list and the rooms menu.** One button per work, with names that contain their visible text. The Rooms button reports open and closed, and Esc returns focus to it.
- **Ways to reach every work without dragging.** The rooms menu, a tap on the map, the works list with "Walk to this work", the tour, a tap on a work. Keep all of them: they are what WCAG 2.5.7 asks for.
- **The keycaps.** They light up with the real keys, so they double as a legend, and they answer Enter, Space and clicks sent by assistive technology.
- **The viewer layout.** A large image, an information column, Previous and Next, "Walk to this work". It works at 1366 and on a phone.
- **The progress wording.** "Preparing the basement…", "Hanging the works…". Plain, and specific to this exhibition.
- **Phone layout basics.** No zoom lock in the viewport tag, and safe areas at top and bottom.
- **One focus-ring rule for the whole page.**
- **The accessible version.** One column, plain, light and dark, positions in words, headings in order. It reflows at 320 px with text spacing and no sideways scroll.
- **Text spacing.** With the WCAG 1.4.12 values, nothing on the title screen, in the controls, the sound question or the rooms menu clips or overlaps, in English or Hungarian.

## Problems and changes

Grouped by what they touch. "When" says whether the change could go in before 20 November without changing what was tested (**before 20**), or belongs after 23 November (**after 23**).

### A. Contrast and legibility

| # | Problem | Where | Who | WCAG | Change | Size | Risk | When |
|---|---|---|---|---|---|---|---|---|
| A1 | Navbar and footer text over the 3D view falls to about 2:1 in the bright rooms. Measured over Room 1: About 2.18, Works 2.31; footer "Digital exhibition by…" 1.65, Contact 2.00. | `body.entered #site-nav`, `#site-foot` (gradient 0.6 to 0); footer colour `--muted` at 10 px | low vision, first-time | 1.4.3 | A steady dark band under the text, `rgba(11,12,14,.8)`. Footer text `#c9c9c6`, navbar buttons full strength inside. Over pure white: footer 6.6, navbar 9.7. | small | rerun (retake focus screenshots) | before 20 |
| A2 | The room name and its subtitle sit straight on the wall. Over white brick: subtitle 1.41 to 3.90, name 1.13. The tail also runs under the map on a phone. | `#room-label` | low vision, first-time | 1.4.3; 1.4.10 | Put the label on the same glass chip as the toolbar. Subtitle `#c9c9c6`, `max-width` so it wraps beside the map. Over white: name 6.9, subtitle 4.7 (11.2 and 7.6 with the darker glass of A3). | small | none | before 20 |
| A3 | Keycap letters are 9 px at 3.6 to 3.8:1 (2.8 over white); the muted ♪ is 2.8 over white. They are the only place the keyboard letters show on screen. | `.cap i`; `#toolbar button.muted .ico`; `--glass` 0.72 | low vision, keyboard | 1.4.3 | `--glass` to 0.85. New `--hud-muted: #b9b9b5` for keycap letters, the muted icon and the wheel hint. Keycap letters 11 px. Over white: 6.4. | small | none | before 20 |
| A4 | Map room numbers 3.1:1 (2.5 over white) at 9 px. Painting dots 2.3 to 3.4:1 and 3 px square. Painting and video are told apart only by hue, with no key. | `minimap.js` | low vision, first-time | 1.4.3; 1.4.11; 1.4.1 | Room numbers 11 px at 85% white (8.6). Works as 5 px marks with a dark edge, paintings round, videos square. A one-line key under the map (new EN and HU string). | small | none | before 20 (shapes); key after 23 |
| A5 | The phone joystick ring is white at 14% over a near-white wall, about 1:1. | `#joystick`, `#joystick-knob` | low vision, touch | 1.4.11 | Ring 2 px at 70% white with a 1 px dark outline; fill 0.5; knob 85% white with a dark outline. | small | none | before 20 |
| A6 | Without JavaScript, the notice is red text with no background over the picture. On a phone it overprints the card and the footer. | `.noscript` | low vision, first-time | 1.4.3 | Put the notice inside the card, in its own colours, and hide the progress line and Enter there with a `<noscript><style>`. | small | none | before 20 |
| A7 | Most interface type is 9 to 11 px monospace capitals with wide letter spacing: navbar, toolbar, eyebrows, meta, hints, footer, keycaps. Hard to read for low vision, and it makes everything look the same weight. | `style.css` throughout | low vision, first-time | none strict (1.4.4 is met by browser zoom) | See the look below: labels 12 to 13 px at least, sentence case, letter spacing 0.06em at most. | medium | rerun | after 23 |

### B. Names and structure for screen readers

| # | Problem | Where | Who | WCAG | Change | Size | Risk | When |
|---|---|---|---|---|---|---|---|---|
| B1 | At 820 px wide and less (phones, and laptops at 200%) the toolbar buttons are named "▶", "⌖", "♪". Their words are `display: none`, which removes them from the name too. Sighted visitors see three bare glyphs, and ⌖ for "rooms" cannot be guessed. | `#toolbar` in `index.html`; `@media (max-width: 820px) #toolbar button .lbl` | screen reader, speech input, touch, first-time | 4.1.2; 2.5.3 | Keep the words visible: they fit at 375 px (the Hungarian row is about 316 px). Mark the glyphs `aria-hidden`. If space ever forces icons only, hide the words with the `.sr-only` pattern. | small | rerun | before 20 |
| B2 | The Tour button is renamed "Stop" while also reporting "pressed": "Stop, toggle button, pressed". | `syncTourBtn` in `main.js` | screen reader | 4.1.2 | Keep the name "Tour" and `aria-pressed`; change only the hidden icon (▶ / ■). | small | rerun (`keyboard.mjs` reads `aria-pressed`) | before 20 |
| B3 | Behind an open dialog, the rest of the page stays in the browser's accessibility tree. The Tab trap holds, but a screen reader's virtual cursor or swipe can leave the dialog. | `src/ui/dialog.js` (`opened`, `closed`); `aria-modal` alone | screen reader, touch | 1.3.2; 2.4.3 | On opening, set `inert` on `#stage`, `#loader`, `#site-foot` and the skip link. Clear it before focus returns. | medium | retest (dialog focus) | after 23 |
| B4 | Once inside, the page has no heading. On the title screen the only h1 is outside `main`. | `index.html` | screen reader | 1.3.1; 2.4.6 | An `sr-only` h1 in `main#stage` from the existing `docTitle`. The loader's heading becomes h2. Optionally the room name becomes an h2. | small | rerun | before 20 |
| B5 | The viewer: Next and Previous change the work without saying so. The counter says "/ 18" and shows No. 3 twice (the small screen counts as a work), while everything else says 17. | `viewer.js` (`step`, the counter) | screen reader, first-time | 4.1.3; 3.2.4 in spirit | Skip the `-screen` entry in Previous and Next, show "No. 3 of 17", and announce the new title on its own live-region topic. | small | rerun | after 23 (new string) |
| B6 | In Hungarian the English work titles are not marked `lang="en"` in the viewer, the works list, the rooms menu or the live region. The accessible version marks them. | `viewer.js`, `panels.js`, `announce.js` | screen reader | 3.1.2 | Set `lang="en"` on the title elements when the page is Hungarian. For the live region, build the message with a `<span lang="en">`. | medium | retest (live region) | after 23 |
| B7 | The 3D view's name leaves out Page Down and Page Up, and its 40 words are read again every time focus returns to it. | `sceneLabel` | screen reader | 2.4.6 | Shorter, with the keys that matter: "3D view. Page Down and Page Up go from work to work, Enter opens the work in front, arrow keys walk. All keys are in the accessible version, the first link." HU marked to confirm. | small | none | after 23 (wording is yours) |
| B8 | Each keycap's name is repeated as its description, so NVDA says it twice. The Shift keycap's name is an instruction. | `#keypad` in `index.html` | screen reader | 4.1.2 | Mark the letter `aria-hidden` and let the title alone name it. Shift becomes "Run (Shift)", with `aria-pressed` for on and off. | small | rerun | before 20 |
| B9 | The zoom readout is named "2.0× ✕", read as "2.0 times multiplication X". | `#zoom-level` | screen reader | 2.4.6; 4.1.2 | Hidden "Reset zoom (0)" text in front; the ✕ `aria-hidden`. | small | rerun | before 20 |
| B10 | The map's text says "click a room to jump there", which a screen reader cannot do, and does not say where you are. | `#minimap`, `hud.minimap` | screen reader | 1.1.1 | "Map: you are in Room 2", updated on each room change; the jump hint stays in the title only. New string. | small | none | after 23 |
| B11 | Each room in the rooms menu reads every work title as one name, and the current room is not marked. | `buildRoomsMenu` in `panels.js` | screen reader | 1.3.1 | The titles become the description (`aria-describedby`); `aria-current="location"` on the room you are in. | small | rerun | before 20 |
| B12 | The sound question's hint (the only place that mentions M before you start) is never read. | `#sound-ask` | screen reader | 1.3.1 | `aria-describedby` on the hint. | small | none | before 20 |
| B13 | The bars of the logotype are read as "vertical line" in "| Enter |" and in the brand. | `#enter`, `.brand` | screen reader | 1.3.1 | Wrap the bars in `aria-hidden` spans. | small | none | before 20 |
| B14 | The footer link "Instagram ↗" does not say what it opens, and is not translated. | footer in `index.html` | screen reader | 2.4.4 | Use the existing "Instagram post from the exhibition" string; arrow `aria-hidden`. | small | none | before 20 |
| B15 | "← Prev" on screen against the name "Previous work": speech software matching "click Prev" may fail. | `#viewer-prev`, `viewer.prev` | speech input | 2.5.3 | Show "← Previous" (EN); Hungarian is fine. | small | none | before 20 |
| B16 | The installation photo keeps the work's own alt text, so a photo of the room is read as the work. | `renderInfo` in `viewer.js` | screen reader | 1.1.1 | "Installation photo 1 of 2: {title} in the gallery" while the photo shows. New string. | small | none | after 23 |
| B17 | The Google Drive player has an empty title, and the loop video has no name. Esc inside the player does not close the viewer, because keys stay in the other site's frame. | `#viewer-frame`, `#viewer-video` | screen reader, keyboard | 4.1.2 | Titles from new strings ("Full video: {title}, Google Drive player"). Add the full-video state, with Drive blocked, to `axe.mjs`. The Esc limit is the browser's, so say so in the statement. | small | none | after 23 |

### C. Keyboard and focus

| # | Problem | Where | Who | WCAG | Change | Size | Risk | When |
|---|---|---|---|---|---|---|---|---|
| C1 | "Drag to look around" never goes away for keyboard users. It sits over the work in the middle of the view (each work's "walk to this work" pose puts it right on the picture), and it covers "Room 1" when the rooms menu is open. | `#click-to-look`, retired only by a mouse drag | keyboard, low vision, first-time | 2.4.11 (only just met) | Retire it on the first look or move of any kind (keys, wheel, Page Down, a keycap, the tour), after about 8 seconds, and while the rooms menu or tour is open. Move it below the crosshair. | small | none | before 20 |
| C2 | The folded navbar menu (phones, and 200% zoom): Tab after "Menu" skips the menu, Esc does not close it, and it stays open when focus leaves. | `.nav-toggle` after `#nav-links` in `index.html`; `boot.js` | keyboard, screen reader, low vision | 2.4.3 | Put the toggle before the links in the page (same place on screen); Esc closes and returns focus to it; close when focus leaves the navbar. | small | rerun (title-screen Tab order) | before 20 |
| C3 | The navbar can be clicked over the sound question. A panel opened from it unlocks walking while the question is still on screen. | `.sound-ask` z-index 60, `#site-nav` 70; navbar click handler | keyboard, screen reader, first-time | 2.4.3 | Sound question above the navbar; the navbar handler returns while it is open; closing a panel leaves walking locked while it is open. | small | retest (sound question) | before 20 |
| C4 | A panel opened during the tour leaves the tour running, and its captions keep being announced over the panel. Closing with × leaves it running; Esc stops it. | `onOpenPanel` in `main.js` | screen reader, keyboard | 2.2.4 (AAA), nearest | Stop the tour when a panel opens, as the viewer already does. | small | rerun | before 20 |
| C5 | A mouse click on EN or HU while a panel or the viewer is open moves focus to the 3D view behind the dialog. | `focusScene` in `main.js` | keyboard, screen reader | 2.4.3 | `focusScene` does nothing while a panel or the viewer is open. | small | retest (`focus-mouse.mjs`) | before 20 |
| C6 | After a work opened from the works list, closing the viewer lands on the navbar Works button, and the list and your place in it are gone. | `onOpenWork` in `main.js` | keyboard, screen reader | 2.4.3 | Remember the list; on closing, reopen it with focus on the work last shown. | medium | retest (dialog focus) | after 23 |
| C7 | In a narrow window, closing a panel opened from the folded menu puts focus on Enter or the 3D view, not on Menu. | `closed()` in `dialog.js` | keyboard, screen reader | 2.4.3 | When the opener is a hidden menu item, focus the Menu button. | small | retest (dialog focus) | after 23 |
| C8 | After "Without sound" is clicked with the mouse, the white keyboard frame shows around the 3D view. | sound question handler in `main.js` | first-time | none (2.4.7 is met) | Before handing focus to the view after a real click, blur first, as `controls.js` does. | small | retest (`focus-mouse.mjs`) | before 20 |
| C9 | During the tour the caption covers the focused "Room 4" in the rooms menu. | `#tour-caption`, `#rooms-menu` | keyboard, low vision | 2.4.11 | The toolbar and its menu above the caption (`z-index`). | small | none | before 20 |

### D. Touch and phone

| # | Problem | Where | Who | WCAG | Change | Size | Risk | When |
|---|---|---|---|---|---|---|---|---|
| D1 | The page cannot be pinch-zoomed anywhere: not the panels, the viewer or the title screen. `touch-action: none` on `html, body` blocks it. | `style.css` (`html, body`) | low vision, touch | 1.4.4 | Move `touch-action: none` to the 3D view, the joystick and the keycaps only. | small | rerun; check on a real phone | before 20 |
| D2 | Turning on touch needs a drag. Walking needs a drag on the stick, and pressing and holding it does nothing. The on-screen keys that would avoid this are hidden on touch. | `controls.js` (joystick `touchstart`); `body.touch #keypad` | touch, first-time | 2.5.7 | Pressing and holding the stick walks in that direction. Show turn-left and turn-right keycaps (44 px) on touch. Add "Next work" to the phone toolbar (the same step as Page Down, one jump per tap). | medium | retest (keys) | after 23 |
| D3 | Once inside on a phone, the Accessibility statement, the accessible version, Legal notice and Privacy cannot be reached: the footer is hidden, and the menu has only four items. | `body.entered.touch #site-foot`; `#nav-links` | touch, screen reader, first-time | 3.2.6 in spirit | Add the four to the folded menu, below a line, from the existing strings. | small | rerun (phone axe and smoke) | before 20 |
| D4 | Footer links on the phone title screen are 13 px tall, on rows 15 px apart. | `#site-foot a, button` | touch, low vision | 2.5.8 | `min-height: 24px` at 760 px and less. | small | rerun | before 20 |
| D5 | Below the 44 px advice: the toolbar is 32 × 38, Menu 36 × 36, EN and HU 27 × 30, Close 34 × 36. They pass 2.5.8 but are small for a thumb. | `style.css` | touch, low vision | 2.5.5 (AAA), advisory | 44 × 44 under `(pointer: coarse)`. | small | rerun | before 20 |
| D6 | The phone tour caption sits over the middle of the work being shown. In landscape it covers the room label and the map. | `body.touch #tour-caption` | touch, first-time | none | Hide the joystick during the tour and use the desktop place for the caption; narrower in landscape. | small | none | before 20 |
| D7 | In landscape the rooms menu runs off the top of the screen (also at 200% zoom on a laptop), so Room 1 cannot be tapped. | `#rooms-menu` | touch, low vision, keyboard | 1.3.4; 1.4.4 | `max-height` with its own scrolling; the title lists hidden on short screens. | small | rerun | before 20 |
| D8 | In landscape the viewer shows the work at 167 × 146 px. | viewer media query | low vision, touch | 1.3.4 (not strict) | Side by side on short landscape screens. | small | none | after 23 |
| D9 | On a phone, after Next the text column keeps its scroll position, so the new title is off screen. | `viewer.js` | touch, first-time | none | Scroll to the top when a work opens, and after Next or Previous by tap (not by keyboard). | small | none | before 20 |
| D10 | Touch-screen laptops are treated as phones. If the browser reports touch, the mouse cannot look around or open works, and the keycaps and footer disappear. | `isTouch` in `controls.js` and `main.js` | first-time, keyboard | none (2.1.1 holds) | Decide by the kind of pointer per event, not by device; `any-pointer` for what to show. | medium | retest (mouse focus) | after 23 |
| D11 | Phone visitors are told to press M, and get no hint inside at all. | `soundAsk.hint`; `body.touch #click-to-look` | touch, first-time | 3.3.2, loosely | A touch version of the hint ("the ♪ button switches it on or off"), and a touch hint inside ("Drag to look · hold the stick to walk · tap a work") that goes after the first touch. New strings. | small | none | after 23 |
| D12 | Left and right safe areas are not used: in landscape on a notched phone the stick and labels sit under the notch. | `style.css` | touch | none | `--safe-l` and `--safe-r` on the side offsets. | small | none | before 20 |

### E. Zoom and small windows

| # | Problem | Where | Who | WCAG | Change | Size | Risk | When |
|---|---|---|---|---|---|---|---|---|
| E1 | At 200% zoom the tour caption covers the keycaps, the zoom keys and the toolbar; a keycap reached by Tab during the tour is hidden. | `#tour-caption` | low vision, keyboard | 2.4.11; 1.4.4 | Anchor the caption to the toolbar; hide the keycaps during the tour and on screens under 520 px high. | small | rerun | before 20 |
| E2 | At 400% (320 CSS px) the controls pile on top of each other. The footer takes 105 of 192 px, and the keypad goes off the top. | `#hud` layout | low vision, keyboard | 1.4.10 | A compact HUD for narrow or short windows, as on touch: no footer (its links in the menu, D3), no keycaps, map or hint. | medium | rerun (small-window Tab order) | after 23 |
| E3 | At 200% the title screen shows only the logo. Enter has focus but is below the fold, and nothing shows that the card scrolls. | `.loader-logo`; `markReady` | low vision, keyboard | 2.4.7 / 2.4.11 in spirit | Cap the logo by height on short screens; scroll the card (not the page) to Enter if it is out of view. The screen stays still apart from that. | small | rerun (loader stillness) | before 20 |

### F. First use and wording

| # | Problem | Where | Who | WCAG | Change | Size | Risk | When |
|---|---|---|---|---|---|---|---|---|
| F1 | How to move is said once, before entering, and the line leaves out Page Down, Enter and the tour. The full controls are under "Behind the scenes", where nobody looks for help. | `loader.howtoDesk`; `panels.js` (bts) | first-time, keyboard, touch | 3.3.2, nearest | Lead with the easy path: "↑↓ walk · ←→ turn · Page Down: next work · Enter: open · drag to look". Add a Help (or "Keys") toolbar button that opens the controls text and reopens a first-use card by the keys (see the mockup). New strings. | medium | rerun (a new panel uses the tested dialog path) | after 23 |
| F2 | Page Down is the best way through the exhibition, and only the controls text says so. | as F1 | first-time | none | "Next work" on the toolbar on every device (D2), and in the first-use card. | small | rerun | after 23 |
| F3 | The tour caption gives no sense of progress. | `#tour-caption` | first-time | none | "3 / 17 · No. 3 · Paradise Factory" on its first line. New string. | small | none | after 23 |
| F4 | The sound advice appears twice, on the title screen and again in the question. | `loader.hint`, `soundAsk.hint` | first-time | none | Drop the title-screen line. | small | none | before 20 |
| F5 | Unfinished-looking details. At 1366 a footer line ends in "·". The date breaks as "10-" / "31.01.2025" on a phone, and appears in three formats. The muted sound icon is a struck-through ♪. | footer; `loader.meta2`; `style.css` | first-time | none | Keep each item with its dot; one date form everywhere ("10–31 January 2025" / "2025. január 10–31."), or a non-breaking hyphen; two small SVG icons for sound on and off. | small | none | before 20 |
| F6 | Any script error during loading (a slow texture on a phone, say) announces "could not start (WebGL is needed)", then "Ready" a second later. | global error listeners in `boot.js`; `markReady` | screen reader, first-time | none | Report failure only from a real WebGL failure; no "Ready" after it. | small | rerun (smoke) | before 20 |
| F7 | The "scroll to walk" mouse icon and the map dot animate for the whole visit; only the system setting stops them. | `.wheel b::after`; `minimap.js` | low vision, first-time | 2.2.2 | Three times, then still; the map dot pulses only after a jump. | small | none | before 20 |
| F8 | The noscript notice still says "Text version" / "szöveges változata" (left as asked). | `index.html` | first-time | none | Use the new name when you choose to. | small | none | your call |

### G. The accessible version

| # | Problem | Where | Who | WCAG | Change | Size | Risk | When |
|---|---|---|---|---|---|---|---|---|
| G1 | The statement's section titles are `dt`, not headings, and the h1 sits outside `main`. | `scripts/text-edition.mjs` | screen reader | 1.3.1 | h3 headings and paragraphs, as in the panel; open `main` before the h1. Count `article > h3` in `text-edition.mjs`. | small | rerun (`text-edition.mjs` needs the count change) | before 20 |
| G2 | Hungarian page: the 17 "megnyitás a digitális kiállításban" links and two room subtitles carry English titles without `lang="en"`. The headings have it. | `text-edition.mjs` | screen reader | 3.1.2 | Insert the title through the same `title()` helper as the headings. | small | rerun | before 20 |
| G3 | Without JavaScript, Legal notice and Privacy cannot be opened at all. | `index.html`; `text/` has no legal sections | first-time | none | Add them to the accessible version (legal text: only when you ask). | small | rerun | your call |

### H. One visual language

| # | Problem | Where | Who | WCAG | Change | Size | Risk | When |
|---|---|---|---|---|---|---|---|---|
| H1 | Three looks that do not meet: the paper and blue title screen, a dark game-like control layer, and dark panels with green capitals. The bracket button style is used only for Enter. | `style.css` throughout | first-time, low vision | none | The direction below. | large | rerun everything, retest focus ring colours on paper panels | after 23 |

## Direction for the look

**Paper for words, dark for looking.** Everything you read is paper and blue, like the title card and the accessible version. Everything you look through, the 3D view and the viewer, stays dark, so the works are the brightest thing on screen. The mockup shows it.

**Type.**

- Keep the system stacks; no font download, so no new load and no new file.
- Reading text in the sans at 16 px.
- Labels and controls in the sans at 13 to 15 px, sentence case, letter spacing 0.02 to 0.06em.
- The mono for numbers, keys and the logotype's echo only (keycap letters, "No. 3", "2.0×"), at 12 px or more.
- No interface text under 12 px. Headings in panels at 15 px, semibold, ink on paper, instead of 11 px green capitals.

**Colour.** As tokens:

| Token | Value | Use |
|---|---|---|
| `--paper` | `#fbfbf9` | title card, panels, accessible version |
| `--ink` | `#16181d` | text on paper |
| `--ink-muted` | `#4a4f5a` | secondary text on paper |
| `--blue` | `#072fcc` | logotype, links and focus on paper, the Enter button |
| `--glass` | `rgba(11,12,14,.85)` to `.9` | chips over the 3D view: room label, toolbar, keycaps, prompt, caption, map |
| `--text` | `#f2f1ed` | text on glass |
| `--hud-muted` | `#c4c3be` | secondary text on glass |
| `--accent` | `#9dff6a` | pressed and on states only, never body text |

Magenta and cyan stay on the map only, with shapes and a key (A4).

**Spacing.** An 8 px grid. The control layer keeps 16 px from the edges plus the safe areas. Chips have 8 × 12 px padding and 8 px radius.

**Controls.**

- On a phone every control is at least 44 × 44 px; on desktop at least 32 px high.
- Toolbar buttons keep their words at every width.
- Sound says its state in words ("Sound off").
- A Help button opens the controls.
- The first-use card sits by the keycaps, never over the work, and goes after the first move.
- The focus ring on glass is white with a dark halo, so it shows on a white wall; on paper it is blue.

### Contrast, checked

Ratios for text need 4.5:1 (3:1 for large text); for controls and focus rings (non-text) they need 3:1. "Over white" means the glass or band composited over pure white, the worst case.

**Now, measured over the rendered rooms:**

| Text and background | Ratio | Needed | Passes |
|---|---|---|---|
| Blue logotype on the card | 8.86 | 4.5 | yes |
| Navbar on the pale band (title screen), opacity 0.75 | 5.05 to 5.11 | 4.5 | yes |
| "Ready" at opacity 0.7 | 4.50 | 4.5 | yes, just (do not lower it) |
| Panel body text `#dedcd6` on the 0.9 dark overlay | 11.77 | 4.5 | yes |
| Panel muted `#9a9a98` | 5.66 to 5.72 | 4.5 | yes |
| Toolbar labels on glass, over white | 6.89 | 4.5 | yes |
| Navbar "About" over Room 1 inside | 2.18 | 4.5 | no (A1) |
| Footer "Digital exhibition by…" over Room 1 | 1.65 | 4.5 | no (A1) |
| Room subtitle on the wall | 1.41 to 3.90 | 4.5 | no (A2) |
| Room name on a white wall | 1.13 | 4.5 | no (A2) |
| Keycap letters on glass | 3.60 to 3.83 | 4.5 | no (A3) |
| Map room numbers | 3.08 | 4.5 | no (A4) |
| Map painting marks | 2.30 to 3.36 | 3.0 | no (A4) |
| Joystick ring over a light wall | about 1 | 3.0 | no (A5) |

**Proposed:**

| Text and background | Ratio | Needed |
|---|---|---|
| Ink `#16181d` on paper `#fbfbf9` | 17.14 | 4.5 |
| Muted ink `#4a4f5a` on paper | 7.93 | 4.5 |
| Blue `#072fcc` on paper (links, focus ring) | 8.86 | 4.5 / 3 |
| Paper on blue (Enter, pressed buttons) | 8.86 | 4.5 |
| Blue at 75% on paper (the language not chosen) | 5.10 | 4.5 |
| Ink on the pale title band `#eceef0` | 15.27 | 4.5 |
| Text `#f2f1ed` on glass 0.9 over white | 14.10 | 4.5 |
| Text on glass 0.85 over white | 9.63 | 4.5 |
| Muted `#c4c3be` on glass 0.9 over white | 9.03 | 4.5 |
| Muted `#c4c3be` on glass 0.9 over a dark room | 11.01 | 4.5 |
| Accent `#9dff6a` on glass 0.9 over white | 12.86 | 4.5 |
| Footer `#c9c9c6` on the 0.8 band over white | 6.56 | 4.5 |
| Focus ring white on glass over white | 15.94 | 3 |
| Focus halo `#0b0c0e` against a white wall (keeps the ring visible off glass) | 16.11 | 3 |
| Keycap edge, white at 45%, on glass over white | 4.32 | 3 |
| Panel border `#8a8f99` on paper (if a visible edge is wanted) | 3.13 | 3 |

## Before 20 November, and after 23 November

**Before 20 November.** These are CSS, markup or wording that already exists. None of them changes the dialog focus logic, the live region, the skip link, Page Down and Page Up, the letter keys or reduced motion. They need only the existing checks run again (axe, keyboard, mouse focus, smoke, accessible version):

- Contrast: A1, A2, A3, A4 (shapes and sizes), A5, A6
- Names and structure: B1, B2, B4, B8, B9, B11, B12, B13, B14, B15
- Keyboard and focus: C1, C2, C4, C9
- Touch and phone: D1, D3, D4, D5, D6, D7, D9, D12
- Zoom: E1, E3
- First use: F4, F5, F6, F7
- Accessible version: G1, G2

These touch the tested dialog and mouse focus handling. They are small, but each needs its checks read again, not just run, so take them before 20 November only if there is time:

- C3, C5, C8

**After 23 November.** These change tested behaviour, add strings you will want to word yourself, or are larger:

- Dialogs and focus: B3 (`inert`), C6, C7
- New strings: B5, B6, B7, B10, B16, B17, D11, F1, F2, F3, A4 (map key)
- Larger changes: A7, D2, D8, D10, E2, H1

**Your call:** F8 and G3.
