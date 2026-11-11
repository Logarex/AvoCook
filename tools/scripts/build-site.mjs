import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const project = new URL("../../", import.meta.url);
const output = new URL("dist/site/", project);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(new URL("site/", project), output, { recursive: true });
await cp(new URL("assets/screenshots/", project), new URL("screenshots/", output), { recursive: true });
await cp(new URL("assets/icon.svg", project), new URL("icon.svg", output));
await cp(new URL("assets/logo-transparent.png", project), new URL("logo.png", output));
await cp(new URL("assets/logo-dark-transparent.png", project), new URL("logo-dark.png", output));
// Content hashes in the asset URLs so browsers never mix a new page with an old stylesheet or script.
const page = new URL("index.html", output);
let html = await readFile(page, "utf8");
for (const asset of ["style.css", "main.js"]) {
  const hash = createHash("sha256").update(await readFile(new URL(asset, output))).digest("hex").slice(0, 10);
  if (!html.includes(`"${asset}"`)) throw new Error(`index.html does not reference ${asset}`);
  html = html.replaceAll(`"${asset}"`, `"${asset}?v=${hash}"`);
}
await writeFile(page, html);
console.log(`Site ready: ${fileURLToPath(output)}`);
