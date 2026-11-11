# Privacy e dati

Aggiornamento: 1 novembre 2026. AvoCook non contiene pubblicità né strumenti di analisi. Alcune funzioni usano i servizi di rete descritti qui sotto.

## La mia cucina, voce e promemoria locali

Piani pasti, scorte, date, voti, note personali, etichette alimentari, menu e cronologia sono salvati localmente e separati per account di ricette. Le note private non sono pubblicate né incluse nei libri PDF. Il backup completo della cucina include questi dati e le ricette; il normale backup delle ricette non include i dati della cucina.

I comandi di cucina facoltativi richiedono permessi per microfono e riconoscimento vocale. Si usa solo un riconoscitore locale supportato, senza alternativa di rete. AvoCook non salva audio né trascrizioni. L’ascolto termina uscendo dalla modalità cucina o passando in background.

I promemoria delle scorte facoltativi sono programmati sul dispositivo. I nomi dei prodotti possono apparire sullo schermo bloccato secondo le impostazioni. Gli ingredienti generati usano la modalità spesa scelta, inclusa la condivisione o la sincronizzazione con Promemoria Apple attivate.

I backup automatici conservano fino a sette copie giornaliere delle ricette e di La mia cucina nello spazio dell’app sul dispositivo; non vengono caricati online e seguono le impostazioni di backup del dispositivo. Sono incluse le foto salvate solo sul dispositivo; le immagini online restano link. Puoi disattivarli in La mia cucina > Backup.

Con un account Nextcloud, la sincronizzazione facoltativa di La mia cucina salva pasti, dispensa, note del diario, menu e preferenze alimentari in `AvoCook/kitchen.json` nei tuoi file Nextcloud, scambiato direttamente con il server come le ricette. Timer in corso, impostazioni dei promemoria e identificativi del gruppo della spesa restano su ogni dispositivo. Disattivandola, il file resta sul server finché non lo elimini.

Su iPhone il widget Oggi legge un breve riepilogo (pasti del giorno, alcuni prodotti da consumare e numero di articoli da comprare) dallo spazio condiviso dell’App Group sul dispositivo. Titoli, descrizioni e parole chiave delle ricette salvate vengono indicizzati localmente da Spotlight; l’indice viene cancellato alla disconnessione. I timer possono comparire come Attività in tempo reale nella schermata di blocco e nella Dynamic Island; sono avviati localmente, senza servizio push.

## Ricette, Nextcloud e backup

Le ricette e le foto locali restano sul dispositivo. Vengono trasmesse quando scegli di sincronizzarle, condividerle, esportarle o pubblicarle. Nextcloud Cookbook e Pantry scambiano dati direttamente con il server scelto. Le copie Pantry e i trasferimenti in corso sono separati per account Nextcloud. La disconnessione non copia automaticamente gli articoli Pantry nella lista locale.

Le credenziali Nextcloud e le chiavi API IA sono conservate nella memoria sicura del sistema tramite Expo SecureStore. Ricette, foto e preferenze ordinarie usano SQLite, file o la memoria dell’app. iOS può conservare i dati sicuri dopo una reinstallazione; anche i backup del dispositivo possono ripristinare dati. Esporta le ricette prima di disinstallare.

HTTPS è l’impostazione predefinita. Un server configurato esplicitamente con HTTP trasmette credenziali, ricette e immagini senza cifratura del trasporto. L’app mostra un avviso alla connessione. I file esportati possono contenere foto e dati personali: scegli dove condividerli.

## Firebase, community e liste condivise

AvoCook avvia una sessione Firebase anonima all’apertura, anche in modalità locale. Firebase riceve l’identificatore e le informazioni di rete necessarie alla connessione. Non servono e-mail o password per questa sessione.

Ricette della community, nomi degli autori, profili, valutazioni, segnalazioni e liste condivise usano Firebase. Le ricette pubblicate sono visibili agli altri utenti. Chi possiede il codice di una lista può unirsi. Evita di pubblicare informazioni private. Le regole di accesso e conservazione Firebase sono gestite separatamente dall’app. Disconnettersi o cancellare dati locali non elimina i contenuti remoti.

In Impostazioni > Account, «Elimina i miei dati della community» cancella le ricette pubblicate, le relative foto caricate, lo pseudonimo riservato e lo stesso account anonimo Firebase. Voti e segnalazioni restano come dati anonimi di valutazione e moderazione, senza legame con un’identità. Se userai di nuovo la community verrà creata una nuova identità anonima indipendente. Gli autori bloccati sono salvati solo sul dispositivo e le loro ricette vengono nascoste nella tua community.

## Importazione, IA e traduzione

L’importazione da URL scarica la pagina scelta direttamente dal sito. Il sito riceve le normali informazioni di una richiesta di rete.

L’importazione e la generazione con IA sono facoltative e inviano la foto selezionata o il testo inserito al fornitore configurato nelle Impostazioni, usando la tua chiave API. Fotocamera e libreria foto consentono anche di aggiungere immagini locali. Le immagini delle ricette sincronizzate, condivise o pubblicate possono lasciare il dispositivo.

La traduzione automatica delle ricette della community invia il testo a Google Translate e, in caso di errore, a MyMemory. Non usa la tua chiave API IA. Le ricette caricate e le traduzioni riuscite vengono salvate per la lettura offline. I fornitori elaborano le richieste secondo le proprie condizioni e informative sulla privacy.

L’assistente frigo facoltativo invia una foto solo scegliendo Analizza, poi gli ingredienti confermati e le preferenze visibili solo scegliendo Genera. La foto non viene allegata alla ricetta né salvata nei dati di La mia cucina. Salvare la bozza modificabile è un’azione separata che segue le normali impostazioni di archiviazione e sincronizzazione. Il tuo fornitore può addebitare queste richieste.

## Promemoria Apple, aggiornamenti e diagnostica

Se attivata, la sincronizzazione della spesa legge e scrive in Promemoria. Apple può sincronizzare gli articoli tramite il tuo account, comprese le liste iCloud condivise, secondo le impostazioni.

Le installazioni Android tramite APK cercano le versioni su GitHub. Quelle da uno store ricevono gli aggiornamenti dallo store. Aprire un link di ricetta, assistenza o fornitore contatta la relativa destinazione.

I registri diagnostici restano locali. I dati di accesso vengono mascherati, ma possono rimanere informazioni personali. Controlla i rapporti prima di copiarli o condividerli. Non vengono inviati automaticamente.

## Ricerca tramite codice a barre

La ricerca per codice a barre invia codice e lingua a Open Food Facts. Immagini della fotocamera, scorte e date non vengono trasmesse. Nomi, quantità, valori nutrizionali e punteggi disponibili sono salvati localmente con attribuzione sotto ODbL.

## Notifiche delle liste condivise

Attivando le notifiche di una lista AvoCook, un relè Cloudflare Workers riceve il token push del dispositivo e verifica identità Firebase e accesso alla lista. Le liste restano in Firebase. Cloudflare D1 conserva identificatori tecnici degli articoli, versioni, lingua, identificatori di installazione e token push, senza nomi dei prodotti. Un processo cerca modifiche non segnalate con un account di servizio Google in sola lettura. Non vengono inviate credenziali Nextcloud.

I messaggi generici passano tramite Expo Push e Apple o Google, anche con l’app chiusa, senza nomi dei prodotti. Disattivare le notifiche o lasciare la lista rimuove la registrazione alla connessione successiva. Le registrazioni scadono dopo 90 giorni senza rinnovo; i dati degli invii vengono eliminati dopo due giorni. Timer e promemoria di scadenza sono programmati sul dispositivo.

## Contatti

Usa [il repository GitHub](https://github.com/Logarex/AvoCook) o il pulsante di contatto nell’app.
