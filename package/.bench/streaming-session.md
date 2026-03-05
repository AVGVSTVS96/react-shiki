



| Scenario | Class | Variant | Chunks | Work x | Commit x | Token x | Restarts | P95 ms | Total ms | Parity | Structural |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| append-steady-short | append-only | full-rehighlight-react | 69 | 35.84 | 2.03 | 0.00 | 0 | 6.58 | 264.01 | pass | pass |
| append-steady-short | append-only | incremental-hook-controlled | 69 | 1.00 | 1.16 | 1.35 | 0 | 4.55 | 140.56 | pass | pass |
| append-bursty-long | append-only | full-rehighlight-react | 100 | 50.22 | 2.02 | 0.00 | 0 | 27.17 | 1312.16 | pass | pass |
| append-bursty-long | append-only | incremental-hook-controlled | 100 | 1.00 | 1.24 | 0.51 | 0 | 13.38 | 571.00 | pass | pass |
| firehose | append-only | full-rehighlight-react | 138 | 68.53 | 2.01 | 0.00 | 0 | 147.50 | 4615.94 | pass | pass |
| firehose | append-only | incremental-hook-controlled | 138 | 1.00 | 1.45 | 0.61 | 0 | 219.15 | 6877.82 | pass | pass |
| replace-tail-intentional | intentional-model-edit | full-rehighlight-react | 58 | 31.00 | 2.03 | 0.00 | 0 | 5.04 | 173.19 | pass | pass |
| replace-tail-intentional | intentional-model-edit | incremental-hook-controlled | 58 | 1.78 | 1.17 | 1.02 | 1 | 3.43 | 59.84 | pass | pass |



