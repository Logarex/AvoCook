# AvoCook

[English](../../README.md) · [Français](../fr/README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) · [Italiano](../it/README.md) · [Dansk](README.md)

AvoCook er en gratis open source-app til iOS og Android. Jeg udvikler den ved siden af mine studier for at samle opskrifter, planlægge måltider og gøre hverdagens madlavning lidt lettere.

[App Store](https://apps.apple.com/app/avocook/id6769012665) · [Google Play](https://play.google.com/store/apps/details?id=app.avocook.mobile) · [APK](https://github.com/Logarex/AvoCook/releases/latest)

[![APK-downloads](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/Logarex/AvoCook/badges/apk-downloads.json&logo=android)](https://github.com/Logarex/AvoCook/releases)

<p align="center">
  <img src="../../assets/screenshots/en/recipe_list.png" width="230" alt="Opskriftsliste" />
  <img src="../../assets/screenshots/en/recipe.png" width="230" alt="Opskriftsdetaljer" />
  <img src="../../assets/screenshots/en/shopping.png" width="230" alt="Indkøbsliste" />
</p>

## Funktioner

- Opskrifter med fotos, kategorier, justerbare portioner, webimport og valgfri Markdown.
- Køleskab, skab og fryser med stregkoder, datoer og udløbspåmindelser.
- Dags- og ugeplan, enkle måltider, rester, gemte menuer og historik.
- Trinvis madlavning, gemte timere, lokale stemmekommandoer og private noter.
- Idéer med dine ingredienser, regionale sæsonkalendere, omregninger og erstatninger til bagning.
- Lokale eller delte indkøbslister, pushbeskeder, Nextcloud Pantry og Apple Påmindelser på iOS.
- Illustrerede PDF-kogebøger, deling af opskrifter og komplette køkkensikkerhedskopier.
- Opskrifter fra fællesskabet at opdage, oversætte og dele; valgfri assistent med egen API-nøgle.

Lokale opskrifter fungerer offline uden konto. Nextcloud Cookbook er valgfrit; madplan, forråd og private noter bliver på enheden.

## Vejledninger

- [Køkkenvejledning](GUIDE.md)
- [Dine data og forbindelser](PRIVACY.md)
- [Teknisk dokumentation](../LOCAL_KITCHEN.md) · [Nextcloud Pantry](../NEXTCLOUD_PANTRY.md) · [Seasonal catalog](../SEASONAL_CATALOG.md)

<details>
<summary>Udvikling og projektstruktur</summary>

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

</details>

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
