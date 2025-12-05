import { useEffect, useMemo, useState } from 'react';

import type {
  Highlighter,
  HighlighterCore,
  Awaitable,
  RegexEngine,
} from 'shiki';

import type { ShikiLanguageRegistration } from './extended-types';

import type {
  Language,
  Theme,
  HighlighterOptions,
  Themes,
  OutputFormat,
  OutputFormatMap,
} from './types';

import { useStableOptions, useThrottledDebounce } from './utils';
import { resolveLanguage } from './language';
import { resolveTheme } from './theme';
import { buildShikiOptions } from './options';
import { transformOutput } from './output';

// Each entry point (index, web, core) provides a different factory for bundle optimization
type HighlighterFactory = (
  langsToLoad: ShikiLanguageRegistration,
  themesToLoad: Theme[],
  engine?: Awaitable<RegexEngine>
) => Promise<Highlighter | HighlighterCore>;

export const useShikiHighlighter = <F extends OutputFormat = 'react'>(
  code: string,
  lang: Language,
  themeInput: Theme | Themes,
  options: HighlighterOptions<F> = {} as HighlighterOptions<F>,
  highlighterFactory: HighlighterFactory
): OutputFormatMap[F] | null => {
  const [output, setOutput] = useState<OutputFormatMap[F] | null>(null);

  const stableLang = useStableOptions(lang);
  const stableTheme = useStableOptions(themeInput);
  const stableOpts = useStableOptions(options);

  // Throttle code changes when delay is specified
  const throttledCode = useThrottledDebounce(code, stableOpts.delay);

  const { languageId, langsToLoad } = useMemo(
    () =>
      resolveLanguage(
        stableLang,
        stableOpts.customLanguages,
        stableOpts.langAlias
      ),
    [stableLang, stableOpts.customLanguages, stableOpts.langAlias]
  );

  const themeResult = useMemo(
    () => resolveTheme(stableTheme),
    [stableTheme]
  );

  const shikiOptions = useMemo(
    () => buildShikiOptions(languageId, themeResult, stableOpts),
    [languageId, themeResult, stableLang, stableTheme, stableOpts]
  );

  useEffect(() => {
    let isMounted = true;

    const highlight = async () => {
      if (!languageId) return;

      const highlighter = stableOpts.highlighter
        ? stableOpts.highlighter
        : await highlighterFactory(
            langsToLoad as ShikiLanguageRegistration,
            themeResult.themesToLoad,
            stableOpts.engine
          );

      const loadedLanguages = highlighter.getLoadedLanguages();
      const langToUse = loadedLanguages.includes(languageId)
        ? languageId
        : 'plaintext';

      const finalOptions = { ...shikiOptions, lang: langToUse };

      if (isMounted) {
        const format = (stableOpts.outputFormat ?? 'react') as F;
        const result = transformOutput(
          format,
          highlighter,
          throttledCode,
          finalOptions,
          themeResult.isMultiTheme
        );
        setOutput(result);
      }
    };

    highlight().catch(console.error);

    return () => {
      isMounted = false;
    };
  }, [
    throttledCode,
    shikiOptions,
    stableOpts.highlighter,
    stableOpts.outputFormat,
    langsToLoad,
    themeResult.themesToLoad,
    themeResult.isMultiTheme,
  ]);

  return output;
};
