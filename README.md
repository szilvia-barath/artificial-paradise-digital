# Artificial Paradise: Digital Exhibition

A walkable 3D reconstruction of **Artificial Paradise**, the solo exhibition by Kristóf Szabó (KristofLab) at MAMŰ Gallery, Budapest, 10–31 January 2025.

The rooms, the hang and the wall surfaces are rebuilt from installation photographs and the gallery's measured floor plan: 17 works (acrylic paintings, giclée prints, videos and two installations) hang where they hung, at their real sizes, in the artist's own reproductions, and the screens play the artist's videos.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/
npm run preview    # serve dist/
```

## Edit the content

- `src/i18n/en.json` and `src/i18n/hu.json`: every text a visitor reads, in English and Hungarian. `ui` holds the interface (navbar, buttons, hints); the rest is the exhibition text, credits, room names, the media and caption of each work (matched by id) and, in `descriptions`, the artist's texts on the works and series. A key missing from `hu.json` falls back to English.
- `src/data/exhibition.json`: official titles, sizes, years, images and the position of every work (`hang.face/at/along/y/w/h`, in metres), which artist's text each work shows (`desc`), its installation photos (`situ`), and the Contact panel (`contacts`: an entry stays hidden until its `href` is filled in, and a group with none shows "coming soon").
- `public/video/`: short loops of the artist's videos played on the screens, with the videos' own sound where they have one, played from the screen's place in the rooms (`scripts/make_videos.sh`, `src/audio/ambience.js`); the artwork viewer plays the full videos from YouTube (nos. 3, 6, 7, 16 and 17, embedded from youtube-nocookie.com) or Google Drive (nos. 8 and 15), each player made only when its button is pressed (`video.full` in `exhibition.json`: a `youtube` id wins over a `drive` id, so moving a video to YouTube is one line). The video documentation of nos. 3 and 16 plays in the viewer from `public/video/`; the documentation videos themselves and the floor video stay on Google Drive, as the source files.
- `scripts/make_river.py`: rebuilds the melted plastic river of Let it Flow from the artist's top-down image.
- `scripts/set_river_length.mjs`: sets the river's length in `src/data/river.json` without Python (as `make_river.py` would with that length).
- `scripts/fit_projector.mjs`: fits Let it Flow's floor projector to the evidence and writes its pose and lit area into `src/data/river.json`.
- `references/*.csv` and `scripts/make_references.mjs`: the table of the people, places, organisations, texts and concepts the exhibition's texts mention, with the themes that connect them to the works. `node scripts/make_references.mjs` writes `src/data/references.json`, which the links in the texts, the opening speech's footnotes and the Concept page are built from (`src/refs.js`, `src/refhtml.js`, `src/ui/concept.js`).
- `src/world/layout.js`: floor plan (wall blocks, doorways, ceilings).
- `npm run images` re-cuts the images listed in `scripts/crops.json`: the reproductions and installation photos from `reproductions/` (the room folders from the exhibition's Drive folder, not in git), the rest from the original installation photos (`DSC_*.JPG`, `_01_panorama.jpg` and `room_1/`). Those are not in this repository: they are kept in the private folder `artificial-paradise-photos`, which is not shared. To re-cut, copy its contents into the repo root first (they are git-ignored, so they can't be committed by mistake).
- `npm run textures -- <folder>` makes the brick wall textures from the redrawn patterns (the Drive folder's `brick-*-color.png` / `-bump.png`), sized for 7.7 cm courses, and their KTX2 versions.
- `npm run plant -- <file.glb>` prepares the artist's 3D model of the Paradise Factory plant (`public/models/paradise-factory-plant.glb`).
- `scripts/VERSIONS.md`: the versions of Node.js, FFmpeg and Python the assets were made with, and those that run today.

## Languages

English and Hungarian, switched from the navbar without reloading (the in-world text sheets are redrawn too). The first visit follows the browser language; `?lang=en` / `?lang=hu` links open a given language, and a choice made in the navbar is remembered.

## Deploy

Netlify builds and publishes the site on every push to `main`, with the settings in `netlify.toml` (`npm run build`, publish `dist/`, Node 22). The build uses relative paths, so it works on any domain or sub-path.

## Credits

Artist: Kristóf Szabó / KristofLab. Curator and text: Luca Cserhalmi. Opening speech: Barnabás Zemlényi-Kovács. Gallery: MAMŰ, Budapest. Supported by the National Cultural Fund of Hungary, the Hungarian Academy of Arts and the Municipality of Budapest District VII. Photography: Kristóf Szabó. Digital exhibition: Szilvia Baráth.

The exhibition on the gallery's site: [MAMŰ: the exhibition page](https://mamusociety.wordpress.com/2025/01/06/5963/).

**The artworks, photographs, videos and texts are © Kristóf Szabó / KristofLab and the respective authors; all rights reserved. The MIT licence covers the source code only.**

See `LICENSE` (MIT, code only) and `NOTICE` (what is not covered: also the sound, the 3D model and the textures). The installation photographs and documentation videos were taken by Kristóf Szabó.
