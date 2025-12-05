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
export {
  useDeferredRender,
  type UseDeferredRenderOptions,
} from './lib/hooks/use-deferred-render';

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

/** Full bundle (~6.4MB). For smaller: `react-shiki/web` or `react-shiki/core` */
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

export const ShikiHighlighter = createShikiHighlighterComponent(
  useShikiHighlighter
);
export default ShikiHighlighter;
