import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import React, {
  Profiler,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { afterAll, beforeAll, bench, describe, expect } from 'vitest';
import { getSingletonHighlighter, type Highlighter } from 'shiki';

import {
  ShikiTokenRenderer,
  useShikiHighlighter,
  useShikiStreamHighlighter,
  type StreamSessionSummary,
} from '../src/index';
import {
  type ControlledCodeState,
  buildControlledCodeStates,
  buildSessionMetrics,
  createStreamingScenario,
  extractFinalCode,
  formatScenarioSummaryMarkdown,
  getStreamingCorpus,
  toScenarioSummaryRows,
  type ScenarioVariantReport,
  type ScenarioPresetId,
  type StreamingSessionMetrics,
} from '../src/dev/streaming-lab';

// NOTE: This benchmark is intentionally built on real rendered React paths
// (Profiler + hook/component rendering) because streaming-lab diagnostics rely
// on actual commit pressure rather than synthetic counters.

const BENCH_PROFILE =
  process.env.STREAMING_BENCH_PROFILE === 'full' ? 'full' : 'quick';
const BENCH_FAST_MODE = process.env.STREAMING_BENCH_FAST !== '0';
const BENCH_MAX_STEPS = Number(
  process.env.STREAMING_BENCH_MAX_STEPS ??
    (BENCH_FAST_MODE ? (BENCH_PROFILE === 'full' ? '220' : '140') : '0')
);

const BENCH_OPTIONS = {
  iterations: 1,
  time: 0,
  warmupTime: 0,
  warmupIterations: 0,
} as const;

type BenchScenario = {
  name: string;
  presetId: ScenarioPresetId;
  corpusId:
    | 'tsx-chat-ui'
    | 'python-snippet'
    | 'json-tool-payload'
    | 'markdown-fenced-mixed';
  seed: number;
};

const BENCH_SCENARIOS: BenchScenario[] = [
  {
    name: 'append-steady-short',
    presetId: 'openai-steady',
    corpusId: 'markdown-fenced-mixed',
    seed: 7,
  },
  {
    name: 'append-steady-long',
    presetId: 'openai-steady',
    corpusId: 'tsx-chat-ui',
    seed: 11,
  },
  {
    name: 'append-bursty-long',
    presetId: 'anthropic-bursty',
    corpusId: 'tsx-chat-ui',
    seed: 17,
  },
  {
    name: 'firehose',
    presetId: 'firehose',
    corpusId: 'tsx-chat-ui',
    seed: 23,
  },
  {
    name: 'recall-heavy-append',
    presetId: 'recall-heavy-append',
    corpusId: 'tsx-chat-ui',
    seed: 29,
  },
  {
    name: 'replace-tail-intentional',
    presetId: 'replace-tail',
    corpusId: 'markdown-fenced-mixed',
    seed: 31,
  },
];

const ACTIVE_SCENARIOS =
  BENCH_PROFILE === 'full'
    ? BENCH_SCENARIOS
    : BENCH_SCENARIOS.filter(
        (scenario) =>
          scenario.name !== 'append-steady-long' &&
          scenario.name !== 'recall-heavy-append'
      );

const REPORTS: ScenarioVariantReport[] = [];
const REPORTED_KEYS = new Set<string>();

const summarizeAndStore = (
  scenarioName: string,
  variant: string,
  restartClass: string,
  metrics: StreamingSessionMetrics
) => {
  const key = `${scenarioName}::${variant}`;
  if (REPORTED_KEYS.has(key)) return;

  REPORTED_KEYS.add(key);
  REPORTS.push({
    scenario: scenarioName,
    variant,
    restartClass,
    metrics,
  });
};

const finalizeReport = () => {
  const summaryPath = process.env.STREAMING_BENCH_SUMMARY_FILE;
  if (!summaryPath) return;

  const rows = toScenarioSummaryRows(REPORTS);
  const markdown = formatScenarioSummaryMarkdown(rows);

  mkdirSync(dirname(summaryPath), { recursive: true });
  writeFileSync(summaryPath, JSON.stringify(rows, null, 2), 'utf8');

  const markdownPath =
    process.env.STREAMING_BENCH_MARKDOWN_FILE ??
    summaryPath.replace(/\.json$/, '.md');

  mkdirSync(dirname(markdownPath), { recursive: true });
  writeFileSync(markdownPath, markdown, 'utf8');
};

const isHighlightedHtml = (html: string): boolean =>
  html.includes('<span') &&
  (html.includes('style=') || html.includes('class='));

const downsampleStates = (
  states: ControlledCodeState[]
): ControlledCodeState[] => {
  const chunkCount = Math.max(0, states.length - 1);
  if (BENCH_MAX_STEPS <= 0 || chunkCount <= BENCH_MAX_STEPS) {
    return states;
  }

  const lastIndex = states.length - 1;
  const selected = new Set<number>([0, lastIndex]);

  for (let index = 1; index < lastIndex; index += 1) {
    if (!states[index]?.isAppendOnly) {
      selected.add(index);
    }
  }

  const budget = Math.max(2, BENCH_MAX_STEPS + 1);
  const remaining = Math.max(0, budget - selected.size);
  const span = Math.max(1, lastIndex - 1);
  const stride = Math.max(1, Math.ceil(span / Math.max(1, remaining)));

  for (
    let index = 1;
    index < lastIndex && selected.size < budget;
    index += stride
  ) {
    selected.add(index);
  }

  return Array.from(selected)
    .sort((a, b) => a - b)
    .map((index) => states[index]!)
    .filter(Boolean);
};

type IncrementalHarnessHandle = {
  setCode: (value: string, isComplete: boolean) => void;
  getRenderedText: () => string;
  getRenderedHtml: () => string;
  getStatus: () => string;
  getStatusSequence: () => string[];
  getSummaries: () => StreamSessionSummary[];
};

const IncrementalHarness = forwardRef<
  IncrementalHarnessHandle,
  {
    highlighter: Highlighter;
    language: string;
    initialCode: string;
  }
>(function IncrementalHarness(
  { highlighter, language, initialCode },
  ref
) {
  const [code, setCode] = useState(initialCode);
  const [isComplete, setComplete] = useState(false);
  const outputRef = useRef<HTMLDivElement | null>(null);
  const statusSequenceRef = useRef<string[]>([]);
  const summariesRef = useRef<StreamSessionSummary[]>([]);

  const result = useShikiStreamHighlighter(
    { code, isComplete },
    language,
    'github-dark',
    {
      highlighter,
      allowRecalls: true,
      onSessionSummary: (summary) => {
        summariesRef.current.push(summary);
      },
    }
  );

  useEffect(() => {
    const sequence = statusSequenceRef.current;
    if (sequence[sequence.length - 1] !== result.status) {
      sequence.push(result.status);
    }
  }, [result.status]);

  useImperativeHandle(
    ref,
    () => ({
      setCode(value, done) {
        setCode(value);
        setComplete(done);
      },
      getRenderedText() {
        return outputRef.current?.textContent ?? '';
      },
      getRenderedHtml() {
        return outputRef.current?.innerHTML ?? '';
      },
      getStatus() {
        return result.status;
      },
      getStatusSequence() {
        return [...statusSequenceRef.current];
      },
      getSummaries() {
        return [...summariesRef.current];
      },
    }),
    [result.status]
  );

  return (
    <div ref={outputRef} data-testid="incremental-output">
      <ShikiTokenRenderer tokens={result.tokens} />
    </div>
  );
});

type StaticHarnessHandle = {
  setCode: (value: string) => void;
  getRenderedText: () => string;
  getRenderedHtml: () => string;
};

const StaticHarness = forwardRef<
  StaticHarnessHandle,
  {
    highlighter: Highlighter;
    language: string;
    initialCode: string;
  }
>(function StaticHarness({ highlighter, language, initialCode }, ref) {
  const [code, setCode] = useState(initialCode);
  const outputRef = useRef<HTMLDivElement | null>(null);

  const highlighted = useShikiHighlighter(code, language, 'github-dark', {
    highlighter,
  });

  useImperativeHandle(ref, () => ({
    setCode,
    getRenderedText() {
      return outputRef.current?.textContent ?? '';
    },
    getRenderedHtml() {
      return outputRef.current?.innerHTML ?? '';
    },
  }));

  return (
    <div ref={outputRef} data-testid="static-output">
      {highlighted}
    </div>
  );
});

const runIncrementalSession = async (
  highlighter: Highlighter,
  scenario: BenchScenario
): Promise<StreamingSessionMetrics> => {
  const generated = createStreamingScenario({
    presetId: scenario.presetId,
    corpusId: scenario.corpusId,
    seed: scenario.seed,
  });

  const language = getStreamingCorpus(scenario.corpusId).language;
  const baselineCode = extractFinalCode(generated.events);
  const baselineHtml = highlighter.codeToHtml(baselineCode, {
    lang: language,
    theme: 'github-dark',
  });
  const states = downsampleStates(
    buildControlledCodeStates(generated.events)
  );

  let actualRenderCommits = 0;
  const ref = React.createRef<IncrementalHarnessHandle>();

  const { unmount } = render(
    <Profiler
      id={`incremental:${scenario.name}`}
      onRender={() => {
        actualRenderCommits += 1;
      }}
    >
      <IncrementalHarness
        ref={ref}
        highlighter={highlighter}
        language={language}
        initialCode={states[0]?.code ?? ''}
      />
    </Profiler>
  );

  const startedAt = performance.now();
  const chunkLatenciesMs: number[] = [];

  let processedChars = 0;
  let previousCode = states[0]?.code ?? '';
  let timeToFirstAnyOutputMs = 0;
  let timeToFirstHighlightedOutputMs = 0;

  for (const state of states.slice(1)) {
    const chunkStartedAt = performance.now();
    await act(async () => {
      ref.current?.setCode(state.code, state.isComplete);
    });

    await act(async () => {
      await Promise.resolve();
    });

    const now = performance.now();
    chunkLatenciesMs.push(now - chunkStartedAt);

    if (
      timeToFirstAnyOutputMs === 0 &&
      (ref.current?.getRenderedText() ?? '').length > 0
    ) {
      timeToFirstAnyOutputMs = now - startedAt;
    }

    if (
      timeToFirstHighlightedOutputMs === 0 &&
      isHighlightedHtml(ref.current?.getRenderedHtml() ?? '')
    ) {
      timeToFirstHighlightedOutputMs = now - startedAt;
    }

    processedChars += state.code.startsWith(previousCode)
      ? state.code.length - previousCode.length
      : state.code.length;

    previousCode = state.code;
  }

  await waitFor(() => {
    expect(ref.current?.getStatus()).toBe('done');
  });

  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });

  const sessionTotalMs = performance.now() - startedAt;
  const finalCode = ref.current?.getRenderedText() ?? '';
  const finalRenderedHtml = ref.current?.getRenderedHtml() ?? '';
  const statusSequence = ref.current?.getStatusSequence() ?? [];
  const sessionSummaries = ref.current?.getSummaries() ?? [];

  unmount();

  return buildSessionMetrics({
    finalCode,
    baselineCode,
    inputChunkCount: Math.max(0, states.length - 1),
    processedChars,
    tokenEvents: sessionSummaries.reduce(
      (count, summary) => count + summary.tokenEvents,
      0
    ),
    recallEvents: sessionSummaries.reduce(
      (count, summary) => count + summary.recallEvents,
      0
    ),
    scheduledCommits: sessionSummaries.reduce(
      (count, summary) => count + summary.scheduledCommits,
      0
    ),
    actualRenderCommits,
    restartCount: sessionSummaries.filter(
      (summary) => summary.reason === 'restart'
    ).length,
    chunkLatenciesMs,
    timeToFirstAnyOutputMs,
    timeToFirstHighlightedOutputMs:
      timeToFirstHighlightedOutputMs || timeToFirstAnyOutputMs,
    sessionTotalMs,
    statusSequence,
    endedCleanly: statusSequence[statusSequence.length - 1] === 'done',
    finalRenderedHtml,
    baselineHtml,
  });
};

const runStaticRehighlightSession = async (
  highlighter: Highlighter,
  scenario: BenchScenario
): Promise<StreamingSessionMetrics> => {
  const generated = createStreamingScenario({
    presetId: scenario.presetId,
    corpusId: scenario.corpusId,
    seed: scenario.seed,
  });

  const language = getStreamingCorpus(scenario.corpusId).language;
  const baselineCode = extractFinalCode(generated.events);
  const baselineHtml = highlighter.codeToHtml(baselineCode, {
    lang: language,
    theme: 'github-dark',
  });
  const states = downsampleStates(
    buildControlledCodeStates(generated.events)
  );

  let actualRenderCommits = 0;
  const ref = React.createRef<StaticHarnessHandle>();

  const { unmount } = render(
    <Profiler
      id={`static:${scenario.name}`}
      onRender={() => {
        actualRenderCommits += 1;
      }}
    >
      <StaticHarness
        ref={ref}
        highlighter={highlighter}
        language={language}
        initialCode={states[0]?.code ?? ''}
      />
    </Profiler>
  );

  const startedAt = performance.now();
  const chunkLatenciesMs: number[] = [];

  let processedChars = 0;
  let timeToFirstAnyOutputMs = 0;
  let timeToFirstHighlightedOutputMs = 0;

  for (const state of states.slice(1)) {
    const chunkStartedAt = performance.now();

    await act(async () => {
      ref.current?.setCode(state.code);
    });

    await act(async () => {
      await Promise.resolve();
    });

    const now = performance.now();
    chunkLatenciesMs.push(now - chunkStartedAt);

    if (
      timeToFirstAnyOutputMs === 0 &&
      (ref.current?.getRenderedText() ?? '').length > 0
    ) {
      timeToFirstAnyOutputMs = now - startedAt;
    }

    if (
      timeToFirstHighlightedOutputMs === 0 &&
      isHighlightedHtml(ref.current?.getRenderedHtml() ?? '')
    ) {
      timeToFirstHighlightedOutputMs = now - startedAt;
    }

    processedChars += state.code.length;
  }

  await act(async () => {
    await Promise.resolve();
  });

  const sessionTotalMs = performance.now() - startedAt;
  const finalCode = ref.current?.getRenderedText() ?? '';
  const finalRenderedHtml = ref.current?.getRenderedHtml() ?? '';

  unmount();

  return buildSessionMetrics({
    finalCode,
    baselineCode,
    inputChunkCount: Math.max(0, states.length - 1),
    processedChars,
    tokenEvents: 0,
    recallEvents: 0,
    scheduledCommits: 0,
    actualRenderCommits,
    restartCount: 0,
    chunkLatenciesMs,
    timeToFirstAnyOutputMs,
    timeToFirstHighlightedOutputMs:
      timeToFirstHighlightedOutputMs || timeToFirstAnyOutputMs,
    sessionTotalMs,
    statusSequence: ['idle', 'streaming', 'done'],
    endedCleanly: true,
    finalRenderedHtml,
    baselineHtml,
  });
};

let highlighter: Highlighter;

beforeAll(async () => {
  highlighter = await getSingletonHighlighter({
    langs: [
      'tsx',
      'typescript',
      'python',
      'json',
      'markdown',
      'plaintext',
    ],
    themes: ['github-dark'],
  });
}, 30000);

afterAll(() => {
  finalizeReport();
});

describe('streaming session benchmark', () => {
  for (const scenario of ACTIVE_SCENARIOS) {
    const generated = createStreamingScenario({
      presetId: scenario.presetId,
      corpusId: scenario.corpusId,
      seed: scenario.seed,
    });

    bench(
      `${scenario.name} :: full-rehighlight-react`,
      async () => {
        const metrics = await runStaticRehighlightSession(
          highlighter,
          scenario
        );
        summarizeAndStore(
          scenario.name,
          'full-rehighlight-react',
          generated.restartClass,
          metrics
        );
      },
      BENCH_OPTIONS
    );

    bench(
      `${scenario.name} :: incremental-hook-controlled`,
      async () => {
        const metrics = await runIncrementalSession(
          highlighter,
          scenario
        );
        summarizeAndStore(
          scenario.name,
          'incremental-hook-controlled',
          generated.restartClass,
          metrics
        );
      },
      BENCH_OPTIONS
    );
  }
});
