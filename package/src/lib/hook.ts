import { useEffect, useMemo, useRef, useState } from 'react';
import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import type { CodeToHastOptions } from 'shiki';

import type {
  BaseHighlighterOptions,
  HighlighterFactory,
  HighlighterOptions,
  HighlightResultMap,
  Language,
  OutputFormat,
  Theme,
  Themes,
  TimeoutState,
  UseShikiHighlighter,
} from './types';

import { throttleHighlighting, useStableValue } from './utils';
import {
  getEmbeddedLanguages,
  resolveLanguage,
  resolveLoadedLanguage,
} from './language';
import { resolveTheme } from './theme';
import { buildShikiOptions } from './options';

export async function highlight<F extends OutputFormat = 'react'>(
  code: string,
  resolved: {
    languageId: string;
    langsToLoad: Language[];
    themesToLoad: Theme[];
    shikiOptions: CodeToHastOptions;
  },
  opts: Pick<HighlighterOptions, 'highlighter' | 'engine'> & {
    outputFormat?: F;
  },
  factory: HighlighterFactory
): Promise<HighlightResultMap[F]> {
  const { languageId, langsToLoad, themesToLoad, shikiOptions } =
    resolved;
  const format: OutputFormat = opts.outputFormat ?? 'react';

  const highlighter =
    opts.highlighter ??
    (await (async () => {
      const hl = await factory(langsToLoad, themesToLoad, opts.engine);
      await hl.loadLanguage(
        ...getEmbeddedLanguages(code, languageId, hl)
      );
      return hl;
    })());

  const language = resolveLoadedLanguage(
    languageId,
    highlighter.getLoadedLanguages()
  );
  const options = { ...shikiOptions, lang: language };

  const outputs: { [K in OutputFormat]: () => HighlightResultMap[K] } = {
    react: () =>
      toJsxRuntime(highlighter.codeToHast(code, options), {
        jsx,
        jsxs,
        Fragment,
      }),
    html: () => highlighter.codeToHtml(code, options),
    tokens: () => highlighter.codeToTokens(code, options),
  };

  return outputs[format]() as HighlightResultMap[F];
}

export const useHighlight = <F extends OutputFormat = 'react'>(
  code: string,
  lang: Language,
  themeInput: Theme | Themes,
  options: BaseHighlighterOptions & { outputFormat?: F } = {},
  highlighterFactory: HighlighterFactory
): HighlightResultMap[F] | null => {
  const [highlightedCode, setHighlightedCode] = useState<
    HighlightResultMap[F] | null
  >(null);

  const stableLang = useStableValue(lang);
  const stableTheme = useStableValue(themeInput);
  const stableOpts = useStableValue(options);

  const resolved = useMemo(() => {
    const { languageId, langsToLoad } = resolveLanguage(
      stableLang,
      stableOpts.customLanguages,
      stableOpts.langAlias,
      stableOpts.preloadLanguages
    );

    const theme = resolveTheme(stableTheme);

    const shikiOptions = buildShikiOptions(languageId, theme, stableOpts);
    return {
      languageId,
      langsToLoad,
      themesToLoad: theme.themesToLoad,
      shikiOptions,
    };
  }, [stableLang, stableTheme, stableOpts]);

  const requestIdRef = useRef(0);

  const timeoutControl = useRef<TimeoutState>({
    nextAllowedTime: 0,
    timeoutId: undefined,
  });

  useEffect(() => {
    const requestId = ++requestIdRef.current;

    if (!resolved.languageId) return;

    const run = async () => {
      try {
        const result = await highlight<F>(
          code,
          resolved,
          stableOpts,
          highlighterFactory
        );
        if (requestId === requestIdRef.current) {
          setHighlightedCode(result);
        }
      } catch (error) {
        console.error('[react-shiki] highlight failed', error);
      }
    };

    if (stableOpts.delay) {
      throttleHighlighting(run, timeoutControl, stableOpts.delay);
    } else {
      run();
    }

    return () => {
      clearTimeout(timeoutControl.current.timeoutId);
    };
  }, [code, resolved, stableOpts, highlighterFactory]);

  return highlightedCode;
};

/**
 * Create a `useShikiHighlighter` hook bound to a specific highlighter factory.
 * Used by the bundled entry points (full / web / core).
 */
export const createUseShikiHighlighter = (
  factory: HighlighterFactory
): UseShikiHighlighter => {
  return <F extends OutputFormat = 'react'>(
    code: string,
    lang: Language,
    themeInput: Theme | Themes,
    options?: BaseHighlighterOptions & { outputFormat?: F }
  ) => useHighlight<F>(code, lang, themeInput, options, factory);
};
