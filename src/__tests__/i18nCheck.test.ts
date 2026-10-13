import { test, expect } from 'vitest';
import en from '../i18n/locales/en';
import fr from '../i18n/locales/fr';
import de from '../i18n/locales/de';
import es from '../i18n/locales/es';
import it from '../i18n/locales/it';
import da from '../i18n/locales/da';

const getKeys = (obj: any, prefix = ''): string[] => {
  return Object.keys(obj).reduce((acc: string[], k) => {
    const pre = prefix.length ? prefix + '.' : '';
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      return [...acc, ...getKeys(obj[k], pre + k)];
    }
    return [...acc, pre + k];
  }, []);
};

test('all locales have same keys', () => {
  const enKeys = getKeys(en).sort();
  const frKeys = getKeys(fr).sort();
  const deKeys = getKeys(de).sort();
  const esKeys = getKeys(es).sort();
  const itKeys = getKeys(it).sort();
  
  const allLocales = { fr: frKeys, de: deKeys, es: esKeys, it: itKeys };
  
  for (const [lang, keys] of Object.entries(allLocales)) {
    const missingInLang = enKeys.filter(k => !keys.includes(k));
    const extraInLang = keys.filter(k => !enKeys.includes(k));
    if (missingInLang.length > 0 || extraInLang.length > 0) {
      console.log(`Language ${lang} - Missing keys:`, missingInLang);
      console.log(`Language ${lang} - Extra keys:`, extraInLang);
    }
    expect(missingInLang).toEqual([]);
    expect(extraInLang).toEqual([]);
  }
});


test('Pantry translations cover every language and preserve interpolation variables', () => {
  const reference = en.translation.pantry;
  const variables = (value: string) => [...value.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]).sort();
  for (const locale of [fr, de, es, it, da]) {
    const pantry = locale.translation.pantry;
    expect(getKeys(pantry).sort()).toEqual(getKeys(reference).sort());
    for (const key of Object.keys(reference) as (keyof typeof reference)[]) {
      const expected = reference[key];
      const actual = pantry[key];
      if (typeof expected === 'string' && typeof actual === 'string') {
        expect(actual.trim()).not.toBe('');
        expect(variables(actual)).toEqual(variables(expected));
      }
    }
  }
});
