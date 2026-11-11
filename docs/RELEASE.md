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

Since 5.1, also check: putting checked groceries away and the stock review after cooking; My kitchen sync between two devices on the same Nextcloud account (including an edit made offline on each); an automatic backup version and its restoration; on iPhone, a cooking timer as a Live Activity on the Lock Screen and in the Dynamic Island (start, pause, reset, finish), the Today widget after planning a meal, the four Siri / Shortcuts actions from a cold start, and opening a recipe from Spotlight; community report while offline, blocking and unblocking an author, and Delete my community data.

## Native targets and App Store Connect

5.1 adds the `AvoCookWidgets` WidgetKit extension (`targets/widgets`, bundle `org.epimac.avocook.widgets`, same App Group as the app) through `@bacons/apple-targets`, and App Intents compiled into the app by `tools/plugins/withAppIntents.js`. Run `npx expo prebuild --clean` after native changes. EAS must create a provisioning profile for the new extension the first time; let EAS manage credentials or create the identifier with the App Group in the Apple Developer portal.

The iOS privacy manifest (`ios.privacyManifests` in app.json) now declares the community data: anonymous user ID, recipes and ratings (other user content), recipe photos and product interaction (reports and votes), all for app functionality, not linked to identity and not used for tracking. Keep the App Store Connect privacy answers consistent with it. Server-side moderation is described in [Community moderation](COMMUNITY_MODERATION.md).

## Build and submit

Rebuild native apps after native dependency or permission changes. Store texts are prepared separately from binaries. Follow the store guide for metadata upload; review the destination and version before sending.

```sh
npm run store:prepare
npx eas build --platform all --profile production
```

[Store / Fastlane](../store/README.md) · [Privacy](../PRIVACY.md) · [Notifications](../docs/NOTIFICATIONS.md)
