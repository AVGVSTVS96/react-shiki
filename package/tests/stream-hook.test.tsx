import React, {
  forwardRef,
  useImperativeHandle,
  useState,
} from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { describe, test, beforeAll, expect } from 'vitest';
import { getSingletonHighlighter, type Highlighter } from 'shiki';

import { useShikiStreamHighlighter } from '../src/index';
import type { ShikiStreamInput, StreamHighlighterResult } from '../src/lib/stream-types';
import type { Language, Theme, Themes } from '../src/lib/types';
import {
  STREAMING_CODE_SAMPLE,
  createProgressiveStates,
} from './streaming-fixtures';

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

interface StreamHarnessHandle {
  setInput: (value: ShikiStreamInput) => void;
  setLanguage: (value: Language) => void;
  setTheme: (value: Theme | Themes) => void;
  getResult: () => StreamHighlighterResult;
}

interface StreamHarnessProps {
  highlighter: Highlighter;
  initialInput: ShikiStreamInput;
  initialLanguage?: Language;
  initialTheme?: Theme | Themes;
  batch?: 'sync' | 'raf' | number;
  allowRecalls?: boolean;
}

const StreamHarness = forwardRef<StreamHarnessHandle, StreamHarnessProps>(
  function StreamHarness(
    {
      highlighter,
      initialInput,
      initialLanguage = 'tsx',
      initialTheme = 'github-dark',
      batch = 'sync',
      allowRecalls = true,
    },
    ref
  ) {
    const [input, setInput] = useState<ShikiStreamInput>(initialInput);
    const [language, setLanguage] = useState<Language>(initialLanguage);
    const [theme, setTheme] = useState<Theme | Themes>(initialTheme);

    const result = useShikiStreamHighlighter(input, language, theme, {
      highlighter,
      batch,
      allowRecalls,
    });

    useImperativeHandle(
      ref,
      () => ({
        setInput,
        setLanguage,
        setTheme,
        getResult: () => result,
      }),
      [result]
    );

    return (
      <div data-testid="stream-output">
        <span data-testid="status">{result.status}</span>
        <span data-testid="token-count">{result.tokens.length}</span>
        <span data-testid="content">
          {result.tokens.map((t) => t.content).join('')}
        </span>
        {result.error && (
          <span data-testid="error">{result.error.message}</span>
        )}
      </div>
    );
  }
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const flushAll = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
};

const setInputState = async (
  ref: React.RefObject<StreamHarnessHandle | null>,
  nextInput: ShikiStreamInput
) => {
  await act(async () => {
    ref.current?.setInput(nextInput);
  });
  await flushAll();
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

let highlighter: Highlighter;

beforeAll(async () => {
  highlighter = await getSingletonHighlighter({
    langs: ['tsx', 'typescript', 'markdown', 'plaintext'],
    themes: ['github-dark', 'github-light'],
  });
}, 30000);

describe('useShikiStreamHighlighter', () => {
  test('renders tokens for basic code input', async () => {
    const ref = React.createRef<StreamHarnessHandle>();
    const { getByTestId } = render(
      <StreamHarness
        ref={ref}
        highlighter={highlighter}
        initialInput={{ code: 'const x = 1;' }}
      />
    );

    await waitFor(
      () => {
        const tokenCount = Number(getByTestId('token-count').textContent);
        expect(tokenCount).toBeGreaterThan(0);
      },
      { timeout: 5000 }
    );

    expect(getByTestId('content').textContent).toContain('const');
    expect(getByTestId('content').textContent).toContain('x');
  });

  test('transitions status to streaming on code input', async () => {
    const ref = React.createRef<StreamHarnessHandle>();
    const { getByTestId } = render(
      <StreamHarness
        ref={ref}
        highlighter={highlighter}
        initialInput={{ code: 'const x = 1;' }}
      />
    );

    await waitFor(
      () => {
        const status = getByTestId('status').textContent;
        expect(status).toBe('streaming');
      },
      { timeout: 5000 }
    );
  });

  test('transitions to done status when isComplete is true', async () => {
    const ref = React.createRef<StreamHarnessHandle>();
    const { getByTestId } = render(
      <StreamHarness
        ref={ref}
        highlighter={highlighter}
        initialInput={{ code: 'const x = 1;', isComplete: true }}
      />
    );

    await waitFor(
      () => {
        expect(getByTestId('status').textContent).toBe('done');
      },
      { timeout: 5000 }
    );
  });

  test('handles append-only code updates incrementally', async () => {
    const ref = React.createRef<StreamHarnessHandle>();
    const { getByTestId } = render(
      <StreamHarness
        ref={ref}
        highlighter={highlighter}
        initialInput={{ code: 'const ' }}
      />
    );

    await waitFor(
      () => {
        expect(Number(getByTestId('token-count').textContent)).toBeGreaterThan(0);
      },
      { timeout: 5000 }
    );

    // Append more code
    await setInputState(ref, { code: 'const x = 1;' });

    await waitFor(() => {
      expect(getByTestId('content').textContent).toContain('const');
      expect(getByTestId('content').textContent).toContain('1');
    });
  });

  test('handles non-append (edit) code updates via reset', async () => {
    const ref = React.createRef<StreamHarnessHandle>();
    const { getByTestId } = render(
      <StreamHarness
        ref={ref}
        highlighter={highlighter}
        initialInput={{ code: 'const x = 1;' }}
      />
    );

    await waitFor(
      () => {
        expect(Number(getByTestId('token-count').textContent)).toBeGreaterThan(0);
      },
      { timeout: 5000 }
    );

    // Replace with completely different code (non-append)
    await setInputState(ref, { code: 'let y = 2;' });

    await waitFor(() => {
      const content = getByTestId('content').textContent;
      expect(content).toContain('let');
      expect(content).toContain('y');
      expect(content).not.toContain('const');
    });
  });

  test('resets state when reset() is called', async () => {
    const ref = React.createRef<StreamHarnessHandle>();
    const { getByTestId } = render(
      <StreamHarness
        ref={ref}
        highlighter={highlighter}
        initialInput={{ code: 'const x = 1;' }}
      />
    );

    await waitFor(
      () => {
        expect(Number(getByTestId('token-count').textContent)).toBeGreaterThan(0);
      },
      { timeout: 5000 }
    );

    // Call reset
    await act(async () => {
      ref.current?.getResult().reset();
    });
    await flushAll();

    expect(getByTestId('status').textContent).toBe('idle');
    expect(Number(getByTestId('token-count').textContent)).toBe(0);
  });

  test('handles empty code input', async () => {
    const ref = React.createRef<StreamHarnessHandle>();
    const { getByTestId } = render(
      <StreamHarness
        ref={ref}
        highlighter={highlighter}
        initialInput={{ code: '' }}
      />
    );

    // Should not crash — tokens remain empty
    await flushAll();
    expect(Number(getByTestId('token-count').textContent)).toBe(0);
  });

  test('rebuilds tokenizer on language change', async () => {
    const ref = React.createRef<StreamHarnessHandle>();
    const { getByTestId } = render(
      <StreamHarness
        ref={ref}
        highlighter={highlighter}
        initialInput={{ code: 'const x = 1;' }}
        initialLanguage="tsx"
      />
    );

    await waitFor(
      () => {
        expect(Number(getByTestId('token-count').textContent)).toBeGreaterThan(0);
      },
      { timeout: 5000 }
    );

    // Switch language
    await act(async () => {
      ref.current?.setLanguage('markdown');
      ref.current?.setInput({ code: '# Hello' });
    });
    await flushAll();

    await waitFor(() => {
      expect(getByTestId('content').textContent).toContain('Hello');
    });
  });

  test('handles progressive append-only streaming', async () => {
    const states = createProgressiveStates(STREAMING_CODE_SAMPLE, 20, 42);
    const ref = React.createRef<StreamHarnessHandle>();

    render(
      <StreamHarness
        ref={ref}
        highlighter={highlighter}
        initialInput={{ code: states[0] }}
      />
    );

    // Wait for initial render
    await waitFor(
      () => {
        expect(Number(ref.current?.getResult().tokens.length)).toBeGreaterThan(0);
      },
      { timeout: 5000 }
    );

    // Feed progressive states
    for (const state of states.slice(1)) {
      await setInputState(ref, { code: state });
    }

    // Mark complete
    const finalCode = states[states.length - 1];
    await setInputState(ref, { code: finalCode, isComplete: true });

    await waitFor(
      () => {
        expect(ref.current?.getResult().status).toBe('done');
      },
      { timeout: 5000 }
    );

    // Verify final content contains the code text
    const finalContent = ref.current
      ?.getResult()
      .tokens.map((t) => t.content)
      .join('');
    expect(finalContent).toContain('import React');
  });

  test('handles ReadableStream input', async () => {
    const chunks = ['const ', 'x ', '= 1;'];
    const stream = new ReadableStream<string>({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });

    const ref = React.createRef<StreamHarnessHandle>();
    const { getByTestId } = render(
      <StreamHarness
        ref={ref}
        highlighter={highlighter}
        initialInput={{ stream }}
      />
    );

    await waitFor(
      () => {
        expect(getByTestId('status').textContent).toBe('done');
      },
      { timeout: 5000 }
    );

    expect(getByTestId('content').textContent).toContain('const');
  });

  test('handles AsyncIterable input', async () => {
    async function* generateChunks() {
      yield 'const ';
      yield 'x ';
      yield '= 1;';
    }

    const ref = React.createRef<StreamHarnessHandle>();
    const { getByTestId } = render(
      <StreamHarness
        ref={ref}
        highlighter={highlighter}
        initialInput={{ chunks: generateChunks() }}
      />
    );

    await waitFor(
      () => {
        expect(getByTestId('status').textContent).toBe('done');
      },
      { timeout: 5000 }
    );

    expect(getByTestId('content').textContent).toContain('const');
  });
});
