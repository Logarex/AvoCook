# Privacy Policy

AvoCook does not collect any data and includes no ads or analytics of any kind.

## Local mode

In local mode — the default — recipes, images, and settings are stored only on your device using SQLite and the local file system. Nothing is sent anywhere.

## Nextcloud sync (optional)

If you choose to connect a Nextcloud server, recipes are synchronised directly between the app and that server. No third-party service is involved.

Your credentials (server URL, username, and app password) are stored on the device using Expo SecureStore, which relies on the system's secure enclave (Keychain on iOS, Keystore on Android).

## Recipe import from a URL

When you import a recipe by entering a URL, the app downloads that page to read the publicly available recipe data. No other data is sent, and the request is made directly from your device.

## Camera and photo library

Camera and photo library access is used only to add images to recipes or to scan a recipe from a photo. Images are stored locally.

## AI recipe generation (optional)

If you configure an AI API key in the settings, that key is stored locally in SecureStore. Photo data is sent to the API provider you configured. This feature is fully opt-in and requires you to supply your own key.

## iOS Reminders (optional)

If you choose to export a shopping list to iOS Reminders, the app writes data to your local Reminders database. This requires the Reminders permission. No data leaves your device through this feature.

## Contact

For questions or issues, open a thread on the [GitHub repository](https://github.com/Logarex/AvoCook).
