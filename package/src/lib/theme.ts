import type { Theme, Themes } from './types';
import type { ThemeRegistrationAny } from 'shiki/core';

export const DEFAULT_THEMES: Themes = {
  light: 'github-light',
  dark: 'github-dark',
};

export type ResolvedTheme =
  | { isMulti: true; themes: Themes; themesToLoad: Theme[] }
  | { isMulti: false; theme: Theme; themesToLoad: Theme[] };

const isTextmateTheme = (value: unknown): value is ThemeRegistrationAny =>
  typeof value === 'object' &&
  value !== null &&
  'tokenColors' in value &&
  Array.isArray((value as ThemeRegistrationAny).tokenColors);

export function resolveTheme(themeInput: Theme | Themes): ResolvedTheme {
  if (
    typeof themeInput !== 'object' ||
    themeInput === null ||
    isTextmateTheme(themeInput)
  ) {
    return {
      isMulti: false,
      theme: themeInput,
      themesToLoad: [themeInput],
    };
  }

  const hasValidEntry = Object.entries(themeInput).some(
    ([key, value]) =>
      key.trim() !== '' &&
      ((typeof value === 'string' && value.trim() !== '') ||
        isTextmateTheme(value))
  );

  if (!hasValidEntry) {
    console.warn(
      '[react-shiki] invalid multi-theme config, falling back to defaults'
    );
    return {
      isMulti: true,
      themes: DEFAULT_THEMES,
      themesToLoad: Object.values(DEFAULT_THEMES),
    };
  }

  return {
    isMulti: true,
    themes: themeInput,
    themesToLoad: Object.values(themeInput),
  };
}
