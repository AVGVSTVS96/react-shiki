import type { Language } from './types';
import type { LanguageRegistration } from './extended-types';

export type LanguageResolution = {
  languageId: string;
  displayLanguageId: string | null;
  langsToLoad: Language;
};

export const resolveLanguage = (
  lang: Language,
  customLanguages?: LanguageRegistration | LanguageRegistration[],
  langAliases?: Record<string, string>
): LanguageResolution => {
  const normalizedCustomLangs = customLanguages
    ? Array.isArray(customLanguages)
      ? customLanguages
      : [customLanguages]
    : [];

  if (lang == null || (typeof lang === 'string' && !lang.trim())) {
    return {
      languageId: 'plaintext',
      displayLanguageId: 'plaintext',
      langsToLoad: undefined,
    };
  }

  if (typeof lang === 'object') {
    return {
      languageId: lang.name,
      displayLanguageId: lang.name || null,
      langsToLoad: lang,
    };
  }

  const lowerLang = lang.toLowerCase();
  const matches = (str: string | undefined): boolean =>
    str?.toLowerCase() === lowerLang;

  const customMatch = normalizedCustomLangs.find(
    (cl) =>
      matches(cl.name) ||
      matches(cl.scopeName) ||
      matches(cl.scopeName?.split('.').pop()) ||
      cl.aliases?.some(matches) ||
      cl.fileTypes?.some(matches)
  );

  if (customMatch) {
    return {
      languageId: customMatch.name || lang,
      displayLanguageId: lang,
      langsToLoad: customMatch,
    };
  }

  if (langAliases?.[lang]) {
    return {
      languageId: langAliases[lang],
      displayLanguageId: lang,
      langsToLoad: langAliases[lang],
    };
  }

  // Fallback handled in highlighter factories
  return {
    languageId: lang,
    displayLanguageId: lang,
    langsToLoad: lang,
  };
};

const PLAINTEXT_LANGS = new Set(['text', 'plaintext', 'txt', 'plain']);

export const isPlaintext = (resolution: LanguageResolution): boolean =>
  PLAINTEXT_LANGS.has(resolution.languageId);
