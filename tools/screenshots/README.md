# Store screenshots

Builds a demo kitchen (10 recipes with photos, planning, stock, shopping list) in every app language, captures the same 8 screens on each device and exports them for the App Store, Google Play, the README and the website.

Screens: `recipe_list`, `recipe`, `today`, `planning`, `cooking`, `stock`, `shopping`, `seasonal`.

| Target | Device | Size |
| --- | --- | --- |
| App Store iPhone 6.9" | iPhone 18 Pro Max (iOS 27.2) | 1320 × 2868 |
| App Store iPad 13" | iPad Pro 13-inch (M5) | 2064 × 2752 |
| App Store iPhone Duo | iPhone Duo, outer / inner display | 1398 × 2034 / 2007 × 2853 |
| Google Play phone | AVD 1080 × 1920, 420 dpi, no cutout | 1080 × 1920 |

## 1. Demo data

```sh
python3 tools/screenshots/build_seed.py          # writes tools/screenshots/.out/seed-<lang>.json
cd tools/screenshots/.out && python3 -m http.server 8765 --bind 127.0.0.1
```

Texts live in `content.py`; photos in `photos/` (Unsplash License, free to use without attribution).

## 2. Screenshot build

`EXPO_PUBLIC_SCREENSHOT_HOST` turns on `src/features/screenshots/ScreenshotHarness.tsx`. Without it the harness is not mounted. With it, the first launch switches to local mode and imports the demo kitchen; the capture script then opens each screen through `avocook://shot/...` links (Android) or `.out/nav.txt` (iOS, which asks before opening links from `simctl`). Never ship this build.

```sh
export EXPO_PUBLIC_SCREENSHOT_HOST=http://localhost:8765
# iOS simulator, signed to run locally (SecureStore needs keychain entitlements)
xcodebuild -workspace ios/AvoCook.xcworkspace -scheme AvoCook -configuration Release \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/avocook-shots \
  CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM= PROVISIONING_PROFILE_SPECIFIER=
# Android
(cd android && ./gradlew assembleRelease)
adb reverse tcp:8765 tcp:8765
```

Set a clean status bar first: `xcrun simctl status_bar <udid> override --time 9:41 …` on iOS, System UI demo mode on Android.

## 3. Capture and export

```sh
tools/screenshots/capture.sh <ios-udid|android> <lang> <raw-dir>/<device>/<lang> [screen…]
# iPhone Duo: DISPLAY_ID=1 for the outer display, DISPLAY_ID=3 for the inner one
python3 tools/screenshots/export.py <raw-dir>
```

`export.py` writes `store/screenshots/ios/<locale>/` and `store/screenshots/android/<locale>/phoneScreenshots/` (ignored by Git, upload them by hand or with Fastlane) and replaces `assets/screenshots/<lang>/` used by the README and the website.

Allow notifications once per simulator (open a recipe timer and accept the prompt), otherwise the recipe screen shows a "notifications disabled" hint.
