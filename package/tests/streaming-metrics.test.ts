import { describe, expect, test } from 'vitest';

import {
  buildSessionMetrics,
  calculateTextDiffCounts,
  getWorkAmplification,
  percentile,
} from '../src/dev/streaming-lab';

describe('streaming metrics math', () => {
  test('percentile calculations are stable', () => {
    const values = [1, 2, 5, 8, 13, 21, 34];
    expect(percentile(values, 50)).toBe(8);
    expect(percentile(values, 95)).toBe(34);
    expect(percentile([], 95)).toBe(0);
  });

  test('diff counts expose duplicate and missing characters', () => {
    expect(calculateTextDiffCounts('abcdef', 'abcdef')).toEqual({
      duplicateCharCount: 0,
      missingCharCount: 0,
    });

    expect(calculateTextDiffCounts('abcdef', 'abcXXdef')).toEqual({
      duplicateCharCount: 2,
      missingCharCount: 0,
    });

    expect(calculateTextDiffCounts('abcdef', 'abef')).toEqual({
      duplicateCharCount: 0,
      missingCharCount: 2,
    });
  });

  test('session metrics compute amplification and latency percentiles', () => {
    const metrics = buildSessionMetrics({
      finalCode: 'const a = 1;',
      baselineCode: 'const a = 1;',
      inputChunkCount: 5,
      processedChars: 55,
      highlightCalls: 5,
      renderCommits: 5,
      chunkLatenciesMs: [2, 4, 8, 16, 32],
      timeToFirstAnyOutputMs: 1,
      timeToFirstHighlightedCodeMs: 3,
      sessionTotalMs: 40,
      statusSequence: ['idle', 'streaming', 'done'],
      endedCleanly: true,
      tokenizerEnqueues: 5,
      recallEvents: 0,
      recalledTokens: 0,
      resyncCount: 0,
    });

    expect(metrics.compute.finalCodeChars).toBe(12);
    expect(metrics.compute.processedChars).toBe(55);
    expect(metrics.ux.p50ChunkLatencyMs).toBe(8);
    expect(metrics.ux.p95ChunkLatencyMs).toBe(32);
    expect(metrics.ux.maxChunkLatencyMs).toBe(32);
    expect(metrics.integrity.finalPlainTextMatchesBaseline).toBe(true);
    expect(getWorkAmplification(metrics)).toBeCloseTo(55 / 12, 5);
  });
});
