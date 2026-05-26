# Import Compatibility

Web import relies mainly on `schema.org/Recipe` data present in pages. Sites
often change their HTML, so this list is a reference point, not a permanent
guarantee.

## Last recorded test

Commands run on 13 May 2026:

```bash
npm run import:check -- https://www.marmiton.org/recettes/recette_gateau-leger-au-chocolat_15680.aspx https://www.750g.com/gateau-au-chocolat-r37574.htm
npm run import:check -- https://www.cuisineaz.com/recettes/gateau-au-chocolat-simplissime-et-rapide-pas-cher-en-10-min-62801.aspx
npm run import:check -- https://www.bbcgoodfood.com/recipes/easy-chocolate-cake https://www.allrecipes.com/recipe/17528/extreme-chocolate-cake/
```

Results:

- Marmiton: OK;
- 750g: OK;
- CuisineAZ: OK;
- BBC Good Food: OK;
- Allrecipes: blocked by the site during this test (`HTTP 402`).

## Sites to retest before a public release

```bash
npm run import:check -- <url>
```

Sites worth keeping in manual tests:

- Marmiton;
- CuisineAZ;
- 750g;
- Journal des Femmes Cuisine;
- Papilles et Pupilles;
- Hervé Cuisine;
- Chefkoch;
- BBC Good Food;
- Allrecipes;
- GialloZafferano.

If a site fails but still exposes recipe data in its HTML, the right place to
fix it is `src/features/import/`.
