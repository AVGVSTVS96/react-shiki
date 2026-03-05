import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, test } from 'vitest';
import { getSingletonHighlighter, type Highlighter } from 'shiki';

import {
  buildControlledCodeStates,
  calculateTextDiffCounts,
  createStreamingScenario,
  extractFinalCode,
  getStreamingCorpus,
} from 'streaming-lab';
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

const readRenderedCode = (
  ref: React.RefObject<StreamHarnessHandle | null>
) =>
  ref.current
    ?.getResult()
    .tokens.map((token) => token.content)
    .join('') ?? '';

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
    themes: ['github-dark', 'github-light', 'tokyo-night'],
  });
}, 30000);

describe('useShikiStreamHighlighter controlled code scenarios', () => {
  test.each([
    ['openai-steady', 'tsx-chat-ui', true],
    ['openai-steady', 'tsx-chat-ui', false],
    ['anthropic-bursty', 'python-snippet', true],
    ['anthropic-bursty', 'python-snippet', false],
    ['late-fence-language', 'json-tool-payload', true],
    ['replace-tail', 'markdown-fenced-mixed', true],
  ] as const)('scenario %s with corpus %s (allowRecalls=%s) is text-parity safe', async (presetId, corpusId, allowRecalls) => {
    const scenario = createStreamingScenario({
      presetId,
      corpusId,
      seed: 21,
    });

    const controlledStates = buildControlledCodeStates(scenario.events);
    const initial = controlledStates[0] ?? {
      code: '',
      isComplete: false,
    };

    const language = getStreamingCorpus(corpusId).language;
    const ref = React.createRef<StreamHarnessHandle>();

    render(
      <StreamHarness
        ref={ref}
        highlighter={highlighter}
        initialLanguage={language}
        initialTheme="tokyo-night"
        initialInput={{
          code: initial.code,
          isComplete: initial.isComplete,
        }}
        allowRecalls={allowRecalls}
      />
    );

    for (const state of controlledStates.slice(1)) {
      await applyCodeState(ref, state.code, state.isComplete);
    }

    await waitFor(() => {
      expect(ref.current?.getResult().status).toBe('done');
    });

    const expected = extractFinalCode(scenario.events);
    const rendered = readRenderedCode(ref);

    expect(rendered).toBe(expected);

    const diff = calculateTextDiffCounts(expected, rendered);
    expect(diff.duplicateCharCount).toBe(0);
    expect(diff.missingCharCount).toBe(0);

    const statuses = ref.current?.getStatusSequence() ?? [];
    expect(statuses).toContain('streaming');
    expect(statuses[statuses.length - 1]).toBe('done');

    if (presetId === 'replace-tail') {
      expect(ref.current?.getStartCount()).toBeGreaterThanOrEqual(1);
      expect(ref.current?.getEndCount()).toBeGreaterThanOrEqual(1);
    } else {
      expect(ref.current?.getStartCount()).toBe(1);
      expect(ref.current?.getEndCount()).toBe(1);
    }
    expect(ref.current?.getRenderCommits()).toBeGreaterThan(0);
  });
});
