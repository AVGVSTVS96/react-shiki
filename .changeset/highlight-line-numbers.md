---
"react-shiki": minor
---

feat: add `highlightLineNumbers` option to highlight specific lines by displayed line number (respects `startingLineNumber`)

Highlighted lines get the `rs-highlighted-line` class. The highlight color adapts to the active theme, deriving from its text color. With default styles, backgrounds automatically extend into the pre's horizontal padding so they reach the container edges.

New CSS variables:

- `--rs-highlighted-line-background`: highlight color (default: theme text color at 10% opacity)
- `--rs-highlighted-line-number-foreground`: line number color on highlighted lines (default: theme text color at 65% opacity)
