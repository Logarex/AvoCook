# Privacy and data

Updated: 19 October 2026. AvoCook has no advertising or analytics tools. Some features use network services as described below.

## My kitchen, voice and local reminders

Meal plans, stock, dates, personal ratings, notes, dietary labels, menus and cooking history are stored locally, separately for each recipe account. These private notes are excluded from community publishing and PDF cookbooks. The complete My kitchen backup includes this information and recipes; the usual recipe backup does not include My kitchen data.

Optional cooking commands request microphone and speech permissions. Recognition runs only on a supported on-device recognizer; there is no network fallback. Audio and transcripts are not saved by AvoCook. Listening stops when the cooking screen closes or the app enters the background.

Optional stock reminders are scheduled on the device. Product names may appear on the lock screen according to system settings. Generated ingredients use your selected shopping mode, including any sharing or Apple Reminders sync you enabled.

## Recipes, Nextcloud and backups

Local recipes and photos are stored on your device. They are sent elsewhere when you choose to sync, share, export or publish them. With Nextcloud Cookbook or Pantry, data is exchanged directly with your selected server. Pantry caches and migration progress are stored separately for each Nextcloud account; signing out does not automatically copy Pantry items into the local shopping list.

Nextcloud credentials and AI API keys are kept in the operating system's secure storage through Expo SecureStore. Recipes, photos and ordinary preferences use SQLite, files or app storage. iOS can retain secure storage after reinstalling; device backups may also restore data. Export a recipe backup before uninstalling.

HTTPS is the default. An explicitly configured HTTP server sends credentials, recipes and images without transport encryption. The app warns about HTTP when connecting. Recipe exports may contain photos and personal information: choose where you share them.

## Firebase community and shared shopping lists

AvoCook starts an anonymous Firebase authentication session at launch, including in local mode. Firebase receives the anonymous identifier and the network information needed to handle the connection. No email address or password is required for this session.

Community recipes, author names, profiles, ratings, reports and shared shopping lists use Firebase. Published recipes are visible to other users. People with a shopping list's sharing code can join that list. Avoid including private information in published content. Firebase's server access rules and retention settings are managed separately from this app; local storage or signing out does not delete remote content.

## Recipe import, AI and translation

URL import downloads the selected page directly from its website. That site receives normal network request information.

Optional AI scanning and generation send the selected photo or entered text to the API provider configured in Settings, using your API key. Camera and photo access also let you add recipe images locally. Images in recipes you sync, share or publish may leave the device.

Automatic community translation sends recipe text to Google Translate, with MyMemory as a fallback. It does not use your configured AI API key. Previously loaded community recipes and successful translations are cached on the device for offline reading. These providers process requests under their own terms and privacy policies.

The optional fridge assistant sends a photo only when you choose Analyze, then sends the confirmed ingredient text and visible constraints only when you choose Generate. The photo is not attached to the recipe or saved in My kitchen data. Saving the editable recipe draft is a separate action and follows your normal storage and sync settings. Your configured provider may charge for these requests.

## Apple Reminders, updates and diagnostics

If enabled, shopping sync reads and writes Apple Reminders. Apple may sync those items through your account, including shared iCloud lists, according to your settings.

Sideloaded Android installations check GitHub for releases. Store installations use their app store for updates. Opening a source, support or provider link contacts that destination.

Diagnostic logs are stored locally. Secrets are masked, but a report may still contain personal details. Review reports before copying or sharing them; they are not sent automatically.

## Contact

For questions, use [the GitHub repository](https://github.com/Logarex/AvoCook) or the contact button in the app.
