# Contrôle de lisibilité et des surfaces — 16 octobre 2026

## Corrections

- Le sélecteur de langue affiche la langue en 17 points, avec une hauteur minimale de 72 points et jusqu’à deux lignes. Les deux textes de la cellule ne peuvent plus se compresser verticalement.
- `AppText` ne réduit plus automatiquement tous les textes limités à une ligne. Sur iOS, les titres qui demandent explicitement un ajustement gardent une limite par défaut de 85 %. Sur Android, l’ajustement est désactivé : le moteur Fabric de cette version utilise une taille minimale absolue et n’applique pas cette limite de facteur.
- Les boutons et les contrôles segmentés peuvent afficher deux lignes. Les boutons disposent d’une largeur de contenu contrainte et d’un espacement vertical pour conserver leurs libellés lisibles.
- Les cartes de recettes grandissent avec la taille du texte système. La liste utilise la même hauteur pour ses positions de défilement. Les images restent centrées verticalement.
- Le bandeau des catégories adapte sa hauteur. L’index alphabétique devient défilable sur les écrans trop courts et garde une taille de lettres bornée.
- La feuille de langue respecte l’espace de la barre système, les libellés traduits et le réglage de réduction des animations.
- Les surfaces de repli ont un contour discret, notamment pour distinguer les boutons Android de leur panneau. Le verre natif reste réservé aux systèmes compatibles ; le réglage de réduction de transparence conserve des surfaces opaques.

## Vérifications effectuées

| Contrôle | Résultat |
| --- | --- |
| TypeScript et ESLint sur les composants modifiés | Réussite |
| Suite complète Vitest | 549 tests réussis |
| Régression sur les textes à une ligne et l’ajustement explicite | Réussite |
| Disponibilité du verre, thèmes et accessibilité, repli Android | Tests réussis |
| Compilation Android ARM64 de développement | `BUILD SUCCESSFUL` |
| Installation Android | Application de contrôle isolée : `app.avocook.mobile.visualqa` |
| Exécution sur Pixel 7 | Bundle chargé, interface Fabric démarrée, sans erreur JavaScript ni erreur fatale observée dans les journaux du processus |

La version Android déjà installée sur l’émulateur et ses données ont été conservées. L’application de contrôle utilise un identifiant distinct ; aucune configuration de production n’a été changée pour cela.

## Contrôle restant

La connexion de l’outil de contrôle des fenêtres s’est interrompue pendant la vérification iOS (`Sky Computer Use native pipe closed before response`). Plusieurs tentatives de reconnexion, dont une réinitialisation de la session, n’ont pas rétabli l’accès.

La comparaison visuelle finale de la cellule de langue, des écrans principaux, des feuilles, des thèmes clair et sombre et du texte agrandi reste donc à effectuer sur les deux plateformes. Les vérifications de compilation et d’exécution ne remplacent pas ce contrôle, et ne permettent pas de garantir l’absence de tout défaut d’affichage.
