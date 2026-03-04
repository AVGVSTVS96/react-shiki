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
  const prevCodeRef = useRef<string>('');
  const schedulerRef = useRef<BatchScheduler | null>(null);

  const batchStrategy: BatchStrategy = stableOpts.batch ?? 'raf';
  const allowRecalls = stableOpts.allowRecalls !== false;

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

    // Reset token state for the new session
    tokensRef.current = [];
    prevCodeRef.current = '';
    setTokens([]);
    setStatus('idle');
    setError(null);

    setTokenizer(tok);

    return () => {
      tok.clear();
    };
  }, [resolvedHighlighter, languageId, resolvedTheme]);

  // ---- Effect 4: Input consumption ----
  // Depends on tokenizer (state) and stableInput.
  // For code: detects append-only deltas via prevCodeRef.
  // For stream/chunks: consumes the source.
  useEffect(() => {
    if (!tokenizer) return;

    let cancelled = false;
    let streamStarted = false;

    const processResult = (result: {
      recall: number;
      stable: ThemedToken[];
      unstable: ThemedToken[];
    }) => {
      if (cancelled) return;

      // Recall removes previous unstable tokens from the end of the display buffer.
      // This is safe because when allowRecalls is true, unstable tokens were appended
      // to the buffer on the previous round. When allowRecalls is false, recall is
      // effectively 0 (no unstable tokens were added).
      if (allowRecalls && result.recall > 0) {
        tokensRef.current = tokensRef.current.slice(
          0,
          Math.max(0, tokensRef.current.length - result.recall)
        );
      }

      // Append new stable tokens (always)
      tokensRef.current.push(...result.stable);

      // Append new unstable tokens (only when allowRecalls is true,
      // so they'll be recalled on the next enqueue)
      if (allowRecalls) {
        tokensRef.current.push(...result.unstable);
      }

      if (!streamStarted) {
        streamStarted = true;
        setStatus('streaming');
        stableOpts.onStreamStart?.();
      }

      schedulerRef.current?.schedule();
    };

    const handleComplete = () => {
      if (cancelled) return;

      const closeResult = tokenizer.close();

      // close() returns the final unstable tokens as stable.
      // When allowRecalls is true, those tokens are already in our buffer
      // (they were appended as unstable). Don't add them again.
      // When allowRecalls is false, they weren't displayed yet — add them now.
      if (!allowRecalls) {
        tokensRef.current.push(...closeResult.stable);
      }

      setStatus('done');
      stableOpts.onStreamEnd?.();
      schedulerRef.current?.forceFlush();
    };

    const handleError = (err: unknown) => {
      if (cancelled) return;
      setError(err instanceof Error ? err : new Error(String(err)));
      setStatus('error');
      schedulerRef.current?.forceFlush();
    };

    // --- Code input path (controlled growing string) ---
    if ('code' in stableInput) {
      const prevCode = prevCodeRef.current;
      const newCode = stableInput.code;

      const enqueueCode = async () => {
        try {
          if (newCode.startsWith(prevCode) && prevCode.length > 0) {
            // Append-only: enqueue only the delta
            const delta = newCode.slice(prevCode.length);
            if (delta) {
              const result = await tokenizer.enqueue(delta);
              processResult(result);
            }
          } else {
            // Non-append (edit/reset/initial): clear and re-feed
            tokenizer.clear();
            tokensRef.current = [];

            if (newCode) {
              const result = await tokenizer.enqueue(newCode);
              processResult(result);
            } else {
              schedulerRef.current?.forceFlush();
            }
          }

          prevCodeRef.current = newCode;

          if (stableInput.isComplete) {
            handleComplete();
          }
        } catch (err) {
          handleError(err);
        }
      };

      enqueueCode();

      return () => {
        cancelled = true;
      };
    }

    // --- ReadableStream input path ---
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
            if (cancelled || done) break;
            if (value) {
              const result = await tokenizer.enqueue(value);
              processResult(result);
            }
          }
          if (!cancelled) {
            handleComplete();
          }
        } catch (err) {
          handleError(err);
        }
      };

      consume();

      return () => {
        cancelled = true;
        reader.cancel().catch(() => {});
      };
    }

    // --- AsyncIterable input path ---
    if ('chunks' in stableInput) {
      const consume = async () => {
        try {
          for await (const chunk of stableInput.chunks) {
            if (cancelled) break;
            if (chunk) {
              const result = await tokenizer.enqueue(chunk);
              processResult(result);
            }
          }
          if (!cancelled) {
            handleComplete();
          }
        } catch (err) {
          handleError(err);
        }
      };

      consume();

      return () => {
        cancelled = true;
      };
    }

    return () => {
      cancelled = true;
    };
  }, [tokenizer, stableInput, stableOpts.onStreamStart, stableOpts.onStreamEnd]);

  // ---- Reset callback ----
  const reset = useCallback(() => {
    tokensRef.current = [];
    prevCodeRef.current = '';
    setTokens([]);
    setStatus('idle');
    setError(null);
  }, []);

  return { tokens, status, error, reset };
};
