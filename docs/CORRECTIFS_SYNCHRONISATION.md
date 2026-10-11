# Synchronisation et réinstallation — 11 octobre 2026

Périmètre : les problèmes signalés sur AvoCook 4.0.1, iPhone 14 Pro, iOS 27.0.1, Nextcloud 34.0.4 et Cookbook 0.11.10. L’intégration Pantry est exclue.

## Corrections

- Les créations et modifications sont enregistrées dans SQLite avec leur opération en attente, dans une même transaction. Les suppressions sont enregistrées avant l’appel réseau. Les anciens changements sans opération associée sont récupérés au prochain passage.
- Les opérations du dépôt de recettes sont exécutées dans l’ordre. Le remplacement d’un identifiant local par l’identifiant serveur conserve une correspondance, utilisée si une modification ou suppression avait été demandée avec l’ancien identifiant.
- Une création réussie conserve immédiatement son identifiant serveur : une panne lors du téléchargement de la réponse détaillée ne provoque plus une seconde création.
- Une erreur sur une opération ou une recette n’empêche plus les autres de se synchroniser. Les erreurs restent affichées et les opérations restent en attente. Les suppressions en attente ne sont pas réintroduites depuis la liste serveur. Les modifications non envoyées sont conservées, même si la recette a été supprimée sur le serveur.
- Une suppression déjà effectuée est acquittée après confirmation par une lecture retournant 404, y compris lorsque Cookbook répond 502 à la nouvelle tentative de suppression. Le nettoyage des photos ne précède plus la suppression distante.
- Les lectures JSON évitent le cache HTTP. Chaque synchronisation relit le contenu serveur des recettes sans modification locale en attente ; la tolérance de cinq secondes ne masque plus les éditions rapprochées. Les photos serveur remplacent les anciennes références locales, tout en conservant les préférences de la recette.
- La synchronisation reprend au retour au premier plan et toutes les minutes tant que l’application est active. Les sauvegardes et suppressions déclenchent également une synchronisation. La restauration des réglages précède la première synchronisation automatique.
- Les photos Cookbook utilisent les routes authentifiées de l’API, y compris les chemins contenant `index.php` ou un sous-dossier Nextcloud. Les références externes conservent leur URL et ne reçoivent pas le mot de passe Nextcloud. Les URL des photos serveur incluent leur date de modification pour renouveler le cache. Une image défaillante laisse place au secours, puis à l’initiale de la recette.
- Les réglages, le thème, le choix du mode local et la session Firebase complète sont migrés vers un stockage avec copie SecureStore. Les valeurs longues sont découpées et leur index est publié après les morceaux. Les valeurs existantes sont conservées lors de la migration. Les suppressions et renouvellements de session ne peuvent pas être annulés par une ancienne copie AsyncStorage.
- L’identité communautaire est conservée avec ses jetons d’authentification, pas seulement son UID. La liaison `communityId`, auparavant perdue lors de la normalisation des recettes, est maintenant conservée. Une première connexion Firebase échouée peut être retentée.
- « Suppe », « Soup », « Soupe », « Zuppa » et « Sopa » utilisent la traduction de la catégorie soupe. Les cartes traduisent aussi les catégories par défaut ; les valeurs stockées et les catégories personnalisées ne sont pas renommées.

## Vérification complémentaire

La seconde passe a trouvé et corrigé d’autres défauts :

- Les recettes, files d’attente et correspondances d’identifiants sont maintenant isolées par serveur et utilisateur. Le dépôt est lié au compte qui a lancé l’action ; un ancien appel ne bascule pas sur le nouveau compte. L’état de l’interface est recréé au changement de compte. Un client appartenant à un autre compte est refusé avant tout appel HTTP.
- La base existante est attribuée une seule fois au premier compte actif après migration. Les bases suivantes sont séparées, sans supprimer les données précédentes. Le mode local garde son propre espace : pour transférer ses recettes vers Nextcloud, utiliser l’export puis l’import de sauvegarde. Les anciennes installations ne contiennent pas de propriétaire par recette ; une bibliothèque déjà mélangée avant migration ne peut pas être démêlée automatiquement.
- Le nettoyage des photos conserve les références de tous les comptes, y compris les suppressions en attente. Les téléchargements authentifiés utilisent aussi l’identité d’authentification dans la clé de cache, sans l’exposer dans le nom du fichier.
- Un échec `401`, `403`, `429` ou `5xx` sur le secours `index.php` remonte comme tel, au lieu de devenir un faux `404`. La route Cookbook fonctionnelle est réutilisée. Une URL de connexion terminant par `index.php` retrouve la racine correcte pour WebDAV et l’identité du compte.
- Le délai WebDAV de quinze secondes couvre la lecture du corps de la réponse. Une page de connexion renvoyée avec HTTP 200 ne valide pas une écriture. L’identifiant utilisateur WebDAV est recherché de nouveau après une panne temporaire du service OCS.
- Les échecs de confirmation d’une suppression distante provoquent un état de synchronisation partiellement échoué tout en conservant la recette. Une recette absente de l’index mais retrouvée par son identifiant enregistre aussi ses modifications serveur dans SQLite.
- Une suppression d’une création locale retire sa ligne et sa file d’attente dans la même transaction. Une erreur disque annule les deux changements.
- Après une erreur de création, l’app recherche une recette distante de même nom et compare les champs de contenu avant de reprendre son identifiant. Le test coupe réellement la connexion HTTP après l’enregistrement serveur : il reproduisait une erreur 409 et deux entrées locales avant correction, puis une seule recette synchronisée après correction. Une simple égalité du nom ne suffit pas à acquitter l’opération.
- Une réponse de recette portant un autre identifiant est rejetée. Si l’identifiant est absent du corps, celui de la requête est conservé.

## Validation

Résultat : **301 tests réussis dans 29 fichiers**, soit 34 tests supplémentaires depuis la première passe (267 tests). TypeScript passe ; ESLint ne relève aucune erreur et conserve trois avertissements préexistants. Les exports Expo/Hermes iOS et Android réussissent.

Commandes :

```sh
npm run typecheck
npm test -- --reporter=dot
npm run lint
npx expo export --platform ios --platform android --output-dir /tmp/avocook-deep-export
```

Les tests de synchronisation utilisent de vraies bases SQLite en mémoire. Seize scénarios d’intégration exécutent le client HTTP sans remplacer `fetch`, contre un serveur de test sur `127.0.0.1` qui simule l’API Cookbook ; les autres tests injectent directement les pannes. Le serveur local nécessite l’autorisation d’écouter sur la boucle locale dans les environnements restreints. Ils couvrent le scénario de Lukas, les reprises après panne, les réponses partielles, les opérations concurrentes, le rollback des transactions, la conservation des photos et métadonnées, et le cache local désactivé. Les scénarios supplémentaires couvrent la migration, le changement de compte, les opérations d’une ancienne session, la rotation du mot de passe, la réponse POST perdue et une bibliothèque de 120 recettes avec au plus six lectures simultanées. Les tests de stockage simulent une désinstallation en supprimant AsyncStorage tout en conservant le trousseau ; ils vérifient notamment le même UID communautaire, les jetons longs, les caractères Unicode et une écriture interrompue.

Les exports Expo/Hermes vérifient l’intégration JavaScript pour iOS et Android. Ils ne constituent pas une compilation native ni une validation sur le serveur réel de Lukas.

## Limites et essai avant publication

La conservation après désinstallation dépend du trousseau iOS, du même appareil et de la même identité d’application. Elle ne remplace pas une sauvegarde des recettes et n’est pas une récupération de compte sur un autre appareil. SecureStore est supprimé à la désinstallation sur Android. Voir la [documentation Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/) et l’[interface de persistance Firebase](https://firebase.google.com/docs/reference/js/auth.reactnativeasyncstorage).

Les identités communautaires déjà perdues avant cette mise à jour ne peuvent pas être recréées à partir du pseudonyme ou des identifiants Nextcloud. Une récupération des publications existantes nécessite une vérification par l’administrateur ; les contrôles de propriété Firebase restent en place. Les réglages effacés avant la migration ne sont pas reconstituables non plus.

La récupération d’une création reste conditionnée à une recette distante retrouvable et au contenu identique. Une panne durable, un index incomplet ou une édition distante avant la réconciliation peuvent encore laisser une création en attente : cette comparaison ne garantit pas une exécution unique dans tous les cas. Le [service Cookbook 0.11.10](https://raw.githubusercontent.com/nextcloud/cookbook/v0.11.10/lib/Service/RecipeService.php) exige un nom de dossier unique ; le serveur HTTP de test reproduit aussi ce refus de doublon.

Les règles Firebase signalées dans l’[audit précédent](AUDIT_FIABILITE_SECURITE.md) restent non vérifiées. Ces tests ne valident pas les modifications simultanées sur deux appareils réels, les arrêts forcés du processus natif, les redirections de photos dans le moteur d’images iOS ni la configuration du serveur de Lukas.

Avant publication, tester avec un compte Nextcloud de test : créer une recette avec photo, la supprimer, couper puis rétablir le réseau pendant une modification, modifier une recette depuis Cookbook et revenir dans l’app. Vérifier ensuite la mise à jour depuis 4.0.1 et la réinstallation iOS après migration, avec une publication communautaire appartenant au compte de test. Vérifier les trois formes d’URL Nextcloud : racine, sous-dossier et `index.php`. Aucun identifiant ni serveur de Lukas n’a été utilisé ici.
