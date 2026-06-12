# Rilascio (Release)

Breve lista di controllo per evitare sviste prima di pubblicare una versione.

## Prima della build

- Aggiornare la versione in `app.json`.
- Verificare che le icone e la schermata iniziale siano corrette.
- Rileggere `PRIVACY.md` se è cambiata una funzione di rete o di archiviazione.
- Testare la modalità locale senza un account.
- Testare una connessione Nextcloud con una password dell'app.
- Testare l'importazione di ricette da almeno Marmiton, 750g o BBC Good Food.
- Testare la creazione, la modifica e l'eliminazione di una ricetta in modalità aereo.
- Testare i timer su un dispositivo reale.
- Controllare la modalità chiara/scura e almeno francese/inglese.

## Controlli locali

```bash
npm run typecheck
npm test
npm run lint
```

Per un controllo di importazione preciso:

```bash
npm run import:check -- <url>
```

## Build EAS

```bash
npx eas build --platform ios --profile preview
npx eas build --platform android --profile preview
npx eas build --platform all --profile production
```

## iOS

L'app è configurata per iPhone e iPad. Non utilizza notifiche push remote, servizi di localizzazione o Bluetooth.

L'autorizzazione di rete locale viene utilizzata solo per i server Nextcloud sulla stessa rete o per il client Expo durante lo sviluppo.

## Android

La configurazione principale di Android è in `app.json`.

## Invio

```bash
npx eas submit --platform ios
npx eas submit --platform android
```

AvoCook è un client indipendente compatibile con Nextcloud Cookbook. Non deve essere presentata come un'applicazione Nextcloud ufficiale.
