#!/bin/sh
# Turns iPhone screenshots into ones Google Play accepts (long side at most 2x the short side).
# macOS only (uses sips). Usage: sh scripts/play-screenshots.sh ~/Desktop/shot1.png ~/Desktop/shot2.png
# Output: store/android/screenshots/<name>.png, padded left/right with the app background.
set -e
out="$(dirname "$0")/../store/android/screenshots"
mkdir -p "$out"
for f in "$@"; do
  h=$(sips -g pixelHeight "$f" | awk '/pixelHeight/ {print $2}')
  w=$(sips -g pixelWidth "$f" | awk '/pixelWidth/ {print $2}')
  # 9:16 width for this height, never narrower than the original.
  target=$(( (h * 9 + 15) / 16 ))
  [ "$target" -lt "$w" ] && target=$w
  name=$(basename "$f")
  sips --padToHeightWidth "$h" "$target" --padColor F7F5F0 "$f" --out "$out/${name%.*}.png" >/dev/null
  echo "$out/${name%.*}.png  (${target}x${h})"
done
