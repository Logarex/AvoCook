# Confidentialité et données

Mise à jour : 14 octobre 2026. AvoCook ne contient ni publicité ni outil d’analyse. Certaines fonctions utilisent les services réseau décrits ci-dessous.

## Recettes, Nextcloud et sauvegardes

Les recettes et photos locales sont conservées sur votre appareil. Elles sont transmises lorsque vous choisissez de les synchroniser, partager, exporter ou publier. Avec Nextcloud Cookbook ou Pantry, les échanges se font directement avec le serveur choisi. Les copies Pantry et les transferts en cours sont séparés par compte Nextcloud. La déconnexion ne copie pas automatiquement les articles Pantry dans la liste locale.

Les identifiants Nextcloud et les clés API d’IA sont conservés dans le stockage sécurisé du système via Expo SecureStore. Les recettes, photos et préférences ordinaires utilisent SQLite, des fichiers ou le stockage de l’application. iOS peut conserver le stockage sécurisé après une réinstallation ; une sauvegarde de l’appareil peut aussi restaurer des données. Exportez vos recettes avant de désinstaller l’application.

HTTPS est utilisé par défaut. Un serveur configuré explicitement en HTTP transmet identifiants, recettes et images sans chiffrement du transport. L’application affiche un avertissement à la connexion. Les fichiers exportés peuvent contenir des photos et des informations personnelles : choisissez où vous les partagez.

## Firebase, communauté et listes partagées

AvoCook ouvre une session Firebase anonyme au démarrage, y compris en mode local. Firebase reçoit cet identifiant et les informations réseau nécessaires à la connexion. Aucun e-mail ni mot de passe n’est demandé pour cette session.

Les recettes communautaires, noms d’auteurs, profils, notes, signalements et listes partagées utilisent Firebase. Les recettes publiées sont visibles par les autres utilisateurs. Toute personne disposant du code d’une liste peut la rejoindre. Évitez de publier des informations privées. Les règles d’accès et la conservation côté Firebase sont gérées séparément de l’application. Une déconnexion ou un effacement local ne supprime pas les contenus distants.

## Importation, IA et traduction

L’importation par URL télécharge directement la page choisie. Le site reçoit les informations habituelles d’une requête réseau.

L’analyse et la génération par IA, facultatives, transmettent la photo sélectionnée ou le texte saisi au fournisseur configuré dans les Réglages, avec votre clé API. L’accès à l’appareil photo et à la photothèque permet aussi d’ajouter des images locales. Les images de recettes synchronisées, partagées ou publiées peuvent quitter l’appareil.

La traduction automatique des recettes communautaires transmet leur texte à Google Translate, puis à MyMemory en cas d’échec. Elle n’utilise pas votre clé API d’IA. Les recettes déjà chargées et les traductions réussies sont conservées sur l’appareil pour une lecture hors ligne. Ces fournisseurs traitent les requêtes selon leurs propres conditions et politiques de confidentialité.

## Rappels Apple, mises à jour et diagnostic

Si vous l’activez, la synchronisation des courses lit et écrit dans Rappels. Apple peut synchroniser ces articles via votre compte, notamment les listes iCloud partagées, selon vos réglages.

Les installations Android par APK recherchent les versions sur GitHub. Les installations issues d’une boutique utilisent cette boutique pour les mises à jour. Ouvrir un lien de recette, d’assistance ou de fournisseur contacte le site concerné.

Les journaux de diagnostic sont locaux. Les secrets sont masqués, mais des informations personnelles peuvent rester dans un rapport. Vérifiez-le avant de le copier ou de le partager. Aucun rapport n’est envoyé automatiquement.

## Contact

Utilisez [le dépôt GitHub](https://github.com/Logarex/AvoCook) ou le bouton de contact dans l’application.
