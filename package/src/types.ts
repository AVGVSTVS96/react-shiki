import type {
  BundledLanguage,
  SpecialLanguage,
  BundledTheme,
  CodeOptionsMultipleThemes,
  ThemeRegistrationAny,
  StringLiteralUnion,
  CodeToHastOptions,
  Highlighter,
  HighlighterCore,
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
  | LanguageRegistration
  | StringLiteralUnion<BundledLanguage | SpecialLanguage>
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
interface ReactShikiOptions {
  /**
   * Minimum time (in milliseconds) between highlight operations.
   * @default undefined (no throttling)
   */
  delay?: number;

  /**
   * Custom textmate grammars to be preloaded for highlighting.
   */
  customLanguages?: LanguageRegistration | LanguageRegistration[];

  /**
   * Custom Shiki highlighter instance to use instead of the default one.
   * Keeps bundle small by only importing specified languages/themes.
   * Can be either a Highlighter or HighlighterCore instance.
   *
   * @example
   * import {
   *   createHighlighterCore,
   *   createOnigurumaEngine,
   *   useShikiHighlighter
   * } from "react-shiki";
   *
   * const customHighlighter = await createHighlighterCore({
   *   themes: [
   *     import('@shikijs/themes/nord')
   *   ],
   *   langs: [
   *     import('@shikijs/langs/javascript'),
   *     import('@shikijs/langs/typescript')
   *   ],
   *   engine: createOnigurumaEngine(import('shiki/wasm'))
   * });
   *
   * const highlightedCode = useShikiHighlighter(code, language, theme, {
   *   highlighter: customHighlighter,
   * });
   */
  highlighter?: Highlighter | HighlighterCore;
}

/**
 * Configuration options for the syntax highlighter
 * Extends CodeToHastOptions to allow passing any Shiki options directly
 */
interface HighlighterOptions
  extends ReactShikiOptions,
    Pick<
      CodeOptionsMultipleThemes<BundledTheme>,
      'defaultColor' | 'cssVariablePrefix'
    >,
    Omit<CodeToHastOptions, 'lang' | 'theme' | 'themes'> {}

/**
 * State for the throttling logic
 */
interface TimeoutState {
  /**
   * Id of the timeout that is currently scheduled
   */
  timeoutId: NodeJS.Timeout | undefined;
  /**
   * Next time when the timeout can be scheduled
   */
  nextAllowedTime: number;
}

export type {
  Language,
  Theme,
  Themes,
  Element,
  TimeoutState,
  HighlighterOptions,
};
