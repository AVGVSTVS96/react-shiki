import { beforeAll, bench, describe } from 'vitest';
import { getSingletonHighlighter, type Highlighter } from 'shiki';

import { createStreamingScenario } from '../src/dev/streaming-lab';
import { runAssistantMessageScenario } from './assistant-message-harness';

const BENCH_OPTIONS = {
  iterations: 1,
  time: 0,
  warmupTime: 0,
  warmupIterations: 0,
} as const;

const SCENARIOS = [
  {
    name: 'assistant-steady',
    presetId: 'assistant-multi-block-steady' as const,
    seed: 101,
  },
  {
    name: 'assistant-bursty',
    presetId: 'assistant-multi-block-bursty' as const,
    seed: 131,
  },
  {
    name: 'assistant-firehose',
    presetId: 'assistant-multi-block-firehose' as const,
    seed: 167,
  },
];

let highlighter: Highlighter;

beforeAll(async () => {
  highlighter = await getSingletonHighlighter({
    langs: [
      'php',
      'ruby',
      'swift',
      'go',
      'typescript',
      'html',
      'css',
      'python',
      'json',
      'plaintext',
    ],
    themes: ['github-dark'],
  });
}, 30000);

describe('assistant-message chat-tree benchmark', () => {
  for (const scenarioConfig of SCENARIOS) {
    const scenario = createStreamingScenario({
      presetId: scenarioConfig.presetId,
      seed: scenarioConfig.seed,
    });

    bench(
      `${scenarioConfig.name} :: incremental-chat-tree`,
      async () => {
        await runAssistantMessageScenario({
          scenario,
          highlighter,
          variant: 'incremental-chat-tree',
        });
      },
      BENCH_OPTIONS
    );

    bench(
      `${scenarioConfig.name} :: static-chat-tree`,
      async () => {
        await runAssistantMessageScenario({
          scenario,
          highlighter,
          variant: 'static-chat-tree',
        });
      },
      BENCH_OPTIONS
    );

    bench(
      `${scenarioConfig.name} :: plaintext-chat-tree`,
      async () => {
        await runAssistantMessageScenario({
          scenario,
          highlighter,
          variant: 'plaintext-chat-tree',
        });
      },
      BENCH_OPTIONS
    );

    bench(
      `${scenarioConfig.name} :: incremental-chat-tree-final-only-control`,
      async () => {
        await runAssistantMessageScenario({
          scenario,
          highlighter,
          variant: 'incremental-chat-tree',
          playbackMode: 'final-only',
        });
      },
      BENCH_OPTIONS
    );
  }
});
