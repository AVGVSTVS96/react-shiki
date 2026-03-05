// Internal streaming-lab utilities used by tests/benchmarks/playground.
// Keep these helpers (or equivalent coverage) so evaluation infrastructure
// can validate highlighting integrity and commit/work diagnostics.

export interface ComputeMetrics {
  inputChunkCount: number;
  finalCodeChars: number;
  processedChars: number;
  tokenEvents: number;
  recallEvents: number;
  scheduledCommits: number;
  actualRenderCommits: number;
  restartCount: number;
  workAmplification: number;
  commitAmplification: number;
  tokenEventAmplification: number;
}

export interface UxMetrics {
  timeToFirstAnyOutputMs: number;
  timeToFirstHighlightedOutputMs: number;
  p50ChunkLatencyMs: number;
  p95ChunkLatencyMs: number;
  maxChunkLatencyMs: number;
  sessionTotalMs: number;
}

export interface HighlightStructure {
  plainText: string;
  segmentCount: number;
  styledSegmentCount: number;
  styledCharCount: number;
  styleMask: string;
}

export interface StructuralHighlightComparison {
  matches: boolean;
  looksPlainTextFallback: boolean;
  actual: HighlightStructure;
  baseline: HighlightStructure;
}

export interface IntegrityMetrics {
  finalPlainTextMatchesBaseline: boolean;
  finalStructuralHighlightMatchesBaseline: boolean | null;
  looksPlainTextFallback: boolean;
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

export const normalizePlainText = (value: string): string =>
  value.replace(/\r\n?/g, '\n').trimEnd();

const normalizeTextFragment = (value: string): string =>
  value.replace(/\r\n?/g, '\n');

export const normalizeHtml = (value: string): string =>
  value.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();

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

const normalizeStyle = (styleValue: string | null): string => {
  if (!styleValue) return '';

  return styleValue
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .sort()
    .join(';');
};

const buildStyleSignature = (element: Element): string => {
  const className = (element.getAttribute('class') ?? '').trim();
  const style = normalizeStyle(element.getAttribute('style'));
  if (!className && !style) return '';
  return `${className}|${style}`;
};

const parseHtml = (html: string): ParentNode => {
  if (typeof document !== 'undefined') {
    const container = document.createElement('div');
    container.innerHTML = html;
    return container;
  }

  return {
    querySelectorAll() {
      return [] as unknown as NodeListOf<Element>;
    },
    textContent: html,
  } as unknown as ParentNode;
};

export const buildHighlightStructure = (
  html: string
): HighlightStructure => {
  const root = parseHtml(html);
  const allSpans = Array.from(root.querySelectorAll('span'));
  const leafSpans = allSpans.filter(
    (span) => span.querySelector('span') == null
  );
  const spans = leafSpans.length > 0 ? leafSpans : allSpans;

  const segments =
    spans.length > 0
      ? spans.map((span) => ({
          text: normalizeTextFragment(span.textContent ?? ''),
          style: buildStyleSignature(span),
        }))
      : [
          {
            text: normalizeTextFragment(root.textContent ?? ''),
            style: '',
          },
        ];

  const filtered = segments.filter((segment) => segment.text.length > 0);

  const plainText = normalizePlainText(root.textContent ?? '');
  const styledSegmentCount = filtered.filter(
    (segment) => segment.style
  ).length;
  const styledCharCount = filtered.reduce(
    (count, segment) => count + (segment.style ? segment.text.length : 0),
    0
  );
  const styleMask = filtered
    .map((segment) =>
      segment.style
        ? '1'.repeat(segment.text.length)
        : '0'.repeat(segment.text.length)
    )
    .join('');

  return {
    plainText,
    segmentCount: filtered.length,
    styledSegmentCount,
    styledCharCount,
    styleMask,
  };
};

export const compareStructuralHighlight = (
  actualHtml: string,
  baselineHtml: string
): StructuralHighlightComparison => {
  const actual = buildHighlightStructure(actualHtml);
  const baseline = buildHighlightStructure(baselineHtml);

  const plainMatches =
    normalizePlainText(actual.plainText) ===
    normalizePlainText(baseline.plainText);

  const styledBaselineChars = Math.max(1, baseline.styledCharCount);
  const styledCoverage = actual.styledCharCount / styledBaselineChars;

  const looksPlainTextFallback =
    baseline.styledSegmentCount > 0 &&
    (actual.styledSegmentCount === 0 || styledCoverage < 0.15);

  const matches = plainMatches && !looksPlainTextFallback;

  return {
    matches,
    looksPlainTextFallback,
    actual,
    baseline,
  };
};

export const createEmptySessionMetrics = (): StreamingSessionMetrics => ({
  compute: {
    inputChunkCount: 0,
    finalCodeChars: 0,
    processedChars: 0,
    tokenEvents: 0,
    recallEvents: 0,
    scheduledCommits: 0,
    actualRenderCommits: 0,
    restartCount: 0,
    workAmplification: 0,
    commitAmplification: 0,
    tokenEventAmplification: 0,
  },
  ux: {
    timeToFirstAnyOutputMs: 0,
    timeToFirstHighlightedOutputMs: 0,
    p50ChunkLatencyMs: 0,
    p95ChunkLatencyMs: 0,
    maxChunkLatencyMs: 0,
    sessionTotalMs: 0,
  },
  integrity: {
    finalPlainTextMatchesBaseline: false,
    finalStructuralHighlightMatchesBaseline: null,
    looksPlainTextFallback: false,
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
  tokenEvents,
  recallEvents,
  scheduledCommits,
  actualRenderCommits,
  restartCount,
  chunkLatenciesMs,
  timeToFirstAnyOutputMs,
  timeToFirstHighlightedOutputMs,
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
  tokenEvents: number;
  recallEvents: number;
  scheduledCommits: number;
  actualRenderCommits: number;
  restartCount: number;
  chunkLatenciesMs: number[];
  timeToFirstAnyOutputMs: number;
  timeToFirstHighlightedOutputMs: number;
  sessionTotalMs: number;
  statusSequence: string[];
  endedCleanly: boolean;
  finalRenderedHtml?: string;
  baselineHtml?: string;
}): StreamingSessionMetrics => {
  const normalizedFinalCode = normalizePlainText(finalCode);
  const normalizedBaselineCode = normalizePlainText(baselineCode);
  const diff = calculateTextDiffCounts(
    normalizedBaselineCode,
    normalizedFinalCode
  );

  const structuralComparison =
    finalRenderedHtml == null || baselineHtml == null
      ? null
      : compareStructuralHighlight(finalRenderedHtml, baselineHtml);

  const finalCodeChars = normalizedFinalCode.length;
  const workAmplification =
    finalCodeChars === 0 ? 0 : processedChars / finalCodeChars;
  const commitAmplification =
    inputChunkCount === 0 ? 0 : actualRenderCommits / inputChunkCount;
  const tokenEventAmplification =
    finalCodeChars === 0 ? 0 : tokenEvents / finalCodeChars;

  return {
    compute: {
      inputChunkCount,
      finalCodeChars,
      processedChars,
      tokenEvents,
      recallEvents,
      scheduledCommits,
      actualRenderCommits,
      restartCount,
      workAmplification,
      commitAmplification,
      tokenEventAmplification,
    },
    ux: {
      timeToFirstAnyOutputMs,
      timeToFirstHighlightedOutputMs,
      p50ChunkLatencyMs: percentile(chunkLatenciesMs, 50),
      p95ChunkLatencyMs: percentile(chunkLatenciesMs, 95),
      maxChunkLatencyMs: Math.max(0, ...chunkLatenciesMs),
      sessionTotalMs,
    },
    integrity: {
      finalPlainTextMatchesBaseline:
        normalizedFinalCode === normalizedBaselineCode,
      finalStructuralHighlightMatchesBaseline:
        structuralComparison?.matches ?? null,
      looksPlainTextFallback:
        structuralComparison?.looksPlainTextFallback ?? false,
      duplicateCharCount: diff.duplicateCharCount,
      missingCharCount: diff.missingCharCount,
      statusSequence,
      endedCleanly,
    },
  };
};

export const getWorkAmplification = (
  metrics: StreamingSessionMetrics
): number => metrics.compute.workAmplification;

export const getCommitAmplification = (
  metrics: StreamingSessionMetrics
): number => metrics.compute.commitAmplification;
