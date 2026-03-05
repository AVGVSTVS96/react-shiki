import type React from 'react';
import { StrictMode, useCallback, useMemo } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, test } from 'vitest';
import { getSingletonHighlighter, type Highlighter } from 'shiki';

import {
  ShikiTokenRenderer,
  useShikiStreamHighlighter,
  type StreamSessionSummary,
} from '../src/index';
import {
  buildMarkdownStates,
  compareStructuralHighlight,
  createStreamingScenario,
  extractFencedCodeBlocks,
  normalizePlainText,
  parseTranscriptNodes,
} from '../src/dev/streaming-lab';

type ChatTreeProps = {
  transcript: string;
  highlighter: Highlighter;
  freshOptionsNonce: number;
  remountSalt: string;
  onSummary: (blockIndex: number, summary: StreamSessionSummary) => void;
};

const ChatCodeBlock = ({
  blockIndex,
  code,
  language,
  highlighter,
  isComplete,
  freshOptionsNonce,
  onSummary,
}: {
  blockIndex: number;
  code: string;
  language: string;
  highlighter: Highlighter;
  isComplete: boolean;
  freshOptionsNonce: number;
  onSummary: (blockIndex: number, summary: StreamSessionSummary) => void;
}) => {
  const stableSummary = useCallback(
    (summary: StreamSessionSummary) => {
      onSummary(blockIndex, summary);
    },
    [blockIndex, onSummary]
  );
  const stableOptions = useMemo(
    () => ({
      highlighter,
      allowRecalls: true,
      onSessionSummary: stableSummary,
    }),
    [highlighter, stableSummary]
  );
  const options =
    freshOptionsNonce > 0 ? { ...stableOptions } : stableOptions;

  const result = useShikiStreamHighlighter(
    { code, isComplete },
    language || 'plaintext',
    'github-dark',
    options
  );

  return (
    <div
      data-testid={`chat-block-${blockIndex}`}
      data-language={language || 'plaintext'}
      data-status={result.status}
    >
      <ShikiTokenRenderer tokens={result.tokens} />
    </div>
  );
};

const ChatTreeHarness = ({
  transcript,
  highlighter,
  freshOptionsNonce,
  remountSalt,
  onSummary,
}: ChatTreeProps) => {
  const nodes = parseTranscriptNodes(transcript);
  const keyCounts = new Map<string, number>();

  const nextKey = (base: string): string => {
    const count = keyCounts.get(base) ?? 0;
    keyCounts.set(base, count + 1);
    return `${base}:${count}`;
  };

  return (
    <article data-testid="chat-tree">
      {nodes.map((node) => {
        if (node.type === 'text') {
          return (
            <span key={nextKey(`text:${node.value}`)}>{node.value}</span>
          );
        }

        if (node.type === 'inline-code') {
          return (
            <code key={nextKey(`inline:${node.value}`)}>
              {node.value}
            </code>
          );
        }

        return (
          <ChatCodeBlock
            key={`${remountSalt}:block:${node.block.index}`}
            blockIndex={node.block.index}
            code={node.block.code}
            language={node.block.language || 'plaintext'}
            highlighter={highlighter}
            isComplete={node.block.closed}
            freshOptionsNonce={freshOptionsNonce}
            onSummary={onSummary}
          />
        );
      })}
    </article>
  );
};

const pushSummary = (
  store: Map<number, StreamSessionSummary[]>,
  blockIndex: number,
  summary: StreamSessionSummary
) => {
  const current = store.get(blockIndex) ?? [];
  current.push(summary);
  store.set(blockIndex, current);
};

const countRestarts = (store: Map<number, StreamSessionSummary[]>) =>
  [...store.values()]
    .flat()
    .filter((summary) => summary.reason === 'restart').length;

const runTranscriptPlayback = async ({
  states,
  highlighter,
  useStrictMode = false,
  remountKeyChurn = false,
  freshOptionsRerender = false,
  transformState,
}: {
  states: string[];
  highlighter: Highlighter;
  useStrictMode?: boolean;
  remountKeyChurn?: boolean;
  freshOptionsRerender?: boolean;
  transformState?: (state: string, index: number) => string;
}) => {
  const summaryStore = new Map<number, StreamSessionSummary[]>();

  const transformedStates = states.map((state, index) =>
    transformState ? transformState(state, index) : state
  );

  const renderTree = (
    transcript: string,
    index: number
  ): React.ReactElement => {
    const tree = (
      <ChatTreeHarness
        transcript={transcript}
        highlighter={highlighter}
        freshOptionsNonce={freshOptionsRerender ? index : 0}
        remountSalt={remountKeyChurn ? `step:${index}` : 'stable'}
        onSummary={(blockIndex, summary) => {
          pushSummary(summaryStore, blockIndex, summary);
        }}
      />
    );

    if (useStrictMode) {
      return <StrictMode>{tree}</StrictMode>;
    }

    return tree;
  };

  const initial = transformedStates[0] ?? '';
  const rendered = render(renderTree(initial, 0));

  for (let index = 1; index < transformedStates.length; index += 1) {
    rendered.rerender(renderTree(transformedStates[index] ?? '', index));
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    });
  }

  const finalTranscript =
    transformedStates[transformedStates.length - 1] ?? '';
  const expectedBlocks = extractFencedCodeBlocks(finalTranscript);

  await waitFor(() => {
    expectedBlocks.forEach((block) => {
      const node = rendered.getByTestId(`chat-block-${block.index}`);
      expect(node.getAttribute('data-status')).toBe('done');
    });
  });

  return {
    expectedBlocks,
    summaryStore,
    ...rendered,
  };
};

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

describe('chat-tree streaming integration', () => {
  test('prose-code-prose ends highlighted with zero restart events', async () => {
    const scenario = createStreamingScenario({
      presetId: 'prose-code-prose',
      corpusId: 'tsx-chat-ui',
      seed: 21,
    });

    const playback = await runTranscriptPlayback({
      states: buildMarkdownStates(scenario.events),
      highlighter,
    });

    expect(playback.expectedBlocks).toHaveLength(1);
    expect(countRestarts(playback.summaryStore)).toBe(0);

    for (const block of playback.expectedBlocks) {
      const node = playback.getByTestId(`chat-block-${block.index}`);
      const renderedText = normalizePlainText(node.textContent ?? '');
      const expectedText = normalizePlainText(block.code);
      const baselineHtml = highlighter.codeToHtml(block.code, {
        lang: block.language || 'plaintext',
        theme: 'github-dark',
      });
      const comparison = compareStructuralHighlight(
        node.innerHTML,
        baselineHtml
      );

      expect(renderedText).toBe(expectedText);
      expect(comparison.looksPlainTextFallback).toBe(false);
    }
  }, 15000);

  test('two fenced blocks and inline code keep per-block integrity', async () => {
    const states = [
      'Here is `inline` context.\n\n```tsx\n',
      'Here is `inline` context.\n\n```tsx\nconst alpha = 1;\n```\n\nAlso `inline` again.\n\n```json\n',
      'Here is `inline` context.\n\n```tsx\nconst alpha = 1;\n```\n\nAlso `inline` again.\n\n```json\n{\n  "ok": true\n}\n```',
    ];

    const playback = await runTranscriptPlayback({
      states,
      highlighter,
      useStrictMode: true,
    });

    expect(playback.expectedBlocks).toHaveLength(2);
    expect(countRestarts(playback.summaryStore)).toBe(0);

    for (const block of playback.expectedBlocks) {
      const node = playback.getByTestId(`chat-block-${block.index}`);
      const baselineHtml = highlighter.codeToHtml(block.code, {
        lang: block.language || 'plaintext',
        theme: 'github-dark',
      });

      expect(
        normalizePlainText(node.textContent ?? '').length
      ).toBeGreaterThan(0);
      expect(
        compareStructuralHighlight(node.innerHTML, baselineHtml)
          .looksPlainTextFallback
      ).toBe(false);
    }
  }, 15000);

  test('delayed-fence-language and fresh options rerenders keep integrity', async () => {
    const scenario = createStreamingScenario({
      presetId: 'delayed-fence-language',
      corpusId: 'markdown-fenced-mixed',
      seed: 33,
    });

    const playback = await runTranscriptPlayback({
      states: buildMarkdownStates(scenario.events),
      highlighter,
      freshOptionsRerender: true,
    });

    expect(playback.expectedBlocks).toHaveLength(1);
    expect(countRestarts(playback.summaryStore)).toBe(0);

    const block = playback.expectedBlocks[0]!;
    const node = playback.getByTestId(`chat-block-${block.index}`);
    const baselineHtml = highlighter.codeToHtml(block.code, {
      lang: block.language || 'plaintext',
      theme: 'github-dark',
    });

    expect(normalizePlainText(node.textContent ?? '')).toBe(
      normalizePlainText(block.code)
    );
    expect(
      compareStructuralHighlight(node.innerHTML, baselineHtml)
        .looksPlainTextFallback
    ).toBe(false);
  }, 15000);

  test('remount-key-churn keeps final block integrity', async () => {
    const scenario = createStreamingScenario({
      presetId: 'openai-steady',
      corpusId: 'python-snippet',
      seed: 42,
    });

    const playback = await runTranscriptPlayback({
      states: buildMarkdownStates(scenario.events),
      highlighter,
      remountKeyChurn: true,
    });

    expect(playback.expectedBlocks.length).toBeGreaterThan(0);
    expect(countRestarts(playback.summaryStore)).toBe(0);

    for (const block of playback.expectedBlocks) {
      const node = playback.getByTestId(`chat-block-${block.index}`);
      const baselineHtml = highlighter.codeToHtml(block.code, {
        lang: block.language || 'plaintext',
        theme: 'github-dark',
      });

      expect(
        normalizePlainText(node.textContent ?? '').length
      ).toBeGreaterThan(0);
      expect(
        compareStructuralHighlight(node.innerHTML, baselineHtml)
          .looksPlainTextFallback
      ).toBe(false);
    }
  }, 15000);

  test('consumer-tail-normalization induces non-append restarts', async () => {
    const scenario = createStreamingScenario({
      presetId: 'openai-steady',
      corpusId: 'python-snippet',
      seed: 42,
    });

    const playback = await runTranscriptPlayback({
      states: buildMarkdownStates(scenario.events),
      highlighter,
      transformState: (state, index) => {
        if (index % 2 === 0) return state;

        return state.replace(
          /```([^\n]*)\n([\s\S]*?)(?:\n```|```|$)/g,
          (_, language, code) => {
            const nextCode = code.length > 0 ? `~${code.slice(1)}` : code;
            return `\`\`\`${language}\n${nextCode}\n\`\`\``;
          }
        );
      },
    });

    expect(playback.expectedBlocks.length).toBeGreaterThan(0);
    expect(countRestarts(playback.summaryStore)).toBeGreaterThan(0);

    for (const block of playback.expectedBlocks) {
      const node = playback.getByTestId(`chat-block-${block.index}`);
      const baselineHtml = highlighter.codeToHtml(block.code, {
        lang: block.language || 'plaintext',
        theme: 'github-dark',
      });

      expect(normalizePlainText(node.textContent ?? '')).toBe(
        normalizePlainText(block.code)
      );
      expect(
        compareStructuralHighlight(node.innerHTML, baselineHtml)
          .looksPlainTextFallback
      ).toBe(false);
    }
  }, 15000);
});
