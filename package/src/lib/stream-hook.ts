import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { CodeToTokenTransformStream } from 'shiki-stream';

import type {
  Highlighter,
  HighlighterCore,
  Awaitable,
  RegexEngine,
  ThemedToken,
} from 'shiki';

import type { Language, Theme, Themes } from './types';

import type {
  ShikiStreamInput,
  StreamHighlighterOptions,
  StreamHighlighterResult,
  StreamSessionSummary,
  StreamStatus,
} from './stream-types';

import { useStableValue } from './utils';
import { resolveLanguage, resolveLoadedLanguage } from './language';
import { resolveTheme } from './theme';

const themeToString = (theme: Theme): string =>
  typeof theme === 'string' ? theme : (theme?.name ?? 'github-dark');

type ActiveSession = {
  id: number;
  mode: 'code' | 'stream' | 'chunks';
  textController: ReadableStreamDefaultController<string> | null;
  textClosed: boolean;
  codeLength: number;
  lastCode: string;
  cancel: () => void;
};

type RecallToken = { recall: number };

type StreamSessionMetrics = {
  startedAt: number;
  sessionId: number;
  mode: ActiveSession['mode'] | null;
  chunks: number;
  chars: number;
  tokenEvents: number;
  recallEvents: number;
  scheduledCommits: number;
  restarts: number;
  nonAppendEvents: number;
  terminalLogged: boolean;
};

const createStreamSessionMetrics = (): StreamSessionMetrics => ({
  startedAt: 0,
  sessionId: 0,
  mode: null,
  chunks: 0,
  chars: 0,
  tokenEvents: 0,
  recallEvents: 0,
  scheduledCommits: 0,
  restarts: 0,
  nonAppendEvents: 0,
  terminalLogged: false,
});

const previewTail = (value: string, length = 28): string =>
  value.slice(-length).replace(/\n/g, '\\n');

const commonPrefixLength = (a: string, b: string): number => {
  const max = Math.min(a.length, b.length);
  let cursor = 0;
  while (cursor < max && a[cursor] === b[cursor]) {
    cursor += 1;
  }
  return cursor;
};

const isRecallToken = (
  value: ThemedToken | RecallToken
): value is RecallToken => 'recall' in value;

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
  const [tokens, setTokens] = useState<ThemedToken[]>([]);
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [resolvedHighlighter, setResolvedHighlighter] = useState<
    Highlighter | HighlighterCore | null
  >(null);

  const stableLang = useStableValue(lang);
  const stableTheme = useStableValue(themeInput);

  const optionsStabilizeStart = performance.now();
  const stableOpts = useStableValue(options);
  const optionsStabilizeMs = performance.now() - optionsStabilizeStart;

  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.NODE_ENV !== 'test' &&
    optionsStabilizeMs > 2
  ) {
    console.info('[react-shiki] slow options stabilize', {
      ms: Number(optionsStabilizeMs.toFixed(1)),
      hasCustomLanguages: !!options.customLanguages,
      customLanguageCount: Array.isArray(options.customLanguages)
        ? options.customLanguages.length
        : options.customLanguages
          ? 1
          : 0,
      hasLangAlias: !!options.langAlias,
      hasPreloadLanguages: !!options.preloadLanguages,
    });
  }

  const onStreamStartRef = useRef(stableOpts.onStreamStart);
  const onStreamEndRef = useRef(stableOpts.onStreamEnd);
  // Dev-only instrumentation sink for streaming-lab tests/benches/playground.
  // Do not remove without replacing the equivalent emitted session summary.
  const onSessionSummaryRef = useRef(stableOpts.onSessionSummary);
  onStreamStartRef.current = stableOpts.onStreamStart;
  onStreamEndRef.current = stableOpts.onStreamEnd;
  onSessionSummaryRef.current = stableOpts.onSessionSummary;

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

  const inputMode: ActiveSession['mode'] =
    'code' in input ? 'code' : 'stream' in input ? 'stream' : 'chunks';
  const code = 'code' in input ? input.code : null;
  const isComplete = 'code' in input ? !!input.isComplete : false;
  const stream = 'stream' in input ? input.stream : null;
  const chunks = 'chunks' in input ? input.chunks : null;

  const sessionRef = useRef<ActiveSession | null>(null);
  const sessionVersionRef = useRef(0);
  const sessionIdRef = useRef(0);
  const [sessionVersion, setSessionVersion] = useState(0);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const restartSignalRef = useRef<{
    sessionId: number;
    eventCount: number;
    prevLen: number;
    latestNextLen: number;
    commonPrefixLen: number;
    prevTail: string;
    nextTail: string;
    reason: 'non-append' | 'closed';
  } | null>(null);
  const metricsRef = useRef<StreamSessionMetrics>(
    createStreamSessionMetrics()
  );

  const logSessionSummary = useCallback(
    (reason: 'done' | 'cleanup' | 'restart') => {
      const metrics = metricsRef.current;

      if (metrics.terminalLogged) return;
      metrics.terminalLogged = true;

      const elapsedMs =
        metrics.startedAt > 0 ? performance.now() - metrics.startedAt : 0;

      const summary: StreamSessionSummary = {
        reason,
        sessionId: metrics.sessionId,
        mode: metrics.mode,
        elapsedMs,
        inputChunkCount: metrics.chunks,
        processedChars: metrics.chars,
        tokenEvents: metrics.tokenEvents,
        recallEvents: metrics.recallEvents,
        scheduledCommits: metrics.scheduledCommits,
        restartCount: metrics.restarts,
      };

      // Consumed by internal streaming-lab diagnostics to track real commit
      // pressure/restarts in tests, benches, and playground playback.
      onSessionSummaryRef.current?.(summary);

      if (process.env.NODE_ENV === 'test') {
        return;
      }

      const shouldLog =
        elapsedMs > 120 ||
        metrics.tokenEvents > 300 ||
        metrics.restarts > 2;

      if (!shouldLog) {
        return;
      }

      console.info('[react-shiki] stream summary', {
        reason: summary.reason,
        sessionId: summary.sessionId,
        mode: summary.mode,
        ms: Number(summary.elapsedMs.toFixed(1)),
        chunks: summary.inputChunkCount,
        chars: summary.processedChars,
        tokenEvents: summary.tokenEvents,
        recallEvents: summary.recallEvents,
        scheduledCommits: summary.scheduledCommits,
        restarts: summary.restartCount,
        nonAppendEvents: metrics.nonAppendEvents,
        amplification: Number(
          (metrics.tokenEvents / Math.max(1, metrics.chars)).toFixed(2)
        ),
      });
    },
    []
  );

  const resetSessionMetrics = useCallback(
    (sessionId: number, mode: ActiveSession['mode']) => {
      metricsRef.current = {
        ...createStreamSessionMetrics(),
        startedAt: performance.now(),
        sessionId,
        mode,
      };
    },
    []
  );

  const restartSession = useCallback(() => {
    sessionVersionRef.current += 1;
    setSessionVersion(sessionVersionRef.current);
  }, []);

  const clearScheduledRestart = useCallback(() => {
    if (restartTimerRef.current != null) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    restartSignalRef.current = null;
  }, []);

  const scheduleCoalescedRestart = useCallback(
    ({
      sessionId,
      prevCode,
      nextCode,
      commonPrefixLen,
      reason,
    }: {
      sessionId: number;
      prevCode: string;
      nextCode: string;
      commonPrefixLen: number;
      reason: 'non-append' | 'closed';
    }) => {
      metricsRef.current.nonAppendEvents += 1;

      const existing = restartSignalRef.current;
      if (!existing || existing.sessionId !== sessionId) {
        restartSignalRef.current = {
          sessionId,
          eventCount: 1,
          prevLen: prevCode.length,
          latestNextLen: nextCode.length,
          commonPrefixLen,
          prevTail: previewTail(prevCode),
          nextTail: previewTail(nextCode),
          reason,
        };
      } else {
        existing.eventCount += 1;
        existing.latestNextLen = nextCode.length;
        existing.commonPrefixLen = commonPrefixLen;
        existing.nextTail = previewTail(nextCode);
      }

      if (restartTimerRef.current != null) return;

      restartTimerRef.current = setTimeout(() => {
        restartTimerRef.current = null;

        const signal = restartSignalRef.current;
        restartSignalRef.current = null;

        metricsRef.current.restarts += 1;

        if (signal && process.env.NODE_ENV !== 'test') {
          console.info('[react-shiki] coalesced restart', signal);
        }

        logSessionSummary('restart');
        restartSession();
      }, 28);
    },
    [logSessionSummary, restartSession]
  );

  useEffect(() => {
    return () => {
      clearScheduledRestart();
    };
  }, [clearScheduledRestart]);

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

  useEffect(() => {
    clearScheduledRestart();

    sessionRef.current?.cancel();
    sessionRef.current = null;

    if (!resolvedHighlighter || !languageId) {
      setTokens([]);
      setStatus('idle');
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

    const id = ++sessionIdRef.current;
    resetSessionMetrics(id, inputMode);

    let textController: ReadableStreamDefaultController<string> | null =
      null;
    let textClosed = false;
    let codeLength = 0;
    let lastCode = '';
    let cancelled = false;

    const textStream =
      inputMode === 'code'
        ? new ReadableStream<string>({
            start(controller) {
              textController = controller;

              const initialCode = code ?? '';
              lastCode = initialCode;
              codeLength = initialCode.length;

              if (initialCode) {
                controller.enqueue(initialCode);
                metricsRef.current.chunks += 1;
                metricsRef.current.chars += initialCode.length;
              }

              if (isComplete) {
                controller.close();
                textClosed = true;
              }
            },
          })
        : inputMode === 'stream'
          ? stream!
          : new ReadableStream<string>({
              start(controller) {
                void (async () => {
                  try {
                    for await (const chunk of chunks!) {
                      if (cancelled) break;
                      controller.enqueue(chunk);
                      metricsRef.current.chunks += 1;
                      metricsRef.current.chars += chunk.length;
                    }
                    if (!cancelled) {
                      controller.close();
                    }
                  } catch (err) {
                    controller.error(err);
                  }
                })();
              },
            });

    const tokenStream = textStream.pipeThrough(
      new CodeToTokenTransformStream({
        highlighter: resolvedHighlighter,
        lang: langToUse,
        allowRecalls: stableOpts.allowRecalls !== false,
        ...themeOpts,
      })
    );

    const reader = tokenStream.getReader();
    let started = false;
    const bufferedTokens: ThemedToken[] = [];
    let flushScheduled = false;
    let flushFrameId: number | null = null;

    const commitBufferedTokens = () => {
      flushScheduled = false;
      flushFrameId = null;

      if (cancelled) return;

      metricsRef.current.scheduledCommits += 1;
      const snapshot = bufferedTokens.slice();
      startTransition(() => {
        setTokens(snapshot);
      });
    };

    const scheduleTokenCommit = () => {
      if (flushScheduled) return;
      flushScheduled = true;

      if (typeof requestAnimationFrame === 'function') {
        flushFrameId = requestAnimationFrame(() => {
          commitBufferedTokens();
        });
        return;
      }

      Promise.resolve().then(() => {
        commitBufferedTokens();
      });
    };

    const flushTokenCommitNow = () => {
      if (!flushScheduled) return;

      if (
        flushFrameId != null &&
        typeof cancelAnimationFrame === 'function'
      ) {
        cancelAnimationFrame(flushFrameId);
      }

      commitBufferedTokens();
    };

    const consume = async () => {
      try {
        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;

          metricsRef.current.tokenEvents += 1;

          if (!started) {
            started = true;
            setStatus('streaming');
            onStreamStartRef.current?.();
          }

          if (isRecallToken(value)) {
            metricsRef.current.recallEvents += 1;
            const nextLength = Math.max(
              0,
              bufferedTokens.length - value.recall
            );
            bufferedTokens.splice(nextLength);
          } else {
            bufferedTokens.push(value);
          }

          scheduleTokenCommit();
        }

        if (!cancelled) {
          flushTokenCommitNow();
          logSessionSummary('done');
          setStatus('done');
          onStreamEndRef.current?.();
        }
      } catch (err) {
        if (!cancelled) {
          flushTokenCommitNow();
          setError(err instanceof Error ? err : new Error(String(err)));
          setStatus('error');
        }
      }
    };

    setTokens([]);
    setStatus('idle');
    setError(null);

    const cancelSession = () => {
      cancelled = true;

      if (
        flushFrameId != null &&
        typeof cancelAnimationFrame === 'function'
      ) {
        cancelAnimationFrame(flushFrameId);
      }

      logSessionSummary('cleanup');
      void reader.cancel().catch(() => {});
    };

    sessionRef.current = {
      id,
      mode: inputMode,
      textController,
      textClosed,
      codeLength,
      lastCode,
      cancel: cancelSession,
    };

    void consume();

    return () => {
      cancelSession();
      if (sessionRef.current?.id === id) {
        sessionRef.current = null;
      }
    };
  }, [
    resolvedHighlighter,
    languageId,
    resolvedTheme,
    inputMode,
    stream,
    chunks,
    sessionVersion,
    stableOpts.allowRecalls,
    clearScheduledRestart,
    logSessionSummary,
    resetSessionMetrics,
  ]);

  useEffect(() => {
    if (inputMode !== 'code') return;

    const session = sessionRef.current;
    if (!session || session.mode !== 'code') return;

    const controller = session.textController;
    if (!controller) return;

    if (code === session.lastCode) {
      if (isComplete && !session.textClosed) {
        controller.close();
        session.textClosed = true;
      }
      return;
    }

    if (session.textClosed) {
      scheduleCoalescedRestart({
        sessionId: session.id,
        prevCode: session.lastCode,
        nextCode: code ?? '',
        commonPrefixLen: commonPrefixLength(session.lastCode, code ?? ''),
        reason: 'closed',
      });
      return;
    }

    if (code!.startsWith(session.lastCode)) {
      clearScheduledRestart();

      const delta = code!.slice(session.codeLength);
      if (delta) {
        controller.enqueue(delta);
        metricsRef.current.chunks += 1;
        metricsRef.current.chars += delta.length;
      }
      session.codeLength = code!.length;
      session.lastCode = code!;

      if (isComplete && !session.textClosed) {
        controller.close();
        session.textClosed = true;
      }

      return;
    }

    const prev = session.lastCode;
    const next = code ?? '';
    const prefix = commonPrefixLength(prev, next);

    if (isComplete) {
      clearScheduledRestart();
      metricsRef.current.restarts += 1;

      if (process.env.NODE_ENV !== 'test') {
        console.info('[react-shiki] forced restart', {
          sessionId: session.id,
          prevLen: prev.length,
          nextLen: next.length,
          commonPrefixLen: prefix,
          prevTail: previewTail(prev),
          nextTail: previewTail(next),
        });
      }

      logSessionSummary('restart');
      restartSession();
      return;
    }

    scheduleCoalescedRestart({
      sessionId: session.id,
      prevCode: prev,
      nextCode: next,
      commonPrefixLen: prefix,
      reason: 'non-append',
    });
  }, [
    inputMode,
    code,
    isComplete,
    clearScheduledRestart,
    logSessionSummary,
    restartSession,
    scheduleCoalescedRestart,
  ]);

  return { tokens, status, error };
};
