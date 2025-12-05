import { useShikiHighlighter as useBaseHook } from './lib/hook';
import { validateCoreHighlighter } from './bundles/core';
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

export { createHighlighterCore } from 'shiki/core';
export { createOnigurumaEngine } from 'shiki/engine/oniguruma';
export {
  createJavaScriptRegexEngine,
  createJavaScriptRawEngine,
} from 'shiki/engine/javascript';

/** Core bundle (minimal). Requires custom highlighter. For plug-and-play: `react-shiki` or `react-shiki/web` */
export const useShikiHighlighter = <F extends OutputFormat = 'react'>(
  code: string,
  lang: Language,
  themeInput: Theme | Themes,
  options: HighlighterOptions<F> = {} as HighlighterOptions<F>
): OutputFormatMap[F] | null => {
  const highlighter = validateCoreHighlighter(options.highlighter);

  return useBaseHook(
    code,
    lang,
    themeInput,
    { ...options, highlighter },
    async () => highlighter
  );
};

export const ShikiHighlighter = createShikiHighlighterComponent(
  useShikiHighlighter
);
export default ShikiHighlighter;
