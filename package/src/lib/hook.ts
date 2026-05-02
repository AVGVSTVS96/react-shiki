import { useEffect, useMemo, useRef, useState } from 'react';
import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import type { CodeToHastOptions } from 'shiki';

import type {
  HighlightedCode,
  HighlighterFactory,
  HighlighterOptions,
  Language,
  Theme,
  Themes,
  TimeoutState,
} from './types';

import { throttleHighlighting, useStableValue } from './utils';
import {
  getEmbeddedLanguages,
  resolveLanguage,
  resolveLoadedLanguage,
} from './language';
import { resolveTheme } from './theme';
import { buildShikiOptions } from './options';

export async function highlight(
  code: string,
  resolved: {
    languageId: string;
    langsToLoad: Language[];
    themesToLoad: Theme[];
    shikiOptions: CodeToHastOptions;
  },
  opts: Pick<
    HighlighterOptions,
    'highlighter' | 'outputFormat' | 'engine'
  >,
  factory: HighlighterFactory
) {
  const { languageId, langsToLoad, themesToLoad, shikiOptions } =
    resolved;

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

  return opts.outputFormat === 'html'
    ? highlighter.codeToHtml(code, options)
    : toJsxRuntime(highlighter.codeToHast(code, options), {
        jsx,
        jsxs,
        Fragment,
      });
}

export const useHighlight = (
  code: string,
  lang: Language,
  themeInput: Theme | Themes,
  options: HighlighterOptions = {},
  highlighterFactory: HighlighterFactory
) => {
  const [highlightedCode, setHighlightedCode] =
    useState<HighlightedCode>(null);

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
        const result = await highlight(
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
