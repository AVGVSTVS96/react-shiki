# Streaming Session Benchmark Summary

| Scenario | Class | Variant | Chunks | Work x | Commit x | Token x | Restarts | P95 | Total | Parity | Structural |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| append-bursty-long | append-only | full-rehighlight-react | 100 | 50.22 | 2.02 | 0.00 | 0 | 12.77 ms | 698.15 ms | pass | n/a |
| append-bursty-long | append-only | incremental-hook-controlled | 100 | 1.00 | 2.05 | 0.51 | 0 | 1.46 ms | 89.68 ms | pass | n/a |
| append-steady-short | append-only | full-rehighlight-react | 69 | 35.84 | 2.03 | 0.00 | 0 | 5.45 ms | 202.92 ms | pass | n/a |
| append-steady-short | append-only | incremental-hook-controlled | 69 | 1.00 | 2.07 | 1.35 | 0 | 1.42 ms | 53.50 ms | pass | n/a |
| firehose | append-only | full-rehighlight-react | 138 | 68.53 | 2.01 | 0.00 | 0 | 13.31 ms | 745.13 ms | pass | n/a |
| firehose | append-only | incremental-hook-controlled | 138 | 1.00 | 2.04 | 0.61 | 0 | 2.10 ms | 147.55 ms | pass | n/a |
| replace-tail-intentional | intentional-model-edit | full-rehighlight-react | 58 | 31.00 | 2.03 | 0.00 | 0 | 2.64 ms | 88.83 ms | pass | n/a |
| replace-tail-intentional | intentional-model-edit | incremental-hook-controlled | 58 | 1.78 | 1.88 | 1.02 | 1 | 2.20 ms | 42.10 ms | pass | n/a |