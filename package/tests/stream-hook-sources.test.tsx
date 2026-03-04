import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, test } from 'vitest';
import { getSingletonHighlighter, type Highlighter } from 'shiki';

import {
  createAsyncCodeIterableFromScenario,
  createReadableCodeStreamFromScenario,
  createStreamingScenario,
  extractFinalCode,
  getStreamingCorpus,
} from '../src/dev/streaming-lab';
import {
  StreamHarness,
  type StreamHarnessHandle,
} from './streaming-test-harness';

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

describe('useShikiStreamHighlighter stream source parity', () => {
  test.each([
    ['openai-steady', 'tsx-chat-ui'],
    ['anthropic-bursty', 'python-snippet'],
    ['prose-code-prose', 'json-tool-payload'],
  ] as const)('%s scenario keeps parity across ReadableStream and AsyncIterable', async (presetId, corpusId) => {
    const scenario = createStreamingScenario({
      presetId,
      corpusId,
      seed: 44,
    });

    const expected = extractFinalCode(scenario.events);
    const language = getStreamingCorpus(corpusId).language;

    const streamRef = React.createRef<StreamHarnessHandle>();
    const chunksRef = React.createRef<StreamHarnessHandle>();

    render(
      <>
        <StreamHarness
          ref={streamRef}
          highlighter={highlighter}
          initialLanguage={language}
          initialTheme="github-dark"
          initialInput={{
            stream: createReadableCodeStreamFromScenario(scenario.events),
          }}
        />
        <StreamHarness
          ref={chunksRef}
          highlighter={highlighter}
          initialLanguage={language}
          initialTheme="github-dark"
          initialInput={{
            chunks: createAsyncCodeIterableFromScenario(scenario.events),
          }}
        />
      </>
    );

    await waitFor(() => {
      expect(streamRef.current?.getResult().status).toBe('done');
      expect(chunksRef.current?.getResult().status).toBe('done');
    });

    expect(readRenderedCode(streamRef)).toBe(expected);
    expect(readRenderedCode(chunksRef)).toBe(expected);
  });
});
