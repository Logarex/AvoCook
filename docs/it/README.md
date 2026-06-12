# AvoCook

AvoCook è un'app mobile per ricette che sto creando per uso personale e per imparare a gestire un progetto React Native completo dall'inizio alla fine.

L'idea è semplice: tieni le tue ricette in un unico posto, usale offline e sincronizzale con Nextcloud Cookbook se hai già un server.

[App Store](https://apps.apple.com/app/avocook/id6769012665) · [APK Android](https://github.com/Logarex/AvoCook/releases/latest) · [![Download APK](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/Logarex/AvoCook/badges/apk-downloads.json&logo=android)](https://github.com/Logarex/AvoCook/releases)

<p align="center">
  <img src="assets/screenshots/login.png" width="280" alt="Accesso AvoCook" />
  <img src="assets/screenshots/recipe.png" width="280" alt="Dettaglio ricetta" />
</p>

## Cosa può fare l'app

- creare e modificare ricette localmente;
- organizzare le ricette per categoria;
- aggiungere foto;
- importare una ricetta da un URL quando il sito espone dati `schema.org/Recipe`;
- adattare le quantità in base al numero di porzioni;
- avviare i timer di cottura;
- esportare una ricetta in PDF o stamparla;
- eseguire il backup / ripristinare le ricette su un file JSON;
- sincronizzare con Nextcloud Cookbook, se l'utente lo desidera;
- sincronizzare con l'app Promemoria di iOS per sfruttare le funzionalità di condivisione di Apple.

La modalità locale non richiede un account. I dati rimangono sul dispositivo.

## Configurazione per lo sviluppo

Il progetto utilizza Expo, React Native e TypeScript.

```bash
npm install
npm run start
```

Quindi apri l'app con Expo Go o una build di sviluppo.

Comandi utili:

```bash
npm run typecheck
npm test
npm run lint
npm run import:check -- <url-ricetta>
```

## Nextcloud Cookbook

Per testare la sincronizzazione:

1. Installa l'app Cookbook su un'istanza Nextcloud.
2. Crea una password per l'app nelle impostazioni di sicurezza.
3. Inserisci l'URL del server, il nome utente e quella password in AvoCook.

L'app rifiuta i server remoti tramite HTTP. L'HTTP è accettato per `localhost` durante lo sviluppo.

## Android

Gli APK vengono pubblicati nelle versioni di GitHub (releases). Il file principale da installare è `avocook.apk`.

## Struttura del progetto

- `src/screens`: schermate dell'applicazione;
- `src/components`: componenti riutilizzabili;
- `src/features/recipes`: archiviazione locale, sincronizzazione e logica delle ricette;
- `src/features/nextcloud`: client HTTP per Cookbook;
- `src/features/import`: importazione di ricette dalle pagine web;
- `src/modules/avocook-timer-notifications`: piccolo modulo nativo per le notifiche del timer.

## Licenza

Questo progetto è concesso in licenza con [GPLv3](LICENSE).
