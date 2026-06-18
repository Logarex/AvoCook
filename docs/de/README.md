# AvoCook

AvoCook ist eine mobile Rezept-App, die ich für den persönlichen Gebrauch und zum Erlernen der Ausführung eines kompletten React Native-Projekts von Anfang bis Ende entwickle.

Die Idee ist einfach: Behalte deine Rezepte an einem Ort, nutze sie offline und synchronisiere sie mit dem Nextcloud Cookbook, falls du bereits einen Server hast.

[App Store](https://apps.apple.com/app/avocook/id6769012665) · [Android APK](https://github.com/Logarex/AvoCook/releases/latest) · [![APK-Downloads](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/Logarex/AvoCook/badges/apk-downloads.json&logo=android)](https://github.com/Logarex/AvoCook/releases)

<p align="center">
  <img src="../../assets/screenshots/login.png" width="280" alt="AvoCook Login" />
  <img src="../../assets/screenshots/recipe.png" width="280" alt="Rezeptdetails" />
</p>

## Was die App kann

- Rezepte lokal erstellen und bearbeiten;
- Rezepte nach Kategorie organisieren;
- Fotos hinzufügen;
- ein Rezept über eine URL importieren, wenn die Website `schema.org/Recipe`-Daten bereitstellt;
- Mengen basierend auf der Anzahl der Portionen anpassen;
- Koch-Timer starten;
- ein Rezept als PDF exportieren oder ausdrucken;
- Rezepte in einer JSON-Datei sichern / wiederherstellen;
- mit Nextcloud Cookbook synchronisieren, falls vom Benutzer gewünscht;
- mit der iOS-Erinnerungs-App synchronisieren, um die Freigabefunktionen von Apple zu nutzen.

Für den lokalen Modus ist kein Konto erforderlich. Die Daten bleiben auf dem Gerät.

## Entwicklungs-Setup

Das Projekt verwendet Expo, React Native und TypeScript.

```bash
npm install
npm run start
```

Öffne die App dann mit Expo Go oder einem Entwicklungs-Build.

Nützliche Befehle:

```bash
npm run typecheck
npm test
npm run lint
npm run import:check -- <rezept-url>
```

## Nextcloud Cookbook

So testest du die Synchronisierung:

1. Installiere die Cookbook-App auf einer Nextcloud-Instanz.
2. Erstelle in den Sicherheitseinstellungen ein App-Passwort.
3. Gib die Server-URL, den Benutzernamen und dieses Passwort in AvoCook ein.

Die App lehnt Remote-Server über HTTP ab. HTTP wird während der Entwicklung für `localhost` akzeptiert.

## Android

APKs werden in den GitHub-Releases veröffentlicht. Die Hauptdatei für die Installation ist `avocook.apk`.

## Projektstruktur

- `src/screens`: Anwendungsbildschirme;
- `src/components`: wiederverwendbare Komponenten;
- `src/features/recipes`: lokaler Speicher, Synchronisierung und Rezeptlogik;
- `src/features/nextcloud`: HTTP-Client für Cookbook;
- `src/features/import`: Rezept-Import von Webseiten;
- `src/modules/avocook-timer-notifications`: kleines natives Modul für Timer-Benachrichtigungen.

## Das Projekt unterstützen ☕

Wenn dir AvoCook gefällt und du mir helfen möchtest, die Kosten zu decken, kannst du eine Spende machen:

- [Spenden via Revolut](https://revolut.me/logarex)
- [Spenden via PayPal](https://paypal.me/logarex31)

## Lizenz

Dieses Projekt ist unter der [GPLv3](../../LICENSE)-Lizenz lizenziert.
