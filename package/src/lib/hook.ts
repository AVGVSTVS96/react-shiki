import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  HighlightedCode,
  HighlighterOptions,
  Language,
  Theme,
  Themes,
  TimeoutState,
} from './types';

import {
  type HighlighterFactory,
  type NormalizedHighlightInput,
  type ResolvedHighlight,
  normalizeHighlightInput,
  resolveHighlight,
} from './highlight';
import { throttleHighlighting, useStableValue } from './utils';

type HighlightState =
  | { status: 'idle' }
  | { status: 'loading'; lastResult: ResolvedHighlight | null }
  | { status: 'resolved'; result: ResolvedHighlight }
  | { status: 'failed'; lastResult: ResolvedHighlight | null };

const getVisibleResult = (state: HighlightState): HighlightedCode => {
  switch (state.status) {
    case 'resolved':
      return state.result;
    case 'loading':
    case 'failed':
      return state.lastResult;
    case 'idle':
      return null;
  }
};

const useHighlightMachine = () => {
  const [state, setState] = useState<HighlightState>({ status: 'idle' });

  const getLastResult = useCallback((currentState: HighlightState) => {
    return currentState.status === 'resolved'
      ? currentState.result
      : currentState.status === 'loading' ||
          currentState.status === 'failed'
        ? currentState.lastResult
        : null;
  }, []);

  return {
    fail: useCallback(() => {
      setState((currentState) => ({
        status: 'failed',
        lastResult: getLastResult(currentState),
      }));
    }, [getLastResult]),

    reset: useCallback(() => {
      setState({ status: 'idle' });
    }, []),

    resolve: useCallback((result: ResolvedHighlight) => {
      setState({
        status: 'resolved',
        result,
      });
    }, []),

    start: useCallback(() => {
      setState((currentState) => ({
        status: 'loading',
        lastResult: getLastResult(currentState),
      }));
    }, [getLastResult]),

    state,
  };
};

const useResolvedHighlight = (
  input: NormalizedHighlightInput,
  highlighterFactory: HighlighterFactory
) => {
  const { fail, reset, resolve, start, state } = useHighlightMachine();
  const requestIdRef = useRef(0);
  const timeoutControl = useRef<TimeoutState>({
    nextAllowedTime: 0,
    timeoutId: undefined,
  });

  useEffect(() => {
    let isMounted = true;
    const requestId = ++requestIdRef.current;

    if (!input.languageId) {
      reset();
      return () => {
        isMounted = false;
        clearTimeout(timeoutControl.current.timeoutId);
      };
    }

    const run = async () => {
      start();

      try {
        const result = await resolveHighlight(input, highlighterFactory);

        if (isMounted && requestId === requestIdRef.current) {
          resolve(result);
        }
      } catch (error) {
        console.error(error);

        if (isMounted && requestId === requestIdRef.current) {
          fail();
        }
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
  }, [fail, highlighterFactory, input, reset, resolve, start]);

  return state;
};

export const useShikiHighlighter = (
  code: string,
  language: Language,
  theme: Theme | Themes,
  options: HighlighterOptions = {},
  highlighterFactory: HighlighterFactory
) => {
  const stableLanguage = useStableValue(language);
  const stableTheme = useStableValue(theme);
  const stableOptions = useStableValue(options);

  const input = useMemo(
    () =>
      normalizeHighlightInput(
        code,
        stableLanguage,
        stableTheme,
        stableOptions
      ),
    [code, stableLanguage, stableTheme, stableOptions]
  );

  const state = useResolvedHighlight(input, highlighterFactory);
  return getVisibleResult(state);
};
