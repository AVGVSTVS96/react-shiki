import './styles.css';
import { clsx } from 'clsx';
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CodeToTokenTransformStream } from 'shiki-stream';
import type {
  Awaitable,
  Highlighter,
  HighlighterCore,
  RegexEngine,
  ThemedToken,
} from 'shiki';

import type {
  ShikiStreamInput,
  StreamHighlighterOptions,
  StreamSessionSummary,
} from './stream-types';
import type { Language, Theme, Themes } from './types';
import { resolveLanguage, resolveLoadedLanguage } from './language';
import { resolveTheme } from './theme';
import { useStableValue } from './utils';

const FONT_ITALIC = 1;
const FONT_BOLD = 2;
const FONT_UNDERLINE = 4;

type ActiveSession = {
  id: number;
  mode: 'code' | 'stream' | 'chunks';
  textController: ReadableStreamDefaultController<string> | null;
  textClosed: boolean;
  codeLength: number;
  lastCode: string;
  cancelled: boolean;
  cancel: () => void;
};

type RecallToken = { recall: number };

type FastPathMetrics = {
  startedAt: number;
  completeAt: number;
  mode: ActiveSession['mode'] | null;
  sessionId: number;
  chunks: number;
  chars: number;
  tokenEvents: number;
  recallEvents: number;
  restarts: number;
  stableLineAppends: number;
  tailMutations: number;
  domNodesCreated: number;
  finalFlushMs: number;
  completeToFrozenMs: number;
  terminalLogged: boolean;
};

type StyleCacheValue = {
  signature: string;
  cssText: string;
};

const createMetrics = (): FastPathMetrics => ({
  startedAt: 0,
  completeAt: 0,
  mode: null,
  sessionId: 0,
  chunks: 0,
  chars: 0,
  tokenEvents: 0,
  recallEvents: 0,
  restarts: 0,
  stableLineAppends: 0,
  tailMutations: 0,
  domNodesCreated: 0,
  finalFlushMs: 0,
  completeToFrozenMs: 0,
  terminalLogged: false,
});

const themeToString = (theme: Theme): string =>
  typeof theme === 'string' ? theme : (theme?.name ?? 'github-dark');

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

const buildStyleSignature = (token: ThemedToken): string => {
  if (token.htmlStyle) {
    const sorted = Object.entries(token.htmlStyle).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    return `h:${sorted.map(([k, v]) => `${k}:${v}`).join('|')}`;
  }

  const color = token.color ?? '';
  const fontStyle = token.fontStyle ?? 0;
  return `s:${color}|${fontStyle}`;
};

const buildStyleCssText = (token: ThemedToken): string => {
  if (token.htmlStyle) {
    return Object.entries(token.htmlStyle)
      .map(([key, value]) => `${key}:${value};`)
      .join('');
  }

  const parts: string[] = [];
  if (token.color) {
    parts.push(`color:${token.color};`);
  }

  const fs = token.fontStyle as number | undefined;
  if (fs) {
    if (fs & FONT_ITALIC) {
      parts.push('font-style:italic;');
    }
    if (fs & FONT_BOLD) {
      parts.push('font-weight:bold;');
    }
    if (fs & FONT_UNDERLINE) {
      parts.push('text-decoration:underline;');
    }
  }

  return parts.join('');
};

const createStyledNode = (
  doc: Document,
  text: string,
  style: StyleCacheValue,
  metrics: FastPathMetrics
): Node => {
  const span = doc.createElement('span');
  span.textContent = text;
  if (style.cssText) {
    span.style.cssText = style.cssText;
  }

  metrics.domNodesCreated += 1;
  return span;
};

const getTokenStyle = (
  token: ThemedToken,
  styleCache: Map<string, StyleCacheValue>
): StyleCacheValue => {
  const signature = buildStyleSignature(token);
  let cached = styleCache.get(signature);

  if (!cached) {
    cached = {
      signature,
      cssText: buildStyleCssText(token),
    };
    styleCache.set(signature, cached);
  }

  return cached;
};

const appendTokensToFragment = (
  doc: Document,
  fragment: DocumentFragment,
  tokens: ThemedToken[],
  styleCache: Map<string, StyleCacheValue>,
  metrics: FastPathMetrics
) => {
  for (const token of tokens) {
    if (!token.content) continue;
    fragment.appendChild(
      createStyledNode(
        doc,
        token.content,
        getTokenStyle(token, styleCache),
        metrics
      )
    );
  }
};

const appendFinalizedLineFromTail = (
  tailTokens: ThemedToken[],
  stableRoot: HTMLElement,
  styleCache: Map<string, StyleCacheValue>,
  metrics: FastPathMetrics
): boolean => {
  const doc = stableRoot.ownerDocument;
  const lineTokens: ThemedToken[] = [];
  let consumedCount = 0;
  let remainder: ThemedToken | null = null;
  let found = false;

  for (let index = 0; index < tailTokens.length; index += 1) {
    const token = tailTokens[index];
    if (!token) {
      continue;
    }
    const nl = token.content.indexOf('\n');

    if (nl === -1) {
      if (token.content) {
        lineTokens.push(token);
      }
      consumedCount = index + 1;
      continue;
    }

    const before = token.content.slice(0, nl);
    if (before) {
      lineTokens.push({
        ...token,
        content: before,
      });
    }

    consumedCount = index + 1;

    const after = token.content.slice(nl + 1);
    if (after) {
      remainder = {
        ...token,
        content: after,
      };
    }

    found = true;
    break;
  }

  if (!found) {
    return false;
  }

  const fragment = doc.createDocumentFragment();
  appendTokensToFragment(doc, fragment, lineTokens, styleCache, metrics);
  metrics.domNodesCreated += 1;
  fragment.appendChild(doc.createTextNode('\n'));

  stableRoot.appendChild(fragment);
  metrics.stableLineAppends += 1;

  tailTokens.splice(0, consumedCount);
  if (remainder) {
    tailTokens.unshift(remainder);
  }

  return true;
};

const consumeFinalizedLines = (
  tailTokens: ThemedToken[],
  stableRoot: HTMLElement,
  styleCache: Map<string, StyleCacheValue>,
  metrics: FastPathMetrics
) => {
  while (
    appendFinalizedLineFromTail(
      tailTokens,
      stableRoot,
      styleCache,
      metrics
    )
  ) {
    // Keep draining complete lines from the mutable tail.
  }
};

const renderTailPlain = (
  tailTokens: ThemedToken[],
  tailRoot: HTMLElement,
  metrics: FastPathMetrics,
  lastTailSnapshotRef: { current: string }
) => {
  const text = tailTokens.map((token) => token.content).join('');
  if (text === lastTailSnapshotRef.current) {
    return;
  }

  tailRoot.textContent = text;
  lastTailSnapshotRef.current = text;
  metrics.tailMutations += 1;
};

const renderTailHighlighted = (
  tailTokens: ThemedToken[],
  tailRoot: HTMLElement,
  styleCache: Map<string, StyleCacheValue>,
  metrics: FastPathMetrics,
  lastTailSnapshotRef: { current: string }
) => {
  const doc = tailRoot.ownerDocument;
  const fragment = doc.createDocumentFragment();
  appendTokensToFragment(doc, fragment, tailTokens, styleCache, metrics);

  tailRoot.replaceChildren(fragment);
  lastTailSnapshotRef.current = tailTokens
    .map((token) => token.content)
    .join('');
  metrics.tailMutations += 1;
};

const finalizeTailToStable = (
  tailTokens: ThemedToken[],
  stableRoot: HTMLElement,
  tailRoot: HTMLElement,
  styleCache: Map<string, StyleCacheValue>,
  metrics: FastPathMetrics,
  lastTailSnapshotRef: { current: string }
) => {
  if (tailTokens.length > 0) {
    const doc = stableRoot.ownerDocument;
    const fragment = doc.createDocumentFragment();
    appendTokensToFragment(
      doc,
      fragment,
      tailTokens,
      styleCache,
      metrics
    );
    stableRoot.appendChild(fragment);
    tailTokens.length = 0;
  }

  if (tailRoot.textContent || tailRoot.childNodes.length > 0) {
    tailRoot.replaceChildren();
    metrics.tailMutations += 1;
  }

  lastTailSnapshotRef.current = '';
};

const ensureRoots = (
  codeRoot: HTMLElement
): { stableRoot: HTMLElement; tailRoot: HTMLElement } => {
  let stableRoot = codeRoot.querySelector<HTMLElement>(
    '[data-region="stable"]'
  );
  let tailRoot = codeRoot.querySelector<HTMLElement>(
    '[data-region="tail"]'
  );

  if (!stableRoot || !tailRoot) {
    codeRoot.replaceChildren();

    stableRoot = codeRoot.ownerDocument.createElement('span');
    stableRoot.setAttribute('data-region', 'stable');

    tailRoot = codeRoot.ownerDocument.createElement('span');
    tailRoot.setAttribute('data-region', 'tail');

    codeRoot.appendChild(stableRoot);
    codeRoot.appendChild(tailRoot);
  }

  return { stableRoot, tailRoot };
};

const resetRoots = (
  codeRoot: HTMLElement
): { stableRoot: HTMLElement; tailRoot: HTMLElement } => {
  codeRoot.replaceChildren();
  return ensureRoots(codeRoot);
};

/**
 * Props for the ShikiStreamHighlighter component.
 */
export interface ShikiStreamHighlighterProps
  extends StreamHighlighterOptions {
  /**
   * Input source for streaming.
   */
  input: ShikiStreamInput;

  /**
   * The programming language for syntax highlighting.
   */
  language: Language;

  /**
   * The color theme or themes for syntax highlighting.
   */
  theme: Theme | Themes;

  /**
   * Whether to show the language label.
   * @default true
   */
  showLanguage?: boolean;

  /**
   * Controls the application of default styles.
   * @default true
   */
  addDefaultStyles?: boolean;

  /**
   * Custom inline styles for the container.
   */
  style?: React.CSSProperties;

  /**
   * Custom CSS class names for the container.
   */
  className?: string;

  /**
   * Custom inline styles for the language label.
   */
  langStyle?: React.CSSProperties;

  /**
   * Custom CSS class names for the language label.
   */
  langClassName?: string;

  /**
   * The HTML element that wraps the code block.
   * @default 'pre'
   */
  as?: React.ElementType;
}

/**
 * Creates a DOM-first streaming code component.
 *
 * This path keeps finalized lines frozen in a stable region and only mutates
 * a tiny tail region while a stream is active.
 */
export const createShikiStreamComponent = (
  highlighterFactory: (
    langsToLoad: Language[],
    themesToLoad: Theme[],
    engine?: Awaitable<RegexEngine>
  ) => Promise<Highlighter | HighlighterCore>
) => {
  const StreamComponent = forwardRef<
    HTMLElement,
    ShikiStreamHighlighterProps
  >(
    (
      {
        input,
        language,
        theme,
        showLanguage = true,
        addDefaultStyles = true,
        style,
        className,
        langStyle,
        langClassName,
        as: Element = 'pre',
        highlighter,
        customLanguages,
        preloadLanguages,
        langAlias,
        engine,
        allowRecalls,
        onStreamStart,
        onStreamEnd,
        onSessionSummary,
      },
      ref
    ) => {
      const stableLang = useStableValue(language);
      const stableTheme = useStableValue(theme);
      const stableOptions = useStableValue({
        highlighter,
        customLanguages,
        preloadLanguages,
        langAlias,
        engine,
        allowRecalls,
        onStreamStart,
        onStreamEnd,
        onSessionSummary,
      } satisfies StreamHighlighterOptions);

      const [resolvedHighlighter, setResolvedHighlighter] = useState<
        Highlighter | HighlighterCore | null
      >(null);

      const codeRef = useRef<HTMLElement | null>(null);
      const rootsRef = useRef<{
        stableRoot: HTMLElement;
        tailRoot: HTMLElement;
      } | null>(null);
      const styleCacheRef = useRef<Map<string, StyleCacheValue>>(
        new Map()
      );
      const tailTokensRef = useRef<ThemedToken[]>([]);
      const lastTailSnapshotRef = useRef('');
      const sessionRef = useRef<ActiveSession | null>(null);
      const sessionIdRef = useRef(0);
      const sessionVersionRef = useRef(0);
      const [sessionVersion, setSessionVersion] = useState(0);
      const frozenRef = useRef(false);
      const metricsRef = useRef<FastPathMetrics>(createMetrics());

      const { languageId, langsToLoad } = useMemo(
        () =>
          resolveLanguage(
            stableLang,
            stableOptions.customLanguages,
            stableOptions.langAlias,
            stableOptions.preloadLanguages
          ),
        [
          stableLang,
          stableOptions.customLanguages,
          stableOptions.langAlias,
          stableOptions.preloadLanguages,
        ]
      );

      const resolvedTheme = useMemo(
        () => resolveTheme(stableTheme),
        [stableTheme]
      );
      const { themesToLoad } = resolvedTheme;

      const inputMode: ActiveSession['mode'] =
        'code' in input
          ? 'code'
          : 'stream' in input
            ? 'stream'
            : 'chunks';
      const code = 'code' in input ? input.code : null;
      const isComplete = 'code' in input ? !!input.isComplete : false;
      const stream = 'stream' in input ? input.stream : null;
      const chunks = 'chunks' in input ? input.chunks : null;

      const displayLanguageId =
        typeof language === 'object'
          ? language.name || null
          : language?.trim() || null;

      const resetMetrics = useCallback(
        (sessionId: number, mode: ActiveSession['mode']) => {
          metricsRef.current = {
            ...createMetrics(),
            startedAt: performance.now(),
            sessionId,
            mode,
          };
        },
        []
      );

      const logSummary = useCallback(
        (reason: StreamSessionSummary['reason']) => {
          const metrics = metricsRef.current;
          if (metrics.terminalLogged) return;
          metrics.terminalLogged = true;

          const summary: StreamSessionSummary = {
            reason,
            sessionId: metrics.sessionId,
            mode: metrics.mode,
            elapsedMs:
              metrics.startedAt > 0
                ? performance.now() - metrics.startedAt
                : 0,
            inputChunkCount: metrics.chunks,
            processedChars: metrics.chars,
            tokenEvents: metrics.tokenEvents,
            recallEvents: metrics.recallEvents,
            scheduledCommits: metrics.tailMutations,
            restartCount: metrics.restarts,
          };

          stableOptions.onSessionSummary?.(summary);

          if (
            process.env.NODE_ENV !== 'production' &&
            process.env.NODE_ENV !== 'test'
          ) {
            console.info('[react-shiki] stream fast-path summary', {
              reason,
              sessionId: metrics.sessionId,
              mode: metrics.mode,
              stableLineAppends: metrics.stableLineAppends,
              tailMutations: metrics.tailMutations,
              domNodesCreated: metrics.domNodesCreated,
              finalFlushMs: Number(metrics.finalFlushMs.toFixed(2)),
              completeToFrozenMs: Number(
                metrics.completeToFrozenMs.toFixed(2)
              ),
            });
          }
        },
        [stableOptions]
      );

      const restartSession = useCallback(() => {
        sessionVersionRef.current += 1;
        setSessionVersion(sessionVersionRef.current);
      }, []);

      useEffect(() => {
        let cancelled = false;

        const acquire = async () => {
          if (!languageId) {
            setResolvedHighlighter(null);
            return;
          }

          const hl = stableOptions.highlighter
            ? stableOptions.highlighter
            : await highlighterFactory(
                langsToLoad,
                themesToLoad,
                stableOptions.engine
              );

          if (!cancelled) {
            setResolvedHighlighter(hl);
          }
        };

        void acquire().catch((err) => {
          if (!cancelled) {
            setResolvedHighlighter(null);
            if (process.env.NODE_ENV !== 'test') {
              console.error(
                '[react-shiki] stream highlighter acquire failed',
                err
              );
            }
          }
        });

        return () => {
          cancelled = true;
        };
      }, [
        languageId,
        langsToLoad,
        themesToLoad,
        stableOptions.highlighter,
        stableOptions.engine,
      ]);

      useEffect(() => {
        const codeRoot = codeRef.current;
        if (!codeRoot) {
          return;
        }

        sessionRef.current?.cancel();
        sessionRef.current = null;
        frozenRef.current = false;

        const roots = resetRoots(codeRoot);
        rootsRef.current = roots;
        tailTokensRef.current = [];
        lastTailSnapshotRef.current = '';

        if (!resolvedHighlighter || !languageId) {
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
          : {
              theme: themeToString(
                resolvedTheme.singleTheme ?? 'github-dark'
              ),
            };

        const recallsEnabled = stableOptions.allowRecalls === true;
        const id = ++sessionIdRef.current;
        resetMetrics(id, inputMode);

        let textController: ReadableStreamDefaultController<string> | null =
          null;
        let textClosed = false;
        let codeLength = 0;
        let lastCode = '';

        const textStream =
          inputMode === 'code'
            ? new ReadableStream<string>({
                start(controller) {
                  textController = controller;

                  const initialCode = code ?? '';
                  lastCode = initialCode;
                  codeLength = initialCode.length;

                  if (initialCode.length > 0) {
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
            : inputMode === 'stream' && stream
              ? stream
              : new ReadableStream<string>({
                  start(controller) {
                    void (async () => {
                      try {
                        for await (const chunk of chunks ?? []) {
                          const session = sessionRef.current;
                          if (
                            !session ||
                            session.id !== id ||
                            session.cancelled
                          ) {
                            break;
                          }

                          controller.enqueue(chunk);
                          metricsRef.current.chunks += 1;
                          metricsRef.current.chars += chunk.length;
                        }
                        controller.close();
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
            allowRecalls: recallsEnabled,
            ...themeOpts,
          })
        );

        const reader = tokenStream.getReader();
        let started = false;

        const cancelSession = () => {
          const session = sessionRef.current;
          if (!session || session.id !== id) return;

          session.cancelled = true;
          void reader.cancel().catch(() => {});
          logSummary('cleanup');
        };

        const processTail = () => {
          const rootsCurrent = rootsRef.current;
          if (!rootsCurrent) return;

          consumeFinalizedLines(
            tailTokensRef.current,
            rootsCurrent.stableRoot,
            styleCacheRef.current,
            metricsRef.current
          );

          if (recallsEnabled) {
            renderTailHighlighted(
              tailTokensRef.current,
              rootsCurrent.tailRoot,
              styleCacheRef.current,
              metricsRef.current,
              lastTailSnapshotRef
            );
            return;
          }

          renderTailPlain(
            tailTokensRef.current,
            rootsCurrent.tailRoot,
            metricsRef.current,
            lastTailSnapshotRef
          );
        };

        const freezeCompletedSession = () => {
          const rootsCurrent = rootsRef.current;
          if (!rootsCurrent) return;

          const completeAt = performance.now();
          metricsRef.current.completeAt = completeAt;

          const flushStart = performance.now();
          finalizeTailToStable(
            tailTokensRef.current,
            rootsCurrent.stableRoot,
            rootsCurrent.tailRoot,
            styleCacheRef.current,
            metricsRef.current,
            lastTailSnapshotRef
          );
          metricsRef.current.finalFlushMs =
            performance.now() - flushStart;

          frozenRef.current = true;
          metricsRef.current.completeToFrozenMs =
            performance.now() - metricsRef.current.completeAt;
        };

        const consume = async () => {
          try {
            while (true) {
              const session = sessionRef.current;
              if (!session || session.id !== id || session.cancelled) {
                break;
              }

              const { done, value } = await reader.read();
              if (done) {
                break;
              }

              if (!started) {
                started = true;
                stableOptions.onStreamStart?.();
              }

              metricsRef.current.tokenEvents += 1;

              if (isRecallToken(value)) {
                metricsRef.current.recallEvents += 1;
                const tailTokens = tailTokensRef.current;
                const nextLength = Math.max(
                  0,
                  tailTokens.length - value.recall
                );
                tailTokens.splice(nextLength);
                processTail();
                continue;
              }

              tailTokensRef.current.push(value);
              processTail();
            }

            const session = sessionRef.current;
            if (!session || session.id !== id || session.cancelled) {
              return;
            }

            freezeCompletedSession();
            logSummary('done');
            stableOptions.onStreamEnd?.();
            session.cancelled = true;
          } catch (err) {
            if (process.env.NODE_ENV !== 'test') {
              console.error('[react-shiki] stream fast-path failed', err);
            }
            logSummary('error');
          }
        };

        sessionRef.current = {
          id,
          mode: inputMode,
          textController,
          textClosed,
          codeLength,
          lastCode,
          cancelled: false,
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
        inputMode,
        code,
        isComplete,
        stream,
        chunks,
        languageId,
        resolvedTheme,
        resolvedHighlighter,
        stableOptions.allowRecalls,
        stableOptions.onStreamStart,
        stableOptions.onStreamEnd,
        stableOptions.onSessionSummary,
        logSummary,
        resetMetrics,
        sessionVersion,
      ]);

      useEffect(() => {
        if (inputMode !== 'code') return;

        const session = sessionRef.current;
        if (!session || session.mode !== 'code' || session.cancelled) {
          return;
        }

        const controller = session.textController;
        if (!controller) return;

        const nextCode = code ?? '';
        if (nextCode === session.lastCode) {
          if (isComplete && !session.textClosed) {
            controller.close();
            session.textClosed = true;
          }
          return;
        }

        if (!nextCode.startsWith(session.lastCode)) {
          metricsRef.current.restarts += 1;
          if (
            process.env.NODE_ENV !== 'production' &&
            process.env.NODE_ENV !== 'test'
          ) {
            console.info('[react-shiki] stream fast-path restart', {
              sessionId: session.id,
              prevLen: session.lastCode.length,
              nextLen: nextCode.length,
              commonPrefixLen: commonPrefixLength(
                session.lastCode,
                nextCode
              ),
            });
          }
          logSummary('restart');
          restartSession();
          return;
        }

        if (session.textClosed) {
          metricsRef.current.restarts += 1;
          logSummary('restart');
          restartSession();
          return;
        }

        const delta = nextCode.slice(session.codeLength);
        if (delta.length > 0) {
          controller.enqueue(delta);
          metricsRef.current.chunks += 1;
          metricsRef.current.chars += delta.length;
        }

        session.codeLength = nextCode.length;
        session.lastCode = nextCode;

        if (isComplete && !session.textClosed) {
          controller.close();
          session.textClosed = true;
        }
      }, [inputMode, code, isComplete, logSummary, restartSession]);

      return (
        <Element
          ref={ref}
          data-testid="shiki-stream-container"
          className={clsx(
            'relative',
            'not-prose',
            addDefaultStyles && 'defaultStyles',
            className
          )}
          style={style}
        >
          {showLanguage && displayLanguageId ? (
            <span
              className={clsx('languageLabel', langClassName)}
              style={langStyle}
            >
              {displayLanguageId}
            </span>
          ) : null}
          <code ref={codeRef} />
        </Element>
      );
    }
  );

  const areInputsEqual = (
    prevInput: ShikiStreamInput,
    nextInput: ShikiStreamInput
  ): boolean => {
    if ('code' in prevInput && 'code' in nextInput) {
      return (
        prevInput.code === nextInput.code &&
        !!prevInput.isComplete === !!nextInput.isComplete
      );
    }

    if ('stream' in prevInput && 'stream' in nextInput) {
      return prevInput.stream === nextInput.stream;
    }

    if ('chunks' in prevInput && 'chunks' in nextInput) {
      return prevInput.chunks === nextInput.chunks;
    }

    return false;
  };

  const areStreamHighlighterPropsEqual = (
    prev: Readonly<ShikiStreamHighlighterProps>,
    next: Readonly<ShikiStreamHighlighterProps>
  ): boolean =>
    areInputsEqual(prev.input, next.input) &&
    prev.language === next.language &&
    prev.theme === next.theme &&
    prev.showLanguage === next.showLanguage &&
    prev.addDefaultStyles === next.addDefaultStyles &&
    prev.style === next.style &&
    prev.className === next.className &&
    prev.langStyle === next.langStyle &&
    prev.langClassName === next.langClassName &&
    prev.as === next.as &&
    prev.highlighter === next.highlighter &&
    prev.customLanguages === next.customLanguages &&
    prev.preloadLanguages === next.preloadLanguages &&
    prev.langAlias === next.langAlias &&
    prev.engine === next.engine &&
    prev.allowRecalls === next.allowRecalls &&
    prev.onStreamStart === next.onStreamStart &&
    prev.onStreamEnd === next.onStreamEnd &&
    prev.onSessionSummary === next.onSessionSummary;

  return memo(StreamComponent, areStreamHighlighterPropsEqual);
};
