import { useShikiHighlighter as useBaseHook } from './lib/hook';
import { createWebHighlighter } from './bundles/web';
import type { UseShikiHighlighter } from './lib/types';

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
} from './lib/types';

export {
  createJavaScriptRegexEngine,
  createJavaScriptRawEngine,
} from 'shiki/engine/javascript';

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
export const useShikiHighlighter: UseShikiHighlighter = (
  code,
  lang,
  themeInput,
  options = {}
) => {
  return useBaseHook(
    code,
    lang,
    themeInput,
    options,
    createWebHighlighter
  );
};

/**
 * ShikiHighlighter component using the web bundle.
 * Includes web-focused languages for balanced size and functionality.
 */
export const ShikiHighlighter = createShikiHighlighterComponent(
  useShikiHighlighter
);
export default ShikiHighlighter;
