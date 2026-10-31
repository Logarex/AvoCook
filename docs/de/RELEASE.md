# Veröffentlichung vorbereiten

## Version vorbereiten

app.json, package.json, package-lock.json und store/release.json müssen übereinstimmen. iOS-Buildnummer und Android-Versionscode prüfen. Versionshinweise in allen sechs Sprachen aktualisieren; dauerhafte Beschreibungen stellen die App ohne Versionsankündigung vor.

## Automatische Prüfungen

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

## Auf Geräten prüfen

Lokale Rezepte offline, Webimporte, Nextcloud Cookbook samt Bildern, alle drei Einkaufsmodi, Apple Erinnerungen, Push an gesperrte Empfänger, Strichcodes, Ablauf-Erinnerungen, Sprachberechtigungen, Timer-Wiederherstellung, PDF-Fotos und Sicherungen testen. Kleine Bildschirme, Tablets, große Schrift und beide Designs prüfen.

## Erstellen und einreichen

Nach Änderungen nativer Abhängigkeiten oder Berechtigungen neu bauen. Store-Texte werden getrennt von Binärdateien vorbereitet. Die Store-Anleitung für Metadaten befolgen und Ziel sowie Version vor dem Senden prüfen.

```sh
npm run store:prepare
npx eas build --platform all --profile production
```

[Store / Fastlane](../../store/README.md) · [Privacy](PRIVACY.md) · [Notifications](../../docs/NOTIFICATIONS.md)
