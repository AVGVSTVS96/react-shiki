import {
  Profiler,
  StrictMode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  useState,
  type RefObject,
} from 'react';
import {
  ShikiTokenRenderer,
  useShikiHighlighter,
  useShikiStreamHighlighter,
  type StreamSessionSummary,
} from 'react-shiki';

import {
  STREAMING_ASSISTANT_MESSAGE_CORPUS_LIST,
  STREAMING_CORPUS_LIST,
  STREAMING_SCENARIO_PRESETS,
  buildAssistantChatTreePlaybackPlan,
  buildSessionMetrics,
  createEmptyAssistantMessageMetrics,
  createEmptySessionMetrics,
  createStreamingScenario,
  getStreamingCorpus,
  getWorkAmplification,
  isCodeMutationEvent,
  isTranscriptMutationEvent,
  logAssistantMessageRunSummary,
  parseTranscriptNodes,
  playScenarioEvents,
  summarizeAssistantMessageRun,
  type AssistantBlockMetrics,
  type AssistantMessageMetrics,
  type AssistantMessageRunSummary,
  type CorpusId,
  type MessageCorpusId,
  type ScenarioPlaybackFrame,
  type ScenarioPreset,
  type ScenarioPresetId,
} from 'streaming-lab';

type SingleLane = 'isolated' | 'chat';
type AssistantLane =
  | 'incremental-chat-tree'
  | 'static-chat-tree'
  | 'plaintext-chat-tree';
type RunStatus = 'idle' | 'running' | 'stopped' | 'completed';
type LabFamily = 'single-block' | 'assistant-message';

type CounterState = {
  startedAtMs: number;
  inputChunkCount: number;
  messageChunkCount: number;
  processedChars: number;
  chunkLatenciesMs: number[];
  pendingChunkStartedAt: number[];
  firstAnyOutputMs: number;
  firstHighlightedOutputMs: number;
  lastCode: string;
  maxMountedBlocks: number;
};

const createCounterState = (): CounterState => ({
  startedAtMs: 0,
  inputChunkCount: 0,
  messageChunkCount: 0,
  processedChars: 0,
  chunkLatenciesMs: [],
  pendingChunkStartedAt: [],
  firstAnyOutputMs: 0,
  firstHighlightedOutputMs: 0,
  lastCode: '',
  maxMountedBlocks: 0,
});

const formatMs = (value: number) => `${value.toFixed(2)} ms`;

const hasStyledTokens = (
  tokens: Array<{
    color?: string;
    fontStyle?: number;
    htmlStyle?: Record<string, string>;
  }>
): boolean =>
  tokens.some(
    (token) =>
      token.color != null ||
      token.fontStyle != null ||
      (token.htmlStyle != null && Object.keys(token.htmlStyle).length > 0)
  );

type BlockMetricEvent =
  | { type: 'mount'; blockId: string; language: string }
  | {
      type: 'render';
      blockId: string;
      language: string;
      code: string;
      tokenCount: number;
      highlighted: boolean;
    }
  | {
      type: 'token-commit';
      blockId: string;
      language: string;
      tokenCount: number;
    }
  | { type: 'session'; blockId: string; summary: StreamSessionSummary };

type MutableAssistantBlockMetrics = AssistantBlockMetrics & {
  lastCode: string | null;
};

const createMutableAssistantBlock = (
  blockId: string,
  language: string
): MutableAssistantBlockMetrics => ({
  blockId,
  language,
  mountCount: 0,
  renderCount: 0,
  codeUpdateCount: 0,
  noopRenderCount: 0,
  tokenStateCommitCount: 0,
  finalTokenCount: 0,
  tokenSpanWork: 0,
  firstMountMs: 0,
  firstHighlightMs: 0,
  lastHighlightMs: 0,
  sessionCount: 0,
  restartCount: 0,
  lastCode: null,
});

const toStableAssistantBlock = (
  block: MutableAssistantBlockMetrics
): AssistantBlockMetrics => ({
  blockId: block.blockId,
  language: block.language,
  mountCount: block.mountCount,
  renderCount: block.renderCount,
  codeUpdateCount: block.codeUpdateCount,
  noopRenderCount: block.noopRenderCount,
  tokenStateCommitCount: block.tokenStateCommitCount,
  finalTokenCount: block.finalTokenCount,
  tokenSpanWork: block.tokenSpanWork,
  firstMountMs: block.firstMountMs,
  firstHighlightMs: block.firstHighlightMs,
  lastHighlightMs: block.lastHighlightMs,
  sessionCount: block.sessionCount,
  restartCount: block.restartCount,
});

const SingleChatCodeBlock = ({
  blockIndex,
  code,
  language,
  isComplete,
  freshOptionsNonce,
  onSummary,
  onRenderCommit,
}: {
  blockIndex: number;
  code: string;
  language: string;
  isComplete: boolean;
  freshOptionsNonce: number;
  onSummary: (summary: StreamSessionSummary) => void;
  onRenderCommit: () => void;
}) => {
  const stableSummary = useCallback(
    (summary: StreamSessionSummary) => {
      onSummary(summary);
    },
    [onSummary]
  );

  const stableOptions = useMemo(
    () => ({
      allowRecalls: true,
      onSessionSummary: stableSummary,
    }),
    [stableSummary]
  );

  const options =
    freshOptionsNonce > 0 ? { ...stableOptions } : stableOptions;

  const result = useShikiStreamHighlighter(
    { code, isComplete },
    language || 'plaintext',
    'github-dark',
    options
  );

  useEffect(() => {
    onRenderCommit();
  }, [onRenderCommit, result.tokens]);

  return (
    <div
      className="code-scroll min-w-0 w-full overflow-x-auto whitespace-pre rounded border border-slate-700/70 bg-black/50 p-2"
      data-chat-block
      data-block-index={blockIndex}
      data-language={language || 'plaintext'}
      data-status={result.status}
    >
      <ShikiTokenRenderer tokens={result.tokens} />
    </div>
  );
};

const SingleChatTreeView = ({
  transcript,
  freshOptionsNonce,
  remountSalt,
  onSummary,
  onRenderCommit,
}: {
  transcript: string;
  freshOptionsNonce: number;
  remountSalt: string;
  onSummary: (blockIndex: number, summary: StreamSessionSummary) => void;
  onRenderCommit: () => void;
}) => {
  const nodes = parseTranscriptNodes(transcript);

  return (
    <div className="space-y-2" data-chat-tree>
      {nodes.map((node, index) => {
        if (node.type === 'text') {
          return (
            <span key={`text:${index}`} className="whitespace-pre-wrap">
              {node.value}
            </span>
          );
        }

        if (node.type === 'inline-code') {
          return (
            <code
              key={`inline:${index}`}
              className="rounded bg-slate-800/80 px-1 py-0.5"
            >
              {node.value}
            </code>
          );
        }

        return (
          <SingleChatCodeBlock
            key={`${remountSalt}:block:${node.block.index}`}
            blockIndex={node.block.index}
            code={node.block.code}
            language={node.block.language || 'plaintext'}
            isComplete={node.block.closed}
            freshOptionsNonce={freshOptionsNonce}
            onSummary={(summary) => {
              onSummary(node.block.index, summary);
            }}
            onRenderCommit={onRenderCommit}
          />
        );
      })}
    </div>
  );
};

const AssistantBlockView = ({
  blockId,
  blockIndex,
  code,
  language,
  isComplete,
  lane,
  unstableOptions,
  onMetric,
}: {
  blockId: string;
  blockIndex: number;
  code: string;
  language: string;
  isComplete: boolean;
  lane: AssistantLane;
  unstableOptions: boolean;
  onMetric: (event: BlockMetricEvent) => void;
}) => {
  const staticRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    onMetric({ type: 'mount', blockId, language });
  }, [blockId, language, onMetric]);

  if (lane === 'plaintext-chat-tree') {
    useEffect(() => {
      onMetric({
        type: 'render',
        blockId,
        language,
        code,
        tokenCount: 0,
        highlighted: false,
      });
    });

    return (
      <pre
        className="code-scroll min-w-0 w-full overflow-x-auto whitespace-pre rounded border border-slate-700/70 bg-black/40 p-2"
        data-assistant-block
        data-block-id={blockId}
        data-block-index={blockIndex}
        data-language={language}
      >
        <code>{code}</code>
      </pre>
    );
  }

  if (lane === 'static-chat-tree') {
    const highlighted = useShikiHighlighter(code, language, 'github-dark');

    useEffect(() => {
      const tokenCount =
        staticRef.current?.querySelectorAll('span').length ??
        Math.max(0, code.length > 0 ? 1 : 0);
      const html = staticRef.current?.innerHTML ?? '';
      const highlightedNow =
        tokenCount > 0 && (html.includes('style=') || html.includes('class='));

      onMetric({
        type: 'token-commit',
        blockId,
        language,
        tokenCount,
      });
      onMetric({
        type: 'render',
        blockId,
        language,
        code,
        tokenCount,
        highlighted: highlightedNow,
      });
    });

    return (
      <div
        ref={staticRef}
        className="code-scroll min-w-0 w-full overflow-x-auto whitespace-pre rounded border border-slate-700/70 bg-black/50 p-2"
        data-assistant-block
        data-block-id={blockId}
        data-block-index={blockIndex}
        data-language={language}
      >
        {highlighted}
      </div>
    );
  }

  const stableSummary = useCallback(
    (summary: StreamSessionSummary) => {
      onMetric({ type: 'session', blockId, summary });
    },
    [blockId, onMetric]
  );

  const stableOptions = useMemo(
    () => ({
      allowRecalls: true,
      onSessionSummary: stableSummary,
    }),
    [stableSummary]
  );

  const options = unstableOptions ? { ...stableOptions } : stableOptions;

  const result = useShikiStreamHighlighter(
    { code, isComplete },
    language,
    'github-dark',
    options
  );

  useEffect(() => {
    onMetric({
      type: 'token-commit',
      blockId,
      language,
      tokenCount: result.tokens.length,
    });
  }, [blockId, language, onMetric, result.tokens]);

  useEffect(() => {
    onMetric({
      type: 'render',
      blockId,
      language,
      code,
      tokenCount: result.tokens.length,
      highlighted: hasStyledTokens(result.tokens),
    });
  });

  return (
    <div
      className="code-scroll min-w-0 w-full overflow-x-auto whitespace-pre rounded border border-slate-700/70 bg-black/50 p-2"
      data-assistant-block
      data-block-id={blockId}
      data-block-index={blockIndex}
      data-language={language}
      data-status={result.status}
    >
      <ShikiTokenRenderer tokens={result.tokens} />
    </div>
  );
};

const AssistantChatTreeView = ({
  transcript,
  lane,
  unstableOptions,
  blockIds,
  onMetric,
}: {
  transcript: string;
  lane: AssistantLane;
  unstableOptions: boolean;
  blockIds: string[];
  onMetric: (event: BlockMetricEvent) => void;
}) => {
  const nodes = parseTranscriptNodes(transcript);

  return (
    <article className="space-y-2" data-assistant-chat-tree>
      {nodes.map((node, index) => {
        if (node.type === 'text') {
          return (
            <span key={`text:${index}`} className="whitespace-pre-wrap">
              {node.value}
            </span>
          );
        }

        if (node.type === 'inline-code') {
          return (
            <code
              key={`inline:${index}`}
              className="rounded bg-slate-800/80 px-1 py-0.5"
            >
              {node.value}
            </code>
          );
        }

        const blockId =
          blockIds[node.block.index] ?? `block-${node.block.index}`;

        return (
          <AssistantBlockView
            key={`${lane}:${node.block.index}:${blockId}`}
            blockId={blockId}
            blockIndex={node.block.index}
            code={node.block.code}
            language={node.block.language || 'plaintext'}
            isComplete={node.block.closed}
            lane={lane}
            unstableOptions={unstableOptions}
            onMetric={onMetric}
          />
        );
      })}
    </article>
  );
};

const StreamingContentPanel = ({
  title,
  panelHeightClass = '',
  panelRef,
  autoScroll = false,
  autoScrollSignal = 0,
  forcePinned = false,
  autoScrollBehavior = 'auto',
  autoScrollBottomPadding = 72,
  className = '',
  panelInnerClassName = '',
  children,
}: {
  title: string;
  panelHeightClass?: string;
  panelRef: RefObject<HTMLDivElement | null>;
  autoScroll?: boolean;
  autoScrollSignal?: number;
  forcePinned?: boolean;
  autoScrollBehavior?: ScrollBehavior;
  autoScrollBottomPadding?: number;
  className?: string;
  panelInnerClassName?: string;
  children: ReactNode;
}) => {
  usePinnedAutoScroll({
    containerRef: panelRef,
    enabled: autoScroll,
    signal: autoScrollSignal,
    forcePinned,
    behavior: autoScrollBehavior,
    bottomPadding: autoScrollBottomPadding,
  });

  return (
    <section
      className={`flex min-h-0 w-full flex-col overflow-hidden rounded-xl border border-slate-700/70 bg-slate-900/80 p-3 ${panelHeightClass} ${className}`}
    >
      <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">
        {title}
      </p>
      <div
        ref={panelRef}
        className={`code-scroll streaming-autoscroll min-h-0 min-w-0 flex-1 overflow-auto ${panelInnerClassName}`}
      >
        {children}
      </div>
    </section>
  );
};

const PANEL_VIEW_CLASS = 'h-[80vh]';
const PANEL_OVERFLOW_CONTENT_CLASS =
  'w-full whitespace-pre overflow-x-auto';

const usePinnedAutoScroll = ({
  containerRef,
  enabled,
  signal,
  forcePinned = false,
  behavior = 'auto',
  bottomPadding = 72,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  enabled: boolean;
  signal: number;
  forcePinned?: boolean;
  behavior?: ScrollBehavior;
  bottomPadding?: number;
}) => {
  const pinnedToBottomRef = useRef(true);
  const rafRef = useRef<number | null>(null);

  const scheduleScroll = useCallback(
    (nextBehavior: ScrollBehavior) => {
      const node = containerRef.current;
      if (!node || (!forcePinned && !pinnedToBottomRef.current)) return;

      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        node.scrollTo({
          top: node.scrollHeight + bottomPadding,
          behavior: nextBehavior,
        });
      });
    },
    [bottomPadding, containerRef, forcePinned]
  );

  useEffect(() => {
    if (!enabled) return;
    const node = containerRef.current;
    if (!node) return;

    node.style.setProperty('--stream-bottom-gap', `${bottomPadding}px`);
    const threshold = Math.max(40, bottomPadding * 0.75);

    const onScroll = () => {
      if (forcePinned) {
        pinnedToBottomRef.current = true;
        return;
      }
      const distance =
        node.scrollHeight - node.scrollTop - node.clientHeight;
      pinnedToBottomRef.current = distance <= threshold;
    };

    onScroll();
    scheduleScroll('auto');

    node.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      node.removeEventListener('scroll', onScroll);
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [bottomPadding, containerRef, enabled, forcePinned, scheduleScroll]);

  useEffect(() => {
    if (!enabled) return;
    scheduleScroll(behavior);
  }, [behavior, enabled, scheduleScroll, signal]);
};

export default function StreamingBenchmarkPage() {
  const [labFamily, setLabFamily] = useState<LabFamily>('single-block');
  const [presetId, setPresetId] =
    useState<ScenarioPresetId>('openai-steady');
  const [corpusId, setCorpusId] = useState<CorpusId>('tsx-chat-ui');
  const [messageCorpusId, setMessageCorpusId] =
    useState<MessageCorpusId>('assistant-mixed-stack-6');
  const [messageRepeatCount, setMessageRepeatCount] = useState(1);
  const [singleLane, setSingleLane] = useState<SingleLane>('isolated');
  const [assistantLane, setAssistantLane] =
    useState<AssistantLane>('incremental-chat-tree');
  const [seed, setSeed] = useState(42);
  const [stepDelayMs, setStepDelayMs] = useState(12);
  const [strictMode, setStrictMode] = useState(false);
  const [remountChurn, setRemountChurn] = useState(false);
  const [freshOptions, setFreshOptions] = useState(false);
  const [showTranscriptPanel, setShowTranscriptPanel] = useState(false);
  const [runStatus, setRunStatus] = useState<RunStatus>('idle');

  const availablePresets = useMemo(
    () =>
      STREAMING_SCENARIO_PRESETS.filter(
        (preset) => preset.family === labFamily
      ),
    [labFamily]
  );

  const ensureFamilyPreset = useCallback(
    (family: LabFamily) => {
      const next = STREAMING_SCENARIO_PRESETS.find(
        (preset) => preset.family === family
      );
      if (next) {
        setPresetId(next.id);
      }
    },
    []
  );

  const scenario = useMemo(() => {
    if (labFamily === 'assistant-message') {
      return createStreamingScenario({
        presetId: presetId as Extract<
          ScenarioPresetId,
          | 'assistant-multi-block-steady'
          | 'assistant-multi-block-bursty'
          | 'assistant-multi-block-firehose'
        >,
        messageCorpusId,
        messageRepeatCount,
        seed,
      });
    }

    return createStreamingScenario({
      presetId: presetId as Exclude<
        ScenarioPresetId,
        | 'assistant-multi-block-steady'
        | 'assistant-multi-block-bursty'
        | 'assistant-multi-block-firehose'
      >,
      corpusId,
      seed,
    });
  }, [
    corpusId,
    labFamily,
    messageCorpusId,
    messageRepeatCount,
    presetId,
    seed,
  ]);

  const selectedMessageCorpus = useMemo(
    () =>
      STREAMING_ASSISTANT_MESSAGE_CORPUS_LIST.find(
        (corpus) => corpus.messageId === messageCorpusId
      ),
    [messageCorpusId]
  );
  const projectedAssistantBlocks =
    (selectedMessageCorpus?.blocks.length ?? 0) * messageRepeatCount;

  const playback = useMemo(
    () => buildAssistantChatTreePlaybackPlan(scenario.events),
    [scenario.events]
  );
  const expectedBlocks = playback.finalBlocks;
  const expectedCode = useMemo(
    () => expectedBlocks.map((block) => block.code).join('\n'),
    [expectedBlocks]
  );

  const language = useMemo(() => {
    if (labFamily === 'assistant-message') {
      return expectedBlocks[0]?.language || 'plaintext';
    }
    return getStreamingCorpus(corpusId).language;
  }, [corpusId, expectedBlocks, labFamily]);

  const [cursor, setCursor] = useState(-1);
  const [transcript, setTranscript] = useState('');
  const [code, setCode] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [metrics, setMetrics] = useState(createEmptySessionMetrics());
  const [assistantMessageMetrics, setAssistantMessageMetrics] =
    useState<AssistantMessageMetrics>(createEmptyAssistantMessageMetrics());
  const [assistantSummary, setAssistantSummary] =
    useState<AssistantMessageRunSummary | null>(null);
  const [assistantParity, setAssistantParity] = useState<{
    plainTextParity: boolean;
    highlightPresencePass: boolean;
    strictStructuralMatch: boolean | null;
  }>({
    plainTextParity: false,
    highlightPresencePass: false,
    strictStructuralMatch: null,
  });
  const [integrityError, setIntegrityError] = useState<string | null>(
    null
  );
  const [streamRevision, setStreamRevision] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const countersRef = useRef<CounterState>(createCounterState());
  const renderCommitCountRef = useRef(0);
  const latestTranscriptRef = useRef('');
  const isolatedSummariesRef = useRef<StreamSessionSummary[]>([]);
  const chatSummariesRef = useRef<Map<number, StreamSessionSummary[]>>(
    new Map()
  );
  const isolatedOutputRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);
  const baselineContainerRef = useRef<HTMLDivElement | null>(null);

  const assistantBlockMetricsRef = useRef<
    Map<string, MutableAssistantBlockMetrics>
  >(new Map());
  const assistantCompleteAtMsRef = useRef(0);
  const assistantProfilerCommitsRef = useRef(0);
  const assistantProfilerDurationRef = useRef(0);
  const stepDelayMsRef = useRef(stepDelayMs);

  const baselineStatic = useShikiHighlighter(
    code,
    language,
    'github-dark'
  );
  const isolatedResult = useShikiStreamHighlighter(
    { code, isComplete },
    language,
    'github-dark',
    {
      allowRecalls: true,
      onSessionSummary: (summary) => {
        isolatedSummariesRef.current.push(summary);
      },
    }
  );

  const activeSummaries =
    singleLane === 'isolated'
      ? isolatedSummariesRef.current
      : [...chatSummariesRef.current.values()].flat();

  useEffect(() => {
    stepDelayMsRef.current = stepDelayMs;
  }, [stepDelayMs]);

  const recordRenderCommit = useCallback(() => {
    renderCommitCountRef.current += 1;
    const counters = countersRef.current;
    const now = performance.now();

    if (
      counters.firstHighlightedOutputMs === 0 &&
      counters.startedAtMs > 0 &&
      (singleLane === 'isolated'
        ? (isolatedOutputRef.current?.textContent ?? '').length > 0
        : (chatContainerRef.current?.textContent ?? '').length > 0)
    ) {
      counters.firstHighlightedOutputMs = now - counters.startedAtMs;
    }

    const pending = counters.pendingChunkStartedAt.shift();
    if (pending != null) {
      counters.chunkLatenciesMs.push(now - pending);
    }
  }, [singleLane]);

  const recordAssistantMetric = useCallback(
    (event: BlockMetricEvent) => {
      const now = performance.now();
      const startedAt = countersRef.current.startedAtMs || now;
      const elapsed = now - startedAt;

      const ensureBlock = () => {
        const existing = assistantBlockMetricsRef.current.get(event.blockId);
        if (existing) return existing;

        const next = createMutableAssistantBlock(
          event.blockId,
          'language' in event ? event.language : 'plaintext'
        );
        assistantBlockMetricsRef.current.set(event.blockId, next);
        return next;
      };

      const block = ensureBlock();
      if ('language' in event && event.language) {
        block.language = event.language;
      }

      if (event.type === 'mount') {
        block.mountCount += 1;
        block.firstMountMs =
          block.firstMountMs === 0 ? elapsed : block.firstMountMs;
        return;
      }

      if (event.type === 'render') {
        block.renderCount += 1;
        block.finalTokenCount = event.tokenCount;
        block.tokenSpanWork += event.tokenCount;

        if (block.lastCode == null || block.lastCode !== event.code) {
          block.codeUpdateCount += 1;
        } else {
          block.noopRenderCount += 1;
        }

        block.lastCode = event.code;

        if (event.highlighted) {
          block.firstHighlightMs =
            block.firstHighlightMs === 0
              ? elapsed
              : block.firstHighlightMs;
          block.lastHighlightMs = elapsed;
        }
        return;
      }

      if (event.type === 'token-commit') {
        block.tokenStateCommitCount += 1;
        block.finalTokenCount = event.tokenCount;
        return;
      }

      block.sessionCount += 1;
      if (event.summary.reason === 'restart') {
        block.restartCount += 1;
      }
    },
    []
  );

  useEffect(() => {
    if (singleLane !== 'isolated') return;
    if (labFamily !== 'single-block') return;
    recordRenderCommit();
  }, [
    isolatedResult.tokens,
    labFamily,
    recordRenderCommit,
    singleLane,
  ]);

  const resetPlaybackState = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    countersRef.current = createCounterState();
    renderCommitCountRef.current = 0;
    latestTranscriptRef.current = '';
    isolatedSummariesRef.current = [];
    chatSummariesRef.current = new Map();
    assistantBlockMetricsRef.current = new Map();
    assistantCompleteAtMsRef.current = 0;
    assistantProfilerCommitsRef.current = 0;
    assistantProfilerDurationRef.current = 0;

    setRunStatus('idle');
    setCursor(-1);
    setTranscript('');
    setCode('');
    setIsComplete(false);
    setMetrics(createEmptySessionMetrics());
    setAssistantSummary(null);
    setAssistantMessageMetrics(createEmptyAssistantMessageMetrics());
    setAssistantParity({
      plainTextParity: false,
      highlightPresencePass: false,
      strictStructuralMatch: null,
    });
    setIntegrityError(null);
  }, []);

  const flushUiCommits = useCallback(async () => {
    await new Promise<void>((resolve) => {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
          resolve();
        });
        return;
      }

      setTimeout(resolve, 0);
    });

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  }, []);

  const finalizeSingleMetrics = useCallback(
    (endedCleanly: boolean) => {
      const counters = countersRef.current;
      const now = performance.now();
      const sessionTotalMs =
        counters.startedAtMs > 0 ? now - counters.startedAtMs : 0;

      const finalCode =
        singleLane === 'isolated'
          ? isolatedResult.tokens.map((token) => token.content).join('')
          : expectedCode;

      const finalRenderedHtml =
        singleLane === 'isolated'
          ? (isolatedOutputRef.current?.innerHTML ?? '')
          : Array.from(
              chatContainerRef.current?.querySelectorAll('[data-chat-block]') ??
                []
            )
              .map((node) => node.innerHTML)
              .join('');

      const baselineHtml =
        singleLane === 'isolated'
          ? baselineContainerRef.current?.innerHTML
          : expectedBlocks
              .map((block) => {
                const codeNode = document.createElement('code');
                codeNode.textContent = block.code;
                return codeNode.outerHTML;
              })
              .join('');

      const nextMetrics = buildSessionMetrics({
        finalCode,
        baselineCode: expectedCode,
        inputChunkCount: counters.inputChunkCount,
        processedChars: counters.processedChars,
        tokenEvents: activeSummaries.reduce(
          (count, summary) => count + summary.tokenEvents,
          0
        ),
        recallEvents: activeSummaries.reduce(
          (count, summary) => count + summary.recallEvents,
          0
        ),
        scheduledCommits: activeSummaries.reduce(
          (count, summary) => count + summary.scheduledCommits,
          0
        ),
        actualRenderCommits: renderCommitCountRef.current,
        restartCount: activeSummaries.filter(
          (summary) => summary.reason === 'restart'
        ).length,
        chunkLatenciesMs: counters.chunkLatenciesMs,
        timeToFirstAnyOutputMs: counters.firstAnyOutputMs,
        timeToFirstHighlightedOutputMs:
          counters.firstHighlightedOutputMs || counters.firstAnyOutputMs,
        sessionTotalMs,
        statusSequence: activeSummaries.map((summary) => summary.reason),
        endedCleanly,
        finalRenderedHtml,
        baselineHtml,
      });

      setMetrics(nextMetrics);

      if (!nextMetrics.integrity.finalPlainTextMatchesBaseline) {
        setIntegrityError(
          'Plain-text divergence from expected final output.'
        );
        return;
      }

      if (!nextMetrics.integrity.highlightPresencePass) {
        setIntegrityError('Highlight presence check failed.');
        return;
      }

      setIntegrityError(null);
    },
    [
      activeSummaries,
      expectedBlocks,
      expectedCode,
      isolatedResult.tokens,
      singleLane,
    ]
  );

  const finalizeAssistantMetrics = useCallback(
    (endedCleanly: boolean) => {
      const counters = countersRef.current;
      const byId = assistantBlockMetricsRef.current;
      const blocks = expectedBlocks.map((block, index) => {
        const blockId =
          STREAMING_ASSISTANT_MESSAGE_CORPUS_LIST.find(
            (corpus) => corpus.messageId === messageCorpusId
          )?.blocks[index]?.blockId ?? `block-${index}`;

        const existing = byId.get(blockId);
        if (existing) {
          return toStableAssistantBlock({
            ...existing,
            language: block.language || existing.language,
          });
        }

        return toStableAssistantBlock(
          createMutableAssistantBlock(
            blockId,
            block.language || 'plaintext'
          )
        );
      });

      const highlightTimes = blocks
        .map((block) => block.lastHighlightMs)
        .filter((value) => value > 0);
      const firstHighlightTimes = blocks
        .map((block) => block.firstHighlightMs)
        .filter((value) => value > 0);
      const mountTimes = blocks
        .map((block) => block.firstMountMs)
        .filter((value) => value > 0);

      const messageMetrics: AssistantMessageMetrics = {
        ...createEmptyAssistantMessageMetrics(),
        messageChunkCount: counters.messageChunkCount,
        messageTextChars: latestTranscriptRef.current.length,
        blockCount: expectedBlocks.length,
        maxMountedBlocks: counters.maxMountedBlocks,
        chatTreeActualRenderCommits: assistantProfilerCommitsRef.current,
        chatTreeActualDurationMs: assistantProfilerDurationRef.current,
        firstAnyTextMs: counters.firstAnyOutputMs,
        firstBlockMountMs:
          mountTimes.length > 0 ? Math.min(...mountTimes) : 0,
        firstHighlightedBlockMs:
          firstHighlightTimes.length > 0
            ? Math.min(...firstHighlightTimes)
            : 0,
        lastBlockMountMs:
          mountTimes.length > 0 ? Math.max(...mountTimes) : 0,
        lastHighlightedBlockMs:
          highlightTimes.length > 0 ? Math.max(...highlightTimes) : 0,
        messageCompleteToLastHighlightMs:
          highlightTimes.length > 0
            ? Math.max(
                0,
                Math.max(...highlightTimes) -
                  assistantCompleteAtMsRef.current
              )
            : 0,
      };

      const summary = summarizeAssistantMessageRun({
        scenarioId: scenario.id,
        message: messageMetrics,
        blocks,
      });

      setAssistantMessageMetrics(messageMetrics);
      setAssistantSummary(summary);

      const blockNodes = expectedBlocks.map((_, index) =>
        chatContainerRef.current?.querySelector<HTMLElement>(
          `[data-block-index="${index}"]`
        )
      );

      const renderedCode = blockNodes
        .map((node) => node?.textContent ?? '')
        .join('\n');

      const parityResults = expectedBlocks.map((_, index) => {
        const node = blockNodes[index];
        if (!node) {
          return {
            highlightPresencePass: false,
            strictStructuralMatch: false,
          };
        }

        if (assistantLane === 'plaintext-chat-tree') {
          return {
            highlightPresencePass: false,
            strictStructuralMatch: null,
          };
        }

        const hasHighlight =
          node.innerHTML.includes('style=') || node.innerHTML.includes('class=');

        return {
          highlightPresencePass: hasHighlight,
          strictStructuralMatch: null,
        };
      });

      const strict = parityResults
        .map((result) => result.strictStructuralMatch)
        .filter((value): value is boolean => value != null);

      const parity = {
        plainTextParity:
          renderedCode.replace(/\r\n?/g, '\n').trimEnd() ===
          expectedCode.replace(/\r\n?/g, '\n').trimEnd(),
        highlightPresencePass: parityResults.every(
          (result) => result.highlightPresencePass
        ),
        strictStructuralMatch:
          strict.length === 0 ? null : strict.every(Boolean),
      };

      setAssistantParity(parity);

      if (!parity.plainTextParity) {
        setIntegrityError('Plain-text parity failed for assistant message.');
      } else if (!parity.highlightPresencePass) {
        setIntegrityError('Highlight presence check failed for assistant message.');
      } else if (!endedCleanly) {
        setIntegrityError('Run stopped before message completion.');
      } else {
        setIntegrityError(null);
      }

      logAssistantMessageRunSummary(summary, {
        enabled: import.meta.env.DEV,
      });
    },
    [
      assistantLane,
      expectedBlocks,
      expectedCode,
      messageCorpusId,
      scenario.id,
    ]
  );

  const finalizeMetrics = useCallback(
    (endedCleanly: boolean) => {
      if (labFamily === 'assistant-message') {
        finalizeAssistantMetrics(endedCleanly);
        return;
      }

      finalizeSingleMetrics(endedCleanly);
    },
    [finalizeAssistantMetrics, finalizeSingleMetrics, labFamily]
  );

  const applyFrame = useCallback(
    (frame: ScenarioPlaybackFrame) => {
      const now = performance.now();
      const counters = countersRef.current;
      const nextCode = frame.frame.snapshot.codeBlocks[0] ?? '';
      const nextTranscript = frame.frame.snapshot.transcript;

      latestTranscriptRef.current = nextTranscript;

      setCursor(frame.index);
      setTranscript(nextTranscript);
      if (labFamily === 'single-block') {
        setCode(nextCode);
      }
      setIsComplete(frame.event.type === 'message-end');
      setStreamRevision((current) => current + 1);

      if (
        counters.firstAnyOutputMs === 0 &&
        nextTranscript.length > 0 &&
        counters.startedAtMs > 0
      ) {
        counters.firstAnyOutputMs = now - counters.startedAtMs;
      }

      if (isTranscriptMutationEvent(frame.event)) {
        counters.messageChunkCount += 1;

        const mountedBlocks = parseTranscriptNodes(nextTranscript).filter(
          (node) => node.type === 'code-block'
        ).length;
        counters.maxMountedBlocks = Math.max(
          counters.maxMountedBlocks,
          mountedBlocks
        );
      }

      if (labFamily === 'single-block' && isCodeMutationEvent(frame.event)) {
        counters.inputChunkCount += 1;
        counters.pendingChunkStartedAt.push(now);

        counters.processedChars += nextCode.startsWith(counters.lastCode)
          ? nextCode.length - counters.lastCode.length
          : nextCode.length;

        counters.lastCode = nextCode;
      }

      if (frame.event.type === 'message-end') {
        assistantCompleteAtMsRef.current =
          counters.startedAtMs > 0 ? now - counters.startedAtMs : 0;
      }
    },
    [labFamily]
  );

  const replay = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    countersRef.current = {
      ...createCounterState(),
      startedAtMs: performance.now(),
    };
    renderCommitCountRef.current = 0;
    latestTranscriptRef.current = '';
    isolatedSummariesRef.current = [];
    chatSummariesRef.current = new Map();
    assistantBlockMetricsRef.current = new Map();
    assistantCompleteAtMsRef.current = 0;
    assistantProfilerCommitsRef.current = 0;
    assistantProfilerDurationRef.current = 0;

    setRunStatus('running');
    setCursor(-1);
    setTranscript('');
    setCode('');
    setIsComplete(false);
    setIntegrityError(null);
    setStreamRevision(0);

    const result = await playScenarioEvents({
      events: scenario.events,
      stepDelayMs,
      getStepDelayMs: () => stepDelayMsRef.current,
      signal: controller.signal,
      onFrame: (frame) => {
        applyFrame(frame);
      },
    });

    if (result.cancelled) {
      setRunStatus('stopped');
      await flushUiCommits();
      finalizeMetrics(false);
      return;
    }

    setRunStatus('completed');
    await flushUiCommits();
    finalizeMetrics(true);
  }, [
    applyFrame,
    finalizeMetrics,
    flushUiCommits,
    scenario.events,
    stepDelayMs,
  ]);

  const stop = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setRunStatus('stopped');
    await flushUiCommits();
    finalizeMetrics(false);
  }, [finalizeMetrics, flushUiCommits]);

  const assistantBlockIds = useMemo(() => {
    const corpus = STREAMING_ASSISTANT_MESSAGE_CORPUS_LIST.find(
      (item) => item.messageId === messageCorpusId
    );
    return corpus?.blocks.map((block) => block.blockId) ?? [];
  }, [messageCorpusId]);

  const assistantTree = (
    <Profiler
      id="assistant-chat-tree"
      onRender={(_, __, actualDuration) => {
        assistantProfilerCommitsRef.current += 1;
        assistantProfilerDurationRef.current += actualDuration;
      }}
    >
      <AssistantChatTreeView
        transcript={transcript}
        lane={assistantLane}
        unstableOptions={freshOptions}
        blockIds={assistantBlockIds}
        onMetric={recordAssistantMetric}
      />
    </Profiler>
  );

  const singleTree = (
    <SingleChatTreeView
      transcript={transcript}
      freshOptionsNonce={freshOptions ? cursor : 0}
      remountSalt={remountChurn ? `step:${cursor}` : 'stable'}
      onSummary={(blockIndex, summary) => {
        const existing = chatSummariesRef.current.get(blockIndex) ?? [];
        existing.push(summary);
        chatSummariesRef.current.set(blockIndex, existing);
      }}
      onRenderCommit={recordRenderCommit}
    />
  );
  const autoScrollBehavior: ScrollBehavior =
    runStatus === 'running' && stepDelayMs > 24 ? 'smooth' : 'auto';

  return (
    <section className="streaming-page mx-auto w-full max-w-[1800px] px-4 pb-10 pt-6 text-slate-100">
      <header className="mb-6 rounded-2xl border border-cyan-400/20 bg-slate-950/55 p-5 shadow-[0_20px_40px_rgba(2,6,23,0.35)]">
        <h1 className="text-3xl font-semibold tracking-tight text-cyan-100">
          Streaming Chat Lab
        </h1>
        <p className="mt-2 max-w-4xl text-sm text-slate-300">
          Deterministic playback for single-block and assistant-message
          multi-block scenarios with transcript growth, chat-tree render
          pressure, and highlighting diagnostics.
        </p>
      </header>

      <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(250px,300px)_minmax(0,1fr)_minmax(320px,380px)]">
        <aside className="min-w-0 space-y-3 rounded-xl border border-slate-700/70 bg-slate-900/70 p-4 lg:sticky lg:top-6 lg:self-start">
          <label className="block text-xs uppercase text-slate-400">
            Lab Family
            <select
              value={labFamily}
              onChange={(event) => {
                const family = event.target.value as LabFamily;
                setLabFamily(family);
                ensureFamilyPreset(family);
                if (family === 'assistant-message') {
                  setSingleLane('chat');
                }
                resetPlaybackState();
              }}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1"
            >
              <option value="single-block">Single-block lab</option>
              <option value="assistant-message">Assistant-message lab</option>
            </select>
          </label>

          <label className="block text-xs uppercase text-slate-400">
            Scenario
            <select
              value={presetId}
              onChange={(event) => {
                setPresetId(event.target.value as ScenarioPresetId);
                resetPlaybackState();
              }}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1"
            >
              {availablePresets.map((preset: ScenarioPreset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>

          {labFamily === 'single-block' ? (
            <label className="block text-xs uppercase text-slate-400">
              Corpus
              <select
                value={corpusId}
                onChange={(event) => {
                  setCorpusId(event.target.value as CorpusId);
                  resetPlaybackState();
                }}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1"
              >
                {STREAMING_CORPUS_LIST.map((corpus) => (
                  <option key={corpus.id} value={corpus.id}>
                    {corpus.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="block text-xs uppercase text-slate-400">
              Message Corpus
              <select
                value={messageCorpusId}
                onChange={(event) => {
                  setMessageCorpusId(event.target.value as MessageCorpusId);
                  resetPlaybackState();
                }}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1"
              >
                {STREAMING_ASSISTANT_MESSAGE_CORPUS_LIST.map((corpus) => (
                  <option key={corpus.messageId} value={corpus.messageId}>
                    {corpus.title}
                  </option>
                ))}
              </select>
            </label>
          )}

          {labFamily === 'assistant-message' ? (
            <label className="block text-xs uppercase text-slate-400">
              Message repeat count ({messageRepeatCount}x)
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={messageRepeatCount}
                onChange={(event) => {
                  setMessageRepeatCount(Number(event.target.value));
                  resetPlaybackState();
                }}
                className="mt-1 w-full"
              />
              <span className="mt-1 block text-[11px] normal-case text-slate-400">
                Projected code blocks: {projectedAssistantBlocks}
              </span>
            </label>
          ) : null}

          {labFamily === 'single-block' ? (
            <label className="block text-xs uppercase text-slate-400">
              Lane
              <select
                value={singleLane}
                onChange={(event) => {
                  setSingleLane(event.target.value as SingleLane);
                  resetPlaybackState();
                }}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1"
              >
                <option value="isolated">Isolated code lane</option>
                <option value="chat">Transcript/chat lane</option>
              </select>
            </label>
          ) : (
            <label className="block text-xs uppercase text-slate-400">
              Chat Tree Lane
              <select
                value={assistantLane}
                onChange={(event) => {
                  setAssistantLane(event.target.value as AssistantLane);
                  resetPlaybackState();
                }}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1"
              >
                <option value="incremental-chat-tree">
                  incremental-chat-tree
                </option>
                <option value="static-chat-tree">static-chat-tree</option>
                <option value="plaintext-chat-tree">
                  plaintext-chat-tree
                </option>
              </select>
            </label>
          )}

          <label className="block text-xs uppercase text-slate-400">
            Step delay ({stepDelayMs} ms)
            <input
              type="range"
              min={0}
              max={60}
              step={1}
              value={stepDelayMs}
              onChange={(event) => {
                setStepDelayMs(Number(event.target.value));
              }}
              className="mt-1 w-full"
            />
          </label>

          <label className="block text-xs uppercase text-slate-400">
            Seed ({seed})
            <input
              type="range"
              min={1}
              max={500}
              step={1}
              value={seed}
              onChange={(event) => {
                setSeed(Number(event.target.value));
                resetPlaybackState();
              }}
              className="mt-1 w-full"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={strictMode}
              onChange={(event) => {
                setStrictMode(event.target.checked);
                resetPlaybackState();
              }}
            />
            StrictMode wrapper
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={freshOptions}
              onChange={(event) => {
                setFreshOptions(event.target.checked);
                resetPlaybackState();
              }}
            />
            Unstable options churn (explicit)
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={showTranscriptPanel}
              onChange={(event) => {
                setShowTranscriptPanel(event.target.checked);
              }}
            />
            Show transcript panel
          </label>

          {labFamily === 'single-block' ? (
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={remountChurn}
                onChange={(event) => {
                  setRemountChurn(event.target.checked);
                  resetPlaybackState();
                }}
              />
              Remount key churn
            </label>
          ) : null}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                void replay();
              }}
              disabled={runStatus === 'running'}
              className="rounded bg-emerald-500/80 px-3 py-1.5 text-sm"
            >
              Replay
            </button>
            <button
              type="button"
              onClick={stop}
              disabled={runStatus !== 'running'}
              className="rounded border border-slate-600 px-3 py-1.5 text-sm"
            >
              Stop
            </button>
            <button
              type="button"
              onClick={resetPlaybackState}
              className="rounded border border-slate-600 px-3 py-1.5 text-sm"
            >
              Reset
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Status: <span className="capitalize">{runStatus}</span> | event #
            {' '}
            {Math.max(0, cursor)}
          </p>
        </aside>

        <main className="min-w-0 space-y-4 rounded-xl border border-slate-700/70 bg-slate-950/60 p-4">
          {integrityError ? (
            <div className="rounded border border-rose-500/60 bg-rose-500/15 px-3 py-2 text-sm text-rose-100">
              {integrityError}
            </div>
          ) : null}

          <div
            className={
              showTranscriptPanel
                ? 'grid gap-3 lg:grid-cols-2'
                : 'grid gap-3'
            }
          >
            <StreamingContentPanel
              title="Rendered output"
              panelHeightClass={PANEL_VIEW_CLASS}
              autoScroll
              autoScrollSignal={streamRevision}
              forcePinned={runStatus === 'running'}
              autoScrollBehavior={autoScrollBehavior}
              panelRef={
                labFamily === 'single-block' && singleLane === 'isolated'
                  ? isolatedOutputRef
                  : chatContainerRef
              }
              panelInnerClassName={PANEL_OVERFLOW_CONTENT_CLASS}
            >
              {labFamily === 'single-block' && singleLane === 'isolated' ? (
                <ShikiTokenRenderer tokens={isolatedResult.tokens} />
              ) : null}

              {labFamily === 'single-block' && singleLane === 'chat' ? (
                strictMode ? <StrictMode>{singleTree}</StrictMode> : singleTree
              ) : null}

              {labFamily === 'assistant-message' ? (
                strictMode ? (
                  <StrictMode>{assistantTree}</StrictMode>
                ) : (
                  assistantTree
                )
              ) : null}
            </StreamingContentPanel>

            {showTranscriptPanel ? (
              <StreamingContentPanel
                title="Transcript"
                panelHeightClass={PANEL_VIEW_CLASS}
                panelRef={transcriptContainerRef}
                autoScroll
                autoScrollSignal={streamRevision}
                forcePinned={runStatus === 'running'}
                autoScrollBehavior={autoScrollBehavior}
                panelInnerClassName="w-full whitespace-pre-wrap break-words"
              >
                <pre className="w-full whitespace-pre-wrap break-words p-2 text-sm text-slate-200">
                  {transcript || 'No transcript yet.'}
                </pre>
              </StreamingContentPanel>
            ) : null}
          </div>

          <div className="hidden" ref={baselineContainerRef}>
            {baselineStatic}
          </div>
        </main>

        <aside className="min-w-0 space-y-4 rounded-xl border border-slate-700/70 bg-slate-900/70 p-4 text-sm">
          {labFamily === 'single-block' ? (
            <>
              <div>
                <p className="mb-1 text-xs uppercase text-slate-400">
                  Integrity
                </p>
                <p>
                  plain text parity:{' '}
                  {metrics.integrity.finalPlainTextMatchesBaseline
                    ? 'pass'
                    : 'fail'}
                </p>
                <p>
                  highlight presence:{' '}
                  {metrics.integrity.highlightPresencePass
                    ? 'pass'
                    : 'fail'}
                </p>
                <p>
                  strict structural:{' '}
                  {metrics.integrity
                    .finalStructuralHighlightMatchesBaseline == null
                    ? 'n/a'
                    : metrics.integrity
                          .finalStructuralHighlightMatchesBaseline
                      ? 'pass'
                      : 'fail'}
                </p>
              </div>

              <div>
                <p className="mb-1 text-xs uppercase text-slate-400">
                  Compute
                </p>
                <p>chunks: {metrics.compute.inputChunkCount}</p>
                <p>final chars: {metrics.compute.finalCodeChars}</p>
                <p>processed chars: {metrics.compute.processedChars}</p>
                <p>token events: {metrics.compute.tokenEvents}</p>
                <p>recall events: {metrics.compute.recallEvents}</p>
                <p>scheduled commits: {metrics.compute.scheduledCommits}</p>
                <p>render commits: {metrics.compute.actualRenderCommits}</p>
                <p>restarts: {metrics.compute.restartCount}</p>
                <p>work amp: {getWorkAmplification(metrics).toFixed(2)}x</p>
                <p>
                  commit amp: {metrics.compute.commitAmplification.toFixed(2)}x
                </p>
              </div>

              <div>
                <p className="mb-1 text-xs uppercase text-slate-400">UX</p>
                <p>
                  first any output:{' '}
                  {formatMs(metrics.ux.timeToFirstAnyOutputMs)}
                </p>
                <p>
                  first highlighted:{' '}
                  {formatMs(metrics.ux.timeToFirstHighlightedOutputMs)}
                </p>
                <p>
                  p50 chunk latency: {formatMs(metrics.ux.p50ChunkLatencyMs)}
                </p>
                <p>
                  p95 chunk latency: {formatMs(metrics.ux.p95ChunkLatencyMs)}
                </p>
                <p>
                  max chunk latency: {formatMs(metrics.ux.maxChunkLatencyMs)}
                </p>
                <p>session total: {formatMs(metrics.ux.sessionTotalMs)}</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="mb-1 text-xs uppercase text-slate-400">
                  Assistant Parity
                </p>
                <p>
                  plain text parity:{' '}
                  {assistantParity.plainTextParity ? 'pass' : 'fail'}
                </p>
                <p>
                  highlight presence:{' '}
                  {assistantParity.highlightPresencePass ? 'pass' : 'fail'}
                </p>
                <p>
                  strict structural:{' '}
                  {assistantParity.strictStructuralMatch == null
                    ? 'n/a'
                    : assistantParity.strictStructuralMatch
                      ? 'pass'
                      : 'fail'}
                </p>
              </div>

              <div>
                <p className="mb-1 text-xs uppercase text-slate-400">
                  Message Summary
                </p>
                <p>message chunks: {assistantMessageMetrics.messageChunkCount}</p>
                <p>message chars: {assistantMessageMetrics.messageTextChars}</p>
                <p>blocks: {assistantMessageMetrics.blockCount}</p>
                <p>max mounted blocks: {assistantMessageMetrics.maxMountedBlocks}</p>
                <p>
                  chat tree commits:{' '}
                  {assistantMessageMetrics.chatTreeActualRenderCommits}
                </p>
                <p>
                  chat tree duration:{' '}
                  {formatMs(assistantMessageMetrics.chatTreeActualDurationMs)}
                </p>
                <p>
                  first block mount:{' '}
                  {formatMs(assistantMessageMetrics.firstBlockMountMs)}
                </p>
                <p>
                  first highlighted block:{' '}
                  {formatMs(assistantMessageMetrics.firstHighlightedBlockMs)}
                </p>
                <p>
                  last highlighted block:{' '}
                  {formatMs(assistantMessageMetrics.lastHighlightedBlockMs)}
                </p>
                <p>
                  message complete to last highlight:{' '}
                  {formatMs(
                    assistantMessageMetrics.messageCompleteToLastHighlightMs
                  )}
                </p>
              </div>

              <div>
                <p className="mb-1 text-xs uppercase text-slate-400">
                  Per Block
                </p>
                <div className="max-h-[330px] overflow-auto rounded border border-slate-700/70">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-800/70 text-slate-300">
                      <tr>
                        <th className="px-2 py-1 text-left">block</th>
                        <th className="px-2 py-1 text-left">lang</th>
                        <th className="px-2 py-1 text-right">render</th>
                        <th className="px-2 py-1 text-right">code</th>
                        <th className="px-2 py-1 text-right">noop</th>
                        <th className="px-2 py-1 text-right">token work</th>
                        <th className="px-2 py-1 text-right">sessions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(assistantSummary?.blocks ?? []).map((block) => (
                        <tr
                          key={block.blockId}
                          className="border-t border-slate-700/60"
                        >
                          <td className="px-2 py-1">{block.blockId}</td>
                          <td className="px-2 py-1">{block.language}</td>
                          <td className="px-2 py-1 text-right">
                            {block.renderCount}
                          </td>
                          <td className="px-2 py-1 text-right">
                            {block.codeUpdateCount}
                          </td>
                          <td className="px-2 py-1 text-right">
                            {block.noopRenderCount}
                          </td>
                          <td className="px-2 py-1 text-right">
                            {block.tokenSpanWork}
                          </td>
                          <td className="px-2 py-1 text-right">
                            {block.sessionCount}/{block.restartCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
