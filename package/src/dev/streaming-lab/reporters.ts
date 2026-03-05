import type { StreamingSessionMetrics } from './metrics';
import { getCommitAmplification, getWorkAmplification } from './metrics';

export interface ScenarioVariantReport {
  scenario: string;
  variant: string;
  restartClass?: string;
  metrics: StreamingSessionMetrics;
}

export interface ScenarioSummaryRow {
  scenario: string;
  restartClass: string;
  variant: string;
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
  p50LatencyMs: number;
  p95LatencyMs: number;
  maxLatencyMs: number;
  sessionTotalMs: number;
  parity: boolean;
  structuralParity: boolean | null;
  plainTextFallback: boolean;
}

export const toScenarioSummaryRows = (
  reports: ScenarioVariantReport[]
): ScenarioSummaryRow[] =>
  reports.map((report) => ({
    scenario: report.scenario,
    restartClass: report.restartClass ?? 'none',
    variant: report.variant,
    inputChunkCount: report.metrics.compute.inputChunkCount,
    finalCodeChars: report.metrics.compute.finalCodeChars,
    processedChars: report.metrics.compute.processedChars,
    tokenEvents: report.metrics.compute.tokenEvents,
    recallEvents: report.metrics.compute.recallEvents,
    scheduledCommits: report.metrics.compute.scheduledCommits,
    actualRenderCommits: report.metrics.compute.actualRenderCommits,
    restartCount: report.metrics.compute.restartCount,
    workAmplification: getWorkAmplification(report.metrics),
    commitAmplification: getCommitAmplification(report.metrics),
    tokenEventAmplification:
      report.metrics.compute.tokenEventAmplification,
    p50LatencyMs: report.metrics.ux.p50ChunkLatencyMs,
    p95LatencyMs: report.metrics.ux.p95ChunkLatencyMs,
    maxLatencyMs: report.metrics.ux.maxChunkLatencyMs,
    sessionTotalMs: report.metrics.ux.sessionTotalMs,
    parity: report.metrics.integrity.finalPlainTextMatchesBaseline,
    structuralParity:
      report.metrics.integrity.finalStructuralHighlightMatchesBaseline,
    plainTextFallback: report.metrics.integrity.looksPlainTextFallback,
  }));

export const formatScenarioSummaryMarkdown = (
  rows: ScenarioSummaryRow[]
): string => {
  const header = [
    '| Scenario | Class | Variant | Chunks | Work x | Commit x | Token x | Restarts | P95 ms | Total ms | Parity | Structural |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |',
  ];

  const lines = rows.map((row) => {
    const work = row.workAmplification.toFixed(2);
    const commit = row.commitAmplification.toFixed(2);
    const tokenAmp = row.tokenEventAmplification.toFixed(2);
    const p95 = row.p95LatencyMs.toFixed(2);
    const total = row.sessionTotalMs.toFixed(2);
    const parity = row.parity ? 'pass' : 'fail';
    const structural =
      row.structuralParity == null
        ? 'n/a'
        : row.structuralParity
          ? 'pass'
          : 'fail';

    return `| ${row.scenario} | ${row.restartClass} | ${row.variant} | ${row.inputChunkCount} | ${work} | ${commit} | ${tokenAmp} | ${row.restartCount} | ${p95} | ${total} | ${parity} | ${structural} |`;
  });

  return [...header, ...lines].join('\n');
};
