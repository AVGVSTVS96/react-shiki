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
  langsToLoad: Language;
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
 *   - langsToLoad: The language object or string id to load
 */
export const resolveLanguage = (
  lang: Language,
  customLanguages?: LanguageRegistration | LanguageRegistration[],
  langAliases?: Record<string, string>
): LanguageResult => {
  const normalizedCustomLangs = customLanguages
    ? Array.isArray(customLanguages)
      ? customLanguages
      : [customLanguages]
    : [];

  // Language is null or empty string
  if (lang == null || (typeof lang === 'string' && !lang.trim())) {
    return {
      languageId: FALLBACK_LANGUAGE,
      langsToLoad: undefined,
    };
  }

  // Language is custom
  if (typeof lang === 'object') {
    return {
      languageId: lang.name,
      langsToLoad: lang,
    };
  }

  // Language is string
  const lowerLang = lang.toLowerCase();
  const matches = (str: string | undefined): boolean =>
    str?.toLowerCase() === lowerLang;

  // Check if the string identifies a provided custom language
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
      langsToLoad: customMatch,
    };
  }

  // Check if language is aliased
  if (langAliases?.[lang]) {
    return {
      languageId: langAliases[lang],
      langsToLoad: langAliases[lang],
    };
  }

  // For any other string, pass it through to the factory
  return {
    languageId: lang,
    langsToLoad: lang,
  };
};
