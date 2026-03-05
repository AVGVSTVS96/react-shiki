import { describe, expect, test } from 'vitest';

import {
  compareStructuralHighlight,
  buildSessionMetrics,
  calculateTextDiffCounts,
  getCommitAmplification,
  getWorkAmplification,
  percentile,
} from 'streaming-lab';

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
      tokenEvents: 8,
      recallEvents: 1,
      scheduledCommits: 4,
      actualRenderCommits: 5,
      restartCount: 0,
      chunkLatenciesMs: [2, 4, 8, 16, 32],
      timeToFirstAnyOutputMs: 1,
      timeToFirstHighlightedOutputMs: 3,
      sessionTotalMs: 40,
      statusSequence: ['idle', 'streaming', 'done'],
      endedCleanly: true,
    });

    expect(metrics.compute.finalCodeChars).toBe(12);
    expect(metrics.compute.processedChars).toBe(55);
    expect(metrics.compute.tokenEvents).toBe(8);
    expect(metrics.compute.scheduledCommits).toBe(4);
    expect(metrics.compute.actualRenderCommits).toBe(5);
    expect(metrics.ux.p50ChunkLatencyMs).toBe(8);
    expect(metrics.ux.p95ChunkLatencyMs).toBe(32);
    expect(metrics.ux.maxChunkLatencyMs).toBe(32);
    expect(metrics.integrity.finalPlainTextMatchesBaseline).toBe(true);
    expect(metrics.integrity.highlightPresencePass).toBe(true);
    expect(getWorkAmplification(metrics)).toBeCloseTo(55 / 12, 5);
    expect(getCommitAmplification(metrics)).toBeCloseTo(1, 5);
  });

  test('structural comparison catches plain-text fallback regressions', () => {
    const baseline =
      '<pre><code><span style="color:#a">const</span><span style="color:#b"> value = 1;</span></code></pre>';
    const plain = '<pre><code>const value = 1;</code></pre>';

    const result = compareStructuralHighlight(plain, baseline);
    expect(result.matches).toBe(false);
    expect(result.looksPlainTextFallback).toBe(true);
  });
});
