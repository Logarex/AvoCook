# Compatibilité d'import / Import Compatibility

[Français](#français) | [English](#english)

---

## Français

L'import fonctionne en priorité via l'API Nextcloud Cookbook, puis via le parser local schema.org Recipe.

### Vérifié en live

Commandes exécutées le 13 mai 2026 :

```bash
npm run import:check -- https://www.marmiton.org/recettes/recette_gateau-leger-au-chocolat_15680.aspx https://www.750g.com/gateau-au-chocolat-r37574.htm
npm run import:check -- https://www.cuisineaz.com/recettes/gateau-au-chocolat-simplissime-et-rapide-pas-cher-en-10-min-62801.aspx
npm run import:check -- https://www.bbcgoodfood.com/recipes/easy-chocolate-cake https://www.allrecipes.com/recipe/17528/extreme-chocolate-cake/
```

Résultat :

- Marmiton : OK, nom, 7 ingrédients, 4 étapes, image.
- 750g : OK, nom, 6 ingrédients, 2 étapes, image.
- CuisineAZ : OK, nom, 6 ingrédients, 6 étapes, image.
- BBC Good Food : OK, nom, 16 ingrédients, 11 étapes, image.
- Allrecipes : page bloquée côté site lors du test live (`HTTP 402`), donc à retester avec une autre URL ou via l'import serveur Nextcloud.

### À tester régulièrement

Les sites de recettes changent souvent leur HTML. Avant une version publique, refaire `npm run import:check -- <url>` sur au moins :

- Marmiton
- CuisineAZ
- 750g
- Journal des Femmes Cuisine
- Papilles et Pupilles
- Hervé Cuisine
- Chefkoch
- BBC Good Food
- Allrecipes
- Serious Eats
- Food Network
- GialloZafferano
- Cookpad

Si un site échoue mais contient encore des données de recette dans son HTML, ajouter un adapter dédié dans `src/features/import/`.

---

## English

Import works primarily via the Nextcloud Cookbook API, then via the local schema.org Recipe parser.

### Verified Live

Commands executed on May 13, 2026:

```bash
npm run import:check -- https://www.marmiton.org/recettes/recette_gateau-leger-au-chocolat_15680.aspx https://www.750g.com/gateau-au-chocolat-r37574.htm
npm run import:check -- https://www.cuisineaz.com/recettes/gateau-au-chocolat-simplissime-et-rapide-pas-cher-en-10-min-62801.aspx
npm run import:check -- https://www.bbcgoodfood.com/recipes/easy-chocolate-cake https://www.allrecipes.com/recipe/17528/extreme-chocolate-cake/
```

Result:

- Marmiton: OK, name, 7 ingredients, 4 steps, image.
- 750g: OK, name, 6 ingredients, 2 steps, image.
- CuisineAZ: OK, name, 6 ingredients, 6 steps, image.
- BBC Good Food: OK, name, 16 ingredients, 11 steps, image.
- Allrecipes: page blocked on the site side during the live test (`HTTP 402`), so to be retested with another URL or via Nextcloud server import.

### To Test Regularly

Recipe sites often change their HTML. Before a public release, redo `npm run import:check -- <url>` on at least:

- Marmiton
- CuisineAZ
- 750g
- Journal des Femmes Cuisine
- Papilles et Pupilles
- Hervé Cuisine
- Chefkoch
- BBC Good Food
- Allrecipes
- Serious Eats
- Food Network
- GialloZafferano
- Cookpad

If a site fails but still contains recipe data in its HTML, add a dedicated adapter in `src/features/import/`.
