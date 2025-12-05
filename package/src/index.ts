import { useShikiHighlighter as useBaseHook } from './lib/hook';
import { createFullHighlighter } from './bundles/full';
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

export {
  createJavaScriptRegexEngine,
  createJavaScriptRawEngine,
} from 'shiki/engine/javascript';

/**
 * Highlight code with shiki (full bundle)
 *
 * @param code - Code to highlight
 * @param lang - Language (bundled or custom)
 * @param theme - Theme (bundled, multi-theme, or custom)
 * @param options - react-shiki options + shiki options
 * @returns Highlighted code based on outputFormat option:
 *   - 'react' (default): ReactNode
 *   - 'html': string
 *   - 'tokens': TokensResult
 *
 * @example
 * ```tsx
 * // Default React output
 * const highlighted = useShikiHighlighter(code, 'typescript', 'github-dark');
 *
 * // HTML output
 * const html = useShikiHighlighter(code, 'typescript', 'github-dark', {
 *   outputFormat: 'html'
 * });
 *
 * // Token output for custom rendering
 * const tokens = useShikiHighlighter(code, 'typescript', 'github-dark', {
 *   outputFormat: 'tokens'
 * });
 * ```
 *
 * Full bundle (~6.4MB minified, 1.2MB gzipped).
 * For smaller bundles: `react-shiki/web` or `react-shiki/core`
 */
export const useShikiHighlighter = <F extends OutputFormat = 'react'>(
  code: string,
  lang: Language,
  themeInput: Theme | Themes,
  options: HighlighterOptions<F> = {} as HighlighterOptions<F>
): OutputFormatMap[F] | null => {
  return useBaseHook(
    code,
    lang,
    themeInput,
    options,
    createFullHighlighter
  );
};

// Type assertion to satisfy UseShikiHighlighter contract
const _typeCheck: UseShikiHighlighter = useShikiHighlighter;
void _typeCheck;

/**
 * ShikiHighlighter component using the full bundle.
 * Includes all languages and themes for maximum compatibility.
 */
export const ShikiHighlighter = createShikiHighlighterComponent(
  useShikiHighlighter
);
export default ShikiHighlighter;
