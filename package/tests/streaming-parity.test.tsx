import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, test } from 'vitest';
import { getSingletonHighlighter, type Highlighter } from 'shiki';

import {
  buildControlledCodeStates,
  compareStructuralHighlight,
  createAsyncCodeIterableFromScenario,
  createReadableCodeStreamFromScenario,
  createStreamingScenario,
  extractFinalCode,
  getStreamingCorpus,
  normalizePlainText,
} from '../src/dev/streaming-lab';
import {
  StreamHarness,
  type StreamHarnessHandle,
  flushReact,
} from './streaming-test-harness';

const setCodeInput = async (
  ref: React.RefObject<StreamHarnessHandle | null>,
  code: string,
  isComplete = false
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

const readRenderedHtml = (
  ref: React.RefObject<StreamHarnessHandle | null>
) => ref.current?.getRenderedHtml() ?? '';

const baselinePlainText = (
  highlighter: Highlighter,
  code: string,
  language: string,
  theme: string
) => {
  const html = highlighter.codeToHtml(code, { lang: language, theme });
  const node = document.createElement('div');
  node.innerHTML = html;
  return node.textContent ?? '';
};

const baselineHighlightedHtml = (
  highlighter: Highlighter,
  code: string,
  language: string,
  theme: string
) => highlighter.codeToHtml(code, { lang: language, theme });

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
    themes: ['github-dark', 'github-light'],
  });
}, 30000);

describe('streaming final output parity', () => {
  test.each([
    ['openai-steady', 'tsx-chat-ui'],
    ['anthropic-bursty', 'python-snippet'],
    ['prose-code-prose', 'json-tool-payload'],
  ] as const)(
    '%s append-only scenario matches one-shot baseline across inputs',
    async (presetId, corpusId) => {
      const scenario = createStreamingScenario({
        presetId,
        corpusId,
        seed: 303,
      });

      const language = getStreamingCorpus(corpusId).language;
      const finalCode = extractFinalCode(scenario.events);
      const baseline = baselinePlainText(
        highlighter,
        finalCode,
        language,
        'github-dark'
      );
      const baselineHtml = baselineHighlightedHtml(
        highlighter,
        finalCode,
        language,
        'github-dark'
      );

      const controlledRef = React.createRef<StreamHarnessHandle>();
      render(
        <StreamHarness
          ref={controlledRef}
          highlighter={highlighter}
          initialLanguage={language}
          initialTheme="github-dark"
          initialInput={{ code: '' }}
        />
      );

      for (const state of buildControlledCodeStates(
        scenario.events
      ).slice(1)) {
        await setCodeInput(controlledRef, state.code, state.isComplete);
      }

      await waitFor(() => {
        expect(controlledRef.current?.getResult().status).toBe('done');
      });

      const streamRef = React.createRef<StreamHarnessHandle>();
      render(
        <StreamHarness
          ref={streamRef}
          highlighter={highlighter}
          initialLanguage={language}
          initialTheme="github-dark"
          initialInput={{
            stream: createReadableCodeStreamFromScenario(scenario.events),
          }}
        />
      );

      await waitFor(() => {
        expect(streamRef.current?.getResult().status).toBe('done');
      });

      await waitFor(() => {
        expect(normalizePlainText(readRenderedCode(streamRef))).toBe(
          normalizePlainText(baseline)
        );
      });

      const chunksRef = React.createRef<StreamHarnessHandle>();
      render(
        <StreamHarness
          ref={chunksRef}
          highlighter={highlighter}
          initialLanguage={language}
          initialTheme="github-dark"
          initialInput={{
            chunks: createAsyncCodeIterableFromScenario(scenario.events),
          }}
        />
      );

      await waitFor(() => {
        expect(chunksRef.current?.getResult().status).toBe('done');
      });

      await waitFor(() => {
        expect(normalizePlainText(readRenderedCode(chunksRef))).toBe(
          normalizePlainText(baseline)
        );
      });

      expect(normalizePlainText(readRenderedCode(controlledRef))).toBe(
        normalizePlainText(baseline)
      );
      expect(normalizePlainText(readRenderedCode(streamRef))).toBe(
        normalizePlainText(baseline)
      );
      expect(normalizePlainText(readRenderedCode(chunksRef))).toBe(
        normalizePlainText(baseline)
      );

      expect(
        compareStructuralHighlight(
          readRenderedHtml(controlledRef),
          baselineHtml
        ).looksPlainTextFallback
      ).toBe(false);
      expect(
        compareStructuralHighlight(
          readRenderedHtml(streamRef),
          baselineHtml
        ).looksPlainTextFallback
      ).toBe(false);
      expect(
        compareStructuralHighlight(
          readRenderedHtml(chunksRef),
          baselineHtml
        ).looksPlainTextFallback
      ).toBe(false);
    },
    15000
  );

  test('replace-tail edit scenario recovers to final one-shot baseline', async () => {
    const scenario = createStreamingScenario({
      presetId: 'replace-tail',
      corpusId: 'markdown-fenced-mixed',
      seed: 404,
    });

    const language = getStreamingCorpus('markdown-fenced-mixed').language;
    const finalCode = extractFinalCode(scenario.events);
    const baseline = baselinePlainText(
      highlighter,
      finalCode,
      language,
      'github-dark'
    );
    const baselineHtml = baselineHighlightedHtml(
      highlighter,
      finalCode,
      language,
      'github-dark'
    );

    const ref = React.createRef<StreamHarnessHandle>();
    render(
      <StreamHarness
        ref={ref}
        highlighter={highlighter}
        initialLanguage={language}
        initialTheme="github-dark"
        initialInput={{ code: '' }}
      />
    );

    for (const state of buildControlledCodeStates(scenario.events).slice(
      1
    )) {
      await setCodeInput(ref, state.code, state.isComplete);
    }

    await waitFor(() => {
      expect(ref.current?.getResult().status).toBe('done');
    });

    expect(normalizePlainText(readRenderedCode(ref))).toBe(
      normalizePlainText(baseline)
    );
    expect(
      compareStructuralHighlight(readRenderedHtml(ref), baselineHtml)
        .looksPlainTextFallback
    ).toBe(false);
    expect(
      ref.current
        ?.getSessionSummaries()
        .filter((summary) => summary.reason === 'restart').length
    ).toBeGreaterThanOrEqual(1);
  }, 15000);
});
