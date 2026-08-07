# Release-Checkliste

Eine Checkliste, die vor der Veröffentlichung einer neuen Version abgearbeitet werden sollte. Gehe jeden Schritt der Reihe nach durch.

---

## 1 — Vorbereiten

- [ ] Versionsnummer in [`app.json`](../../app.json) und [`package.json`](../../package.json) aktualisieren.
- [ ] Build-Nummer (`buildNumber`) in `app.json` für iOS aktualisieren, falls erforderlich.
- [ ] [`PRIVACY.md`](../../PRIVACY.md) erneut lesen und prüfen, ob eine neue Netzwerk- oder Speicherfunktion dokumentiert werden muss.
- [ ] Überprüfen, ob Icons und Splash-Screen-Assets korrekt sind und sowohl im hellen als auch im dunklen Modus gut aussehen.

---

## 2 — Lokale Prüfungen

```bash
npm run typecheck   # Keine TypeScript-Fehler
npm test            # Alle Tests bestehen
npm run lint        # Keine ESLint-Warnungen
```

Einen bestimmten URL-Import testen:

```bash
npm run import:check -- <url>
```

Mindestens Marmiton, 750g oder BBC Good Food ausprobieren.

---

## 3 — Manuelle Tests

Auf einem echten Gerät durchführen, nicht nur auf einem Simulator.

**Lokaler Modus (ohne Konto)**
- [ ] Ein Rezept von Grund auf erstellen.
- [ ] Es bearbeiten, ein Foto hinzufügen, die Portionenanzahl anpassen.
- [ ] Es löschen.
- [ ] Diese drei Schritte mit dem Gerät im Flugzeugmodus wiederholen.

**Import**
- [ ] Ein Rezept von einer URL importieren (mindestens eine französische + eine englische Seite).
- [ ] Eine URL aus einem Browser an AvoCook weitergeben.
- [ ] Ein Rezept aus einem Foto scannen oder generieren, wenn ein API-Schlüssel konfiguriert ist.

**Nextcloud-Synchronisierung**
- [ ] Mit einer Nextcloud-Instanz über ein App-Passwort verbinden.
- [ ] Ein Rezept in AvoCook erstellen und prüfen, ob es in Nextcloud Cookbook erscheint.
- [ ] Ein Rezept in Nextcloud Cookbook bearbeiten und die Synchronisierung in AvoCook überprüfen.

**Timer**
- [ ] Einen Timer starten und die App in den Hintergrund schicken — die Benachrichtigung muss pünktlich ausgelöst werden.
- [ ] Mehrere Timer gleichzeitig starten.

**Einkaufsliste**
- [ ] Zutaten in die Zwischenablage kopieren.
- [ ] Eine Einkaufsliste in iOS-Erinnerungen exportieren (nur iOS).

**Backup**
- [ ] Ein Backup in eine JSON-Datei exportieren.
- [ ] Es wieder importieren und prüfen, ob die Rezepte korrekt wiederhergestellt werden.

**Oberfläche**
- [ ] Hellen und dunklen Modus prüfen.
- [ ] Mindestens Französisch und Englisch prüfen; Deutsch, Spanisch und Italienisch stichprobenartig testen.
- [ ] Auf iPhone und iPad (oder einem kleinen Android + Tablet) prüfen.

---

## 4 — EAS-Builds

```bash
# Vorschau (für interne Tests)
npx eas build --platform ios --profile preview
npx eas build --platform android --profile preview

# Produktion
npx eas build --platform all --profile production
```

---

## 5 — Plattform-Hinweise

### iOS

- Die App ist für iPhone und iPad konfiguriert (`supportsTablet: true`).
- Sie verwendet keine Remote-Push-Benachrichtigungen, Ortungsdienste oder Bluetooth.
- Die Berechtigung für das lokale Netzwerk wird nur verwendet, um sich mit einem Nextcloud-Server im selben Netzwerk zu verbinden, oder für den Expo-Client während der Entwicklung.

### Android

- Die wichtigste Android-Konfiguration befindet sich in `app.json` (Package, Berechtigungen, adaptives Icon).
- Die in den GitHub-Releases veröffentlichte APK ist `avocook.apk`.

---

## 6 — Einreichen

```bash
npx eas submit --platform ios
npx eas submit --platform android
```

> AvoCook ist ein unabhängiger Client, der mit Nextcloud Cookbook kompatibel ist. Er darf nicht als offizielle Nextcloud-Anwendung präsentiert werden.
