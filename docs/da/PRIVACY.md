# Privatliv og data

Opdateret: 14. oktober 2026. AvoCook indeholder ikke reklamer eller analyseværktøjer. Nogle funktioner bruger de netværkstjenester, der er beskrevet her.

## Opskrifter, Nextcloud og sikkerhedskopier

Lokale opskrifter og billeder gemmes på enheden. De overføres, når du vælger at synkronisere, dele, eksportere eller udgive dem. Nextcloud Cookbook og Pantry udveksler data direkte med den valgte server. Pantry-kopier og igangværende overførsler gemmes separat for hver Nextcloud-konto. Når du logger ud, kopieres Pantry-varer ikke automatisk til den lokale liste.

Nextcloud-loginoplysninger og AI-API-nøgler gemmes i systemets sikre lager via Expo SecureStore. Opskrifter, billeder og almindelige indstillinger bruger SQLite, filer eller appens lager. iOS kan bevare sikre data efter geninstallation; sikkerhedskopier af enheden kan også gendanne data. Eksportér dine opskrifter, før du afinstallerer.

HTTPS er standard. En server, der udtrykkeligt er sat op med HTTP, overfører loginoplysninger, opskrifter og billeder uden transportkryptering. Appen viser en advarsel ved tilslutning. Eksportfiler kan indeholde billeder og personlige oplysninger: Vælg, hvor du deler dem.

## Firebase, fællesskab og delte lister

AvoCook starter en anonym Firebase-session ved åbning, også i lokal tilstand. Firebase modtager ID’et og de netværksoplysninger, som forbindelsen kræver. Der kræves ikke e-mail eller adgangskode til sessionen.

Fællesskabsopskrifter, forfatternavne, profiler, bedømmelser, anmeldelser og delte indkøbslister bruger Firebase. Udgivne opskrifter er synlige for andre brugere. Alle med en listes kode kan tilmelde sig. Undgå at udgive private oplysninger. Firebase-adgangsregler og opbevaring styres separat fra appen. Udlogning eller lokal sletning fjerner ikke indhold på serveren.

## Import, AI og oversættelse

URL-import henter den valgte side direkte fra webstedet. Webstedet modtager sædvanlige oplysninger om netværksanmodningen.

Valgfri AI-import og opskriftsgenerering sender det valgte billede eller den indtastede tekst til udbyderen i Indstillinger med din API-nøgle. Kamera og billedbibliotek kan også bruges til at tilføje lokale billeder. Billeder fra synkroniserede, delte eller udgivne opskrifter kan forlade enheden.

Automatisk oversættelse af fællesskabsopskrifter sender teksten til Google Translate og ved fejl til MyMemory. Din AI-API-nøgle bruges ikke. Hentede opskrifter og vellykkede oversættelser gemmes til læsning offline. Udbyderne behandler anmodninger efter deres egne vilkår og privatlivspolitikker.

## Apple Påmindelser, opdateringer og diagnostik

Hvis du aktiverer indkøbssynkronisering, læser og skriver den i Apple Påmindelser. Apple kan synkronisere varerne via din konto, også i delte iCloud-lister, afhængigt af dine indstillinger.

Android-installationer via APK tjekker GitHub for nye versioner. Installationer fra en appbutik opdateres via butikken. Åbning af opskrifts-, support- eller udbyderlinks kontakter den valgte destination.

Diagnoselogfiler gemmes lokalt. Adgangskoder og nøgler skjules, men personlige oplysninger kan stadig indgå. Gennemgå rapporter, før du kopierer eller deler dem. De sendes ikke automatisk.

## Kontakt

Brug [GitHub-projektet](https://github.com/Logarex/AvoCook) eller kontaktknappen i appen.
