---
"react-shiki": patch
---

Scope CSS to react-shiki's own DOM and drop deprecated unprefixed aliases (closes #162).

**Breaking:** unprefixed classes and CSS variables are removed. Substitute as follows:

| Removed                          | Replacement                          |
| -------------------------------- | ------------------------------------ |
| `.line-numbers`                  | `.rs-line-number`                    |
| `.has-line-numbers`              | `.rs-has-line-numbers`               |
| `--line-numbers-foreground`      | `--rs-line-numbers-foreground`       |
| `--line-numbers-width`           | `--rs-line-numbers-width`            |
| `--line-numbers-padding-left`    | `--rs-line-numbers-padding-left`     |
| `--line-numbers-padding-right`   | `--rs-line-numbers-padding-right`    |
| `--line-numbers-font-size`       | `--rs-line-numbers-font-size`        |
| `--line-numbers-font-weight`     | `--rs-line-numbers-font-weight`      |
| `--line-numbers-line-height`     | `--rs-line-numbers-line-height`      |
| `--line-numbers-font-family`     | `--rs-line-numbers-font-family`      |
| `--line-numbers-opacity`         | `--rs-line-numbers-opacity`          |
