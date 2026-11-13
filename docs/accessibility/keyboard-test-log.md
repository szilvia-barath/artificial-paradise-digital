# Keyboard test log

Written by `tests/a11y/keyboard.mjs` on 2026-11-13: Chromium (Playwright, headless, software WebGL), window 1366 × 768, English. Every step was driven by key presses only. 31 of 31 steps passed.

## PASS: 1.1 From page load, the first Tab reaches the skip link

- Expected: focus on a.skip-link "Text version of the exhibition", visible on screen, first focusable element
- What happened: skip-link "Text version of the exhibition", on screen: true, first focusable: true

## PASS: 1.2 Enter follows it to the text edition

- Expected: address ends in /text/?lang=en, one h1
- What happened: /text/?lang=en · h1 "Artificial Paradise: text version"

## PASS: 1.3 Tab, Enter on its first link comes back to the walk

- Expected: first link "Go to the 3D walk"; back on the walk's address
- What happened: a "Go to the 3D walk" → /?lang=en

## PASS: 1.4 When loading is done, focus is on Enter

- Expected: button#enter
- What happened: button#enter "| Enter |"

## PASS: 2. Panel About: Tab to it (11 presses), Enter, Tab round, Esc

- Expected: focus on Close inside the panel; Tab stays inside; Esc closes; focus back on the control that opened it
- What happened: opened with focus on button "Close"; dialog named "Artificial Paradise"; 8 controls in the Tab round, stayed inside: true; closed: true; focus back on opener: true

## PASS: 2. Panel Works: Tab to it (1 presses), Enter, Tab round, Esc

- Expected: focus on Close inside the panel; Tab stays inside; Esc closes; focus back on the control that opened it
- What happened: opened with focus on button "Close"; dialog named "List of works"; 18 controls in the Tab round, stayed inside: true; closed: true; focus back on opener: true

## PASS: 2. Panel Behind the scenes: Tab to it (1 presses), Enter, Tab round, Esc

- Expected: focus on Close inside the panel; Tab stays inside; Esc closes; focus back on the control that opened it
- What happened: opened with focus on button "Close"; dialog named "How it's built"; 1 controls in the Tab round, stayed inside: true; closed: true; focus back on opener: true

## PASS: 2. Panel Contact (navbar): Tab to it (1 presses), Enter, Tab round, Esc

- Expected: focus on Close inside the panel; Tab stays inside; Esc closes; focus back on the control that opened it
- What happened: opened with focus on button "Close"; dialog named "Contact"; 13 controls in the Tab round, stayed inside: true; closed: true; focus back on opener: true

## PASS: 2. Panel Contact (footer): Tab to it (7 presses), Enter, Tab round, Esc

- Expected: focus on Close inside the panel; Tab stays inside; Esc closes; focus back on the control that opened it
- What happened: opened with focus on button "Close"; dialog named "Contact"; 13 controls in the Tab round, stayed inside: true; closed: true; focus back on opener: true

## PASS: 2. Panel Accessibility (footer): Tab to it (2 presses), Enter, Tab round, Esc

- Expected: focus on Close inside the panel; Tab stays inside; Esc closes; focus back on the control that opened it
- What happened: opened with focus on button "Close"; dialog named "Accessibility"; 2 controls in the Tab round, stayed inside: true; closed: true; focus back on opener: true

## PASS: 2. Panel Legal notice (footer): Tab to it (1 presses), Enter, Tab round, Esc

- Expected: focus on Close inside the panel; Tab stays inside; Esc closes; focus back on the control that opened it
- What happened: opened with focus on button "Close"; dialog named "Legal notice"; 3 controls in the Tab round, stayed inside: true; closed: true; focus back on opener: true

## PASS: 2. Panel Privacy (footer): Tab to it (1 presses), Enter, Tab round, Esc

- Expected: focus on Close inside the panel; Tab stays inside; Esc closes; focus back on the control that opened it
- What happened: opened with focus on button "Close"; dialog named "Privacy"; 5 controls in the Tab round, stayed inside: true; closed: true; focus back on opener: true

## PASS: 3.1 Tab to Enter (9 presses), press Enter: the sound question opens

- Expected: focus on "Without sound"; Tab moves between its two buttons only
- What happened: focus on button "Without sound"; 2 controls in the Tab round, stayed inside: true

## PASS: 3.2 Esc answers "without sound" and closes it

- Expected: question closed; focus on the 3D view; the room is announced
- What happened: closed: true; focus on canvas#scene "3D view of the exhibition:…; announced: ["Room 1. Paintings, Paradise Factory."]

## PASS: 3.3 The 3D view has a name

- Expected: says what it is, names the text version and the keys
- What happened: role application: "3D view of the exhibition: walk with the arrow keys, press Enter to open the work in front of you. The text version, the first link on the page, lists every work and all the keys."

## PASS: 4.1 Page Down through all 17 works; at each, Enter opens it and Esc closes it

- Expected: each work announced as "No. n, title. Press Enter to open." (with the room when it changes); Enter opens that work with focus on Close; Esc returns focus to the 3D view
- What happened: 

```
ok   1  announced: "No. 1, Wrong Data Landscape Dresden. Press Enter to open." · Enter opened: "Wrong Data Landscape Dresden" (focus on Close: true) · Esc: focus on the 3D view: true
ok   2  announced: "No. 2, Human as Error VI. Press Enter to open." · Enter opened: "Human as Error VI" (focus on Close: true) · Esc: focus on the 3D view: true
ok   3  announced: "No. 3, Paradise Factory. Press Enter to open." · Enter opened: "Paradise Factory" (focus on Close: true) · Esc: focus on the 3D view: true
ok   4  announced: "No. 4, Human as Error III. Press Enter to open." · Enter opened: "Human as Error III" (focus on Close: true) · Esc: focus on the 3D view: true
ok   5  announced: "No. 5, Human as Error I. Press Enter to open." · Enter opened: "Human as Error I" (focus on Close: true) · Esc: focus on the 3D view: true
ok   6  announced: "Room 2. Video, bar. No. 6, Artificial Paradise – Singapore. Press Enter to open." · Enter opened: "Artificial Paradise – Singapore" (focus on Close: true) · Esc: focus on the 3D view: true
ok   7  announced: "No. 7, Artificial Paradise – The Eden project. Press Enter to open." · Enter opened: "Artificial Paradise – The Eden project" (focus on Close: true) · Esc: focus on the 3D view: true
ok   8  announced: "Room 3. Paintings, prints, video. No. 8, Wiena Wrong Landscape I. Press Enter to open." · Enter opened: "Wiena Wrong Landscape I" (focus on Close: true) · Esc: focus on the 3D view: true
ok   9  announced: "No. 9, Wrong Data Landscape Warsaw G24 I. Press Enter to open." · Enter opened: "Wrong Data Landscape Warsaw G24 I" (focus on Close: true) · Esc: focus on the 3D view: true
ok  10  announced: "No. 10, Wrong Data Landscape Warsaw II. Press Enter to open." · Enter opened: "Wrong Data Landscape Warsaw II" (focus on Close: true) · Esc: focus on the 3D view: true
ok  11  announced: "No. 11, Artificial Paradise I. Press Enter to open." · Enter opened: "Artificial Paradise I" (focus on Close: true) · Esc: focus on the 3D view: true
ok  12  announced: "No. 12, Artificial Paradise II. Press Enter to open." · Enter opened: "Artificial Paradise II" (focus on Close: true) · Esc: focus on the 3D view: true
ok  13  announced: "No. 13, Artificial Paradise III. Press Enter to open." · Enter opened: "Artificial Paradise III" (focus on Close: true) · Esc: focus on the 3D view: true
ok  14  announced: "No. 14, Wrong Data Landscape Warsaw G24 II. Press Enter to open." · Enter opened: "Wrong Data Landscape Warsaw G24 II" (focus on Close: true) · Esc: focus on the 3D view: true
ok  15  announced: "Room 4. Let it Flow, video. No. 15, Wiena Wrong Landscape II. Press Enter to open." · Enter opened: "Wiena Wrong Landscape II" (focus on Close: true) · Esc: focus on the 3D view: true
ok  16  announced: "No. 16, Let it Flow. Press Enter to open." · Enter opened: "Let it Flow" (focus on Close: true) · Esc: focus on the 3D view: true
ok  17  announced: "No. 17, Natural Life. Press Enter to open." · Enter opened: "Natural Life" (focus on Close: true) · Esc: focus on the 3D view: true
```

## PASS: 4.2 Page Down after the last work

- Expected: goes round to No. 1 and says so
- What happened: Room 1. Paintings, Paradise Factory. No. 1, Wrong Data Landscape Dresden. Press Enter to open.

## PASS: 4.3 Page Up from No. 1

- Expected: goes back to the last work
- What happened: Room 4. Let it Flow, video. No. 17, Natural Life. Press Enter to open.

## PASS: 5.1 Works panel (12 Tabs), Tab to no. 6 (6 Tabs), Enter: the viewer opens on a video work

- Expected: viewer open on "Artificial Paradise – Singapore", focus on Close; Tab stays inside (the video's native controls are not in the round); Esc closes; focus back on the Works button
- What happened: "Artificial Paradise – Singapore", focus on button "Close"; 8 controls in the Tab round, stayed inside: true; closed: true; focus now on button[data-nav=works] "Works"

## PASS: 6.1 Rooms menu: Enter opens it, Tab goes into it, Esc closes it

- Expected: aria-expanded true; focus on the first room; after Esc closed, focus on the Rooms button
- What happened: expanded: true; Tab → button "Room 1Wrong Data Landscape Dresden, Human as Error VI, Parad"; after Esc expanded: false, focus on button[data-action=rooms] "⌖Rooms"

## PASS: 6.2 Choose Room 3 in the menu

- Expected: jump to Room 3, announced; menu closed; focus on the Rooms button
- What happened: announced: "Room 3. Paintings, prints, video."; room label "Room 3"; focus on button[data-action=rooms] "⌖Rooms"

## PASS: 6.3 Enter on the Sound button

- Expected: switches the sound; does not also open the work in view
- What happened: sound button pressed: true; viewer open: false

## PASS: 7.0a T, M, E, W and + while focus is on a button (Sound)

- Expected: nothing happens: no tour, sound unchanged, no viewer, no walking, no zoom
- What happened: before {"tour":false,"muted":true,"zoom":1}, after {"tour":false,"muted":true,"zoom":1}; W registered: false; viewer open: false

## PASS: 7.0b Pressing the mouse on the 3D view gives it focus; then M, + and W work

- Expected: focus on the 3D view; M switches the sound; + zooms; W is taken as walking
- What happened: focus on the view: true; sound after M: true; zoom after +: 1.25; W registered: true

## PASS: 7.1 Tab back to the 3D view (25 presses); T starts the tour

- Expected: Tour button reads as pressed; the opening caption and the first work's caption are announced
- What happened: aria-pressed: true; announced: "Artificial Paradise. Down the stairs into the basement of MAMŰ: Artificial Paradise by KristofLab, 10-31 January 2025. | Room 1. Paintings, Paradise Factory. | No. 1, Wrong Data Landscape Dresden. Acrylic on canvas, 140 × 160 cm, 2023."

## PASS: 7.2 Esc stops the tour

- Expected: Tour button not pressed; "Tour stopped." announced
- What happened: aria-pressed: false; announced: "Tour stopped."

## PASS: 7.3 The Tour button by keyboard: Enter starts, Enter stops

- Expected: pressed true, then false
- What happened: on button[data-action=tour] "▶Tour": true, then false

## PASS: 8.1 Tab to HU (15 presses), Enter

- Expected: page language hu; address carries lang=hu; the skip link points to text/hu/; focus stays on HU
- What happened: {"lang":"hu","url":"/?lang=hu","skip":"./text/hu/?lang=hu","focus":true,"pressed":"true"}

## PASS: 8.2 Shift+Tab to EN, Enter

- Expected: page language en
- What happened: en

## PASS: 9.1 Open the walk from a link to a work (?work=w11-artificial-paradise-i-print)

- Expected: after Enter and the sound question: Room 3 and No. 11 announced; Enter opens No. 11
- What happened: announced: "Room 3. Paintings, prints, video. No. 11, Artificial Paradise I. Press Enter to open."; Enter opened: "Artificial Paradise I"

## PASS: Console errors during the whole run

- Expected: none
- What happened: none
