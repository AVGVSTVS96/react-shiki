import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { ShikiStreamTokenizer } from 'shiki-stream';

import type {
  Highlighter,
  HighlighterCore,
  Awaitable,
  RegexEngine,
  ThemedToken,
} from 'shiki';

import type {
  Language,
  Theme,
  Themes,
} from './types';

import type {
  ShikiStreamInput,
  StreamHighlighterOptions,
  StreamHighlighterResult,
  StreamStatus,
  BatchStrategy,
} from './stream-types';

import { useStableValue } from './utils';
import { resolveLanguage, resolveLoadedLanguage } from './language';
import { resolveTheme } from './theme';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const themeToString = (theme: Theme): string =>
  typeof theme === 'string' ? theme : theme?.name ?? 'github-dark';

// ---------------------------------------------------------------------------
// Batch scheduler
// ---------------------------------------------------------------------------

interface BatchScheduler {
  schedule: () => void;
  forceFlush: () => void;
  cancel: () => void;
}

function createBatchScheduler(
  strategy: BatchStrategy,
  flush: () => void
): BatchScheduler {
  let pending: ReturnType<typeof setTimeout> | number | null = null;

  const cancel = () => {
    if (pending != null) {
      if (strategy === 'raf') {
        cancelAnimationFrame(pending as number);
      } else {
        clearTimeout(pending as ReturnType<typeof setTimeout>);
      }
      pending = null;
    }
  };

  const forceFlush = () => {
    cancel();
    flush();
  };

  const schedule = () => {
    if (pending != null) return;

    if (strategy === 'sync') {
      flush();
      return;
    }

    if (strategy === 'raf') {
      pending = requestAnimationFrame(() => {
        pending = null;
        flush();
      });
      return;
    }

    pending = setTimeout(() => {
      pending = null;
      flush();
    }, strategy);
  };

  return { schedule, forceFlush, cancel };
}

// ---------------------------------------------------------------------------
// Base stream hook
// ---------------------------------------------------------------------------

/**
 * Base hook for streaming syntax highlighting using shiki-stream.
 * Follows the same factory pattern as the static useShikiHighlighter hook.
 *
 * @internal — entry points wrap this with their highlighter factory.
 */
export const useShikiStreamHighlighter = (
  input: ShikiStreamInput,
  lang: Language,
  themeInput: Theme | Themes,
  options: StreamHighlighterOptions = {},
  highlighterFactory: (
    langsToLoad: Language[],
    themesToLoad: Theme[],
    engine?: Awaitable<RegexEngine>
  ) => Promise<Highlighter | HighlighterCore>
): StreamHighlighterResult => {
  // ---- React state ----
  const [tokens, setTokens] = useState<ThemedToken[]>([]);
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [resolvedHighlighter, setResolvedHighlighter] = useState<
    Highlighter | HighlighterCore | null
  >(null);
  const [tokenizer, setTokenizer] = useState<ShikiStreamTokenizer | null>(null);

  // ---- Stable inputs ----
  const stableInput = useStableValue(input);
  const stableLang = useStableValue(lang);
  const stableTheme = useStableValue(themeInput);
  const stableOpts = useStableValue(options);

  // ---- Language resolution ----
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

  // ---- Theme resolution ----
  const resolvedTheme = useMemo(
    () => resolveTheme(stableTheme),
    [stableTheme]
  );
  const { themesToLoad } = resolvedTheme;

  // ---- Mutable refs (never in deps arrays) ----
  // Single display buffer: contains both stable + unstable tokens.
  // Recall removes from the end (the previous unstable tokens),
  // then new stable + unstable are appended.
  const tokensRef = useRef<ThemedToken[]>([]);
  const schedulerRef = useRef<BatchScheduler | null>(null);
  const tokenizerRef = useRef<ShikiStreamTokenizer | null>(null);

  // Controlled code path state
  const sessionIdRef = useRef(0);
  const processingRef = useRef(false);
  const requestedCodeRef = useRef('');
  const requestedCompleteRef = useRef(false);
  const appliedCodeRef = useRef('');
  const completedRef = useRef(false);
  const forceResyncRef = useRef(false);

  // Tracks unstable tail currently displayed in tokensRef
  const unstableCountRef = useRef(0);
  const streamStartedRef = useRef(false);

  const batchStrategy: BatchStrategy = stableOpts.batch ?? 'raf';
  const allowRecalls = stableOpts.allowRecalls !== false;

  const processResult = useCallback(
    (
      result: {
        recall: number;
        stable: ThemedToken[];
        unstable: ThemedToken[];
      },
      sessionId: number,
      canResync: boolean
    ): boolean => {
      if (sessionId !== sessionIdRef.current) return false;

      if (allowRecalls) {
        if (result.recall !== unstableCountRef.current) {
          if (canResync) {
            forceResyncRef.current = true;
          }
          return false;
        }

        if (result.recall > 0) {
          tokensRef.current = tokensRef.current.slice(
            0,
            Math.max(0, tokensRef.current.length - result.recall)
          );
        }
      }

      tokensRef.current.push(...result.stable);

      if (allowRecalls) {
        tokensRef.current.push(...result.unstable);
        unstableCountRef.current = result.unstable.length;
      } else {
        unstableCountRef.current = 0;
      }

      if (!streamStartedRef.current) {
        streamStartedRef.current = true;
        setStatus('streaming');
        stableOpts.onStreamStart?.();
      }

      schedulerRef.current?.schedule();
      return true;
    },
    [allowRecalls, stableOpts.onStreamStart]
  );

  const handleComplete = useCallback(
    (sessionId: number, targetTokenizer: ShikiStreamTokenizer) => {
      if (sessionId !== sessionIdRef.current || completedRef.current) return;

      const closeResult = targetTokenizer.close();

      // close() returns the final unstable tokens as stable.
      // When allowRecalls is true, those tokens are already in our buffer
      // (they were appended as unstable). Don't add them again.
      // When allowRecalls is false, they weren't displayed yet — add them now.
      if (!allowRecalls) {
        tokensRef.current.push(...closeResult.stable);
      }

      unstableCountRef.current = 0;
      completedRef.current = true;
      setStatus('done');
      stableOpts.onStreamEnd?.();
      schedulerRef.current?.forceFlush();
    },
    [allowRecalls, stableOpts.onStreamEnd]
  );

  const handleError = useCallback((err: unknown, sessionId: number) => {
    if (sessionId !== sessionIdRef.current) return;
    setError(err instanceof Error ? err : new Error(String(err)));
    setStatus('error');
    schedulerRef.current?.forceFlush();
  }, []);

  const pumpCode = useCallback(
    async (sessionId: number) => {
      if (processingRef.current) return;
      processingRef.current = true;

      try {
        while (sessionId === sessionIdRef.current) {
          const activeTokenizer = tokenizerRef.current;
          if (!activeTokenizer) break;

          const targetCode = requestedCodeRef.current;
          const targetComplete = requestedCompleteRef.current;
          const appliedCode = appliedCodeRef.current;

          const caughtUp =
            targetCode === appliedCode &&
            (!targetComplete || completedRef.current);

          if (!forceResyncRef.current && caughtUp) {
            break;
          }

          let result: {
            recall: number;
            stable: ThemedToken[];
            unstable: ThemedToken[];
          } | null = null;

          if (
            forceResyncRef.current ||
            !(targetCode.startsWith(appliedCode) && appliedCode.length > 0)
          ) {
            forceResyncRef.current = false;
            activeTokenizer.clear();
            tokensRef.current = [];
            unstableCountRef.current = 0;

            if (targetCode) {
              result = await activeTokenizer.enqueue(targetCode);
            } else {
              schedulerRef.current?.forceFlush();
            }
          } else {
            const delta = targetCode.slice(appliedCode.length);
            if (delta) {
              result = await activeTokenizer.enqueue(delta);
            }
          }

          if (sessionId !== sessionIdRef.current) break;

          if (result) {
            const ok = processResult(result, sessionId, true);
            if (!ok) {
              continue;
            }
          }

          appliedCodeRef.current = targetCode;

          if (targetComplete && !completedRef.current) {
            handleComplete(sessionId, activeTokenizer);
          }

          if (
            targetCode === requestedCodeRef.current &&
            targetComplete === requestedCompleteRef.current &&
            !forceResyncRef.current
          ) {
            break;
          }
        }
      } catch (err) {
        handleError(err, sessionId);
      } finally {
        if (sessionId === sessionIdRef.current) {
          processingRef.current = false;

          const needsMore =
            tokenizerRef.current != null &&
            (forceResyncRef.current ||
              requestedCodeRef.current !== appliedCodeRef.current ||
              (requestedCompleteRef.current && !completedRef.current));

          if (needsMore) {
            void pumpCode(sessionId);
          }
        }
      }
    },
    [handleComplete, handleError, processResult]
  );

  // ---- Effect 1: Batch scheduler ----
  useEffect(() => {
    const flush = () => {
      setTokens([...tokensRef.current]);
    };

    schedulerRef.current?.cancel();
    schedulerRef.current = createBatchScheduler(batchStrategy, flush);

    return () => {
      schedulerRef.current?.cancel();
      schedulerRef.current = null;
    };
  }, [batchStrategy, allowRecalls]);

  // ---- Effect 2: Highlighter acquisition ----
  useEffect(() => {
    let cancelled = false;

    const acquire = async () => {
      if (!languageId) return;

      const hl = stableOpts.highlighter
        ? stableOpts.highlighter
        : await highlighterFactory(
            langsToLoad,
            themesToLoad,
            stableOpts.engine
          );

      if (!cancelled) {
        setResolvedHighlighter(hl);
      }
    };

    acquire().catch((err) => {
      if (!cancelled) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setStatus('error');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    languageId,
    langsToLoad,
    themesToLoad,
    stableOpts.highlighter,
    stableOpts.engine,
  ]);

  // ---- Effect 3: Tokenizer creation ----
  // Depends on highlighter (state), language, and theme.
  // Does NOT depend on input — so code deltas don't recreate the tokenizer.
  useEffect(() => {
    if (!resolvedHighlighter || !languageId) {
      sessionIdRef.current += 1;
      tokenizerRef.current = null;
      processingRef.current = false;
      setTokenizer(null);
      return;
    }

    const langToUse = resolveLoadedLanguage(
      languageId,
      resolvedHighlighter.getLoadedLanguages()
    );

    const themeOpts = resolvedTheme.isMultiTheme
      ? {
          themes: Object.fromEntries(
            Object.entries(resolvedTheme.multiTheme ?? {}).map(
              ([k, v]) => [k, themeToString(v)]
            )
          ),
        }
      : { theme: themeToString(resolvedTheme.singleTheme!) };

    const tok = new ShikiStreamTokenizer({
      highlighter: resolvedHighlighter,
      lang: langToUse,
      ...themeOpts,
    });

    sessionIdRef.current += 1;
    tokenizerRef.current = tok;

    // Reset token state for the new session
    tokensRef.current = [];
    unstableCountRef.current = 0;
    requestedCodeRef.current = '';
    requestedCompleteRef.current = false;
    appliedCodeRef.current = '';
    completedRef.current = false;
    processingRef.current = false;
    forceResyncRef.current = false;
    streamStartedRef.current = false;
    setTokens([]);
    setStatus('idle');
    setError(null);

    setTokenizer(tok);

    return () => {
      tok.clear();
      if (tokenizerRef.current === tok) {
        tokenizerRef.current = null;
      }
    };
  }, [resolvedHighlighter, languageId, resolvedTheme]);

  // ---- Effect 4: Controlled code input ----
  useEffect(() => {
    if (!tokenizer) return;
    if (!('code' in stableInput)) return;

    requestedCodeRef.current = stableInput.code;
    requestedCompleteRef.current = !!stableInput.isComplete;

    void pumpCode(sessionIdRef.current);
  }, [tokenizer, stableInput, pumpCode]);

  // ---- Effect 5: Stream/chunks input consumption ----
  useEffect(() => {
    if (!tokenizer) return;
    if ('code' in stableInput) return;

    const sessionId = sessionIdRef.current;
    const activeTokenizer = tokenizerRef.current;
    if (!activeTokenizer) return;

    let cancelled = false;

    if ('stream' in stableInput) {
      if (stableInput.stream.locked) {
        return () => {
          cancelled = true;
        };
      }

      const reader = stableInput.stream.getReader();

      const consume = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (cancelled || sessionId !== sessionIdRef.current || done) break;
            if (value) {
              const result = await activeTokenizer.enqueue(value);
              if (!processResult(result, sessionId, false)) {
                handleError(
                  new Error('Tokenizer recall desync detected while streaming'),
                  sessionId
                );
                return;
              }
            }
          }
          if (!cancelled) {
            handleComplete(sessionId, activeTokenizer);
          }
        } catch (err) {
          handleError(err, sessionId);
        }
      };

      void consume();

      return () => {
        cancelled = true;
        reader.cancel().catch(() => {});
      };
    }

    if ('chunks' in stableInput) {
      const consume = async () => {
        try {
          for await (const chunk of stableInput.chunks) {
            if (cancelled || sessionId !== sessionIdRef.current) break;
            if (chunk) {
              const result = await activeTokenizer.enqueue(chunk);
              if (!processResult(result, sessionId, false)) {
                handleError(
                  new Error('Tokenizer recall desync detected while streaming'),
                  sessionId
                );
                return;
              }
            }
          }
          if (!cancelled) {
            handleComplete(sessionId, activeTokenizer);
          }
        } catch (err) {
          handleError(err, sessionId);
        }
      };

      void consume();

      return () => {
        cancelled = true;
      };
    }

    return () => {
      cancelled = true;
    };
  }, [tokenizer, stableInput, processResult, handleComplete, handleError]);

  // ---- Reset callback ----
  const reset = useCallback(() => {
    tokenizerRef.current?.clear();
    tokensRef.current = [];
    unstableCountRef.current = 0;
    requestedCodeRef.current = '';
    requestedCompleteRef.current = false;
    appliedCodeRef.current = '';
    completedRef.current = false;
    forceResyncRef.current = false;
    processingRef.current = false;
    streamStartedRef.current = false;
    setTokens([]);
    setStatus('idle');
    setError(null);
  }, []);

  return { tokens, status, error, reset };
};
