# Video files in `public/video`: what made each one

Each file the 3D view plays, where it came from and what encoded it, so that it can be made
again from the artist's files (`scripts/make_videos.sh <folder> [all|loops|light|wiena]`).
"Second generation" means the file was made from a loop already in `public/video`, not from
the artist's file, because that file was not on the machine; remake it from the artist's file
when it is to hand.

Encoders:

- **A**: ffmpeg 6.1 (Lavf60.16.100, Lavc60.31.102), libx264 and the native AAC encoder, before
  17 November 2026 (the loops; the machine is not recorded).
- **C**: FFmpeg 6.1.1 essentials build from gyan.dev (`ffmpeg version 6.1.1-essentials_build-www.gyan.dev`,
  Lavc60.31.102, the same libavcodec as A), at `C:\Users\Acer\tools\ffmpeg-6.1.1-essentials_build\bin\ffmpeg.exe`,
  on the reconstructor's laptop, 18 November 2026: libx264 for the pictures. Sound is copied from a loop
  (`-c:a copy`), not encoded again: the loop's AAC is the best copy of the sound to hand, and a second AAC
  encode would only lose more. (Files made earlier the same day with the ffmpeg that comes with
  TouchDesigner and Intel Quick Sync were replaced by these; they remain in the branch history only.)

| File | Made | From | Encoder | Picture | Sound |
|---|---|---|---|---|---|
| `w03-screen.mp4` | before 17 Nov 2026 | `paradise factory_.mp4` | A | 532 × 640, 45 s, crf 30 | none |
| `w06-artificial-paradise-singapore.mp4` | before 17 Nov 2026 | `artifical paradise_singapore.mp4` | A | 960 × 540, 40 s, crf 30 | AAC 96 kbit/s, −2 dB |
| `w07-artificial-paradise-eden-project.mp4` | before 17 Nov 2026 | `artifical paradise_The Eden Project_sound.mp4` | A | 960 × 540, 58 s, crf 30 | AAC 96 kbit/s, 0 dB |
| `w16-projection.mp4` | 13 Nov 2026 | `siluett_short.mp4` | A | 1600 × 900, 9 s, crf 24 | AAC 96 kbit/s, +21.5 dB |
| `w16-floor.mp4` | before 17 Nov 2026 | `Let it flow_ok.mp4` | A | 1280 × 720, 40 s, crf 27 | none |
| `w17-natural-life.mp4` | before 17 Nov 2026 | `Natural life, Full Hd, video, 2024 .mp4` | A | 960 × 540, 40 s, crf 30 | AAC 96 kbit/s, +15 dB |
| `w08-wiena-wrong-landscape-i.mp4` | 18 Nov 2026 | second generation: the 4:3 loop (960 × 720, made by A from `Wiena Wrong Landscape NFT 2023.mp4`), cut to 16:9 with equal strips from top and bottom | C, libx264 1000 kbit/s | 960 × 540, 37.6 s, 4.7 MB | none |
| `w15-wiena-wrong-landscape-ii.mp4` | 18 Nov 2026 | second generation: the 4:3 loop (960 × 720, made by A from `Wiena Wrong Landscape NFT - 2 2023.mp4`), cut the same way | C, libx264 750 kbit/s | 960 × 540, 37.6 s, 3.5 MB | none |
| `w03-screen-light.mp4` | 18 Nov 2026 | second generation: the first 12 s of `w03-screen.mp4` | C, libx264 120 kbit/s | 128 × 154, 12 s, 0.15 MB | none |
| `w06-artificial-paradise-singapore-light.mp4` | 18 Nov 2026 | second generation: the first 12 s of `w06-…-singapore.mp4` | C, libx264 180 kbit/s | 320 × 180, 12 s, 0.24 MB | none (see `-sound.m4a`) |
| `w07-artificial-paradise-eden-project-light.mp4` | 18 Nov 2026 | second generation: the first 12 s of `w07-…-eden-project.mp4` | C, libx264 180 kbit/s | 320 × 180, 12 s, 0.27 MB | none (see `-sound.m4a`) |
| `w08-wiena-wrong-landscape-i-light.mp4` | 18 Nov 2026 | third generation: the first 12 s of the 16:9 `w08-…-i.mp4` above | C, libx264 180 kbit/s | 320 × 180, 12 s, 0.27 MB | none |
| `w15-wiena-wrong-landscape-ii-light.mp4` | 18 Nov 2026 | third generation: the first 12 s of the 16:9 `w15-…-ii.mp4` above | C, libx264 180 kbit/s | 320 × 180, 12 s, 0.27 MB | none |
| `w17-natural-life-light.mp4` | 18 Nov 2026 | second generation: the first 12 s of `w17-natural-life.mp4` | C, libx264 120 kbit/s | 320 × 180, 12 s, 0.12 MB | none (see `-sound.m4a`) |
| `w16-projection-light.mp4` | 18 Nov 2026 | picture: `siluett_short.mp4`, the loop's cut and dissolve; sound: copied from `w16-projection.mp4` | C, libx264 400 kbit/s | 640 × 360, 9 s, 0.50 MB | the loop's AAC, copied (+21.5 dB as encoded by A) |
| `w16-floor-light.mp4` | 18 Nov 2026 | `Let it flow_ok.mp4`, from 10 s, the loop's black point and dissolve | C, libx264 400 kbit/s | 640 × 360, 12 s, 0.60 MB | none |
| `w06-artificial-paradise-singapore-sound.m4a` | 18 Nov 2026 | the sound of `w06-…-singapore.mp4`, copied | C, copy | none | AAC, 40 s, 0.49 MB |
| `w07-artificial-paradise-eden-project-sound.m4a` | 18 Nov 2026 | the sound of `w07-…-eden-project.mp4`, copied | C, copy | none | AAC, 58 s, 0.72 MB |
| `w17-natural-life-sound.m4a` | 18 Nov 2026 | the sound of `w17-natural-life.mp4`, copied | C, copy | none | AAC, 40 s, 0.49 MB |

The documentation videos `w03-documentation.mp4` and `w16-documentation.mp4` (viewer only) were made by A from the artist's files, as `make_videos.sh` lists.
