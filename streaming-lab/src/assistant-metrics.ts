export interface AssistantMessageMetrics {
  messageChunkCount: number;
  messageTextChars: number;
  blockCount: number;
  maxMountedBlocks: number;
  chatTreeActualRenderCommits: number;
  chatTreeActualDurationMs: number;
  firstAnyTextMs: number;
  firstBlockMountMs: number;
  firstHighlightedBlockMs: number;
  lastBlockMountMs: number;
  lastHighlightedBlockMs: number;
  messageCompleteToLastHighlightMs: number;
}

export interface AssistantBlockMetrics {
  blockId: string;
  language: string;
  mountCount: number;
  renderCount: number;
  codeUpdateCount: number;
  noopRenderCount: number;
  tokenStateCommitCount: number;
  finalTokenCount: number;
  tokenSpanWork: number;
  firstMountMs: number;
  firstHighlightMs: number;
  lastHighlightMs: number;
  sessionCount: number;
  restartCount: number;
}

export interface AssistantMessageRunSummary {
  scenarioId: string;
  languages: string[];
  message: AssistantMessageMetrics;
  blocks: AssistantBlockMetrics[];
  totalBlockRenders: number;
  totalNoopBlockRenders: number;
  totalTokenSpanWork: number;
}

export const createEmptyAssistantMessageMetrics =
  (): AssistantMessageMetrics => ({
    messageChunkCount: 0,
    messageTextChars: 0,
    blockCount: 0,
    maxMountedBlocks: 0,
    chatTreeActualRenderCommits: 0,
    chatTreeActualDurationMs: 0,
    firstAnyTextMs: 0,
    firstBlockMountMs: 0,
    firstHighlightedBlockMs: 0,
    lastBlockMountMs: 0,
    lastHighlightedBlockMs: 0,
    messageCompleteToLastHighlightMs: 0,
  });

export const isSuspiciousAssistantBlock = (
  block: AssistantBlockMetrics
): boolean =>
  block.noopRenderCount > block.codeUpdateCount ||
  block.renderCount / Math.max(1, block.codeUpdateCount) > 2 ||
  block.tokenSpanWork / Math.max(1, block.finalTokenCount) > 8;

export const summarizeAssistantMessageRun = ({
  scenarioId,
  blocks,
  message,
}: {
  scenarioId: string;
  blocks: AssistantBlockMetrics[];
  message: AssistantMessageMetrics;
}): AssistantMessageRunSummary => {
  const languages = blocks.map((block) => block.language);
  const totalBlockRenders = blocks.reduce(
    (count, block) => count + block.renderCount,
    0
  );
  const totalNoopBlockRenders = blocks.reduce(
    (count, block) => count + block.noopRenderCount,
    0
  );
  const totalTokenSpanWork = blocks.reduce(
    (count, block) => count + block.tokenSpanWork,
    0
  );

  return {
    scenarioId,
    languages,
    message,
    blocks,
    totalBlockRenders,
    totalNoopBlockRenders,
    totalTokenSpanWork,
  };
};

export const logAssistantMessageRunSummary = (
  summary: AssistantMessageRunSummary,
  { enabled }: { enabled: boolean }
) => {
  if (!enabled) return;

  console.info('[streaming-lab] assistant-message summary', {
    scenario: summary.scenarioId,
    blockCount: summary.message.blockCount,
    languages: summary.languages,
    messageChunkCount: summary.message.messageChunkCount,
    maxMountedBlocks: summary.message.maxMountedBlocks,
    chatTreeCommits: summary.message.chatTreeActualRenderCommits,
    totalBlockRenders: summary.totalBlockRenders,
    totalNoopBlockRenders: summary.totalNoopBlockRenders,
    totalTokenSpanWork: summary.totalTokenSpanWork,
    firstHighlightedBlockMs: Number(
      summary.message.firstHighlightedBlockMs.toFixed(2)
    ),
    lastHighlightedBlockMs: Number(
      summary.message.lastHighlightedBlockMs.toFixed(2)
    ),
    messageCompleteToLastHighlightMs: Number(
      summary.message.messageCompleteToLastHighlightMs.toFixed(2)
    ),
  });

  for (const block of summary.blocks) {
    if (!isSuspiciousAssistantBlock(block)) continue;

    console.info('[streaming-lab] assistant-block suspicious', {
      blockId: block.blockId,
      language: block.language,
      mountCount: block.mountCount,
      renderCount: block.renderCount,
      noopRenderCount: block.noopRenderCount,
      codeUpdateCount: block.codeUpdateCount,
      finalTokenCount: block.finalTokenCount,
      tokenSpanWork: block.tokenSpanWork,
      sessionCount: block.sessionCount,
      restartCount: block.restartCount,
      firstHighlightMs: Number(block.firstHighlightMs.toFixed(2)),
      lastHighlightMs: Number(block.lastHighlightMs.toFixed(2)),
    });
  }
};
