# Release

Short checklist to avoid oversights before publishing a version.

## Before building

- Update the version in `app.json`.
- Check that icons and splash screen are correct.
- Re-read `PRIVACY.md` if a network or storage feature has changed.
- Test local mode without an account.
- Test a Nextcloud connection with an app password.
- Test recipe import from at least Marmiton, 750g, or BBC Good Food.
- Test creating, editing, and deleting a recipe in airplane mode.
- Test timers on a real device.
- Check light/dark mode and at least French/English.

## Local checks

```bash
npm run typecheck
npm test
npm run lint
```

For a precise import check:

```bash
npm run import:check -- <url>
```

## EAS builds

```bash
npx eas build --platform ios --profile preview
npx eas build --platform android --profile preview
npx eas build --platform all --profile production
```

## iOS

The app is configured for iPhone and iPad. It does not use remote push
notifications, location services, or Bluetooth.

The local network permission is used only for Nextcloud servers on the same
network, or for the Expo client during development.

## Android

The main Android configuration is in `app.json`.

For details on the GitHub APK, IzzyOnDroid, and F-Droid, see
[`ANDROID_DISTRIBUTION.md`](ANDROID_DISTRIBUTION.md).

## Submission

```bash
npx eas submit --platform ios
npx eas submit --platform android
```

AvoCook is an independent client compatible with Nextcloud Cookbook. It must not
be presented as an official Nextcloud application.
