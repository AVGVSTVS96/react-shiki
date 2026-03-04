import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const inputPath = process.argv[2] ?? '.bench/streaming-session.json';
const outputPath =
  process.argv[3] ?? '.bench/streaming-session-summary.md';

const rows = JSON.parse(readFileSync(inputPath, 'utf8'));

const header = [
  '# Streaming Session Benchmark Summary',
  '',
  '| Scenario | Variant | Final Chars | Processed Chars | Work Reduction | P95 Latency | Resync | Parity |',
  '| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |',
];

const body = rows.map((row) => {
  const workReduction = `${(1 - 1 / Math.max(1, row.workAmplification)).toFixed(2)}`;
  const p95 = Number(row.p95LatencyMs ?? 0).toFixed(2);
  const parity = row.parity ? 'pass' : 'fail';

  return `| ${row.scenario} | ${row.variant} | ${row.finalCodeChars} | ${row.processedChars} | ${workReduction} | ${p95} ms | ${row.resyncCount} | ${parity} |`;
});

const markdown = [...header, ...body].join('\n');

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, markdown, 'utf8');

console.log(`[streaming-bench-summary] wrote ${outputPath}`);
