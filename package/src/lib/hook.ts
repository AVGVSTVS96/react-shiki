import { useEffect, useMemo, useRef, useState } from 'react';

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
  TimeoutState,
  Themes,
  OutputFormat,
  OutputFormatMap,
} from './types';

import { throttleHighlighting, useStableOptions } from './utils';
import { resolveLanguage } from './language';
import { resolveTheme } from './theme';
import { buildShikiOptions } from './options';
import { transformOutput } from './output';
import { createFallback } from './fallback';

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
): OutputFormatMap[F] => {
  const format = (options.outputFormat ?? 'react') as F;

  // Initialize with fallback - never null
  const [output, setOutput] = useState<OutputFormatMap[F]>(() =>
    createFallback(format, code)
  );

  const stableLang = useStableOptions(lang);
  const stableTheme = useStableOptions(themeInput);
  const stableOpts = useStableOptions(options);

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

  const timeoutControl = useRef<TimeoutState>({
    nextAllowedTime: 0,
    timeoutId: undefined,
  });

  const shikiOptions = useMemo(
    () => buildShikiOptions(languageId, themeResult, stableOpts),
    // Revs ensure recompute even if useStableOptions returns same reference
    [languageId, themeResult, langRev, themeRev, optsRev]
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
        const result = transformOutput(
          format,
          highlighter,
          code,
          finalOptions,
          themeResult.isMultiTheme
        );
        setOutput(result);
      }
    };

    const { delay } = stableOpts;

    if (delay) {
      throttleHighlighting(highlight, timeoutControl, delay);
    } else {
      highlight().catch(console.error);
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutControl.current.timeoutId);
    };
  }, [
    code,
    shikiOptions,
    stableOpts.delay,
    stableOpts.highlighter,
    stableOpts.outputFormat,
    langsToLoad,
    themeResult.themesToLoad,
    themeResult.isMultiTheme,
  ]);

  return output;
};
