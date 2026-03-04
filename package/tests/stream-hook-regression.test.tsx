import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { useShikiStreamHighlighter } from '../src/index';
import type { ShikiStreamInput, StreamHighlighterResult } from '../src/lib/stream-types';
import type { Language, Theme, Themes } from '../src/lib/types';

const tokenizerMockState = vi.hoisted(() => ({
  delays: [] as number[],
  recallOverrides: new Map<number, number>(),
  enqueueCalls: [] as string[],
}));

vi.mock('shiki-stream', () => {
  const toTokens = (text: string) =>
    text.split('').map((content) => ({
      content,
      offset: 0,
      color: '#fff',
      fontStyle: 0,
      explanation: [],
    }));

  class MockShikiStreamTokenizer {
    private lastUnstableCodeChunk = '';
    private tokensUnstable: ReturnType<typeof toTokens> = [];

    clear() {
      this.lastUnstableCodeChunk = '';
      this.tokensUnstable = [];
    }

    close() {
      const stable = this.tokensUnstable;
      this.tokensUnstable = [];
      this.lastUnstableCodeChunk = '';
      return { stable, unstable: [] };
    }

    async enqueue(chunk: string) {
      tokenizerMockState.enqueueCalls.push(chunk);

      const combined = this.lastUnstableCodeChunk + chunk;
      const computedRecall = this.tokensUnstable.length;
      const callNumber = tokenizerMockState.enqueueCalls.length;
      const recall = tokenizerMockState.recallOverrides.get(callNumber) ?? computedRecall;

      const unstableText = chunk;
      const stableText = combined.slice(0, Math.max(0, combined.length - unstableText.length));

      const result = {
        recall,
        stable: toTokens(stableText),
        unstable: toTokens(unstableText),
      };

      // Intentionally mutate synchronously before Promise resolves.
      this.lastUnstableCodeChunk = unstableText;
      this.tokensUnstable = result.unstable;

      const delay = tokenizerMockState.delays[callNumber - 1] ?? 0;
      if (delay > 0) {
        return new Promise<typeof result>((resolve) => {
          setTimeout(() => resolve(result), delay);
        });
      }

      return result;
    }
  }

  return { ShikiStreamTokenizer: MockShikiStreamTokenizer };
});

interface StreamHarnessHandle {
  setInput: (value: ShikiStreamInput) => void;
  getResult: () => StreamHighlighterResult;
}

interface StreamHarnessProps {
  initialInput: ShikiStreamInput;
  initialLanguage?: Language;
  initialTheme?: Theme | Themes;
  batch?: 'sync' | 'raf' | number;
  allowRecalls?: boolean;
}

const mockHighlighter = {
  getLoadedLanguages: () => ['tsx', 'plaintext'],
} as any;

const StreamHarness = forwardRef<StreamHarnessHandle, StreamHarnessProps>(
  function StreamHarness(
    {
      initialInput,
      initialLanguage = 'tsx',
      initialTheme = 'github-dark',
      batch = 'sync',
      allowRecalls = true,
    },
    ref
  ) {
    const [input, setInput] = useState<ShikiStreamInput>(initialInput);

    const result = useShikiStreamHighlighter(input, initialLanguage, initialTheme, {
      highlighter: mockHighlighter,
      batch,
      allowRecalls,
    });

    useImperativeHandle(
      ref,
      () => ({
        setInput,
        getResult: () => result,
      }),
      [result]
    );

    return (
      <div>
        <span data-testid="content">{result.tokens.map((t) => t.content).join('')}</span>
        <span data-testid="status">{result.status}</span>
      </div>
    );
  }
);

beforeEach(() => {
  tokenizerMockState.delays = [];
  tokenizerMockState.recallOverrides.clear();
  tokenizerMockState.enqueueCalls = [];
});

describe('useShikiStreamHighlighter controlled code regressions', () => {
  test('keeps final content exact under rapid append updates without duplication', async () => {
    tokenizerMockState.delays = [0, 40, 0];

    const ref = React.createRef<StreamHarnessHandle>();
    const { getByTestId } = render(
      <StreamHarness
        ref={ref}
        initialInput={{ code: 'a' }}
      />
    );

    await waitFor(() => {
      expect(getByTestId('content').textContent).toBe('a');
    });

    await act(async () => {
      ref.current?.setInput({ code: 'ab' });
    });

    await act(async () => {
      ref.current?.setInput({ code: 'abc' });
    });

    await waitFor(
      () => {
        expect(getByTestId('content').textContent).toBe('abc');
      },
      { timeout: 2000 }
    );
  });

  test('recovers from recall desync without slicing stable tail', async () => {
    tokenizerMockState.recallOverrides.set(3, 2);

    const ref = React.createRef<StreamHarnessHandle>();
    const { getByTestId } = render(
      <StreamHarness
        ref={ref}
        initialInput={{ code: 'ab' }}
      />
    );

    await waitFor(() => {
      expect(getByTestId('content').textContent).toBe('ab');
    });

    await act(async () => {
      ref.current?.setInput({ code: 'abc' });
    });

    await waitFor(() => {
      expect(getByTestId('content').textContent).toBe('abc');
    });

    await act(async () => {
      ref.current?.setInput({ code: 'abcd' });
    });

    await waitFor(
      () => {
        expect(getByTestId('content').textContent).toBe('abcd');
      },
      { timeout: 2000 }
    );
  });
});
