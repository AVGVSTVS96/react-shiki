import type { StreamingEvent } from './events';
import { isCodeMutationEvent, isTranscriptMutationEvent } from './events';

export interface ScenarioReplaySnapshot {
  transcript: string;
  codeBlocks: string[];
  activeCodeBlock: number;
  fenceOpen: boolean;
  ended: boolean;
}

export interface ScenarioFrame {
  index: number;
  event: StreamingEvent;
  snapshot: ScenarioReplaySnapshot;
  mutated: boolean;
}

export interface ControlledCodeState {
  code: string;
  isComplete: boolean;
  isAppendOnly: boolean;
  eventIndex: number;
}

export type TranscriptPlaybackMode = 'streaming' | 'final-only';

interface ReplayState {
  transcript: string;
  codeBlocks: string[];
  activeCodeBlock: number;
  fenceOpen: boolean;
  ended: boolean;
}

const createInitialState = (): ReplayState => ({
  transcript: '',
  codeBlocks: [],
  activeCodeBlock: -1,
  fenceOpen: false,
  ended: false,
});

const replaceTail = (
  value: string,
  deleteCount: number,
  insert: string
): string => {
  const safeDelete = Math.max(0, Math.min(value.length, deleteCount));
  return value.slice(0, value.length - safeDelete) + insert;
};

const ensureActiveCodeBlock = (state: ReplayState): number => {
  if (state.activeCodeBlock >= 0) return state.activeCodeBlock;
  state.codeBlocks.push('');
  state.activeCodeBlock = state.codeBlocks.length - 1;
  return state.activeCodeBlock;
};

const applyEvent = (
  state: ReplayState,
  event: StreamingEvent
): boolean => {
  const beforeTranscript = state.transcript;
  const beforeCode = state.codeBlocks.join('\u0000');

  switch (event.type) {
    case 'message-start':
      break;
    case 'text-delta':
      state.transcript += event.value;
      break;
    case 'pause':
      break;
    case 'ping':
      break;
    case 'fence-open': {
      if (state.transcript && !state.transcript.endsWith('\n')) {
        state.transcript += '\n';
      }
      state.codeBlocks.push('');
      state.activeCodeBlock = state.codeBlocks.length - 1;
      state.fenceOpen = true;
      state.transcript += `\`\`\`${event.language ?? ''}\n`;
      break;
    }
    case 'code-delta': {
      const active = ensureActiveCodeBlock(state);
      state.codeBlocks[active] =
        (state.codeBlocks[active] ?? '') + event.value;
      state.transcript += event.value;
      break;
    }
    case 'replace-tail':
      if (event.target === 'code') {
        const active = ensureActiveCodeBlock(state);
        state.codeBlocks[active] = replaceTail(
          state.codeBlocks[active] ?? '',
          event.deleteCount,
          event.value
        );
      }
      state.transcript = replaceTail(
        state.transcript,
        event.deleteCount,
        event.value
      );
      break;
    case 'fence-close':
      if (!state.transcript.endsWith('\n')) {
        state.transcript += '\n';
      }
      state.transcript += '```';
      state.fenceOpen = false;
      break;
    case 'message-end':
      state.ended = true;
      break;
  }

  return (
    state.transcript !== beforeTranscript ||
    state.codeBlocks.join('\u0000') !== beforeCode ||
    event.type === 'message-end'
  );
};

const snapshotState = (state: ReplayState): ScenarioReplaySnapshot => ({
  transcript: state.transcript,
  codeBlocks: [...state.codeBlocks],
  activeCodeBlock: state.activeCodeBlock,
  fenceOpen: state.fenceOpen,
  ended: state.ended,
});

export const buildScenarioFrames = (
  events: StreamingEvent[]
): ScenarioFrame[] => {
  const state = createInitialState();
  const frames: ScenarioFrame[] = [];

  events.forEach((event, index) => {
    const mutated = applyEvent(state, event);
    frames.push({
      index,
      event,
      snapshot: snapshotState(state),
      mutated,
    });
  });

  return frames;
};

export const extractFinalTranscript = (
  events: StreamingEvent[]
): string => {
  const frames = buildScenarioFrames(events);
  return frames[frames.length - 1]?.snapshot.transcript ?? '';
};

export const extractFinalCode = (
  events: StreamingEvent[],
  blockIndex = 0
): string => {
  const frames = buildScenarioFrames(events);
  const finalBlocks =
    frames[frames.length - 1]?.snapshot.codeBlocks ?? [];
  return finalBlocks[blockIndex] ?? '';
};

export const buildMarkdownStates = (
  events: StreamingEvent[]
): string[] => {
  const states = [''];
  const frames = buildScenarioFrames(events);

  for (const frame of frames) {
    if (!isTranscriptMutationEvent(frame.event)) continue;
    const current = frame.snapshot.transcript;
    if (current !== states[states.length - 1]) {
      states.push(current);
    }
  }

  return states;
};

export const buildTranscriptPlaybackStates = (
  events: StreamingEvent[],
  { mode = 'streaming' }: { mode?: TranscriptPlaybackMode } = {}
): string[] => {
  if (mode === 'final-only') {
    const finalTranscript = extractFinalTranscript(events);
    if (!finalTranscript) return [''];
    return ['', finalTranscript];
  }

  return buildMarkdownStates(events);
};

export const buildControlledCodeStates = (
  events: StreamingEvent[],
  {
    blockIndex = 0,
    includeInitial = true,
  }: {
    blockIndex?: number;
    includeInitial?: boolean;
  } = {}
): ControlledCodeState[] => {
  const frames = buildScenarioFrames(events);
  const states: ControlledCodeState[] = [];

  let previousCode = '';
  if (includeInitial) {
    states.push({
      code: '',
      isComplete: false,
      isAppendOnly: true,
      eventIndex: -1,
    });
  }

  for (const frame of frames) {
    if (!isCodeMutationEvent(frame.event)) continue;

    const nextCode = frame.snapshot.codeBlocks[blockIndex] ?? '';
    if (nextCode === previousCode) continue;

    states.push({
      code: nextCode,
      isComplete: false,
      isAppendOnly: nextCode.startsWith(previousCode),
      eventIndex: frame.index,
    });

    previousCode = nextCode;
  }

  const didEnd = frames.some(
    (frame) => frame.event.type === 'message-end'
  );

  if (states.length === 0) {
    return [
      {
        code: '',
        isComplete: didEnd,
        isAppendOnly: true,
        eventIndex: -1,
      },
    ];
  }

  if (didEnd) {
    const last = states[states.length - 1]!;
    states[states.length - 1] = { ...last, isComplete: true };
  }

  return states;
};

export const buildCodeChunks = (
  events: StreamingEvent[],
  {
    blockIndex = 0,
    strictAppendOnly = true,
  }: {
    blockIndex?: number;
    strictAppendOnly?: boolean;
  } = {}
): {
  chunks: string[];
  appendOnly: boolean;
  finalCode: string;
} => {
  const states = buildControlledCodeStates(events, {
    blockIndex,
    includeInitial: true,
  });

  let previous = states[0]?.code ?? '';
  let appendOnly = true;
  const chunks: string[] = [];

  for (const state of states.slice(1)) {
    const next = state.code;
    if (next.startsWith(previous)) {
      const delta = next.slice(previous.length);
      if (delta) chunks.push(delta);
      previous = next;
      continue;
    }

    appendOnly = false;
    if (strictAppendOnly) {
      throw new Error(
        'Scenario contains non-append code changes and cannot be adapted to linear stream input.'
      );
    }

    chunks.push(next);
    previous = next;
  }

  return {
    chunks,
    appendOnly,
    finalCode: previous,
  };
};

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export const createReadableCodeStreamFromScenario = (
  events: StreamingEvent[],
  {
    blockIndex = 0,
    chunkDelayMs = 0,
  }: {
    blockIndex?: number;
    chunkDelayMs?: number;
  } = {}
): ReadableStream<string> => {
  const { chunks } = buildCodeChunks(events, {
    blockIndex,
    strictAppendOnly: true,
  });

  return new ReadableStream<string>({
    start(controller) {
      void (async () => {
        try {
          for (const chunk of chunks) {
            if (chunkDelayMs > 0) {
              await wait(chunkDelayMs);
            }
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      })();
    },
  });
};

export const createAsyncCodeIterableFromScenario = (
  events: StreamingEvent[],
  {
    blockIndex = 0,
    chunkDelayMs = 0,
  }: {
    blockIndex?: number;
    chunkDelayMs?: number;
  } = {}
): AsyncIterable<string> => {
  const { chunks } = buildCodeChunks(events, {
    blockIndex,
    strictAppendOnly: true,
  });

  return {
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) {
        if (chunkDelayMs > 0) {
          await wait(chunkDelayMs);
        }
        yield chunk;
      }
    },
  };
};
