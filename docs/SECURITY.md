# Security

Quick notes on current design decisions.

## Credentials

Nextcloud app passwords are stored with Expo SecureStore. They are never written
to SQLite.

Logs must never display the `Authorization` header.

## Network

Remote servers must use HTTPS. HTTP is accepted only for `localhost`,
`127.0.0.1`, and `::1` during development.

The app uses Basic Auth with the Nextcloud username and app password. It does
not manage a Nextcloud web session.

## Web import

Import only reads recipe metadata available in the page. It does not bypass
paywalls or attempt to emulate a full browser.

## Local storage

SQLite stores recipes in plain text within the application's storage. This is
acceptable for the current scope of the project, but it is not an encrypted
vault.

For more sensitive use cases, native database encryption or tighter restrictions
on the local copy of synced recipes would be needed.
