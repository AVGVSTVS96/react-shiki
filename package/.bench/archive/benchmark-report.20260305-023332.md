# Streaming Bench Delta Report

- Run timestamp: 20260305-023332
- Baseline report: .bench/archive/benchmark-report.20260305-014454.json
- Current session file: .bench/archive/streaming-session.20260305-023324.json

## Session Benchmark (Current vs Baseline)

| Scenario | Variant | Prev total (ms) | Curr total (ms) | Delta % | Prev p95 (ms) | Curr p95 (ms) | Delta p95 % |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| append-bursty-long | full-rehighlight-react | 703.76 | 698.15 | -0.80% | 13.83 | 12.77 | -7.70% |
| append-bursty-long | incremental-hook-controlled | 104.91 | 89.68 | -14.51% | 1.83 | 1.46 | -19.90% |
| append-steady-short | full-rehighlight-react | 126.65 | 202.92 | 60.22% | 2.94 | 5.45 | 85.66% |
| append-steady-short | incremental-hook-controlled | 58.85 | 53.50 | -9.09% | 1.63 | 1.42 | -13.13% |
| firehose | full-rehighlight-react | 799.79 | 745.13 | -6.83% | 12.93 | 13.31 | 2.93% |
| firehose | incremental-hook-controlled | 116.33 | 147.55 | 26.84% | 1.57 | 2.10 | 33.94% |
| replace-tail-intentional | full-rehighlight-react | 74.22 | 88.83 | 19.68% | 2.46 | 2.64 | 7.09% |
| replace-tail-intentional | incremental-hook-controlled | 28.25 | 42.10 | 49.03% | 1.37 | 2.20 | 60.87% |

## Assistant-Message Benchmark (Current vs Baseline)

| Benchmark | Prev mean (ms) | Curr mean (ms) | Delta mean % | Prev hz | Curr hz | Delta hz % |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| assistant-steady :: incremental-chat-tree | 1384.14 | 1375.72 | -0.61% | 0.7225 | 0.7269 | 0.61% |
| assistant-steady :: static-chat-tree | 1329.40 | 1420.81 | 6.88% | 0.7522 | 0.7038 | -6.43% |
| assistant-steady :: plaintext-chat-tree | 583.16 | 792.61 | 35.92% | 1.7148 | 1.2617 | -26.42% |
| assistant-steady :: incremental-chat-tree-final-only-control | 66.71 | 71.27 | 6.84% | 14.9910 | 14.0317 | -6.40% |
| assistant-bursty :: incremental-chat-tree | 516.88 | 534.39 | 3.39% | 1.9347 | 1.8713 | -3.28% |
| assistant-bursty :: static-chat-tree | 854.94 | 800.11 | -6.41% | 1.1697 | 1.2498 | 6.85% |
| assistant-bursty :: plaintext-chat-tree | 352.63 | 346.23 | -1.81% | 2.8358 | 2.8883 | 1.85% |
| assistant-bursty :: incremental-chat-tree-final-only-control | 54.39 | 64.77 | 19.07% | 18.3851 | 15.4400 | -16.02% |
| assistant-firehose :: incremental-chat-tree | 2222.04 | 2322.98 | 4.54% | 0.4500 | 0.4305 | -4.33% |
| assistant-firehose :: static-chat-tree | 3686.64 | 3606.61 | -2.17% | 0.2712 | 0.2773 | 2.25% |
| assistant-firehose :: plaintext-chat-tree | 1795.90 | 1825.05 | 1.62% | 0.5568 | 0.5479 | -1.60% |
| assistant-firehose :: incremental-chat-tree-final-only-control | 58.94 | 57.22 | -2.92% | 16.9664 | 17.4776 | 3.01% |