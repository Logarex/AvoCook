# Forbered en udgivelse

## Forbered versionen

Hold app.json, package.json, package-lock.json og store/release.json ens. Tjek iOS-buildnummer og Android-versionskode. Opdater udgivelsesnoter på alle seks sprog; faste beskrivelser præsenterer appen uden en versionsmeddelelse.

## Automatiske kontroller

```sh
npm ci
npm ci --prefix notification-relay
npm run typecheck
npm run lint -- --max-warnings=0
npm test
npm test --prefix notification-relay
npm run store:check
node tools/scripts/build-site.mjs
npx expo export --platform ios --platform android --output-dir dist/app
```

## Test på enheder

Test lokale opskrifter offline, webimport, Nextcloud Cookbook og billeder, alle tre indkøbstilstande, Apple Påmindelser, push til en låst modtager, stregkoder, udløbsdatoer, stemmetilladelser, gendannelse af timere, PDF-fotos og sikkerhedskopier. Tjek små skærme, tablets, stor tekst og begge temaer.

## Byg og indsend

Byg igen efter ændringer i native afhængigheder eller tilladelser. Butikstekster forberedes adskilt fra binære filer. Følg butiksvejledningen for metadata, og tjek destination og version før afsendelse.

```sh
npm run store:prepare
npx eas build --platform all --profile production
```

[Store / Fastlane](../../store/README.md) · [Privacy](PRIVACY.md) · [Notifications](../../docs/NOTIFICATIONS.md)
