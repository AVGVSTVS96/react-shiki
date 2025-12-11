import type { Language, Theme, Themes } from './types';
import type { ThemeRegistrationAny } from 'shiki/core';
import type { LanguageRegistration } from './extended-types';

/**
 * Resolved languages and metadata
 */
type LanguageResult = {
  languageId: string;
  displayLanguageId: string | null;
  langsToLoad: Language;
};

/**
 * Resolves the language input to standardized IDs and objects for Shiki and UI display
 * @param lang The language input from props
 * @param customLanguages An array of custom textmate grammar objects or a single grammar object
 * @returns A LanguageResult object containing:
 *   - languageId: The resolved language ID
 *   - displayLanguageId: The display language ID
 *   - langToLoad: The language object or string id to load
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
      languageId: 'plaintext',
      displayLanguageId: 'plaintext',
      langsToLoad: undefined,
    };
  }

  // Language is custom
  if (typeof lang === 'object') {
    return {
      languageId: lang.name,
      displayLanguageId: lang.name || null,
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
      displayLanguageId: lang,
      langsToLoad: customMatch,
    };
  }

  // Check if language is aliased
  if (langAliases?.[lang]) {
    return {
      languageId: langAliases[lang],
      displayLanguageId: lang,
      langsToLoad: langAliases[lang],
    };
  }

  // For any other string, pass it through,
  // fallback is handled in highlighter factories
  return {
    languageId: lang,
    displayLanguageId: lang,
    langsToLoad: lang,
  };
};

/**
 * Resolved themes and metadata
 */
interface ThemeResult {
  isMultiTheme: boolean;
  themeId: Theme;
  multiTheme?: Themes | ThemeRegistrationAny | null;
  singleTheme?: Theme | undefined;
  themesToLoad: Theme[];
}

/**
 * Determines theme configuration and returns the resolved theme with metadata
 * @param themeInput - The theme input, either as a string name or theme object
 * @returns Object containing:
 *   - isMultiTheme: If theme input is a multi-theme configuration
 *   - themeId: Theme reference identifier
 *   - multiTheme: The multi-theme config if it exists
 *   - singleTheme: The single theme if it exists
 *   - themesToLoad: The themes to load when creating the highlighter
 */
const isTextmateTheme = (value: unknown): value is ThemeRegistrationAny =>
  typeof value === 'object' &&
  value !== null &&
  'tokenColors' in value &&
  Array.isArray((value as ThemeRegistrationAny).tokenColors);

export function resolveTheme(themeInput: Theme | Themes): ThemeResult {
  const inputIsTextmateTheme = isTextmateTheme(themeInput);

  // Assume non textmate objects are multi theme configs
  const isMultiThemeConfig =
    typeof themeInput === 'object' &&
    themeInput !== null &&
    !inputIsTextmateTheme;

  const validMultiThemeObj =
    typeof themeInput === 'object' &&
    themeInput !== null &&
    !inputIsTextmateTheme &&
    Object.entries(themeInput).some(
      ([key, value]) =>
        key &&
        value &&
        key.trim() !== '' &&
        value !== '' &&
        (typeof value === 'string' || isTextmateTheme(value))
    );

  if (isMultiThemeConfig) {
    const themeId = validMultiThemeObj
      ? `multi-${Object.values(themeInput)
          .map(
            (theme) =>
              (typeof theme === 'string'
                ? theme
                : (theme as { name?: string })?.name) || 'custom'
          )
          .sort()
          .join('-')}`
      : 'multi-default';

    // If config is invalid, return null to handle fallback in `buildShikiOptions()`
    return {
      isMultiTheme: true,
      themeId,
      multiTheme: validMultiThemeObj ? themeInput : null,
      themesToLoad: validMultiThemeObj ? Object.values(themeInput) : [],
    };
  }

  return {
    isMultiTheme: false,
    themeId:
      typeof themeInput === 'string'
        ? themeInput
        : themeInput?.name || 'custom',
    singleTheme: themeInput,
    themesToLoad: [themeInput],
  };
}
