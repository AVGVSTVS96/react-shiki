| Scenario | Class | Variant | Chunks | Work x | Commit x | Token x | Restarts | P95 ms | Total ms | Plain Text | Highlight Presence | Strict Structural |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| append-steady-short | append-only | full-rehighlight-react | 69 | 35.84 | 2.03 | 0.00 | 0 | 5.45 | 202.92 | pass | pass | pass |
| append-steady-short | append-only | incremental-hook-controlled | 69 | 1.00 | 2.07 | 1.35 | 0 | 1.42 | 53.50 | pass | pass | pass |
| append-bursty-long | append-only | full-rehighlight-react | 100 | 50.22 | 2.02 | 0.00 | 0 | 12.77 | 698.15 | pass | pass | pass |
| append-bursty-long | append-only | incremental-hook-controlled | 100 | 1.00 | 2.05 | 0.51 | 0 | 1.46 | 89.68 | pass | pass | pass |
| firehose | append-only | full-rehighlight-react | 138 | 68.53 | 2.01 | 0.00 | 0 | 13.31 | 745.13 | pass | pass | pass |
| firehose | append-only | incremental-hook-controlled | 138 | 1.00 | 2.04 | 0.61 | 0 | 2.10 | 147.55 | pass | pass | pass |
| replace-tail-intentional | intentional-model-edit | full-rehighlight-react | 58 | 31.00 | 2.03 | 0.00 | 0 | 2.64 | 88.83 | pass | pass | pass |
| replace-tail-intentional | intentional-model-edit | incremental-hook-controlled | 58 | 1.78 | 1.88 | 1.02 | 1 | 2.20 | 42.10 | pass | pass | pass |