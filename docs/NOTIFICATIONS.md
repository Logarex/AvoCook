# Notifications gratuites — guide de mise en service

Cette procédure remplace le précédent backend Firebase Functions. **Ne passez pas Firebase à Blaze, n’activez pas Cloud Scheduler ni la suppression TTL Firestore, et ne souscrivez pas Workers Paid.** Aucun de ces services payants n’est nécessaire.

Les listes restent dans le projet Firebase existant **avocook-5eb31**, collection `sharedLists`. Aucun transfert de listes et aucune modification des règles Firestore ne sont requis. Le relais s’authentifie avec le jeton Firebase du téléphone pour vérifier son accès aux listes. Il ne reçoit aucun identifiant Nextcloud.

Le fonctionnement après installation :

1. Le téléphone enregistre une modification dans Firestore, comme auparavant.
2. Il prévient le relais Cloudflare Workers **Free**.
3. Le relais envoie une notification visible par le service gratuit Expo, puis Apple/Google.
4. Si le téléphone s’arrête juste après l’enregistrement, une tâche gratuite Cloudflare recherche les changements une fois par minute. Le téléphone destinataire n’a pas besoin d’ouvrir AvoCook. Les anciens téléphones émetteurs qui n’envoient pas le signal immédiat bénéficient aussi de ce rattrapage.

Cloudflare D1 conserve uniquement les identifiants techniques des éléments, les versions des listes, les jetons des téléphones et les envois à réessayer. Les noms des produits restent dans Firebase et ne figurent pas dans les messages push. Le relais traite les documents Firestore pour calculer les changements mais ne conserve pas les noms des produits.

## État de cette installation

Le relais est déjà déployé à l’adresse `https://avocook-notifications.77dj74wmzc.workers.dev` et sa base D1 est initialisée. Le secret Google est présent ; un test de lecture Firestore a réussi. La vraie adresse est désormais enregistrée dans `app.json` et l’ancienne adresse d’exemple est ignorée par `app.config.js`.

La clé APNs a été créée et associée à `org.epimac.avocook` dans Expo, sous l’équipe Apple `E5L7NC8M9T`. Cette association a été confirmée en lecture seule. La configuration iOS générée contient la capacité `aps-environment`. Les certificats et profils de signature du build iOS restent à configurer dans EAS, ainsi que les accès FCM v1 Android. Aucun abonnement payant n’a été activé par cette procédure.

## 1. Garder Firebase gratuit

Ouvrez [le projet Firebase AvoCook](https://console.firebase.google.com/project/avocook-5eb31/overview). Vérifiez que le forfait est **Spark**. Ne cliquez pas sur « Mettre à niveau » et n’associez pas de compte de facturation. Ne créez pas un nouveau projet : celui qui synchronise déjà les courses est conservé.

Le code Firebase Functions ajouté précédemment a été retiré du dépôt. Aucune commande `firebase deploy` n’est à exécuter. Les éventuelles anciennes collections `shoppingPushSubscriptions` / `shoppingPushDeliveries` ne sont pas utilisées par ce relais.

## 2. Créer le compte Cloudflare gratuit

Ouvrez [Cloudflare](https://dash.cloudflare.com/sign-up), créez un compte gratuit ou connectez-vous. Vérifiez votre adresse e-mail si demandé. Pour Workers, restez sur **Free** : aucun abonnement, domaine personnalisé ou carte bancaire n’est nécessaire pour cette procédure. L’adresse gratuite `workers.dev` suffit.

Si une étape propose Workers Paid, un achat ou un compte de facturation, ne la validez pas : ce n’est pas l’option utilisée ici.

## 3. Préparer le relais sur le Mac

Dans Terminal :

```sh
cd /Users/louischabert/GitHub/AvoCook
npm ci --prefix notification-relay
cd notification-relay
npx wrangler login
```

Le navigateur s’ouvre. Connectez-vous au compte Cloudflare gratuit et autorisez Wrangler à gérer le Worker et sa base D1. Cette autorisation n’active pas de forfait payant.

Créez la petite base technique gratuite :

```sh
npx wrangler d1 create avocook-notifications
```

Si cette base existe déjà dans votre compte, récupérez son identifiant dans le tableau de bord D1 au lieu d’en créer une seconde.

La commande affiche un `database_id`. Ouvrez `notification-relay/wrangler.toml` dans l’éditeur et remplacez seulement :

```toml
database_id = "REPLACE_WITH_FREE_D1_DATABASE_ID"
```

par cet identifiant, en conservant les guillemets. Puis, toujours depuis le dossier `notification-relay` :

```sh
npx wrangler d1 execute avocook-notifications --remote --file schema.sql
npm test
npm run deploy
```

Wrangler affiche une adresse comme `https://avocook-notifications.VOTRE-SOUS-DOMAINE.workers.dev`. Notez **l’adresse réellement affichée**. Aucun nom de domaine à acheter.

## 4. Autoriser le rattrapage à lire Firebase

Le relais a besoin d’un compte technique **en lecture seule** pour vérifier les changements lorsque les téléphones sont fermés. Cela n’active pas la facturation Google et ne nécessite pas Firebase Functions.

1. Ouvrez [les comptes de service du projet existant](https://console.cloud.google.com/iam-admin/serviceaccounts?project=avocook-5eb31).
2. Cliquez sur **Créer un compte de service**.
3. Donnez-lui le nom `avocook-notification-reader`.
4. À l’étape des autorisations, choisissez le rôle **Cloud Datastore Viewer**, identifiant `roles/datastore.viewer`. Ce rôle permet la lecture Firestore ; ne choisissez pas Owner, Editor ou Firebase Admin.
5. Terminez la création. L’étape proposant d’autoriser des utilisateurs à utiliser ce compte peut rester vide.
6. Ouvrez ce compte, onglet **Clés / Keys → Ajouter une clé → Créer une clé → JSON**. Le navigateur télécharge un fichier.
7. Sur votre Mac, placez ce fichier dans `AvoCook/notification-relay/` et renommez-le **service-account.json**. Ce nom est exclu de Git. Ne copiez jamais son contenu dans le chat, le code de l’app ou une variable `EXPO_PUBLIC_*`.
8. Depuis Terminal, dans `notification-relay` :

```sh
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT < service-account.json
```

Le JSON est envoyé au stockage de secrets du Worker. Il ne fait pas partie de l’app distribuée. Le compte peut lire Firestore mais ne peut pas écrire les listes. L’autorisation normale de chaque téléphone continue d’être vérifiée avec les règles Firestore existantes.

Si l’organisation Google interdit la création de clés, cette étape nécessitera l’aide de son administrateur ; ne remplacez pas ce blocage par une activation de facturation.

Ouvrez ensuite **votre adresse Worker suivie de `/health`** dans le navigateur. La réponse doit contenir `"configured": true`. Ce contrôle vérifie la présence de la configuration ; le test réel de l’étape 7 vérifie les autorisations et la livraison.

La tâche de rattrapage `* * * * *` est déjà déclarée dans `wrangler.toml`. Il ne faut pas créer une tâche Google Cloud Scheduler. Cloudflare peut prendre quelques minutes pour propager le premier Cron Trigger.

## 5. Relier l’app au Worker

Dans le terminal utilisé pour construire l’app, revenez au dossier AvoCook et définissez l’adresse obtenue à l’étape 3 :

```sh
cd /Users/louischabert/GitHub/AvoCook
export EXPO_PUBLIC_SHOPPING_PUSH_RELAY_URL="https://VOTRE-ADRESSE-REELLE.workers.dev"
```

Cette adresse est publique, contrairement à la clé Google. `app.config.js` l’intègre à la configuration de l’app. Pour une construction depuis un autre terminal ou une CI, définissez la même variable dans cet environnement. Ne placez pas la clé JSON dans cette variable.

Sans adresse configurée, les listes continuent de se synchroniser mais les notifications distantes sont signalées indisponibles. Une panne ou l’épuisement d’un quota Cloudflare n’empêche pas une écriture Firestore réussie.

## 6. Réutiliser les accès Apple/Android et reconstruire

Le relais gratuit ne remplace pas les accès système indispensables à une app iPhone/Android. Réutilisez les comptes développeur et les identifiants déjà utilisés pour publier AvoCook ; ce changement ne demande pas de nouvel abonnement Expo ou Firebase. Les éventuels frais existants de distribution en boutique sont indépendants du service de notifications.

- **Android** : dans les paramètres du projet Firebase existant, utilisez l’app Android de package `app.avocook.mobile`, ou ajoutez-la à ce même projet si elle n’existe pas. Téléchargez son `google-services.json`. Fournissez son chemin via la variable `GOOGLE_SERVICES_JSON` lors de la génération native. Dans les identifiants de votre projet Expo/EAS, configurez l’accès **FCM v1**. N’utilisez pas la clé de lecture seule de l’étape 4 pour l’envoi FCM : ce sont deux accès différents.
- **iPhone** : réutilisez ou configurez la clé **APNs** de `org.epimac.avocook` dans les identifiants Expo/EAS. La capacité Push Notifications doit être activée dans la version générée. `expo-notifications` est déjà ajouté à la configuration Expo.

Les écrans et les étapes d’identifiants sont détaillés dans [le guide officiel Expo](https://docs.expo.dev/push-notifications/push-notifications-setup/).

Reconstruisez les projets natifs avec la configuration mise à jour selon votre procédure habituelle. Une mise à jour JavaScript seule ne suffit pas à ajouter les capacités push. Pour éviter toute consommation de crédits de compilation cloud, les builds EAS peuvent être exécutés localement sur le Mac, avec vos outils et identifiants habituels :

```sh
# À exécuter depuis AvoCook, avec la variable de l’étape 5 définie.
eas build --local --platform ios --profile production
eas build --local --platform android --profile production
```

Un build local nécessite les outils natifs de la plateforme. Avant la construction Android, définissez également `GOOGLE_SERVICES_JSON` vers le fichier téléchargé. Si vous conservez des dossiers natifs générés manuellement, synchronisez leur configuration Expo avant la compilation ; les projets régénérés par Expo intègrent automatiquement le plugin de notifications.

## 7. Vérifier avec deux téléphones

1. Installez la nouvelle version sur le téléphone destinataire. Ouvrez AvoCook une fois, autorisez les notifications et activez les notifications de courses.
2. Rejoignez la même liste partagée Firebase que sur l’autre téléphone. Les listes locales et Nextcloud Pantry ne passent pas par ce relais.
3. Verrouillez le téléphone destinataire.
4. Ajoutez un produit sur l’autre téléphone. La notification doit arriver sans ouvrir AvoCook : en général peu après l’enregistrement, ou après le prochain passage de rattrapage si le signal immédiat n’a pas abouti. Le rattrapage s’exécute une fois par minute ; ce n’est pas une garantie de livraison en moins de 60 secondes.
5. Vérifiez aussi le premier ajout à une liste vide et la suppression d’un produit. Le téléphone qui modifie la liste ne doit pas se notifier lui-même.
6. Rouvrez AvoCook : aucune alarme locale de courses ne doit apparaître en doublon.
7. Désactivez les notifications de courses pendant que le téléphone est connecté. Les changements suivants ne doivent plus produire de notification.
8. Pour vérifier le chemin de rattrapage, un ancien téléphone émetteur peut modifier la même liste sans disposer du nouveau signal au Worker. Le destinataire mis à jour doit tout de même recevoir la notification après le passage serveur.

Pour voir les erreurs du relais :

```sh
cd /Users/louischabert/GitHub/AvoCook/notification-relay
npx wrangler tail
```

Aucun journal ne doit contenir de jeton de téléphone, de jeton Firebase ou de clé privée. Si les notifications immédiates fonctionnent mais pas le rattrapage, vérifiez la clé Google, son rôle en lecture seule, le Cron Trigger et le quota de lectures Firestore.

## Gratuité et limites

La gratuité repose sur **Firebase Spark + Workers Free/D1 Free + Expo Push**. N’activez aucun forfait payant. Aux limites gratuites, le service peut devenir temporairement indisponible ; il n’y a pas de dépassement facturé sur ces offres gratuites.

- Firestore Spark : quota partagé avec le reste d’AvoCook, actuellement 50 000 lectures et 20 000 écritures par jour. Le rattrapage ajoute normalement environ 1 440 requêtes par jour lorsqu’il existe des téléphones inscrits, plus les documents effectivement retournés. Sans téléphone inscrit, aucune requête périodique Firebase n’est effectuée.
- Workers Free : actuellement 100 000 requêtes par jour, avec des limites de calcul et de sous-requêtes.
- D1 Free : actuellement 5 millions de lignes lues et 100 000 lignes écrites par jour, avec des limites de stockage. Les opérations de maintenance et d’indexation participent à la consommation.
- Expo : l’envoi push est gratuit, avec une limite de débit. Le relais groupe au plus 100 messages par requête.

Les notifications non envoyées expirent après une heure. Les reçus d’envoi sont vérifiés après quinze minutes, les envois sont supprimés après deux jours et les inscriptions expirent après 90 jours sans renouvellement. Jusqu’à 100 téléphones par liste sont pris en charge. Le rattrapage observe l’état actuel de chaque liste : plusieurs modifications intervenues entre deux passages peuvent être regroupées. Une livraison exactement une fois ne peut pas être garantie entre D1, Expo et Apple/Google, notamment si une réponse réseau est perdue après l’acceptation d’un message.

Sources : [Firebase Spark](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans), [Workers Free](https://developers.cloudflare.com/workers/platform/limits/), [D1 Free](https://developers.cloudflare.com/d1/platform/pricing/), [Expo gratuit](https://docs.expo.dev/push-notifications/faq/), [accès Firestore REST](https://firebase.google.com/docs/firestore/use-rest-api).

## Rappels et minuteurs

Les rappels de péremption et les minuteurs restent programmés sur le téléphone. Aucun Worker, Firebase Functions ou service payant n’est nécessaire pour leur déclenchement. Les corrections de programmation, d’autorisation, de restauration après redémarrage Android et de suppression des vibrations tardives sont conservées.

Testez séparément un minuteur court téléphone verrouillé, son annulation et, sur Android, un redémarrage avec un minuteur actif. Pour les péremptions, testez un produit expirant aujourd’hui et un produit expirant demain ajouté après 09:00. Les rappels ne doivent pas être repoussés ou répétés à chaque ouverture.
