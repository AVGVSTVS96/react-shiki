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

type HighlightRequest = {
  code: string;
  languageId: string;
  langsToLoad: Language[];
  themesToLoad: Theme[];
  shikiOptions: ReturnType<typeof buildShikiOptions>;
  outputFormat: HighlighterOptions['outputFormat'];
  highlighter?: Highlighter | HighlighterCore;
  engine?: Awaitable<RegexEngine>;
};

type HighlightPayload =
  | { type: 'html'; value: string }
  | { type: 'react'; value: ReactNode };

type HighlightState =
  | { status: 'idle' }
  | { status: 'resolved'; payload: HighlightPayload };

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

const createHighlightRequest = (
  code: string,
  lang: Language,
  themeInput: Theme | Themes,
  options: HighlighterOptions
): HighlightRequest => {
  const { languageId, langsToLoad } = resolveLanguage(
    lang,
    options.customLanguages,
    options.langAlias,
    options.preloadLanguages
  );
  const resolvedTheme = resolveTheme(themeInput);

  return {
    code,
    languageId,
    langsToLoad,
    themesToLoad: resolvedTheme.themesToLoad,
    shikiOptions: buildShikiOptions({
      languageId,
      resolvedTheme,
      options,
    }),
    outputFormat: options.outputFormat,
    highlighter: options.highlighter,
    engine: options.engine,
  };
};

const renderHighlightPayload = (
  code: string,
  highlighter: Highlighter | HighlighterCore,
  request: HighlightRequest
): HighlightPayload => {
  const langToUse = resolveLoadedLanguage(
    request.languageId,
    highlighter.getLoadedLanguages()
  );
  const finalOptions = { ...request.shikiOptions, lang: langToUse };

  return request.outputFormat === 'html'
    ? {
        type: 'html',
        value: highlighter.codeToHtml(code, finalOptions),
      }
    : {
        type: 'react',
        value: toJsxRuntime(highlighter.codeToHast(code, finalOptions), {
          jsx,
          jsxs,
          Fragment,
        }),
      };
};

const runHighlightRequest = async (
  request: HighlightRequest,
  highlighterFactory: HighlighterFactory
): Promise<HighlightPayload> => {
  const highlighter = request.highlighter
    ? request.highlighter
    : await highlighterFactory(
        request.langsToLoad,
        request.themesToLoad,
        request.engine
      );

  // Load embedded language grammars (e.g. ```python inside markdown)
  if (!request.highlighter) {
    const embedded = getEmbeddedLanguages(
      request.code,
      request.languageId,
      highlighter
    );
    if (embedded.length > 0) {
      await highlighter.loadLanguage(...embedded);
    }
  }

  return renderHighlightPayload(request.code, highlighter, request);
};

const useHighlightState = (
  request: HighlightRequest,
  delay: number | undefined,
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

    const resolveHighlight = async () => {
      if (!request.languageId) return;

      const payload = await runHighlightRequest(
        request,
        highlighterFactory
      );

      if (isMounted && requestId === requestIdRef.current) {
        setState({
          status: 'resolved',
          payload,
        });
      }
    };

    if (delay) {
      throttleHighlighting(resolveHighlight, timeoutControl, delay);
    } else {
      resolveHighlight().catch(console.error);
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutControl.current.timeoutId);
    };
  }, [delay, highlighterFactory, request]);

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

  const request = useMemo(
    () =>
      createHighlightRequest(code, stableLang, stableTheme, stableOpts),
    [code, stableLang, stableTheme, stableOpts]
  );

  const state = useHighlightState(
    request,
    stableOpts.delay,
    highlighterFactory
  );

  if (state.status !== 'resolved') {
    return null;
  }

  return state.payload.value;
};
