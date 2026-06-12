# Veröffentlichung (Release)

Kurze Checkliste, um Versehen vor der Veröffentlichung einer Version zu vermeiden.

## Vor dem Build

- Aktualisiere die Version in `app.json`.
- Überprüfe, ob die Symbole und der Startbildschirm korrekt sind.
- Lies `PRIVACY.md` erneut, wenn sich eine Netzwerk- oder Speicherfunktion geändert hat.
- Teste den lokalen Modus ohne Konto.
- Teste eine Nextcloud-Verbindung mit einem App-Passwort.
- Teste den Rezeptimport von mindestens Marmiton, 750g oder BBC Good Food.
- Teste das Erstellen, Bearbeiten und Löschen eines Rezepts im Flugmodus.
- Teste die Timer auf einem echten Gerät.
- Überprüfe den Hell/Dunkel-Modus und mindestens Französisch/Englisch.

## Lokale Überprüfungen

```bash
npm run typecheck
npm test
npm run lint
```

Für eine genaue Importprüfung:

```bash
npm run import:check -- <url>
```

## EAS-Builds

```bash
npx eas build --platform ios --profile preview
npx eas build --platform android --profile preview
npx eas build --platform all --profile production
```

## iOS

Die App ist für iPhone und iPad konfiguriert. Sie verwendet keine Remote-Push-Benachrichtigungen, Ortungsdienste oder Bluetooth.

Die Berechtigung für das lokale Netzwerk wird nur für Nextcloud-Server im selben Netzwerk oder für den Expo-Client während der Entwicklung verwendet.

## Android

Die Android-Hauptkonfiguration befindet sich in `app.json`.

## Einreichung

```bash
npx eas submit --platform ios
npx eas submit --platform android
```

AvoCook ist ein unabhängiger Client, der mit Nextcloud Cookbook kompatibel ist. Es darf nicht als offizielle Nextcloud-Anwendung präsentiert werden.
