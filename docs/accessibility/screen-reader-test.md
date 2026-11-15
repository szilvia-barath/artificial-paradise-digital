# Screen reader test: NVDA on Windows

A script for me (Szilvia) to run by hand. It has not been run yet: the "you should hear" lines are what the markup should produce, worked out from the code, not heard. They were worked out again on 15 November 2026, after the changes of group a of the UI/UX proposal. Where NVDA says something else, write it in the "Heard" column and send the table back.

## Before you start

- NVDA (current version), speech on, Speech viewer open (NVDA menu → Tools → Speech viewer) so you can copy what was said.
- Run the whole script twice: once in Firefox, once in Chrome. Note the browser at the top of your copy.
- Address: the preview of the `wip/a11y-pilot` branch, with `?lang=en` at the end. Run steps 1 to 9 again with `?lang=hu` if there is time.
- Keys in this script: **NVDA** is Insert (or Caps Lock). Browse mode and focus mode: NVDA plays a sound when it switches. Inside the 3D view NVDA should switch to focus mode by itself, because the view has the role "application".
- Exact wording varies a little between NVDA versions and between Firefox and Chrome ("clickable", "button" before or after the name). Only note differences that change the meaning, drop something, or say something twice.
- Use a wide window (a laptop at 100%) except in steps 1.8 to 1.10, which ask for a narrow one.

## 1. Title screen

| # | Do | You should hear | Heard |
|---|---|---|---|
| 1.1 | Load the page. Wait for the loading line to finish. | The page title "Artificial Paradise: Digital Exhibition". When loading ends: "Ready", then "Enter, button" (focus moves to it). | |
| 1.2 | Press Ctrl+Home, then Tab once. | "Accessible version navigation landmark, Accessible version of the digital exhibition (text format), link". The link shows at the top left. | |
| 1.3 | Press NVDA+F7, choose Headings. | Two headings: level 1 "Artificial Paradise: Digital Exhibition" (not shown on screen; the same words as the page title), and under it level 2 "Artificial Paradise · KristofLab · Digital exhibition" (the title card). | |
| 1.4 | In the same list choose Landmarks. | Accessible version (navigation), main, banner, Main (navigation, inside the banner), the title region "Artificial Paradise · KristofLab · Digital exhibition", content info. | |
| 1.5 | Close the list. Press B a few times (next button). | About, Works, Behind the scenes, Contact, EN (pressed), HU (not pressed), Enter, then in the footer Contact, Accessibility, Legal notice, Privacy. No Menu button in a wide window (see 1.8) and no button for the 3D view yet. | |
| 1.6 | Find the progress line with the arrow keys. | "Loading the exhibition, progress bar, 100". | |
| 1.7 | Press Ctrl+Home, then K a few times (next link). | "Accessible version of the digital exhibition (text format)" (the skip link); the same words again under Enter (the title card's link); then in the footer "MAMŰ" (a graphic link), "Instagram post from the exhibition" (the arrow after it is not read) and "Accessible version (text format)". | |
| 1.8 | Make the window narrower than 760 pixels (or, in a window up to about 1500 pixels wide, zoom the browser to 200%) and reload. If no Menu button appears, the window is still too wide. When "Ready" is said, press Ctrl+Home and Tab four times. | The skip link, then "Menu, button, collapsed", "EN, toggle button, pressed", "HU, toggle button, not pressed". Menu comes before the languages, although it stands to their right on screen. | |
| 1.9 | Shift+Tab back to Menu, press Enter, then Tab until HU. Then Shift+Tab twice (to Privacy) and press Esc. | "Menu, button, expanded". Then About, Works, Behind the scenes, Contact, "Accessible version (text format), link", Accessibility, Legal notice, Privacy, EN, HU. After Esc: "Menu, button, collapsed". | |
| 1.10 | Still in the narrow window, press K until the footer's Instagram link. Then make the window wide again (or zoom back to 100%) and reload. | "Instagram post from the exhibition, link", although the screen shows only "Instagram". | |

## 2. Accessible version

| # | Do | You should hear | Heard |
|---|---|---|---|
| 2.1 | Press Enter on "Accessible version of the digital exhibition (text format)". | New page: "Artificial Paradise: accessible version (text format)". | |
| 2.2 | Press H repeatedly. | Level 1 "Artificial Paradise: accessible version (text format)"; level 2 "Room 1"; level 3 "No. 1: Wrong Data Landscape Dresden", and so on. 1 heading at level 1, 10 at level 2 (4 rooms, then Exhibition text, Opening speech, Controls, Credits, Accessibility, Rights), 23 at level 3 (the 17 works, then the six parts of the accessibility statement: Status; What was tested, and how; What works; Known gaps; Planned; Contact). The level 1 heading is inside the main landmark. | |
| 2.3 | Press 2 to reach "Room 2", then the down arrow. | "Video · bar". "You come in from Room 1. 2 works in this room. The exhibition text is on a wall in this room. On the left wall as you enter. It hangs about halfway along the wall." | |
| 2.4 | Press 3 for the next work heading, then read down. | "No. 6: Artificial Paradise – Singapore". A list of terms: Medium "Video, Full HD", Year "2025", Where "On the wall behind you as you enter. It is the only work on this wall. It hangs beside the doorway you came through, on your left as you walk in." Then "About the videos" at level 4 and the artist's text. Then the link "Open No. 6, Artificial Paradise – Singapore, in the digital exhibition". | |
| 2.5 | Press Enter on that link. | The digital exhibition's title screen loads again. When ready: "Ready", "Enter, button". | |

## 3. Entering, the sound question

| # | Do | You should hear | Heard |
|---|---|---|---|
| 3.1 | Press Enter on the Enter button. | "Start with sound? dialog", then its description "Better with headphones · M switches the sound on or off any time" (NVDA may skip the dot or say it), then "Without sound, button". | |
| 3.2 | Press Tab twice. | "With sound, button", then "Without sound, button" again. Focus does not leave the question. | |
| 3.3 | Press Enter on "Without sound". | Focus mode sound. "3D view of the digital exhibition: walk with the arrow keys, press Enter to open the work in front of you. The accessible version, the first link on the page, lists every work and all the keys. application". Then "Room 2. Video, bar. No. 6, Artificial Paradise – Singapore. Press Enter to open." | |

Note if the long name of the 3D view is read before the room and the work, after them, or cuts them off.

## 4. Walking by keyboard

You are standing in front of No. 6, where the link from the accessible version put you.

| # | Do | You should hear | Heard |
|---|---|---|---|
| 4.1 | Press Enter. | "Artificial Paradise – Singapore, dialog", "Close, button". | |
| 4.2 | Press Tab through the viewer. | View in situ (installation photo), Pause the video, Full video with sound, Exhibition text (collapsed), Previous work (the button shows "← Previous"), Next work, Walk to this work, then Close again. | |
| 4.3 | Press Esc. | The viewer closes. Focus mode sound, the 3D view's name again. The work is not announced a second time. | |
| 4.4 | Press Page Down. | "No. 7, Artificial Paradise – The Eden project. Press Enter to open." No room, because you are still in Room 2. | |
| 4.5 | Press Page Down. | "Room 3. Paintings, prints, video. No. 8, Wiena Wrong Landscape I. Press Enter to open." | |
| 4.6 | Press Page Down nine more times, slowly. | Nos 9 to 14 in Room 3, one for each press, without the room. Then "Room 4. Let it Flow, video. No. 15, Wiena Wrong Landscape II. Press Enter to open.", then 16 and 17. | |
| 4.7 | Press Page Down once more, then Page Up. | "Room 1. Paintings, Paradise Factory. No. 1, Wrong Data Landscape Dresden. Press Enter to open." Then "Room 4. Let it Flow, video. No. 17, Natural Life. Press Enter to open." | |
| 4.8 | Hold the left arrow for about two seconds, release. Repeat a few times. | Each time another work comes to the middle of the view: "No. n, title. Press Enter to open." Nothing while only wall is in view. Never more than one announcement a second. | |
| 4.9 | Walk with the up arrow through the opening into Room 3. | "Room 3. Paintings, prints, video." as you cross. | |
| 4.10 | Press NVDA+Space (browse mode), then NVDA+F7: Headings, then Landmarks. Close the list. | Headings: level 1 "Artificial Paradise: Digital Exhibition", level 2 "Room 3" (the room you are in; it changes as you walk). The title card's heading is gone. Landmarks: Accessible version (navigation), main, Exhibition controls (navigation, inside main), banner, Main (navigation), content info; no title region. | |
| 4.11 | Still in browse mode, press 2 to reach "Room 3" and read down with the down arrow. Then go back to the 3D view and press NVDA+Space for focus mode. | "Room 3, heading level 2", "Paintings · prints · video", "Floor plan: click a room to go there, graphic" (NVDA may say it twice: the same words are its title, as with the keys before B8; not a new fault), then the toolbar and the keys. The line "Drag the mouse to look around the room." is not read: it goes at your first move, or 8 seconds after the sound question. | |

## 5. Toolbar and on-screen keys

| # | Do | You should hear | Heard |
|---|---|---|---|
| 5.1 | From the 3D view press Tab. | "Exhibition controls, navigation landmark", "Tour, toggle button, not pressed" (NVDA may also read the title "Guided tour (T)"). | |
| 5.2 | Tab again, press Enter. | "Rooms, button, collapsed", then "expanded". | |
| 5.3 | Tab three times, then Esc. | "Room 1, button", then the titles as its description: "Wrong Data Landscape Dresden, Human as Error VI, Paradise Factory, Human as Error III, Human as Error I". "Room 2, button", "Artificial Paradise – Singapore, Artificial Paradise – The Eden project". "Room 3, button, current location" (the room you are in after 4.9), then its seven titles. The titles are not part of the name, so each is said once, after the button. After Esc: "Rooms, button, collapsed". | |
| 5.4 | Tab to Sound, press Enter twice. | "Sound, toggle button, not pressed"; "pressed"; "not pressed". The work in view does not open. | |
| 5.5 | Tab on. | "Movement keys, grouping": "Forward (↑ / W), button", "Run (Shift), toggle button, not pressed", "Turn left (←)", "Back (↓ / S)", "Turn right (→)"; then "Zoom, grouping": "Zoom in (+)", "Zoom out (−)". Each name is said once, with nothing read after it as a description (NVDA may say the arrows as words). | |
| 5.6 | Press Enter on "Forward". | You take one step. If a work comes into view it is announced. | |
| 5.7 | Still on a button, press T, then M, then W. | Nothing: no tour, no change of sound, no step. The letter keys work only while the 3D view has focus. | |
| 5.8 | Shift+Tab until the 3D view's name is read. Press + twice, then Tab until you pass "Zoom out". | "Reset zoom (0) 1.6×, button" (NVDA may say "times" for ×). The cross shown after the number is not read. | |
| 5.9 | Press Enter. | The view zooms back out and the readout goes away. Focus is on the 3D view: focus mode sound and its name again. | |

## 6. The tour

| # | Do | You should hear | Heard |
|---|---|---|---|
| 6.1 | On the 3D view (where 5.9 left focus), press T. | After a few seconds, at the first work: "No. 1, Wrong Data Landscape Dresden. Acrylic on canvas, 140 × 160 cm, 2023." No line before it: the tour has no opening sentence. | |
| 6.2 | Wait. | At each stop one caption: No. 2, and so on, with "Room 2. Video, bar." when the tour changes room. | |
| 6.3 | Press Esc. | "Tour stopped." | |
| 6.4 | Press T again, then Tab once. | "Tour, toggle button, pressed". The name stays "Tour" while the tour runs; nothing says "Stop". | |
| 6.5 | Tab on to About in the navbar, press Enter. | "Artificial Paradise, dialog", "Close, button", and "Tour stopped." (before or after the dialog). No tour caption is read while the panel is open. | |
| 6.6 | Press Esc, then wait about 10 seconds. | "About, button". Nothing after it: the tour stays stopped. | |

## 7. Panels

| # | Do | You should hear | Heard |
|---|---|---|---|
| 7.1 | Tab to "About" in the navbar, press Enter. | "Artificial Paradise, dialog", "Close, button". | |
| 7.2 | Read down with the arrow keys. | The line with artist, venue and dates, heading level 2 "Artificial Paradise", the exhibition text, "Credits" level 3, the list, "The real exhibition" level 3, links, "Opening speech" level 3 with a collapsed line you can open with Enter. Reading stays inside the panel. | |
| 7.3 | Press Esc. | "About, button". | |
| 7.4 | Tab to "Accessibility" in the footer, press Enter, read, press Esc. | "Accessibility, dialog", "Close, button"; six headings at level 3 (Status; What was tested, and how; What works; Known gaps; Planned; Contact); after Esc "Accessibility, button". | |
| 7.5 | Open "Works", Tab to a work, press Enter, then Esc. | "List of works, dialog"; each work is a button "1 Wrong Data Landscape Dresden Acrylic on canvas, 140 × 160 cm, 2023 · Room 1"; Enter opens the viewer; Esc returns to "Works, button". | |

## 8. Language

| # | Do | You should hear | Heard |
|---|---|---|---|
| 8.1 | Tab to "HU", press Enter. | "HU, toggle button, pressed" (NVDA may say "Magyar" from the title). The page title becomes "Artificial Paradise digitális kiállítás", and so does the heading at level 1 (NVDA+F7 in browse mode). | |
| 8.2 | Press Page Down. | A Hungarian announcement with the English title in it, for example "1. terem. Festmények, Paradise Factory. 1. mű, Wrong Data Landscape Dresden. Megnyitás: Enter.". Note whether NVDA changes voice for Hungarian. | |
| 8.3 | Switch back to EN. | "EN, toggle button, pressed". | |

## 9. Reduced motion (no screen reader needed)

| # | Do | You should see | Seen |
|---|---|---|---|
| 9.1 | Windows Settings → Accessibility → Visual effects → Animation effects off. Reload, enter. | No grain shimmer on the picture, no colour fringes at the edges. | |
| 9.2 | Walk from Room 1 into Room 2. | Nothing flashes as you cross (the glitch effect is gone for everyone). | |
| 9.3 | Click the 3D view, press T. | The view jumps from stop to stop; it does not fly. Captions appear at once. | |
| 9.4 | Switch Animation effects back on, reload. | The loading screen is still a still picture; inside, the grain and the colour fringes are back, the tour flies again, and a room change still does not flash. | |
| 9.5 | With Animation effects on, enter, answer the sound question and watch the little mouse under the walking keys. Then jump to Room 3 with the rooms menu and watch the green dot on the floor plan. | The mouse rolls its wheel three times and then stays still. The dot swells and shrinks for about 3 seconds after the jump, then keeps its size. | |
| 9.6 | Switch Animation effects off again, reload, and do the same as in 9.5. | The mouse does not roll at all. The dot keeps its size after the jump. | |

## What to send back

The filled-in tables for Firefox and for Chrome, and for each difference: the step number, what you heard (copied from the Speech viewer) and whether it stopped you from going on.
