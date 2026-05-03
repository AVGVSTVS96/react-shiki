import type { Theme, Themes } from './types';
import type { ThemeRegistrationAny } from 'shiki/core';

export const DEFAULT_THEMES: Themes = {
  light: 'github-light',
  dark: 'github-dark',
};

export type ResolvedTheme =
  | { isMulti: true; themes: Themes; themesToLoad: Theme[] }
  | { isMulti: false; theme: Theme; themesToLoad: Theme[] };

const isTextmateTheme = (
  value: unknown
): value is ThemeRegistrationAny => {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ThemeRegistrationAny> & {
    settings?: unknown;
  };
  const hasTokens =
    Array.isArray(v.tokenColors) || Array.isArray(v.settings);
  const hasIdentity =
    typeof v.name === 'string' || typeof v.type === 'string';
  return hasTokens && hasIdentity;
};

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

  const validEntries = Object.entries(themeInput).filter(
    ([key, value]) =>
      key.trim() !== '' &&
      ((typeof value === 'string' && value.trim() !== '') ||
        isTextmateTheme(value))
  );

  if (validEntries.length === 0) {
    console.warn(
      '[react-shiki] invalid multi-theme config, falling back to defaults'
    );
    return {
      isMulti: true,
      themes: DEFAULT_THEMES,
      themesToLoad: Object.values(DEFAULT_THEMES),
    };
  }

  if (validEntries.length !== Object.keys(themeInput).length) {
    console.warn(
      '[react-shiki] multi-theme config contained invalid entries; they were dropped'
    );
  }

  const themes = Object.fromEntries(validEntries) as Themes;
  return {
    isMulti: true,
    themes,
    themesToLoad: validEntries.map(([, value]) => value as Theme),
  };
}
