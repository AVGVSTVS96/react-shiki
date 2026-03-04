import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShikiHighlighter } from 'react-shiki';
import type { ReactNode } from 'react';

import {
  STREAMING_TARGET_TOKENS,
  buildProgressiveStates,
  buildStreamingMetrics,
  createEmptyMetrics,
  createTokenChunks,
  wait,
} from '../lib/streamingBenchmark';
import { STREAMING_BENCHMARK_SAMPLE } from '../lib/streamingSample';

type RunStatus = 'idle' | 'running' | 'stopped' | 'completed';

const formatMs = (value: number) => `${value.toFixed(2)} ms`;
const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-US').format(Math.round(value));

const statusTone: Record<RunStatus, string> = {
  idle: 'bg-slate-700/60 text-slate-200',
  running: 'bg-emerald-700/50 text-emerald-100',
  stopped: 'bg-amber-700/50 text-amber-100',
  completed: 'bg-sky-700/50 text-sky-100',
};

export default function StreamingBenchmarkPage() {
  const progressiveStates = useMemo(
    () =>
      buildProgressiveStates(
        createTokenChunks(STREAMING_BENCHMARK_SAMPLE, STREAMING_TARGET_TOKENS)
      ),
    []
  );

  const [code, setCode] = useState('');
  const [status, setStatus] = useState<RunStatus>('idle');
  const [tokenDelayMs, setTokenDelayMs] = useState(20);
  const [metrics, setMetrics] = useState(
    createEmptyMetrics(progressiveStates.length)
  );

  const runIdRef = useRef(0);
  const pendingResolveRef = useRef<((durationMs: number) => void) | null>(
    null
  );
  const tokenStartRef = useRef<number>(0);
  const isStreamingRef = useRef(false);

  const highlighted = useShikiHighlighter(code, 'tsx', 'github-dark');

  const waitForHighlightCommit = useCallback(() => {
    return new Promise<number>((resolve) => {
      pendingResolveRef.current = resolve;
    });
  }, []);

  useEffect(() => {
    if (!isStreamingRef.current) return;
    if (!pendingResolveRef.current) return;

    const elapsed = performance.now() - tokenStartRef.current;
    const resolve = pendingResolveRef.current;
    pendingResolveRef.current = null;
    resolve(elapsed);
  }, [highlighted]);

  const stopRun = useCallback((nextStatus: RunStatus = 'stopped') => {
    runIdRef.current += 1;
    isStreamingRef.current = false;
    if (pendingResolveRef.current) {
      const resolve = pendingResolveRef.current;
      pendingResolveRef.current = null;
      resolve(0);
    }
    setStatus(nextStatus);
  }, []);

  const reset = useCallback(() => {
    stopRun('idle');
    setCode('');
    setMetrics(createEmptyMetrics(progressiveStates.length));
  }, [progressiveStates.length, stopRun]);

  const startRun = useCallback(async () => {
    if (status === 'running') return;

    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    isStreamingRef.current = true;
    setStatus('running');
    setCode('');
    setMetrics(createEmptyMetrics(progressiveStates.length));

    const tokenDurationsMs: number[] = [];
    const codeLengths: number[] = [];

    for (let i = 0; i < progressiveStates.length; i += 1) {
      if (runId !== runIdRef.current) return;

      const next = progressiveStates[i];
      const waitForCommit = waitForHighlightCommit();
      tokenStartRef.current = performance.now();
      setCode(next);

      const elapsed = await waitForCommit;
      if (runId !== runIdRef.current) return;

      tokenDurationsMs.push(elapsed);
      codeLengths.push(next.length);

      setMetrics(
        buildStreamingMetrics({
          tokenDurationsMs,
          codeLengths,
          finalCodeLength: progressiveStates[progressiveStates.length - 1].length,
          tokenTarget: progressiveStates.length,
        })
      );

      if (tokenDelayMs > 0) {
        await wait(tokenDelayMs);
      }
    }

    isStreamingRef.current = false;
    setStatus('completed');
  }, [progressiveStates, status, tokenDelayMs, waitForHighlightCommit]);

  useEffect(() => {
    return () => {
      stopRun('stopped');
    };
  }, [stopRun]);

  const renderNode = highlighted as ReactNode;

  return (
    <section className="w-full max-w-6xl px-4 pb-8 pt-6">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-100">
          Streaming Benchmark
        </h1>
        <p className="mt-2 text-slate-300">
          Single scenario demo: sequential token streaming of a 500-step code
          block highlight session.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void startRun()}
          disabled={status === 'running'}
          className="rounded-md border border-emerald-400/40 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Start
        </button>
        <button
          type="button"
          onClick={() => stopRun()}
          disabled={status !== 'running'}
          className="rounded-md border border-amber-400/40 bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Stop
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-slate-500/40 bg-slate-600/20 px-4 py-2 text-sm font-medium text-slate-100"
        >
          Reset
        </button>

        <label className="ml-3 flex items-center gap-2 text-sm text-slate-200">
          Token delay
          <input
            type="range"
            min={0}
            max={80}
            step={1}
            value={tokenDelayMs}
            onChange={(event) => {
              setTokenDelayMs(Number(event.target.value));
            }}
            className="accent-sky-400"
          />
          <span className="w-12 text-right tabular-nums">{tokenDelayMs}ms</span>
        </label>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusTone[status]}`}
        >
          {status}
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/70 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">
            Live highlighted stream
          </h2>
          <div className="max-h-[640px] overflow-auto rounded-md border border-slate-700/70 bg-slate-950 p-3">
            {renderNode}
          </div>
        </div>

        <aside className="space-y-3">
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">
              Quantification
            </h2>
            <ul className="space-y-2 text-sm text-slate-100">
              <li className="flex items-center justify-between gap-4">
                <span className="text-slate-300">Tokens processed</span>
                <strong className="tabular-nums">
                  {metrics.tokensProcessed} / {metrics.tokenTarget}
                </strong>
              </li>
              <li className="flex items-center justify-between gap-4">
                <span className="text-slate-300">Highlight calls</span>
                <strong className="tabular-nums">
                  {formatNumber(metrics.highlightCalls)}
                </strong>
              </li>
              <li className="flex items-center justify-between gap-4">
                <span className="text-slate-300">Chars processed</span>
                <strong className="tabular-nums">
                  {formatNumber(metrics.totalCharsProcessed)}
                </strong>
              </li>
              <li className="flex items-center justify-between gap-4">
                <span className="text-slate-300">Work amplification</span>
                <strong className="tabular-nums">
                  {metrics.workAmplification.toFixed(2)}x
                </strong>
              </li>
              <li className="flex items-center justify-between gap-4">
                <span className="text-slate-300">Total time</span>
                <strong className="tabular-nums">
                  {formatMs(metrics.totalTimeMs)}
                </strong>
              </li>
              <li className="flex items-center justify-between gap-4">
                <span className="text-slate-300">Avg/token</span>
                <strong className="tabular-nums">
                  {formatMs(metrics.avgPerTokenMs)}
                </strong>
              </li>
              <li className="flex items-center justify-between gap-4">
                <span className="text-slate-300">P95/token</span>
                <strong className="tabular-nums">
                  {formatMs(metrics.p95PerTokenMs)}
                </strong>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-4 text-sm text-slate-300">
            <p>
              This page currently demonstrates full rehighlight on each streamed
              token (quadratic total work growth).
            </p>
            <p className="mt-2">
              When <code>shiki-stream</code> is integrated, this same page can
              expose a direct mode toggle and show the delta in real time.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

