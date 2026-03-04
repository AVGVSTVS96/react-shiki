import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ShikiStreamInput } from 'react-shiki';
import {
  ShikiTokenRenderer,
  useShikiHighlighter,
  useShikiStreamHighlighter,
} from 'react-shiki';

import {
  STREAMING_CORPUS_LIST,
  STREAMING_SCENARIO_PRESETS,
  buildScenarioFrames,
  buildSessionMetrics,
  calculateTextDiffCounts,
  createAsyncCodeIterableFromScenario,
  createEmptySessionMetrics,
  createReadableCodeStreamFromScenario,
  createStreamingScenario,
  extractFinalCode,
  getStreamingCorpus,
  getWorkAmplification,
  isCodeMutationEvent,
  playScenarioEvents,
  type CorpusId,
  type ScenarioPresetId,
  type ScenarioPlaybackFrame,
} from '@streaming-lab/index';

type RunStatus = 'idle' | 'running' | 'stopped' | 'completed';
type LabMode = 'static' | 'incremental' | 'split';
type SourceMode =
  | 'controlled-code'
  | 'readable-stream'
  | 'async-iterable'
  | 'markdown-chat';

type TimelineItem = {
  index: number;
  elapsedMs: number;
  type: string;
  codeChars: number;
  transcriptChars: number;
};

type SessionCounters = {
  startedAtMs: number;
  inputChunkCount: number;
  processedChars: number;
  highlightCalls: number;
  tokenizerEnqueues: number;
  recallEvents: number;
  recalledTokens: number;
  resyncCount: number;
  renderCommits: number;
  firstAnyOutputMs: number;
  firstHighlightedCodeMs: number;
  chunkLatenciesMs: number[];
  lastCode: string;
};

const formatMs = (value: number) => `${value.toFixed(2)} ms`;
const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-US').format(Math.round(value));

const createCounterState = (): SessionCounters => ({
  startedAtMs: 0,
  inputChunkCount: 0,
  processedChars: 0,
  highlightCalls: 0,
  tokenizerEnqueues: 0,
  recallEvents: 0,
  recalledTokens: 0,
  resyncCount: 0,
  renderCommits: 0,
  firstAnyOutputMs: 0,
  firstHighlightedCodeMs: 0,
  chunkLatenciesMs: [],
  lastCode: '',
});

const statusDot: Record<RunStatus, string> = {
  idle: 'bg-white/25',
  running: 'bg-emerald-400',
  stopped: 'bg-amber-400',
  completed: 'bg-blue-400',
};

export default function StreamingBenchmarkPage() {
  const [presetId, setPresetId] =
    useState<ScenarioPresetId>('openai-steady');
  const [corpusId, setCorpusId] = useState<CorpusId>('tsx-chat-ui');
  const [mode, setMode] = useState<LabMode>('incremental');
  const [source, setSource] = useState<SourceMode>('markdown-chat');
  const [runStatus, setRunStatus] = useState<RunStatus>('idle');
  const [tokenDelayMs, setTokenDelayMs] = useState(16);
  const [allowRecalls, setAllowRecalls] = useState(true);
  const [seed, setSeed] = useState(42);

  const scenario = useMemo(
    () =>
      createStreamingScenario({
        presetId,
        corpusId,
        seed,
      }),
    [presetId, corpusId, seed]
  );

  const frames = useMemo(
    () => buildScenarioFrames(scenario.events),
    [scenario.events]
  );

  const finalCode = useMemo(
    () => extractFinalCode(scenario.events),
    [scenario.events]
  );
  const language = getStreamingCorpus(corpusId).language;

  const [cursor, setCursor] = useState(-1);
  const [transcript, setTranscript] = useState('');
  const [code, setCode] = useState('');
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [metrics, setMetrics] = useState(createEmptySessionMetrics());
  const [exportPayload, setExportPayload] = useState('');

  const [streamInput, setStreamInput] = useState<ShikiStreamInput>({
    code: '',
  });

  const abortRef = useRef<AbortController | null>(null);
  const pendingChunkTimesRef = useRef<number[]>([]);
  const countersRef = useRef<SessionCounters>(createCounterState());
  const statusSequenceRef = useRef<string[]>([]);

  const resetCounters = useCallback(() => {
    countersRef.current = createCounterState();
    pendingChunkTimesRef.current = [];
    statusSequenceRef.current = [];
    setMetrics(createEmptySessionMetrics());
  }, []);

  const incrementalInput = useMemo<ShikiStreamInput>(() => {
    if (mode === 'static') {
      return { code: '' };
    }
    return streamInput;
  }, [mode, streamInput]);

  const incrementalResult = useShikiStreamHighlighter(
    incrementalInput,
    language,
    'github-dark',
    { allowRecalls }
  );

  const staticHighlighted = useShikiHighlighter(
    code,
    language,
    'github-dark'
  );

  const incrementalCodeText = useMemo(
    () => incrementalResult.tokens.map((token) => token.content).join(''),
    [incrementalResult.tokens]
  );

  const activeRenderedCode =
    mode === 'static' ? code : incrementalCodeText;

  const refreshMetrics = useCallback(
    (endedCleanly: boolean) => {
      const counters = countersRef.current;
      const now = performance.now();

      const statusSequence =
        mode === 'static'
          ? [
              'idle',
              runStatus === 'idle' ? 'idle' : 'streaming',
              runStatus === 'completed' ? 'done' : 'streaming',
            ]
          : statusSequenceRef.current.length > 0
            ? [...statusSequenceRef.current]
            : [incrementalResult.status];

      const sessionTotalMs =
        counters.startedAtMs > 0 ? now - counters.startedAtMs : 0;

      const nextMetrics = buildSessionMetrics({
        finalCode: activeRenderedCode,
        baselineCode: finalCode,
        inputChunkCount: counters.inputChunkCount,
        processedChars: counters.processedChars,
        highlightCalls: counters.highlightCalls,
        tokenizerEnqueues:
          source === 'readable-stream' || source === 'async-iterable'
            ? counters.inputChunkCount
            : counters.highlightCalls,
        recallEvents: counters.recallEvents,
        recalledTokens: counters.recalledTokens,
        resyncCount: counters.resyncCount,
        renderCommits: counters.renderCommits,
        chunkLatenciesMs: counters.chunkLatenciesMs,
        timeToFirstAnyOutputMs: counters.firstAnyOutputMs,
        timeToFirstHighlightedCodeMs: counters.firstHighlightedCodeMs,
        sessionTotalMs,
        statusSequence,
        endedCleanly,
      });

      setMetrics(nextMetrics);
    },
    [
      activeRenderedCode,
      finalCode,
      incrementalResult.status,
      mode,
      runStatus,
      source,
    ]
  );

  const appendTimeline = useCallback(
    (playbackFrame: ScenarioPlaybackFrame) => {
      const snapshot = playbackFrame.frame.snapshot;
      const item: TimelineItem = {
        index: playbackFrame.index,
        elapsedMs: playbackFrame.elapsedMs,
        type: playbackFrame.event.type,
        codeChars: snapshot.codeBlocks[0]?.length ?? 0,
        transcriptChars: snapshot.transcript.length,
      };

      setTimeline((prev) => {
        const next = [...prev, item];
        return next.slice(Math.max(0, next.length - 120));
      });
    },
    []
  );

  const applyPlaybackFrame = useCallback(
    (playbackFrame: ScenarioPlaybackFrame) => {
      const nextSnapshot = playbackFrame.frame.snapshot;
      const nextCode = nextSnapshot.codeBlocks[0] ?? '';
      const event = playbackFrame.event;
      const now = performance.now();
      const counters = countersRef.current;

      setCursor(playbackFrame.index);
      setTranscript(nextSnapshot.transcript);
      setCode(nextCode);

      const ended = event.type === 'message-end' || nextSnapshot.ended;

      if (source === 'controlled-code' || source === 'markdown-chat') {
        setStreamInput({ code: nextCode, isComplete: ended });
      }

      appendTimeline(playbackFrame);

      if (
        counters.firstAnyOutputMs === 0 &&
        nextSnapshot.transcript.length > 0 &&
        counters.startedAtMs > 0
      ) {
        counters.firstAnyOutputMs = now - counters.startedAtMs;
      }

      if (isCodeMutationEvent(event)) {
        counters.inputChunkCount += 1;
        counters.highlightCalls += 1;

        const appendDelta = nextCode.startsWith(counters.lastCode)
          ? nextCode.length - counters.lastCode.length
          : nextCode.length;

        if (!nextCode.startsWith(counters.lastCode)) {
          counters.resyncCount += 1;
        }

        counters.processedChars +=
          mode === 'static' ? nextCode.length : appendDelta;
        counters.lastCode = nextCode;

        pendingChunkTimesRef.current.push(now);
      }

      if (ended) {
        setRunStatus('completed');
      }
    },
    [appendTimeline, mode, source]
  );

  const resetSession = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;

    setRunStatus('idle');
    setCursor(-1);
    setTranscript('');
    setCode('');
    setTimeline([]);
    setStreamInput({ code: '' });
    resetCounters();
  }, [resetCounters]);

  const stopRun = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setRunStatus('stopped');
    refreshMetrics(false);
  }, [refreshMetrics]);

  const startRun = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    resetCounters();
    countersRef.current.startedAtMs = performance.now();

    setCursor(-1);
    setTranscript('');
    setCode('');
    setTimeline([]);
    setRunStatus('running');

    if (source === 'readable-stream') {
      setStreamInput({
        stream: createReadableCodeStreamFromScenario(scenario.events, {
          chunkDelayMs: tokenDelayMs,
        }),
      });
    } else if (source === 'async-iterable') {
      setStreamInput({
        chunks: createAsyncCodeIterableFromScenario(scenario.events, {
          chunkDelayMs: tokenDelayMs,
        }),
      });
    } else {
      setStreamInput({ code: '', isComplete: false });
    }

    const playback = await playScenarioEvents({
      events: scenario.events,
      stepDelayMs: tokenDelayMs,
      signal: controller.signal,
      onFrame: (frame) => {
        applyPlaybackFrame(frame);
      },
    });

    if (playback.cancelled) {
      setRunStatus('stopped');
      refreshMetrics(false);
      return;
    }

    setRunStatus('completed');
    refreshMetrics(true);
  }, [
    applyPlaybackFrame,
    refreshMetrics,
    resetCounters,
    scenario.events,
    source,
    tokenDelayMs,
  ]);

  const stepOnce = useCallback(() => {
    if (runStatus === 'running') return;
    const next = frames[cursor + 1];
    if (!next) return;

    if (countersRef.current.startedAtMs === 0) {
      resetCounters();
      countersRef.current.startedAtMs = performance.now();

      if (source === 'readable-stream' || source === 'async-iterable') {
        setSource('controlled-code');
      }

      setRunStatus('stopped');
      setStreamInput({ code: '', isComplete: false });
    }

    applyPlaybackFrame({
      index: next.index,
      elapsedMs: performance.now() - countersRef.current.startedAtMs,
      event: next.event,
      frame: next,
    });

    refreshMetrics(next.event.type === 'message-end');
  }, [
    applyPlaybackFrame,
    cursor,
    frames,
    refreshMetrics,
    resetCounters,
    runStatus,
    source,
  ]);

  useEffect(() => {
    if (!scenario.appendOnly) {
      setSource((current) =>
        current === 'readable-stream' || current === 'async-iterable'
          ? 'controlled-code'
          : current
      );
    }
  }, [scenario.appendOnly]);

  useEffect(() => {
    if (mode === 'static') return;

    const sequence = statusSequenceRef.current;
    if (sequence[sequence.length - 1] !== incrementalResult.status) {
      sequence.push(incrementalResult.status);
    }
  }, [incrementalResult.status, mode]);

  const staticCommitSignal = mode === 'static' ? staticHighlighted : null;

  useEffect(() => {
    if (runStatus !== 'running' && runStatus !== 'completed') return;

    const counters = countersRef.current;
    const now = performance.now();

    if (
      counters.firstHighlightedCodeMs === 0 &&
      activeRenderedCode.length > 0 &&
      counters.startedAtMs > 0
    ) {
      counters.firstHighlightedCodeMs = now - counters.startedAtMs;
    }

    const pending = pendingChunkTimesRef.current.shift();
    if (pending != null) {
      counters.chunkLatenciesMs.push(now - pending);
    }

    counters.renderCommits += 1;
    refreshMetrics(runStatus === 'completed');
  }, [activeRenderedCode, refreshMetrics, runStatus, staticCommitSignal]);

  const divergence = mode === 'split' && code !== incrementalCodeText;
  const diff = calculateTextDiffCounts(finalCode, activeRenderedCode);
  const workAmplification = getWorkAmplification(metrics);

  const exportSession = useCallback(() => {
    const payload = {
      corpusId,
      presetId,
      seed,
      mode,
      source,
      tokenDelayMs,
      allowRecalls,
      events: scenario.events,
    };

    setExportPayload(JSON.stringify(payload, null, 2));
  }, [
    allowRecalls,
    corpusId,
    mode,
    presetId,
    scenario.events,
    seed,
    source,
    tokenDelayMs,
  ]);

  return (
    <section className="streaming-page mx-auto w-full max-w-[1400px] px-4 pb-10 pt-6 text-slate-100">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          Streaming Chat Lab
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
          Deterministic scenario playback for validating streaming
          correctness, work amplification, and user-perceived latency. Use
          the same scenarios in tests, benches, and this playground view.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr_340px]">
        <aside className="space-y-4 rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
              Scenario
            </label>
            <select
              value={presetId}
              onChange={(event) => {
                setPresetId(event.target.value as ScenarioPresetId);
                resetSession();
              }}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
            >
              {STREAMING_SCENARIO_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
              Corpus
            </label>
            <select
              value={corpusId}
              onChange={(event) => {
                setCorpusId(event.target.value as CorpusId);
                resetSession();
              }}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
            >
              {STREAMING_CORPUS_LIST.map((corpus) => (
                <option key={corpus.id} value={corpus.id}>
                  {corpus.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
              Mode
            </label>
            <select
              value={mode}
              onChange={(event) => {
                setMode(event.target.value as LabMode);
                resetSession();
              }}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
            >
              <option value="static">Static</option>
              <option value="incremental">Incremental</option>
              <option value="split">Split</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
              Source
            </label>
            <select
              value={source}
              onChange={(event) => {
                setSource(event.target.value as SourceMode);
                resetSession();
              }}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
            >
              <option value="controlled-code">Controlled code</option>
              <option value="markdown-chat">Markdown chat</option>
              <option
                value="readable-stream"
                disabled={!scenario.appendOnly}
              >
                ReadableStream
              </option>
              <option
                value="async-iterable"
                disabled={!scenario.appendOnly}
              >
                AsyncIterable
              </option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
              Step delay ({tokenDelayMs} ms)
            </label>
            <input
              type="range"
              min={0}
              max={80}
              step={1}
              value={tokenDelayMs}
              onChange={(event) => {
                setTokenDelayMs(Number(event.target.value));
              }}
              className="w-full"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
              Seed ({seed})
            </label>
            <input
              type="range"
              min={1}
              max={999}
              step={1}
              value={seed}
              onChange={(event) => {
                setSeed(Number(event.target.value));
                resetSession();
              }}
              className="w-full"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={allowRecalls}
              onChange={(event) => {
                setAllowRecalls(event.target.checked);
                resetSession();
              }}
            />
            allowRecalls
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void startRun();
              }}
              className="rounded-md bg-emerald-500/80 px-3 py-1.5 text-sm font-medium text-emerald-50 hover:bg-emerald-500"
              disabled={runStatus === 'running'}
            >
              Replay
            </button>
            <button
              type="button"
              onClick={stopRun}
              className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700"
              disabled={runStatus !== 'running'}
            >
              Stop
            </button>
            <button
              type="button"
              onClick={stepOnce}
              className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700"
            >
              Step
            </button>
            <button
              type="button"
              onClick={resetSession}
              className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700"
            >
              Reset
            </button>
          </div>

          <button
            type="button"
            onClick={exportSession}
            className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700"
          >
            Export JSON session
          </button>

          <div className="flex items-center gap-2 pt-2 text-xs text-slate-300">
            <span
              className={`h-2 w-2 rounded-full ${statusDot[runStatus]} ${runStatus === 'running' ? 'animate-pulse' : ''}`}
            />
            <span className="capitalize">{runStatus}</span>
            <span className="text-slate-500">
              event #{Math.max(0, cursor)}
            </span>
          </div>
        </aside>

        <main className="space-y-4 rounded-2xl border border-slate-700/70 bg-slate-950/50 p-4">
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/80 p-3">
            <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">
              Transcript
            </p>
            <pre className="max-h-60 overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
              {transcript ||
                'No transcript yet. Start or step the scenario.'}
            </pre>
          </div>

          {divergence ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              Output divergence detected between static and incremental
              rendering.
            </div>
          ) : null}

          <div className="rounded-xl border border-slate-700/60 bg-slate-900/80 p-3">
            <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">
              Highlighted output ({language})
            </p>

            {mode === 'static' ? (
              <div className="max-h-[520px] overflow-auto rounded-lg bg-black/40 p-3 text-sm">
                {staticHighlighted}
              </div>
            ) : null}

            {mode === 'incremental' ? (
              <pre className="max-h-[520px] overflow-auto rounded-lg bg-black/40 p-3 text-sm">
                <ShikiTokenRenderer tokens={incrementalResult.tokens} />
              </pre>
            ) : null}

            {mode === 'split' ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs text-slate-400">Static</p>
                  <div className="max-h-[520px] overflow-auto rounded-lg bg-black/40 p-3 text-sm">
                    {staticHighlighted}
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs text-slate-400">
                    Incremental
                  </p>
                  <pre className="max-h-[520px] overflow-auto rounded-lg bg-black/40 p-3 text-sm">
                    <ShikiTokenRenderer
                      tokens={incrementalResult.tokens}
                    />
                  </pre>
                </div>
              </div>
            ) : null}
          </div>

          {exportPayload ? (
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/80 p-3">
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">
                Session JSON
              </p>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs text-slate-200">
                {exportPayload}
              </pre>
            </div>
          ) : null}
        </main>

        <aside className="space-y-4 rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4">
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">
              Integrity
            </p>
            <div className="space-y-1 text-sm text-slate-200">
              <p>
                parity:{' '}
                {metrics.integrity.finalPlainTextMatchesBaseline
                  ? 'pass'
                  : 'fail'}
              </p>
              <p>
                duplicate chars: {formatNumber(diff.duplicateCharCount)}
              </p>
              <p>missing chars: {formatNumber(diff.missingCharCount)}</p>
              <p>
                ended cleanly:{' '}
                {metrics.integrity.endedCleanly ? 'yes' : 'no'}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">
              Compute
            </p>
            <div className="space-y-1 text-sm text-slate-200">
              <p>
                final chars:{' '}
                {formatNumber(metrics.compute.finalCodeChars)}
              </p>
              <p>
                input chunks:{' '}
                {formatNumber(metrics.compute.inputChunkCount)}
              </p>
              <p>
                processed chars:{' '}
                {formatNumber(metrics.compute.processedChars)}
              </p>
              <p>
                highlight calls:{' '}
                {formatNumber(metrics.compute.highlightCalls)}
              </p>
              <p>
                render commits:{' '}
                {formatNumber(metrics.compute.renderCommits)}
              </p>
              <p>work amp: {workAmplification.toFixed(2)}x</p>
              <p>
                resync count: {formatNumber(metrics.compute.resyncCount)}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">
              UX
            </p>
            <div className="space-y-1 text-sm text-slate-200">
              <p>
                first any output:{' '}
                {formatMs(metrics.ux.timeToFirstAnyOutputMs)}
              </p>
              <p>
                first highlighted:{' '}
                {formatMs(metrics.ux.timeToFirstHighlightedCodeMs)}
              </p>
              <p>
                p50 chunk latency:{' '}
                {formatMs(metrics.ux.p50ChunkLatencyMs)}
              </p>
              <p>
                p95 chunk latency:{' '}
                {formatMs(metrics.ux.p95ChunkLatencyMs)}
              </p>
              <p>
                max chunk latency:{' '}
                {formatMs(metrics.ux.maxChunkLatencyMs)}
              </p>
              <p>session total: {formatMs(metrics.ux.sessionTotalMs)}</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">
              Event timeline
            </p>
            <div className="max-h-72 space-y-1 overflow-auto rounded-lg border border-slate-700/60 bg-slate-950/70 p-2">
              {timeline.length === 0 ? (
                <p className="text-xs text-slate-500">No events yet.</p>
              ) : (
                timeline.map((item) => (
                  <div
                    key={`${item.index}:${item.type}:${item.elapsedMs}`}
                    className="rounded bg-slate-900/80 px-2 py-1 text-xs text-slate-300"
                  >
                    <span className="font-mono text-slate-400">
                      #{item.index}
                    </span>{' '}
                    {item.type} - {item.elapsedMs.toFixed(1)} ms - code{' '}
                    {item.codeChars} - text {item.transcriptChars}
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
