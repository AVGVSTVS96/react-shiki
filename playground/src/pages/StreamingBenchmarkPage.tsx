import {
  StrictMode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ShikiTokenRenderer,
  useShikiHighlighter,
  useShikiStreamHighlighter,
  type StreamSessionSummary,
} from 'react-shiki';

import {
  STREAMING_CORPUS_LIST,
  STREAMING_SCENARIO_PRESETS,
  buildMarkdownStates,
  buildSessionMetrics,
  compareStructuralHighlight,
  createEmptySessionMetrics,
  createStreamingScenario,
  extractFencedCodeBlocks,
  getStreamingCorpus,
  getWorkAmplification,
  isCodeMutationEvent,
  parseTranscriptNodes,
  playScenarioEvents,
  type CorpusId,
  type ScenarioPlaybackFrame,
  type ScenarioPresetId,
} from '@streaming-lab/index';

type LabMode = 'isolated' | 'chat';
type RunStatus = 'idle' | 'running' | 'stopped' | 'completed';

type CounterState = {
  startedAtMs: number;
  inputChunkCount: number;
  processedChars: number;
  chunkLatenciesMs: number[];
  pendingChunkStartedAt: number[];
  firstAnyOutputMs: number;
  firstHighlightedOutputMs: number;
  lastCode: string;
};

const createCounterState = (): CounterState => ({
  startedAtMs: 0,
  inputChunkCount: 0,
  processedChars: 0,
  chunkLatenciesMs: [],
  pendingChunkStartedAt: [],
  firstAnyOutputMs: 0,
  firstHighlightedOutputMs: 0,
  lastCode: '',
});

const formatMs = (value: number) => `${value.toFixed(2)} ms`;

const ChatCodeBlock = ({
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
  const result = useShikiStreamHighlighter(
    { code, isComplete },
    language || 'plaintext',
    'github-dark',
    {
      allowRecalls: true,
      onSessionSummary: (summary) => {
        if (freshOptionsNonce >= 0) {
          onSummary(summary);
        }
      },
    }
  );

  useEffect(() => {
    onRenderCommit();
  }, [onRenderCommit, result.tokens]);

  return (
    <div
      className="whitespace-pre rounded border border-slate-700/70 bg-black/50 p-2"
      data-chat-block
      data-block-index={blockIndex}
      data-language={language || 'plaintext'}
      data-status={result.status}
    >
      <ShikiTokenRenderer tokens={result.tokens} />
    </div>
  );
};

const ChatTreeView = ({
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
      {nodes.map((node) => {
        if (node.type === 'text') {
          return (
            <span
              key={`text:${node.value}`}
              className="whitespace-pre-wrap"
            >
              {node.value}
            </span>
          );
        }

        if (node.type === 'inline-code') {
          return (
            <code
              key={`inline:${node.value}`}
              className="rounded bg-slate-800/80 px-1 py-0.5"
            >
              {node.value}
            </code>
          );
        }

        return (
          <ChatCodeBlock
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

export default function StreamingBenchmarkPage() {
  const [presetId, setPresetId] =
    useState<ScenarioPresetId>('openai-steady');
  const [corpusId, setCorpusId] = useState<CorpusId>('tsx-chat-ui');
  const [mode, setMode] = useState<LabMode>('isolated');
  const [seed, setSeed] = useState(42);
  const [stepDelayMs, setStepDelayMs] = useState(12);
  const [strictMode, setStrictMode] = useState(false);
  const [remountChurn, setRemountChurn] = useState(false);
  const [freshOptions, setFreshOptions] = useState(false);
  const [runStatus, setRunStatus] = useState<RunStatus>('idle');

  const scenario = useMemo(
    () =>
      createStreamingScenario({
        presetId,
        corpusId,
        seed,
      }),
    [corpusId, presetId, seed]
  );

  const language = getStreamingCorpus(corpusId).language;
  const markdownStates = useMemo(
    () => buildMarkdownStates(scenario.events),
    [scenario.events]
  );
  const expectedBlocks = useMemo(
    () =>
      extractFencedCodeBlocks(
        markdownStates[markdownStates.length - 1] ?? ''
      ),
    [markdownStates]
  );

  const [cursor, setCursor] = useState(-1);
  const [transcript, setTranscript] = useState('');
  const [code, setCode] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [metrics, setMetrics] = useState(createEmptySessionMetrics());
  const [integrityError, setIntegrityError] = useState<string | null>(
    null
  );

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
  const baselineContainerRef = useRef<HTMLDivElement | null>(null);

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
    mode === 'isolated'
      ? isolatedSummariesRef.current
      : [...chatSummariesRef.current.values()].flat();

  const recordRenderCommit = useCallback(() => {
    renderCommitCountRef.current += 1;
    const counters = countersRef.current;
    const now = performance.now();

    if (
      counters.firstHighlightedOutputMs === 0 &&
      counters.startedAtMs > 0 &&
      (mode === 'isolated'
        ? (isolatedOutputRef.current?.textContent ?? '').length > 0
        : (chatContainerRef.current?.textContent ?? '').length > 0)
    ) {
      counters.firstHighlightedOutputMs = now - counters.startedAtMs;
    }

    const pending = counters.pendingChunkStartedAt.shift();
    if (pending != null) {
      counters.chunkLatenciesMs.push(now - pending);
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== 'isolated') return;
    recordRenderCommit();
  }, [mode, recordRenderCommit, isolatedResult.tokens]);

  const resetPlaybackState = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    countersRef.current = createCounterState();
    renderCommitCountRef.current = 0;
    latestTranscriptRef.current = '';
    isolatedSummariesRef.current = [];
    chatSummariesRef.current = new Map();
    setRunStatus('idle');
    setCursor(-1);
    setTranscript('');
    setCode('');
    setIsComplete(false);
    setMetrics(createEmptySessionMetrics());
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

  const finalizeMetrics = useCallback(
    (endedCleanly: boolean) => {
      const counters = countersRef.current;
      const now = performance.now();
      const sessionTotalMs =
        counters.startedAtMs > 0 ? now - counters.startedAtMs : 0;

      const finalTranscript = latestTranscriptRef.current;
      const finalBlocks = extractFencedCodeBlocks(finalTranscript);
      const expectedCode = expectedBlocks
        .map((block) => block.code)
        .join('\n');

      const finalCode =
        mode === 'isolated'
          ? isolatedResult.tokens.map((token) => token.content).join('')
          : finalBlocks.map((block) => block.code).join('\n');

      const finalRenderedHtml =
        mode === 'isolated'
          ? (isolatedOutputRef.current?.innerHTML ?? '')
          : Array.from(
              chatContainerRef.current?.querySelectorAll(
                '[data-chat-block]'
              ) ?? []
            )
              .map((node) => node.innerHTML)
              .join('');

      const baselineHtml =
        mode === 'isolated'
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

      if (mode === 'isolated') {
        const structure = compareStructuralHighlight(
          finalRenderedHtml,
          baselineHtml ?? ''
        );
        if (structure.looksPlainTextFallback) {
          setIntegrityError(
            'Structural highlight mismatch detected (plain-text fallback).'
          );
          return;
        }
      } else {
        const blocks = Array.from(
          chatContainerRef.current?.querySelectorAll(
            '[data-chat-block]'
          ) ?? []
        );
        const lostHighlight = blocks.some((node) => {
          return (
            !node.innerHTML.includes('style=') &&
            !node.innerHTML.includes('class=')
          );
        });

        if (lostHighlight) {
          setIntegrityError(
            'At least one transcript block appears unhighlighted.'
          );
          return;
        }
      }

      setIntegrityError(null);
    },
    [
      activeSummaries,
      expectedBlocks,
      isolatedResult.tokens,
      latestTranscriptRef,
      mode,
    ]
  );

  const applyFrame = useCallback((frame: ScenarioPlaybackFrame) => {
    const now = performance.now();
    const counters = countersRef.current;
    const nextCode = frame.frame.snapshot.codeBlocks[0] ?? '';
    const nextTranscript = frame.frame.snapshot.transcript;

    latestTranscriptRef.current = nextTranscript;

    setCursor(frame.index);
    setTranscript(nextTranscript);
    setCode(nextCode);
    setIsComplete(frame.event.type === 'message-end');

    if (
      counters.firstAnyOutputMs === 0 &&
      nextTranscript.length > 0 &&
      counters.startedAtMs > 0
    ) {
      counters.firstAnyOutputMs = now - counters.startedAtMs;
    }

    if (isCodeMutationEvent(frame.event)) {
      counters.inputChunkCount += 1;
      counters.pendingChunkStartedAt.push(now);

      counters.processedChars += nextCode.startsWith(counters.lastCode)
        ? nextCode.length - counters.lastCode.length
        : nextCode.length;

      counters.lastCode = nextCode;
    }
  }, []);

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

    setRunStatus('running');
    setCursor(-1);
    setTranscript('');
    setCode('');
    setIsComplete(false);
    setIntegrityError(null);

    const result = await playScenarioEvents({
      events: scenario.events,
      stepDelayMs,
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

  const chatTree = (
    <ChatTreeView
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

  return (
    <section className="mx-auto w-full max-w-[1300px] px-4 pb-10 pt-6 text-slate-100">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          Streaming Chat Lab
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Transcript-driven playback with live commit pressure and
          integrity diagnostics. Use isolated mode for fast hook checks
          and chat mode for markdown tree behavior.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[290px_1fr_340px]">
        <aside className="space-y-3 rounded-xl border border-slate-700/70 bg-slate-900/70 p-4">
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
              {STREAMING_SCENARIO_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>

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

          <label className="block text-xs uppercase text-slate-400">
            Lane
            <select
              value={mode}
              onChange={(event) => {
                setMode(event.target.value as LabMode);
                resetPlaybackState();
              }}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1"
            >
              <option value="isolated">Isolated code lane</option>
              <option value="chat">Transcript/chat lane</option>
            </select>
          </label>

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
            Fresh options churn
          </label>
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
            Status: <span className="capitalize">{runStatus}</span> |
            event # {Math.max(0, cursor)}
          </p>
        </aside>

        <main className="space-y-4 rounded-xl border border-slate-700/70 bg-slate-950/60 p-4">
          {integrityError ? (
            <div className="rounded border border-rose-500/60 bg-rose-500/15 px-3 py-2 text-sm text-rose-100">
              {integrityError}
            </div>
          ) : null}

          <div className="rounded border border-slate-700/70 bg-slate-900/80 p-3">
            <p className="mb-2 text-xs uppercase text-slate-400">
              Transcript
            </p>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-sm text-slate-200">
              {transcript || 'No transcript yet.'}
            </pre>
          </div>

          <div className="rounded border border-slate-700/70 bg-slate-900/80 p-3">
            <p className="mb-2 text-xs uppercase text-slate-400">
              Rendered output ({mode})
            </p>

            {mode === 'isolated' ? (
              <div
                ref={isolatedOutputRef}
                className="max-h-[520px] overflow-auto whitespace-pre"
              >
                <ShikiTokenRenderer tokens={isolatedResult.tokens} />
              </div>
            ) : null}

            {mode === 'chat' ? (
              <div
                ref={chatContainerRef}
                className="max-h-[520px] overflow-auto"
              >
                {strictMode ? (
                  <StrictMode>{chatTree}</StrictMode>
                ) : (
                  chatTree
                )}
              </div>
            ) : null}
          </div>

          <div className="hidden" ref={baselineContainerRef}>
            {baselineStatic}
          </div>
        </main>

        <aside className="space-y-4 rounded-xl border border-slate-700/70 bg-slate-900/70 p-4 text-sm">
          <div>
            <p className="mb-1 text-xs uppercase text-slate-400">
              Integrity
            </p>
            <p>
              plain parity:{' '}
              {metrics.integrity.finalPlainTextMatchesBaseline
                ? 'pass'
                : 'fail'}
            </p>
            <p>
              structural:{' '}
              {metrics.integrity
                .finalStructuralHighlightMatchesBaseline == null
                ? 'n/a'
                : metrics.integrity
                      .finalStructuralHighlightMatchesBaseline
                  ? 'pass'
                  : 'fail'}
            </p>
            <p>
              plain-text fallback:{' '}
              {metrics.integrity.looksPlainTextFallback ? 'yes' : 'no'}
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
              commit amp: {metrics.compute.commitAmplification.toFixed(2)}
              x
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
        </aside>
      </div>
    </section>
  );
}
