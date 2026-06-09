# AvoCook

AvoCook is a mobile recipe app I'm building for personal use and to learn how to
run a complete React Native project end to end.

The idea is simple: keep your recipes in one place, use them offline, and sync
with Nextcloud Cookbook if you already have a server.

[App Store](https://apps.apple.com/app/avocook/id6769012665) ·
[Android APK](https://github.com/Logarex/AvoCook/releases/latest) ·
[![APK downloads](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/Logarex/AvoCook/main/.github/badges/apk-downloads.json&logo=android)](https://github.com/Logarex/AvoCook/releases)

<p align="center">
  <img src="assets/screenshots/login.png" width="280" alt="AvoCook login" />
  <img src="assets/screenshots/recipe.png" width="280" alt="Recipe detail" />
</p>

## What the app can do

- create and edit recipes locally;
- organise recipes by category;
- add photos;
- import a recipe from a URL when the site exposes `schema.org/Recipe` data;
- adjust quantities based on the number of servings;
- start cooking timers;
- export a recipe as PDF or print it;
- back up / restore recipes to a JSON file;
- sync with Nextcloud Cookbook, if the user wants to.

Local mode requires no account. Data stays on the device.

## Development setup

The project uses Expo, React Native and TypeScript.

```bash
npm install
npm run start
```

Then open the app with Expo Go or a development build.

Useful commands:

```bash
npm run typecheck
npm test
npm run lint
npm run import:check -- <recipe-url>
```

## Nextcloud Cookbook

To test synchronisation:

1. Install the Cookbook app on a Nextcloud instance.
2. Create an app password in the security settings.
3. Enter the server URL, username, and that password in AvoCook.

The app rejects remote servers over HTTP. HTTP is accepted for `localhost`
during development.

## Android

APKs are published in the GitHub releases. The main file to install is
`avocook.apk`.

Android release notes are in
[`docs/ANDROID_DISTRIBUTION.md`](docs/ANDROID_DISTRIBUTION.md).

## Project structure

- `src/screens`: application screens;
- `src/components`: reusable components;
- `src/features/recipes`: local storage, sync, and recipe logic;
- `src/features/nextcloud`: HTTP client for Cookbook;
- `src/features/import`: recipe import from web pages;
- `modules/avocook-timer-notifications`: small native module for timer
  notifications.

More detailed notes are in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Licence

This project is licenced under the [MIT](LICENSE) licence.
