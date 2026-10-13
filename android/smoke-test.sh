#!/usr/bin/env bash
# Installs the app on whatever device or emulator adb can see, starts it,
# taps Play and looks at what the app wrote to the log. Leaves screenshots
# in dist/. Used by .github/workflows/installers.yml; it works just as well
# on a phone plugged in with USB debugging on.
#
#   bash android/smoke-test.sh
set -uo pipefail
cd "$(dirname "$0")/.."

APP=io.github.tpappart.truckbuild
note() { echo "::notice title=Android test::$*"; }
fail() { echo "::error title=Android test::$*"; exit 1; }
# Every step has a time limit, so that a stuck device fails the test with a
# message saying where, rather than hanging until the workflow gives up.
step() { local limit="$1"; shift; timeout "$limit" "$@"; }
shot() { step 60 adb exec-out screencap -p > "dist/$1" || note "No screenshot $1 (the screen did not answer in a minute)."; }

note "Device ready: $(step 20 adb shell getprop ro.build.version.release | tr -d '\r'), started $(date +%T)."
step 180 adb install -r "dist/FizzbangRally.apk" || fail "The app would not install."
step 20 adb logcat -c
step 120 adb shell am start -W -n "$APP/.MainActivity" || fail "The app would not start."
note "App started $(date +%T)."
sleep 20
shot android-1-start.png
note "First screenshot $(date +%T)." 

# Play is near the bottom of the screen, under the jumping cars. (If that
# scene could not be drawn it is in the middle instead: try there first,
# where a tap does nothing otherwise.)
SIZE="$(step 20 adb shell wm size | tr -d '\r' | sed -n 's/.*: \([0-9]*\)x\([0-9]*\).*/\1 \2/p' | tail -1)"
WIDTH="${SIZE% *}"
HEIGHT="${SIZE#* }"
step 20 adb shell input tap $((WIDTH / 2)) $((HEIGHT * 545 / 1000))
sleep 1
step 20 adb shell input tap $((WIDTH / 2)) $((HEIGHT * 877 / 1000))
# The first time, it takes a picture of every track before going on.
sleep 75
shot android-2-after-play.png
# "Let's go" on the screen that asks who is driving.
step 20 adb shell input tap $((WIDTH / 2)) $((HEIGHT * 72 / 100))
sleep 8
shot android-3-garage.png
note "Last screenshot $(date +%T)."

step 60 adb logcat -d -s GamePage:I > dist/android-log.txt
pidof_app="$(step 20 adb shell pidof "$APP" | tr -d '\r')"
note "Screen ${WIDTH}x${HEIGHT}. App process: ${pidof_app:-NOT RUNNING}. Log lines: $(wc -l < dist/android-log.txt)."
grep -m 3 "page finished" dist/android-log.txt | while read -r line; do note "$line"; done
grep -E "page (ERROR|WARNING)" dist/android-log.txt | head -6 | while read -r line; do echo "::warning title=Android page message::$line"; done

[ -n "$pidof_app" ] || fail "The app is not running: it crashed or closed."
grep -q "page finished: https://appassets.androidplatform.net/index.html" dist/android-log.txt || fail "The game's page never finished loading."
if grep -q "page ERROR" dist/android-log.txt; then fail "The page reported an error: $(grep -m 1 'page ERROR' dist/android-log.txt)"; fi
note "The app installed, started, loaded the game and reported no errors."
