import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
  const stableOpts = useStableValue(options);

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

  const restartSession = useCallback(() => {
    sessionVersionRef.current += 1;
    setSessionVersion(sessionVersionRef.current);
  }, []);

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

    const consume = async () => {
      try {
        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;

          if (!started) {
            started = true;
            setStatus('streaming');
            onStreamStartRef.current?.();
          }

          if (isRecallToken(value)) {
            setTokens((prev) =>
              prev.slice(0, Math.max(0, prev.length - value.recall))
            );
          } else {
            setTokens((prev) => [...prev, value]);
          }
        }

        if (!cancelled) {
          setStatus('done');
          onStreamEndRef.current?.();
        }
      } catch (err) {
        if (!cancelled) {
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
      restartSession();
      return;
    }

    if (code!.startsWith(session.lastCode)) {
      const delta = code!.slice(session.codeLength);
      if (delta) {
        controller.enqueue(delta);
      }
      session.codeLength = code!.length;
      session.lastCode = code!;

      if (isComplete && !session.textClosed) {
        controller.close();
        session.textClosed = true;
      }

      return;
    }

    restartSession();
  }, [inputMode, code, isComplete, restartSession]);

  return { tokens, status, error };
};
