# AvoCook

[English](../../README.md) · [Français](../fr/README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) · [Italiano](../it/README.md) · [Dansk](README.md)

AvoCook er en gratis køkkenhjælper med åben kildekode til iOS og Android, med eller uden opskrift. Gem opskrifter, planlæg hverdagens måltider, brug de råvarer, du har, og forbered indkøb. De lokale værktøjer virker offline uden at oprette en konto; fællesskab, delte lister, import, valgfri AI og Nextcloud-forbindelser bruger onlinetjenester.

> Denne README beskriver den aktuelle kildekodegren. Butiks- og GitHub-udgivelser indeholder muligvis ikke de seneste ændringer endnu.

[App Store](https://apps.apple.com/app/avocook/id6769012665) · [Google Play](https://play.google.com/store/apps/details?id=app.avocook.mobile) · [APK](https://github.com/Logarex/AvoCook/releases/latest)

---

## Funktioner

### Fællesskabsplatform

- Opdag, bedøm og importer opskrifter fra AvoCook-fællesskabet;
- Opskrifter fra fællesskabet vises automatisk på appens sprog, både på listen og i opskriftens detaljer;
- Se den originale opskrift når som helst, eller importer den oversatte version til din opskriftsbog;
- Del dine bedste retter ved at oprette en fællesskabsprofil;
- Indeholder fællesskabsrapportering og spamkontrol; offentliggjort indhold kommer fra brugerne.
- Vælg et særskilt oversættelsessprog til fællesskabet, herunder kinesisk, portugisisk, nederlandsk, japansk, koreansk, arabisk og russisk. Indlæste opskrifter og vellykkede oversættelser gemmes til offlinelæsning.

### Opskrifter

- Opret og rediger opskrifter lokalt, ingen konto påkrævet;
- Organiser opskrifter efter kategori;
- Tilpas ingrediensmængder til antallet af portioner;
- Tilføj et eller flere fotos til hver opskrift;
- Eksporter en opskrift som PDF eller udskriv den direkte;
- Del en opskrift med en anden app.

### Mit køkken — hverdagens måltider, lokalt

Start i Mit køkken: I dag, Uge, Mine madvarer og Måltidsidéer. Andre værktøjer findes under skruenøglen.

- **Planlæg ugen** — Tilføj frokost og aftensmad, træk opskrifter mellem dage, og tilpas portioner. Gennemgå samlede ingredienser, før du tilføjer dem til indkøb.
- **Måltider uden opskrift** — Notér et hurtigt måltid, gentag et sædvanligt måltid, eller planlæg rester og restaurantbesøg. Kun måltider med ingredienser bidrager til indkøb.
- **Brug det, du har** — Gem køleskabs-, skabs- og frostvarer med datoer. Find opskrifter med færre manglende ingredienser, og gennemgå indkøb. Valgfrie lokale datopåmindelser.
- **Frugt og grønt i sæson** — Vælg område og måned, søg eller filtrér, og vælg varer til indkøb eller opskriftsidéer. Kildebaserede offlinekalendere med tydelig regional dækning.
- **Lav mad trin for trin** — Ét trin med stor skrift, fremdrift, ingredienser og timere. Valgfrie lokale stemmekommandoer på understøttede enheder; beskeder afhænger af tilladelser og systemindstillinger.
- **En opskrift fra køleskabet (AI)** — Indtast ingredienser eller analysér et foto, ret de genkendte madvarer, og generér et redigerbart udkast. Valgfrit: egen API-nøgle og egnet model; udbyderen kan opkræve betaling.
- **En privat køkkendagbog** — Bedømmelser, noter, ændringer, tilberedningsdatoer, sværhedsgrad og manuelt angivne priser. Egne kostmærker og filtre hjælper med at sortere; de garanterer ikke fravær af allergener.
- **Batch cooking og menuer** — Vælg 3–5 opskrifter, saml indkøb, og gennemgå forberedelsen efter varighed. Gem og planlæg festmenuer; ingen automatisk parallel madlavning.
- **Din egen kogebog** — Vælg op til 50 opskrifter til en lokal tekst-PDF med indhold, ingredienser og trin. Private noter og fotos medtages ikke.
- **Praktiske køkkenværktøjer** — Vælg en tilfældig opskrift, omregn kompatible enheder og temperaturer, eller se bageerstatninger til bestemte tilberedninger med forhold og forholdsregler. Ingen gættet omregning fra gram til milliliter.
- **Sikkerhedskopier under din kontrol** — Eksportér opskrifter til JSON, eller brug den komplette Mit køkken-kopi til opskrifter, tilgængelige lokale fotos og private plandata. Gennemgå før gendannelse.

Tilgængelige kalendere: det franske fastland, Vallonien (Belgien), Schweiz, Tyskland, Spanien, Italien, Storbritannien, Danmark, Ontario (Canada), staten New York (USA) og Sydney (Australien). 11 lande med regionale grænser, ikke verdensdækning. Kilderne skelner mellem høst, opbevaring eller markedsudbud; det er vejledning, ikke realtidsprognoser.

Ingredienssøgning kontrollerer ikke tilgængelige mængder, friskhed eller allergener. Kostmærker indtastes af brugeren. Erstatninger gælder kun understøttede tilberedninger. Stemme og meddelelser afhænger af enhed og tilladelser.

[Funktion og begrænsninger](../LOCAL_KITCHEN.md) · [Kilder til sæsonkataloget](../SEASONAL_CATALOG.md)

Filtrér idéer efter kendt varighed (≤30 minutter), egen bedømmelse (≥4/5), let sværhedsgrad og egne kostmærker. Historikken gemmer måltider bekræftet som spist og tilberedninger registreret i dagbogen eller madlavningstilstanden.

### Valgfri Markdown

Alle opskrifters tekstfelter accepterer Markdown på alle sprog: navn, beskrivelse, kategori, nøgleord, kildenavn, ingredienser, instruktioner, redskaber og næringsværdier. Almindelig tekst er stadig standard; kendskab til Markdown er ikke nødvendigt.

Brug `**fed**`, `*kursiv*`, overskrifter, lister, citater, kode, tabeller eller `[et link](https://example.com)`. Formateringen vises ved læsning, i PDF-filer og ved udskrivning. Markdown-billeder vises som links. Tal (portioner og varighed) og URL-felter beholder deres sædvanlige format.

Hver ingrediens og instruktion beholder sin Markdown, inklusive afsnit og indlejrede lister. Indsatte linjer med almindelig tekst opretter stadig separate punkter; indsatte Markdown-blokke holdes samlet.

### Import

- Importér fra understøttede sider med tilgængelige `schema.org/Recipe`-data; nogle websteder blokerer udtræk eller leverer ufuldstændige data.
- Modtag en URL fra en browser eller en anden app for at importere med ét tryk;
- Valgfri AI: scan opskrifter, generér fra tekst eller et foto af en ret, eller opret et køleskabsudkast. Vælg OpenAI, Gemini, Groq, Grok, Mistral, Claude eller et eget endpoint i assistentindstillingerne. Kræver egen API-nøgle og kompatibel model; fotos kræver billedforståelse, og udbyderen kan opkræve betaling.

### Indkøbsliste

- Vælg lokal liste, AvoCook-deling eller Nextcloud Pantry med overførsel af varer ved skift. Valgfri iOS Påmindelser-synkronisering fungerer i alle tre tilstande. [Nextcloud Pantry](../NEXTCLOUD_PANTRY.md).
- Del indkøbslister med en kode på 6 tegn, et deltagerantal og lokale beskeder, mens AvoCook kører;
- Kopier ingredienser til udklipsholderen med ét tryk;
- Eksporter en indkøbsliste til Apple Påmindelser.

### Timere

- Start en eller flere tilberedningstimere direkte fra en opskrift;
- Lokale timerbeskeder kan fungere i baggrunden, når tilladelser og systemindstillinger tillader det; kontrollér leveringen på din enhed.

### Data & synkronisering

- Sikkerhedskopier alle opskrifter til en JSON-fil og genopret dem;
- **Valgfrit**: Forbind en Nextcloud Cookbook-server for at synkronisere opskrifter mellem enheder.

> Lokale opskrifter bliver på enheden, medmindre du synkroniserer, deler eller eksporterer dem. Fællesskabet bruger Firebase med en anonym session ved opstart. Se [Privatliv og data](PRIVACY.md).

HTTPS bruges som standard, hvis ingen protokol angives. Til en Nextcloud-server på dit betroede lokale netværk skal du indtaste en eksplicit HTTP-adresse, f.eks. `http://192.168.1.50:8080/nextcloud` eller `http://nextcloud.local`. HTTP sender din app-adgangskode og dine opskrifter uden kryptering; brug det kun på et betroet netværk. Oplysningerne forbliver krypteret i enhedens nøglering.

---

## Tilgængelige sprog

Fransk · Engelsk · Tysk · Spansk · Italiensk · Dansk

---

## Opsætning til udvikling

Projektet bruger Expo SDK 57, React Native 0.86 og TypeScript. Node.js >=22.13 og <27 er påkrævet. Lokale iOS-builds bruger Xcode 27 og Device Hub; den laveste understøttede iOS-version er 16.4.

```bash
npm ci
npm run ios      # iOS-simulator
npm run android  # Android-emulator
```

Efter ændringer af native afhængigheder skal du køre `npx expo prebuild --clean` og bygge igen. Lokal stemmestyring og lagerpåmindelser kræver de lokale native moduler; Expo Go er ikke nok.

Ved første start kompileres et udviklingsbuild med native moduler. Derefter åbner appen direkte.

Projekterne `ios/` og `android/` genereres fra `app.json`, `tools/plugins/` og de lokale moduler i `src/modules/`. Efter en opdatering af SDK'et eller native afhængigheder skal de genereres igen med `npx expo prebuild --clean`, før du bygger på ny. Pluginet `expo-build-properties` aktiverer den scenebaserede UIKit-livscyklus, som Xcode 27 kræver.

Nyttige kommandoer:

```bash
npm run typecheck                      # TypeScript-kontrol
npm test                               # Enhedstests (Vitest)
npm run lint                           # ESLint
npm run import:check -- <opskrift-url>  # Test import fra en URL
```

---

## Websted

Webstedet ligger i `site/`, med tekster på seks sprog i `site/main.js`. Kommandoen nedenfor forbereder de samme filer som GitHub Pages, inklusive skærmbilleder. Webstedet udgives til `gh-pages` ved push til `main` eller via den manuelle Deploy site-workflow; push kun til denne gren udgiver ikke webstedet.

```bash
node tools/scripts/build-site.mjs
python3 -m http.server 8765 --bind 127.0.0.1 --directory dist/site
```

[http://127.0.0.1:8765/](http://127.0.0.1:8765/)

---

## Licens

Dette projekt er licenseret under [GPLv3](../../LICENSE).
