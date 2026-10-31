# Shopping notifications

Shared shopping lists use a Cloudflare Worker and D1 database to send notifications through Expo Push. Local lists and Nextcloud Pantry do not use the relay. Timers and expiry reminders run on the device.

The app saves changes to Firebase, then signals the relay. A scheduled recovery task checks for changes once a minute if the sender closes before signalling. Notifications contain item counts, not product names. D1 stores item IDs, list versions, device tokens and pending deliveries.

## Setup

From the repository root:

```sh
npm ci --prefix notification-relay
cd notification-relay
npx wrangler login
npx wrangler d1 create avocook-notifications
```

Set the database ID in `wrangler.toml`. For an existing deployment, reuse its database.

```sh
npx wrangler d1 execute avocook-notifications --remote --file schema.sql
npm test
npm run deploy
```

Configure `FIREBASE_PROJECT_ID` and `FIREBASE_WEB_API_KEY` for the Firebase project used by the app. Create a Google service account with the read-only `roles/datastore.viewer` role. Store its JSON key as a Worker secret:

```sh
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT < service-account.json
```

Keep this file out of Git and app builds. The service account reads changes for recovery; requests from phones are checked separately using Firebase ID tokens and Firestore permissions. The relay does not receive Nextcloud credentials.

Set `EXPO_PUBLIC_SHOPPING_PUSH_RELAY_URL` to the deployed Worker URL when building the app. `/health` reports whether configuration is present; it does not verify delivery.

Android builds need `GOOGLE_SERVICES_JSON` for package `app.avocook.mobile` and FCM v1 credentials in Expo/EAS. iOS builds need APNs credentials for `org.epimac.avocook`. Rebuild the native apps after changing push configuration. See the [Expo setup guide](https://docs.expo.dev/push-notifications/push-notifications-setup/).

## Delivery and limits

The deployment uses Firebase Spark, Workers Free, D1 Free and Expo Push. Quota exhaustion can interrupt delivery without preventing list updates. Check provider limits before deployment.

Pending messages expire after one hour. Receipts are checked after fifteen minutes, delivery records are removed after two days, and device registrations expire after 90 days without renewal. A list supports up to 100 registered devices. Recovery may combine several changes; delivery can be delayed or duplicated after a lost network response.

## Checks

Run `npm test --prefix notification-relay` from the repository root. On two devices sharing a list, check additions to an empty list, removals, a locked recipient, disabling notifications, and recovery after the sender closes. The sender should not receive its own notification.

Use `npx wrangler tail` from `notification-relay` to inspect relay errors. Logs must not contain device tokens, Firebase tokens or private keys. Test timers and expiry reminders separately, including Android reboot and notification permissions.
