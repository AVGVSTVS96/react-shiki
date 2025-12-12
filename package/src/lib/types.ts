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
  BundledHighlighterOptions,
  ThemedToken,
  TokensResult,
} from 'shiki';

import type { ReactNode } from 'react';

import type { LanguageRegistration } from './extended-types';

import type { Element as HastElement } from 'hast';

/** Use to type `node` from react-markdown */
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

type OutputFormatMap = {
  react: ReactNode;
  html: string;
  tokens: TokensResult;
};

type OutputFormat = keyof OutputFormatMap;

interface ReactShikiOptions<F extends OutputFormat = 'react'> {
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
   * Output format for the highlighted code.
   * - 'react': Returns React nodes (default, safer)
   * - 'html': Returns HTML string (~15-45% faster, requires dangerouslySetInnerHTML)
   * - 'tokens': Returns raw Shiki tokens (array of themed tokens per line)
   * @default 'react'
   */
  outputFormat?: F;

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

  /**
   * Whether to show line numbers
   * @default false
   */
  showLineNumbers?: boolean;

  /**
   * Starting line number (when showLineNumbers is true)
   * @default 1
   */
  startingLineNumber?: number;
}

interface HighlighterOptions<F extends OutputFormat = 'react'>
  extends ReactShikiOptions<F>,
    Pick<
      CodeOptionsMultipleThemes<BundledTheme>,
      'defaultColor' | 'cssVariablePrefix'
    >,
    Omit<CodeToHastOptions, 'lang' | 'theme' | 'themes'>,
    Pick<
      BundledHighlighterOptions<string, string>,
      'langAlias' | 'engine'
    > {}

/**
 * Public API signature for the useShikiHighlighter hook.
 * Generic parameter narrows return type based on outputFormat option.
 *
 * Returns immediately with a fallback (unstyled code) while highlighting
 * is in progress - never returns null.
 *
 * @example
 * // Returns ReactNode
 * const jsx = useShikiHighlighter(code, 'ts', 'nord');
 *
 * // Returns string
 * const html = useShikiHighlighter(code, 'ts', 'nord', { outputFormat: 'html' });
 *
 * // Returns TokensResult
 * const result = useShikiHighlighter(code, 'ts', 'nord', { outputFormat: 'tokens' });
 */
export type UseShikiHighlighter = <F extends OutputFormat = 'react'>(
  code: string,
  lang: Language,
  themeInput: Theme | Themes,
  options?: HighlighterOptions<F>
) => OutputFormatMap[F];

export type {
  Language,
  Theme,
  Themes,
  Element,
  HighlighterOptions,
  OutputFormat,
  OutputFormatMap,
  ThemedToken,
  TokensResult,
};
