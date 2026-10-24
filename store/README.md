# Textes App Store et Google Play

Les textes sont conservés dans Git pour éviter de les ressaisir à chaque version.

## Préparer une version

1. Modifier une fois les textes permanents dans les fichiers de `store/locales/` (français, anglais, allemand, espagnol, italien et danois) : nom, sous-titre iOS, texte promotionnel iOS, description courte Android, description complète et mots-clés iOS. Les textes initiaux sont des propositions à relire avant le premier envoi.
2. Dans `store/release.json`, renseigner la version de `app.json` et les nouveautés par langue. Elles sont volontairement vides au départ : écrire les changements réels de la version. Le même texte alimente les deux stores, avec un maximum commun de 500 caractères.
3. Exécuter :

```sh
npm run store:check
npm run store:prepare
```

La préparation crée `store/generated/ios` et `store/generated/android`, aux formats Fastlane. Les fichiers `.txt` peuvent aussi être copiés dans les consoles, sans configurer de compte technique. Le dossier généré est ignoré par Git et recréé à chaque préparation réussie. Une validation en échec ne produit aucun fichier ; ne pas utiliser d'anciens fichiers après un échec.

Google Play n'a pas d'équivalent direct au texte promotionnel iOS dans cette fiche : sa description courte est conservée séparément.

Pour ajouter une langue, copier un fichier JSON, traduire tous ses champs et ajouter ses nouveautés dans `release.json`. Identifiants pris en charge : `fr-FR`, `en-US`, `de-DE`, `es-ES`, `it-IT`, `da-DK`.

## Envoyer les textes aux stores

Fastlane nécessite Ruby et Bundler. Installer les dépendances depuis la racine :

```sh
BUNDLE_GEMFILE=fastlane/Gemfile bundle install
```

### App Store Connect

Créer une clé API App Store Connect disposant des droits nécessaires. Fournir à Fastlane un fichier JSON de clé API, selon son [format documenté](https://docs.fastlane.tools/app-store-connect-api/#using-fastlane-api-key-json-file). Garder ce fichier et la clé privée hors du dépôt.

```sh
APP_STORE_CONNECT_API_KEY_PATH=/chemin/prive/apple-api.json BUNDLE_GEMFILE=fastlane/Gemfile bundle exec fastlane ios metadata
```

La commande prépare les fichiers puis met à jour (ou crée si nécessaire) la version éditable correspondant à `release.json`. Elle n'envoie aucun binaire et ne soumet pas la version à Apple. Fastlane présente son aperçu de métadonnées avant l'envoi. Certaines rubriques nécessitent une version modifiable dans App Store Connect.

### Google Play

Configurer un compte de service autorisé sur l'app dans Play Console ; conserver ses identifiants JSON hors du dépôt. Un build doit déjà exister sur la piste choisie. `PLAY_VERSION_CODE` est son code de version Android, et non la version commerciale `5.0.0`.

```sh
GOOGLE_PLAY_JSON_KEY=/chemin/prive/google-play.json PLAY_VERSION_CODE=123 PLAY_TRACK=internal BUNDLE_GEMFILE=fastlane/Gemfile bundle exec fastlane android metadata
```

Remplacer `123` par le code du build concerné. La piste par défaut est `internal` ; choisir explicitement `production` pour modifier les textes de cette piste. Les nouveautés sont appliquées au code demandé. Aucun APK/AAB n'est envoyé et aucun build n'est promu vers une autre piste. Les modifications de fiches sont enregistrées sur Google Play et peuvent être examinées par Google : ce n'est pas un simple aperçu local.

La soumission des builds via EAS reste séparée de ces commandes. Aucun envoi n'est effectué par `store:check` ou `store:prepare`.

Références : [Fastlane deliver (Apple)](https://docs.fastlane.tools/actions/deliver/), [Fastlane supply (Google Play)](https://docs.fastlane.tools/actions/supply/).
