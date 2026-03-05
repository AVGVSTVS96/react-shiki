import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const inputPath = process.argv[2] ?? '.bench/streaming-session.json';
const outputPath =
  process.argv[3] ?? '.bench/streaming-session-summary.md';

const rows = JSON.parse(readFileSync(inputPath, 'utf8'));

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatFixed = (value, digits = 2) => {
  const parsed = toNumber(value);
  return parsed == null ? 'n/a' : parsed.toFixed(digits);
};

const coalesce = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
};

const sortedRows = [...rows].sort((a, b) => {
  const scenario = String(a.scenario ?? '').localeCompare(
    String(b.scenario ?? '')
  );
  if (scenario !== 0) return scenario;
  return String(a.variant ?? '').localeCompare(String(b.variant ?? ''));
});

const header = [
  '# Streaming Session Benchmark Summary',
  '',
  '| Scenario | Class | Variant | Chunks | Work x | Commit x | Token x | Restarts | P95 | Total | Parity | Structural |',
  '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |',
];

const body = sortedRows.map((row) => {
  const chunks = coalesce(row.inputChunkCount, row.tokenizerEnqueues, 0);
  const work = coalesce(
    row.workAmplification,
    toNumber(row.processedChars) != null && toNumber(row.finalCodeChars)
      ? toNumber(row.processedChars) /
          Math.max(1, toNumber(row.finalCodeChars))
      : null
  );
  const commit = coalesce(
    row.commitAmplification,
    toNumber(row.actualRenderCommits) != null && toNumber(chunks) != null
      ? toNumber(row.actualRenderCommits) / Math.max(1, toNumber(chunks))
      : null
  );
  const token = coalesce(
    row.tokenEventAmplification,
    toNumber(row.tokenEvents) != null &&
      toNumber(row.finalCodeChars) != null
      ? toNumber(row.tokenEvents) /
          Math.max(1, toNumber(row.finalCodeChars))
      : null
  );
  const restarts = coalesce(row.restartCount, row.resyncCount, 0);
  const p95 = formatFixed(row.p95LatencyMs, 2);
  const total = formatFixed(row.sessionTotalMs, 2);
  const parity = coalesce(
    row.parity,
    row.finalPlainTextMatchesBaseline,
    false
  )
    ? 'pass'
    : 'fail';
  const structural =
    coalesce(
      row.structuralParity,
      row.finalStructuralHighlightMatchesBaseline
    ) == null
      ? 'n/a'
      : coalesce(
            row.structuralParity,
            row.finalStructuralHighlightMatchesBaseline
          )
        ? 'pass'
        : 'fail';

  return `| ${row.scenario ?? 'unknown'} | ${row.restartClass ?? 'n/a'} | ${row.variant ?? 'unknown'} | ${chunks} | ${formatFixed(work, 2)} | ${formatFixed(commit, 2)} | ${formatFixed(token, 2)} | ${restarts} | ${p95} ms | ${total} ms | ${parity} | ${structural} |`;
});

const markdown = [...header, ...body].join('\n');

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, markdown, 'utf8');

console.log(`[streaming-bench-summary] wrote ${outputPath}`);
