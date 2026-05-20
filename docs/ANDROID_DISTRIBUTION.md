# Android Distribution

This document is a practical checklist for publishing AvoCook on GitHub Releases, IzzyOnDroid and F-Droid.

## Current recommendation

Use three tracks:

1. GitHub Releases as the direct APK download.
2. IzzyOnDroid as the easiest free Android store-like channel.
3. Official F-Droid later, once the source build story is clean.

Keep one obvious APK for users in GitHub Releases:

* `avocook.apk` for the universal APK.

If a lighter APK is required by IzzyOnDroid, add a second asset only for repository maintainers:

* `avocook-arm64-v8a.apk`

The README and in-app updater should continue to point users to `avocook.apk` so non-technical users do not have to choose an architecture.

## Before each Android release

1. Update `expo.version` in `app.json`.
2. Use a Git tag that matches the app version, for example `v2.0.1`.
3. Build a signed Android APK.
4. Create a GitHub Release from the tag.
5. Attach the APK as `avocook.apk`.
6. Make sure the release is public and not a draft.
7. Open the app from the previous version and check that the update banner appears.

The in-app update checker compares `app.json` / Expo version with the latest GitHub release tag. A build with version `2.0.0` will only show releases newer than `v2.0.0`.

## IzzyOnDroid submission

Go to:

https://gitlab.com/IzzyOnDroid/repo/-/issues

Search first for `AvoCook`. If no issue exists, create a new issue.

Use this issue title:

```text
Add AvoCook
```

Use this issue body:

```text
Name: AvoCook
Package name: app.avocook.mobile
Repository: https://github.com/Logarex/AvoCook
Releases: https://github.com/Logarex/AvoCook/releases
Latest APK: https://github.com/Logarex/AvoCook/releases/latest
License: MIT
Author: Logarex

Description:
AvoCook is a free and open source cookbook app for Android and iOS. It can be used completely offline, or synchronized with a self-hosted Nextcloud Cookbook instance.

Main features:
- Local offline cookbook
- Optional Nextcloud Cookbook sync
- Web recipe import from schema.org Recipe metadata
- Serving scaler
- Cooking timers with local notifications
- Recipe printing and PDF export
- Local JSON backup and restore

Privacy / dependencies:
- No ads
- No analytics
- No tracking
- No Google Play Services dependency
- No account required for local mode

Release notes:
The APK is attached to GitHub Releases as `avocook.apk`. The app uses semantic tags such as `v2.0.1`.

APK size note:
The current universal APK is around 97 MB because it is an Expo / React Native Android build. If this is too large for inclusion, I can provide an additional `arm64-v8a` APK asset for IzzyOnDroid while keeping `avocook.apk` as the simple universal download for users.
```

After creating the issue:

1. Watch for maintainer questions.
2. If they ask for a smaller APK, produce an `arm64-v8a` APK and attach it to the same GitHub Release.
3. If they ask about permissions, explain that the app uses local storage, local notifications, network access for Nextcloud/GitHub, and optional photo access for recipe images.
4. For future updates, keep publishing GitHub Releases with APK assets and increasing version tags.

## Official F-Droid request

Go to:

https://gitlab.com/fdroid/rfp/-/issues

Search first for `AvoCook`. If no issue exists, create a new Request For Packaging.

Use this issue title:

```text
AvoCook
```

Use this issue body:

```text
Name: AvoCook
Package name: app.avocook.mobile
License: MIT
Source code: https://github.com/Logarex/AvoCook
Issue tracker: https://github.com/Logarex/AvoCook/issues
Releases: https://github.com/Logarex/AvoCook/releases
Website: https://github.com/Logarex/AvoCook

Summary:
Cookbook app with local recipes and Nextcloud Cookbook sync.

Description:
AvoCook is a free and open source cookbook app for Android and iOS. It can be used completely offline without an account, or synchronized with a self-hosted Nextcloud Cookbook instance.

The app supports local recipes, categories, recipe photos, schema.org recipe import, serving scaling, cooking timers, PDF export, printing, local backup and optional Nextcloud Cookbook synchronization.

Notes for packaging:
- This is an Expo / React Native app.
- Android package id: app.avocook.mobile
- The app does not require Google Play Services.
- The app has no ads, no analytics and no tracking.
- GitHub releases are tagged with semantic versions such as `v2.0.1`.
- Store metadata is available in `fastlane/metadata/android/`.

Potential build command:
npm ci
npx expo prebuild --platform android --clean
cd android
./gradlew assembleRelease

Maintainer note:
I am the upstream maintainer and can adjust the repository if the F-Droid packaging process needs a dedicated Gradle configuration or a generated Android project committed to source.
```

Expect F-Droid to be slower than IzzyOnDroid. F-Droid builds apps from source and may ask for changes to the build process, generated Android project, dependencies, or reproducibility.

## Fastlane metadata

The repository includes Fastlane-compatible metadata at:

```text
fastlane/metadata/android/en-US/
fastlane/metadata/android/fr-FR/
```

F-Droid supports this structure from the source repository. Keep it updated when the public description changes.

If you know the Android versionCode of a release, you can add changelog files:

```text
fastlane/metadata/android/en-US/changelogs/<versionCode>.txt
fastlane/metadata/android/fr-FR/changelogs/<versionCode>.txt
```

The filename must be the numeric Android versionCode, not the version name.

## Reducing APK size

The current repository assets are small. The large APK size mostly comes from Expo / React Native native libraries and from producing a universal APK.

The public `v1.0.0` APK was checked on 2026-05-19:

```text
APK file size: 96 MB
Native libraries inside APK: 81 MB uncompressed
arm64-v8a: 20.2 MB
armeabi-v7a: 14.0 MB
x86: 21.5 MB
x86_64: 21.7 MB
```

This confirms that the APK is universal and ships native libraries for four CPU architectures.

Best options:

1. Universal APK: easiest for users, largest file.
2. ABI-specific APK: much smaller, but users may have to choose the right file.
3. Android App Bundle (`.aab`): best for Play Store, but not useful for GitHub direct download and requires the paid Play Console account.

For the public GitHub release, keep `avocook.apk`.

For IzzyOnDroid, only add an ABI-specific APK if they request it. Prefer `arm64-v8a`, because it covers modern Android phones.

To investigate the APK size:

```bash
unzip -l avocook.apk | sort -nr -k1 | head -40
```

Look especially for:

```text
lib/arm64-v8a/
lib/armeabi-v7a/
lib/x86/
lib/x86_64/
```

If all architectures are present, an `arm64-v8a` APK should be much smaller.

To produce ABI-specific APKs in Expo, the cleanest long-term path is:

1. Generate and commit the Android native project:
   `npx expo prebuild --platform android`
2. Configure Android Gradle ABI splits in `android/app/build.gradle`.
3. Build release APKs with Gradle or EAS using that native project.
4. Keep the universal APK as the default user-facing asset.

Do not do this casually: committing `android/` changes the project from a purely managed Expo project to a prebuild/native-managed project. It is fine, but it should be a deliberate release-engineering step.

## User-facing Android install text

Use this text in README or release notes:

```text
Android

Recommended: install AvoCook from IzzyOnDroid once it is available there. You will then receive updates through your F-Droid-compatible client.

Direct download: if you do not use IzzyOnDroid, download `avocook.apk` from the latest GitHub Release and open it on your phone. Android may ask you to allow installation from your browser or file manager.
```
