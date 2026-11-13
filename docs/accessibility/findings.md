# Accessibility pilot: findings

13 November 2026, branch `wip/a11y-pilot`. A pilot, with no claim of WCAG conformance. The test output is beside this file: `axe-results.md`, `keyboard-test-log.md`; the script for the NVDA test is `screen-reader-test.md`; the Hungarian strings waiting for confirmation are in `hu-confirm.md`.

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

How the view gets focus: Tab reaches it (it is the second stop on the page, after the skip link); pressing the mouse on it gives it focus (`controls.js`, where it used to give focus up); Page Down, Page Up and "Walk to this work" put focus on it; so does closing the sound question. A mouse click on the toolbar, the rooms menu or the zoom readout hands focus back to the view afterwards, and so does closing a panel or the viewer with the mouse, so someone who walks with W/A/S/D and clicks with the mouse does not lose the keys. A keyboard press on a button leaves focus on the button: the letter keys then do nothing until focus is back on the view, and the arrows still walk.

Checked by the keyboard run (`keyboard-test-log.md`, steps 7.0a and 7.0b): with focus on a button, T, M, E, W and + do nothing; after pressing the mouse on the view, M, + and W work.

Still true: the keys are read by position (`event.code`), so on a French AZERTY keyboard "W" is the key labelled Z. They cannot be switched off or remapped; the criterion does not ask for that once they are focus-scoped.

## XR Accessibility User Requirements (XAUR, W3C Note, 25 August 2021)

"Meets" here means: built and checked in this pilot by the automated runs. Nothing has been tested with assistive technology or with disabled visitors.

| User need | Pilot | Why |
|---|---|---|
| 4.1 Immersive semantics and customization | in part | Navigation is signposted: rooms and the work in front are announced, the 3D view is named, the text version lists every work with its place (REQ 1a, 1c). Works can be gone through in order and opened for detail (1e in part). No remapping or resizing of controls (1b), no filtering or sorting (1d). Not yet heard with a screen reader. |
| 4.2 Motion agnostic interactions | meets | Nothing needs body movement or a pointer gesture: every control and every work can be reached from the keyboard alone, and mouse, wheel, touch and keyboard work side by side (REQ 2a, 2b, 2c). One limit: by keyboard you cannot look up or down freely; a jump to a work points the view at it. |
| 4.3 Immersive personalization | in part | Non-critical animation goes with the system's reduced-motion setting, sound is off by default and has a switch (REQ 3b). No symbol sets (3a). |
| 4.4 Interaction and target customization | in part | No fine pointing is needed: Page Down and Page Up reach every work, Enter opens it, nothing needs two keys at once, the on-screen Shift is a toggle (REQ 4a, 4c, 4d in part). Target sizes are not adjustable; some are small (4b). |
| 4.5 Voice commands | does not meet | No voice commands of our own. What speech software needs from a page is there: controls have names that contain their visible text, and the letter shortcuts act only while the 3D view has focus (see above). Not tested with speech software. |
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
