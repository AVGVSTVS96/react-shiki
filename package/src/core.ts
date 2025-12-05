import { useShikiHighlighter as useBaseHook } from './lib/hook';
import { validateCoreHighlighter } from './bundles/core';
import type {
  UseShikiHighlighter,
  OutputFormat,
  OutputFormatMap,
  Language,
  Theme,
  Themes,
  HighlighterOptions,
} from './lib/types';

export { isInlineCode, rehypeInlineCodeProperty } from './lib/plugins';

import {
  createShikiHighlighterComponent,
  type ShikiHighlighterProps,
} from './lib/component';

export type { ShikiHighlighterProps };

export type {
  UseShikiHighlighter,
  Language,
  Theme,
  Themes,
  Element,
  HighlighterOptions,
  OutputFormat,
  OutputFormatMap,
  ThemedToken,
  TokensResult,
} from './lib/types';

export { createHighlighterCore } from 'shiki/core';
export { createOnigurumaEngine } from 'shiki/engine/oniguruma';
export {
  createJavaScriptRegexEngine,
  createJavaScriptRawEngine,
} from 'shiki/engine/javascript';

/**
 * Highlight code with shiki (core bundle)
 *
 * @param code - Code to highlight
 * @param lang - Language (bundled or custom)
 * @param theme - Theme (bundled, multi-theme, or custom)
 * @param options - react-shiki options + shiki options (highlighter required)
 * @returns Highlighted code based on outputFormat option:
 *   - 'react' (default): ReactNode
 *   - 'html': string
 *   - 'tokens': TokensResult
 *
 * @example
 * ```tsx
 * import { createHighlighterCore, createOnigurumaEngine } from 'react-shiki/core';
 *
 * const highlighter = await createHighlighterCore({
 *   themes: [import('@shikijs/themes/github-light'), import('@shikijs/themes/github-dark')],
 *   langs: [import('@shikijs/langs/typescript')],
 *   engine: createOnigurumaEngine(import('shiki/wasm'))
 * });
 *
 * // Default React output
 * const highlighted = useShikiHighlighter(code, 'typescript', 'github-dark', {
 *   highlighter
 * });
 *
 * // Token output for custom rendering
 * const tokens = useShikiHighlighter(code, 'typescript', 'github-dark', {
 *   highlighter,
 *   outputFormat: 'tokens'
 * });
 * ```
 *
 * Core bundle (minimal). For plug-and-play: `react-shiki` or `react-shiki/web`
 */
export const useShikiHighlighter = <F extends OutputFormat = 'react'>(
  code: string,
  lang: Language,
  themeInput: Theme | Themes,
  options: HighlighterOptions<F> = {} as HighlighterOptions<F>
): OutputFormatMap[F] | null => {
  // Validate that highlighter is provided
  const highlighter = validateCoreHighlighter(options.highlighter);

  return useBaseHook(
    code,
    lang,
    themeInput,
    { ...options, highlighter },
    async () => highlighter
  );
};

/**
 * ShikiHighlighter component using a custom highlighter.
 * Requires a highlighter to be provided.
 */
export const ShikiHighlighter = createShikiHighlighterComponent(
  useShikiHighlighter
);
export default ShikiHighlighter;
