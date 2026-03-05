# Streaming Bench Delta Report

- Run timestamp: 20260305-014454
- Current file: .bench/streaming-session.json
- Baseline file: .bench/archive/streaming-session.20260305-014454.prev.json

## Session Benchmark (Current vs Previous)

| Scenario | Variant | Prev total (ms) | Curr total (ms) | Delta % | Prev p95 (ms) | Curr p95 (ms) | Delta p95 % |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| append-bursty-long | full-rehighlight-react | 680.87 | 703.76 | 3.36% | 13.07 | 13.83 | 5.84% |
| append-bursty-long | incremental-hook-controlled | 229.95 | 104.91 | -54.38% | 7.40 | 1.83 | -75.30% |
| append-steady-short | full-rehighlight-react | 119.91 | 126.65 | 5.62% | 2.80 | 2.94 | 4.98% |
| append-steady-short | incremental-hook-controlled | 51.34 | 58.85 | 14.62% | 2.17 | 1.63 | -24.79% |
| firehose | full-rehighlight-react | 876.72 | 799.79 | -8.77% | 13.17 | 12.93 | -1.82% |
| firehose | incremental-hook-controlled | 226.00 | 116.33 | -48.53% | 5.76 | 1.57 | -72.79% |
| replace-tail-intentional | full-rehighlight-react | 63.59 | 74.22 | 16.73% | 2.64 | 2.46 | -6.81% |
| replace-tail-intentional | incremental-hook-controlled | 14.82 | 28.25 | 90.62% | 0.74 | 1.37 | 84.56% |

## Session Benchmark Speedup (Current)

| Scenario | Full total (ms) | Incremental total (ms) | Incremental speedup |
| --- | ---: | ---: | ---: |
| append-bursty-long | 703.76 | 104.91 | 6.71x |
| append-steady-short | 126.65 | 58.85 | 2.15x |
| firehose | 799.79 | 116.33 | 6.88x |
| replace-tail-intentional | 74.22 | 28.25 | 2.63x |

## Assistant-Message Benchmark (Current)

| Benchmark | Mean (ms) | Hz |
| --- | ---: | ---: |
| assistant-steady :: incremental-chat-tree | 1384.14 | 0.7225 |
| assistant-steady :: static-chat-tree | 1329.40 | 0.7522 |
| assistant-steady :: plaintext-chat-tree | 583.16 | 1.7148 |
| assistant-steady :: incremental-chat-tree-final-only-control | 66.71 | 14.9910 |
| assistant-bursty :: incremental-chat-tree | 516.88 | 1.9347 |
| assistant-bursty :: static-chat-tree | 854.94 | 1.1697 |
| assistant-bursty :: plaintext-chat-tree | 352.63 | 2.8358 |
| assistant-bursty :: incremental-chat-tree-final-only-control | 54.39 | 18.3851 |
| assistant-firehose :: incremental-chat-tree | 2222.04 | 0.4500 |
| assistant-firehose :: static-chat-tree | 3686.64 | 0.2712 |
| assistant-firehose :: plaintext-chat-tree | 1795.90 | 0.5568 |
| assistant-firehose :: incremental-chat-tree-final-only-control | 58.94 | 16.9664 |