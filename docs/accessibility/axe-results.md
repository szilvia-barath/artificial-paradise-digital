# axe-core results

Written by `tests/a11y/axe.mjs` on 2026-11-14: axe-core 4.14.0, default rule set, Chromium (Playwright, headless), 34 states scanned.

## States scanned

- Text edition, English (light): 0 violations, 0 items axe could not decide, 31 rules passed
- Text edition, English (dark): 0 violations, 0 items axe could not decide, 31 rules passed
- Text edition, Hungarian (light): 0 violations, 0 items axe could not decide, 31 rules passed
- Text edition, Hungarian (dark): 0 violations, 0 items axe could not decide, 31 rules passed
- Walk EN: title screen: 0 violations, 1 items axe could not decide, 40 rules passed
- Walk EN: panel "about" open (title screen): 0 violations, 2 items axe could not decide, 45 rules passed
- Walk EN: panel "works" open (title screen): 0 violations, 2 items axe could not decide, 44 rules passed
- Walk EN: panel "bts" open (title screen): 0 violations, 2 items axe could not decide, 41 rules passed
- Walk EN: panel "contact" open (title screen): 0 violations, 2 items axe could not decide, 43 rules passed
- Walk EN: panel "accessibility" open (title screen): 0 violations, 2 items axe could not decide, 42 rules passed
- Walk EN: panel "legal" open (title screen): 0 violations, 2 items axe could not decide, 42 rules passed
- Walk EN: panel "privacy" open (title screen): 0 violations, 2 items axe could not decide, 42 rules passed
- Walk EN: sound question: 0 violations, 2 items axe could not decide, 40 rules passed
- Walk EN: inside, HUD: 0 violations, 2 items axe could not decide, 38 rules passed
- Walk EN: panel "about" open (inside): 0 violations, 2 items axe could not decide, 45 rules passed
- Walk EN: rooms menu open: 0 violations, 2 items axe could not decide, 38 rules passed
- Walk EN: viewer open (painting): 0 violations, 2 items axe could not decide, 43 rules passed
- Walk EN: viewer open (video, with Pause button): 0 violations, 3 items axe could not decide, 43 rules passed
- Walk EN: viewer open (video on a small screen): 0 violations, 3 items axe could not decide, 43 rules passed
- Walk HU: title screen: 0 violations, 1 items axe could not decide, 40 rules passed
- Walk HU: panel "about" open (title screen): 0 violations, 2 items axe could not decide, 45 rules passed
- Walk HU: panel "works" open (title screen): 0 violations, 2 items axe could not decide, 44 rules passed
- Walk HU: panel "bts" open (title screen): 0 violations, 2 items axe could not decide, 41 rules passed
- Walk HU: panel "contact" open (title screen): 0 violations, 2 items axe could not decide, 43 rules passed
- Walk HU: panel "accessibility" open (title screen): 0 violations, 2 items axe could not decide, 42 rules passed
- Walk HU: panel "legal" open (title screen): 0 violations, 2 items axe could not decide, 42 rules passed
- Walk HU: panel "privacy" open (title screen): 0 violations, 2 items axe could not decide, 42 rules passed
- Walk HU: sound question: 0 violations, 2 items axe could not decide, 40 rules passed
- Walk HU: inside, HUD: 0 violations, 2 items axe could not decide, 38 rules passed
- Walk HU: panel "about" open (inside): 0 violations, 2 items axe could not decide, 45 rules passed
- Walk HU: rooms menu open: 0 violations, 2 items axe could not decide, 38 rules passed
- Walk HU: viewer open (painting): 0 violations, 2 items axe could not decide, 43 rules passed
- Walk HU: viewer open (video, with Pause button): 0 violations, 3 items axe could not decide, 43 rules passed
- Walk HU: viewer open (video on a small screen): 0 violations, 3 items axe could not decide, 43 rules passed

## Serious or critical violations

- none

## Every other violation (moderate, minor)

- none

## Items axe could not decide by itself ("incomplete")

These are not failures. axe reports them when it cannot measure something, mostly the contrast of text that lies over the 3D view or a picture.

- **serious · color-contrast: Elements must meet minimum color contrast ratio thresholds**
  - Walk EN: title screen (25: .brand > b, .brand > span, button[data-nav="about"], button[data-nav="works"])
  - Walk EN: panel "about" open (title screen) (40: .brand > b, .brand > span, button[data-nav="about"], button[data-nav="works"])
  - Walk EN: panel "works" open (title screen) (55: .brand > b, .brand > span, button[data-nav="about"], button[data-nav="works"])
  - Walk EN: panel "bts" open (title screen) (33: .brand > b, .brand > span, button[data-nav="about"], button[data-nav="works"])
  - Walk EN: panel "contact" open (title screen) (47: .brand > b, .brand > span, button[data-nav="about"], button[data-nav="works"])
  - Walk EN: panel "accessibility" open (title screen) (34: .brand > b, .brand > span, button[data-nav="about"], button[data-nav="works"])
  - Walk EN: panel "legal" open (title screen) (38: .brand > b, .brand > span, button[data-nav="about"], button[data-nav="works"])
  - Walk EN: panel "privacy" open (title screen) (38: .brand > b, .brand > span, button[data-nav="about"], button[data-nav="works"])
  - Walk EN: sound question (40: .room-name, .room-sub, span[data-i18n="hud.tour"], button[data-action="rooms"] > .ico)
  - Walk EN: inside, HUD (40: .room-name, .room-sub, span[data-i18n="hud.tour"], button[data-action="rooms"] > .ico)
  - Walk EN: panel "about" open (inside) (55: .room-name, .room-sub, span[data-i18n="hud.tour"], button[data-action="rooms"] > .ico)
  - Walk EN: rooms menu open (48: .room-name, .room-sub, span[data-i18n="hud.tour"], button[data-action="rooms"] > .ico)
  - Walk EN: viewer open (painting) (50: .room-name, .room-sub, span[data-i18n="hud.tour"], button[data-action="rooms"] > .ico)
  - Walk EN: viewer open (video, with Pause button) (50: .room-name, .room-sub, span[data-i18n="hud.tour"], button[data-action="rooms"] > .ico)
  - Walk EN: viewer open (video on a small screen) (49: .room-name, .room-sub, span[data-i18n="hud.tour"], button[data-action="rooms"] > .ico)
  - Walk HU: title screen (8: .sep[aria-hidden="true"]:nth-child(3), .wide.sep[aria-hidden="true"], .sep[aria-hidden="true"]:nth-child(7), .sep[aria-hidden="true"]:nth-child(9))
  - Walk HU: panel "about" open (title screen) (16: .brand > b, .brand > span, button[data-nav="about"], button[data-nav="works"])
  - Walk HU: panel "works" open (title screen) (16: .brand > b, .brand > span, button[data-nav="about"], button[data-nav="works"])
  - Walk HU: panel "bts" open (title screen) (16: .brand > b, .brand > span, button[data-nav="about"], button[data-nav="works"])
  - Walk HU: panel "contact" open (title screen) (16: .brand > b, .brand > span, button[data-nav="about"], button[data-nav="works"])
  - Walk HU: panel "accessibility" open (title screen) (16: .brand > b, .brand > span, button[data-nav="about"], button[data-nav="works"])
  - Walk HU: panel "legal" open (title screen) (16: .brand > b, .brand > span, button[data-nav="about"], button[data-nav="works"])
  - Walk HU: panel "privacy" open (title screen) (16: .brand > b, .brand > span, button[data-nav="about"], button[data-nav="works"])
  - Walk HU: sound question (40: .room-name, .room-sub, span[data-i18n="hud.tour"], button[data-action="rooms"] > .ico)
  - Walk HU: inside, HUD (40: .room-name, .room-sub, span[data-i18n="hud.tour"], button[data-action="rooms"] > .ico)
  - Walk HU: panel "about" open (inside) (53: .room-name, .room-sub, span[data-i18n="hud.tour"], button[data-action="rooms"] > .ico)
  - Walk HU: rooms menu open (48: .room-name, .room-sub, span[data-i18n="hud.tour"], button[data-action="rooms"] > .ico)
  - Walk HU: viewer open (painting) (50: .room-name, .room-sub, span[data-i18n="hud.tour"], button[data-action="rooms"] > .ico)
  - Walk HU: viewer open (video, with Pause button) (50: .room-name, .room-sub, span[data-i18n="hud.tour"], button[data-action="rooms"] > .ico)
  - Walk HU: viewer open (video on a small screen) (49: .room-name, .room-sub, span[data-i18n="hud.tour"], button[data-action="rooms"] > .ico)
- **serious · label-content-name-mismatch: Elements must have their visible text as part of their accessible name**
  - Walk EN: panel "about" open (title screen) (1: #panel > .close[data-close=""][aria-label="Close"])
  - Walk EN: panel "works" open (title screen) (1: #panel > .close[data-close=""][aria-label="Close"])
  - Walk EN: panel "bts" open (title screen) (1: #panel > .close[data-close=""][aria-label="Close"])
  - Walk EN: panel "contact" open (title screen) (1: #panel > .close[data-close=""][aria-label="Close"])
  - Walk EN: panel "accessibility" open (title screen) (1: #panel > .close[data-close=""][aria-label="Close"])
  - Walk EN: panel "legal" open (title screen) (1: #panel > .close[data-close=""][aria-label="Close"])
  - Walk EN: panel "privacy" open (title screen) (1: #panel > .close[data-close=""][aria-label="Close"])
  - Walk EN: sound question (6: .k-w, .k-a, .k-s, .k-d)
  - Walk EN: inside, HUD (6: .k-w, .k-a, .k-s, .k-d)
  - Walk EN: panel "about" open (inside) (7: .k-w, .k-a, .k-s, .k-d)
  - Walk EN: rooms menu open (6: .k-w, .k-a, .k-s, .k-d)
  - Walk EN: viewer open (painting) (7: .k-w, .k-a, .k-s, .k-d)
  - Walk EN: viewer open (video, with Pause button) (7: .k-w, .k-a, .k-s, .k-d)
  - Walk EN: viewer open (video on a small screen) (7: .k-w, .k-a, .k-s, .k-d)
  - Walk HU: panel "about" open (title screen) (1: #panel > .close[data-close=""][aria-label="Bezárás"])
  - Walk HU: panel "works" open (title screen) (1: #panel > .close[data-close=""][aria-label="Bezárás"])
  - Walk HU: panel "bts" open (title screen) (1: #panel > .close[data-close=""][aria-label="Bezárás"])
  - Walk HU: panel "contact" open (title screen) (1: #panel > .close[data-close=""][aria-label="Bezárás"])
  - Walk HU: panel "accessibility" open (title screen) (1: #panel > .close[data-close=""][aria-label="Bezárás"])
  - Walk HU: panel "legal" open (title screen) (1: #panel > .close[data-close=""][aria-label="Bezárás"])
  - Walk HU: panel "privacy" open (title screen) (1: #panel > .close[data-close=""][aria-label="Bezárás"])
  - Walk HU: sound question (6: .k-w, .k-a, .k-s, .k-d)
  - Walk HU: inside, HUD (6: .k-w, .k-a, .k-s, .k-d)
  - Walk HU: panel "about" open (inside) (7: .k-w, .k-a, .k-s, .k-d)
  - Walk HU: rooms menu open (6: .k-w, .k-a, .k-s, .k-d)
  - Walk HU: viewer open (painting) (7: .k-w, .k-a, .k-s, .k-d)
  - Walk HU: viewer open (video, with Pause button) (7: .k-w, .k-a, .k-s, .k-d)
  - Walk HU: viewer open (video on a small screen) (7: .k-w, .k-a, .k-s, .k-d)
- **critical · video-caption: <video> elements must have captions**
  - Walk EN: viewer open (video, with Pause button) (1: #viewer-video)
  - Walk EN: viewer open (video on a small screen) (1: #viewer-video)
  - Walk HU: viewer open (video, with Pause button) (1: #viewer-video)
  - Walk HU: viewer open (video on a small screen) (1: #viewer-video)
