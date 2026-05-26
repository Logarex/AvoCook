# AvoCook

AvoCook est une application mobile de recettes que je développe pour mon usage
personnel et pour apprendre à mener un projet React Native complet.

L'idée est simple : garder ses recettes au même endroit, pouvoir les utiliser
hors ligne, et synchroniser avec Nextcloud Cookbook si on a déjà un serveur.

[App Store](https://apps.apple.com/app/avocook/id6769012665) ·
[APK Android](https://github.com/Logarex/AvoCook/releases/latest)

<p align="center">
  <img src="assets/screenshots/login.png" width="280" alt="Connexion AvoCook" />
  <img src="assets/screenshots/recipe.png" width="280" alt="Détail d'une recette" />
</p>

## Ce que l'app sait faire

- créer et modifier des recettes en local ;
- classer les recettes par catégories ;
- ajouter des photos ;
- importer une recette depuis une URL quand le site expose des données
  `schema.org/Recipe` ;
- ajuster les quantités selon le nombre de portions ;
- lancer des minuteurs de cuisine ;
- exporter une recette en PDF ou l'imprimer ;
- sauvegarder/restaurer les recettes dans un fichier JSON ;
- synchroniser avec Nextcloud Cookbook, si l'utilisateur le souhaite.

Le mode local ne demande aucun compte. Les données restent sur le téléphone.

## Installation pour développer

Le projet utilise Expo, React Native et TypeScript.

```bash
npm install
npm run start
```

Ensuite, il suffit d'ouvrir l'app avec Expo Go ou avec un build de
développement.

Commandes utiles :

```bash
npm run typecheck
npm test
npm run lint
npm run import:check -- <url-de-recette>
```

## Nextcloud Cookbook

Pour tester la synchronisation :

1. installer l'application Cookbook sur une instance Nextcloud ;
2. créer un mot de passe d'application dans les paramètres de sécurité ;
3. renseigner l'URL du serveur, l'identifiant et ce mot de passe dans AvoCook.

L'app refuse les serveurs distants en HTTP. HTTP reste accepté pour `localhost`
pendant le développement.

## Android

Les APK sont publiés dans les releases GitHub. Le fichier principal à installer
est `avocook.apk`.

Les notes de publication Android sont dans
[`docs/ANDROID_DISTRIBUTION.md`](docs/ANDROID_DISTRIBUTION.md).

## Structure du projet

- `src/screens` : les écrans de l'application ;
- `src/components` : les composants réutilisables ;
- `src/features/recipes` : stockage local, synchronisation et logique recette ;
- `src/features/nextcloud` : client HTTP pour Cookbook ;
- `src/features/import` : import de recettes depuis une page web ;
- `modules/avocook-timer-notifications` : petit module natif pour les
  notifications de minuteur.

Des notes plus détaillées sont dans [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Licence

Le projet est sous licence [MIT](LICENSE).
