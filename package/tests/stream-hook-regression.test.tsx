import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, test } from 'vitest';
import { getSingletonHighlighter, type Highlighter } from 'shiki';

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
      'markdown',
      'python',
      'json',
      'plaintext',
    ],
    themes: ['github-dark', 'github-light', 'tokyo-night'],
  });
}, 30000);

describe('useShikiStreamHighlighter regressions', () => {
  test('ignores stale append path after non-append restart', async () => {
    const ref = React.createRef<StreamHarnessHandle>();

    render(
      <StreamHarness
        ref={ref}
        highlighter={highlighter}
        initialInput={{ code: 'const alpha = 1;' }}
      />
    );

    await setCodeInput(ref, 'const alpha = 1;\nconst beta = 2;');
    await setCodeInput(ref, 'let z = 9;', true);

    await waitFor(() => {
      expect(ref.current?.getResult().status).toBe('done');
    });

    expect(readRenderedCode(ref)).toBe('let z = 9;');
  });

  test('handles completion race with trailing update', async () => {
    const ref = React.createRef<StreamHarnessHandle>();
    render(
      <StreamHarness
        ref={ref}
        highlighter={highlighter}
        initialInput={{ code: '' }}
      />
    );

    await setCodeInput(ref, 'const value');
    await setCodeInput(ref, 'const value = 42');
    await setCodeInput(ref, 'const value = 42;', true);

    await waitFor(() => {
      expect(ref.current?.getResult().status).toBe('done');
    });

    expect(readRenderedCode(ref)).toBe('const value = 42;');
  });

  test('language switch mid-stream resets cleanly', async () => {
    const ref = React.createRef<StreamHarnessHandle>();
    render(
      <StreamHarness
        ref={ref}
        highlighter={highlighter}
        initialInput={{ code: 'const a = 1;', isComplete: true }}
        initialLanguage="typescript"
      />
    );

    await waitFor(() => {
      expect(readRenderedCode(ref)).toContain('const a = 1;');
    });

    await act(async () => {
      ref.current?.setLanguage('markdown');
      ref.current?.setInput({ code: '# Header', isComplete: true });
    });
    await act(async () => {
      await flushReact();
    });

    await waitFor(() => {
      expect(ref.current?.getResult().status).toBe('done');
    });

    expect(readRenderedCode(ref)).toBe('# Header');
  });

  test('theme switch mid-stream keeps final content intact', async () => {
    const ref = React.createRef<StreamHarnessHandle>();
    render(
      <StreamHarness
        ref={ref}
        highlighter={highlighter}
        initialInput={{ code: 'print("a")' }}
        initialLanguage="python"
        initialTheme="github-dark"
      />
    );

    await act(async () => {
      ref.current?.setTheme('github-light');
      ref.current?.setInput({ code: 'print("abc")', isComplete: true });
    });

    await waitFor(() => {
      expect(ref.current?.getResult().status).toBe('done');
    });

    expect(readRenderedCode(ref)).toBe('print("abc")');
  });

  test('high-frequency append bursts finish without dropped text', async () => {
    const ref = React.createRef<StreamHarnessHandle>();
    const source =
      'function add(a, b) {\n  return a + b;\n}\nconsole.log(add(1, 2));\n';

    render(
      <StreamHarness
        ref={ref}
        highlighter={highlighter}
        initialInput={{ code: '' }}
        initialLanguage="typescript"
        allowRecalls
      />
    );

    for (let index = 1; index <= source.length; index += 1) {
      await setCodeInput(ref, source.slice(0, index), false);
    }

    await setCodeInput(ref, source, true);

    await waitFor(() => {
      expect(ref.current?.getResult().status).toBe('done');
    });

    expect(readRenderedCode(ref)).toBe(source);
  });
});
