import { afterAll, beforeAll, bench, describe } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import {
  getSingletonHighlighter,
  type Highlighter,
  type ThemedToken,
} from 'shiki';
import { ShikiStreamTokenizer } from 'shiki-stream';
import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';

import {
  buildCodeChunks,
  buildControlledCodeStates,
  buildSessionMetrics,
  createStreamingScenario,
  extractFinalCode,
  formatScenarioSummaryMarkdown,
  getStreamingCorpus,
  toScenarioSummaryRows,
  type ScenarioVariantReport,
  type StreamingSessionMetrics,
} from '../src/dev/streaming-lab';
import { useShikiStreamHighlighter } from '../src/index';

type BenchScenario = {
  name: string;
  presetId:
    | 'openai-steady'
    | 'anthropic-bursty'
    | 'firehose'
    | 'prose-code-prose'
    | 'replace-tail'
    | 'cancel-resume';
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
    name: 'append-firehose',
    presetId: 'firehose',
    corpusId: 'tsx-chat-ui',
    seed: 23,
  },
  {
    name: 'markdown-fence-chat',
    presetId: 'prose-code-prose',
    corpusId: 'python-snippet',
    seed: 29,
  },
  {
    name: 'replace-tail-edit',
    presetId: 'replace-tail',
    corpusId: 'markdown-fenced-mixed',
    seed: 31,
  },
  {
    name: 'cancel-resume',
    presetId: 'cancel-resume',
    corpusId: 'json-tool-payload',
    seed: 41,
  },
];

const REPORTS: ScenarioVariantReport[] = [];
const REPORTED_KEYS = new Set<string>();

const summarizeAndStore = (
  scenarioName: string,
  variant: string,
  metrics: StreamingSessionMetrics
) => {
  const key = `${scenarioName}::${variant}`;
  if (REPORTED_KEYS.has(key)) return;

  REPORTED_KEYS.add(key);
  REPORTS.push({ scenario: scenarioName, variant, metrics });
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

const sum = (values: number[]) =>
  values.reduce((total, value) => total + value, 0);

const makeMetrics = ({
  finalCode,
  baselineCode,
  inputChunkCount,
  processedChars,
  highlightCalls,
  renderCommits,
  chunkLatenciesMs,
  tokenizerEnqueues,
  recallEvents,
  recalledTokens,
  resyncCount,
}: {
  finalCode: string;
  baselineCode: string;
  inputChunkCount: number;
  processedChars: number;
  highlightCalls: number;
  renderCommits: number;
  chunkLatenciesMs: number[];
  tokenizerEnqueues?: number;
  recallEvents?: number;
  recalledTokens?: number;
  resyncCount?: number;
}) =>
  buildSessionMetrics({
    finalCode,
    baselineCode,
    inputChunkCount,
    processedChars,
    highlightCalls,
    renderCommits,
    chunkLatenciesMs,
    tokenizerEnqueues,
    recallEvents,
    recalledTokens,
    resyncCount,
    timeToFirstAnyOutputMs: chunkLatenciesMs[0] ?? 0,
    timeToFirstHighlightedCodeMs: chunkLatenciesMs[0] ?? 0,
    sessionTotalMs: sum(chunkLatenciesMs),
    statusSequence: ['idle', 'streaming', 'done'],
    endedCleanly: true,
  });

const runStaticReactSession = async (
  highlighter: Highlighter,
  scenario: BenchScenario
) => {
  const generated = createStreamingScenario({
    presetId: scenario.presetId,
    corpusId: scenario.corpusId,
    seed: scenario.seed,
  });

  const language = getStreamingCorpus(scenario.corpusId).language;
  const states = buildControlledCodeStates(generated.events);
  const baselineCode = extractFinalCode(generated.events);

  const latencies: number[] = [];
  let processedChars = 0;
  let calls = 0;

  for (const state of states.slice(1)) {
    const started = performance.now();
    toJsxRuntime(
      highlighter.codeToHast(state.code, {
        lang: language,
        theme: 'github-dark',
      }),
      {
        jsx,
        jsxs,
        Fragment,
      }
    );
    const elapsed = performance.now() - started;

    latencies.push(elapsed);
    processedChars += state.code.length;
    calls += 1;
  }

  return makeMetrics({
    finalCode: baselineCode,
    baselineCode,
    inputChunkCount: Math.max(0, states.length - 1),
    processedChars,
    highlightCalls: calls,
    renderCommits: calls,
    chunkLatenciesMs: latencies,
  });
};

const runStaticHtmlSession = async (
  highlighter: Highlighter,
  scenario: BenchScenario
) => {
  const generated = createStreamingScenario({
    presetId: scenario.presetId,
    corpusId: scenario.corpusId,
    seed: scenario.seed,
  });

  const language = getStreamingCorpus(scenario.corpusId).language;
  const states = buildControlledCodeStates(generated.events);
  const baselineCode = extractFinalCode(generated.events);

  const latencies: number[] = [];
  let processedChars = 0;
  let calls = 0;

  for (const state of states.slice(1)) {
    const started = performance.now();
    highlighter.codeToHtml(state.code, {
      lang: language,
      theme: 'github-dark',
    });
    const elapsed = performance.now() - started;

    latencies.push(elapsed);
    processedChars += state.code.length;
    calls += 1;
  }

  return makeMetrics({
    finalCode: baselineCode,
    baselineCode,
    inputChunkCount: Math.max(0, states.length - 1),
    processedChars,
    highlightCalls: calls,
    renderCommits: calls,
    chunkLatenciesMs: latencies,
  });
};

const runIncrementalTokenizerSession = async (
  highlighter: Highlighter,
  scenario: BenchScenario
) => {
  const generated = createStreamingScenario({
    presetId: scenario.presetId,
    corpusId: scenario.corpusId,
    seed: scenario.seed,
  });

  const language = getStreamingCorpus(scenario.corpusId).language;
  const baselineCode = extractFinalCode(generated.events);
  const chunkData = buildCodeChunks(generated.events, {
    strictAppendOnly: false,
  });

  const tokenizer = new ShikiStreamTokenizer({
    highlighter,
    lang: language,
    theme: 'github-dark',
  });

  const renderedTokens: ThemedToken[] = [];
  const latencies: number[] = [];

  let recallEvents = 0;
  let recalledTokens = 0;
  let resyncCount = 0;
  let previous = '';

  for (const chunk of chunkData.chunks) {
    if (
      !chunk.startsWith(previous) &&
      !baselineCode.startsWith(previous + chunk)
    ) {
      tokenizer.clear();
      renderedTokens.length = 0;
      previous = '';
      resyncCount += 1;
    }

    const appendChunk = chunk.startsWith(previous)
      ? chunk.slice(previous.length)
      : chunk;

    const started = performance.now();
    const result = await tokenizer.enqueue(appendChunk);
    const elapsed = performance.now() - started;

    latencies.push(elapsed);

    if (result.recall > 0) {
      recallEvents += 1;
      recalledTokens += result.recall;
      renderedTokens.splice(-result.recall, result.recall);
    }

    renderedTokens.push(...result.stable, ...result.unstable);
    previous = chunk;
  }

  const closeResult = tokenizer.close();
  renderedTokens.push(...closeResult.stable);

  const finalCode =
    renderedTokens.map((token) => token.content).join('') || baselineCode;
  const processedChars = chunkData.chunks.reduce(
    (total, chunk) => total + chunk.length,
    0
  );

  return makeMetrics({
    finalCode,
    baselineCode,
    inputChunkCount: chunkData.chunks.length,
    processedChars,
    highlightCalls: chunkData.chunks.length,
    renderCommits: chunkData.chunks.length,
    chunkLatenciesMs: latencies,
    tokenizerEnqueues: chunkData.chunks.length,
    recallEvents,
    recalledTokens,
    resyncCount,
  });
};

type HookHarnessHandle = {
  setInput: (value: string, complete: boolean) => void;
  getCode: () => string;
  getStatus: () => string;
};

const HookHarness = forwardRef<
  HookHarnessHandle,
  { highlighter: Highlighter; language: string; initialCode: string }
>(function HookHarness({ highlighter, language, initialCode }, ref) {
  const [code, setCode] = useState(initialCode);
  const [isComplete, setComplete] = useState(false);

  const result = useShikiStreamHighlighter(
    { code, isComplete },
    language,
    'github-dark',
    { highlighter, allowRecalls: true }
  );

  useImperativeHandle(ref, () => ({
    setInput(value, complete) {
      setCode(value);
      setComplete(complete);
    },
    getCode() {
      return result.tokens.map((token) => token.content).join('');
    },
    getStatus() {
      return result.status;
    },
  }));

  return null;
});

const runIncrementalHookSession = async (
  highlighter: Highlighter,
  scenario: BenchScenario
) => {
  const generated = createStreamingScenario({
    presetId: scenario.presetId,
    corpusId: scenario.corpusId,
    seed: scenario.seed,
  });

  const language = getStreamingCorpus(scenario.corpusId).language;
  const states = buildControlledCodeStates(generated.events);
  const baselineCode = extractFinalCode(generated.events);

  const ref = React.createRef<HookHarnessHandle>();
  const { unmount } = render(
    React.createElement(HookHarness, {
      ref,
      highlighter,
      language,
      initialCode: states[0]?.code ?? '',
    })
  );

  const latencies: number[] = [];
  let processedChars = 0;
  let previous = states[0]?.code ?? '';

  for (const state of states.slice(1)) {
    const started = performance.now();
    await act(async () => {
      ref.current?.setInput(state.code, state.isComplete);
    });
    const elapsed = performance.now() - started;
    latencies.push(elapsed);

    processedChars += state.code.startsWith(previous)
      ? state.code.length - previous.length
      : state.code.length;

    previous = state.code;
  }

  await waitFor(() => {
    expect(ref.current?.getStatus()).toBe('done');
  });

  const finalCode = ref.current?.getCode() ?? '';
  unmount();

  return makeMetrics({
    finalCode,
    baselineCode,
    inputChunkCount: Math.max(0, states.length - 1),
    processedChars,
    highlightCalls: Math.max(0, states.length - 1),
    renderCommits: Math.max(0, states.length - 1),
    chunkLatenciesMs: latencies,
  });
};

const runSingleFinalSession = async (
  highlighter: Highlighter,
  scenario: BenchScenario
) => {
  const generated = createStreamingScenario({
    presetId: scenario.presetId,
    corpusId: scenario.corpusId,
    seed: scenario.seed,
  });

  const language = getStreamingCorpus(scenario.corpusId).language;
  const baselineCode = extractFinalCode(generated.events);

  const started = performance.now();
  toJsxRuntime(
    highlighter.codeToHast(baselineCode, {
      lang: language,
      theme: 'github-dark',
    }),
    { jsx, jsxs, Fragment }
  );
  const elapsed = performance.now() - started;

  return makeMetrics({
    finalCode: baselineCode,
    baselineCode,
    inputChunkCount: 1,
    processedChars: baselineCode.length,
    highlightCalls: 1,
    renderCommits: 1,
    chunkLatenciesMs: [elapsed],
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
  for (const scenario of BENCH_SCENARIOS) {
    bench(
      `${scenario.name} :: static-react-full-rehighlight`,
      async () => {
        const metrics = await runStaticReactSession(
          highlighter,
          scenario
        );
        summarizeAndStore(
          scenario.name,
          'static-react-full-rehighlight',
          metrics
        );
      },
      { iterations: 1 }
    );

    bench(
      `${scenario.name} :: static-html-full-rehighlight`,
      async () => {
        const metrics = await runStaticHtmlSession(highlighter, scenario);
        summarizeAndStore(
          scenario.name,
          'static-html-full-rehighlight',
          metrics
        );
      },
      { iterations: 1 }
    );

    if (scenario.presetId !== 'replace-tail') {
      bench(
        `${scenario.name} :: incremental-tokenizer-direct`,
        async () => {
          const metrics = await runIncrementalTokenizerSession(
            highlighter,
            scenario
          );
          summarizeAndStore(
            scenario.name,
            'incremental-tokenizer-direct',
            metrics
          );
        },
        { iterations: 1 }
      );

      bench(
        `${scenario.name} :: incremental-hook-controlled`,
        async () => {
          const metrics = await runIncrementalHookSession(
            highlighter,
            scenario
          );
          summarizeAndStore(
            scenario.name,
            'incremental-hook-controlled',
            metrics
          );
        },
        { iterations: 1 }
      );
    }

    bench(
      `${scenario.name} :: single-final-baseline`,
      async () => {
        const metrics = await runSingleFinalSession(
          highlighter,
          scenario
        );
        summarizeAndStore(
          scenario.name,
          'single-final-baseline',
          metrics
        );
      },
      { iterations: 1 }
    );
  }
});
