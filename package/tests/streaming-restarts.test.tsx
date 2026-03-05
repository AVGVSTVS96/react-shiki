import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, test } from 'vitest';
import { getSingletonHighlighter, type Highlighter } from 'shiki';

import {
  buildControlledCodeStates,
  createStreamingScenario,
  normalizePlainText,
} from '../src/dev/streaming-lab';
import {
  StreamHarness,
  type StreamHarnessHandle,
  flushReact,
} from './streaming-test-harness';

const applyCodeState = async (
  ref: React.RefObject<StreamHarnessHandle | null>,
  code: string,
  isComplete: boolean
) => {
  await act(async () => {
    ref.current?.setInput({ code, isComplete });
  });
  await act(async () => {
    await flushReact();
  });
};

const restartCountFromHarness = (
  ref: React.RefObject<StreamHarnessHandle | null>
): number =>
  ref.current
    ?.getSessionSummaries()
    .filter((summary) => summary.reason === 'restart').length ?? 0;

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

describe('stream restart forensics', () => {
  test('intentional-model-edit: replace-tail scenario surfaces restart diagnostics', async () => {
    const scenario = createStreamingScenario({
      presetId: 'replace-tail',
      corpusId: 'markdown-fenced-mixed',
      seed: 55,
    });

    const states = buildControlledCodeStates(scenario.events);
    const finalExpected = states[states.length - 1]?.code ?? '';

    const ref = React.createRef<StreamHarnessHandle>();
    render(
      <StreamHarness
        ref={ref}
        highlighter={highlighter}
        initialLanguage="typescript"
        initialTheme="github-dark"
        initialInput={{ code: states[0]?.code ?? '' }}
        allowRecalls
      />
    );

    for (const state of states.slice(1)) {
      await applyCodeState(ref, state.code, state.isComplete);
    }

    await waitFor(() => {
      expect(ref.current?.getResult().status).toBe('done');
    });

    expect(normalizePlainText(ref.current?.getRenderedText() ?? '')).toBe(
      normalizePlainText(finalExpected)
    );
    expect(restartCountFromHarness(ref)).toBeGreaterThanOrEqual(1);
  });

  test('consumer-induced: line-ending normalization churn triggers non-append restarts', async () => {
    const scenario = createStreamingScenario({
      presetId: 'openai-steady',
      corpusId: 'python-snippet',
      seed: 73,
    });

    const states = buildControlledCodeStates(scenario.events);
    const transformedStates = states.map((state, index) => {
      if (index % 2 === 0) {
        return {
          ...state,
          code: state.code.replace(/\r?\n/g, '\n'),
        };
      }

      return {
        ...state,
        code: state.code.replace(/\r?\n/g, '\r\n'),
      };
    });

    const finalExpected =
      transformedStates[transformedStates.length - 1]?.code ?? '';

    const ref = React.createRef<StreamHarnessHandle>();
    render(
      <StreamHarness
        ref={ref}
        highlighter={highlighter}
        initialLanguage="python"
        initialTheme="github-dark"
        initialInput={{ code: transformedStates[0]?.code ?? '' }}
        allowRecalls
      />
    );

    for (const state of transformedStates.slice(1)) {
      await applyCodeState(ref, state.code, state.isComplete);
    }

    await waitFor(() => {
      expect(ref.current?.getResult().status).toBe('done');
    });

    expect(normalizePlainText(ref.current?.getRenderedText() ?? '')).toBe(
      normalizePlainText(finalExpected)
    );
    expect(restartCountFromHarness(ref)).toBeGreaterThanOrEqual(1);
  });

  test('append-only steady flow stays restart-free', async () => {
    const scenario = createStreamingScenario({
      presetId: 'anthropic-bursty',
      corpusId: 'json-tool-payload',
      seed: 91,
    });

    const states = buildControlledCodeStates(scenario.events);

    const ref = React.createRef<StreamHarnessHandle>();
    render(
      <StreamHarness
        ref={ref}
        highlighter={highlighter}
        initialLanguage="json"
        initialTheme="github-dark"
        initialInput={{ code: states[0]?.code ?? '' }}
        allowRecalls
      />
    );

    for (const state of states.slice(1)) {
      await applyCodeState(ref, state.code, state.isComplete);
    }

    await waitFor(() => {
      expect(ref.current?.getResult().status).toBe('done');
    });

    expect(restartCountFromHarness(ref)).toBe(0);
  });
});
