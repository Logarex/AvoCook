# Distribution Android

Notes personnelles pour publier l'APK Android sans passer tout de suite par le
Play Store.

## Canal principal

Pour l'instant, le plus simple est de publier un APK universel dans les releases
GitHub :

- tag Git au format `v2.0.3` ;
- release publique, pas en brouillon ;
- fichier attaché nommé `avocook.apk`.

Ce nom reste volontairement simple. Les utilisateurs n'ont pas à choisir une
architecture CPU.

## Avant une release

1. Mettre à jour `expo.version` dans `app.json`.
2. Lancer les vérifications locales :

   ```bash
   npm run typecheck
   npm test
   npm run lint
   ```

3. Générer un build Android signé.
4. Créer le tag et la release GitHub.
5. Joindre `avocook.apk`.
6. Installer l'ancienne version sur un téléphone et vérifier que le bandeau de
   mise à jour détecte la nouvelle release.

Le vérificateur de mise à jour compare la version Expo de l'app au dernier tag
GitHub.

## IzzyOnDroid

IzzyOnDroid est le premier dépôt Android à viser, parce qu'il accepte les APK
publiés sur GitHub Releases.

À garder sous la main pour une demande d'ajout :

- nom : AvoCook ;
- package : `app.avocook.mobile` ;
- dépôt : `https://github.com/Logarex/AvoCook` ;
- releases : `https://github.com/Logarex/AvoCook/releases` ;
- licence : MIT ;
- fichier APK : `avocook.apk`.

Résumé court :

```text
AvoCook est un carnet de recettes pour Android et iOS. Il fonctionne hors ligne
et peut aussi se synchroniser avec une instance Nextcloud Cookbook.
```

Points importants :

- pas de publicité ;
- pas d'analytics ;
- pas de compte obligatoire en mode local ;
- pas de dépendance volontaire à Google Play Services ;
- synchronisation uniquement avec le serveur Nextcloud choisi par l'utilisateur.

Si l'APK universel est jugé trop lourd, générer aussi un APK `arm64-v8a` pour
IzzyOnDroid. Garder quand même `avocook.apk` pour les releases publiques.

## F-Droid

F-Droid sera plus compliqué, car le dépôt reconstruit les applications depuis le
code source. Il faudra probablement stabiliser le projet Android natif généré
par Expo avant de faire une demande sérieuse.

Commande de départ probable :

```bash
npm ci
npx expo prebuild --platform android --clean
cd android
./gradlew assembleRelease
```

Ne pas s'engager sur F-Droid avant d'avoir vérifié que ce build est
reproductible dans un environnement propre.

## Taille de l'APK

L'APK universel est gros parce qu'il contient les bibliothèques natives pour
plusieurs architectures. Pour inspecter un APK :

```bash
unzip -l avocook.apk | sort -nr -k1 | head -40
```

Les dossiers à regarder :

```text
lib/arm64-v8a/
lib/armeabi-v7a/
lib/x86_64/
```

Les splits ABI sont configurés par `plugins/withAndroidSplitsAndOptimizations.js`.
Je préfère ne pas rendre ces variantes visibles aux utilisateurs tant que le
téléchargement direct GitHub reste le canal principal.
