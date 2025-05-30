import { useShikiHighlighter as useBaseHook } from './lib/hook';
import { createWebHighlighter } from './bundles/web';

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

/**
 * A React hook that provides syntax highlighting using Shiki with the web bundle.
 * Includes web-focused languages (HTML, CSS, JS, TS, JSON, Markdown, Astro, JSX, Svelte, Vue etc.)
 * 
 * Bundle size: ~3.8MB minified (695KB gzipped)
 * 
 * For other options, consider:
 * - `react-shiki` for full shiki bundle (~6.4MB minified, 1.2MB gzipped)
 * - `react-shiki/core` for custom fine-grained bundle
 */
export const useShikiHighlighter = (
  code: string,
  lang: Parameters<typeof useBaseHook>[1],
  themeInput: Parameters<typeof useBaseHook>[2],
  options: Parameters<typeof useBaseHook>[4] = {}
) => {
  return useBaseHook(
    code,
    lang, 
    themeInput,
    createWebHighlighter,
    options
  );
};

/**
 * ShikiHighlighter component using the web bundle.
 * Includes web-focused languages for balanced size and functionality.
 */
export const ShikiHighlighter = createShikiHighlighterComponent(useShikiHighlighter);
export default ShikiHighlighter;
