import { useEffect, useMemo, useRef, useState } from 'react';
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

import { getEmbeddedLanguages, resolveHighlight } from './highlight';
import { throttleHighlighting, useStableValue } from './utils';
import { resolveLanguage } from './language';
import { resolveTheme } from './theme';
import { buildShikiOptions } from './options';

export interface ResolvedHighlightInput {
  languageId: string;
  langsToLoad: Language[];
  themesToLoad: Theme[];
  shikiOptions: CodeToHastOptions;
}

export async function highlight(
  code: string,
  resolved: ResolvedHighlightInput,
  opts: Pick<
    HighlighterOptions,
    'highlighter' | 'outputFormat' | 'engine'
  >,
  factory: HighlighterFactory
) {
  const { languageId, langsToLoad, themesToLoad, shikiOptions } =
    resolved;

  const hl =
    opts.highlighter ??
    (await factory(langsToLoad, themesToLoad, opts.engine));

  if (!opts.highlighter) {
    const embedded = getEmbeddedLanguages(code, languageId, hl);
    if (embedded.length > 0) {
      await hl.loadLanguage(...embedded);
    }
  }

  return resolveHighlight(
    code,
    languageId,
    opts.outputFormat,
    shikiOptions,
    hl
  );
}

export const useShikiHighlighter = (
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
        console.error(error);
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
