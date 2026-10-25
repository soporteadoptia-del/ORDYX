#!/bin/bash
# Codifica los fotogramas en los clips de scroll-world (parámetros de su pipeline.md).
set -e
W=$(cd "$(dirname "$0")" && pwd)
OUT="$W/../../apps/web/public/disco"
mkdir -p $OUT/vid $OUT/still
for d in $W/vf-d/*/; do
  n=$(basename $d)
  ffmpeg -v error -y -framerate 24 -i $d/%04d.png -an -vf "scale=1280:720:flags=lanczos,unsharp=5:5:0.5:5:5:0.0" \
    -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -g 8 -keyint_min 8 -sc_threshold 0 -movflags +faststart $OUT/vid/$n.mp4
  case $n in dive*) python3 -c "from PIL import Image; Image.open('$d/0000.png').convert('RGB').resize((1280,720), Image.LANCZOS).save('$OUT/still/$n.webp','WEBP',quality=80)";; esac
done
for d in $W/vf-m/*/; do
  n=$(basename $d)
  ffmpeg -v error -y -framerate 24 -i $d/%04d.png -an -vf "scale=720:1280:flags=lanczos,unsharp=5:5:0.4:5:5:0.0" \
    -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p -g 4 -keyint_min 4 -sc_threshold 0 -movflags +faststart $OUT/vid/$n-m.mp4
  case $n in dive*) python3 -c "from PIL import Image; Image.open('$d/0000.png').convert('RGB').resize((720,1280), Image.LANCZOS).save('$OUT/still/$n-m.webp','WEBP',quality=80)";; esac
done
last=$(ls $W/vf-d/dive2/*.png | tail -1)
python3 -c "from PIL import Image; Image.open('$last').convert('RGB').resize((1280,720), Image.LANCZOS).save('$OUT/still/finale.webp','WEBP',quality=82)"
du -sh $OUT/vid $OUT/still
