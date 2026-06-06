#!/usr/bin/env bash
# Splash: logo horizontal. Launcher: solo el isotipo (cuadrado legible en el home).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SPLASH_LOGO="$ROOT/public/logo-completo1.png"
RES="$ROOT/android/app/src/main/res"
BRAND_BG='#FFD300'
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if ! command -v convert >/dev/null 2>&1; then
  echo "ImageMagick (convert) no está instalado." >&2
  exit 1
fi

# Solo el isotipo (columna izquierda del logo horizontal), sin texto SPEND$AVE.
convert "$SPLASH_LOGO" -crop 330x325+0+0 +repage -fuzz 8% -trim +repage "$TMP/icon-trim.png"
convert "$TMP/icon-trim.png" -resize 512x512 -background none -gravity center -extent 512x512 "$TMP/icon-square.png"

mkdir -p "$RES/drawable-nodpi"
cp "$SPLASH_LOGO" "$RES/drawable-nodpi/splash_logo.png"

declare -A SIZES=(
  [mipmap-mdpi]=48
  [mipmap-hdpi]=72
  [mipmap-xhdpi]=96
  [mipmap-xxhdpi]=144
  [mipmap-xxxhdpi]=192
)

for folder in "${!SIZES[@]}"; do
  size="${SIZES[$folder]}"
  out_dir="$RES/$folder"
  mkdir -p "$out_dir"
  icon_px=$((size * 72 / 100))
  convert -size "${size}x${size}" "xc:${BRAND_BG}" \
    \( "$TMP/icon-square.png" -resize "${icon_px}x${icon_px}" \) -gravity center -composite \
    "$out_dir/ic_launcher.png"
  cp "$out_dir/ic_launcher.png" "$out_dir/ic_launcher_round.png"
  fg=$((size * 3))
  icon_fg=$((fg * 58 / 100))
  convert -size "${fg}x${fg}" "xc:none" \
    \( "$TMP/icon-square.png" -resize "${icon_fg}x${icon_fg}" \) -gravity center -composite \
    "$out_dir/ic_launcher_foreground.png"
done

rm -f "$RES/drawable/splash.png"
find "$RES" -path '*/drawable-port-*' -name splash.png -delete
find "$RES" -path '*/drawable-land-*' -name splash.png -delete

echo "Launcher: isotipo (crop) | Splash: logo-completo1.png completo"
