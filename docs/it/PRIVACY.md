# Informativa sulla privacy

AvoCook non raccoglie alcun dato e non include pubblicità né strumenti di analisi di alcun tipo.

## Modalità locale

In modalità locale — la modalità predefinita — ricette, immagini e impostazioni sono memorizzate esclusivamente sul tuo dispositivo tramite SQLite e il file system locale. Non viene inviato nulla da nessuna parte.

## Sincronizzazione Nextcloud (facoltativa)

Se scegli di collegare un server Nextcloud, le ricette vengono sincronizzate direttamente tra l'app e quel server. Nessun servizio di terze parti è coinvolto.

Le tue credenziali (URL del server, nome utente e password dell'app) sono memorizzate sul dispositivo tramite Expo SecureStore, che si basa sull'enclave sicura del sistema (Keychain su iOS, Keystore su Android).

## Importazione di ricette da un URL

Quando importi una ricetta inserendo un URL, l'app scarica quella pagina per leggere i dati della ricetta disponibili pubblicamente. Non vengono inviati altri dati, e la richiesta viene effettuata direttamente dal tuo dispositivo.

## Fotocamera e libreria foto

L'accesso alla fotocamera e alla libreria foto viene usato esclusivamente per aggiungere immagini a una ricetta o per scansionare una ricetta da una foto. Le immagini vengono memorizzate localmente.

## Generazione di ricette con IA (facoltativa)

Se configuri una chiave API per l'IA nelle impostazioni, quella chiave viene memorizzata localmente in SecureStore. I dati della foto vengono inviati al fornitore API che hai configurato. Questa funzione è completamente opzionale e richiede che tu fornisca la tua chiave.

## Promemoria iOS (facoltativo)

Se scegli di esportare una lista della spesa in Promemoria iOS, l'app scrive dati nel tuo database locale di Promemoria. Questo richiede il permesso Promemoria. Nessun dato lascia il tuo dispositivo attraverso questa funzione.

## Contatti

Per domande o problemi, apri un thread sul [repository GitHub](https://github.com/Logarex/AvoCook).
