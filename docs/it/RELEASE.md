# Lista di controllo per il rilascio

Una lista da seguire prima di pubblicare una nuova versione. Segui ogni passo in ordine.

---

## 1 — Preparare

- [ ] Aggiornare il numero di versione in [`app.json`](../../app.json) e [`package.json`](../../package.json).
- [ ] Aggiornare il numero di build (`buildNumber`) in `app.json` per iOS se necessario.
- [ ] Rileggere [`PRIVACY.md`](../../PRIVACY.md) e verificare se una nuova funzione di rete o di archiviazione deve essere documentata.
- [ ] Verificare che le icone e gli asset dello splash screen siano corretti e si visualizzino bene sia in modalità chiara che scura.

---

## 2 — Verifiche locali

```bash
npm run typecheck   # Nessun errore TypeScript
npm test            # Tutti i test passano
npm run lint        # Nessun avviso ESLint
```

Testare una specifica importazione da URL:

```bash
npm run import:check -- <url>
```

Provare almeno Marmiton, 750g o BBC Good Food.

---

## 3 — Test manuali

Da eseguire su un dispositivo reale, non solo su un simulatore.

**Modalità locale (senza account)**
- [ ] Creare una ricetta da zero.
- [ ] Modificarla, aggiungere una foto, regolare il numero di porzioni.
- [ ] Eliminarla.
- [ ] Ripetere i tre passaggi con il dispositivo in modalità aereo.

**Importazione**
- [ ] Importare una ricetta da un URL (almeno un sito francese + uno inglese).
- [ ] Condividere un URL da un browser ad AvoCook.
- [ ] Scansionare o generare una ricetta da una foto se è configurata una chiave API.

**Sincronizzazione Nextcloud**
- [ ] Connettersi a un'istanza Nextcloud con una password per l'app.
- [ ] Creare una ricetta in AvoCook e verificare che appaia in Nextcloud Cookbook.
- [ ] Modificare una ricetta in Nextcloud Cookbook e verificare la sincronizzazione in AvoCook.

**Timer**
- [ ] Avviare un timer e mettere l'app in background — la notifica deve scattare puntuale.
- [ ] Avviare più timer contemporaneamente.

**Lista della spesa**
- [ ] Copiare gli ingredienti negli appunti.
- [ ] Esportare una lista della spesa in Promemoria iOS (solo iOS).

**Backup**
- [ ] Esportare un backup in un file JSON.
- [ ] Reimportarlo e verificare che le ricette vengano ripristinate correttamente.

**Interfaccia**
- [ ] Controllare la modalità chiara e quella scura.
- [ ] Controllare almeno il francese e l'inglese; verificare rapidamente tedesco, spagnolo e italiano.
- [ ] Controllare su iPhone e iPad (o un Android piccolo + tablet).

---

## 4 — Build EAS

```bash
# Anteprima (per test interni)
npx eas build --platform ios --profile preview
npx eas build --platform android --profile preview

# Produzione
npx eas build --platform all --profile production
```

---

## 5 — Note per piattaforma

### iOS

- L'app è configurata per iPhone e iPad (`supportsTablet: true`).
- Non usa notifiche push remote, servizi di localizzazione né Bluetooth.
- Il permesso di rete locale viene usato solo per connettersi a un server Nextcloud sulla stessa rete, o per il client Expo durante lo sviluppo.

### Android

- La configurazione principale di Android si trova in `app.json` (package, permessi, icona adattiva).
- L'APK pubblicato nelle release GitHub è `avocook.apk`.

---

## 6 — Invio

```bash
npx eas submit --platform ios
npx eas submit --platform android
```

> AvoCook è un client indipendente compatibile con Nextcloud Cookbook. Non deve essere presentato come un'applicazione ufficiale di Nextcloud.
