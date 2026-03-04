import { useShikiHighlighter as useBaseHook } from './lib/hook';
import { useShikiStreamHighlighter as useBaseStreamHook } from './lib/stream-hook';
import { createFullHighlighter } from './bundles/full';
import type { UseShikiHighlighter } from './lib/types';
import type { UseShikiStreamHighlighter } from './lib/stream-types';

export { isInlineCode, rehypeInlineCodeProperty } from './lib/plugins';

import {
  createShikiHighlighterComponent,
  type ShikiHighlighterProps,
} from './lib/component';

import {
  createShikiStreamComponent,
  type ShikiStreamHighlighterProps,
} from './lib/stream-component';

export type { ShikiHighlighterProps };
export type { ShikiStreamHighlighterProps };

export type {
  UseShikiHighlighter,
  Language,
  Theme,
  Themes,
  Element,
  HighlighterOptions,
} from './lib/types';

export type {
  UseShikiStreamHighlighter,
  ShikiStreamInput,
  StreamHighlighterOptions,
  StreamHighlighterResult,
  StreamStatus,
  BatchStrategy,
} from './lib/stream-types';

export { ShikiTokenRenderer, type ShikiTokenRendererProps } from './lib/stream-renderer';

export {
  createJavaScriptRegexEngine,
  createJavaScriptRawEngine,
} from 'shiki/engine/javascript';

export type { LanguageRegistration } from 'shiki';

/**
 * Highlight code with shiki (full bundle)
 *
 * @param code - Code to highlight
 * @param lang - Language (bundled or custom)
 * @param theme - Theme (bundled, multi-theme, or custom)
 * @param options - react-shiki options + shiki options
 * @returns Highlighted code as React elements or HTML string
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
 * Full bundle (~6.4MB minified, 1.2MB gzipped). For smaller bundles: `react-shiki/web` or `react-shiki/core`
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

/**
 * Streaming syntax highlighter hook (full bundle)
 *
 * @param input - Input source (code, stream, or chunks)
 * @param lang - Language (bundled or custom)
 * @param theme - Theme (bundled, multi-theme, or custom)
 * @param options - Streaming options
 * @returns Token state, status, error, and reset function
 *
 * Full bundle (~6.4MB minified, 1.2MB gzipped). For smaller bundles: `react-shiki/web` or `react-shiki/core`
 */
export const useShikiStreamHighlighter: UseShikiStreamHighlighter = (
  input,
  lang,
  themeInput,
  options = {}
) => {
  return useBaseStreamHook(
    input,
    lang,
    themeInput,
    options,
    createFullHighlighter
  );
};

/**
 * ShikiStreamHighlighter component using the full bundle.
 * Composes the streaming hook with a default token renderer.
 */
export const ShikiStreamHighlighter = createShikiStreamComponent(
  useShikiStreamHighlighter
);
