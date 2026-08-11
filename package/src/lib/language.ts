import type { Language, PreloadLanguage } from './types';
import { guessEmbeddedLanguages, isSpecialLang } from 'shiki/core';
import type {
  DynamicImportLanguageRegistration,
  Highlighter,
  HighlighterCore,
  LanguageInput,
  LanguageRegistration,
} from 'shiki';

export const FALLBACK_LANGUAGE = 'plaintext';

export const getEmbeddedLanguages = (
  code: string,
  languageId: string,
  highlighter: Highlighter | HighlighterCore
): LanguageInput[] => {
  const bundled: Record<string, LanguageInput> =
    highlighter.getBundledLanguages();
  return guessEmbeddedLanguages(code, languageId).flatMap(
    (language) => bundled[language] ?? []
  );
};

/**
 * Resolved languages and metadata
 */
type LanguageResult = {
  languageId: string;
  langsToLoad: PreloadLanguage[];
};

const toArray = <T>(value?: T | T[]): T[] =>
  value == null ? [] : Array.isArray(value) ? value : [value];

/** Deferred `LanguageInput` forms (getter, promise, module, array) that shiki resolves itself */
type DynamicLanguage = Exclude<LanguageInput, LanguageRegistration>;

const isDynamicLanguage = (
  lang: PreloadLanguage
): lang is DynamicLanguage =>
  typeof lang === 'function' ||
  lang instanceof Promise ||
  Array.isArray(lang) ||
  (typeof lang === 'object' && lang != null && 'default' in lang);

const languageKey = (lang: PreloadLanguage): string | object | null => {
  if (lang == null) return null;
  if (typeof lang === 'string') return `s:${lang}`;
  if (isDynamicLanguage(lang)) return lang;
  return `o:${lang.name}::${lang.scopeName}`;
};

const dedupeLanguages = (langs: PreloadLanguage[]): PreloadLanguage[] => {
  const seen = new Set<string | object>();
  const deduped: PreloadLanguage[] = [];

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
 * Objects are validated as grammar registrations (name + scopeName);
 * dynamic imports pass through for shiki to resolve.
 */
export const isLoadableLanguage = <T extends string>(
  lang: PreloadLanguage,
  bundledLanguages: Record<T, DynamicImportLanguageRegistration>
): lang is NonNullable<PreloadLanguage> => {
  if (lang == null) return false;
  if (typeof lang === 'string') return lang in bundledLanguages;
  if (isDynamicLanguage(lang)) return true;
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
 * A registration matches a query by name, scopeName (full or its last
 * segment, e.g. "source.tsx" -> "tsx"), aliases, or fileTypes.
 */
const registrationMatches = (
  candidate: LanguageRegistration,
  matches: (str: string | undefined) => boolean
): boolean =>
  matches(candidate.name) ||
  matches(candidate.scopeName) ||
  matches(candidate.scopeName?.split('.').pop()) ||
  !!candidate.aliases?.some(matches) ||
  !!candidate.fileTypes?.some(matches);

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
  preloadLanguages?: PreloadLanguage | PreloadLanguage[]
): LanguageResult => {
  const customLangs = toArray(customLanguages);
  const preloadLangs = toArray(preloadLanguages);

  const result = (
    languageId: string,
    primary?: Language
  ): LanguageResult => ({
    languageId,
    langsToLoad: dedupeLanguages([
      primary,
      ...preloadLangs,
      ...customLangs,
    ]),
  });

  if (lang == null || (typeof lang === 'string' && !lang.trim())) {
    return result(FALLBACK_LANGUAGE);
  }

  if (typeof lang === 'object') {
    return result(lang.name, lang);
  }

  const normalized = lang.trim();
  const query = normalized.toLowerCase();
  const matches = (str: string | undefined): boolean =>
    str?.toLowerCase() === query;

  // Custom registrations (from both customLanguages and preloadLanguages)
  const customMatch = [...customLangs, ...preloadLangs].find(
    (candidate): candidate is LanguageRegistration =>
      typeof candidate === 'object' &&
      candidate != null &&
      !isDynamicLanguage(candidate) &&
      registrationMatches(candidate, matches)
  );
  if (customMatch) {
    return result(customMatch.name || normalized, customMatch);
  }

  const alias = Object.entries(langAliases ?? {}).find(([name]) =>
    matches(name)
  )?.[1];
  if (alias) {
    return result(alias, alias);
  }

  // Any other string passes through to the factory
  return result(normalized, normalized);
};
