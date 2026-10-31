# AvoCook

[English](../../README.md) · [Français](README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) · [Italiano](../it/README.md) · [Dansk](../da/README.md)

AvoCook est une application gratuite et open source pour iOS et Android. Je la développe à côté de mes études pour garder mes recettes, prévoir mes repas et me faciliter un peu la cuisine au quotidien.

[App Store](https://apps.apple.com/app/avocook/id6769012665) · [Google Play](https://play.google.com/store/apps/details?id=app.avocook.mobile) · [APK](https://github.com/Logarex/AvoCook/releases/latest)

## Utiliser AvoCook

### Toutes vos recettes au même endroit

Écrivez vos recettes, ajoutez des photos et des catégories, puis adaptez les quantités aux portions. Ingrédients et étapes acceptent le Markdown facultatif. Collez un lien ou partagez-le depuis le navigateur pour importer une recette, puis vérifiez le résultat avant de l’enregistrer. Vous pouvez aussi imprimer ou partager une recette seule.

### Gardez un œil sur vos réserves

Organisez le frigo, le placard et le congélateur avec les quantités et les dates. Ajoutez un aliment par code-barres, consultez les scores disponibles d’Open Food Facts et activez les rappels de péremption.

Saisissez vous-même la date du paquet. La recherche par code-barres utilise Internet ; les fiches et les scores peuvent manquer. Les réserves et le planning restent accessibles hors ligne.

### Préparez vos repas du jour et de la semaine

Ajoutez des recettes, des repas simples, des restes ou des sorties. Ajustez les portions, déplacez les repas et choisissez les ingrédients à acheter. Enregistrez vos menus et retrouvez vos repas dans l’historique.

### Cuisinez étape par étape

Suivez vos recettes avec des minuteurs qui reprennent à votre retour. Les appareils compatibles proposent des commandes vocales locales. Gardez vos notes dans un carnet privé et préparez plusieurs recettes ensemble.

### Trouvez des idées pour le quotidien

Cherchez des recettes avec vos ingrédients, consultez les produits de saison de 11 calendriers régionaux, les conversions et les substitutions de pâtisserie. Sauvegardez vos recettes avec les données privées de votre cuisine.

Les calendriers couvrent la France métropolitaine, la Wallonie, la Suisse, l’Allemagne, l’Espagne, l’Italie, le Royaume-Uni, le Danemark, l’Ontario, l’État de New York et Sydney. La couverture et le sens des disponibilités dépendent de chaque source.

### Un assistant frigo facultatif

Saisissez vos ingrédients ou partez d’une photo du frigo, vérifiez la liste et demandez un brouillon de recette modifiable. Votre fournisseur, votre clé API et un modèle compatible sont nécessaires ; des frais peuvent s’appliquer.

### Votre livre de recettes illustré

Choisissez des recettes et un titre pour créer un livre PDF avec couverture, sommaire, photos, ingrédients et étapes. Les images de votre bibliothèque locale et de Nextcloud sont intégrées lorsqu’elles sont disponibles.

Les notes du carnet privé ne sont pas incluses dans le livre. Le PDF est créé sur l’appareil ; les images Nextcloud peuvent nécessiter un téléchargement.

### Les courses, seul ou à plusieurs

Utilisez une liste locale, invitez vos proches dans une liste AvoCook avec un code à six caractères ou connectez une liste de foyer Nextcloud Pantry. Choisissez les ingrédients à ajouter depuis les recettes et le planning. Sur iOS, Rappels peut se synchroniser avec le mode actif. Les listes partagées AvoCook proposent des notifications lorsque les autres participants ajoutent ou retirent des produits.

### Les recettes de la communauté

Découvrez, notez et importez les recettes partagées par les autres utilisateurs. Vous pouvez les lire dans votre langue ou consulter l’original. Un profil communautaire permet de publier vos propres recettes. Les recettes chargées et les traductions réussies restent en cache sur l’appareil.

### Sur téléphone et tablette

Les cinq onglets sont Recettes, Ma cuisine, Planning, Communauté et Courses. Les grands écrans peuvent afficher une navigation latérale et des vues en colonnes ; la taille du texte est prise en compte. Les iPhone compatibles utilisent les commandes natives Liquid Glass.

### Vos données et vos connexions

Les recettes fonctionnent en local sans créer de compte. Connectez Nextcloud Cookbook pour synchroniser les recettes avec votre serveur. Planning, réserves et notes privées restent sur l’appareil, séparément pour chaque compte de recettes ; Cookbook ne les synchronise pas. Exportez seulement les recettes ou créez une sauvegarde complète avec les photos disponibles et les données privées de votre cuisine.

La communauté et les listes partagées utilisent Firebase, avec une session anonyme au démarrage. Les imports web, la recherche de produits et l’assistant facultatif contactent leurs services respectifs. La reconnaissance vocale utilise un moteur local compatible, sans relais dans le cloud.

## Langues disponibles

Français · Anglais · Allemand · Espagnol · Italien · Danois

## Guides

- [Guide de la cuisine](GUIDE.md)
- [Vos données et vos connexions](PRIVACY.md)
- [Documentation technique](../LOCAL_KITCHEN.md) · [Nextcloud Pantry](../NEXTCLOUD_PANTRY.md) · [Seasonal catalog](../SEASONAL_CATALOG.md)

## Configuration pour le développement

Le projet utilise Expo SDK 57, React Native 0.86 et TypeScript. Node.js >=22.13 et <27 est requis. Les builds iOS locaux utilisent Xcode 27 et Device Hub ; la version minimale d'iOS prise en charge est 16.4.

Les builds Android locaux nécessitent JDK 17 et Android SDK 36. Définissez `JAVA_HOME` vers votre installation de JDK 17 si votre système utilise encore une version plus ancienne de Java par défaut.

```bash
npm ci
npm run ios      # Simulateur iOS
npm run android  # Émulateur Android
```

Après modification des dépendances natives, lancez `npx expo prebuild --clean` et recompilez. Les commandes vocales locales et rappels de stock nécessitent les modules natifs locaux ; Expo Go ne suffit pas.

Un build de développement avec les modules natifs est compilé au premier lancement. Ensuite, l'application s'ouvre directement.

Les projets `ios/` et `android/` sont générés à partir de `app.json`, de `tools/plugins/` et des modules locaux de `src/modules/`. Après une mise à jour du SDK ou des dépendances natives, régénérez-les avec `npx expo prebuild --clean` avant de compiler à nouveau. Le plugin `expo-build-properties` active le cycle de vie UIKit fondé sur les scènes, requis par Xcode 27.

Commandes utiles :

```bash
npm run typecheck                       # Vérifications TypeScript
npm test                                # Tests unitaires (Vitest)
npm run lint                            # ESLint
npm run import:check -- <url-recette>   # Tester l'import depuis une URL
```

---

## Structure du projet

```
src/
├── App.tsx                              # Point d'entrée, navigation
├── screens/                             # Écrans (liste, détail, éditeur, paramètres…)
├── components/                          # Composants UI réutilisables
├── features/
│   ├── kitchen/                         # Ma cuisine — les repas du quotidien, en local
│   ├── community/                       # Firebase
│   ├── recipes/                         # Stockage local (SQLite), logique recettes, backup
│   ├── nextcloud/                       # Client HTTP pour Nextcloud Cookbook
│   ├── import/                          # Import depuis URL et photo
│   ├── shopping/                        # Liste de courses et synchronisation Rappels iOS
│   ├── timers/                          # Minuteurs de cuisson
│   ├── preferences/                     # Paramètres de l'application
│   └── auth/                            # Authentification Nextcloud
├── i18n/                                # Internationalisation (i18next, 6 langues)
├── modules/
│   └── avocook-timer-notifications/     # Module natif pour les notifications minuteur
└── theme/                               # Couleurs, typographie, styles partagés
tools/                                   # Plugins de build, vérificateur d'import, assets
docs/                                    # Documentation dans d'autres langues (fr, de, es, it, da)
```

---

## Nextcloud Cookbook

Pour tester la synchronisation :

1. Installez l'[application Cookbook](https://apps.nextcloud.com/apps/cookbook) sur une instance Nextcloud.
2. Créez un **mot de passe d'application** dans les paramètres de sécurité (Paramètres → Sécurité → Appareils et sessions).
3. Dans AvoCook, allez dans les paramètres et entrez l'URL du serveur, le nom d'utilisateur et ce mot de passe.

HTTPS est utilisé par défaut si aucun protocole n'est indiqué. Pour un serveur Nextcloud sur votre réseau local de confiance, saisissez une adresse HTTP explicite, comme `http://192.168.1.50:8080/nextcloud` ou `http://nextcloud.local`. HTTP transmet votre mot de passe d'application et vos recettes sans chiffrement ; utilisez-le uniquement sur un réseau de confiance. Les identifiants restent chiffrés dans le trousseau de l'appareil.

---

## Android

Les APK sont publiés dans les [releases GitHub](https://github.com/Logarex/AvoCook/releases). Téléchargez `avocook.apk` et installez-le directement.

---

## Contribuer

Les pull requests sont les bienvenues. Consultez [CONTRIBUTING.md](../../.github/CONTRIBUTING.md) pour les conventions et le modèle de PR.

---

## Soutenir le projet ☕

Si AvoCook vous est utile, vous pouvez aider à couvrir les frais :

**[→ Faire un don via Revolut](https://revolut.me/logarex)** · **[→ Faire un don via PayPal](https://paypal.me/logarex31)**

---

## Site web

La vitrine est dans `site/`, avec les textes en six langues dans `site/main.js`. La commande ci-dessous prépare les mêmes fichiers que GitHub Pages, captures comprises. Le site est déployé sur `gh-pages` lors des envois vers `main`, ou via le workflow manuel Deploy site ; un envoi sur cette branche seule ne le publie pas.

```bash
node tools/scripts/build-site.mjs
python3 -m http.server 8765 --bind 127.0.0.1 --directory dist/site
```

[http://127.0.0.1:8765/](http://127.0.0.1:8765/)

---

## Licence

Ce projet est sous licence [GPLv3](../../LICENSE).
