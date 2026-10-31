# AvoCook

[English](../../README.md) · [Français](../fr/README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) · [Italiano](README.md) · [Dansk](../da/README.md)

AvoCook è un’app gratuita e open source per iOS e Android. La sviluppo insieme ai miei studi per raccogliere ricette, pianificare pasti e rendermi un po’ più semplice cucinare ogni giorno.

[App Store](https://apps.apple.com/app/avocook/id6769012665) · [Google Play](https://play.google.com/store/apps/details?id=app.avocook.mobile) · [APK](https://github.com/Logarex/AvoCook/releases/latest)

## Usare AvoCook

### Tutte le ricette in un posto

Scrivi ricette, aggiungi foto e categorie e adatta le quantità alle porzioni. Ingredienti e passaggi supportano Markdown facoltativo. Incolla un link o condividilo dal browser per importare una ricetta, poi controlla il risultato prima di salvare. Puoi anche stampare o condividere una singola ricetta.

### Tieni d’occhio le scorte

Organizza frigo, dispensa e congelatore con quantità e date. Aggiungi alimenti tramite codice a barre, consulta i punteggi disponibili di Open Food Facts e attiva i promemoria di scadenza.

Inserisci la data sulla confezione. La ricerca tramite codice a barre richiede Internet; schede e punteggi possono mancare. Scorte e piano restano disponibili offline.

### Pianifica oggi e la settimana

Aggiungi ricette, pasti semplici, avanzi o uscite. Regola le porzioni, sposta i pasti tra i giorni e scegli gli ingredienti da acquistare. Salva i menu e ritrova i pasti precedenti nella cronologia.

### Cucina passo dopo passo

Segui le ricette con timer che vengono ripristinati al ritorno. I dispositivi compatibili offrono comandi vocali locali. Conserva le note in un diario privato e prepara più ricette insieme.

### Idee per tutti i giorni

Cerca ricette con i tuoi ingredienti, consulta i prodotti di stagione in 11 calendari regionali o usa conversioni e sostituzioni per dolci. Salva ricette e dati privati della cucina nello stesso backup.

I calendari coprono Francia metropolitana, Vallonia, Svizzera, Germania, Spagna, Italia, Regno Unito, Danimarca, Ontario, Stato di New York e Sydney. Copertura e significato della disponibilità dipendono dalla fonte.

### Assistente frigo facoltativo

Inserisci ingredienti o parti da una foto del frigo, verifica la lista e richiedi una bozza di ricetta modificabile. Servono il tuo fornitore, la tua chiave API e un modello compatibile; possono esserci costi.

### Il tuo ricettario illustrato

Scegli ricette e titolo per creare un libro PDF con copertina, indice, foto, ingredienti e passaggi. Le immagini della libreria locale e di Nextcloud vengono incluse quando disponibili.

Le note del diario privato non sono incluse nel libro. Il PDF viene creato sul dispositivo; potrebbe essere necessario scaricare le immagini da Nextcloud.

### La spesa, da soli o insieme

Usa una lista locale, invita altre persone in una lista AvoCook con un codice di sei caratteri o collega una lista domestica di Nextcloud Pantry. Scegli gli ingredienti da aggiungere dalle ricette e dal piano. Su iOS, Promemoria può sincronizzarsi con la modalità attiva. Le liste condivise AvoCook offrono notifiche quando altri partecipanti aggiungono o rimuovono prodotti.

### Ricette della comunità

Scopri, valuta e importa le ricette degli altri utenti. Puoi leggerle tradotte o consultare l’originale. Un profilo della comunità permette di pubblicare le tue ricette. Ricette caricate e traduzioni completate restano nella cache del dispositivo.

### Su telefoni e tablet

Le cinque schede sono Ricette, La mia cucina, Pianifica, Comunità e Spesa. Gli schermi grandi possono usare navigazione laterale e viste a colonne, tenendo conto della dimensione del testo. Gli iPhone compatibili usano controlli Liquid Glass nativi.

### Dati e connessioni

Le ricette funzionano in locale senza creare un account. Collega Nextcloud Cookbook per sincronizzarle con il tuo server. Piano, scorte e note private restano sul dispositivo, separati per account di ricette; Cookbook non li sincronizza. Esporta solo le ricette o crea un backup completo con foto disponibili e dati privati della cucina.

Comunità e liste condivise usano Firebase, con una sessione anonima all’avvio. Importazione web, ricerca prodotti e assistente facoltativo contattano i rispettivi servizi. La voce usa un motore locale compatibile, senza passare al cloud.

## Lingue disponibili

Italiano · Inglese · Francese · Tedesco · Spagnolo · Danese

## Guide

- [Guida alla cucina](GUIDE.md)
- [Dati e connessioni](PRIVACY.md)
- [Documentazione tecnica](../LOCAL_KITCHEN.md) · [Nextcloud Pantry](../NEXTCLOUD_PANTRY.md) · [Seasonal catalog](../SEASONAL_CATALOG.md)

## Configurazione per lo sviluppo

Il progetto utilizza Expo SDK 57, React Native 0.86 e TypeScript. È richiesto Node.js >=22.13 e <27. Le build iOS locali utilizzano Xcode 27 e Device Hub; la versione minima di iOS supportata è 16.4.

```bash
npm ci
npm run ios      # Simulatore iOS
npm run android  # Emulatore Android
```

Dopo modifiche alle dipendenze native, esegui `npx expo prebuild --clean` e ricompila. Voce locale e promemoria delle scorte richiedono i moduli nativi locali; Expo Go non basta.

Al primo avvio viene compilata una build di sviluppo con i moduli nativi. Successivamente l'app si apre direttamente.

I progetti `ios/` e `android/` vengono generati da `app.json`, `tools/plugins/` e dai moduli locali in `src/modules/`. Dopo un aggiornamento dell’SDK o delle dipendenze native, rigenerali con `npx expo prebuild --clean` prima di compilare di nuovo. Il plugin `expo-build-properties` abilita il ciclo di vita di UIKit basato sulle scene richiesto da Xcode 27.

Comandi utili:

```bash
npm run typecheck                      # Verifiche TypeScript
npm test                               # Test unitari (Vitest)
npm run lint                           # ESLint
npm run import:check -- <url-ricetta>  # Testare l'importazione da un URL
```

---

## Struttura del progetto

```
src/
├── App.tsx                              # Punto di ingresso, navigazione
├── screens/                             # Schermate (lista, dettaglio, editor, impostazioni…)
├── components/                          # Componenti UI riutilizzabili
├── features/
│   ├── kitchen/                         # La mia cucina — pasti quotidiani, in locale
│   ├── community/                       # Firebase
│   ├── recipes/                         # Archiviazione locale (SQLite), logica ricette, backup
│   ├── nextcloud/                       # Client HTTP per Nextcloud Cookbook
│   ├── import/                          # Importazione da URL e foto
│   ├── shopping/                        # Lista della spesa e sync con Promemoria iOS
│   ├── timers/                          # Timer di cottura
│   ├── preferences/                     # Impostazioni dell'applicazione
│   └── auth/                            # Autenticazione Nextcloud
├── i18n/                                # Internazionalizzazione (i18next, 6 lingue)
├── modules/
│   └── avocook-timer-notifications/     # Modulo nativo per le notifiche dei timer
└── theme/                               # Colori, tipografia, stili condivisi
tools/                                   # Plugin di build, verifica import, asset
docs/                                    # Documentazione in altre lingue (fr, de, es, it, da)
```

---

## Nextcloud Cookbook

Per testare la sincronizzazione:

1. Installa l'[app Cookbook](https://apps.nextcloud.com/apps/cookbook) su un'istanza Nextcloud.
2. Crea una **password per l'app** nelle impostazioni di sicurezza (Impostazioni → Sicurezza → Dispositivi e sessioni).
3. In AvoCook (Impostazioni), inserisci l'URL del server, il nome utente e quella password.

Se non viene indicato un protocollo, viene usato HTTPS per impostazione predefinita. Per un server Nextcloud sulla tua rete locale fidata, inserisci un indirizzo HTTP esplicito, come `http://192.168.1.50:8080/nextcloud` o `http://nextcloud.local`. HTTP invia la password dell'app e le ricette senza cifratura; usalo solo su una rete fidata. Le credenziali restano cifrate nel portachiavi del dispositivo.

---

## Android

Gli APK sono pubblicati nelle [release GitHub](https://github.com/Logarex/AvoCook/releases). Scarica `avocook.apk` e installalo direttamente.

---

## Contribuire

Le pull request sono benvenute. Consulta [CONTRIBUTING.md](../../.github/CONTRIBUTING.md) per le linee guida e il modello di PR.

---

## Supporta il progetto ☕

Se AvoCook ti è utile, puoi contribuire a coprire le spese:

**[→ Dona tramite Revolut](https://revolut.me/logarex)** · **[→ Dona tramite PayPal](https://paypal.me/logarex31)**

---

## Sito web

Il sito è in `site/`, con i testi in sei lingue in `site/main.js`. Il comando seguente prepara gli stessi file di GitHub Pages, schermate comprese. Il sito viene pubblicato su `gh-pages` con i push a `main` o tramite il workflow manuale Deploy site; un push solo a questo ramo non pubblica il sito.

```bash
node tools/scripts/build-site.mjs
python3 -m http.server 8765 --bind 127.0.0.1 --directory dist/site
```

[http://127.0.0.1:8765/](http://127.0.0.1:8765/)

---

## Licenza

Questo progetto è rilasciato sotto licenza [GPLv3](../../LICENSE).
