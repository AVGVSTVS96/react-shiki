import { useShikiHighlighter as useBaseHook } from './lib/hook';
import { validateCoreHighlighter } from './bundles/core';

export { isInlineCode, rehypeInlineCodeProperty } from './lib/utils';

import { createShikiHighlighterComponent, type ShikiHighlighterProps } from './lib/component';

export type { ShikiHighlighterProps };

export type {
  Language,
  Theme,
  Themes,
  Element,
  HighlighterOptions,
} from './lib/types';

export { createHighlighterCore } from 'shiki/core';
export { createOnigurumaEngine } from 'shiki/engine/oniguruma';
export { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

/**
 * A React hook that provides syntax highlighting using Shiki with a custom highlighter.
 * Requires a highlighter to be provided in options for minimal bundle size.
 * 
 * Bundle size: Minimal (only what you import)
 * 
 * @example
 * ```ts
 * import { createHighlighterCore, createOnigurumaEngine } from 'react-shiki/core';
 * 
 * const highlighter = await createHighlighterCore({
 *   themes: [import('@shikijs/themes/nord')],
 *   langs: [import('@shikijs/langs/typescript')],
 *   engine: createOnigurumaEngine(import('shiki/wasm'))
 * });
 * 
 * const code = useShikiHighlighter(code, 'typescript', 'nord', { highlighter });
 * ```
 * 
 * For plug-and-play usage, consider:
 * - `react-shiki` for all languages
 * - `react-shiki/web` for web-focused languages
 */
export const useShikiHighlighter = (
  code: string,
  lang: Parameters<typeof useBaseHook>[1],
  themeInput: Parameters<typeof useBaseHook>[2],
  options: Parameters<typeof useBaseHook>[3] = {}
) => {
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
 * Requires a highlighter to be provided for minimal bundle size.
 */
export const ShikiHighlighter = createShikiHighlighterComponent(useShikiHighlighter);
export default ShikiHighlighter;