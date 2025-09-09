import { useShikiHighlighter as useBaseHook } from './lib/hook';
import { createFullHighlighter } from './bundles/full';
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

/**
 * A React hook that provides syntax highlighting using Shiki with the full bundle.
 * Includes all languages and themes for maximum compatibility.
 *
 * Bundle size: ~6.4MB minified (1.2MB gzipped)
 *
 * For smaller bundles, consider:
 * - `react-shiki/web` for smaller shiki web bundle (~3.8MB minified, 695KB gzipped)
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
    createFullHighlighter
  );
};

/**
 * ShikiHighlighter component using the full bundle.
 * Includes all languages and themes for maximum compatibility.
 */
export const ShikiHighlighter = createShikiHighlighterComponent(
  useShikiHighlighter
);
export default ShikiHighlighter;
