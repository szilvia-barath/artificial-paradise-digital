#!/usr/bin/env bash
# Short web loops of the artist's videos for the screens in 3D (public/video), with the
# videos' own sound where they have one (the 3D view plays it from the screen's place).
# The full videos stay on Google Drive and play in the artwork viewer.
#   scripts/make_videos.sh <folder with the downloaded Drive videos> [all|loops|light]
# all (the default) makes the loops and their light versions; loops only the loops; light
# only the light versions and the sound files, leaving the loops as they are.
# FFMPEG names the ffmpeg to use if it is not on the PATH. The loops need libx264 and the aac
# encoder. The light versions and sound files need no aac encoder (their sound is copied
# from the loops), and with H264=qsv their picture is encoded by Intel Quick Sync instead of
# libx264, for an ffmpeg built without it (the one that comes with TouchDesigner):
#   FFMPEG=".../TouchDesigner/bin/ffmpeg.exe" H264=qsv scripts/make_videos.sh <folder> light
set -euo pipefail
SRC=${1:?folder with the Drive videos}
WHAT=${2:-all}
OUT=public/video
mkdir -p "$OUT"
ffmpeg() { command "${FFMPEG:-ffmpeg}" "$@"; }
# The H.264 encoder's arguments, into VENC. The quality is a crf (a number) or a bitrate
# (a number and k: the light versions, whose size is set rather than their quality). With
# Quick Sync the quality number is the crf plus 10 (at the crf's own number its files came
# out three to four times larger than libx264's), there are no B-frames, and the x264
# parameters are not used.
venc() { # crf or bitrate, [x264 parameters]
  local q=$1 rate=()
  if [[ $q == *k ]]; then
    local n=${q%k}
    rate=(-b:v "${n}k" -maxrate "$(( n * 3 / 2 ))k" -bufsize "$(( n * 2 ))k")
  fi
  if [ "${H264:-x264}" = qsv ]; then
    VENC=(-c:v h264_qsv -profile:v high -preset veryslow -bf 0)
    if [ ${#rate[@]} -gt 0 ]; then VENC+=("${rate[@]}"); else VENC+=(-global_quality "$(( q + 10 ))"); fi
  else
    VENC=(-c:v libx264 -profile:v high -preset slow)
    if [ ${#rate[@]} -gt 0 ]; then VENC+=("${rate[@]}"); else VENC+=(-crf "$q"); fi
    if [ -n "${2:-}" ]; then VENC+=(-x264-params "$2"); fi
  fi
}
ffprobe() { command "${FFPROBE:-ffprobe}" "$@"; }
enc() { # file, output name, start s, duration s, filter, fps, crf, [sound gain dB]
  local audio=(-an)
  # Sound: the gain evens out the very quiet field recordings a little (the limiter
  # keeps peaks below -2 dBFS), short fades hide the seam where the loop restarts.
  if [ -n "${8:-}" ]; then
    audio=(-af "volume=$8dB,alimiter=limit=0.79:level=false,afade=t=in:d=0.6,afade=t=out:st=$(awk "BEGIN { print $4 - 0.8 }"):d=0.8"
      -c:a aac -b:a 96k -ar 48000 -ac 2)
  fi
  venc "$7"
  ffmpeg -v error -y -ss "$3" -t "$4" -i "$SRC/$1" "${audio[@]}" -vf "$5,fps=$6,format=yuv420p" \
    "${VENC[@]}" -movflags +faststart "$OUT/$2.mp4"
}
# One cycle of a video whose picture repeats while its sound runs on: the sound's end is
# crossfaded into its start so nothing dips where the loop restarts. For slow, small movement
# (leaves in the wind): no B-frames and no skipped blocks, which freeze it at web bitrates,
# and one keyframe only, at the start, so the picture doesn't pulse during the cycle.
enc_cycle() { # file, output name, start s, cycle s, filter, fps, crf, sound gain dB
  local x=1.5 # crossfade, s
  local end; end=$(awk "BEGIN { print $4 + $x }")
  venc "$7" "keyint=infinite:scenecut=0:bframes=0:no-fast-pskip=1:no-dct-decimate=1:aq-mode=3:aq-strength=1.2:deblock=-2,-2"
  ffmpeg -v error -y -ss "$3" -t "$end" -i "$SRC/$1" -filter_complex "
    [0:v]$5,fps=$6,format=yuv420p,trim=duration=$4[v];
    [0:a]volume=$8dB,alimiter=limit=0.79:level=false,asplit=3[head][body][tail];
    [head]atrim=0:$x,asetpts=PTS-STARTPTS,afade=t=in:d=$x[h];
    [tail]atrim=$4:$end,asetpts=PTS-STARTPTS,afade=t=out:d=$x[t];
    [h][t]amerge=inputs=2,pan=stereo|c0=c0+c2|c1=c1+c3[join];
    [body]atrim=$x:$4,asetpts=PTS-STARTPTS[rest];
    [join][rest]concat=n=2:v=0:a=1[a]" -map '[v]' -map '[a]' \
    -c:a aac -b:a 96k -ar 48000 -ac 2 \
    "${VENC[@]}" \
    -movflags +faststart "$OUT/$2.mp4"
}
# Picture only, for very slight motion: no B-frames, no skipped or decimated blocks.
enc_subtle() { # file, output name, start s, duration s, filter, fps, crf
  venc "$7" "bframes=0:no-fast-pskip=1:no-dct-decimate=1:aq-mode=3:aq-strength=1.2:deblock=-2,-2"
  ffmpeg -v error -y -ss "$3" -t "$4" -i "$SRC/$1" -an -vf "$5,fps=$6,format=yuv420p" \
    "${VENC[@]}" -movflags +faststart "$OUT/$2.mp4"
}
# Picture only, for a video that never repeats: the end dissolves into the start, so the
# loop has no jump.
# (fps is given again after setpts: ffmpeg 7.1 forgets the frame rate there and xfade needs it)
enc_fade() { # file, output name, start s, duration s, filter, fps, crf
  local x=1.5 # dissolve, s
  venc "$7"
  ffmpeg -v error -y -ss "$3" -t "$(awk "BEGIN { print $4 + $x }")" -i "$SRC/$1" -filter_complex "
    [0:v]$5,fps=$6,format=yuv420p,split[a][b];
    [a]trim=0:$x,setpts=PTS-STARTPTS,fps=$6[head];
    [b]trim=$x,setpts=PTS-STARTPTS,fps=$6[body];
    [body][head]xfade=transition=fade:duration=$x:offset=$(awk "BEGIN { print $4 - $x }"),format=yuv420p[v]" -map '[v]' -an \
    "${VENC[@]}" -movflags +faststart "$OUT/$2.mp4"
}
# A short video with its sound: the picture dissolves and the sound crossfades over the seam.
enc_loop() { # file, output name, start s, duration s, filter, fps, crf, sound gain dB
  local x=1 # dissolve, s
  local end; end=$(awk "BEGIN { print $4 + $x }")
  venc "$7" "bframes=0:no-fast-pskip=1:no-dct-decimate=1:aq-mode=3"
  ffmpeg -v error -y -ss "$3" -t "$end" -i "$SRC/$1" -filter_complex "
    [0:v]$5,fps=$6,format=yuv420p,split[a][b];
    [a]trim=0:$x,setpts=PTS-STARTPTS,fps=$6[vh];
    [b]trim=$x,setpts=PTS-STARTPTS,fps=$6[vb];
    [vb][vh]xfade=transition=fade:duration=$x:offset=$(awk "BEGIN { print $4 - $x }"),format=yuv420p[v];
    [0:a]volume=$8dB,alimiter=limit=0.79:level=false,asplit=3[head][body][tail];
    [head]atrim=0:$x,asetpts=PTS-STARTPTS,afade=t=in:d=$x[h];
    [tail]atrim=$4:$end,asetpts=PTS-STARTPTS,afade=t=out:d=$x[t];
    [h][t]amerge=inputs=2,pan=stereo|c0=c0+c2|c1=c1+c3[join];
    [body]atrim=$x:$4,asetpts=PTS-STARTPTS[rest];
    [join][rest]concat=n=2:v=0:a=1[a]" -map '[v]' -map '[a]' \
    -c:a aac -b:a 96k -ar 48000 -ac 2 "${VENC[@]}" -movflags +faststart "$OUT/$2.mp4"
}
# ---------------------------------------------------------------- light versions
# For phones and low-power devices (src/world/videoPlan.js): what a screen in another room
# shows when it is seen through an opening. The same file, start, turn, crop and levels as
# the loop, through the same encode function, but only the first LIGHT_S seconds, at the
# size the screen has from the next room, at a set low bitrate, and silent. Siluett is the
# exception: its light version is its whole 9 s loop with its sound.
LIGHT_S=12
# Where the artist's file is not in the folder, the light version is made from the loop in
# public/video instead: the same cut, turn, crop and levels by construction, but an encode
# of an encode. The script says so for each file.
light() { # encode function, file, loop name, start s, filter before the size, size, filter after it, fps, bitrate
  local fn=$1 file=$2 name=$3 start=$4 pre=$5 size=$6 post=$7 fps=$8 rate=$9
  if [ -f "$SRC/$file" ]; then
    echo "$name-light: from '$file'" >&2
    "$fn" "$file" "$name-light" "$start" "$LIGHT_S" "${pre:+$pre,}scale=$size:flags=lanczos${post:+,$post}" "$fps" "$rate"
  else
    echo "$name-light: '$file' is not in $SRC; made from $OUT/$name.mp4 (second generation)" >&2
    (SRC=$OUT; "$fn" "$name.mp4" "$name-light" 0 "$LIGHT_S" "scale=$size:flags=lanczos" "$fps" "$rate")
  fi
}
enc_light() { light enc "$@"; }
enc_subtle_light() { light enc_subtle "$@"; }
enc_fade_light() { light enc_fade "$@"; }
# The whole loop, smaller, for a video with sound (Siluett): the picture as enc_loop makes it
# (the same dissolve over the seam), the sound copied from the loop as it is, so the light
# version sounds exactly as the loop does (the same +21.5 dB) and is exactly as long.
enc_loop_light() { # file, loop name, start s, duration s, size, fps, bitrate
  local x=1 # dissolve, s
  venc "$7" "bframes=0:no-fast-pskip=1:no-dct-decimate=1:aq-mode=3"
  if [ -f "$SRC/$1" ]; then
    echo "$2-light: from '$1'" >&2
    ffmpeg -v error -y -ss "$3" -t "$(awk "BEGIN { print $4 + $x }")" -i "$SRC/$1" -i "$OUT/$2.mp4" -filter_complex "
      [0:v]scale=$5:flags=lanczos,fps=$6,format=yuv420p,split[a][b];
      [a]trim=0:$x,setpts=PTS-STARTPTS,fps=$6[vh];
      [b]trim=$x,setpts=PTS-STARTPTS,fps=$6[vb];
      [vb][vh]xfade=transition=fade:duration=$x:offset=$(awk "BEGIN { print $4 - $x }"),format=yuv420p[v]" -map '[v]' -map 1:a -c:a copy \
      "${VENC[@]}" -movflags +faststart "$OUT/$2-light.mp4"
  else
    echo "$2-light: '$1' is not in $SRC; made from $OUT/$2.mp4 (second generation)" >&2
    ffmpeg -v error -y -i "$OUT/$2.mp4" -vf "scale=$5:flags=lanczos,format=yuv420p" -c:a copy \
      "${VENC[@]}" -movflags +faststart "$OUT/$2-light.mp4"
  fi
}
# A loop's sound alone, copied from the loop as it is (no second encode, the same levels):
# what is heard of it through a doorway where its picture is not seen or is the light version.
sound_of() { # loop name
  ffmpeg -v error -y -i "$OUT/$1.mp4" -vn -c:a copy -movflags +faststart "$OUT/$1-sound.m4a"
}

if [ "$WHAT" != light ]; then
# with sound: Singapore and The Eden Project as they are (about -24 and -26 LUFS), the
# quiet Natural life and Siluett (about -47 and -46 LUFS) raised by 15 dB; the wall loop
# (siluett_short.mp4, about -54 LUFS) by 21.5 dB, to match the earlier Siluett loop (-32 LUFS)
enc "artifical paradise_singapore.mp4" w06-artificial-paradise-singapore 30 40 "scale=960:540" 30 30 -2
enc "artifical paradise_The Eden Project_sound.mp4" w07-artificial-paradise-eden-project 0 58 "scale=960:540" 30 30 0
# silent: the Wiena files have no sound track, Paradise Factory and Let it flow a silent one
# the cyan Wiena hangs in Room 3 (#8), the red one in Room 4 (#15); the files stay 4:3. The
# gallery's 16:9 TVs cropped the picture, they did not stretch it (the artist, 13 November
# 2026; DSC_0089, DSC_0120): the walk crops it too (video.mediaAspect and cropTop in exhibition.json)
# the cyan Wiena barely moves (only the grass in the lower half sways): at the usual settings
# the encoder drops that motion and the screen looks frozen, so no skipped blocks and a lower crf
enc_subtle "Wiena Wrong Landscape NFT 2023.mp4" w08-wiena-wrong-landscape-i 0 37.6 "scale=960:720:flags=lanczos" 25 26
enc "Wiena Wrong Landscape NFT - 2 2023.mp4" w15-wiena-wrong-landscape-ii 0 37.6 "scale=960:720" 25 30
enc "Natural life, Full Hd, video, 2024 .mp4" w17-natural-life 30 40 "scale=960:540" 25 30 15
# the Paradise Factory monitor stands on its side: the footage turned counter-clockwise is
# upright on it, as in the documentation video, and cropped to the panel (0.831 wide to 1 high)
enc "paradise factory_.mp4" w03-screen 20 45 "transpose=2,crop=1024:1232,scale=532:640" 25 30
# the trees on the end wall: the reconstructor's 10 s cut of Siluett where it moves most
# (siluett_short.mp4, Drive file 12Oa73Oi...)
enc_loop "siluett_short.mp4" w16-projection 0 9 "scale=1600:900:flags=lanczos" 25 24 21.5
# shown in the artwork viewer: the documentation video of the installation
enc "Let it flow 2025 MAMU.mp4" w16-documentation 0 8.8 "scale=1280:720:flags=lanczos" 25 25 0
# shown in the artwork viewer for Paradise Factory: its documentation video, whole, with sound
enc "paradise factory 2025 installation.mp4" w03-documentation 0 73.04 "scale=1280:720:flags=lanczos" 25 29 0
# the black point is raised so the video's faint haze stays off the dark floor, as in the photos
enc_fade "Let it flow_ok.mp4" w16-floor 10 40 "scale=1280:720:flags=lanczos,colorlevels=rimin=0.07:gimin=0.07:bimin=0.09" 25 27
fi

if [ "$WHAT" != loops ]; then
# Sizes: a screen seen from another room is at most 113 px wide on an upright phone (no. 6
# from Room 3, no. 8 from Room 2), that is 170 device pixels at the phone's 1.5 pixel ratio:
# 320 px wide. The Paradise Factory screen is at most 24 px wide (from Room 2): 128 x 154,
# the loop's shape. Siluett is at most 212 px wide and the floor video 485 px (both from
# Room 3): 640 x 360. The bitrates give about 0.2 to 0.6 MB a file.
# (PROGRESS.md, "Videos by room": calculated from layout.js, not measured in the gallery.)
enc_light "artifical paradise_singapore.mp4" w06-artificial-paradise-singapore 30 "" 320:180 "" 25 180k
enc_light "artifical paradise_The Eden Project_sound.mp4" w07-artificial-paradise-eden-project 0 "" 320:180 "" 25 180k
enc_subtle_light "Wiena Wrong Landscape NFT 2023.mp4" w08-wiena-wrong-landscape-i 0 "" 320:240 "" 25 180k
enc_light "Wiena Wrong Landscape NFT - 2 2023.mp4" w15-wiena-wrong-landscape-ii 0 "" 320:240 "" 25 180k
enc_light "Natural life, Full Hd, video, 2024 .mp4" w17-natural-life 30 "" 320:180 "" 25 120k
enc_light "paradise factory_.mp4" w03-screen 20 "transpose=2,crop=1024:1232" 128:154 "" 25 120k
enc_loop_light "siluett_short.mp4" w16-projection 0 9 640:360 25 400k
# the black point is raised as in the loop (made from the loop, it is raised already)
enc_fade_light "Let it flow_ok.mp4" w16-floor 10 "" 640:360 "colorlevels=rimin=0.07:gimin=0.07:bimin=0.09" 25 400k
sound_of w06-artificial-paradise-singapore
sound_of w07-artificial-paradise-eden-project
sound_of w17-natural-life
fi
