import { useShikiHighlighter as useBaseHook } from './lib/hook';
import { validateCoreHighlighter } from './bundles/core';
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
 * @param options - react-shiki options + shiki options
 * @returns Highlighted code as React elements or HTML string
 *
 * @example
 * ```tsx
 * import { createHighlighterCore, createOnigurumaEngine } from 'react-shiki/core';
 *
 *
 * const highlighter = await createHighlighterCore({
 *   themes: [import('@shikijs/themes/github-light'), import('@shikijs/themes/github-dark')],
 *   langs: [import('@shikijs/langs/typescript')],
 *   engine: createOnigurumaEngine(import('shiki/wasm'))
 * });
 *
 * const highlighted = useShikiHighlighter(
 *   'const x = 1;',
 *   'typescript',
 *   {
 *     light: 'github-light',
 *     dark: 'github-dark'
 *   },
 *   { highlighter }
 * );
 * ```
 *
 * Core bundle (minimal). For plug-and-play: `react-shiki` or `react-shiki/web`
 */
export const useShikiHighlighter: UseShikiHighlighter = (
  code,
  lang,
  themeInput,
  options = {}
) => {
  // Validate that highlighter is provided
  const highlighter = validateCoreHighlighter(options.highlighter);

  return useBaseHook(
    code,
    lang,
    themeInput,
    {
      ...options,
      highlighter,
    },
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
