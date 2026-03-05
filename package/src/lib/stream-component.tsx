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
  fullText: string;
  cancelled: boolean;
  cancel: () => void;
};

type RecallToken = { recall: number };

type FastPathMetrics = {
  startedAt: number;
  mode: ActiveSession['mode'] | null;
  sessionId: number;
  chunks: number;
  chars: number;
  tokenEvents: number;
  recallEvents: number;
  restarts: number;
  stableLineHtmlAppends: number;
  stableLineMergedTokenCount: number;
  stableLineSpanCount: number;
  tailPlaintextMutations: number;
  finalExactSwapMs: number;
  terminalLogged: boolean;
};

type StyleCacheValue = {
  signature: string;
  cssText: string;
};

type CoalescedToken = {
  signature: string;
  cssText: string;
  content: string;
};

type PaletteRegistry = {
  styleEl: HTMLStyleElement;
  classBySignature: Map<string, string>;
  nextClassId: number;
};

const STYLE_PALETTE_ATTR = 'data-react-shiki-stream-palette';
const paletteByDocument = new WeakMap<Document, PaletteRegistry>();

const createMetrics = (): FastPathMetrics => ({
  startedAt: 0,
  mode: null,
  sessionId: 0,
  chunks: 0,
  chars: 0,
  tokenEvents: 0,
  recallEvents: 0,
  restarts: 0,
  stableLineHtmlAppends: 0,
  stableLineMergedTokenCount: 0,
  stableLineSpanCount: 0,
  tailPlaintextMutations: 0,
  finalExactSwapMs: 0,
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

const escapeHtml = (text: string): string =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const getPaletteRegistry = (doc: Document): PaletteRegistry => {
  const existing = paletteByDocument.get(doc);
  if (existing) return existing;

  let styleEl = doc.head?.querySelector<HTMLStyleElement>(
    `style[${STYLE_PALETTE_ATTR}]`
  );
  if (!styleEl) {
    styleEl = doc.createElement('style');
    styleEl.setAttribute(STYLE_PALETTE_ATTR, 'true');
    doc.head?.appendChild(styleEl);
  }

  const created: PaletteRegistry = {
    styleEl,
    classBySignature: new Map(),
    nextClassId: 0,
  };
  paletteByDocument.set(doc, created);
  return created;
};

const getPaletteClassName = (
  doc: Document,
  style: StyleCacheValue
): string | null => {
  if (!style.cssText) {
    return null;
  }

  const palette = getPaletteRegistry(doc);
  const existing = palette.classBySignature.get(style.signature);
  if (existing) {
    return existing;
  }

  palette.nextClassId += 1;
  const className = `rsks-${palette.nextClassId.toString(36)}`;
  palette.classBySignature.set(style.signature, className);

  palette.styleEl.appendChild(
    doc.createTextNode(`.${className}{${style.cssText}}\n`)
  );

  return className;
};

const coalesceTokensByStyle = (
  tokens: ThemedToken[],
  styleCache: Map<string, StyleCacheValue>,
  metrics: FastPathMetrics
): CoalescedToken[] => {
  const out: CoalescedToken[] = [];
  let sourceTokenCount = 0;

  for (const token of tokens) {
    if (!token.content) continue;
    sourceTokenCount += 1;
    const style = getTokenStyle(token, styleCache);
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.signature === style.signature &&
      prev.cssText === style.cssText
    ) {
      prev.content += token.content;
      continue;
    }

    out.push({
      signature: style.signature,
      cssText: style.cssText,
      content: token.content,
    });
  }

  metrics.stableLineMergedTokenCount += Math.max(
    0,
    sourceTokenCount - out.length
  );
  return out;
};

const buildStableLineHtml = (
  lineTokens: ThemedToken[],
  doc: Document,
  styleCache: Map<string, StyleCacheValue>,
  metrics: FastPathMetrics
): string => {
  const coalesced = coalesceTokensByStyle(lineTokens, styleCache, metrics);
  let html = '';

  for (const token of coalesced) {
    if (!token.content) continue;
    const escapedContent = escapeHtml(token.content);
    if (!token.cssText) {
      html += escapedContent;
      continue;
    }

    const className = getPaletteClassName(doc, {
      signature: token.signature,
      cssText: token.cssText,
    });

    if (className) {
      html += `<span class="${className}">${escapedContent}</span>`;
      metrics.stableLineSpanCount += 1;
    } else {
      html += escapedContent;
    }
  }

  return html;
};

const appendFinalizedLineFromTail = (
  tailTokens: ThemedToken[],
  stableRoot: HTMLElement,
  styleCache: Map<string, StyleCacheValue>,
  metrics: FastPathMetrics
): number => {
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
    return 0;
  }

  const lineCharLength =
    lineTokens.reduce((sum, token) => sum + token.content.length, 0) + 1;
  const lineHtml = buildStableLineHtml(
    lineTokens,
    doc,
    styleCache,
    metrics
  );
  stableRoot.insertAdjacentHTML('beforeend', `${lineHtml}\n`);
  metrics.stableLineHtmlAppends += 1;

  tailTokens.splice(0, consumedCount);
  if (remainder) {
    tailTokens.unshift(remainder);
  }

  return lineCharLength;
};

const consumeFinalizedLines = (
  tailTokens: ThemedToken[],
  stableRoot: HTMLElement,
  styleCache: Map<string, StyleCacheValue>,
  metrics: FastPathMetrics
): number => {
  let consumedChars = 0;
  while (true) {
    const lineChars = appendFinalizedLineFromTail(
      tailTokens,
      stableRoot,
      styleCache,
      metrics
    );
    if (lineChars <= 0) {
      break;
    }
    consumedChars += lineChars;
  }
  return consumedChars;
};

const renderTailPlain = (
  tailText: string,
  tailRoot: HTMLElement,
  metrics: FastPathMetrics,
  lastTailSnapshotRef: { current: string }
) => {
  if (tailText === lastTailSnapshotRef.current) {
    return;
  }

  tailRoot.textContent = tailText;
  lastTailSnapshotRef.current = tailText;
  metrics.tailPlaintextMutations += 1;
};

const extractCanonicalCodeInnerHtml = (
  doc: Document,
  html: string
): string => {
  const template = doc.createElement('template');
  template.innerHTML = html.trim();
  const codeEl = template.content.querySelector('code');
  return codeEl ? codeEl.innerHTML : html;
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
            scheduledCommits: metrics.tailPlaintextMutations,
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
              stableLineHtmlAppends: metrics.stableLineHtmlAppends,
              stableLineMergedTokenCount:
                metrics.stableLineMergedTokenCount,
              stableLineSpanCount: metrics.stableLineSpanCount,
              tailPlaintextMutations: metrics.tailPlaintextMutations,
              finalExactSwapMs: Number(
                metrics.finalExactSwapMs.toFixed(2)
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
        let fullText = '';
        let stableTextLength = 0;

        const sourceTextStream =
          inputMode === 'code'
            ? new ReadableStream<string>({
                start(controller) {
                  textController = controller;

                  const initialCode = code ?? '';
                  lastCode = initialCode;
                  codeLength = initialCode.length;

                  if (initialCode.length > 0) {
                    controller.enqueue(initialCode);
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
                        }
                        controller.close();
                      } catch (err) {
                        controller.error(err);
                      }
                    })();
                  },
                });

        const renderTailFromSource = (sourceText: string) => {
          const rootsCurrent = rootsRef.current;
          if (!rootsCurrent) return;
          const nextTail = sourceText.slice(stableTextLength);
          renderTailPlain(
            nextTail,
            rootsCurrent.tailRoot,
            metricsRef.current,
            lastTailSnapshotRef
          );
        };

        const tappedTextStream = sourceTextStream.pipeThrough(
          new TransformStream<string, string>({
            transform(chunk, controller) {
              fullText += chunk;
              const session = sessionRef.current;
              if (session && session.id === id) {
                session.fullText = fullText;
              }
              metricsRef.current.chunks += 1;
              metricsRef.current.chars += chunk.length;
              renderTailFromSource(fullText);
              controller.enqueue(chunk);
            },
          })
        );

        const tokenStream = tappedTextStream.pipeThrough(
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

          const consumedChars = consumeFinalizedLines(
            tailTokensRef.current,
            rootsCurrent.stableRoot,
            styleCacheRef.current,
            metricsRef.current
          );
          stableTextLength += consumedChars;
          const session = sessionRef.current;
          renderTailFromSource(session?.fullText ?? fullText);
        };

        const finalExactSwap = (session: ActiveSession) => {
          const codeNode = codeRef.current;
          if (!codeNode) return;

          const swapStart = performance.now();
          const canonicalHtml = resolvedHighlighter.codeToHtml(
            session.fullText,
            {
              lang: langToUse,
              ...themeOpts,
            }
          );
          codeNode.innerHTML = extractCanonicalCodeInnerHtml(
            codeNode.ownerDocument,
            canonicalHtml
          );
          metricsRef.current.finalExactSwapMs =
            performance.now() - swapStart;
          tailTokensRef.current = [];
          lastTailSnapshotRef.current = '';
          rootsRef.current = null;
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

            finalExactSwap(session);
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
          fullText,
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
        }

        session.codeLength = nextCode.length;
        session.lastCode = nextCode;
        session.fullText = nextCode;

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
