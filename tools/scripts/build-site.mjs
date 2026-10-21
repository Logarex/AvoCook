import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const project = new URL("../../", import.meta.url);
const output = new URL("dist/site/", project);

// Only this generated directory is replaced. Keep preview and Pages assets identical.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(new URL("site/", project), output, { recursive: true });
await cp(new URL("assets/screenshots/", project), new URL("screenshots/", output), { recursive: true });
await cp(new URL("assets/icon.svg", project), new URL("icon.svg", output));
await cp(new URL("assets/logo-transparent.png", project), new URL("logo.png", output));
await cp(new URL("assets/logo-dark-transparent.png", project), new URL("logo-dark.png", output));
console.log(`Site ready: ${fileURLToPath(output)}`);
