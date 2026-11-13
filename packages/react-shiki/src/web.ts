import { useHighlight } from './lib/hook';
import { createWebHighlighter } from './bundles/web';
import type { UseShikiHighlighter } from './lib/types';
import { createShikiHighlighterComponent } from './lib/component';
// oxlint-disable-next-line unicorn/prefer-export-from -- `export type … from` here makes tsdown fold the core entry's declarations into the shared .d.mts chunk
import type { ShikiHighlighterProps } from './lib/component';

export { isInlineCode, rehypeInlineCodeProperty } from './lib/plugins';

export type { ShikiHighlighterProps };

export type {
  UseShikiHighlighter,
  Language,
  PreloadLanguage,
  Theme,
  Themes,
  Element,
  EngineName,
  HighlighterOptions,
  HighlighterOptionsFor,
  HighlightCache,
  HighlightResult,
  OutputFormat,
} from './lib/types';

export {
  createJavaScriptRegexEngine,
  createJavaScriptRawEngine,
} from 'shiki/engine/javascript';

export type {
  LanguageRegistration,
  TokensResult,
} from 'shiki/bundle/web';

/**
 * Highlight code with shiki (web bundle)
 *
 * @param code - Code to highlight
 * @param lang - Language (bundled or custom)
 * @param theme - Theme (bundled, multi-theme, or custom)
 * @param options - react-shiki options + shiki options
 * @returns Highlighted code as React elements (default), HTML string, or Shiki tokens, based on `outputFormat`
 *
 * @example
 * ```tsx
 * const highlighted = useShikiHighlighter(
 *   'const x = 1;',
 *   'typescript',
 *   {
 *     light: 'github-light',
 *     dark: 'github-dark'
 *   }
 * );
 * ```
 *
 * Web bundle (~3.8MB minified, 695KB gzipped). For other bundles: `react-shiki` or `react-shiki/core`
 */
export const useShikiHighlighter: UseShikiHighlighter = (
  code,
  lang,
  themeInput,
  options = {}
) => useHighlight(code, lang, themeInput, options, createWebHighlighter);

/**
 * ShikiHighlighter component using the web bundle.
 * Includes web-focused languages for balanced size and functionality.
 */
export const ShikiHighlighter =
  // oxlint-disable-next-line eslint/no-inline-comments -- the #__PURE__ annotation lets bundlers drop the component when only the hook is used
  /*#__PURE__*/ createShikiHighlighterComponent(useShikiHighlighter);

export default ShikiHighlighter;
