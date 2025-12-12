import type {
  CodeOptionsSingleTheme,
  CodeOptionsMultipleThemes,
  BundledTheme,
} from 'shiki';
import type { ThemeRegistrationAny } from 'shiki/core';
import type { Theme, Themes } from './types';

export const DEFAULT_THEMES: Themes = {
  light: 'github-light',
  dark: 'github-dark',
};

export interface ThemeResolution {
  isMultiTheme: boolean;
  themeId: Theme;
  multiTheme?: Themes | ThemeRegistrationAny | null;
  singleTheme?: Theme | undefined;
  themesToLoad: Theme[];
}

export type ThemeShikiOptions =
  | CodeOptionsSingleTheme<BundledTheme>
  | CodeOptionsMultipleThemes<BundledTheme>;

const isTextmateTheme = (value: unknown): value is ThemeRegistrationAny =>
  typeof value === 'object' &&
  value !== null &&
  'tokenColors' in value &&
  Array.isArray((value as ThemeRegistrationAny).tokenColors);

export function resolveTheme(
  themeInput: Theme | Themes
): ThemeResolution {
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

export const toShikiOptions = (
  resolution: ThemeResolution
): ThemeShikiOptions => {
  const { isMultiTheme, multiTheme, singleTheme } = resolution;

  if (isMultiTheme) {
    return {
      themes: multiTheme || DEFAULT_THEMES,
    } as CodeOptionsMultipleThemes<BundledTheme>;
  }

  return {
    theme: singleTheme || DEFAULT_THEMES.dark,
  } as CodeOptionsSingleTheme<BundledTheme>;
};

export const getMultiThemeOptions = (
  resolution: ThemeResolution,
  defaultColor?: string | false,
  cssVariablePrefix?: string
): Record<string, unknown> => {
  if (!resolution.isMultiTheme) return {};
  return { defaultColor, cssVariablePrefix };
};
