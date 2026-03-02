import type { Theme, Themes } from './types';
import type { ThemeRegistrationAny } from 'shiki/core';

/**
 * Resolved themes and metadata
 */
export interface ThemeResult {
  isMultiTheme: boolean;
  themeId: Theme;
  multiTheme?: Themes | null;
  singleTheme?: Theme;
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
