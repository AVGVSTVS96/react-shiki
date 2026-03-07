import { useEffect, useMemo, useRef, useState } from 'react';

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

  const { languageId, langsToLoad } = useMemo(
    () =>
      resolveLanguage(
        stableLang,
        stableOpts.customLanguages,
        stableOpts.langAlias,
        stableOpts.preloadLanguages
      ),
    [
      stableLang,
      stableOpts.customLanguages,
      stableOpts.preloadLanguages,
      stableOpts.langAlias,
    ]
  );

  const resolvedTheme = useMemo(
    () => resolveTheme(stableTheme),
    [stableTheme]
  );
  const { themesToLoad } = resolvedTheme;

  const shikiOptions = useMemo(() => {
    const {
      delay,
      customLanguages,
      preloadLanguages,
      outputFormat,
      highlighter,
      langAlias,
      engine,
      ...shikiOpts
    } = stableOpts;

    return buildShikiOptions(languageId, resolvedTheme, shikiOpts);
  }, [languageId, resolvedTheme, stableOpts]);

  const requestIdRef = useRef(0);
  const timeoutControl = useRef<TimeoutState>({
    nextAllowedTime: 0,
    timeoutId: undefined,
  });

  useEffect(() => {
    let isMounted = true;
    const requestId = ++requestIdRef.current;

    if (!languageId) {
      return () => {
        isMounted = false;
        clearTimeout(timeoutControl.current.timeoutId);
      };
    }

    const run = async () => {
      try {
        const highlighter = stableOpts.highlighter
          ? stableOpts.highlighter
          : await highlighterFactory(
              langsToLoad,
              themesToLoad,
              stableOpts.engine
            );

        if (!stableOpts.highlighter) {
          const embedded = getEmbeddedLanguages(
            code,
            languageId,
            highlighter
          );
          if (embedded.length > 0) {
            await highlighter.loadLanguage(...embedded);
          }
        }

        if (isMounted && requestId === requestIdRef.current) {
          const result = resolveHighlight(
            code,
            languageId,
            stableOpts.outputFormat,
            shikiOptions,
            highlighter
          );
          setHighlightedCode(result);
        }
      } catch (error) {
        console.error(error);
      }
    };

    if (stableOpts.delay) {
      throttleHighlighting(run, timeoutControl, stableOpts.delay);
    } else {
      run().catch(console.error);
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
    stableOpts.engine,
    languageId,
    langsToLoad,
    themesToLoad,
    highlighterFactory,
  ]);

  return highlightedCode;
};
