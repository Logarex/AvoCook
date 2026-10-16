# AvoCook 4.3.0

Le « Quoi de neuf » de l’application est traduit en français, anglais, allemand,
espagnol, italien et danois. Il regroupe les changements depuis les notes 4.0.1,
y compris ceux du tag 4.0.2 et les modifications locales du 16 octobre 2026.

## Historique examiné

| Commits | Changements présentés aux utilisateurs |
| --- | --- |
| `be8e6f0` | Déduplication des signalements communautaires et modération par seuil. |
| `63e58f6`, `d2cdd12` | Dossier d’images Nextcloud configurable, photos lors du partage communautaire et interprétation des durées. |
| `2de4d8b`, `694dee8` | Journal de connexion, diagnostic des certificats et connexions HTTP. |
| `d05bab9`, `8a9a9f1` | Synchronisation des modifications locales, suppressions, isolation des comptes, cache des images et réinstallation. |
| `481e432`, `146ad8e` | Traduction automatique, langue communautaire indépendante, accès à l’original et cache pour lecture hors ligne. |
| `a8b224f`, `a126ebe` | Intégration Nextcloud Pantry, modes de listes, partage, édition des articles et synchronisation bidirectionnelle avec Rappels. |
| `b1d6063` | Markdown dans les champs de recettes, aperçus, PDF et impression. |
| `778c745` | Calcul des portions, fractions, pourcentages, durées, fiabilité des minuteurs et démarrage. |
| Modifications locales | Liquid Glass natif, navigation flottante, alternatives Android et accessibilité, corrections de lisibilité et suppression de la présentation initiale au profit du tour guidé. |

Les corrections techniques et mises à jour de dépendances sont regroupées avec
leurs effets visibles dans ces 12 rubriques.

## Version

`package.json` fournit la version utilisée par les notes, le suivi de première
ouverture, les recherches de mise à jour et les rapports de diagnostic.
`app.json`, le verrou npm et le badge du site indiquent également `4.3.0`.
Les projets natifs ont été régénérés : version Android, version iOS et extension
de partage iOS sont alignées. Les numéros de compilation restent distincts de
la version publique ; EAS les incrémente pour les compilations de production.

Les anciennes versions conservées dans les audits datés et les cas de test
représentent leur contexte historique. Les versions propres aux dépendances et
au module de notifications ne sont pas des versions de l’application.

## Vérifications

- TypeScript et ESLint : aucune erreur.
- Tests : 560 réussis dans 47 fichiers, dont les intégrations Nextcloud et Pantry.
- Contrôle des six traductions, des rubriques dynamiques et de l’interpolation de version.
- Régénération native Expo réussie ; métadonnées iOS et Android vérifiées à `4.3.0`.
