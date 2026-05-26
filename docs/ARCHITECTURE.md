# Architecture

These notes are mainly meant to help quickly find where things live in the
project.

## Main folders

- `src/screens`: React Navigation screens.
- `src/components`: reusable UI components used across the app.
- `src/features/auth`: Nextcloud login and credential storage.
- `src/features/nextcloud`: HTTP calls to the Cookbook API.
- `src/features/recipes`: recipe model, SQLite, backup, sharing, and sync.
- `src/features/import`: reading recipes from web pages.
- `src/features/shopping`: shopping list.
- `src/features/timers`: timers and notifications.
- `modules/avocook-timer-notifications`: native Expo module for alarms.

## Local data

SQLite is the local source of truth. Local mode uses only this database.

In Nextcloud mode, recipes are also kept locally so they can be read offline.
Creates and edits are written locally before being sent to the server.

## Synchronisation

On startup the app loads SQLite. If a Nextcloud client is connected, it then
tries to push pending changes and fetch the current state from the Cookbook
server.

When a server operation fails, it stays in `sync_queue` to be retried later.

## Web import

Import starts by looking for a `schema.org/Recipe` JSON-LD block in the page.
If one is found, the app extracts the name, ingredients, steps, times, servings,
image, and some nutritional information.

When the local parser cannot read the page and a Nextcloud account is connected,
the app falls back to Cookbook's server-side import.
