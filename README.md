# AvoCook

[English](README.md) · [Français](docs/fr/README.md) · [Deutsch](docs/de/README.md) · [Español](docs/es/README.md) · [Italiano](docs/it/README.md) · [Dansk](docs/da/README.md)

AvoCook is a free, open-source app for iOS and Android. I’m building it alongside my studies to keep my recipes, plan meals and make everyday cooking a little easier.

[App Store](https://apps.apple.com/app/avocook/id6769012665) · [Google Play](https://play.google.com/store/apps/details?id=app.avocook.mobile) · [APK](https://github.com/Logarex/AvoCook/releases/latest)

## Using AvoCook

### Recipes in one place

Write your recipes, add photos and categories, and adjust quantities to the number of servings. Ingredients and steps support optional Markdown. Paste a recipe link or share it from your browser to import it, then check the result before saving. You can print or share an individual recipe too.

### Keep track of your food

Organize your fridge, pantry and freezer with quantities and dates. Add food by barcode, view available Open Food Facts scores and enable expiry reminders.

Enter the date printed on the pack yourself. Barcode lookup uses the Internet; product information and scores may be missing. Stock and planning remain available offline.

### Plan today and the week

Add recipes, simple meals, leftovers or eating out. Adjust servings, move meals between days and choose ingredients for your shopping list. Save menus and find past meals in the history.

### Cook step by step

Follow recipes with timers that resume when you return. Supported devices offer local voice commands. Keep your cooking notes in a private journal and prepare several recipes together.

### Find ideas for everyday meals

Look for recipes using your ingredients, browse seasonal produce in 11 regional calendars, or use conversions and baking substitutions. Back up recipes and your private kitchen data together.

Seasonal calendars cover mainland France, Wallonia, Switzerland, Germany, Spain, Italy, the UK, Denmark, Ontario, New York State and Sydney. Coverage and the meaning of availability depend on the source.

### An optional fridge assistant

Enter ingredients or start from a fridge photo, check the list and request an editable recipe draft. Uses your own provider, API key and a compatible model; charges may apply.

### Your own illustrated cookbook

Choose recipes and a title to create a PDF book with a cover, contents, photos, ingredients and steps. Images from your local library and Nextcloud are included when available.

Private journal notes are not included in the book. Creating the PDF happens on the device; Nextcloud images may need to be downloaded.

### Shopping, alone or together

Use a local list, invite others to an AvoCook list with a six-character code, or connect a Nextcloud Pantry household list. Choose which ingredients to add from recipes and the meal plan. On iOS, Apple Reminders can sync with the active mode. Shared AvoCook lists support push notifications for additions and removals by other participants.

### Recipes from the community

Browse, rate and import recipes shared by other users. Recipes can be translated into your language; you can also read the original. A community profile lets you publish your own recipes. Loaded recipes and successful translations remain in the device cache.

### On phones and tablets

The five tabs are Recipes, My kitchen, Meal plan, Community and Shopping. Wide screens can use side navigation and split layouts; text size is taken into account. Supported iPhones use native Liquid Glass controls.

### Your data and connections

Recipes work locally without creating an account. Connect Nextcloud Cookbook if you want to sync recipes with your own server. Planning, stock and private notes stay on the device, separately for each recipe account; they are not synced by Cookbook. Export recipes alone or make a complete kitchen backup with available photos and private data.

Community and shared lists use Firebase, including an anonymous session at startup. Web imports, product lookup and the optional assistant contact their respective services. Voice recognition uses a compatible on-device engine, without a cloud fallback.

## Available languages

English · French · German · Spanish · Italian · Danish

## Guides

- [Kitchen guide](docs/GUIDE.md)
- [Your data and connections](PRIVACY.md)
- [Technical references](docs/LOCAL_KITCHEN.md) · [Nextcloud Pantry](docs/NEXTCLOUD_PANTRY.md) · [Seasonal catalog](docs/SEASONAL_CATALOG.md)

## Development setup

The project uses Expo SDK 57, React Native 0.86 and TypeScript. Node.js >=22.13 and <27 is required. Local iOS builds use Xcode 27 and Device Hub; the minimum supported iOS version is 16.4.

Local Android builds require JDK 17 and Android SDK 36. Set `JAVA_HOME` to your JDK 17 installation if your system still defaults to an older Java version.

```bash
npm ci
npm run ios      # iOS simulator
npm run android  # Android emulator
```

After native dependency changes, run `npx expo prebuild --clean` and rebuild. On-device voice commands and stock reminders require the local native modules; Expo Go is insufficient.

A development build with native modules is compiled on the first run. After that, the app opens directly.

The `ios/` and `android/` projects are generated from `app.json`, `tools/plugins/` and `src/modules/`. After a native dependency or SDK upgrade, run `npx expo prebuild --clean` before building again. iOS builds React Native from source because the prebuilt 0.86.3 framework is missing a symbol required by Gesture Handler in Debug builds. The first build takes longer.

### Liquid Glass

On iOS 26+, buttons use native SwiftUI controls through [`@expo/ui`](https://docs.expo.dev/versions/v57.0.0/sdk/ui/swift-ui/). SwiftUI also provides sheets, menus and segmented controls. The native UIKit tab bar stays mounted when changing pages so its selection can move between tabs. Search fields use [`expo-glass-effect`](https://docs.expo.dev/versions/v57.0.0/sdk/glass-effect/).

Older iOS versions use blur. Android and Reduce Transparency use opaque backgrounds. Keep recipe content and forms on `GlassPanel`. Rebuild the app after adding a native module.

Useful commands:

```bash
npm run typecheck          # TypeScript checks
npm test                   # Unit tests (Vitest)
npm run lint               # ESLint
npm run import:check -- <recipe-url>  # Test a recipe import from a URL
```

---

## Project structure

```
src/
├── App.tsx                        # Entry point, navigation setup
├── screens/                       # Application screens (list, detail, editor, settings…)
├── components/                    # Reusable UI components
├── features/
│   ├── kitchen/                   # My kitchen — everyday meals, locally
│   ├── community/                 # Firebase
│   ├── recipes/                   # Local storage (SQLite), recipe logic, backup/restore
│   ├── nextcloud/                 # HTTP client for Nextcloud Cookbook
│   ├── import/                    # URL and photo recipe import
│   ├── shopping/                  # Shopping list and iOS Reminders sync
│   ├── timers/                    # Cooking timers
│   ├── preferences/               # App settings
│   └── auth/                      # Nextcloud authentication
├── i18n/                          # Internationalisation (i18next, 6 languages)
├── modules/
│   ├── avocook-native-controls/     # Native iOS tab bar
│   └── avocook-timer-notifications/  # Native timer notifications
└── theme/                         # Colors, typography, shared styles
tools/                             # Build plugins and import checker
docs/                              # Documentation in other languages (fr, de, es, it, da)
```

---

## Nextcloud Cookbook

To test the sync:

1. Install the [Cookbook app](https://apps.nextcloud.com/apps/cookbook) on a Nextcloud instance.
2. Create an **app password** in the security settings (Settings → Security → Devices & sessions).
3. In AvoCook, go to Settings and enter your server URL, username, and that password.

HTTPS is used by default when no protocol is entered. For a Nextcloud server on your trusted local network, enter an explicit HTTP address, such as `http://192.168.1.50:8080/nextcloud` or `http://nextcloud.local`. HTTP sends your app password and recipes without encryption; use it only on a trusted network. Credentials remain encrypted in the device keychain.

---

## Android

APKs are published in the [GitHub releases](https://github.com/Logarex/AvoCook/releases). Download `avocook.apk` and install it directly.

---

## Contributing

Pull requests are welcome. See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for the guidelines and the PR template.

---

## Support the project ☕

If you find AvoCook useful, you can help cover the costs:

**[→ Donate via Revolut](https://revolut.me/logarex)** · **[→ Donate via PayPal](https://paypal.me/logarex31)**

---

## Licence

This project is licenced under the [GPLv3](LICENSE) licence.
