# AvoCook

[English](README.md) · [Français](docs/fr/README.md) · [Deutsch](docs/de/README.md) · [Español](docs/es/README.md) · [Italiano](docs/it/README.md) · [Dansk](docs/da/README.md)

AvoCook is a free, open-source kitchen companion for iOS and Android, with or without a recipe. Keep recipes, plan everyday meals, use food you already have and prepare your shopping. The local tools work offline without creating an account; community, shared lists, imports, optional AI and Nextcloud connections use online services.

I built it for personal use while learning to ship a complete React Native project from start to finish.

[App Store](https://apps.apple.com/app/avocook/id6769012665) ·
[Google Play](https://play.google.com/store/apps/details?id=app.avocook.mobile) · [Android APK](https://github.com/Logarex/AvoCook/releases/latest) ·
[![APK downloads](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/Logarex/AvoCook/badges/apk-downloads.json&logo=android)](https://github.com/Logarex/AvoCook/releases)

<div align="center">
  <img src="assets/screenshots/en/login.png" width="280" alt="AvoCook login" />
  <img src="assets/screenshots/en/recipe.png" width="280" alt="Recipe detail" />
</div>

> This README describes the current source branch. Store and GitHub releases may not yet include its latest changes.

---

## What’s new in 5.0.0

Five tabs: Recipes, My kitchen, Meal plan, Community and Shopping. My kitchen brings together supplies and meal ideas; Meal plan opens on Today and also covers the week.

- **Your food, neatly organized** — Fridge, pantry and freezer, with search, quantities and dates. Scan a barcode or enter food manually. Nutri-Score and Green-Score from Open Food Facts when available; optional local reminders.
- **A dedicated meal plan** — Organize Today and the week: recipes, simple meals, leftovers or eating out. Adjust servings, move meals and prepare groceries. Reusable menus and batch preparation remain available.
- **Cook and keep your routines** — Follow steps with timers and supported local voice commands. Keep notes, preparations and usual meals in your private journal and history. Timers are restored without duplicate alerts.
- **Tools for everyday cooking** — Sourced seasonal calendars for 11 countries with regional limits, conversions and context-specific substitutions. Create a PDF cookbook and back up recipes together with private My kitchen data.
- **An idea from your ingredients** — Enter ingredients or analyze a photo, correct the list, then generate an editable draft. Optional AI uses your provider, API key and a compatible model; charges may apply.
- **A lighter interface** — Compact recipe and shopping actions, food grouped by storage location and details on demand. Smaller category chips and layouts adapted to screen and text size.

Enter the date printed on the pack yourself. Product records and scores may be missing and do not constitute a complete product analysis. Product lookup needs Internet; supplies and planning stay local. Notifications depend on device permissions.

## Features

### Community Platform

- Discover, rate, and import recipes from the AvoCook community;
- Community recipes automatically appear in your app language, in both the list and the recipe details;
- View the original recipe at any time, or import the translated version into your recipe book;
- Share your best meals by setting up a community profile;
- Community reporting and spam checks are included; published content is contributed by users.
- Choose a separate community translation language, including Chinese, Portuguese, Dutch, Japanese, Korean, Arabic and Russian. Loaded recipes and successful translations are cached for offline reading.

### Recipes

- Create and edit recipes locally, no account required;
- Organise recipes by category;
- Adjust ingredient quantities to the number of servings;
- Add one or more photos per recipe;
- Export a recipe as PDF or print it directly;
- Share a recipe with another app (share sheet).

### My kitchen — everyday meals, locally

Five tabs: Recipes, My kitchen, Meal plan, Community and Shopping. My kitchen brings together supplies and meal ideas; Meal plan opens on Today and also covers the week.

- **Plan your week** — Add lunch and dinner, drag recipes between days and adjust servings. Preview grouped ingredients before adding them to shopping.
- **Meals without a recipe** — Note a quick meal, reuse a usual meal or plan leftovers and eating out. Only meals with ingredients contribute to shopping.
- **Use what you have** — Save fridge, cupboard and freezer stock with dates. Find recipes with fewer missing ingredients and review what to buy. Optional local date reminders.
- **Seasonal fruit and vegetables** — Choose an area and month, filter or search, then select produce for shopping or recipe ideas. Sourced offline calendars with explicit regional coverage.
- **Cook step by step** — One large-print step at a time, progress, ingredients and timers. Optional on-device voice commands where supported; alerts depend on permissions and device settings.
- **A recipe from your fridge (AI)** — Enter ingredients or analyze a photo, correct the recognized foods, then generate an editable draft. Optional: your API key and a suitable model; provider charges may apply.
- **A private cooking journal** — Ratings, notes, changes, preparation dates, difficulty and manually entered costs. Personal dietary labels and filters help organize your recipes; they do not certify allergy safety.
- **Batch cooking and menus** — Select 3–5 recipes, group groceries and review preparation tasks in duration order. Save celebration menus and schedule them; no automatic parallel cooking.
- **Your own cookbook** — Select up to 50 recipes for a local text PDF with contents, ingredients and steps. Private journal notes and photos are excluded.
- **Practical kitchen tools** — Pick a surprise recipe, convert compatible units and temperatures, or consult context-specific baking substitutions with ratios and precautions. No guessed grams-to-millilitres conversion.
- **Backups you control** — Export recipes to JSON, or use the complete My kitchen backup for recipes, available photos and private planning data. Review before restoring.

Available calendars: mainland France, Wallonia (Belgium), Switzerland, Germany, Spain, Italy, the UK, Denmark, Ontario (Canada), New York State (USA) and Sydney (Australia). These are 11 countries with regional limits, not worldwide coverage. Sources distinguish harvest, storage or market availability; they are guides rather than live availability forecasts.

Ingredient matching does not check available quantities, freshness or allergens. Dietary labels are user-entered. Substitutions are limited to supported preparation contexts. Voice commands and notifications depend on the device and permissions.

[Behavior and limits](docs/LOCAL_KITCHEN.md) · [Seasonal catalog sources](docs/SEASONAL_CATALOG.md)

Filter meal ideas by known duration (≤30 minutes), personal rating (≥4/5), easy difficulty and personal dietary labels. History records meals confirmed as eaten or preparations recorded in the journal or cooking mode.

### Optional Markdown

All recipe text fields accept Markdown, in every language: name, description, category, keywords, source name, ingredients, instructions, tools and nutrition values. Plain text remains the default; no Markdown knowledge is needed.

Use `**bold**`, `*italic*`, headings, lists, quotes, code, tables or `[a link](https://example.com)`. Formatting appears when reading recipes and when exporting a PDF or printing. Images written in Markdown appear as links. Numbers (servings and durations) and URL fields retain their usual format.

Each ingredient and instruction keeps its own Markdown, including paragraphs and nested lists. Pasting a simple list of plain text lines still creates separate items; pasting block Markdown keeps the block together.

### Import

- Import from supported pages exposing accessible `schema.org/Recipe` data; some websites block extraction or provide incomplete data.
- Receive a URL shared from a browser or another app to import a recipe in one tap;
- Optional AI: scan a recipe, generate from text or a dish photo, or create a fridge draft. Choose OpenAI, Gemini, Groq, Grok, Mistral, Claude or a custom endpoint in Assistant settings. Your own API key and a compatible model are required; photo analysis needs vision support and provider charges may apply.

### Shopping list

- Choose local shopping, AvoCook live sharing or Nextcloud Pantry, with item carry-over when switching. Optional iOS Reminders sync works with all three modes. [Nextcloud Pantry](docs/NEXTCLOUD_PANTRY.md).
- Share grocery lists using a 6-character code, with a participant count and local change alerts while AvoCook is running;
- Copy ingredients to the clipboard with a tap;
- Export a shopping list to iOS Reminders to take advantage of Apple's sharing and Siri integration.

### Timers

- Start one or several cooking timers directly from a recipe;
- Local timer alerts can run in the background when notification permissions and system settings allow it; verify delivery on your device.

### Data & sync

- Back up all recipes to a JSON file and restore them;
- **Optional**: connect a Nextcloud Cookbook server to sync recipes across devices. All data goes directly between the app and your server — nothing passes through a third-party service.

> Local recipes stay on your device unless you sync, share or export them. Community features use Firebase, including an anonymous session at startup. See [Privacy and data](PRIVACY.md).

---

## Available languages

French · English · German · Spanish · Italian · Danish

---

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
