export interface StreamingMetrics {
  highlightCalls: number;
  totalCharsProcessed: number;
  workAmplification: number;
  totalTimeMs: number;
  avgPerTokenMs: number;
  p95PerTokenMs: number;
  tokensProcessed: number;
  tokenTarget: number;
}

export const STREAMING_TARGET_TOKENS = 500;
export const STREAMING_SEED = 42;

const percentile = (values: number[], p: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)
  );
  return sorted[index];
};

export const createTokenChunks = (
  source: string,
  tokenCount: number,
  seed = STREAMING_SEED
): string[] => {
  if (!source.length) return [''];

  const safeCount = Math.min(Math.max(tokenCount, 1), source.length);
  let cursor = 0;
  let state = seed;
  const chunks: string[] = [];

  const rand = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };

  for (let i = 0; i < safeCount; i += 1) {
    const remainingTokens = safeCount - i;
    const remainingChars = source.length - cursor;
    const maxChunkSize = remainingChars - (remainingTokens - 1);
    const size =
      remainingTokens === 1
        ? remainingChars
        : 1 + Math.floor(rand() * maxChunkSize);

    const chunk = source.slice(cursor, cursor + size);
    chunks.push(chunk);
    cursor += size;
  }

  return chunks;
};

export const buildProgressiveStates = (chunks: string[]): string[] => {
  const states: string[] = [];
  let current = '';
  for (const chunk of chunks) {
    current += chunk;
    states.push(current);
  }
  return states;
};

export const buildStreamingMetrics = ({
  tokenDurationsMs,
  codeLengths,
  finalCodeLength,
  tokenTarget,
}: {
  tokenDurationsMs: number[];
  codeLengths: number[];
  finalCodeLength: number;
  tokenTarget: number;
}): StreamingMetrics => {
  const totalTimeMs = tokenDurationsMs.reduce((sum, value) => sum + value, 0);
  const totalCharsProcessed = codeLengths.reduce(
    (sum, value) => sum + value,
    0
  );
  const highlightCalls = tokenDurationsMs.length;
  return {
    highlightCalls,
    totalCharsProcessed,
    workAmplification:
      finalCodeLength > 0 ? totalCharsProcessed / finalCodeLength : 0,
    totalTimeMs,
    avgPerTokenMs: highlightCalls > 0 ? totalTimeMs / highlightCalls : 0,
    p95PerTokenMs: percentile(tokenDurationsMs, 95),
    tokensProcessed: highlightCalls,
    tokenTarget,
  };
};

export const createEmptyMetrics = (tokenTarget: number): StreamingMetrics => ({
  highlightCalls: 0,
  totalCharsProcessed: 0,
  workAmplification: 0,
  totalTimeMs: 0,
  avgPerTokenMs: 0,
  p95PerTokenMs: 0,
  tokensProcessed: 0,
  tokenTarget,
});

export const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

