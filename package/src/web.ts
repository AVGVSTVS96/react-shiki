import { useShikiHighlighter as useBaseHook } from './lib/hook';
import { useShikiStreamHighlighter as useBaseStreamHook } from './lib/stream-hook';
import { createWebHighlighter } from './bundles/web';
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
  StreamSessionSummary,
  StreamSessionMode,
  StreamSessionEndReason,
  StreamStatus,
} from './lib/stream-types';

export {
  ShikiTokenRenderer,
  type ShikiTokenRendererProps,
} from './lib/stream-renderer';

export {
  createJavaScriptRegexEngine,
  createJavaScriptRawEngine,
} from 'shiki/engine/javascript';

export type { LanguageRegistration } from 'shiki/bundle/web';

/**
 * Highlight code with shiki (web bundle)
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
 * Web bundle (~3.8MB minified, 695KB gzipped). For other bundles: `react-shiki` or `react-shiki/core`
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

/**
 * Streaming syntax highlighter hook (web bundle)
 *
 * Web bundle (~3.8MB minified, 695KB gzipped). For other bundles: `react-shiki` or `react-shiki/core`
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
    createWebHighlighter
  );
};

/**
 * ShikiStreamHighlighter component using the web bundle.
 * Composes the streaming hook with a default token renderer.
 */
export const ShikiStreamHighlighter = createShikiStreamComponent(
  useShikiStreamHighlighter
);
