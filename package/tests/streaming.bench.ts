import { afterAll, beforeAll, bench, describe } from 'vitest';
import { getSingletonHighlighter, type CodeToHastOptions, type Highlighter } from 'shiki';
import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';

import {
  STREAMING_CODE_SAMPLE,
  type SessionSummary,
  type StreamMode,
  createInstrumentedHighlighter,
  createProgressiveStates,
  runFirehose,
  runSequential,
  summarizeSession,
} from './streaming-fixtures';

const LANGUAGE = 'tsx';
const THEME = 'github-dark';

const scenarios: Array<{
  name: string;
  mode: StreamMode;
  states: string[];
}> = [
  {
    name: 'append-sequential-100',
    mode: 'sequential',
    states: createProgressiveStates(STREAMING_CODE_SAMPLE, 100, 42),
  },
  {
    name: 'append-firehose-200',
    mode: 'firehose',
    states: createProgressiveStates(STREAMING_CODE_SAMPLE, 200, 42),
  },
  {
    name: 'append-sequential-500',
    mode: 'sequential',
    states: createProgressiveStates(STREAMING_CODE_SAMPLE, 500, 42),
  },
];

const reportOnce = new Set<string>();
const report = (summary: SessionSummary) => {
  const key = `${summary.scenario}::${summary.variant}`;
  if (reportOnce.has(key)) return;
  reportOnce.add(key);
  console.log(
    `[streaming-bench] ${JSON.stringify(summary)}`
  );
};

const runMode = async (
  mode: StreamMode,
  states: string[],
  worker: (state: string, index: number) => Promise<void>
) => {
  if (mode === 'sequential') {
    await runSequential(states, worker);
    return;
  }
  await runFirehose(states, worker);
};

let highlighter: Highlighter;

beforeAll(async () => {
  highlighter = await getSingletonHighlighter({
    langs: [LANGUAGE],
    themes: [THEME],
  });
}, 30000);

afterAll(() => {
  reportOnce.clear();
});

describe('streaming full rehighlight complexity', () => {
  for (const scenario of scenarios) {
    bench(`${scenario.name} :: codeToHast -> toJsxRuntime`, async () => {
      const inst = createInstrumentedHighlighter(highlighter);
      const opts: CodeToHastOptions = { lang: LANGUAGE, theme: THEME };

      await runMode(scenario.mode, scenario.states, async (state) => {
        toJsxRuntime(inst.highlighter.codeToHast(state, opts), {
          jsx,
          jsxs,
          Fragment,
        });
      });

      const summary = summarizeSession({
        scenario: scenario.name,
        variant: 'full-react',
        totalCalls: inst.stats.hastCalls,
        totalCharsProcessed: inst.stats.hastChars,
        durationsMs: inst.stats.hastDurationsMs,
        finalCodeLength: scenario.states[scenario.states.length - 1]?.length ?? 0,
      });
      report(summary);
      inst.restore();
    });

    bench(`${scenario.name} :: codeToHtml`, async () => {
      const inst = createInstrumentedHighlighter(highlighter);
      const opts: CodeToHastOptions = { lang: LANGUAGE, theme: THEME };

      await runMode(scenario.mode, scenario.states, async (state) => {
        inst.highlighter.codeToHtml(state, opts);
      });

      const summary = summarizeSession({
        scenario: scenario.name,
        variant: 'full-html',
        totalCalls: inst.stats.htmlCalls,
        totalCharsProcessed: inst.stats.htmlChars,
        durationsMs: inst.stats.htmlDurationsMs,
        finalCodeLength: scenario.states[scenario.states.length - 1]?.length ?? 0,
      });
      report(summary);
      inst.restore();
    });

    bench(`${scenario.name} :: single-final-baseline`, async () => {
      const inst = createInstrumentedHighlighter(highlighter);
      const finalState = scenario.states[scenario.states.length - 1] ?? '';
      const opts: CodeToHastOptions = { lang: LANGUAGE, theme: THEME };

      toJsxRuntime(inst.highlighter.codeToHast(finalState, opts), {
        jsx,
        jsxs,
        Fragment,
      });

      const summary = summarizeSession({
        scenario: scenario.name,
        variant: 'single-final',
        totalCalls: inst.stats.hastCalls,
        totalCharsProcessed: inst.stats.hastChars,
        durationsMs: inst.stats.hastDurationsMs,
        finalCodeLength: finalState.length,
      });
      report(summary);
      inst.restore();
    });
  }
});

