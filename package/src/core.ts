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
 * - `react-shiki` for full shiki bundle (~6.4MB minified, 1.2MB gzipped)
 * - `react-shiki/web` for smaller shiki web bundle (~3.8MB minified, 695KB gzipped)
 */
export const useShikiHighlighter = (
  code: string,
  lang: Parameters<typeof useBaseHook>[1],
  themeInput: Parameters<typeof useBaseHook>[2],
  options: Parameters<typeof useBaseHook>[4] = {}
) => {
  // Validate that highlighter is provided
  const highlighter = validateCoreHighlighter(options.highlighter);
  
  return useBaseHook(
    code,
    lang, 
    themeInput,
    async () => highlighter,
    { ...options, highlighter }
  );
};

/**
 * ShikiHighlighter component using a custom highlighter.
 * Requires a highlighter to be provided.
 */
export const ShikiHighlighter = createShikiHighlighterComponent(useShikiHighlighter);
export default ShikiHighlighter;
