import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';

import type {
  Highlighter,
  HighlighterCore,
  Awaitable,
  LanguageInput,
  RegexEngine,
} from 'shiki';

import { guessEmbeddedLanguages } from 'shiki/core';

import type {
  Language,
  Theme,
  HighlighterOptions,
  TimeoutState,
  Themes,
} from './types';

import { throttleHighlighting, useStableValue } from './utils';
import { resolveLanguage, resolveLoadedLanguage } from './language';
import { resolveTheme } from './theme';
import { buildShikiOptions } from './options';

type HighlighterFactory = (
  langsToLoad: Language[],
  themesToLoad: Theme[],
  engine?: Awaitable<RegexEngine>
) => Promise<Highlighter | HighlighterCore>;

type NormalizedHighlightInput = {
  code: string;
  delay: number | undefined;
  languageId: string;
  outputFormat: HighlighterOptions['outputFormat'];
  highlighterConfig: {
    instance?: Highlighter | HighlighterCore;
    engine?: Awaitable<RegexEngine>;
    langsToLoad: Language[];
    themesToLoad: Theme[];
  };
  shikiOptions: ReturnType<typeof buildShikiOptions>;
};

type ResolvedHighlight =
  | { format: 'html'; value: string }
  | { format: 'react'; value: ReactNode };

type HighlightState =
  | { status: 'idle' }
  | { status: 'resolved'; result: ResolvedHighlight };

/**
 * Returns detected embedded languages that are available in the current bundle.
 */
const getEmbeddedLanguages = (
  code: string,
  languageId: string,
  highlighter: Highlighter | HighlighterCore
): LanguageInput[] => {
  const bundled: Record<string, LanguageInput> =
    highlighter.getBundledLanguages();
  return guessEmbeddedLanguages(code, languageId).flatMap(
    (language) => bundled[language] ?? []
  );
};

const normalizeHighlightInput = (
  code: string,
  lang: Language,
  themeInput: Theme | Themes,
  options: HighlighterOptions
): NormalizedHighlightInput => {
  const { languageId, langsToLoad } = resolveLanguage(
    lang,
    options.customLanguages,
    options.langAlias,
    options.preloadLanguages
  );
  const resolvedTheme = resolveTheme(themeInput);

  return {
    code,
    delay: options.delay,
    languageId,
    outputFormat: options.outputFormat,
    highlighterConfig: {
      instance: options.highlighter,
      engine: options.engine,
      langsToLoad,
      themesToLoad: resolvedTheme.themesToLoad,
    },
    shikiOptions: buildShikiOptions({
      languageId,
      resolvedTheme,
      options,
    }),
  };
};

const resolveHighlightOutput = (
  input: NormalizedHighlightInput,
  highlighter: Highlighter | HighlighterCore,
  languageId: string
): ResolvedHighlight => {
  const langToUse = resolveLoadedLanguage(
    languageId,
    highlighter.getLoadedLanguages()
  );
  const finalOptions = { ...input.shikiOptions, lang: langToUse };

  return input.outputFormat === 'html'
    ? {
        format: 'html',
        value: highlighter.codeToHtml(input.code, finalOptions),
      }
    : {
        format: 'react',
        value: toJsxRuntime(highlighter.codeToHast(input.code, finalOptions), {
          jsx,
          jsxs,
          Fragment,
        }),
      };
};

const loadHighlighter = async (
  input: NormalizedHighlightInput,
  highlighterFactory: HighlighterFactory
): Promise<Highlighter | HighlighterCore> => {
  const highlighter = input.highlighterConfig.instance
    ? input.highlighterConfig.instance
    : await highlighterFactory(
        input.highlighterConfig.langsToLoad,
        input.highlighterConfig.themesToLoad,
        input.highlighterConfig.engine
      );

  // Load embedded language grammars (e.g. ```python inside markdown)
  if (!input.highlighterConfig.instance) {
    const embedded = getEmbeddedLanguages(
      input.code,
      input.languageId,
      highlighter
    );
    if (embedded.length > 0) {
      await highlighter.loadLanguage(...embedded);
    }
  }

  return highlighter;
};

const resolveHighlight = async (
  input: NormalizedHighlightInput,
  highlighterFactory: HighlighterFactory
): Promise<ResolvedHighlight> => {
  const highlighter = await loadHighlighter(input, highlighterFactory);
  return resolveHighlightOutput(input, highlighter, input.languageId);
};

const unwrapHighlightState = (state: HighlightState) => {
  if (state.status !== 'resolved') {
    return null;
  }

  return state.result.value;
};

const useResolvedHighlight = (
  input: NormalizedHighlightInput,
  highlighterFactory: HighlighterFactory
) => {
  const [state, setState] = useState<HighlightState>({ status: 'idle' });
  const requestIdRef = useRef(0);
  const timeoutControl = useRef<TimeoutState>({
    nextAllowedTime: 0,
    timeoutId: undefined,
  });

  useEffect(() => {
    let isMounted = true;
    const requestId = ++requestIdRef.current;

    const run = async () => {
      if (!input.languageId) return;

      const result = await resolveHighlight(input, highlighterFactory);

      if (isMounted && requestId === requestIdRef.current) {
        setState({
          status: 'resolved',
          result,
        });
      }
    };

    if (input.delay) {
      throttleHighlighting(run, timeoutControl, input.delay);
    } else {
      run().catch(console.error);
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutControl.current.timeoutId);
    };
  }, [highlighterFactory, input]);

  return state;
};

/**
 * Base hook for syntax highlighting using Shiki.
 * This is the core implementation used by all entry points.
 *
 * @param code - The code to highlight
 * @param lang - Language for highlighting
 * @param themeInput - Theme or themes to use
 * @param options - Highlighting options
 * @param highlighterFactory - Factory function to create highlighter (internal use)
 */
export const useShikiHighlighter = (
  code: string,
  lang: Language,
  themeInput: Theme | Themes,
  options: HighlighterOptions = {},
  highlighterFactory: HighlighterFactory
) => {
  // Stabilize options, language and theme inputs to prevent unnecessary
  // re-renders or recalculations when object references change
  const stableLang = useStableValue(lang);
  const stableTheme = useStableValue(themeInput);
  const stableOpts = useStableValue(options);

  const input = useMemo(
    () =>
      normalizeHighlightInput(code, stableLang, stableTheme, stableOpts),
    [code, stableLang, stableTheme, stableOpts]
  );

  const state = useResolvedHighlight(input, highlighterFactory);
  return unwrapHighlightState(state);
};
