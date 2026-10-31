# AvoCook

[English](../../README.md) · [Français](../fr/README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) · [Italiano](../it/README.md) · [Dansk](README.md)

AvoCook er en gratis open source-app til iOS og Android. Jeg udvikler den ved siden af mine studier for at samle opskrifter, planlægge måltider og gøre hverdagens madlavning lidt lettere.

[App Store](https://apps.apple.com/app/avocook/id6769012665) · [Google Play](https://play.google.com/store/apps/details?id=app.avocook.mobile) · [APK](https://github.com/Logarex/AvoCook/releases/latest)

## Brug AvoCook

### Alle opskrifter ét sted

Skriv opskrifter, tilføj fotos og kategorier, og tilpas mængder til portionerne. Ingredienser og trin understøtter valgfri Markdown. Indsæt et link eller del det fra browseren for at importere en opskrift, og tjek resultatet før du gemmer. Du kan også udskrive eller dele en enkelt opskrift.

### Hold styr på dine madvarer

Organiser køleskab, skab og fryser med mængder og datoer. Tilføj madvarer med stregkoder, se tilgængelige vurderinger fra Open Food Facts og slå påmindelser om udløbsdatoer til.

Indtast datoen på pakken selv. Stregkodesøgning kræver Internet; varedata og vurderinger kan mangle. Forråd og madplan er stadig tilgængelige offline.

### Planlæg i dag og resten af ugen

Tilføj opskrifter, enkle måltider, rester eller restaurantbesøg. Tilpas portioner, flyt måltider mellem dage og vælg ingredienser til indkøbslisten. Gem menuer og find tidligere måltider i historikken.

### Lav mad trin for trin

Følg opskrifter med timere, der gendannes, når du vender tilbage. Understøttede enheder har lokale stemmekommandoer. Gem noter i en privat dagbog og tilbered flere opskrifter sammen.

### Idéer til hverdagen

Find opskrifter med dine ingredienser, se sæsonvarer i 11 regionale kalendere, eller brug omregninger og erstatninger til bagning. Sikkerhedskopiér opskrifter og private køkkendata sammen.

Kalenderne dækker det franske fastland, Vallonien, Schweiz, Tyskland, Spanien, Italien, Storbritannien, Danmark, Ontario, delstaten New York og Sydney. Dækning og betydningen af tilgængelighed afhænger af kilden.

### Valgfri køleskabsassistent

Indtast ingredienser eller start med et foto af køleskabet, tjek listen og bed om et opskriftsudkast, du kan redigere. Kræver egen udbyder, API-nøgle og en passende model; der kan være omkostninger.

### Din egen illustrerede kogebog

Vælg opskrifter og en titel, og lav en PDF-bog med forside, indholdsfortegnelse, fotos, ingredienser og trin. Billeder fra dit lokale bibliotek og Nextcloud medtages, når de er tilgængelige.

Private dagbogsnoter kommer ikke med i bogen. PDF-filen oprettes på enheden; Nextcloud-billeder kan skulle hentes først.

### Indkøb alene eller sammen

Brug en lokal liste, inviter andre til en AvoCook-liste med en kode på seks tegn, eller forbind en husstandsliste fra Nextcloud Pantry. Vælg ingredienser fra opskrifter og madplan. På iOS kan Påmindelser synkronisere med den aktive tilstand. Delte AvoCook-lister tilbyder pushbeskeder, når andre deltagere tilføjer eller fjerner varer.

### Opskrifter fra fællesskabet

Find, bedøm og importer andre brugeres opskrifter. Læs dem oversat eller se originalen. En fællesskabsprofil giver mulighed for at udgive egne opskrifter. Indlæste opskrifter og færdige oversættelser forbliver i enhedens cache.

### På telefoner og tablets

De fem faner er Opskrifter, Mit køkken, Madplan, Fællesskab og Indkøb. Store skærme kan bruge sidenavigation og kolonnevisning, der tager hensyn til tekststørrelsen. Understøttede iPhones bruger native Liquid Glass-knapper.

### Dine data og forbindelser

Opskrifter fungerer lokalt uden at oprette en konto. Forbind Nextcloud Cookbook for at synkronisere dem med din server. Madplan, forråd og private noter bliver på enheden, adskilt efter opskriftskonto; Cookbook synkroniserer dem ikke. Eksporter kun opskrifter, eller lav en komplet sikkerhedskopi med tilgængelige fotos og private køkkendata.

Fællesskab og delte lister bruger Firebase med en anonym session ved opstart. Webimport, varesøgning og den valgfrie assistent bruger deres respektive tjenester. Talegenkendelse bruger en understøttet lokal motor uden cloud-reserve.

## Tilgængelige sprog

Dansk · Engelsk · Fransk · Tysk · Spansk · Italiensk

## Vejledninger

- [Køkkenvejledning](GUIDE.md)
- [Dine data og forbindelser](PRIVACY.md)
- [Teknisk dokumentation](../LOCAL_KITCHEN.md) · [Nextcloud Pantry](../NEXTCLOUD_PANTRY.md) · [Seasonal catalog](../SEASONAL_CATALOG.md)

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
