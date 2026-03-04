export type StreamingEvent =
  | { type: 'message-start' }
  | { type: 'text-delta'; value: string }
  | { type: 'pause'; durationMs: number }
  | { type: 'ping'; value?: string }
  | { type: 'fence-open'; language?: string }
  | { type: 'code-delta'; value: string }
  | {
      type: 'replace-tail';
      target: 'text' | 'code';
      deleteCount: number;
      value: string;
    }
  | { type: 'fence-close' }
  | { type: 'message-end' };

export const createSeededRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
};

export const chunkTextWithSeed = (
  source: string,
  {
    seed,
    minChunk,
    maxChunk,
  }: {
    seed: number;
    minChunk: number;
    maxChunk: number;
  }
): string[] => {
  if (!source.length) return [''];

  const chunks: string[] = [];
  const rand = createSeededRandom(seed);

  let cursor = 0;
  while (cursor < source.length) {
    const remaining = source.length - cursor;
    const span = Math.max(1, maxChunk - minChunk + 1);
    const sampled = minChunk + Math.floor(rand() * span);
    const size = Math.max(1, Math.min(sampled, remaining));
    chunks.push(source.slice(cursor, cursor + size));
    cursor += size;
  }

  return chunks;
};

export const isTranscriptMutationEvent = (
  event: StreamingEvent
): boolean =>
  event.type === 'text-delta' ||
  event.type === 'fence-open' ||
  event.type === 'code-delta' ||
  event.type === 'replace-tail' ||
  event.type === 'fence-close';

export const isCodeMutationEvent = (event: StreamingEvent): boolean =>
  event.type === 'code-delta' ||
  (event.type === 'replace-tail' && event.target === 'code');
