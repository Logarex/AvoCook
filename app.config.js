// FCM's Android app configuration is supplied by the release environment.
// The file must belong to app.avocook.mobile in Firebase project avocook-5eb31.
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    shoppingPushRelayUrl: process.env.EXPO_PUBLIC_SHOPPING_PUSH_RELAY_URL?.includes("VOTRE-ADRESSE-REELLE")
      ? config.extra?.shoppingPushRelayUrl
      : process.env.EXPO_PUBLIC_SHOPPING_PUSH_RELAY_URL?.trim() || config.extra?.shoppingPushRelayUrl,
  },
  android: {
    ...config.android,
    ...(process.env.GOOGLE_SERVICES_JSON ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON } : {}),
  },
});
