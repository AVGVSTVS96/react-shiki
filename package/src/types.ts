import type {
  BundledLanguage,
  SpecialLanguage,
  BundledTheme,
  ThemeRegistration,
  ShikiTransformer,
  StringLiteralUnion,
  ThemeRegistrationAny,
  CodeOptionsMultipleThemes,
} from 'shiki';

import type { LanguageRegistration } from './customTypes';

/**
 * Languages for syntax highlighting.
 * @see https://shiki.style/languages
 */
type Language =
  | BundledLanguage
  | LanguageRegistration
  | SpecialLanguage
  | (string & {})
  | undefined;

/**
 * A textmate theme object or a Shiki BundledTheme
 * @see https://shiki.style/themes
 */
type Theme = ThemeRegistration | BundledTheme;

/**
 * Multi-theme configuration for light/dark theme support
 * @see https://shiki.style/guide/dual-themes
 */
type Themes = CodeOptionsMultipleThemes<BundledTheme>['themes'];
// type Themes = Partial<
//   Record<
//     string,
//     ThemeRegistrationAny | StringLiteralUnion<BundledTheme, string>
//   >
// >;

/**
 * Configuration options for the syntax highlighter
 */
type HighlighterOptions = {
  /**
   * Minimum time (in milliseconds) between highlight operations.
   * @default undefined (no throttling)
   */
  delay?: number;

  /**
   * Custom Shiki transformers to apply to the highlighted code.
   */
  transformers?: ShikiTransformer[];

  /**
   * Custom textmate grammar to be preloaded for highlighting.
   */
  customLanguages?: LanguageRegistration | LanguageRegistration[];

  /**
   * Multi-theme configuration for light/dark mode support
   * @example { light: 'github-light', dark: 'github-dark' }
   */
  themes?: Themes;

  /**
   * The default theme applied to the code (via inline `color` style).
   * @default first theme key or 'light' if exists
   */
  defaultColor?: string | false;

  /**
   * Prefix of CSS variables used to store the color of the other theme.
   * @default '--shiki-'
   */
  cssVariablePrefix?: string;
};

/**
 * State for the throttling logic
 */
type TimeoutState = {
  /**
   * Id of the timeout that is currently scheduled
   */
  timeoutId: NodeJS.Timeout | undefined;
  /**
   * Next time when the timeout can be scheduled
   */
  nextAllowedTime: number;
};

export type { Language, Theme, Themes, HighlighterOptions, TimeoutState };
