# Vérification avant production — 14 et 15 octobre 2026

Clôture de la vérification : 15 octobre 2026.

Périmètre : AvoCook 4.0.1, code applicatif, six langues de l’interface, permissions localisées, tests unitaires et d’intégration locaux, importations publiques, dépendances et compilations de production.

**La publication ne peut pas être validée sans les contrôles serveur Firebase et les essais sur appareils listés à la fin.** Les tests locaux valident les scénarios décrits ; ils ne prouvent pas l’absence de tout bug.

## Corrections

| Domaine | Défaut corrigé |
| --- | --- |
| Traductions | Huit appels utilisaient des clés absentes : boutons de copie, filtre de langues, lien source, choix d’une recette, Nutri-Score et étapes accessibles du tutoriel. Ajout des traductions manquantes et réutilisation du libellé existant pour le lien source. Retrait des valeurs de secours françaises dans les écrans concernés. |
| Danois | La restauration omettait le nombre de doublons ignorés et de recettes renommées. Le bilan contient maintenant les quatre compteurs. |
| Pluriels | Ajout des formes singulière/plurielle pour les votes et les entrées du journal. |
| Rédaction | Reformulation des messages de progression, des explications sur les minuteurs et l’IA, des bilans d’importation, de fautes et d’anglicismes. Correction notamment de « Toca » en italien, « ungemessener » en allemand et des accents de « seudónimo » en espagnol. Conservation des commentaires qui expliquent une contrainte technique. |
| Fonctions annoncées | Les codes contiennent six caractères, pas seulement des chiffres. Les alertes de courses sont locales et dépendent de l’app en cours d’exécution ; le compteur indique des participants ayant rejoint la liste, pas une présence en ligne. Retrait des promesses de notifications push et de présence active. |
| Portions | `2½` était traité comme deux nombres séparés : doubler pouvait produire `41` au lieu de `5`. Les fractions mixtes sont maintenant traitées ensemble. Les pourcentages d’un ingrédient, comme chocolat à 70 %, restent fixes. |
| Durées | Prise en charge des durées ISO fractionnaires et de la virgule décimale. Rejet des valeurs infinies ou trop grandes. Les fractions de minute sont exportées en secondes puis arrondies à la minute supérieure pour l’affichage. |
| Minuteurs | Un appui répété pendant la demande d’autorisation pouvait programmer plusieurs alertes. Une alerte pouvait aussi être créée après un arrêt ou un changement de durée. Déduplication des demandes, invalidation et annulation des alertes devenues obsolètes. Une action provenant d’une ancienne notification n’arrête plus le minuteur redémarré. |
| Langue des alertes | Le libellé d’arrêt et le canal natif étaient configurés une seule fois. Ils sont reconfigurés après changement de langue, avec sérialisation des appels et nouvelle tentative après échec. |
| Démarrage | Une erreur de lecture AsyncStorage pouvait empêcher la fin du chargement de l’introduction. Le chargement se termine également en cas d’erreur ; l’échec d’enregistrement du marqueur de version est traité. |
| Mises à jour | La vérification GitHub pouvait proposer un APK Android sur iOS. Elle est réservée aux installations Android hors Google Play ; les boutiques gèrent leurs mises à jour. |
| Diagnostic | La fenêtre pouvait montrer un ancien journal à sa réouverture. Actualisation à l’ouverture et bouton d’actualisation. Les échecs de copie/partage sont traités, y compris l’indisponibilité du presse-papiers, sans faux succès. |
| Confidentialité | Documentation du démarrage d’une session Firebase anonyme, des contenus communautaires et listes partagées, des traductions Google/MyMemory, des requêtes IA et de la synchronisation éventuelle des Rappels par Apple. Textes dans l’app et documents en six langues, dont un document danois ajouté. |
| Dépendances | Installation des six correctifs recommandés par la vérification Expo en ligne : Expo 57.0.29, Constants 57.0.22, Crypto 57.0.4, Linking 57.0.13, Sharing 57.0.23 et Splash Screen 57.0.10. Fichier de verrouillage actualisé. |
| Outillage | Restauration de `npm run import:check`, qui pointait vers un script absent. Le script exécute le parseur de l’app avec un délai réseau limité. Ajout d’une CI pour TypeScript, ESLint sans avertissement, Vitest et les bundles iOS/Android. |

## Résultats reproductibles

| Vérification | Résultat |
| --- | --- |
| Suite Vitest complète | **534 tests réussis dans 46 fichiers**, sur Node.js 26.0.0 puis 22.22.3 ; suite initiale : 494 dans 42 fichiers. Les 21 tests HTTP ont été exécutés avec accès aux ports locaux. Dernière exécution complète le 15 octobre : 534/534 réussis. |
| TypeScript | `npm run typecheck` réussi. |
| ESLint | `npm run lint -- --max-warnings=0` réussi, aucune erreur ni aucun avertissement. |
| Traductions | 760 clés par langue, soit 4 560 entrées. Français, anglais, allemand, espagnol, italien et danois : parité des clés et variables, textes non vides hors deux espaces réservés intentionnellement vides, pluriels avec 0, 1, 2, 5 et 21, clés littérales utilisées dans le code, langues et clés des permissions natives. |
| Expo Doctor | **21 contrôles sur 21 réussis**. |
| Compatibilité Expo en ligne | Réussie après correctifs : `Dependencies are up to date`. Le premier contrôle hors ligne n’avait pas détecté les correctifs disponibles. |
| Dépendances installées | `npm ls --depth=0` réussi avant et après mise à jour. |
| Import BBC Good Food | `easy-pancakes` : 6 ingrédients, 5 étapes, préparation 10 min, cuisson 20 min. |
| Import Marmiton | `recette_pate-a-crepes_12372.aspx` : 7 ingrédients, 5 étapes, préparation 10 min, cuisson 30 min. |
| Import 750g | `pate-a-crepes-r5268.htm` renvoie actuellement « Potage santé » : 7 ingrédients, 1 étape, préparation 15 min, cuisson 30 min. Le résultat suit le contenu renvoyé par le site. |
| Export Hermes iOS/Android | Export final de production réussi après les correctifs pour les deux plateformes (bundles Hermes). |
| Compilation iOS Release | Compilation finale **réussie** (`BUILD SUCCEEDED`) pour le simulateur iOS 27 arm64, configuration Release. Un second build avec signature locale ad hoc a également réussi pour permettre les essais SecureStore ; aucun certificat de distribution n’a été utilisé. |
| Compilation et lint Android Release | Le lint complet échoue dans `:react-native-worklets:lintAnalyzeRelease` avec une erreur interne Kotlin « Cannot find a KaModule for the VirtualFile ». Une première tentative avait perdu son démon Gradle. La compilation APK seule a ensuite réussi (`BUILD SUCCESSFUL`, 3 min 43 s), pour les architectures configurées. Le 15 octobre, la compilation de l’APK final et l’analyse ciblée du module de notifications ont encore réussi (29 s), en excluant explicitement l’analyse Worklets défaillante de cette commande ciblée. Le lint complet reste en échec ; cela ne constitue pas une validation native sans réserve. |
| Interface en exécution | Sur le simulateur vierge « AvoCook Audit 2026-10-14 », lancement du build signé localement, introduction en français, passage du tutoriel, entrée en mode local, bibliothèque vide, ouverture de l’éditeur et saisie du nom, des portions, de la durée et d’une étape vérifiés. L’enregistrement de cette recette, la relecture visuelle des six langues et le reste des parcours manuels ne sont pas validés. La reprise du contrôle UI le 15 octobre a expiré. Le simulateur préexistant contenant des recettes Nextcloud n’a pas été utilisé pour modifier des données. |

Les tests SQLite utilisent une base en mémoire ; les intégrations Nextcloud/Pantry utilisent des serveurs HTTP locaux. Les tests React simulent les composants et services natifs : ils ne prouvent pas le rendu réel, les autorisations système, le son ou la réception d’une notification sur téléphone verrouillé. Les traductions communautaires automatiques peuvent varier selon les fournisseurs : les tests de leur transport et cache ne constituent pas une relecture humaine des traductions de toutes les recettes.

## Dépendances et sécurité

L’[audit npm brut](audits/2026-10-14/npm-audit.json) contient **19 alertes élevées**, aucune critique, modérée ou faible. Ce total inclut les paquets qui dépendent de deux bibliothèques affectées :

- `braces` : déni de service par motifs profondément imbriqués, dans la chaîne d’outillage Metro. [Avis GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
- `node-forge` : validation de signature RSA, dans l’outillage Expo et de signature. [Avis GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv).

Aucune version corrigée n’est annoncée dans ces avis au moment du contrôle. Le retour majeur de React Native proposé par npm n’a pas été appliqué. L’applicabilité de ces failles au client mobile n’est pas démontrée par le simple graphe npm ; elles restent à suivre dans la chaîne de construction.

Recherche de formats courants de clés privées, clés AWS, jetons GitHub et clés OpenAI dans les fichiers suivis : aucun fichier correspondant. Aucun fichier `.jks`, `.key`, `.pem`, `.p8` ou `.env*` n’est suivi. Ce contrôle ciblé ne prouve pas l’absence de tout secret.

## Vérifications restant nécessaires avant publication

- **Firebase : règles déployées non disponibles dans le dépôt.** Vérifier Firestore et Storage avec l’émulateur : propriété des recettes/profils, votes et signalements liés à l’UID, protection des agrégats et de la modération, membres des listes, limites de taille et de type des images, abus et tentatives de codes. Les validations du client ne remplacent pas les règles du serveur.
- **Partage Firebase concurrent :** la liste entière est envoyée lors d’une modification. Deux appareils écrivant simultanément peuvent écraser leurs changements. Le compteur de participants n’est pas un mécanisme d’adhésion authentifiée ni une mesure de présence. Vérifier ou revoir ce fonctionnement avant de promettre une collaboration sans perte.
- **Lint Android natif :** l’analyse complète plante dans la dépendance Worklets. Une [anomalie amont du même type](https://issuetracker.google.com/issues/430991549) concerne l’analyse de scripts Gradle Kotlin. Le succès de la commande ciblée (APK + analyse du module) exclut explicitement le contrôle Worklets qui plante ; il ne remplace pas un lint complet. Les résultats partiels du module contiennent encore une alerte conditionnelle `NotificationPermission` et deux suggestions `UseKtx`. La permission `POST_NOTIFICATIONS` a été vérifiée dans le manifeste de l’APK final ; ces résultats partiels ne sont pas présentés comme un rapport global sans erreur. Le plugin existant `withAndroidLint` désactive aussi l’arrêt sur erreur et le contrôle des builds Release : un build réussi ne suffirait donc pas à certifier un lint propre.
- **Appareils iOS et Android :** permissions refusées/révoquées, notifications au verrouillage et après arrêt de l’app, plusieurs minuteurs, Rappels/iCloud partagés, partage de fichiers et d’URL, appareil photo, impression et PDF, perte réseau et mode avion, clavier, rotation, tablette, grande taille de texte et lecteur d’écran. Un Android physique n’est pas connecté à cet environnement.
- **Serveur Nextcloud de test :** création, modification, suppression et images sur HTTPS et HTTP explicite ; passage du compte A au compte B avec identifiants de recettes identiques et modifications en attente ; coupure réseau pendant l’écriture et reprise. Les tests de régression couvrent plusieurs de ces cas avec réponses simulées, pas avec votre serveur réel.
- **IA :** essais avec de vraies clés et quotas de chaque fournisseur configuré. Aucune clé privée n’a été utilisée pour cet audit.
- **Distribution :** build signé TestFlight/Google Play interne, parcours d’installation et de mise à jour depuis la version publiée, sauvegarde/restauration et fiches de confidentialité des boutiques cohérentes avec les échanges documentés.
- **Commande d’assets obsolète :** `npm run assets` référence encore `tools/scripts/generate-assets.mjs`, absent du dépôt. Elle n’est pas nécessaire pour compiler avec les images présentes, mais son générateur reste à restaurer si ce workflow est utilisé.

Aucun déploiement, envoi de recette communautaire ou changement de données de production n’a été effectué.

## Preuves et limites de clôture

Les journaux unitaires, TypeScript, ESLint et Expo Doctor ainsi que les résultats structurés sont conservés dans `docs/audits/2026-10-14/`. Les compilations de distribution, les tests physiques et les vérifications Firebase restent à faire. Aucun test manuel laissé non validé n’est marqué comme réussi.

## Relancer les contrôles

```sh
npm ci
npm run typecheck
npm run lint -- --max-warnings=0
npm test
npx expo install --check
npx --yes expo-doctor
npx expo export --platform ios --platform android --output-dir /tmp/avocook-release-export
npm audit --json
npm run import:check -- https://www.bbcgoodfood.com/recipes/easy-pancakes
```

Le workflow `.github/workflows/ci.yml` est ajouté au dépôt mais n’a pas encore été exécuté sur GitHub.
