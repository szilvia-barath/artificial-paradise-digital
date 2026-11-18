# Tool versions

Which programs made the site's assets, and which run today. The asset scripts are in this folder; `PROGRESS.md` ("How to continue") has their arguments.

## At build time (as recorded by the reconstructor)

The laptop: Windows 11, Intel Core i7-9750H, 16 GB of memory.

- Node.js 22.15.0. It is the version installed now; it is assumed to be the one the assets were built with, not recorded at the time.
- FFmpeg 6.1.1, the "essentials" build from gyan.dev, installed on 30 October 2026. This is the FFmpeg `make_videos.sh` was written for and ran with (the video loops in `public/video/`).
- Python: the environment that made the river (`make_river.py`, on 2 and 3 November 2026) was not recorded and no longer exists. Its version, and those of numpy, Pillow and SciPy, are not known.

## Today (17 November 2026)

Read from the same laptop on 17 November 2026 (Windows build 10.0.26200.9974). FFmpeg changed on 18 November: see below.

| Tool | Version | How it was read |
| --- | --- | --- |
| Node.js | 22.15.0 | `node --version` |
| npm | 11.6.0 | `npm --version` |
| vite | 8.3.5 | `package-lock.json` |
| three | 0.186.1 | `package-lock.json` |
| postprocessing | 6.39.5 | `package-lock.json` |
| playwright | 1.63.0 (its Chromium: 153.0.8010.12, build 1243) | `package-lock.json`, `playwright-core/browsers.json` |
| axe-core | 4.14.0 | `package-lock.json` |
| sharp | 0.35.5 (libvips 8.18.7) | `package-lock.json`, `sharp.versions` |
| ktx2-encoder | 0.6.0 | `package-lock.json` |
| meshoptimizer | 0.22.0 | `package-lock.json` |
| @gltf-transform/core, /extensions, /functions | 4.5.1 | `package-lock.json` |
| Python | 3.13.3 | `python --version` |
| FFmpeg (17 November) | n3.2-dev-36610-g2665171c14 (built with gcc 10.2.0, November 2024), the build that ships with TouchDesigner | `"C:\Program Files\Derivative\TouchDesigner\bin\ffmpeg.exe" -version` |

Notes on today's machine:

- FFmpeg 6.1.1 from gyan.dev was not found on the PATH on 17 November (`where ffmpeg` found nothing). The only FFmpeg found then was TouchDesigner's, so any re-encode made on 17 November used that build. It is an LGPL build with most encoders turned off: it has no `libx264` and no `aac` encoder (`ffmpeg -encoders` lists only `h264_qsv` and `hevc_qsv` for H.264 and HEVC), so `make_videos.sh` as written (`-c:v libx264`, `-c:a aac`) does not run with it.

## From 18 November 2026

- FFmpeg 6.1.1 essentials build from gyan.dev, installed again on 18 November 2026 at `C:\Users\Acer\tools\ffmpeg-6.1.1-essentials_build` (`bin\ffmpeg.exe`, `bin\ffprobe.exe`) and added to the user PATH. Source: the GitHub release GyanD/codexffmpeg 6.1.1, a zip of 87,520,045 bytes, SHA-256 `742e32fc9f92681f9f254b925e1b613fdd8074ba40749d4879aefdb009b94cc5` (worked out on download; no checksum is published for that release). `ffmpeg -version` says "6.1.1-essentials_build-www.gyan.dev", built with gcc 12.2.0 (MSYS2), and it has the `libx264` and `aac` encoders. Encodes from 18 November use it.
- The tests draw the 3D view on the GPU from 18 November (commit 9f4972c): full Chromium in the new headless mode, ANGLE on Direct3D 11, on the laptop's Intel UHD Graphics 630. `AP_SOFTWARE=1` brings back the software renderer (SwiftShader) used before.
- Python 3.13.3 has no numpy, Pillow or SciPy installed, so `make_river.py` does not run with it as it is. TouchDesigner's own Python (`C:\Program Files\Derivative\TouchDesigner\bin\python.exe`, 3.11.15) has numpy 2.1.2 and OpenCV 4.11.0, but not Pillow or SciPy.
