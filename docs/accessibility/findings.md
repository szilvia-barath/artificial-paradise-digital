# Accessibility pilot: findings

Branch `wip/a11y-pilot`; first written 13 November 2026, brought up to date 15 November 2026. A pilot, with no claim of WCAG conformance. The test output is beside this file: `axe-results.md`, `keyboard-test-log.md`; the script for the NVDA test is `screen-reader-test.md`; the Hungarian strings written since the last check by a Hungarian reader are in `hu-confirm.md`, the history of the forms of address in `hu-address-forms.md`.

## Results on 15 November 2026

Rerun on 15 November 2026 on the code after group a of the UI/UX proposal (the "before 20" list, commits `1fcd801..747d75a`). The runs before were on the final code of 14 November 2026, after the changes for WCAG 2.1.4 and 2.3.1 and the fixes from the review, and again the same day after the corrections of the next round (final wording, the footer-link focus, the tour without its opening line).

- axe-core 4.14 (`tests/a11y/axe.mjs`): 34 states, no violations of any severity. axe could not judge the contrast of text over the 3D view or the title picture. The contrast over the 3D view was measured in screenshots instead, facing the white brick of Room 1 (Part 2a, A1 to A5 in `PROGRESS.md`): the bar at the top, the footer, the room name, the toolbar, the keycaps and the floor plan's numbers at 5.1:1 or more, the grey titles in the rooms menu at 4.74:1 (4.48:1 over pure white). Not measured: the tour caption, the prompt that names a work, the drag hint, the zoom readout and the exhibition text sheets drawn on the walls.
- Keyboard only (`tests/a11y/keyboard.mjs`): 31 of 31 steps passed, among them all 17 works by Page Down, and the letter keys with and without focus on the 3D view. It needed a rerun. On the run of 15 November step 9.1 (the link `?work=w11-artificial-paradise-i-print`) timed out under software rendering (about one frame a second, headless): the step waited a fixed time for the announcement, the live region's timer fired late, and nothing was heard, although Enter then opened the right work (Artificial Paradise I), so that run gave 30 of 31. The same step failed the same way once during the fixes of group a, and step 7.2 ("Esc stops the tour") once in the run after the touch items (D); each passed on the rerun. Since `ca0b037` both steps wait up to 30 seconds for what they check, with the checks unchanged, and the run on that code gave 31 of 31 (the keyboard check entry in `PROGRESS.md`). A further run after the documents of group a, on a fresh build, also gave 31 of 31 at the first try, so the statement now says only that all 31 steps passed. These are counted as timing failures of the test machine; no run on real hardware has been done to prove it.
- Mouse and focus (`tests/a11y/focus-mouse.mjs`): 16 of 16 steps passed (steps 14 to 16, the footer links, added 14 November 2026), and no console errors.
- Reduced motion (`tests/a11y/reduced-motion.mjs`): 18 of 18 checks passed. Five are new with Part 2a, F7: with the setting, the mouse under the walking keys does not roll and the floor plan's dot keeps its size, also after a jump; without it, the wheel rolls three times and stops, and the dot swells after a jump and is still before it and 3 seconds after.
- Flashing (`tests/a11y/flash.mjs`): no more than 2 flashes a second with Page Down pressed six times a second, and 0% of the screen flashing more than 3 times a second; see the next section.
- Also passed: the built site loads all four rooms with no console errors and nothing stored, at 1366 × 768 and on a 375 × 667 phone (`smoke.mjs`); the title screen weighs 258.4 KB on a phone, is a still picture and runs 0 animations (`loader-weight.mjs`); the text edition, 28 of 28 checks (`text-edition.mjs`); `tests/tools/hu-confirm.py`: the keys of `en.json` and `hu.json` match and no string carries a mark (13 Hungarian strings listed for a Hungarian reader on 15 November, 22 after the statement was brought up to date the same day).

## Flashing on a room change and WCAG 2.3.1

WCAG 2.3.1 Three Flashes or Below Threshold (level A): nothing flashes more than three times in any one second, unless the flash is small and dim. A flash is a pair of opposing changes in relative luminance of at least 10% of full luminance, where the darker picture is below 0.80.

How it was measured: the render loop was stopped and the frames drawn at a fixed step (60 a second, once 144), so the count does not depend on this machine's speed. Each frame was read back and cut into a 16 × 12 grid; the luminance of every cell was followed and its flashes counted over one second. The view was a white wall of Room 1, where a flash shows most. Window 640 × 360, three runs of each case.

**The glitch pulse (blocky band displacement and a colour tear, fired on a room change or a jump), as it was on 13 November:**

| Case | Most flashes in one cell in a second | Screen flashing more than 3 times a second |
|---|---|---|
| one room change, 60 frames a second | 1 | 0% |
| one room change, 144 frames a second | 1 | 0% |
| one jump to a room or a work | 3 | 0% |
| walking to and fro through a doorway, 2 crossings a second | 2 | 0% |
| pulse fired 30 times in a second, as a held Page Down would | 10 | 22% |

A single room change stayed within the limit; one jump reached it exactly; jumps in quick succession went well over, on more than a fifth of the screen. The held Page Down that produced them came with this pilot, but any quick run of jumps would do the same. **It can flash more than three times a second, so it is removed for everyone** (decided by the reconstructor, 14 November 2026): `src/fx/post.js` no longer has the effect, and nothing replaces it. Page Down and Page Up also stopped repeating while held, because a cut from view to view thirty times a second would flash without any effect.

**After the removal** (the script now presses Page Down, so what it sees is the cut from one view to the next):

| Case | Most flashes in one cell in a second | Screen flashing more than 3 times a second |
|---|---|---|
| one press of Page Down | 0 | 0% |
| Page Down held for a second | 0 | 0% |
| Page Down pressed three times a second | 1 | 0% |
| Page Down pressed six times a second | 2 | 0% |

Limits of this measurement: software rendering at a small window; the grid cells are coarser than the "small safe area" of the criterion, which errs on the strict side; the videos on the screens (the works themselves) and the film grain were in the picture but not singled out; no measurement on a real display.

## The single-key shortcuts and WCAG 2.1.4

WCAG 2.1.4 Character Key Shortcuts (level A) says: if a shortcut uses only letter, number, punctuation or symbol keys, the visitor must be able to turn it off, or remap it to include a modifier key, or it must be active only while the component it belongs to has focus. The point is speech input: dictated words arrive as key presses, and a stray "t" should not start something.

**As found (13 November 2026, first run):** T, M, E, W/A/S/D and the zoom keys (+ − = _ 0) listened on `window` and were active whenever you were inside with no panel open, whatever had focus, with no way to switch them off or remap them. That failed the criterion.

**Changed on 14 November 2026 (decided by the reconstructor, who reversed her earlier "do not redesign"):** the criterion's third option. These keys now work only while the 3D view has focus.

| Keys | What they do | Active when | 2.1.4 |
|---|---|---|---|
| T | start or stop the tour | the 3D view has focus | meets (focus-scoped) |
| M | sound on or off | the 3D view has focus | meets |
| E | open the work in the middle of the view | the 3D view has focus | meets |
| W, A, S, D | walk, step sideways | the 3D view has focus | meets |
| + − = _ 0 | zoom in, out, reset | the 3D view has focus | meets |
| Page Down, Page Up, Enter, Esc, Tab, arrows, Shift | next / previous work, open, close, move focus, walk and turn, run | as before | outside the criterion: none types a character |

How the view gets focus: Tab reaches it (it is the second stop on the page, after the skip link); pressing the mouse on it gives it focus (`controls.js`, where it used to give focus up); Page Down, Page Up and "Walk to this work" put focus on it; so does closing the sound question. So that someone who walks with W/A/S/D and uses the mouse for everything else does not lose the keys, a mouse click hands focus back to the view afterwards on: the toolbar (Tour, Sound, and Rooms when the click closes the menu), a room in the rooms menu, the map, the zoom readout, EN / HU, and the Close of a panel or the viewer. Opening the rooms menu leaves focus by it. A keyboard press on a button leaves focus on the button: the letter keys then do nothing until focus is back on the view, and the arrows still walk. Two exceptions: the zoom readout hides itself once used, so focus goes to the view however it was pressed; and on the title screen a dialog closed with the mouse goes back to the control that opened it, as with the keyboard. Only a real mouse counts: taps, and the taps a screen reader sends on a phone, keep "back to the opener". While the sound question is open none of this moves focus out of it, and no shortcut acts under it.

A mouse press on the view lets the browser give it focus itself, so the white keyboard frame does not appear for mouse users, also when the keyboard had put focus there before.

Checked by the keyboard run (`keyboard-test-log.md`, steps 7.0a and 7.0b): with focus on a button, T, M, E, W and + do nothing; after pressing the mouse on the view, M, + and W work. Checked by `tests/a11y/focus-mouse.mjs` (14 steps): every mouse path above, the title screen, the sound question and the zoom readout by keyboard.

A code review of this change (three reviewers, each finding checked by a fourth) found that the map, EN / HU, closing the rooms menu by mouse and the zoom readout left the letter keys dead; that a dialog closed by mouse on the title screen sent focus to Enter; that the keyboard frame stayed on the view after a mouse press; and that "Walk to this work" on the title screen could take focus out of the sound question. All are fixed as described above, except the footer links (see the table below).

### All twelve findings of that review, and what was done

Three reviewers looked at the change independently; each finding was then checked by another agent. Twelve findings were confirmed. Several reviewers found the same fault, so they come to nine distinct faults.

| # | Finding | Same fault as | What was done |
|---|---|---|---|
| 1 | A click on the map, or on EN / HU, leaves the 3D view without focus, so the letter keys go dead | | Fixed in `4c1a2ce`: both hand focus back to the view |
| 2 | Opening and closing the rooms menu by mouse leaves focus on the Rooms button | | Fixed in `4c1a2ce` |
| 3 | On the title screen a dialog closed with the mouse sends focus to Enter, not to the control that opened it; screen-reader taps on a phone counted as mouse | | Fixed in `4c1a2ce`: back to the opener on the title screen; only a real mouse counts |
| 4 | The accessible version's contact line shows the link words, so the address itself can no longer be read there | | Asked; now done (`bbb4ec9`): the address is a plain line under the link on `text/`, and from 14 November 2026 in the statement panel of the digital exhibition as well |
| 5 | The colour fringes still swelled with a "glitch" band from the sound, a leftover of the removed pulse, which twitched them now and then without Web Audio | | Fixed in `eb2f607`, with the glitch removal |
| 6 | A mouse press on the view after a keyboard focus keeps the keyboard frame | | Fixed in `4c1a2ce`: the browser gives the view its focus itself |
| 7 | The zoom readout used by keyboard hides itself and focus falls to the page | | Fixed in `4c1a2ce`: focus goes to the view |
| 8 | A click on the map leaves the view without focus (second reviewer) | 1 | Same fix |
| 9 | Closing the rooms menu by mouse leaves focus on the button (second reviewer) | 2 | Same fix |
| 10 | A mouse click on a navbar or footer control that opens no dialog leaves the view without focus: EN / HU, and the footer links | 1, in part | EN / HU fixed. The footer links (Instagram, the MAMŰ logo, the accessible version) fixed on 14 November 2026: a mouse click on one hands focus to the view before the new tab opens or the page is left, so the letter keys work on coming back; by keyboard, focus stays on the link (`focus-mouse.mjs`, steps 14 to 16). Done |
| 11 | "Walk to this work" on the title screen enters the digital exhibition and then pulls focus out of the sound question | | Fixed in `4c1a2ce`: nothing moves focus or acts under the question |
| 12 | A dialog closed with the mouse on the title screen sends focus to Enter (second reviewer) | 3 | Same fix |

Still true: the keys are read by position (`event.code`), so on a French AZERTY keyboard "W" is the key labelled Z. They cannot be switched off or remapped; the criterion does not ask for that once they are focus-scoped.

## XR Accessibility User Requirements (XAUR, W3C Note, 25 August 2021)

"Meets" here means: built and checked in this pilot by the automated runs. Nothing has been tested with assistive technology or with disabled visitors.

| User need | Pilot | Why |
|---|---|---|
| 4.1 Immersive semantics and customization | in part | Navigation is signposted: rooms and the work in front are announced, the 3D view is named, the text version lists every work with its place (REQ 1a, 1c). Works can be gone through in order and opened for detail (1e in part). No remapping or resizing of controls (1b), no filtering or sorting (1d). Not yet heard with a screen reader. |
| 4.2 Motion agnostic interactions | meets | Nothing needs body movement or a pointer gesture: every control and every work can be reached from the keyboard alone, and mouse, wheel, touch and keyboard work side by side (REQ 2a, 2b, 2c). One limit: by keyboard you cannot look up or down freely; a jump to a work points the view at it. |
| 4.3 Immersive personalization | in part | Non-critical animation goes with the system's reduced-motion setting, sound is off by default and has a switch (REQ 3b). No symbol sets (3a). |
| 4.4 Interaction and target customization | in part | No fine pointing is needed: Page Down and Page Up reach every work, Enter opens it, nothing needs two keys at once, the on-screen Shift is a toggle (REQ 4a, 4c, 4d in part). Target sizes are not adjustable (4b). On a touch screen the buttons of the navbar and its folded menu, the toolbar, the rooms menu, the panels, the sound question and the viewer are now at least 44 × 44 px (Part 2a, D5 `4268c8c`, checked in phone emulation only). The footer's links are at least 24 px tall in a window up to 760 px wide (D4 `22ed75c`). Not done: in a wider window on a touch screen (a tablet) the footer's links stay 13 px tall, and the links in the text of the panels are 17 to 20 px tall per line at any width (measured on 15 November 2026 in Chromium with touch at 375 × 667 and 1024 × 768: 6 links in About, 10 in Contact, 1 in Accessibility). With a mouse some targets stay small. |
| 4.5 Voice commands | does not meet | No voice commands of our own. What speech software needs from a page is there: controls have names that contain their visible text, and the letter shortcuts act only while the 3D view has focus (see above). The toolbar's words now stay visible on phones, each keycap's name holds the letter printed on it, and the viewer's back button shows "Previous", the word in its name: done (Part 2a, B1 `16efe85`, B8 `8b1c772`, B15 `1875839`). Not tested with speech software. |
| 4.6 Color changes | does not meet | No high-contrast skin. The text version follows the system's light or dark setting. |
| 4.7 Magnification context and resetting | in part | The view can be zoomed to 4× and reset with 0, the room label and the floor plan show where you are (REQ 7a). Interface elements do not enlarge or reflow in the walk (7b); the text version does. On a phone the page can be pinch-zoomed on the title screen, the panels, the sound question and the viewer, while the 3D view keeps its own drag and pinch: done (Part 2a, D1 `2dd9c76`, checked in phone emulation only). In a window the size of a laptop at 200% the title card shows Enter, the tour caption clears the toolbar and the rooms menu stays on screen: done (Part 2a, E3 `c92e0dc` and `12908fd`, E1 `97b859a`, D7 `9ae9b7c`). |
| 4.8 Critical messaging and alerts | in part | The walk has no critical alerts. The messages it has (ready, could not start, room, work) go to a live region that is read without moving focus (REQ 8a). "Could not start" is now said only when the start-up really fails, and "Ready" never after it: done (Part 2a, F6 `9c1a7eb`, `f3ca8b7`). |
| 4.9 Gestural interfaces and interactions | does not meet | On touch screens the walk is gestures only (stick, drag, pinch, tap), with no screen reader support and no remapping. The text version is the alternative. |
| 4.10 Signing videos and text description transformation | does not meet | No sign language. |
| 4.11 Safe harbour controls | in part | Esc closes any panel and stops the tour; opening a panel stops the tour too, so its captions are not read over the panel: done (Part 2a, C4 `ba5f81a`). The rooms menu and Page Up / Page Down bring you to a known place. No single "safe place" key. |
| 4.12 Immersive time limits | not applicable | No session limits; nothing times out. (The tour's captions do advance by themselves: see 4.15.) |
| 4.13 Orientation and navigation | in part | Landmarks: room names announced and shown, a floor plan with a compass, positions in words in the text version (REQ 13c). The room name is now a heading (h2) under the page's one h1, and the rooms menu marks the room you are in (`aria-current`): done (Part 2a, B4 `e0fb2f8`, B11 `8eafd3e`). Jumping to a work or a room resets the view (13a in part). Field of view is not a setting (13b). By keyboard you cannot look up or down. |
| 4.14 Second screen devices | does not meet | Nothing built. The live region and the text version are plain text, which a braille display can show, but this was not tested. |
| 4.15 Interaction speed | in part | Clear start and stop for the tour (REQ 15d), walking speed has two steps (walk, run). The tour's timing cannot be slowed or paused (15b), there is no help mode (15c), and turning speed is fixed (15a in part). |
| 4.16 Avoiding sickness triggers | in part | No glitch flashes for anyone. With reduced motion: no grain, no camera bob, no eased zoom, and the tour jumps where it would fly (REQ 16a, 16b). The glitch pulse on a room change was measured, could flash more than three times a second, and is removed for everyone; what is left stays at 2 flashes a second or fewer in the measurement above (16b). Grain and colour fringes go with the system setting, which is the only switch. For everyone, the mouse under the walking keys now rolls its wheel three times and stops, and the floor plan's dot swells only for 3 seconds after a jump; with reduced motion neither moves: done (Part 2a, F7 `d683f49`; WCAG 2.2.2). |
| 4.17 Spatial audio tracks and alternatives | in part | The videos' sound is placed in the rooms (REQ 17a). No text description of the sound, no captions (17b). |
| 4.18 Spatial orientation: mono audio option | does not meet | No mono switch. |
| 4.19 Captioning, subtitling and text | does not meet | The videos have no captions or subtitles. The tour's captions are text, but their size and timing cannot be changed. |
