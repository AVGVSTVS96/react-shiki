| Scenario | Class | Variant | Chunks | Work x | Commit x | Token x | Restarts | P95 ms | Total ms | Plain Text | Highlight Presence | Strict Structural |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| append-steady-short | append-only | full-rehighlight-react | 69 | 35.84 | 2.03 | 0.00 | 0 | 2.80 | 119.91 | pass | pass | pass |
| append-steady-short | append-only | incremental-hook-controlled | 69 | 1.00 | 1.12 | 1.35 | 0 | 2.17 | 51.34 | pass | pass | pass |
| append-bursty-long | append-only | full-rehighlight-react | 100 | 50.22 | 2.02 | 0.00 | 0 | 13.07 | 680.87 | pass | pass | pass |
| append-bursty-long | append-only | incremental-hook-controlled | 100 | 1.00 | 1.15 | 0.51 | 0 | 7.40 | 229.95 | pass | pass | pass |
| firehose | append-only | full-rehighlight-react | 138 | 68.53 | 2.01 | 0.00 | 0 | 13.17 | 876.72 | pass | pass | pass |
| firehose | append-only | incremental-hook-controlled | 138 | 1.00 | 1.11 | 0.61 | 0 | 5.76 | 226.00 | pass | pass | pass |
| replace-tail-intentional | intentional-model-edit | full-rehighlight-react | 58 | 31.00 | 2.03 | 0.00 | 0 | 2.64 | 63.59 | pass | pass | pass |
| replace-tail-intentional | intentional-model-edit | incremental-hook-controlled | 58 | 1.78 | 1.14 | 1.02 | 1 | 0.74 | 14.82 | pass | pass | pass |