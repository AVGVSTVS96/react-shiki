import React, {
  Profiler,
  StrictMode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { act, render, waitFor } from '@testing-library/react';
import type { Highlighter, ThemedToken } from 'shiki';
import { expect } from 'vitest';

import {
  ShikiTokenRenderer,
  useShikiHighlighter,
  useShikiStreamHighlighter,
  type StreamSessionSummary,
} from '../src/index';
import {
  buildAssistantChatTreePlaybackPlan,
  compareStructuralHighlight,
  createEmptyAssistantMessageMetrics,
  getAssistantMessageCorpus,
  parseTranscriptNodes,
  summarizeAssistantMessageRun,
  type AssistantBlockMetrics,
  type AssistantMessageMetrics,
  type AssistantMessageRunSummary,
  type StreamingScenario,
} from 'streaming-lab';

type LaneVariant =
  | 'incremental-chat-tree'
  | 'static-chat-tree'
  | 'plaintext-chat-tree';

type RunAssistantMessageOptions = {
  scenario: StreamingScenario;
  highlighter: Highlighter;
  variant: LaneVariant;
  useStrictMode?: boolean;
  unstableOptions?: boolean;
  playbackMode?: 'streaming' | 'final-only';
};

export type AssistantMessageRunResult = {
  summary: AssistantMessageRunSummary;
  messageMetrics: AssistantMessageMetrics;
  blockMetrics: AssistantBlockMetrics[];
  plainTextParity: boolean;
  highlightPresencePass: boolean;
  strictStructuralMatch: boolean | null;
  finalTranscript: string;
};

type MutableBlockMetrics = AssistantBlockMetrics & {
  lastCode: string | null;
};

const nowMs = (startedAt: number) => performance.now() - startedAt;

const hasStyledToken = (tokens: ThemedToken[]): boolean =>
  tokens.some(
    (token) =>
      token.color != null ||
      token.fontStyle != null ||
      (token.htmlStyle != null && Object.keys(token.htmlStyle).length > 0)
  );

const createMutableBlock = (
  blockId: string,
  language: string
): MutableBlockMetrics => ({
  blockId,
  language,
  mountCount: 0,
  renderCount: 0,
  codeUpdateCount: 0,
  noopRenderCount: 0,
  tokenStateCommitCount: 0,
  finalTokenCount: 0,
  tokenSpanWork: 0,
  firstMountMs: 0,
  firstHighlightMs: 0,
  lastHighlightMs: 0,
  sessionCount: 0,
  restartCount: 0,
  lastCode: null,
});

const toStableBlockMetrics = (
  mutable: MutableBlockMetrics
): AssistantBlockMetrics => ({
  blockId: mutable.blockId,
  language: mutable.language,
  mountCount: mutable.mountCount,
  renderCount: mutable.renderCount,
  codeUpdateCount: mutable.codeUpdateCount,
  noopRenderCount: mutable.noopRenderCount,
  tokenStateCommitCount: mutable.tokenStateCommitCount,
  finalTokenCount: mutable.finalTokenCount,
  tokenSpanWork: mutable.tokenSpanWork,
  firstMountMs: mutable.firstMountMs,
  firstHighlightMs: mutable.firstHighlightMs,
  lastHighlightMs: mutable.lastHighlightMs,
  sessionCount: mutable.sessionCount,
  restartCount: mutable.restartCount,
});

const normalize = (value: string): string =>
  value.replace(/\r\n?/g, '\n').trimEnd();

const IncrementalBlock = ({
  blockKey,
  blockId,
  blockIndex,
  code,
  language,
  isComplete,
  highlighter,
  unstableOptions,
  onMount,
  onRender,
  onTokenCommit,
  onSessionSummary,
}: {
  blockKey: string;
  blockId: string;
  blockIndex: number;
  code: string;
  language: string;
  isComplete: boolean;
  highlighter: Highlighter;
  unstableOptions: boolean;
  onMount: (blockKey: string, blockId: string, language: string) => void;
  onRender: (
    blockKey: string,
    blockId: string,
    language: string,
    code: string,
    tokenCount: number,
    highlighted: boolean
  ) => void;
  onTokenCommit: (blockKey: string, tokenCount: number) => void;
  onSessionSummary: (
    blockKey: string,
    summary: StreamSessionSummary
  ) => void;
}) => {
  useEffect(() => {
    onMount(blockKey, blockId, language);
  }, [blockId, blockKey, language, onMount]);

  const stableSessionSummary = useCallback(
    (summary: StreamSessionSummary) => {
      onSessionSummary(blockKey, summary);
    },
    [blockKey, onSessionSummary]
  );

  const stableOptions = useMemo(
    () => ({
      highlighter,
      allowRecalls: true,
      onSessionSummary: stableSessionSummary,
    }),
    [highlighter, stableSessionSummary]
  );

  const options = unstableOptions ? { ...stableOptions } : stableOptions;

  const result = useShikiStreamHighlighter(
    { code, isComplete },
    language,
    'github-dark',
    options
  );

  useEffect(() => {
    onTokenCommit(blockKey, result.tokens.length);
  }, [blockKey, onTokenCommit, result.tokens]);

  useEffect(() => {
    onRender(
      blockKey,
      blockId,
      language,
      code,
      result.tokens.length,
      hasStyledToken(result.tokens)
    );
  });

  return (
    <div
      data-testid={`assistant-block-${blockIndex}`}
      data-status={result.status}
      data-language={language}
      data-block-id={blockId}
      data-variant="incremental"
    >
      <ShikiTokenRenderer tokens={result.tokens} />
    </div>
  );
};

const StaticBlock = ({
  blockKey,
  blockId,
  blockIndex,
  code,
  language,
  highlighter,
  onMount,
  onRender,
  onTokenCommit,
}: {
  blockKey: string;
  blockId: string;
  blockIndex: number;
  code: string;
  language: string;
  highlighter: Highlighter;
  onMount: (blockKey: string, blockId: string, language: string) => void;
  onRender: (
    blockKey: string,
    blockId: string,
    language: string,
    code: string,
    tokenCount: number,
    highlighted: boolean
  ) => void;
  onTokenCommit: (blockKey: string, tokenCount: number) => void;
}) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    onMount(blockKey, blockId, language);
  }, [blockId, blockKey, language, onMount]);

  const highlighted = useShikiHighlighter(code, language, 'github-dark', {
    highlighter,
  });

  useEffect(() => {
    const tokenCount =
      ref.current?.querySelectorAll('span').length ??
      Math.max(0, code.length > 0 ? 1 : 0);

    const html = ref.current?.innerHTML ?? '';
    const highlightedNow =
      tokenCount > 0 && (html.includes('style=') || html.includes('class='));

    onTokenCommit(blockKey, tokenCount);
    onRender(
      blockKey,
      blockId,
      language,
      code,
      tokenCount,
      highlightedNow
    );
  });

  return (
    <div
      ref={ref}
      data-testid={`assistant-block-${blockIndex}`}
      data-language={language}
      data-block-id={blockId}
      data-variant="static"
    >
      {highlighted}
    </div>
  );
};

const PlaintextBlock = ({
  blockKey,
  blockId,
  blockIndex,
  code,
  language,
  onMount,
  onRender,
}: {
  blockKey: string;
  blockId: string;
  blockIndex: number;
  code: string;
  language: string;
  onMount: (blockKey: string, blockId: string, language: string) => void;
  onRender: (
    blockKey: string,
    blockId: string,
    language: string,
    code: string,
    tokenCount: number,
    highlighted: boolean
  ) => void;
}) => {
  useEffect(() => {
    onMount(blockKey, blockId, language);
  }, [blockId, blockKey, language, onMount]);

  useEffect(() => {
    onRender(blockKey, blockId, language, code, 0, false);
  });

  return (
    <pre
      data-testid={`assistant-block-${blockIndex}`}
      data-language={language}
      data-block-id={blockId}
      data-variant="plaintext"
    >
      <code>{code}</code>
    </pre>
  );
};

const AssistantChatTree = ({
  transcript,
  variant,
  highlighter,
  unstableOptions,
  blockIds,
  onMount,
  onRender,
  onTokenCommit,
  onSessionSummary,
}: {
  transcript: string;
  variant: LaneVariant;
  highlighter: Highlighter;
  unstableOptions: boolean;
  blockIds: string[];
  onMount: (blockKey: string, blockId: string, language: string) => void;
  onRender: (
    blockKey: string,
    blockId: string,
    language: string,
    code: string,
    tokenCount: number,
    highlighted: boolean
  ) => void;
  onTokenCommit: (blockKey: string, tokenCount: number) => void;
  onSessionSummary: (
    blockKey: string,
    summary: StreamSessionSummary
  ) => void;
}) => {
  const nodes = parseTranscriptNodes(transcript);

  return (
    <article data-testid="assistant-chat-tree">
      {nodes.map((node, index) => {
        if (node.type === 'text') {
          return (
            <span key={`text:${index}`} data-kind="text">
              {node.value}
            </span>
          );
        }

        if (node.type === 'inline-code') {
          return <code key={`inline:${index}`}>{node.value}</code>;
        }

        const blockIndex = node.block.index;
        const blockId = blockIds[blockIndex] ?? `block-${blockIndex}`;
        const blockKey = `${blockIndex}:${blockId}`;
        const language = node.block.language || 'plaintext';

        if (variant === 'incremental-chat-tree') {
          return (
            <IncrementalBlock
              key={blockKey}
              blockKey={blockKey}
              blockId={blockId}
              blockIndex={blockIndex}
              code={node.block.code}
              language={language}
              isComplete={node.block.closed}
              highlighter={highlighter}
              unstableOptions={unstableOptions}
              onMount={onMount}
              onRender={onRender}
              onTokenCommit={onTokenCommit}
              onSessionSummary={onSessionSummary}
            />
          );
        }

        if (variant === 'static-chat-tree') {
          return (
            <StaticBlock
              key={blockKey}
              blockKey={blockKey}
              blockId={blockId}
              blockIndex={blockIndex}
              code={node.block.code}
              language={language}
              highlighter={highlighter}
              onMount={onMount}
              onRender={onRender}
              onTokenCommit={onTokenCommit}
            />
          );
        }

        return (
          <PlaintextBlock
            key={blockKey}
            blockKey={blockKey}
            blockId={blockId}
            blockIndex={blockIndex}
            code={node.block.code}
            language={language}
            onMount={onMount}
            onRender={onRender}
          />
        );
      })}
    </article>
  );
};

export const runAssistantMessageScenario = async ({
  scenario,
  highlighter,
  variant,
  useStrictMode = false,
  unstableOptions = false,
  playbackMode = 'streaming',
}: RunAssistantMessageOptions): Promise<AssistantMessageRunResult> => {
  const playback = buildAssistantChatTreePlaybackPlan(scenario.events, {
    mode: playbackMode,
  });

  const blockIds =
    scenario.messageCorpusId != null
      ? getAssistantMessageCorpus(scenario.messageCorpusId).blocks.map(
          (block) => block.blockId
        )
      : [];

  const startedAt = performance.now();
  const blockMetrics = new Map<string, MutableBlockMetrics>();
  let firstAnyTextMs = 0;
  let messageCompleteMs = 0;
  let chatTreeActualRenderCommits = 0;
  let chatTreeActualDurationMs = 0;

  const ensureBlock = (
    blockKey: string,
    blockId: string,
    language: string
  ): MutableBlockMetrics => {
    const existing = blockMetrics.get(blockKey);
    if (existing) return existing;

    const created = createMutableBlock(blockId, language);
    blockMetrics.set(blockKey, created);
    return created;
  };

  const onMount = (blockKey: string, blockId: string, language: string) => {
    const metrics = ensureBlock(blockKey, blockId, language);
    const elapsed = nowMs(startedAt);

    metrics.mountCount += 1;
    metrics.firstMountMs =
      metrics.firstMountMs === 0 ? elapsed : metrics.firstMountMs;
  };

  const onRender = (
    blockKey: string,
    blockId: string,
    language: string,
    code: string,
    tokenCount: number,
    highlighted: boolean
  ) => {
    const metrics = ensureBlock(blockKey, blockId, language);
    const elapsed = nowMs(startedAt);

    metrics.renderCount += 1;
    metrics.finalTokenCount = tokenCount;
    metrics.tokenSpanWork += tokenCount;

    if (metrics.lastCode == null || metrics.lastCode !== code) {
      metrics.codeUpdateCount += 1;
    } else {
      metrics.noopRenderCount += 1;
    }

    metrics.lastCode = code;

    if (highlighted) {
      metrics.firstHighlightMs =
        metrics.firstHighlightMs === 0
          ? elapsed
          : metrics.firstHighlightMs;
      metrics.lastHighlightMs = elapsed;
    }
  };

  const onTokenCommit = (blockKey: string, tokenCount: number) => {
    const [indexPart] = blockKey.split(':');
    const blockId = blockIds[Number(indexPart)] ?? blockKey;
    const metrics = ensureBlock(blockKey, blockId, 'plaintext');
    metrics.tokenStateCommitCount += 1;
    metrics.finalTokenCount = tokenCount;
  };

  const onSessionSummary = (
    blockKey: string,
    summary: StreamSessionSummary
  ) => {
    const [indexPart] = blockKey.split(':');
    const blockId = blockIds[Number(indexPart)] ?? blockKey;
    const metrics = ensureBlock(blockKey, blockId, 'plaintext');
    metrics.sessionCount += 1;
    if (summary.reason === 'restart') {
      metrics.restartCount += 1;
    }
  };

  const renderTree = (transcript: string) => (
    <Profiler
      id={`assistant:${variant}`}
      onRender={(_, __, actualDuration) => {
        chatTreeActualRenderCommits += 1;
        chatTreeActualDurationMs += actualDuration;
      }}
    >
      <AssistantChatTree
        transcript={transcript}
        variant={variant}
        highlighter={highlighter}
        unstableOptions={unstableOptions}
        blockIds={blockIds}
        onMount={onMount}
        onRender={onRender}
        onTokenCommit={onTokenCommit}
        onSessionSummary={onSessionSummary}
      />
    </Profiler>
  );

  const initialTranscript = playback.states[0] ?? '';
  const rendered = render(
    useStrictMode ? <StrictMode>{renderTree(initialTranscript)}</StrictMode> : renderTree(initialTranscript)
  );

  for (let index = 1; index < playback.states.length; index += 1) {
    const state = playback.states[index] ?? '';

    if (firstAnyTextMs === 0 && state.length > 0) {
      firstAnyTextMs = nowMs(startedAt);
    }

    rendered.rerender(
      useStrictMode ? <StrictMode>{renderTree(state)}</StrictMode> : renderTree(state)
    );

    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    });
  }

  messageCompleteMs = nowMs(startedAt);

  if (variant === 'incremental-chat-tree') {
    await waitFor(() => {
      for (const block of playback.finalBlocks) {
        const node = rendered.getByTestId(`assistant-block-${block.index}`);
        expect(node.getAttribute('data-status')).toBe('done');
      }
    });
  }

  const orderedBlockMetrics = playback.finalBlocks.map((block) => {
    const blockId = blockIds[block.index] ?? `block-${block.index}`;
    const key = `${block.index}:${blockId}`;
    const existing = blockMetrics.get(key);
    if (existing) {
      return toStableBlockMetrics({
        ...existing,
        language: block.language || existing.language,
      });
    }

    return toStableBlockMetrics(
      createMutableBlock(blockId, block.language || 'plaintext')
    );
  });

  const highlightTimes = orderedBlockMetrics
    .map((block) => block.lastHighlightMs)
    .filter((value) => value > 0);
  const firstHighlightTimes = orderedBlockMetrics
    .map((block) => block.firstHighlightMs)
    .filter((value) => value > 0);
  const mountTimes = orderedBlockMetrics
    .map((block) => block.firstMountMs)
    .filter((value) => value > 0);

  const messageMetrics: AssistantMessageMetrics = {
    ...createEmptyAssistantMessageMetrics(),
    messageChunkCount: playback.messageChunkCount,
    messageTextChars: playback.finalTranscript.length,
    blockCount: playback.finalBlocks.length,
    maxMountedBlocks: playback.maxMountedBlocks,
    chatTreeActualRenderCommits,
    chatTreeActualDurationMs,
    firstAnyTextMs,
    firstBlockMountMs: mountTimes.length > 0 ? Math.min(...mountTimes) : 0,
    firstHighlightedBlockMs:
      firstHighlightTimes.length > 0 ? Math.min(...firstHighlightTimes) : 0,
    lastBlockMountMs: mountTimes.length > 0 ? Math.max(...mountTimes) : 0,
    lastHighlightedBlockMs:
      highlightTimes.length > 0 ? Math.max(...highlightTimes) : 0,
    messageCompleteToLastHighlightMs:
      highlightTimes.length > 0
        ? Math.max(0, Math.max(...highlightTimes) - messageCompleteMs)
        : 0,
  };

  const blockNodes = playback.finalBlocks.map((block) =>
    rendered.getByTestId(`assistant-block-${block.index}`)
  );

  const renderedCode = blockNodes.map((node) => node.textContent ?? '').join('\n');
  const expectedCode = playback.finalBlocks.map((block) => block.code).join('\n');

  const parityResults = playback.finalBlocks.map((block, index) => {
    const node = blockNodes[index];
    if (!node) {
      return {
        highlightPresencePass: false,
        strictStructuralMatch: false,
      };
    }

    if (variant === 'plaintext-chat-tree') {
      return {
        highlightPresencePass: false,
        strictStructuralMatch: null,
      };
    }

    const baselineHtml = highlighter.codeToHtml(block.code, {
      lang: block.language || 'plaintext',
      theme: 'github-dark',
    });

    const structure = compareStructuralHighlight(node.innerHTML, baselineHtml);

    return {
      highlightPresencePass: !structure.looksPlainTextFallback,
      strictStructuralMatch: structure.matches,
    };
  });

  const summary = summarizeAssistantMessageRun({
    scenarioId: scenario.id,
    message: messageMetrics,
    blocks: orderedBlockMetrics,
  });

  const strictStructuralMatches = parityResults
    .map((item) => item.strictStructuralMatch)
    .filter((item): item is boolean => item != null);

  const result: AssistantMessageRunResult = {
    summary,
    messageMetrics,
    blockMetrics: orderedBlockMetrics,
    plainTextParity: normalize(renderedCode) === normalize(expectedCode),
    highlightPresencePass: parityResults.every(
      (item) => item.highlightPresencePass
    ),
    strictStructuralMatch:
      strictStructuralMatches.length === 0
        ? null
        : strictStructuralMatches.every(Boolean),
    finalTranscript: playback.finalTranscript,
  };

  rendered.unmount();

  return result;
};
