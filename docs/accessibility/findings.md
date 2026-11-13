# Accessibility pilot: findings

13 November 2026, branch `wip/a11y-pilot`. A pilot, with no claim of WCAG conformance. The test output is beside this file: `axe-results.md`, `keyboard-test-log.md`; the script for the NVDA test is `screen-reader-test.md`; the Hungarian strings waiting for confirmation are in `hu-confirm.md`.

## The existing single-key shortcuts against WCAG 2.1.4

WCAG 2.1.4 Character Key Shortcuts (level A) says: if a shortcut uses only letter, number, punctuation or symbol keys, the visitor must be able to turn it off, or remap it to include a modifier key, or it must be active only while the component it belongs to has focus. The point is speech input: dictated words arrive as key presses, and a stray "t" should not start something.

What the code does (not changed in this pilot, as asked):

| Keys | What they do | Where they listen | Active when | Turn off / remap | 2.1.4 |
|---|---|---|---|---|---|
| T | start or stop the tour | `window`, `src/main.js` | inside the walk, no panel or viewer open, whatever has focus (also a button or a link) | no | fails |
| M | sound on or off | `window`, `src/main.js` | same | no | fails |
| E | open the work in the middle of the view | `window`, `src/main.js` | same | no | fails |
| W, S | walk forward, back | `window`, `src/controls.js` | same; they act while held | no | fails (↑ and ↓ do the same, but an alternative key does not meet the criterion) |
| A, D | step sideways | `window`, `src/controls.js` | same | no | fails; no other key does this |
| + − = _ 0 | zoom in, out, reset | `window`, `src/controls.js` | inside the walk, also during the tour | no | fails (not on your list, same pattern) |

Details that matter for the fix:

- The keys are read by position (`event.code`), not by letter. On a Hungarian QWERTZ keyboard they sit where the legend says; on a French AZERTY keyboard "W" is the key labelled Z. Speech input sends the letter, so "t", "m" and "e" hit T, M and E.
- They are off on the title screen and while a panel, the viewer or the sound question is open, and the site has no text field, which limits the damage. It does not meet the criterion.
- T, M and E fire even when focus is on a button. Enter no longer does (fixed in this pilot), because Enter on a button has to belong to the button.
- The keys this pilot added are outside 2.1.4, because none is a character key: Page Down and Page Up (next and previous work), Enter (open), Esc (close), Tab, the arrows.

The smallest fix, for after the pilot: make the letter keys and the zoom keys active only while the 3D view has focus (the criterion's third option). The view already takes focus from the keyboard; it would also have to take focus on a mouse click, where it now gives focus up on purpose (`document.activeElement.blur()` in `controls.js`). A remap or an off switch would need a setting, and a setting needs somewhere to be kept, which the storage rule (only `ap-lang`) does not allow yet.

## XR Accessibility User Requirements (XAUR, W3C Note, 25 August 2021)

"Meets" here means: built and checked in this pilot by the automated runs. Nothing has been tested with assistive technology or with disabled visitors.

| User need | Pilot | Why |
|---|---|---|
| 4.1 Immersive semantics and customization | in part | Navigation is signposted: rooms and the work in front are announced, the 3D view is named, the text version lists every work with its place (REQ 1a, 1c). Works can be gone through in order and opened for detail (1e in part). No remapping or resizing of controls (1b), no filtering or sorting (1d). Not yet heard with a screen reader. |
| 4.2 Motion agnostic interactions | meets | Nothing needs body movement or a pointer gesture: every control and every work can be reached from the keyboard alone, and mouse, wheel, touch and keyboard work side by side (REQ 2a, 2b, 2c). One limit: by keyboard you cannot look up or down freely; a jump to a work points the view at it. |
| 4.3 Immersive personalization | in part | Non-critical animation goes with the system's reduced-motion setting, sound is off by default and has a switch (REQ 3b). No symbol sets (3a). |
| 4.4 Interaction and target customization | in part | No fine pointing is needed: Page Down and Page Up reach every work, Enter opens it, nothing needs two keys at once, the on-screen Shift is a toggle (REQ 4a, 4c, 4d in part). Target sizes are not adjustable; some are small (4b). |
| 4.5 Voice commands | does not meet | Not built. Controls have names that contain their visible text, which speech software needs, but the single-key shortcuts get in its way (see above). |
| 4.6 Color changes | does not meet | No high-contrast skin. The text version follows the system's light or dark setting. |
| 4.7 Magnification context and resetting | in part | The view can be zoomed to 4× and reset with 0, the room label and the map show where you are (REQ 7a). Interface elements do not enlarge or reflow in the walk (7b); the text version does. |
| 4.8 Critical messaging and alerts | in part | The walk has no critical alerts. The messages it has (ready, could not start, room, work) go to a live region that is read without moving focus (REQ 8a). |
| 4.9 Gestural interfaces and interactions | does not meet | On touch screens the walk is gestures only (stick, drag, pinch, tap), with no screen reader support and no remapping. The text version is the alternative. |
| 4.10 Signing videos and text description transformation | does not meet | No sign language. |
| 4.11 Safe harbour controls | in part | Esc closes any panel and stops the tour; the rooms menu and Page Up / Page Down bring you to a known place. No single "safe place" key. |
| 4.12 Immersive time limits | not applicable | No session limits; nothing times out. (The tour's captions do advance by themselves: see 4.15.) |
| 4.13 Orientation and navigation | in part | Landmarks: room names announced and shown, a map with a compass, positions in words in the text version (REQ 13c). Jumping to a work or a room resets the view (13a in part). Field of view is not a setting (13b). By keyboard you cannot look up or down. |
| 4.14 Second screen devices | does not meet | Nothing built. The live region and the text version are plain text, which a braille display can show, but this was not tested. |
| 4.15 Interaction speed | in part | Clear start and stop for the tour (REQ 15d), walking speed has two steps (walk, run). The tour's timing cannot be slowed or paused (15b), there is no help mode (15c), and turning speed is fixed (15a in part). |
| 4.16 Avoiding sickness triggers | in part | With reduced motion: no glitch flashes, no grain, no camera bob, no eased zoom, and the tour jumps where it would fly (REQ 16a, 16b). Without the setting the glitch pulse on a room change stays; its flash rate was not measured against the three-per-second threshold. The system setting is the only switch. |
| 4.17 Spatial audio tracks and alternatives | in part | The videos' sound is placed in the rooms (REQ 17a). No text description of the sound, no captions (17b). |
| 4.18 Spatial orientation: mono audio option | does not meet | No mono switch. |
| 4.19 Captioning, subtitling and text | does not meet | The videos have no captions or subtitles. The tour's captions are text, but their size and timing cannot be changed. |
