# Datenschutz und Daten

Stand: 19. Oktober 2026. AvoCook enthält keine Werbung oder Analysewerkzeuge. Einige Funktionen nutzen die folgenden Netzwerkdienste.

## Meine Küche, Sprache und lokale Erinnerungen

Speisepläne, Vorräte, Daten, persönliche Bewertungen, Notizen, Ernährungsangaben, Menüs und Kochverlauf werden lokal nach Rezeptkonto getrennt gespeichert. Private Notizen werden nicht veröffentlicht oder in PDF-Kochbücher aufgenommen. Die vollständige Küchensicherung enthält diese Informationen und Rezepte; die normale Rezeptsicherung enthält keine Küchendaten.

Optionale Kochbefehle benötigen Mikrofon- und Spracherkennungsberechtigungen. Die Erkennung nutzt ausschließlich einen unterstützten lokalen Erkennungsdienst ohne Netzwerkersatz. AvoCook speichert weder Audio noch Transkripte. Beim Verlassen des Kochmodus oder im Hintergrund endet das Zuhören.

Optionale Vorratserinnerungen werden auf dem Gerät geplant. Produktnamen können je nach Systemeinstellung auf dem Sperrbildschirm erscheinen. Erzeugte Zutaten verwenden den gewählten Einkaufsmodus einschließlich aktivierter Freigabe oder Apple-Erinnerungssynchronisierung.

## Rezepte, Nextcloud und Sicherungen

Lokale Rezepte und Fotos bleiben auf deinem Gerät. Sie werden übertragen, wenn du sie synchronisierst, teilst, exportierst oder veröffentlichst. Nextcloud Cookbook und Pantry tauschen Daten direkt mit deinem gewählten Server aus. Pantry-Kopien und laufende Übertragungen werden nach Nextcloud-Konto getrennt gespeichert. Beim Abmelden werden Pantry-Artikel nicht automatisch in die lokale Liste kopiert.

Nextcloud-Zugangsdaten und KI-API-Schlüssel liegen über Expo SecureStore im sicheren Systemspeicher. Rezepte, Fotos und gewöhnliche Einstellungen verwenden SQLite, Dateien oder den App-Speicher. iOS kann sichere Daten nach einer Neuinstallation behalten; Gerätesicherungen können Daten wiederherstellen. Exportiere deine Rezepte vor der Deinstallation.

HTTPS ist der Standard. Ein ausdrücklich über HTTP eingerichteter Server überträgt Zugangsdaten, Rezepte und Bilder ohne Transportverschlüsselung. Die App zeigt beim Verbinden einen Hinweis. Exportdateien können Fotos und persönliche Informationen enthalten: Wähle sorgfältig, wo du sie teilst.

## Firebase, Community und geteilte Listen

AvoCook startet beim Öffnen eine anonyme Firebase-Sitzung, auch im lokalen Modus. Firebase erhält die Kennung und die für die Verbindung nötigen Netzwerkinformationen. Dafür sind weder E-Mail-Adresse noch Passwort erforderlich.

Community-Rezepte, Autorennamen, Profile, Bewertungen, Meldungen und geteilte Einkaufslisten verwenden Firebase. Veröffentlichte Rezepte sind für andere Nutzer sichtbar. Wer den Freigabecode einer Liste hat, kann ihr beitreten. Veröffentliche keine privaten Informationen. Zugriffsregeln und Aufbewahrung bei Firebase werden getrennt von der App verwaltet. Abmelden oder lokales Löschen entfernt keine entfernten Inhalte.

## Import, KI und Übersetzung

Der URL-Import lädt die gewählte Seite direkt vom Anbieter. Die Website erhält übliche Netzwerkinformationen.

Optionaler KI-Import und Rezeptgenerierung senden das gewählte Foto oder den eingegebenen Text mit deinem API-Schlüssel an den in den Einstellungen gewählten Anbieter. Kamera und Fotomediathek ermöglichen auch lokale Rezeptbilder. Bilder synchronisierter, geteilter oder veröffentlichter Rezepte können das Gerät verlassen.

Automatische Community-Übersetzungen senden Rezepttexte an Google Translate und bei Bedarf an MyMemory. Dein KI-API-Schlüssel wird dafür nicht verwendet. Geladene Community-Rezepte und erfolgreiche Übersetzungen werden zum Offline-Lesen gespeichert. Die Anbieter verarbeiten Anfragen nach ihren eigenen Bedingungen und Datenschutzrichtlinien.

Der optionale Kühlschrankassistent sendet ein Foto erst mit Analysieren und die bestätigten Zutaten und sichtbaren Vorgaben erst mit Generieren. Das Foto wird dem Rezept nicht beigefügt und nicht in den Daten von Meine Küche gespeichert. Das Speichern des bearbeitbaren Rezeptentwurfs ist ein separater Schritt und folgt Ihren üblichen Speicher- und Synchronisierungseinstellungen. Ihr Anbieter kann diese Anfragen berechnen.

## Apple Erinnerungen, Updates und Diagnose

Wenn aktiviert, liest und schreibt die Einkaufssynchronisierung Apple Erinnerungen. Apple kann die Artikel entsprechend deinen Einstellungen über dein Konto synchronisieren, auch in geteilten iCloud-Listen.

Android-Installationen per APK suchen auf GitHub nach Updates. Store-Installationen erhalten Updates über ihren Store. Geöffnete Rezept-, Support- und Anbieterlinks kontaktieren das jeweilige Ziel.

Diagnoseprotokolle bleiben lokal. Geheimnisse werden maskiert, persönliche Informationen können jedoch enthalten sein. Prüfe Berichte vor dem Kopieren oder Teilen. Sie werden nicht automatisch gesendet.

## Kontakt

Nutze [das GitHub-Repository](https://github.com/Logarex/AvoCook) oder die Kontaktfunktion der App.
