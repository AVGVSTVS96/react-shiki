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
const formatCompact = (value: number) =>
  new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

const statusDot: Record<RunStatus, string> = {
  idle: 'bg-white/25',
  running: 'bg-emerald-400',
  stopped: 'bg-amber-400',
  completed: 'bg-blue-400',
};

const impactTone = (amplification: number) => {
  if (amplification >= 200) return 'text-red-400';
  if (amplification >= 80) return 'text-amber-400';
  return 'text-emerald-400';
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
  const extraWork =
    metrics.workAmplification > 1 ? metrics.workAmplification - 1 : 0;
  const finalCodeLength =
    progressiveStates[progressiveStates.length - 1]?.length ?? 0;
  const avgCharsPerToken =
    metrics.tokensProcessed > 0
      ? metrics.totalCharsProcessed / metrics.tokensProcessed
      : 0;

  const metricRows = [
    { label: 'Progress', value: `${metrics.tokensProcessed} / ${metrics.tokenTarget}` },
    { label: 'Highlight calls', value: formatNumber(metrics.highlightCalls) },
    { label: 'Avg chars / pass', value: formatNumber(avgCharsPerToken) },
    { label: 'Extra work', value: `${formatNumber(extraWork * finalCodeLength)} chars` },
    { label: 'Total processed', value: `${formatNumber(metrics.totalCharsProcessed)} chars` },
    { label: 'Cost multiplier', value: `${metrics.workAmplification.toFixed(2)}\u00d7` },
    { label: 'Highlight cost', value: formatMs(metrics.totalTimeMs) },
    { label: 'Avg latency', value: formatMs(metrics.avgPerTokenMs) },
    { label: 'P95 latency', value: formatMs(metrics.p95PerTokenMs) },
  ];

  return (
    <section className="streaming-page relative mx-auto w-full max-w-5xl px-4 pb-12 pt-4">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-blue-500/[0.04] blur-[120px]" />

      {/* Header */}
      <header className="relative mb-10">
        <h1 className="text-[2.5rem] font-semibold leading-[1.1] tracking-tight text-white">
          Streaming Performance
        </h1>
        <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-white/45">
          Measures the cost of re-highlighting on every token during a simulated
          streaming response. Watch total work grow in real time.
        </p>
      </header>

      {/* Controls */}
      <div className="relative mb-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void startRun()}
          disabled={status === 'running'}
          className="rounded-xl bg-white px-5 py-2 text-[0.8125rem] font-semibold text-black/90 shadow-sm transition-all hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Start
        </button>
        <button
          type="button"
          onClick={() => stopRun()}
          disabled={status !== 'running'}
          className="rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2 text-[0.8125rem] font-medium text-white/60 transition-all hover:bg-white/[0.1] hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/15 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-30"
        >
          Stop
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2 text-[0.8125rem] font-medium text-white/60 transition-all hover:bg-white/[0.1] hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/15 active:scale-[0.97]"
        >
          Reset
        </button>

        <div className="flex-1" />

        <label className="flex items-center gap-2.5 text-[0.8125rem] text-white/35">
          Speed
          <input
            type="range"
            min={0}
            max={80}
            step={1}
            value={tokenDelayMs}
            onChange={(event) => {
              setTokenDelayMs(Number(event.target.value));
            }}
            className="w-24"
          />
          <span className="w-10 text-right font-mono text-[0.75rem] tabular-nums text-white/45">
            {tokenDelayMs}ms
          </span>
        </label>

        <div className="flex items-center gap-2 pl-2">
          <div
            className={`h-2 w-2 rounded-full transition-colors ${statusDot[status]} ${
              status === 'running' ? 'animate-pulse' : ''
            }`}
          />
          <span className="text-[0.75rem] font-medium capitalize text-white/35">
            {status}
          </span>
        </div>
      </div>

      {/* Metric cards */}
      <div className="relative mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
          <p className="text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-white/30">
            Work amplification
          </p>
          <p
            className={`mt-3 text-3xl font-semibold tabular-nums ${impactTone(
              metrics.workAmplification
            )}`}
          >
            {metrics.workAmplification.toFixed(1)}&times;
          </p>
          <p className="mt-1.5 text-[0.75rem] text-white/20">Ideal is 1.0&times;</p>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
          <p className="text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-white/30">
            Total highlight time
          </p>
          <p className="mt-3 text-3xl font-semibold tabular-nums text-white">
            {formatMs(metrics.totalTimeMs)}
          </p>
          <p className="mt-1.5 text-[0.75rem] text-white/20">
            Cumulative across all tokens
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
          <p className="text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-white/30">
            Characters processed
          </p>
          <p className="mt-3 text-3xl font-semibold tabular-nums text-white">
            {formatCompact(metrics.totalCharsProcessed)}
          </p>
          <p className="mt-1.5 text-[0.75rem] text-white/20">
            Final output is {formatCompact(finalCodeLength)} chars
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative mb-8">
        <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-300"
            style={{
              width: `${Math.min(
                100,
                (metrics.tokensProcessed / Math.max(1, metrics.tokenTarget)) *
                  100
              )}%`,
              boxShadow:
                metrics.tokensProcessed > 0
                  ? '0 0 12px rgba(59,130,246,0.4)'
                  : 'none',
            }}
          />
        </div>
      </div>

      {/* Two-column content */}
      <div className="relative grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Code preview */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="mb-3 text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-white/20">
            Live output
          </p>
          <div className="code-scroll max-h-[640px] overflow-auto rounded-xl bg-black/30 p-4">
            {renderNode}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-5">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
            <p className="mb-4 text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-white/25">
              Metrics
            </p>
            <div className="divide-y divide-white/[0.05]">
              {metricRows.map(({ label, value }) => (
                <div
                  key={label}
                  className="flex items-center justify-between py-2.5"
                >
                  <span className="text-[0.8125rem] text-white/35">
                    {label}
                  </span>
                  <span className="font-mono text-[0.8125rem] tabular-nums text-white/75">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="px-1 text-[0.8rem] leading-relaxed text-white/20">
            Current mode re-highlights the full code on each
            token&mdash;
            <code className="text-white/30">O(n&sup2;)</code> total work. With{' '}
            <code className="text-white/30">shiki-stream</code>, growth becomes
            near-linear.
          </p>
        </aside>
      </div>
    </section>
  );
}
