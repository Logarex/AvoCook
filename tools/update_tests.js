const fs = require('fs');
const path = '/Users/louischabert/GitHub/AvoCook/src/__tests__/schemaRecipeParser.test.ts';
let content = fs.readFileSync(path, 'utf8');

const wprmRegex = /\/\/ ─── WPRM HTML fallback[\s\S]*?(?=\/\/ ─── Edge cases)/;
const semanticTests = `  it("parses semantic HTML when JSON-LD is missing", () => {
    const html = \`
      <html>
        <head>
          <title>Sabich maison - Papilles et Pupilles</title>
          <meta property="og:image" content="https://example.com/sabich.jpg" />
        </head>
        <body>
          <h2>Ingrédients</h2>
          <ul>
            <li>2 aubergines</li>
            <li>4 oeufs</li>
          </ul>
          <h2>Préparation</h2>
          <p>Préchauffez le four.</p>
          <p>Cuire 30 min.</p>
        </body>
      </html>
    \`;

  });

`;
content = content.replace(wprmRegex, semanticTests);

fs.writeFileSync(path, content, 'utf8');
