import React, {
  forwardRef,
  useImperativeHandle,
  useState,
} from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { describe, test, beforeAll, expect } from 'vitest';
import {
  getSingletonHighlighter,
  type CodeToHastOptions,
  type Highlighter,
} from 'shiki';

import { useShikiHighlighter } from '../src/index';
import type { Language, Theme, Themes } from '../src/lib/types';
import {
  STREAMING_CODE_SAMPLE,
  createInstrumentedHighlighter,
  createProgressiveStates,
  runSequential,
  summarizeSession,
} from './streaming-fixtures';

interface StreamingHarnessHandle {
  setCode: (value: string) => void;
  setLanguage: (value: Language) => void;
  setTheme: (value: Theme | Themes) => void;
}

interface StreamingHarnessProps {
  highlighter: Highlighter;
  initialCode: string;
  initialLanguage?: Language;
  initialTheme?: Theme | Themes;
  outputFormat: 'react' | 'html';
}

const StreamingHarness = forwardRef<
  StreamingHarnessHandle,
  StreamingHarnessProps
>(function StreamingHarness(
  {
    highlighter,
    initialCode,
    initialLanguage = 'tsx',
    initialTheme = 'github-dark',
    outputFormat,
  },
  ref
) {
  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [theme, setTheme] = useState<Theme | Themes>(initialTheme);

  const highlighted = useShikiHighlighter(code, language, theme, {
    highlighter,
    outputFormat,
  });

  useImperativeHandle(
    ref,
    () => ({
      setCode,
      setLanguage,
      setTheme,
    }),
    []
  );

  if (outputFormat === 'html' && typeof highlighted === 'string') {
    return (
      <div data-testid="highlighted">
        <div dangerouslySetInnerHTML={{ __html: highlighted }} />
      </div>
    );
  }

  return <div data-testid="highlighted">{highlighted}</div>;
});

const flushEffects = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

const setCodeState = async (
  ref: React.RefObject<StreamingHarnessHandle | null>,
  nextCode: string
) => {
  await act(async () => {
    ref.current?.setCode(nextCode);
  });
  await flushEffects();
};

let highlighter: Highlighter;

beforeAll(async () => {
  highlighter = await getSingletonHighlighter({
    langs: ['tsx', 'markdown', 'plaintext'],
    themes: ['github-dark', 'github-light'],
  });
}, 30000);

describe('streaming profiling (deterministic correctness + work metrics)', () => {
  test('append-only stream matches one-shot final output (html mode)', async () => {
    const states = createProgressiveStates(STREAMING_CODE_SAMPLE, 80, 7);
    const ref = React.createRef<StreamingHarnessHandle>();
    const inst = createInstrumentedHighlighter(highlighter);

    const { getByTestId } = render(
      <StreamingHarness
        ref={ref}
        highlighter={inst.highlighter}
        initialCode={states[0]}
        outputFormat="html"
      />
    );

    await runSequential(states.slice(1), async (state) => {
      await setCodeState(ref, state);
    });

    await waitFor(() => {
      expect(inst.stats.htmlCalls).toBe(states.length);
    });

    const finalCode = states[states.length - 1] ?? '';
    const options: CodeToHastOptions = {
      lang: 'tsx',
      theme: 'github-dark',
    };
    const expectedHtml = highlighter.codeToHtml(finalCode, options);
    const expectedNode = document.createElement('div');
    expectedNode.innerHTML = expectedHtml;

    expect(getByTestId('highlighted').textContent).toBe(
      expectedNode.textContent
    );

    inst.restore();
  });

  test('append-only stream shows >1x work amplification in react mode', async () => {
    const states = createProgressiveStates(STREAMING_CODE_SAMPLE, 120, 13);
    const ref = React.createRef<StreamingHarnessHandle>();
    const inst = createInstrumentedHighlighter(highlighter);

    render(
      <StreamingHarness
        ref={ref}
        highlighter={inst.highlighter}
        initialCode={states[0]}
        outputFormat="react"
      />
    );

    await runSequential(states.slice(1), async (state) => {
      await setCodeState(ref, state);
    });

    await waitFor(() => {
      expect(inst.stats.hastCalls).toBe(states.length);
    });

    const finalCode = states[states.length - 1] ?? '';
    const summary = summarizeSession({
      scenario: 'append-sequential-120',
      variant: 'full-react',
      totalCalls: inst.stats.hastCalls,
      totalCharsProcessed: inst.stats.hastChars,
      durationsMs: inst.stats.hastDurationsMs,
      finalCodeLength: finalCode.length,
    });

    expect(summary.workAmplification).toBeGreaterThan(2);
    expect(summary.totalCharsProcessed).toBeGreaterThan(finalCode.length);

    inst.restore();
  });

  test('non-append reset/edit remains correct against one-shot output', async () => {
    const states = createProgressiveStates(STREAMING_CODE_SAMPLE, 40, 23);
    const ref = React.createRef<StreamingHarnessHandle>();
    const inst = createInstrumentedHighlighter(highlighter);
    const { getByTestId } = render(
      <StreamingHarness
        ref={ref}
        highlighter={inst.highlighter}
        initialCode={states[0]}
        outputFormat="html"
      />
    );

    await runSequential(states.slice(1), async (state) => {
      await setCodeState(ref, state);
    });

    const editedCode = `const reset = true;\nconsole.log(reset);\n`;
    await setCodeState(ref, editedCode);

    const options: CodeToHastOptions = {
      lang: 'tsx',
      theme: 'github-dark',
    };
    const expectedHtml = highlighter.codeToHtml(editedCode, options);
    const expectedNode = document.createElement('div');
    expectedNode.innerHTML = expectedHtml;

    expect(getByTestId('highlighted').textContent).toBe(
      expectedNode.textContent
    );
    expect(inst.stats.htmlCalls).toBeGreaterThan(states.length);

    inst.restore();
  });

  test('language and theme switches stay correct', async () => {
    const ref = React.createRef<StreamingHarnessHandle>();
    const inst = createInstrumentedHighlighter(highlighter);
    const { getByTestId } = render(
      <StreamingHarness
        ref={ref}
        highlighter={inst.highlighter}
        initialCode={'const value = 1;'}
        outputFormat="html"
      />
    );

    await act(async () => {
      ref.current?.setLanguage('markdown');
      ref.current?.setTheme('github-light');
      ref.current?.setCode('```ts\nconst a = 1\n```');
    });
    await flushEffects();

    const expectedHtml = highlighter.codeToHtml('```ts\nconst a = 1\n```', {
      lang: 'markdown',
      theme: 'github-light',
    });
    const expectedNode = document.createElement('div');
    expectedNode.innerHTML = expectedHtml;

    expect(getByTestId('highlighted').textContent).toBe(
      expectedNode.textContent
    );
    expect(inst.stats.htmlCalls).toBeGreaterThan(0);

    inst.restore();
  });

  test.skip(
    'incremental (shiki-stream) should reduce work amplification on append-only sessions',
    () => {}
  );
});

