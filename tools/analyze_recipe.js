#!/usr/bin/env node
// Script pour extraire et analyser le JSON-LD d'une recette papilles et pupilles
// Lance avec: node analyze_recipe.js

const https = require('https');
const zlib = require('zlib');

const URL_TO_TEST = 'https://www.papillesetpupilles.fr/2025/11/sabich-maison-la-recette-facile-et-irresistible.html/';

// Simule exactement les headers qu'AvoCook envoie
const headers = {
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) ' +
    'AppleWebKit/605.1.15 (KHTML, like Gecko) ' +
    'Version/17.0 Mobile/15E148 Safari/604.1',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cache-Control': 'max-age=0',
  'Accept-Encoding': 'gzip, deflate, br',
};

const url = new URL(URL_TO_TEST);
const req = https.request(
  {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'GET',
    headers,
  },
  (res) => {
    console.log('\n=== HTTP STATUS ===');
    console.log('Status:', res.statusCode, res.statusMessage);
    console.log('Server:', res.headers['server']);
    console.log('Content-Type:', res.headers['content-type']);
    console.log('Content-Encoding:', res.headers['content-encoding']);

    let stream = res;
    const enc = res.headers['content-encoding'];
    if (enc === 'gzip') stream = res.pipe(zlib.createGunzip());
    else if (enc === 'br') stream = res.pipe(zlib.createBrotliDecompress());

    const chunks = [];
    stream.on('data', (c) => chunks.push(c));
    stream.on('end', () => {
      const data = Buffer.concat(chunks).toString('utf8');

      console.log('\n=== HTML INFO ===');
      console.log('Total length:', data.length, 'chars');
      console.log('Cloudflare block:', data.includes('cf-error-details') || data.includes('have been blocked'));
      console.log('Has wprm-recipe HTML:', data.includes('wprm-recipe'));

      // Find all JSON-LD scripts
      const scripts = [...data.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
      console.log('\n=== JSON-LD SCRIPTS ===');
      console.log('Number of scripts found:', scripts.length);

      if (scripts.length === 0) {
        // Try with encoded type attribute
        const scriptsEncoded = [...data.matchAll(/<script[^>]+type=["']application(?:\/|&#x2F;)ld(?:\+|&#x2B;)json["'][^>]*>([\s\S]*?)<\/script>/gi)];
        console.log('With encoded type attr:', scriptsEncoded.length);
        
        // Show raw script tags
        const allScripts = [...data.matchAll(/<script([^>]*)>/gi)];
        console.log('\n--- All <script> tags found ---');
        allScripts.forEach((m, i) => {
          if (m[1].includes('json') || m[1].includes('ld')) {
            console.log(`Script ${i}: <script${m[1]}>`);
          }
        });
        
        // Show first 2000 chars of page
        console.log('\n--- First 2000 chars of HTML ---');
        console.log(data.substring(0, 2000));
      } else {
        scripts.forEach((m, i) => {
          console.log(`\n--- JSON-LD Script #${i} ---`);
          const content = m[1].trim();
          
          try {
            const parsed = JSON.parse(content);
            const type = parsed['@type'] || (parsed['@graph'] && 'has @graph');
            console.log('Type:', JSON.stringify(type));
            
            if (parsed['@type'] === 'Recipe' || 
                (Array.isArray(parsed['@graph']) && parsed['@graph'].some(x => x['@type'] === 'Recipe'))) {
              console.log('\n✅ RECIPE FOUND!');
              
              // Find the recipe object
              let recipe = parsed;
              if (parsed['@graph']) {
                recipe = parsed['@graph'].find(x => x['@type'] === 'Recipe');
              }
              
              console.log('name:', recipe.name);
              console.log('recipeIngredient:', JSON.stringify(recipe.recipeIngredient)?.substring(0, 200));
              console.log('recipeInstructions type:', typeof recipe.recipeInstructions, Array.isArray(recipe.recipeInstructions) ? `(array of ${recipe.recipeInstructions.length})` : '');
              console.log('prepTime:', recipe.prepTime);
              console.log('image type:', typeof recipe.image, Array.isArray(recipe.image) ? '(array)' : '');
            } else {
              console.log('Not a recipe:', JSON.stringify(parsed).substring(0, 300));
            }
          } catch (e) {
            console.log('❌ JSON PARSE ERROR:', e.message);
            console.log('Raw content (first 500):', content.substring(0, 500));
          }
        });
      }

      // WPRM HTML structure check
      if (data.includes('wprm-recipe-ingredient')) {
        console.log('\n=== WPRM HTML INGREDIENTS ===');
        const ingredientMatches = [...data.matchAll(/<li[^>]*class="([^"]*wprm-recipe-ingredient[^"]*)"[^>]*>([\s\S]*?)<\/li>/gi)];
        console.log('Ingredient <li> found:', ingredientMatches.length);
        ingredientMatches.slice(0, 3).forEach((m, i) => {
          console.log(`  Item ${i}: class="${m[1]}", content length=${m[2].length}`);
        });
      }
    });

    stream.on('error', (e) => console.error('Stream error:', e));
  }
);

req.on('error', (e) => console.error('Request error:', e.message));
req.end();
