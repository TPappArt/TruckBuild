#!/usr/bin/env bash
# Builds the Android app: dist/TruckBuild.apk.
#
#   npm run build:android
#
# Needs a JDK (11 or newer) and an Android SDK with a platform and
# build-tools installed, found through ANDROID_HOME. It uses the SDK's own
# tools directly (aapt2, d8, zipalign, apksigner), not Gradle: the app is one
# small Java class round the game's web page, and this way a build takes a
# few seconds and downloads nothing.
#
# Signing. An app can only be updated by one signed with the same key, so
# the key has to stay the same from build to build:
#   - By default the key in android/sideload.jks is used. It is in the
#     repository for anyone to read, which is fine for handing the app to
#     family and friends and no good for a store.
#   - For a key of your own, set ANDROID_KEYSTORE (a file), and
#     ANDROID_KEYSTORE_PASSWORD and ANDROID_KEY_ALIAS to match.
set -euo pipefail
cd "$(dirname "$0")/.."

SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [ -z "$SDK" ] || [ ! -d "$SDK/build-tools" ] || [ ! -d "$SDK/platforms" ]; then
  echo "No Android SDK found. Set ANDROID_HOME to one with build-tools and a platform installed." >&2
  exit 1
fi
TOOLS="$(ls -d "$SDK"/build-tools/*/ | sort -V | tail -1)"
PLATFORM="$(ls -d "$SDK"/platforms/android-[0-9]*/ | sort -V | tail -1)android.jar"
echo "Using ${TOOLS} and ${PLATFORM}"

MIN_SDK=23     # Android 6
TARGET_SDK=34  # Android 14
VERSION="$(node -p "JSON.parse(require('fs').readFileSync('package.json', 'utf8')).version")"
# 1.2.3 becomes 10203: each new version must have a bigger number than the last.
CODE="$(node -p "'${VERSION}'.split('.').reduce((code, part) => code * 100 + Number(part), 0)")"

KEYSTORE="${ANDROID_KEYSTORE:-android/sideload.jks}"
KEY_PASSWORD="${ANDROID_KEYSTORE_PASSWORD:-truckbuild}"
KEY_ALIAS="${ANDROID_KEY_ALIAS:-truckbuild}"

node scripts/package.mjs

OUT=android/build
rm -rf "$OUT"
mkdir -p "$OUT/classes" "$OUT/dex" "$OUT/assets" "$OUT/gen"
cp -r dist/www "$OUT/assets/www"

# Resources and the manifest, with the game's files as assets.
"${TOOLS}aapt2" compile --dir android/res -o "$OUT/res.zip"
"${TOOLS}aapt2" link -o "$OUT/unsigned.apk" -I "$PLATFORM" \
  --manifest android/AndroidManifest.xml -A "$OUT/assets" --java "$OUT/gen" \
  --min-sdk-version "$MIN_SDK" --target-sdk-version "$TARGET_SDK" \
  --version-code "$CODE" --version-name "$VERSION" \
  "$OUT/res.zip"

# The one Java class, compiled and turned into Android's own format.
javac -Xlint:-options --release 11 -classpath "$PLATFORM" -d "$OUT/classes" \
  $(find android/src "$OUT/gen" -name '*.java')
"${TOOLS}d8" --release --lib "$PLATFORM" --min-api "$MIN_SDK" --output "$OUT/dex" \
  $(find "$OUT/classes" -name '*.class')
(cd "$OUT/dex" && zip -q -X ../unsigned.apk classes.dex)

"${TOOLS}zipalign" -f -p 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"
"${TOOLS}apksigner" sign --ks "$KEYSTORE" --ks-pass "pass:${KEY_PASSWORD}" --ks-key-alias "$KEY_ALIAS" \
  --out "dist/TruckBuild.apk" "$OUT/aligned.apk"
"${TOOLS}apksigner" verify --verbose "dist/TruckBuild.apk" | head -6
rm -f "dist/TruckBuild.apk.idsig"

echo "Built dist/TruckBuild.apk: version ${VERSION} (${CODE}), $(du -h "dist/TruckBuild.apk" | cut -f1)"
