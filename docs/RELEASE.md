# Release checklist

## Prepare the version

Keep app.json, package.json, package-lock.json and store/release.json aligned. Check the iOS build number and Android version code. Update the in-app release notes in all six languages; permanent descriptions should describe the app without a release announcement.

## Automated checks

```sh
npm ci
npm ci --prefix notification-relay
npm run typecheck
npm run lint -- --max-warnings=0
npm test
npm test --prefix notification-relay
npm run store:check
node tools/scripts/build-site.mjs
npx expo export --platform ios --platform android --output-dir dist/app
```

## Device checks

Test local recipes offline, URL imports, Nextcloud Cookbook sync and images, all three shopping modes, Apple Reminders, shared-list push with a locked recipient, barcode entry, expiry reminders, voice permissions, timer restoration, PDF photos and backup restoration. Check small screens, tablets, large text and both themes.

## Build and submit

Rebuild native apps after native dependency or permission changes. Store texts are prepared separately from binaries. Follow the store guide for metadata upload; review the destination and version before sending.

```sh
npm run store:prepare
npx eas build --platform all --profile production
```

[Store / Fastlane](../store/README.md) · [Privacy](../PRIVACY.md) · [Notifications](../docs/NOTIFICATIONS.md)
