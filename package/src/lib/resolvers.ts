import type { Language, Theme, Themes } from './types';
import type { ThemeRegistrationAny } from 'shiki/core';
import type { LanguageRegistration } from './extended-types';

type LanguageResult = {
  languageId: string;
  displayLanguageId: string | null;
  langsToLoad: Language;
};

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

export interface ThemeResult {
  isMultiTheme: boolean;
  themeId: Theme;
  multiTheme?: Themes | ThemeRegistrationAny | null;
  singleTheme?: Theme | undefined;
  themesToLoad: Theme[];
}

const isTextmateTheme = (value: unknown): value is ThemeRegistrationAny =>
  typeof value === 'object' &&
  value !== null &&
  'tokenColors' in value &&
  Array.isArray((value as ThemeRegistrationAny).tokenColors);

export function resolveTheme(themeInput: Theme | Themes): ThemeResult {
  const inputIsTextmateTheme = isTextmateTheme(themeInput);

  // Non-textmate objects are assumed to be multi-theme configs
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

    // Invalid config returns null; fallback handled in buildShikiOptions
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
