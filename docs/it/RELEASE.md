# Preparare una pubblicazione

## Preparare la versione

Mantieni allineati app.json, package.json, package-lock.json e store/release.json. Controlla numero di build iOS e codice versione Android. Aggiorna le novità nelle sei lingue; le descrizioni permanenti presentano l’app senza annunci di versione.

## Controlli automatici

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

## Prove sui dispositivi

Prova ricette locali offline, importazione web, Nextcloud Cookbook e immagini, le tre modalità di spesa, Promemoria Apple, notifiche con destinatario bloccato, codici a barre, scadenze, permessi vocali, ripristino timer, foto PDF e ripristino backup. Controlla schermi piccoli, tablet, testo grande ed entrambi i temi.

## Compilare e inviare

Ricompila dopo cambiamenti a dipendenze native o autorizzazioni. I testi degli store si preparano separatamente dai binari. Segui la guida degli store per i metadati e controlla destinazione e versione prima dell’invio.

```sh
npm run store:prepare
npx eas build --platform all --profile production
```

[Store / Fastlane](../../store/README.md) · [Privacy](PRIVACY.md) · [Notifications](../../docs/NOTIFICATIONS.md)
