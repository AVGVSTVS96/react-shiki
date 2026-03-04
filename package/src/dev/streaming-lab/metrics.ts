export interface ComputeMetrics {
  finalCodeChars: number;
  inputChunkCount: number;
  processedChars: number;
  highlightCalls: number;
  tokenizerEnqueues: number;
  recallEvents: number;
  recalledTokens: number;
  resyncCount: number;
  renderCommits: number;
}

export interface UxMetrics {
  timeToFirstAnyOutputMs: number;
  timeToFirstHighlightedCodeMs: number;
  p50ChunkLatencyMs: number;
  p95ChunkLatencyMs: number;
  maxChunkLatencyMs: number;
  sessionTotalMs: number;
}

export interface IntegrityMetrics {
  finalPlainTextMatchesBaseline: boolean;
  finalNormalizedHtmlMatchesBaseline: boolean | null;
  duplicateCharCount: number;
  missingCharCount: number;
  statusSequence: string[];
  endedCleanly: boolean;
}

export interface StreamingSessionMetrics {
  compute: ComputeMetrics;
  ux: UxMetrics;
  integrity: IntegrityMetrics;
}

export const percentile = (values: number[], p: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)
  );
  return sorted[index] ?? 0;
};

const commonPrefixLength = (a: string, b: string): number => {
  const max = Math.min(a.length, b.length);
  let cursor = 0;
  while (cursor < max && a[cursor] === b[cursor]) {
    cursor += 1;
  }
  return cursor;
};

const commonSuffixLength = (
  a: string,
  b: string,
  skipPrefix: number
): number => {
  let suffix = 0;
  const maxA = a.length - skipPrefix;
  const maxB = b.length - skipPrefix;
  const max = Math.min(maxA, maxB);

  while (
    suffix < max &&
    a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  return suffix;
};

export const calculateTextDiffCounts = (
  expected: string,
  actual: string
): {
  duplicateCharCount: number;
  missingCharCount: number;
} => {
  if (expected === actual) {
    return { duplicateCharCount: 0, missingCharCount: 0 };
  }

  const prefix = commonPrefixLength(expected, actual);
  const suffix = commonSuffixLength(expected, actual, prefix);

  const expectedMid = expected.slice(prefix, expected.length - suffix);
  const actualMid = actual.slice(prefix, actual.length - suffix);

  return {
    duplicateCharCount: Math.max(
      0,
      actualMid.length - expectedMid.length
    ),
    missingCharCount: Math.max(0, expectedMid.length - actualMid.length),
  };
};

export const normalizeHtml = (value: string): string =>
  value.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();

export const createEmptySessionMetrics = (): StreamingSessionMetrics => ({
  compute: {
    finalCodeChars: 0,
    inputChunkCount: 0,
    processedChars: 0,
    highlightCalls: 0,
    tokenizerEnqueues: 0,
    recallEvents: 0,
    recalledTokens: 0,
    resyncCount: 0,
    renderCommits: 0,
  },
  ux: {
    timeToFirstAnyOutputMs: 0,
    timeToFirstHighlightedCodeMs: 0,
    p50ChunkLatencyMs: 0,
    p95ChunkLatencyMs: 0,
    maxChunkLatencyMs: 0,
    sessionTotalMs: 0,
  },
  integrity: {
    finalPlainTextMatchesBaseline: false,
    finalNormalizedHtmlMatchesBaseline: null,
    duplicateCharCount: 0,
    missingCharCount: 0,
    statusSequence: [],
    endedCleanly: false,
  },
});

export const buildSessionMetrics = ({
  finalCode,
  baselineCode,
  inputChunkCount,
  processedChars,
  highlightCalls,
  tokenizerEnqueues,
  recallEvents,
  recalledTokens,
  resyncCount,
  renderCommits,
  chunkLatenciesMs,
  timeToFirstAnyOutputMs,
  timeToFirstHighlightedCodeMs,
  sessionTotalMs,
  statusSequence,
  endedCleanly,
  finalRenderedHtml,
  baselineHtml,
}: {
  finalCode: string;
  baselineCode: string;
  inputChunkCount: number;
  processedChars: number;
  highlightCalls: number;
  tokenizerEnqueues?: number;
  recallEvents?: number;
  recalledTokens?: number;
  resyncCount?: number;
  renderCommits: number;
  chunkLatenciesMs: number[];
  timeToFirstAnyOutputMs: number;
  timeToFirstHighlightedCodeMs: number;
  sessionTotalMs: number;
  statusSequence: string[];
  endedCleanly: boolean;
  finalRenderedHtml?: string;
  baselineHtml?: string;
}): StreamingSessionMetrics => {
  const diff = calculateTextDiffCounts(baselineCode, finalCode);

  const htmlParity =
    finalRenderedHtml == null || baselineHtml == null
      ? null
      : normalizeHtml(finalRenderedHtml) === normalizeHtml(baselineHtml);

  return {
    compute: {
      finalCodeChars: finalCode.length,
      inputChunkCount,
      processedChars,
      highlightCalls,
      tokenizerEnqueues: tokenizerEnqueues ?? inputChunkCount,
      recallEvents: recallEvents ?? 0,
      recalledTokens: recalledTokens ?? 0,
      resyncCount: resyncCount ?? 0,
      renderCommits,
    },
    ux: {
      timeToFirstAnyOutputMs,
      timeToFirstHighlightedCodeMs,
      p50ChunkLatencyMs: percentile(chunkLatenciesMs, 50),
      p95ChunkLatencyMs: percentile(chunkLatenciesMs, 95),
      maxChunkLatencyMs: Math.max(0, ...chunkLatenciesMs),
      sessionTotalMs,
    },
    integrity: {
      finalPlainTextMatchesBaseline: finalCode === baselineCode,
      finalNormalizedHtmlMatchesBaseline: htmlParity,
      duplicateCharCount: diff.duplicateCharCount,
      missingCharCount: diff.missingCharCount,
      statusSequence,
      endedCleanly,
    },
  };
};

export const getWorkAmplification = (
  metrics: StreamingSessionMetrics
): number =>
  metrics.compute.finalCodeChars === 0
    ? 0
    : metrics.compute.processedChars / metrics.compute.finalCodeChars;
