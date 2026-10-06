# AvoCook

AvoCook er en mobil opskriftsbog — den fungerer helt offline på din enhed uden brug af en konto. Hvis du har en Nextcloud-server, kan du valgfrit forbinde den for at holde dine opskrifter synkroniseret.

---

## Funktioner

### Fællesskabsplatform

- Opdag, bedøm og importer opskrifter fra AvoCook-fællesskabet;
- Opskrifter fra fællesskabet vises automatisk på appens sprog, både på listen og i opskriftens detaljer;
- Se den originale opskrift når som helst, eller importer den oversatte version til din opskriftsbog;
- Del dine bedste retter ved at oprette en fællesskabsprofil;
- Sikker og modereret platform med indbygget spambeskyttelse.

### Opskrifter

- Opret og rediger opskrifter lokalt, ingen konto påkrævet;
- Organiser opskrifter efter kategori;
- Tilpas ingrediensmængder til antallet af portioner;
- Tilføj et eller flere fotos til hver opskrift;
- Eksporter en opskrift som PDF eller udskriv den direkte;
- Del en opskrift med en anden app.

### Import

- Importer en opskrift fra en URL — fungerer på alle websteder med `schema.org/Recipe` data;
- Modtag en URL fra en browser eller en anden app for at importere med ét tryk;
- Scan en opskrift fra et foto, eller generer en opskrift fra et billede af en ret ved hjælp af AI (kræver en OpenAI-kompatibel API-nøgle).

### Indkøbsliste

- Samarbejd om indkøbslister i realtid med en 6-cifret kode, push-meddelelser og deltagersporing;
- Kopier ingredienser til udklipsholderen med ét tryk;
- Eksporter en indkøbsliste til Apple Påmindelser.

### Timere

- Start en eller flere tilberedningstimere direkte fra en opskrift;
- Timere udløser en lokal meddelelse, selv når appen er i baggrunden.

### Data & synkronisering

- Sikkerhedskopier alle opskrifter til en JSON-fil og genopret dem;
- **Valgfrit**: Forbind en Nextcloud Cookbook-server for at synkronisere opskrifter mellem enheder.

> I lokal tilstand forbliver alt på din enhed. Ingen konto, ingen sky, ingen sporing.

HTTPS bruges som standard, hvis ingen protokol angives. Til en Nextcloud-server på dit betroede lokale netværk skal du indtaste en eksplicit HTTP-adresse, f.eks. `http://192.168.1.50:8080/nextcloud` eller `http://nextcloud.local`. HTTP sender din app-adgangskode og dine opskrifter uden kryptering; brug det kun på et betroet netværk. Oplysningerne forbliver krypteret i enhedens nøglering.

---

## Tilgængelige sprog

Fransk · Engelsk · Tysk · Spansk · Italiensk · Dansk

---

## Opsætning til udvikling

Projektet bruger Expo SDK 57, React Native 0.86 og TypeScript. Node.js 22.13 eller nyere er påkrævet. Lokale iOS-builds bruger Xcode 27 og Device Hub; den laveste understøttede iOS-version er 16.4.

```bash
npm install
npm run ios      # iOS-simulator
npm run android  # Android-emulator
```

Ved første start kompileres et udviklingsbuild med native moduler. Derefter åbner appen direkte.

Projekterne `ios/` og `android/` genereres fra `app.json`, `tools/plugins/` og de lokale moduler i `src/modules/`. Efter en opdatering af SDK'et eller native afhængigheder skal de genereres igen med `npx expo prebuild --clean`, før du bygger på ny. Pluginet `expo-build-properties` aktiverer den scenebaserede UIKit-livscyklus, som Xcode 27 kræver.

Nyttige kommandoer:

```bash
npm run typecheck                      # TypeScript-kontrol
npm test                               # Enhedstests (Vitest)
npm run lint                           # ESLint
npm run import:check -- <opskrift-url>  # Test import fra en URL
```

[Rapporten om pålidelighed og sikkerhed](../AUDIT_FIABILITE_SECURITE.md) (på fransk) beskriver kontroller, rettelser og resterende risici, herunder Firebase-adgangsregler og adskillelse mellem Nextcloud-konti.

---

## Licens

Dette projekt er licenseret under [GPLv3](../../LICENSE).
