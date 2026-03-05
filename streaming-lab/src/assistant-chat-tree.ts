import type { StreamingEvent } from './events';
import { buildTranscriptPlaybackStates } from './adapters';
import {
  extractFencedCodeBlocks,
  parseTranscriptNodes,
  type TranscriptCodeBlock,
} from './transcript';

export interface AssistantChatTreePlaybackPlan {
  states: string[];
  messageChunkCount: number;
  finalTranscript: string;
  finalBlocks: TranscriptCodeBlock[];
  maxMountedBlocks: number;
}

export const buildAssistantChatTreePlaybackPlan = (
  events: StreamingEvent[],
  {
    mode = 'streaming',
  }: {
    mode?: 'streaming' | 'final-only';
  } = {}
): AssistantChatTreePlaybackPlan => {
  const states = buildTranscriptPlaybackStates(events, { mode });
  const finalTranscript = states[states.length - 1] ?? '';
  const finalBlocks = extractFencedCodeBlocks(finalTranscript);

  let maxMountedBlocks = 0;
  for (const state of states) {
    const mountedBlocks = parseTranscriptNodes(state).filter(
      (node) => node.type === 'code-block'
    ).length;
    maxMountedBlocks = Math.max(maxMountedBlocks, mountedBlocks);
  }

  return {
    states,
    messageChunkCount: Math.max(0, states.length - 1),
    finalTranscript,
    finalBlocks,
    maxMountedBlocks,
  };
};
