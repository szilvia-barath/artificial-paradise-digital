# CLAUDE.md: Artificial Paradise

Save this file as `CLAUDE.md` in the root of the artificial-paradise repo. Claude Code reads it automatically.

## What this is

A walkable 3D web reconstruction of Kristóf Szabó (KristofLab)'s exhibition *Artificial Paradise* at MAMŰ Gallery, Budapest, 10–31 January 2025: four rooms and 17 works, in English and Hungarian. It's live at https://szilvia-barath.github.io/artificial-paradise/. It's also a research output: the reconstruction decisions (paradata) matter as much as the code.

## Stack and commands

- Vite, three.js and postprocessing. Optimised textures are KTX2/Basis, meshes are meshopt glb, and sound is Web Audio with the audio placed in the room.
- `npm run dev` (local), `npm run build`, `npm run preview`.
- Asset scripts: `npm run images` (optimise-images), `npm run textures` (bricks), `npm run plant`.
- Code layout:
  - `src/world/`: architecture, gallery, layout, lights
  - `src/ui/`: panels, viewer, minimap, keypad
  - `src/audio/`
  - `src/fx/`
  - `src/i18n/en.json` and `hu.json`
  - `src/data/exhibition.json`: meta, the works, contacts
- Deploy: `.github/workflows/deploy.yml` builds and publishes `dist/` to the `gh-pages` branch on every push to `main` **and to any `claude/**` branch**. Pushing a `claude/…` branch therefore replaces the live site. Work on branches with another prefix (for example `wip/…`) unless I say the change should go live, and propose changing the trigger to `main` only.

## Rights: hard rules

- The artworks, the photographs (by Kristóf Szabó) and the artist's videos and sound are **In Copyright** and not licensed for reuse. Never add raw photos to the repo, including `DSC_*.JPG`, `_01_panorama.jpg` and `room_1/`. They're still in the history and are due to be purged. Only optimised derivatives used by the site belong in `public/`.
- The code is mine, MIT licensed. Add `LICENSE` (MIT) and a `NOTICE` that says the licence covers code only, not content, if they're missing.
- Videos play from Google Drive iframes that load only on click. Keep it that way for privacy, and don't autoload third-party embeds.
- The only browser storage is `localStorage` key `ap-lang`. Don't add analytics, trackers or cookies. If anything new is stored or sent, update the `privacy` section in both i18n files.
- Screenshots or recordings for my portfolio show the digital exhibition only: rooms with artworks replaced by neutral panels, and the interface. No recognisable artwork.

## Paradata: log every reconstruction decision

- Every change to geometry, scale, hanging position, light or sound placement gets an entry in `PROGRESS.md`. Each entry says what changed, the evidence (photo number, floor plan, OSM, brick count), and whether it's **measured**, **inferred** or **invented**, with the uncertainty (for example "height ±10 cm").
- Follow the London Charter and the Seville Principles. Don't hide guesses.
- Planned data fields in `exhibition.json`, per work: `rights` (rightsstatements URI plus a credit line) and `reconstruction` (`measured | inferred | invented` plus a note). Add them consistently across all works if you touch the schema.

## Text and languages

- EN and HU must say the same thing. Any new string goes into both `en.json` and `hu.json`. If you're unsure of the Hungarian, mark it `[HU: confirm]` and tell me. Don't machine-guess legal wording.
- The `legal` and `privacy` sections are legal text. Change them only when I ask, and keep the update date.
- My voice: plain, concrete, first person where it fits. No AI phrasing (delve, crucial, seamless, robust, showcase, "at the intersection of", "not X but Y", em dashes). Use the szilvia-voice skill if it's installed.

## Roadmap (ask before starting any of these)

1. Purge the raw photos from git history. This is destructive: prepare the commands and let me run them.
2. Add `LICENSE` and `NOTICE`, and fill in the contacts in `exhibition.json`.
3. Add the per-work `rights` and `reconstruction` fields.
4. Accessible edition: keyboard navigation through the rooms, screen-reader labels for works and panels, spatial audio descriptions, and `prefers-reduced-motion`.
5. A "measured or guessed" view mode.
6. Catalogue export for Zenodo: CC0 metadata (Linked Art / EDM-aligned JSON-LD), CC BY 4.0 paradata, a IIIF manifest pointing only at images I'm allowed to share.

## Before you say something is done

- `npm run build` passes, and `npm run preview` loads all four rooms with no console errors.
- Check on a phone viewport and on a mid-range laptop. Watch for frame drops and memory use.
- Keyboard: Tab reaches every control, and Esc closes panels.
- EN and HU have matching keys.
- No new large binaries; check `git status` and the file sizes.
- Show me screenshots of what changed (no recognisable artworks if they're going public).
