import type { StreamingSessionMetrics } from './metrics';
import { getWorkAmplification } from './metrics';

export interface ScenarioVariantReport {
  scenario: string;
  variant: string;
  metrics: StreamingSessionMetrics;
}

export interface ScenarioSummaryRow {
  scenario: string;
  variant: string;
  finalCodeChars: number;
  processedChars: number;
  workAmplification: number;
  p95LatencyMs: number;
  resyncCount: number;
  parity: boolean;
}

export const toScenarioSummaryRows = (
  reports: ScenarioVariantReport[]
): ScenarioSummaryRow[] =>
  reports.map((report) => ({
    scenario: report.scenario,
    variant: report.variant,
    finalCodeChars: report.metrics.compute.finalCodeChars,
    processedChars: report.metrics.compute.processedChars,
    workAmplification: getWorkAmplification(report.metrics),
    p95LatencyMs: report.metrics.ux.p95ChunkLatencyMs,
    resyncCount: report.metrics.compute.resyncCount,
    parity: report.metrics.integrity.finalPlainTextMatchesBaseline,
  }));

export const formatScenarioSummaryMarkdown = (
  rows: ScenarioSummaryRow[]
): string => {
  const header = [
    '| Scenario | Variant | Final Chars | Processed Chars | Work x | P95 ms | Resync | Parity |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |',
  ];

  const lines = rows.map((row) => {
    const work = row.workAmplification.toFixed(2);
    const p95 = row.p95LatencyMs.toFixed(2);
    const parity = row.parity ? 'pass' : 'fail';

    return `| ${row.scenario} | ${row.variant} | ${row.finalCodeChars} | ${row.processedChars} | ${work} | ${p95} | ${row.resyncCount} | ${parity} |`;
  });

  return [...header, ...lines].join('\n');
};
