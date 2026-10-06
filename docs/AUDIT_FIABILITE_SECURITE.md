# Vérification de fiabilité, stabilité et sécurité

Date : 6 octobre 2026. Périmètre : application AvoCook, SQLite, synchronisation Nextcloud, communautés et listes partagées Firebase, stockage des identifiants, journaux et dépendances.

Plusieurs défauts concrets ont été corrigés et couverts par des tests. La sécurité de la base cloud reste **non vérifiée** : les règles Firestore et Storage déployées ne sont pas présentes dans le dépôt et aucun accès d'administration n'a été fourni. La console du projet a été ouverte en lecture seule dans le navigateur disponible ; elle demande une connexion Google. Les correctifs de l'application ne permettent pas de certifier les droits côté serveur.

## Corrections effectuées

| Domaine | Défaut constaté | Correction |
| --- | --- | --- |
| Identifiants Nextcloud | Une image externe imitant un chemin Cookbook pouvait recevoir l'en-tête Basic Auth. | En-têtes accordés uniquement aux points d'accès d'images Cookbook du serveur configuré, avec contrôle du protocole, domaine, port et chemin d'installation. Toutes les utilisations dans les listes, détails, éditeur, sauvegardes et impressions passent l'URL au contrôle. |
| Connexion et déconnexion | Construire un client de validation remplaçait le client global actif ; celui-ci restait accessible après déconnexion pour les notes de recettes. | Activation explicite du client connecté et retrait lors de la déconnexion ou du passage en mode local. Validation de la forme des identifiants relus depuis SecureStore. |
| Suppressions Nextcloud | Une erreur réseau, HTTP 401 ou HTTP 503 pendant la confirmation d'une absence pouvait supprimer la copie locale et ses données personnelles. | Suppression locale uniquement après une réponse HTTP 404 explicite. Conservation de la recette en cas d'échec de confirmation. |
| Création Nextcloud | La copie locale était supprimée avant d'avoir enregistré la réponse du serveur ; une erreur SQLite pouvait perdre la recette. | Enregistrement de la copie serveur avant retrait de la copie locale. Échec de sauvegarde capturé et création conservée dans la file de synchronisation. |
| Modifications pendant une synchronisation | La fin d'un ancien envoi pouvait remplacer une modification plus récente et effacer sa file d'attente. | Acquittement transactionnel des mises à jour de recettes existantes, avec comparaison du contenu et de l'opération encore en attente. Une modification plus récente reste enregistrée et à synchroniser. |
| Préférences locales | Modifier l'affichage ou les minuteurs pouvait effacer le statut « à synchroniser » ou remettre un ancien titre. | Mise à jour des seules métadonnées locales sur la version stockée, en conservant le contenu et le statut de synchronisation. Les préférences effacées pendant l'envoi restent effacées. |
| SQLite | Des écritures concurrentes pouvaient se mélanger pendant le remplacement des opérations en attente. | Accès SQLite sérialisés ; remplacement de la file dans une transaction avec rollback en cas d'échec. Index sur l'identifiant de recette dans la file. |
| Données SQLite abîmées | Un seul JSON illisible pouvait bloquer toute la bibliothèque ou son nettoyage. | Recettes valides lisibles, lignes abîmées conservées et signalées dans les journaux. Les opérations de synchronisation invalides provoquent un arrêt explicite sans effacement. L'ouverture de la base peut être retentée après un échec. |
| État de synchronisation | Une erreur de lecture AsyncStorage pouvait laisser le verrou de synchronisation bloqué. | Libération du verrou dans tous les cas ; les erreurs du marqueur de première synchronisation ne bloquent plus Nextcloud. Erreurs de rechargement et de nettoyage prises en charge. |
| Chemins WebDAV | Des segments `.` ou `..` pouvaient déplacer une opération de fichier hors du dossier prévu. | Rejet de ces chemins et des noms de dossier Cookbook réservés avant une opération destructive. Tolérance aux pourcentages littéraux dans les noms de photos. |
| Communautés | L'argument `authorUid` était accepté sans comparaison avec l'utilisateur réellement authentifié ; les recettes sans propriétaire étaient modifiables. | Mise à jour et suppression réservées à l'auteur authentifié, propriétaire du document. Publication refusée en l'absence d'authentification. Ces contrôles doivent aussi être imposés par les règles Firestore. |
| Lecture Firestore | Des champs de type inattendu pouvaient faire échouer l'affichage. | Validation des textes, tableaux, durées, langues, dates, liens, portions et valeurs numériques avant affichage. |
| Pagination | Le curseur avançait au dernier document téléchargé, au lieu du dernier document affiché, et sautait les recettes restantes. | Curseur tenant compte des résultats effectivement retournés ; maintien de la pagination lorsqu'un lot contient encore des résultats ou nécessite de poursuivre le filtrage. |
| Votes et pseudonymes | Lectures puis écritures séparées pouvaient produire des agrégats incohérents ou écraser une réservation concurrente. | Transactions Firestore pour la note et son agrégat, ainsi que pour la réservation d'un pseudonyme. Rejet des notes non entières, infinies ou hors de 1 à 5. |
| Authentification Firebase | Un ancien UID restait en mémoire après un échec de réauthentification ; l'attente initiale pouvait être infinie. | UID retiré à la perte de session ; attente initiale bornée à 15 secondes. |
| Listes partagées | Codes générés avec `Math.random`, créations et départs non atomiques, recréation possible d'une liste supprimée. | Générateur cryptographique, validation des codes, transactions de création et de départ. Les modifications utilisent une mise à jour qui échoue si la liste n'existe plus. |
| Journaux | Les champs de clés API n'étaient pas tous masqués. | Masquage de `apiKey`, `api_key` et `x-api-key`, y compris dans les objets imbriqués et les textes exportés. |

Sources des corrections : [base locale](../src/features/recipes/offlineDatabase.ts), [synchronisation](../src/features/recipes/recipeRepository.ts), [client Nextcloud](../src/features/nextcloud/cookbookClient.ts), [état des recettes](../src/features/recipes/RecipesProvider.tsx), [authentification Nextcloud](../src/features/auth/AuthProvider.tsx), [communautés](../src/features/community/communityClient.ts), [listes partagées](../src/features/shopping/sharedListClient.ts), [authentification Firebase](../src/features/firebase/firebaseClient.ts) et [journaux](../src/features/logging/logService.ts).

## Vérifications et limites

- Suite complète : **205 tests réussis dans 25 fichiers**, dont 42 tests ajoutés pour cette vérification.
- TypeScript : `npm run typecheck` réussit.
- ESLint : aucune erreur ; 6 avertissements existants. Les dossiers natifs générés `ios/` et `android/`, déjà exclus de Git, sont exclus du lint. Les modules locaux de `src/modules/` restent inclus.
- Export de production JavaScript/Hermes pour **iOS et Android** réussi. Cela ne constitue pas une compilation native ni un essai sur appareil.
- `npm ls --depth=0` réussit ; la vérification en ligne `expo install --check` indique des dépendances à jour.
- Les tests couvrent HTTPS et HTTP explicite, une installation Nextcloud en sous-dossier, le secours `index.php` avec conservation du corps POST et des identifiants, les identifiants utilisateur WebDAV distincts du login, le point d'accès WebDAV historique et le secours MKCOL. Le protocole et les mécanismes de connexion existants sont conservés.
- Les tests SQLite exécutent les requêtes sur une vraie base SQLite en mémoire avec un adaptateur Node. Ils couvrent les paramètres SQL contenant des tentatives d'injection, le rollback, les mises à jour concurrentes, la corruption et la conservation des changements en attente. Aucun contenu réel de la base d'un utilisateur n'a été modifié pendant l'audit.
- Les tests Nextcloud simulent les réponses réseau. Les tests Firebase simulent le SDK : ils vérifient le comportement du client, pas les règles déployées ni la concurrence réelle du service.
- Recherche de formats courants de clés privées, clés AWS et jetons GitHub dans les fichiers suivis : aucun résultat. Cette recherche n'est pas une preuve exhaustive d'absence de secrets. La configuration Firebase cliente est publique ; aucun compte de service administrateur n'a été utilisé.
- Pas de connexion à un serveur Nextcloud réel, de modification des données de production, de déploiement Firebase ou d'essai des redirections d'images sur appareil.

## Dépendances

L'audit npm initial signalait 32 paquets affectés : 1 critique, 26 élevés et 5 modérés. Les mises à jour compatibles ont été appliquées, sans changement majeur forcé. Expo reste en **57.0.27** et React Native en **0.86.3**. Firebase passe de 12.18.0 à 12.19.0, Vitest de 4.1.10 à 4.1.11 ; les correctifs incluent notamment `shell-quote`, `brace-expansion`, `js-yaml` et `source-map-js`.

La dépendance transitive `@grpc/grpc-js` est fixée à **1.13.6**, une version corrigée identifiée par [l'avis du mainteneur](https://github.com/grpc/grpc-node/security/advisories/GHSA-m9gg-hp2v-232j). Cette dépendance concerne l'implémentation Node de Firestore ; aucune exploitation dans le client mobile n'a été constatée.

Résultat final : **19 alertes élevées, aucune critique ou modérée**. Il s'agit de deux avis et de leur propagation aux paquets dépendants, pas de 19 failles indépendantes :

| Dépendance | État et contexte |
| --- | --- |
| `braces` 3.0.3 | Alerte de déni de service par motifs profondément imbriqués. Dépendance de l'outillage Metro. npm propose un retour majeur de React Native à 0.72.17 ; cette proposition n'a pas été appliquée. |
| `node-forge` 1.4.0 | Alerte de validation de signature RSA. Dépendance de l'outillage Expo et de ses certificats de signature. Aucun correctif disponible selon npm à la date de l'audit. |

Le [résultat npm brut](audits/2026-10-06/npm-audit.json) est conservé dans le dépôt. Ces alertes restent à suivre lors des mises à jour amont. Leur présence dans le graphe npm n'établit pas qu'elles sont exploitables depuis une recette de l'application.

## Points restant à traiter

### Priorité haute : droits de la base Firebase non vérifiés

Les règles Firestore et Storage déployées doivent être récupérées depuis la [console Firebase du projet](https://console.firebase.google.com/project/avocook-5eb31/firestore) puis versionnées et testées avec l'émulateur. Firebase impose l'autorisation et la validation côté serveur au moyen de ses [règles de sécurité](https://firebase.google.com/docs/firestore/security/overview). Une vérification JavaScript est contournable.

À contrôler explicitement : propriété des recettes et interdiction de changer leur auteur ; votes et signalements liés à l'UID authentifié ; protection des agrégats et du statut de modération ; propriété des pseudonymes ; accès aux listes par leurs participants ; limites de taille et de type des images ; quotas et protection contre les abus. Ni l'authentification anonyme ni le caractère public de la clé Firebase ne suffisent à garantir ces droits.

### Priorité haute : isolation entre comptes Nextcloud

Le fichier SQLite et la file de synchronisation sont communs à tous les serveurs et utilisateurs. Les identifiants de recettes ne sont pas associés à un compte. Après utilisation d'un compte A puis connexion à un compte B, des changements en attente ou des identifiants identiques peuvent être appliqués au mauvais compte.

Il faut introduire un espace de stockage par serveur et utilisateur, avec une migration sauvegardée et une règle explicite pour transférer les recettes du mode local. Cette modification de structure n'a pas été réalisée dans cet audit afin de préserver les données existantes et le fonctionnement actuel du mode local. Le correctif du client global traite la déconnexion, pas cette isolation persistante.

### Priorité haute : créations et suppressions concurrentes

L'acquittement des **mises à jour** de recettes existantes est désormais protégé. Les créations avec changement d'identifiant local vers serveur et les suppressions reposent encore sur plusieurs étapes. Une modification ou suppression simultanée à ces opérations peut nécessiter une réconciliation supplémentaire.

Un arrêt après création distante mais avant enregistrement de l'identifiant peut aussi provoquer une nouvelle tentative de création. La détection des doublons par nom réduit le risque mais ne constitue pas une garantie d'idempotence. Une prochaine évolution doit versionner toutes les opérations et rendre atomiques le changement d'identifiant, l'enregistrement local et l'acquittement.

### Priorité moyenne : listes partagées et modération

Les listes transmettent encore un tableau complet à chaque modification. Deux participants modifiant la liste simultanément peuvent écraser leurs changements respectifs. Le compteur de participants n'est pas une liste de membres authentifiés et peut compter plusieurs fois une même personne. Le code de six caractères est maintenant généré de façon sûre, mais ne remplace pas des droits de membership et une limitation des tentatives côté serveur.

Les signalements et leur seuil de modération restent gérés par plusieurs opérations côté client. Leur unicité, le seuil et les changements du statut `approved` doivent être sécurisés côté serveur et testés en concurrence. La validation des votes par le client doit également être reproduite dans les règles ou un service serveur. Les [transactions Firestore](https://firebase.google.com/docs/firestore/manage-data/transactions) corrigent la concurrence des écritures concernées ; elles ne définissent pas les droits.

### Transport et données locales

HTTP explicite est conservé pour les installations Nextcloud qui l'utilisent. Il ne chiffre pas le transport et doit être réservé à un réseau de confiance ; HTTPS reste préférable. Les recettes SQLite et les photos locales ne sont pas chiffrées par l'application. Elles bénéficient de la protection du système et de son stockage ; les règles de sauvegarde Android excluent SecureStore mais peuvent conserver les recettes. Les mots de passe Nextcloud et clés API restent dans SecureStore.

Les lignes SQLite illisibles sont conservées pour récupération. Le nettoyage des photos est suspendu tant qu'une recette illisible pourrait les référencer. Un outil de réparation/export et un avertissement utilisateur seraient utiles. Le redémarrage de l'authentification anonyme après un premier échec réseau mérite également une stratégie de reprise explicite.

## Reproduire les contrôles

```sh
npm ci
npm run typecheck
npm test
npm run lint
npx expo install --check
npx expo export --platform ios --platform android --output-dir /tmp/avocook-audit-export
npm audit --json
```

La prochaine validation complète doit ajouter les tests des règles Firebase, un essai sur appareils iOS et Android avec le serveur Nextcloud habituel, et les scénarios de changement de compte et de modification simultanée sur plusieurs appareils.
