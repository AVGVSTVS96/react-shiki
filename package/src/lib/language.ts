import type { Language } from './types';
import { isSpecialLang } from 'shiki/core';
import type {
  DynamicImportLanguageRegistration,
  LanguageRegistration,
} from 'shiki';

export const FALLBACK_LANGUAGE = 'plaintext';

/**
 * Resolved languages and metadata
 */
type LanguageResult = {
  languageId: string;
  langsToLoad: Language[];
};

const toArray = <T>(value?: T | T[]): T[] =>
  value == null ? [] : Array.isArray(value) ? value : [value];

const languageKey = (lang: Language): string | null => {
  if (lang == null) return null;
  if (typeof lang === 'string') return `s:${lang}`;
  return `o:${lang.name}::${lang.scopeName}`;
};

const dedupeLanguages = (langs: Language[]): Language[] => {
  const seen = new Set<string>();
  const deduped: Language[] = [];

  for (const lang of langs) {
    const key = languageKey(lang);
    if (key == null || seen.has(key)) continue;
    seen.add(key);
    deduped.push(lang);
  }

  return deduped;
};

/**
 * Used in factories to check if language is supported.
 * Objects are validated as grammar registrations (name + scopeName).
 */
export const isLoadableLanguage = <T extends string>(
  lang: Language,
  bundledLanguages: Record<T, DynamicImportLanguageRegistration>
): lang is NonNullable<Language> => {
  if (lang == null) return false;
  if (typeof lang === 'string') return lang in bundledLanguages;
  return (
    typeof lang.name === 'string' && typeof lang.scopeName === 'string'
  );
};

/**
 * Used in hook to resolve loaded language for highlighting.
 * Falls back to "plaintext" if not supported.
 */
export const resolveLoadedLanguage = (
  languageId: string,
  loadedLanguages: string[]
): string =>
  isSpecialLang(languageId) || loadedLanguages.includes(languageId)
    ? languageId
    : FALLBACK_LANGUAGE;

/**
 * Resolves the language input to standardized IDs and objects for Shiki
 * @param lang The language input from props
 * @param customLanguages An array of custom textmate grammar objects or a single grammar object
 * @returns A LanguageResult object containing:
 *   - languageId: The resolved language ID
 *   - langsToLoad: The language objects/string ids to load
 */
export const resolveLanguage = (
  lang: Language,
  customLanguages?: LanguageRegistration | LanguageRegistration[],
  langAliases?: Record<string, string>,
  preloadLanguages?: Language | Language[]
): LanguageResult => {
  const customLangs = toArray(customLanguages);
  const preloadLangs = toArray(preloadLanguages);
  const customMatchPool = [...customLangs, ...preloadLangs];
  let languageId = FALLBACK_LANGUAGE;
  let primaryLang: Language;

  // Language is null or empty string
  if (lang == null || (typeof lang === 'string' && !lang.trim())) {
    return {
      languageId,
      langsToLoad: dedupeLanguages([...preloadLangs, ...customLangs]),
    };
  }

  // Language is custom object
  if (typeof lang === 'object') {
    languageId = lang.name;
    primaryLang = lang;
  } else {
    // Language is string
    const lowerLang = lang.toLowerCase();
    const matches = (str: string | undefined): boolean =>
      str?.toLowerCase() === lowerLang;

    // Check custom registrations (from both customLanguages and preloadLanguages)
    const customMatch = customMatchPool.find(
      (candidate): candidate is LanguageRegistration =>
        typeof candidate === 'object' &&
        candidate != null &&
        !!(
          matches(candidate.name) ||
          matches(candidate.scopeName) ||
          matches(candidate.scopeName?.split('.').pop()) ||
          candidate.aliases?.some(matches) ||
          candidate.fileTypes?.some(matches)
        )
    );

    if (customMatch) {
      languageId = customMatch.name || lang;
      primaryLang = customMatch;
    } else if (langAliases?.[lang]) {
      // Language is aliased
      languageId = langAliases[lang];
      primaryLang = langAliases[lang];
    } else {
      // For any other string, pass it through to the factory
      languageId = lang;
      primaryLang = lang;
    }
  }

  return {
    languageId,
    langsToLoad: dedupeLanguages([
      primaryLang,
      ...preloadLangs,
      ...customLangs,
    ]),
  };
};
