# Release checklist

A checklist to run through before publishing a new version. Go through each step in order.

---

## 1 — Prepare

- [ ] Update the version number in [`app.json`](../app.json) and [`package.json`](../package.json).
- [ ] Update the build number (`buildNumber`) in `app.json` for iOS if required.
- [ ] Re-read [`PRIVACY.md`](../PRIVACY.md) and check whether any new network or storage feature needs to be documented.
- [ ] Verify that icons and splash screen assets are correct and render well in both light and dark mode.

---

## 2 — Local checks

```bash
npm run typecheck   # No TypeScript errors
npm test            # All tests pass
npm run lint        # No lint warnings
```

Test a specific URL import:

```bash
npm run import:check -- <url>
```

Try at least Marmiton, 750g, or BBC Good Food.

---

## 3 — Manual tests

Run these on a real device, not just a simulator.

**Local mode (no account)**
- [ ] Create a recipe from scratch.
- [ ] Edit it, add a photo, adjust the number of servings.
- [ ] Delete it.
- [ ] Do the three steps above with the device in airplane mode.

**Import**
- [ ] Import a recipe from a URL (at least one French site + one English site).
- [ ] Share a URL from a browser to AvoCook.
- [ ] Scan or generate a recipe from a photo if the API key is configured.

**Nextcloud sync**
- [ ] Connect to a Nextcloud instance using an app password.
- [ ] Create a recipe in AvoCook and verify it appears in Nextcloud Cookbook.
- [ ] Edit a recipe in Nextcloud Cookbook and verify the sync in AvoCook.

**Timers**
- [ ] Start a timer and put the app in the background — the notification must fire on time.
- [ ] Start multiple timers simultaneously.

**Shopping list**
- [ ] Copy ingredients to the clipboard.
- [ ] Export a shopping list to iOS Reminders (iOS only).

**Backup**
- [ ] Export a backup to a JSON file.
- [ ] Import it back and verify the recipes are restored correctly.

**Interface**
- [ ] Check light mode and dark mode.
- [ ] Check at least French and English; spot-check German, Spanish, and Italian.
- [ ] Check on both iPhone and iPad (or a small Android + a tablet).

---

## 4 — EAS builds

```bash
# Preview (for internal testing)
npx eas build --platform ios --profile preview
npx eas build --platform android --profile preview

# Production
npx eas build --platform all --profile production
```

---

## 5 — Platform notes

### iOS

- The app is configured for iPhone and iPad (`supportsTablet: true`).
- It does not use remote push notifications, location services, or Bluetooth.
- Local network permission is only used to connect to a Nextcloud server on the same network, or for the Expo client during development.

### Android

- The main Android configuration is in `app.json` (package, permissions, adaptive icon).
- The APK published to GitHub releases is `avocook.apk`.

---

## 6 — Submit

```bash
npx eas submit --platform ios
npx eas submit --platform android
```

> AvoCook is an independent client compatible with Nextcloud Cookbook. It must not be presented as an official Nextcloud application.
