import type {
  BundledLanguage,
  SpecialLanguage,
  BundledTheme,
  CodeOptionsMultipleThemes,
  CodeToHastOptionsCommon,
  ThemeRegistrationAny,
  StringLiteralUnion,
} from 'shiki';

import type { LanguageRegistration } from './extended-types';

import type { Element as HastElement } from 'hast';

/**
 * HTML Element, use to type `node` from react-markdown
 */
type Element = HastElement;

/**
 * A Shiki BundledLanguage or a custom textmate grammar object
 * @see https://shiki.style/languages
 */
type Language =
  | BundledLanguage
  | LanguageRegistration
  | SpecialLanguage
  | (string & {})
  | undefined;

/**
 * A Shiki BundledTheme or a custom textmate theme object
 * @see https://shiki.style/themes
 */
type Theme = ThemeRegistrationAny | StringLiteralUnion<BundledTheme>;

/**
 * A map of color names to themes.
 * This allows you to specify multiple themes for the generated code.
 * Supports custom textmate theme objects in addition to Shiki's bundled themes
 *
 * @example
 * ```ts
 * useShikiHighlighter(code, language, {
 *   light: 'github-light',
 *   dark: 'github-dark',
 *   dim: 'github-dark-dimmed'
 * })
 * ```
 *
 * @see https://shiki.style/guide/dual-themes
 */
type Themes = {
  [key: string]: ThemeRegistrationAny | StringLiteralUnion<BundledTheme>;
};

/**
 * Configuration options specific to react-shiki
 */
type ReactShikiOptions = {
  /**
   * Minimum time (in milliseconds) between highlight operations.
   * @default undefined (no throttling)
   */
  delay?: number;

  /**
   * Custom textmate grammars to be preloaded for highlighting.
   */
  customLanguages?: LanguageRegistration | LanguageRegistration[];
};

/**
 * Configuration options for the syntax highlighter
 */
type HighlighterOptions = ReactShikiOptions &
  Pick<
    CodeOptionsMultipleThemes<BundledTheme>,
    'defaultColor' | 'cssVariablePrefix'
  > &
  Pick<CodeToHastOptionsCommon, 'transformers'>;

/**
 * Props for the ShikiHighlighter component
 */
export interface ShikiHighlighterProps extends HighlighterOptions {
  /**
   * The programming language for syntax highlighting
   * Supports custom textmate grammar objects in addition to Shiki's bundled languages
   * @see https://shiki.style/languages
   */
  language: Language;

  /**
   * The code to be highlighted
   */
  children: string;

  /**
   * The color theme or themes for syntax highlighting
   * Supports single, dual, or multiple themes
   * Supports custom textmate theme objects in addition to Shiki's bundled themes
   *
   * @example
   * theme='github-dark' // single theme
   * theme={{ light: 'github-light', dark: 'github-dark' }} // multi-theme
   *
   * @see https://shiki.style/themes
   */
  theme: Theme | Themes;

  /**
   * Controls the application of default styles to the generated code blocks
   *
   * Default styles include padding, overflow handling, border radius, language label styling, and font settings
   * @default true
   */
  addDefaultStyles?: boolean;

  /**
   * Add custom inline styles to the generated code block
   */
  style?: React.CSSProperties;

  /**
   * Add custom inline styles to the language label
   */
  langStyle?: React.CSSProperties;

  /**
   * Add custom CSS class names to the generated code block
   */
  className?: string;

  /**
   * Add custom CSS class names to the language label
   */
  langClassName?: string;

  /**
   * Whether to show the language label
   * @default true
   */
  showLanguage?: boolean;

  /**
   * The HTML element that wraps the generated code block.
   * @default 'pre'
   */
  as?: React.ElementType;
}


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

export type { Language, Theme, Themes, HighlighterOptions, TimeoutState, Element };
