# Ma cuisine, Planning et journal — audit du 24 octobre 2026

L’objectif est de relier les réserves, les idées, les courses et les repas réellement pris, avec des actions courtes et des informations fiables. L’app reste utilisable sans recette enregistrée et sans IA.

## Parcours améliorés

| Besoin quotidien | Comportement |
| --- | --- |
| Ranger rapidement ses courses | Un seul nom suffit ; ajout de plusieurs noms en une fois, puis quantités et dates facultatives. « Enregistrer et suivant » enchaîne les produits et les scans sans recopier la date précédente. |
| Éviter les achats en double | Une nouvelle fiche signale les produits déjà présents, y compris dans un autre rangement ou avec une date passée. Chaque lot garde sa date et sa quantité. Depuis Courses, une feuille donne accès à la réserve et à la consultation d’un code-barres. |
| Décider quoi manger | Le hasard est visible dans les idées et respecte les résultats et filtres actifs, y compris les ingrédients saisis. Il évite de proposer deux fois de suite la même recette quand plusieurs choix existent. Une idée peut ouvrir directement le formulaire de repas. |
| Ne pas cuisiner | Aujourd’hui ouvre un repas simple en un geste ; restes et sortie restent disponibles dans les options du repas. Les sorties et les restes ne génèrent pas de courses. |
| Garder une mémoire personnelle | Historique devient un onglet principal de Planning. Chaque repas peut avoir sa propre note et un lien facultatif vers une recette. Les anciennes fiches du carnet de recette restent séparées. |
| Noter un repas passé | Le bouton « Noter un repas mangé » ouvre un repas déjà confirmé ; le nom, la date et déjeuner/dîner sont accessibles directement. La note s’ouvre en un geste ; portions, type, courses et liens facultatifs sont sous « Options ». Les notes et le lien de recette sont facultatifs. Les repas futurs ne peuvent pas être confirmés comme mangés. |
| Retrouver un souvenir précis | Recherche par titre et note, par date et type de repas, ou combinaison des deux. Exemple : « Déjeuner du 30/10/2025 ». Le calendrier et Tous/Déjeuner/Dîner sont regroupés dans les filtres facultatifs. L’année figure sur les entrées. |
| Refaire un repas | Le nouveau brouillon conserve le repas et le lien de recette ; il ne recopie ni la confirmation ni le souvenir personnel de l’ancienne date. |
| Comprendre un produit | Nutri-Score et Green-Score distincts, avec « — » pour les données manquantes. Détail disponible de l’énergie, des lipides, saturés, glucides, sucres, fibres, protéines et sel, pour 100 g/100 ml tel que vendu. Attribution et lien Open Food Facts. |

## Garanties vérifiées

- Les notes par repas et les liens facultatifs passent par le stockage local et la sauvegarde complète ; les liens sont remappés lors de l’import. Les anciens identifiants ignorés sur des repas simples ne deviennent pas des liens de recette.
- Un lien facultatif vers une recette ne rajoute pas ses ingrédients aux courses du repas simple, des restes ou d’une sortie.
- Les échecs de sauvegarde laissent les données existantes intactes et conservent la saisie. Les ajouts multiples et les mutations du planning bloquent les doubles appuis simultanés.
- Les notes de repas modifiées bloquent la fermeture gestuelle de la feuille et demandent de choisir avant de les abandonner.
- L’inventaire s’ouvre même lorsque les recettes sont encore en chargement. Sa consultation depuis les courses ne propose aucune mutation de stock.
- Les valeurs nutritionnelles absentes, négatives ou non numériques ne sont pas inventées. Le zéro reste une vraie valeur. La date du produit est saisie depuis son emballage.
- Les recherches comprennent JJ/MM/AAAA, JJ.MM.AAAA, JJ-MM-AAAA et AAAA-MM-JJ. Une date impossible ne correspond à aucun repas et affiche un message. Les recherches par type de repas excluent les anciennes dates du carnet qui n’ont pas de déjeuner/dîner associé.

## Langues

Français, anglais, allemand, espagnol, italien et danois : parité de toutes les clés, variables et pluriels ; rendu des composants du journal avec les véritables traductions ; recherche précise de déjeuner et dîner ; filtrage par calendrier et type ; remise à zéro ; dates impossibles.

Exemples testés : « Déjeuner du 30/10/2025 », « Lunch on 30/10/2025 », « Mittagessen am 30.10.2025 », « Almuerzo del 30/10/2025 », « Pranzo del 30/10/2025 », « Frokost den 30.10.2025 ».

## Validation et limites

Vérifications : TypeScript, ESLint, suite Vitest complète (814 tests réussis), tests des parcours de saisie, des recherches dans les six langues, des lots de produits, de la sauvegarde et des erreurs. Les tests d’intégration Nextcloud et Pantry utilisent des serveurs locaux.

Sur iPhone 18 Pro simulé, iOS 27 : ouverture de Ma cuisine, liste d’ajout rapide avec comptage, Aujourd’hui et accès Historique, formulaire de repas, notes et confirmation avant abandon, consultation de la réserve depuis Courses. Les brouillons utilisés pour ces contrôles n’ont pas été enregistrés. Le formulaire final tient sur un écran, avec un seul champ de texte par défaut. Le rendu visuel natif de toutes les langues et les grandes tailles de texte n’ont pas été contrôlés à nouveau dans cette session.

Restent les vérifications sur appareil réel : caméra et permissions, qualité de lecture des codes, notifications en arrière-plan, accès réseau au catalogue et manipulation avec VoiceOver/TalkBack. Les tests automatisés du catalogue utilisent des réponses simulées ; cette session ne confirme pas une requête produit réelle aboutie. Les scores dépendent de la couverture d’Open Food Facts et ne constituent pas une analyse complète équivalente à celle de Yuka.

Sources techniques du catalogue : [API produit Open Food Facts](https://openfoodfacts.github.io/openfoodfacts-server/api/tutorial-off-api/) et [schéma officiel des nutriments](https://openfoodfacts.github.io/documentation/docs/Product-Opener/schemas/schemas/product_nutrition/). Les champs `_100g` représentent les valeurs normalisées pour 100 g ou 100 ml, tel que vendu.
