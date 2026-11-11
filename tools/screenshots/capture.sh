#!/usr/bin/env bash
# Usage: capture.sh <ios-udid|android> <lang> <outdir> [screen...]
# Needs: the screenshot build installed, `python3 -m http.server 8765` serving .out/,
# and on Android `adb reverse tcp:8765 tcp:8765`.
set -euo pipefail
TARGET=$1 LANG_CODE=$2 OUT=$3; shift 3
ADB=${ADB:-$HOME/Library/Android/sdk/platform-tools/adb}
IOS_BUNDLE=org.epimac.avocook
ANDROID_PKG=app.avocook.mobile
SCREENS=("$@")
[ ${#SCREENS[@]} -eq 0 ] && SCREENS=(recipe_list recipe today planning cooking stock shopping seasonal)
mkdir -p "$OUT"
within() { local t=$1; shift; perl -e 'alarm shift; exec @ARGV' "$t" "$@"; }

locale_for() { case $1 in fr) echo fr_FR;; en) echo en_US;; de) echo de_DE;; es) echo es_ES;; it) echo it_IT;; da) echo da_DK;; esac; }
url_for() {
  case $1 in
    recipe_list) echo "avocook://shot/Recipes" ;;
    recipe) echo "avocook://shot/RecipeDetail?recipe=pumpkin_soup" ;;
    cooking) echo "avocook://shot/Cooking?recipe=ratatouille" ;;
    planning) echo "avocook://shot/Planning?section=planner" ;;
    today) echo "avocook://shot/Planning?section=today" ;;
    stock) echo "avocook://shot/Kitchen?section=stock" ;;
    shopping) echo "avocook://shot/ShoppingList" ;;
    community) echo "avocook://shot/Community" ;;
    import) echo "avocook://shot/ImportRecipe" ;;
    seasonal) echo "avocook://shot/Kitchen?section=seasonal" ;;
    *) echo "unknown screen $1" >&2; exit 1 ;;
  esac
}

if [ "$TARGET" = android ]; then
  launch() { within 20 $ADB shell am start -n $ANDROID_PKG/.MainActivity >/dev/null 2>&1 || true; }
  open_url() { $ADB shell am start -a android.intent.action.VIEW -d "'$1'" $ANDROID_PKG >/dev/null; }
  shot() { $ADB exec-out screencap -p > "$1"; }
  reset_app() {
    $ADB shell am force-stop $ANDROID_PKG
    $ADB shell pm clear $ANDROID_PKG >/dev/null
    $ADB shell cmd locale set-app-locales $ANDROID_PKG --locales "$(locale_for $LANG_CODE | tr _ -)"
    $ADB shell pm grant $ANDROID_PKG android.permission.POST_NOTIFICATIONS || true
  }
  stop_app() { $ADB shell am force-stop $ANDROID_PKG; }
else
  UDID=$TARGET
  L=$(locale_for $LANG_CODE)
  launch() { xcrun simctl launch "$UDID" $IOS_BUNDLE -AppleLanguages "($LANG_CODE)" -AppleLocale "$L" >/dev/null; }
  open_url() { echo "$(date +%s%N)-$RANDOM $1" > "$(dirname "$0")/.out/nav.txt"; }
  shot() { xcrun simctl io "$UDID" screenshot --type=png ${DISPLAY_ID:+--display=$DISPLAY_ID} "$1" >/dev/null 2>&1; }
  reset_app() {
    within 10 xcrun simctl terminate "$UDID" $IOS_BUNDLE 2>/dev/null || true
    local data; data=$(xcrun simctl get_app_container "$UDID" $IOS_BUNDLE data)
    rm -rf "$data/Documents/"* "$data/Library/Application Support/"* "$data/Library/Preferences/"*.plist "$data/Library/Caches/"* 2>/dev/null || true
    xcrun simctl keychain "$UDID" reset 2>/dev/null || true
    xcrun simctl privacy "$UDID" grant notifications $IOS_BUNDLE 2>/dev/null || true
  }
  stop_app() { within 10 xcrun simctl terminate "$UDID" $IOS_BUNDLE 2>/dev/null || true; }
fi

if [ "${SKIP_SEED:-0}" != 1 ]; then
  reset_app
  launch
  sleep "${SEED_WAIT:-35}"
  stop_app
  sleep 2
fi
launch
sleep "${LAUNCH_WAIT:-12}"
for screen in "${SCREENS[@]}"; do
  open_url "$(url_for "$screen")"
  sleep "${SCREEN_WAIT:-4}"
  shot "$OUT/$screen.png"
  echo "$OUT/$screen.png"
done
