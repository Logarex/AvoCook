import { readFile, readdir, mkdir, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const checkOnly = process.argv.includes('--check');
if (process.argv.slice(2).some((arg) => arg !== '--check')) throw new Error('Usage: npm run store:prepare [-- --check]');
const app = (await readJson('app.json')).expo;
const release = await readJson('store/release.json');
if (release.version !== app.version) throw new Error(`store/release.json version must match app.json (${app.version})`);
const locales = { 'fr-FR': 'fr-FR', 'en-US': 'en-US', 'de-DE': 'de-DE', 'es-ES': 'es-ES', 'it-IT': 'it', 'da-DK': 'da' };
const fields = {
  name: ['name', 'title', 30, 30],
  subtitle: ['subtitle', null, 30],
  promotionalText: ['promotional_text', null, 170],
  shortDescription: [null, 'short_description', null, 80],
  description: ['description', 'full_description', 4000, 4000],
  keywords: ['keywords', null, 100],
};
const files = [];
const errors = [];
const sources = (await readdir(path.join(root, 'store/locales'))).filter((name) => name.endsWith('.json')).sort();
if (!sources.length) throw new Error('No store locales found');
for (const source of sources) {
  const locale = source.slice(0, -5);
  if (!locales[locale]) throw new Error(`Unsupported locale: ${locale}`);
  const text = await readJson(`store/locales/${source}`);
  for (const [field, [ios, android, iosLimit, androidLimit]] of Object.entries(fields)) {
    const value = text[field];
    const limit = Math.min(...[iosLimit, androidLimit].filter(Boolean));
    if (typeof value !== 'string' || !value.trim() || [...value].length > limit) {
      errors.push(`${locale}.${field}: required text, maximum ${limit} characters`);
      continue;
    }
    if (ios) files.push([`ios/${locale}/${ios}.txt`, value]);
    if (android) files.push([`android/${locales[locale]}/${android}.txt`, value]);
  }
  const notes = release.notes?.[locale];
  if (typeof notes !== 'string' || !notes.trim() || [...notes].length > 500) {
    errors.push(`${locale}: add release notes in store/release.json (1–500 characters)`);
  } else {
    files.push([`ios/${locale}/release_notes.txt`, notes]);
    files.push([`android/${locales[locale]}/changelogs/default.txt`, notes]);
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else if (checkOnly) {
  console.log(`Store texts valid for ${release.version} (${sources.length} languages).`);
} else {
  const output = path.join(root, 'store/generated');
  await rm(output, { recursive: true, force: true });
  for (const [file, value] of files) {
    const destination = path.join(output, file);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, value.trim());
  }
  console.log(`Prepared ${files.length} metadata files in store/generated for ${release.version}.`);
}
