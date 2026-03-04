import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { describe, test, beforeAll, expect } from 'vitest';
import { getSingletonHighlighter, type Highlighter } from 'shiki';

import { useShikiStreamHighlighter } from '../src/index';
import type {
  ShikiStreamInput,
  StreamHighlighterResult,
} from '../src/lib/stream-types';
import type { Language, Theme, Themes } from '../src/lib/types';

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
}

const StreamHarness = forwardRef<StreamHarnessHandle, StreamHarnessProps>(
  function StreamHarness(
    {
      highlighter,
      initialInput,
      initialLanguage = 'tsx',
      initialTheme = 'github-dark',
    },
    ref
  ) {
    const [input, setInput] = useState<ShikiStreamInput>(initialInput);
    const [language, setLanguage] = useState<Language>(initialLanguage);
    const [theme, setTheme] = useState<Theme | Themes>(initialTheme);

    const result = useShikiStreamHighlighter(input, language, theme, {
      highlighter,
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

const tokensToText = (result: StreamHighlighterResult) =>
  result.tokens.map((t) => t.content).join('');

const streamFromChunks = (chunks: string[]) =>
  new ReadableStream<string>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });

let highlighter: Highlighter;

beforeAll(async () => {
  highlighter = await getSingletonHighlighter({
    langs: [
      'tsx',
      'typescript',
      'markdown',
      'plaintext',
      'php',
      'ruby',
      'swift',
      'go',
    ],
    themes: ['github-dark', 'github-light', 'tokyo-night'],
  });
}, 30000);

describe('useShikiStreamHighlighter', () => {
  test('append-only code mode preserves exact final output with no duplicates', async () => {
    const source = 'const x = 1';
    const ref = React.createRef<StreamHarnessHandle>();
    render(
      <StreamHarness
        ref={ref}
        highlighter={highlighter}
        initialInput={{ code: '' }}
      />
    );

    for (let i = 1; i <= source.length; i += 1) {
      await setInputState(ref, {
        code: source.slice(0, i),
        isComplete: i === source.length,
      });
    }

    await waitFor(() => {
      expect(ref.current?.getResult().status).toBe('done');
    });

    const text = tokensToText(ref.current!.getResult());
    expect(text).toBe(source);
    expect(text.match(/const/g)?.length ?? 0).toBe(1);
  });

  test('non-append code changes restart and replace prior content', async () => {
    const ref = React.createRef<StreamHarnessHandle>();
    render(
      <StreamHarness
        ref={ref}
        highlighter={highlighter}
        initialInput={{ code: 'const x' }}
      />
    );

    await waitFor(() => {
      expect(tokensToText(ref.current!.getResult())).toContain('const x');
    });

    await setInputState(ref, { code: 'let y', isComplete: true });

    await waitFor(() => {
      expect(ref.current?.getResult().status).toBe('done');
      expect(tokensToText(ref.current!.getResult())).toBe('let y');
    });
  });

  test.each([
    ['php', '<?php\n$answer = 42;\n'],
    ['ruby', 'answer = 42\nputs answer\n'],
    ['swift', 'let answer = 42\nprint(answer)\n'],
    ['go', 'package main\nfunc main() { println(42) }\n'],
    ['typescript', 'const answer: number = 42\n'],
  ] as const)('small-block streaming highlights reliably for %s', async (language, source) => {
    const ref = React.createRef<StreamHarnessHandle>();
    render(
      <StreamHarness
        ref={ref}
        highlighter={highlighter}
        initialInput={{ code: '' }}
        initialLanguage={language}
        initialTheme="tokyo-night"
      />
    );

    for (let i = 1; i <= source.length; i += 1) {
      await setInputState(ref, {
        code: source.slice(0, i),
        isComplete: i === source.length,
      });
    }

    await waitFor(() => {
      expect(ref.current?.getResult().status).toBe('done');
    });

    const result = ref.current!.getResult();
    expect(tokensToText(result)).toBe(source);
    expect(
      result.tokens.some((t) => Boolean(t.color || t.htmlStyle))
    ).toBe(true);
  });

  test('stream input and code input produce same final output', async () => {
    const source = 'const streamValue = 1;\nconsole.log(streamValue);\n';
    const chunks = [
      'const stream',
      'Value = 1;\n',
      'console.log(streamValue);\n',
    ];

    const codeRef = React.createRef<StreamHarnessHandle>();
    const streamRef = React.createRef<StreamHarnessHandle>();

    render(
      <>
        <StreamHarness
          ref={codeRef}
          highlighter={highlighter}
          initialInput={{ code: source, isComplete: true }}
        />
        <StreamHarness
          ref={streamRef}
          highlighter={highlighter}
          initialInput={{ stream: streamFromChunks(chunks) }}
        />
      </>
    );

    await waitFor(() => {
      expect(codeRef.current?.getResult().status).toBe('done');
      expect(streamRef.current?.getResult().status).toBe('done');
    });

    expect(tokensToText(codeRef.current!.getResult())).toBe(source);
    expect(tokensToText(streamRef.current!.getResult())).toBe(source);
  });

  test('chunks input and code input produce same final output', async () => {
    const source = 'const chunkValue = 2;\nconsole.log(chunkValue);\n';

    async function* generateChunks() {
      yield 'const chunk';
      yield 'Value = 2;\n';
      yield 'console.log(chunkValue);\n';
    }

    const codeRef = React.createRef<StreamHarnessHandle>();
    const chunksRef = React.createRef<StreamHarnessHandle>();

    render(
      <>
        <StreamHarness
          ref={codeRef}
          highlighter={highlighter}
          initialInput={{ code: source, isComplete: true }}
        />
        <StreamHarness
          ref={chunksRef}
          highlighter={highlighter}
          initialInput={{ chunks: generateChunks() }}
        />
      </>
    );

    await waitFor(() => {
      expect(codeRef.current?.getResult().status).toBe('done');
      expect(chunksRef.current?.getResult().status).toBe('done');
    });

    expect(tokensToText(codeRef.current!.getResult())).toBe(source);
    expect(tokensToText(chunksRef.current!.getResult())).toBe(source);
  });
});
