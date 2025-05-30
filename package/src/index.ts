export { useShikiHighlighter } from './hook';
export { isInlineCode, rehypeInlineCodeProperty } from './utils';

export {
  ShikiHighlighter as default,
  type ShikiHighlighterProps,
} from './component';

export type {
  Language,
  Theme,
  Themes,
  Element,
  HighlighterOptions,
} from './types';

export { createHighlighterCore } from 'shiki/core';
export { createOnigurumaEngine } from 'shiki/engine/oniguruma';
export { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
