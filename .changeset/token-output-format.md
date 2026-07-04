---
"react-shiki": minor
---

Add experimental `outputFormat: 'tokens'` support to `useShikiHighlighter` for returning Shiki's raw token output (`TokensResult`) for custom rendering. Hook-only: the `ShikiHighlighter` component excludes it at the type level and falls back to `'react'` with a console warning if passed at runtime. The hook's return type now narrows based on the `outputFormat` passed (`'react'` → `ReactElement`, `'html'` → `string`, `'tokens'` → `TokensResult`).
