# Datenschutzerklärung

AvoCook sammelt keinerlei Daten und enthält weder Werbung noch Analyse-Tools.

## Lokaler Modus

Im lokalen Modus — dem Standardmodus — werden Rezepte, Bilder und Einstellungen ausschließlich auf deinem Gerät über SQLite und das lokale Dateisystem gespeichert. Es wird nichts übertragen.

## Nextcloud-Synchronisierung (optional)

Wenn du dich entscheidest, einen Nextcloud-Server zu verbinden, werden Rezepte direkt zwischen der App und diesem Server synchronisiert. Kein Drittanbieter ist beteiligt.

Deine Anmeldedaten (Server-URL, Benutzername und App-Passwort) werden auf dem Gerät über Expo SecureStore gespeichert, das auf der sicheren Enklave des Systems basiert (Keychain auf iOS, Keystore auf Android).

## Rezept-Import über eine URL

Wenn du ein Rezept durch Eingabe einer URL importierst, lädt die App diese Seite herunter, um die öffentlich verfügbaren Rezeptdaten zu lesen. Es werden keine weiteren Daten übertragen, und die Anfrage erfolgt direkt von deinem Gerät.

## Kamera und Fotobibliothek

Der Zugriff auf Kamera und Fotobibliothek wird ausschließlich verwendet, um Fotos zu einem Rezept hinzuzufügen oder ein Rezept aus einem Foto zu scannen. Die Bilder werden lokal gespeichert.

## KI-Rezeptgenerierung (optional)

Wenn du in den Einstellungen einen KI-API-Schlüssel konfigurierst, wird dieser Schlüssel lokal in SecureStore gespeichert. Fotodaten werden an den von dir konfigurierten API-Anbieter gesendet. Diese Funktion ist vollständig optional und erfordert deinen eigenen Schlüssel.

## iOS-Erinnerungen (optional)

Wenn du eine Einkaufsliste in iOS-Erinnerungen exportierst, schreibt die App Daten in deine lokale Erinnerungen-Datenbank. Dazu ist die Erinnerungen-Berechtigung erforderlich. Über diese Funktion verlassen keine Daten dein Gerät.

## Kontakt

Bei Fragen oder Problemen öffne bitte einen Thread im [GitHub-Repository](https://github.com/Logarex/AvoCook).
