# Compatibilité d'import

L'import web dépend surtout des données `schema.org/Recipe` présentes dans les
pages. Les sites changent souvent leur HTML, donc cette liste est un repère, pas
une garantie permanente.

## Dernier test noté

Commandes lancées le 13 mai 2026 :

```bash
npm run import:check -- https://www.marmiton.org/recettes/recette_gateau-leger-au-chocolat_15680.aspx https://www.750g.com/gateau-au-chocolat-r37574.htm
npm run import:check -- https://www.cuisineaz.com/recettes/gateau-au-chocolat-simplissime-et-rapide-pas-cher-en-10-min-62801.aspx
npm run import:check -- https://www.bbcgoodfood.com/recipes/easy-chocolate-cake https://www.allrecipes.com/recipe/17528/extreme-chocolate-cake/
```

Résultat :

- Marmiton : OK ;
- 750g : OK ;
- CuisineAZ : OK ;
- BBC Good Food : OK ;
- Allrecipes : bloqué côté site pendant ce test (`HTTP 402`).

## À retester avant une version publique

```bash
npm run import:check -- <url>
```

Sites utiles à garder dans les tests manuels :

- Marmiton ;
- CuisineAZ ;
- 750g ;
- Journal des Femmes Cuisine ;
- Papilles et Pupilles ;
- Hervé Cuisine ;
- Chefkoch ;
- BBC Good Food ;
- Allrecipes ;
- GialloZafferano.

Si un site échoue mais expose encore les données de recette dans son HTML, le
bon endroit pour corriger est `src/features/import/`.
